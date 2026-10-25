import * as Network from 'expo-network';
import { useCallback, useEffect, useState } from 'react';

import {
  connectVpn,
  detectedEngine,
  disconnectNativeVpn,
  isNativeVpnAvailable,
  platformName,
  readVpnStatus,
  requestVpnPermission,
  subscribeVpnStatus,
} from '@/src/vpn/native';
import { checkPrinterReachable } from '@/src/vpn/printer';
import type { VpnState, VpnTarget, VpnTunnelStatusView } from '@/src/vpn/types';

/** Error codes the connect/disconnect flow can end on, mapped to copy in the screen. */
export type VpnErrorCode = 'permission' | 'connect' | 'engine' | null;

function makeState(available: boolean, status: VpnTunnelStatusView): VpnState {
  return { available, platform: platformName(), status };
}

function absent(): VpnState {
  return makeState(false, { state: 'unavailable', server: null, since: null, error: null, permissionGranted: false, engine: 'none' });
}

/** Optimistic placeholder until the engine answers its first status read. */
function pending(): VpnState {
  return makeState(true, { state: 'disconnected', server: null, since: null, error: null, permissionGranted: false, engine: detectedEngine() });
}

/**
 * Tunnel state, the current network, and a probe of the printer portal.
 *
 * The tunnel is real on a development or store build that carries an engine
 * (`@aliakhgar1/react-native-openvpn` for OpenVPN); everywhere else
 * `state.state` reads `unavailable` and the screen falls back to the official
 * client.
 */
export function useVpn() {
  const available = isNativeVpnAvailable();
  const [state, setState] = useState<VpnState>(() => (available ? pending() : absent()));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<VpnErrorCode>(null);
  const [printerReachable, setPrinterReachable] = useState<boolean | null>(null);
  const network = Network.useNetworkState();

  const refresh = useCallback(async () => {
    if (!available) return;
    const status = await readVpnStatus();
    if (status) setState(makeState(true, status));
  }, [available]);

  useEffect(() => {
    if (!available) return;
    let active = true;
    let unsubscribe: () => void = () => undefined;
    readVpnStatus().then((status) => {
      if (status && active) setState(makeState(true, status));
    });
    subscribeVpnStatus((status) => {
      if (active) setState(makeState(true, status));
    }).then((off) => {
      if (active) unsubscribe = off;
      else off();
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [available]);

  const probePrinter = useCallback(async () => {
    const reachable = await checkPrinterReachable();
    setPrinterReachable(reachable);
    return reachable;
  }, []);

  const connect = useCallback(
    async (target: VpnTarget) => {
      setBusy(true);
      setError(null);
      try {
        // Stop before asking the OS for consent while there is nothing to consent to.
        if (detectedEngine() === 'none') {
          setError('engine');
          return;
        }
        const granted = await requestVpnPermission();
        if (!granted) {
          setError('permission');
          return;
        }
        await connectVpn(target);
      } catch (cause) {
        const detail = cause instanceof Error ? cause.message : '';
        setError(detail.includes('engine') ? 'engine' : 'connect');
      } finally {
        setBusy(false);
        await refresh();
      }
    },
    [refresh],
  );

  const disconnect = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await disconnectNativeVpn();
    } catch {
      setError('connect');
    } finally {
      setBusy(false);
      await refresh();
    }
  }, [refresh]);

  /** True when the tunnel reports connected, or the OS sees a VPN interface (Android only). */
  const vpnActive = state.status.state === 'connected' || network.type === Network.NetworkStateType.VPN;

  return { state, busy, error, network, vpnActive, printerReachable, connect, disconnect, refresh, probePrinter };
}
