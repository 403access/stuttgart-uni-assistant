export type VpnRole = 'student' | 'employee';

/** The two VPN services a student of this university can actually meet. */
export type VpnProviderId = 'zdi-openvpn' | 'tik-anyconnect';

/** Protocol family, which decides how a target is handed to the engine. */
export type VpnProfileKind = 'openvpn' | 'anyconnect';

/**
 * Lifecycle of a packet tunnel, as reported by the native module and mapped
 * onto the platform VPN state. `unavailable` means this build carries no VPN
 * module at all (Expo Go, web), which is a different fact from `disconnected`.
 */
export type VpnTunnelState = 'unavailable' | 'disconnected' | 'connecting' | 'connected' | 'disconnecting' | 'error';

/** Packet-tunnel engine linked into the app extension. `none` ships no engine. */
export type VpnEngine = 'openvpn' | 'openconnect' | 'none';

/** One headend a student can point a host-based client at. */
export interface VpnServer {
  id: string;
  /** Host to enter in the client, e.g. `vpn.tik.uni-stuttgart.de`. */
  host: string;
  /** Behind the stateful firewall, which allows UDP towards the internet. */
  udpThroughFirewall: boolean;
}

/** One client-configuration file a provider publishes. */
export interface VpnConfigFile {
  id: string;
  /** What the two ZDI files are for: which address family carries the tunnel. */
  tunnel: 'v6-over-v4' | 'v4-over-v6';
  url: string;
}

/** A VPN service the app knows how to describe and hand to an engine. */
export interface VpnProvider {
  id: VpnProviderId;
  kind: VpnProfileKind;
  /** Product label, shown as-is: these are names, not copy. */
  label: string;
  /** Public service page. */
  service: string;
  /** Guides for setting up a client by hand. */
  guide: string;
  /** Hosts for host-based providers; empty for OpenVPN, which uses a profile file. */
  servers: VpnServer[];
  /** Client-configuration files, when the provider publishes them. */
  configs: VpnConfigFile[];
}

/** What a `connect` call hands to the engine. */
export type VpnTarget =
  | { kind: 'anyconnect'; server: string; accountId: string }
  | { kind: 'openvpn'; profileName: string; config: string; username: string; password: string };

/** An imported `.ovpn` profile. The config may carry inline keys, so it is a secret. */
export interface ImportedVpnProfile {
  name: string;
  provider: VpnProviderId;
  /** ISO timestamp of the import. */
  importedAt: string;
  config: string;
}

/** Tunnel status as the native module reports it, without any app-side gloss. */
export interface VpnNativeStatus {
  state: VpnTunnelState;
  /** Server or profile the installed configuration points at, `null` before one is set. */
  server: string | null;
  /** ISO timestamp of the last state change, `null` before the first. */
  since: string | null;
  /** Machine-readable code of the last failure, `null` while healthy. */
  error: string | null;
  /** Android `VpnService` consent; always `true` on iOS, where the profile carries consent. */
  permissionGranted: boolean;
  engine: VpnEngine;
}

/** What the screens read: native facts plus whether the module exists in this build. */
export interface VpnState {
  available: boolean;
  platform: 'ios' | 'android' | 'web';
  status: VpnTunnelStatusView;
}

export interface VpnTunnelStatusView {
  state: VpnTunnelState;
  server: string | null;
  since: string | null;
  error: string | null;
  permissionGranted: boolean;
  engine: VpnEngine;
}
