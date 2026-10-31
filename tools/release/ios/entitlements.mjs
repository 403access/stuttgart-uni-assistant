/**
 * The one preflight that saves a ten-minute archive: capabilities a free Apple
 * Account cannot sign. Xcode refuses them for a Personal Team, and if such a
 * build is exported anyway the failure lands on a tester's device instead.
 *
 * See docs/engineering/ios-distribution.md and
 * docs/engineering/vpn-tunnel.md.
 */

import { readFileSync } from 'node:fs';

import { ENTITLEMENTS } from './project.mjs';

/**
 * The opt-in flag in `plugins/withVpnTunnel.js` that writes the iOS entitlements.
 * Duplicated by necessity — importing the plugin from here would pull
 * `@expo/config-plugins` into every test that imports an argument parser — and
 * a test asserts the two stay equal.
 */
export const IOS_ENTITLEMENTS_FLAG = 'EXPO_ENABLE_IOS_VPN_ENTITLEMENTS';

/**
 * The capabilities a free Apple Account cannot sign. Both are written by
 * `plugins/withVpnTunnel.js` when its flag is on; the build has to run without
 * them.
 */
export const BLOCKING_ENTITLEMENTS = [
  'com.apple.developer.networking.networkextension',
  'com.apple.security.application-groups',
];

/** Entitlement keys present in an entitlements plist, in the order given. */
export function findBlockingEntitlements(plistText, keys = BLOCKING_ENTITLEMENTS) {
  const text = String(plistText);
  return keys.filter((key) => text.includes(`<key>${key}</key>`));
}

/** The blocking capabilities in the generated entitlements file. */
export function readBlockingEntitlements() {
  return findBlockingEntitlements(readFileSync(ENTITLEMENTS, 'utf8'));
}
