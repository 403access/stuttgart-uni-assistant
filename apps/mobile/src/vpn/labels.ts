import * as Network from 'expo-network';

import { tx, type TranslationKey } from '@ua/core/format';
import type { Locale } from '@ua/core/domain/types';
import type { VpnEngine, VpnTunnelState } from '@/src/vpn/types';

const stateKeys: Record<VpnTunnelState, TranslationKey> = {
  unavailable: 'vpn.state.unavailable',
  disconnected: 'vpn.state.disconnected',
  connecting: 'vpn.state.connecting',
  connected: 'vpn.state.connected',
  disconnecting: 'vpn.state.disconnecting',
  error: 'vpn.state.error',
};

export function vpnStateLabel(state: VpnTunnelState, locale: Locale): string {
  return tx(locale, stateKeys[state]);
}

/** Tone for the status pill: green connected, amber in transit, red on error. */
export function vpnStateTone(state: VpnTunnelState): 'neutral' | 'blue' | 'ok' | 'wait' | 'stop' {
  if (state === 'connected') return 'ok';
  if (state === 'connecting' || state === 'disconnecting') return 'wait';
  if (state === 'error') return 'stop';
  if (state === 'unavailable') return 'neutral';
  return 'blue';
}

/** Engine names are product names and stay untranslated. */
export function vpnEngineLabel(engine: VpnEngine, locale: Locale): string {
  if (engine === 'openvpn') return 'OpenVPN';
  if (engine === 'openconnect') return 'OpenConnect';
  return tx(locale, 'vpn.status.engine_keine');
}

export function networkTypeLabel(type: Network.NetworkStateType | undefined, locale: Locale): string {
  switch (type) {
    case Network.NetworkStateType.WIFI:
      return tx(locale, 'vpn.netz.wifi');
    case Network.NetworkStateType.CELLULAR:
      return tx(locale, 'vpn.netz.mobil');
    case Network.NetworkStateType.VPN:
      return tx(locale, 'vpn.netz.vpn');
    case Network.NetworkStateType.ETHERNET:
      return tx(locale, 'vpn.netz.ethernet');
    case Network.NetworkStateType.NONE:
      return tx(locale, 'vpn.netz.keins');
    case Network.NetworkStateType.UNKNOWN:
      return tx(locale, 'vpn.netz.unbekannt');
    default:
      return tx(locale, 'vpn.netz.sonstige');
  }
}
