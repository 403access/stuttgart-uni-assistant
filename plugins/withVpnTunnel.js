const { AndroidConfig, withAndroidManifest, withEntitlementsPlist } = require('@expo/config-plugins');

const NETWORK_EXTENSION = 'com.apple.developer.networking.networkextension';
const PACKET_TUNNEL = 'packet-tunnel-provider';
const APP_GROUPS = 'com.apple.security.application-groups';

/** The ics-openvpn service and receiver the engine starts. */
const OPENVPN_SERVICE = 'de.blinkt.openvpn.core.OpenVPNService';
const OPENVPN_BOOT_RECEIVER = 'de.blinkt.openvpn.OnBootReceiver';

/**
 * What `@aliakhgar1/react-native-openvpn` asks the app manifest for. Its own
 * manifest template is empty, so nothing merges in on its own.
 */
const ANDROID_PERMISSIONS = [
  'android.permission.INTERNET',
  'android.permission.ACCESS_NETWORK_STATE',
  'android.permission.ACCESS_WIFI_STATE',
  'android.permission.CHANGE_WIFI_STATE',
  'android.permission.RECEIVE_BOOT_COMPLETED',
  'android.permission.FOREGROUND_SERVICE',
  'android.permission.POST_NOTIFICATIONS',
  'android.permission.FOREGROUND_SERVICE_SPECIAL_USE',
];

/**
 * Adds the OpenVPN engine's permissions, service and boot receiver. Everything
 * here survives `expo prebuild` because it is applied to the generated manifest.
 */
function withAndroidVpn(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    manifest.manifest.$ = manifest.manifest.$ ?? {};
    manifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';

    AndroidConfig.Permissions.ensurePermissions(manifest, ANDROID_PERMISSIONS);

    // The service binds with a signature permission, so declaring the use needs tools:ignore.
    const uses = manifest.manifest['uses-permission'] ?? [];
    if (!uses.some((entry) => entry.$?.['android:name'] === 'android.permission.BIND_VPN_SERVICE')) {
      uses.push({
        $: {
          'android:name': 'android.permission.BIND_VPN_SERVICE',
          'tools:ignore': 'ProtectedPermissions',
        },
      });
    }
    manifest.manifest['uses-permission'] = uses;

    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);

    application.service = application.service ?? [];
    if (!application.service.some((entry) => entry.$?.['android:name'] === OPENVPN_SERVICE)) {
      application.service.push({
        $: {
          'android:name': OPENVPN_SERVICE,
          'android:permission': 'android.permission.BIND_VPN_SERVICE',
          'android:exported': 'false',
        },
      });
    }

    application.receiver = application.receiver ?? [];
    if (!application.receiver.some((entry) => entry.$?.['android:name'] === OPENVPN_BOOT_RECEIVER)) {
      application.receiver.push({
        $: {
          'android:name': OPENVPN_BOOT_RECEIVER,
          'android:enabled': 'true',
          'android:exported': 'false',
        },
        'intent-filter': [
          {
            $: { 'android:priority': '400' },
            action: [
              { $: { 'android:name': 'android.intent.action.BOOT_COMPLETED' } },
              { $: { 'android:name': 'android.intent.action.MY_PACKAGE_REPLACED' } },
            ],
            category: [{ $: { 'android:name': 'android.intent.category.DEFAULT' } }],
          },
        ],
      });
    }

    return config;
  });
}

/**
 * The Network Extension entitlement and the shared App Group. The packet tunnel
 * provider target itself and Apple's approval are manual steps: a config plugin
 * can set the entitlement, but it cannot create the target or the App ID grant.
 * See docs/engineering/vpn-tunnel.md.
 */
function withIosVpnEntitlements(config) {
  return withEntitlementsPlist(config, (config) => {
    const existing = config.modResults[NETWORK_EXTENSION];
    const values = Array.isArray(existing) ? existing : [];
    if (!values.includes(PACKET_TUNNEL)) values.push(PACKET_TUNNEL);
    config.modResults[NETWORK_EXTENSION] = values;

    // The app and its extension share the profile through this group.
    const bundleIdentifier = config.ios?.bundleIdentifier;
    if (bundleIdentifier) {
      const groups = Array.isArray(config.modResults[APP_GROUPS]) ? config.modResults[APP_GROUPS] : [];
      const group = `group.${bundleIdentifier}`;
      if (!groups.includes(group)) groups.push(group);
      config.modResults[APP_GROUPS] = groups;
    }

    return config;
  });
}

/**
 * Set to `1` to write the iOS entitlements. They are deliberately off by
 * default: both are unavailable to a free Apple Account, so a Personal Team
 * cannot sign a project that has them, and the iOS tunnel they exist for does
 * not exist yet. Turn this on together with a paid membership and the Packet
 * Tunnel target. See docs/engineering/ios-distribution.md.
 */
const IOS_ENTITLEMENTS_FLAG = 'EXPO_ENABLE_IOS_VPN_ENTITLEMENTS';

/** Adds the VPN entitlements and permissions the native engines require. */
module.exports = function withVpnTunnel(config) {
  config = withAndroidVpn(config);
  if (process.env[IOS_ENTITLEMENTS_FLAG] === '1') {
    config = withIosVpnEntitlements(config);
  }
  return config;
};

module.exports.IOS_ENTITLEMENTS_FLAG = IOS_ENTITLEMENTS_FLAG;
module.exports.IOS_ENTITLEMENT_KEYS = [NETWORK_EXTENSION, APP_GROUPS];
