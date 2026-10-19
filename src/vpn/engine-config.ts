import Constants from 'expo-constants';

const config = Constants.expoConfig;
const bundleIdentifier = config?.ios?.bundleIdentifier ?? 'dev.demo.universityassistant';
const androidPackage = config?.android?.package ?? bundleIdentifier;

/** Shown in the iOS VPN list and on the Android notification. */
export const vpnDisplayName = 'University Assistant VPN';

/**
 * The Packet Tunnel Provider target's bundle identifier, passed to the engine's
 * `iOSOptions`. It has to match the Xcode target exactly; see
 * docs/engineering/vpn-tunnel.md.
 */
export const iosExtensionBundleIdentifier = `${bundleIdentifier}.OVPNEXT`;

/** The shared App Group. `plugins/withVpnTunnel.js` writes the same value. */
export const appGroupIdentifier = `group.${bundleIdentifier}`;

/** Activity the Android notification brings to the front. */
export const androidOpenActivity = `${androidPackage}.MainActivity`;
