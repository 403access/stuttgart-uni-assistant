const { AndroidConfig, withAndroidManifest, withEntitlementsPlist, withInfoPlist } = require('@expo/config-plugins');

const READER_FORMATS = 'com.apple.developer.nfc.readersession.formats';
const IOS_FLAG = 'EXPO_ENABLE_IOS_NFC';
const USAGE =
  'Die App liest den Studierendenausweis über NFC, um die Kartendaten in den Entwickler-Einstellungen anzuzeigen.';

/** Android needs the NFC permission; the library manifest also declares it. */
function withAndroidNfc(config) {
  return withAndroidManifest(config, (config) => {
    AndroidConfig.Permissions.ensurePermissions(config.modResults, ['android.permission.NFC']);
    return config;
  });
}

/** The usage string is harmless without the entitlement and keeps the prompt compliant. */
function withIosUsage(config) {
  return withInfoPlist(config, (config) => {
    config.modResults.NFCReaderUsageDescription =
      config.modResults.NFCReaderUsageDescription || USAGE;
    return config;
  });
}

/**
 * The NFC Tag Reading capability. It is deliberately off by default: Personal
 * Teams cannot sign a project that carries it, and a free account is the
 * common local setup here. Turn it on for a paid membership.
 */
function withIosEntitlement(config) {
  return withEntitlementsPlist(config, (config) => {
    const formats = Array.isArray(config.modResults[READER_FORMATS])
      ? config.modResults[READER_FORMATS]
      : [];
    for (const format of ['NDEF', 'TAG']) {
      if (!formats.includes(format)) formats.push(format);
    }
    config.modResults[READER_FORMATS] = formats;
    return config;
  });
}

/**
 * Set to `1` to write the iOS NFC entitlement. A Personal Team does not support
 * it, so the default keeps `expo run:ios` signable. See
 * docs/engineering/dev-tools.md and docs/engineering/ios-distribution.md.
 */
module.exports = function withNfc(config) {
  config = withAndroidNfc(config);
  config = withIosUsage(config);
  if (process.env[IOS_FLAG] === '1') {
    config = withIosEntitlement(config);
  }
  return config;
};

module.exports.IOS_FLAG = IOS_FLAG;
module.exports.IOS_ENTITLEMENT_KEY = READER_FORMATS;
