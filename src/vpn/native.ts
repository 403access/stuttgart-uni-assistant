import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

import {
  openVpnConnect,
  openVpnDisconnect,
  openVpnInstalled,
  openVpnPrepare,
  openVpnStatus,
  openVpnSubscribe,
} from '@/src/vpn/engine-openvpn';
import type { VpnEngine, VpnNativeStatus, VpnTarget } from '@/src/vpn/types';

/** Event name the stub module emits whenever the tunnel state changes. */
export const VPN_STATUS_EVENT = 'onVpnStatusChange';

/**
 * The AnyConnect seam (`modules/university-vpn`). It has no engine yet, so it
 * only reports status and refuses to connect. Kept as a local type so the JS
 * bundle never imports native code directly.
 */
interface UniversityVpnNativeModule {
  getStatus(): Promise<VpnNativeStatus>;
  requestPermission(): Promise<boolean>;
  installTarget(target: VpnTarget): Promise<void>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  addListener(event: string, listener: (status: VpnNativeStatus) => void): VpnSubscription;
}

interface VpnSubscription {
  remove(): void;
}

function loadStub(): UniversityVpnNativeModule | null {
  if (Platform.OS === 'web') return null;
  try {
    return requireOptionalNativeModule<UniversityVpnNativeModule>('UniversityVpn');
  } catch {
    return null;
  }
}

const stub = loadStub();

/**
 * Which engine this binary can actually connect with, decided synchronously so
 * the first render is honest about it. Only a real engine counts: the
 * `UniversityVpn` scaffold loads and reports status, but it carries no tunnel
 * yet, so it must not make the TIK screen look connectable.
 */
export function detectedEngine(): VpnEngine {
  if (openVpnInstalled()) return 'openvpn';
  return 'none';
}

export function isNativeVpnAvailable(): boolean {
  return detectedEngine() !== 'none';
}

export function platformName(): 'ios' | 'android' | 'web' {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return 'web';
}

export async function readVpnStatus(): Promise<VpnNativeStatus | null> {
  if (openVpnInstalled()) {
    const status = await openVpnStatus();
    if (status) return status;
  }
  if (!stub) return null;
  try {
    return await stub.getStatus();
  } catch {
    return null;
  }
}

/** Android shows the system `VpnService` consent dialog here. Idempotent on iOS. */
export async function requestVpnPermission(): Promise<boolean> {
  if (openVpnInstalled()) return openVpnPrepare();
  if (!stub) return false;
  try {
    return await stub.requestPermission();
  } catch {
    return false;
  }
}

/**
 * Hands a target to whichever engine is present. Throws `engine-missing` when
 * neither is, so the screen reports a gap instead of a silent no-op.
 */
export async function connectVpn(target: VpnTarget): Promise<void> {
  if (openVpnInstalled() && target.kind === 'openvpn') {
    await openVpnConnect(target);
    return;
  }
  if (stub) {
    await stub.installTarget(target);
    await stub.connect();
    return;
  }
  throw new Error('engine-missing');
}

export async function disconnectNativeVpn(): Promise<void> {
  if (openVpnInstalled()) {
    await openVpnDisconnect();
    return;
  }
  if (stub) await stub.disconnect();
}

/** Subscribe to native state changes. Resolves to a no-op unsubscribe when absent. */
export async function subscribeVpnStatus(listener: (status: VpnNativeStatus) => void): Promise<() => void> {
  if (openVpnInstalled()) return openVpnSubscribe(listener);
  if (!stub) return () => undefined;
  const subscription = stub.addListener(VPN_STATUS_EVENT, listener);
  return () => subscription.remove();
}
