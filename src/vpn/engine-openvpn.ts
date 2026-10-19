import { Platform, TurboModuleRegistry } from 'react-native';

import { androidOpenActivity, iosExtensionBundleIdentifier, vpnDisplayName } from '@/src/vpn/engine-config';
import { openVpnHost } from '@/src/vpn/openvpn-config';
import type { VpnNativeStatus, VpnTarget, VpnTunnelState } from '@/src/vpn/types';

/** TurboModule name registered by `@aliakhgar1/react-native-openvpn`. */
const MODULE_NAME = 'Openvpn';

type OpenVpnApi = typeof import('@aliakhgar1/react-native-openvpn');

let loaded = false;
let api: OpenVpnApi | null = null;

/**
 * Synchronous presence check. It deliberately does **not** import the package:
 * `requireNativeModule`-style specs use `getEnforcing`, so importing it in Expo
 * Go or on web throws before any of our code can react.
 */
export function openVpnInstalled(): boolean {
  if (Platform.OS === 'web') return false;
  try {
    return TurboModuleRegistry.get(MODULE_NAME) != null;
  } catch {
    return false;
  }
}

async function load(): Promise<OpenVpnApi | null> {
  if (loaded) return api;
  loaded = true;
  if (!openVpnInstalled()) return (api = null);
  try {
    api = await import('@aliakhgar1/react-native-openvpn');
  } catch {
    api = null;
  }
  return api;
}

/** The native module reports state, not the target, so the last one is remembered here. */
let targetLabel: string | null = null;
let lastChange: string | null = null;
let permissionKnown = false;

function mapState(state: string): VpnTunnelState {
  switch (state) {
    case '3':
      return 'connected';
    case '2':
      return 'connecting';
    case '1':
      return 'disconnecting';
    case '0':
      return 'disconnected';
    default:
      // '-1' invalid and '-2' error both mean the tunnel is not carrying traffic.
      return 'error';
  }
}

function toStatus(state: string): VpnNativeStatus {
  return {
    state: mapState(state),
    server: targetLabel,
    since: lastChange,
    error: mapState(state) === 'error' ? 'openvpn' : null,
    permissionGranted: Platform.OS === 'android' ? permissionKnown : true,
    engine: 'openvpn',
  };
}

export async function openVpnStatus(): Promise<VpnNativeStatus | null> {
  const engine = await load();
  if (!engine) return null;
  try {
    const state = await engine.getCurrentState();
    if (Platform.OS === 'android') {
      permissionKnown = await engine.isPrepared().catch(() => permissionKnown);
    } else {
      permissionKnown = true;
    }
    return toStatus(String(state));
  } catch {
    return null;
  }
}

/** Android shows the system `VpnService` consent dialog. iOS has nothing to ask up front. */
export async function openVpnPrepare(): Promise<boolean> {
  const engine = await load();
  if (!engine) return false;
  if (Platform.OS !== 'android') return true;
  try {
    if (await engine.isPrepared()) return true;
    const granted = await engine.prepare();
    permissionKnown = granted;
    return granted;
  } catch {
    return false;
  }
}

export async function openVpnConnect(target: Extract<VpnTarget, { kind: 'openvpn' }>): Promise<void> {
  const engine = await load();
  if (!engine) throw new Error('engine-missing');

  targetLabel = openVpnHost(target.config) ?? target.profileName;
  lastChange = new Date().toISOString();

  await engine.connect({
    address: targetLabel,
    username: target.username,
    password: target.password,
    openVPNConfig: target.config,
    iOSOptions: {
      localizedDescription: vpnDisplayName,
      networkExtensionBundleIdentifier: iosExtensionBundleIdentifier,
      disconnectOnSleep: false,
      onDemandEnabled: false,
    },
    androidOptions: {
      Notification: {
        openActivityPackageName: androidOpenActivity,
        titleNotification: vpnDisplayName,
        showDisconnectAction: true,
      },
    },
  });
}

export async function openVpnDisconnect(): Promise<void> {
  const engine = await load();
  if (!engine) return;
  await engine.disconnect();
}

/** Subscribe to native state changes. Resolves to an unsubscribe function. */
export async function openVpnSubscribe(listener: (status: VpnNativeStatus) => void): Promise<() => void> {
  const engine = await load();
  if (!engine) return () => undefined;
  const subscription = engine.addOpenVPNStateChangeListener(({ state }) => {
    lastChange = new Date().toISOString();
    listener(toStatus(String(state)));
  });
  return () => subscription.remove();
}
