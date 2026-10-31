/**
 * Where this project's iOS pieces live, and the three files that decide what a
 * build produces: `app.json`, the generated `Info.plist`, and the Xcode project.
 *
 * Every path is derived from this file's own location, so a copy of `tools/`
 * anywhere else — which is how the tests run — resolves against its own root.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The repository root. This file is `tools/release/ios/`, so the root is three levels up. */
export const ROOT = fileURLToPath(new URL('../../..', import.meta.url));

export const APP_DIR = join(ROOT, 'apps', 'mobile');
export const APP_JSON = join(APP_DIR, 'app.json');
export const IOS_DIR = join(ROOT, 'apps', 'mobile', 'ios');
export const WORKSPACE = join(IOS_DIR, 'UniversityAssistant.xcworkspace');
export const INFO_PLIST = join(IOS_DIR, 'UniversityAssistant', 'Info.plist');
export const ENTITLEMENTS = join(IOS_DIR, 'UniversityAssistant', 'UniversityAssistant.entitlements');
export const PBXPROJ = join(IOS_DIR, 'UniversityAssistant.xcodeproj', 'project.pbxproj');
export const ARCHIVE = join(IOS_DIR, 'build', 'UniversityAssistant.xcarchive');
/** `xcodebuild -exportArchive` writes here; the `.ipa` is moved out afterwards. */
export const EXPORT_SCRATCH = join(IOS_DIR, 'build', 'export');
export const DEFAULT_OUT_DIR = join(ROOT, 'apps', 'mobile', 'dist', 'ios');

/** The scheme in `ios/UniversityAssistant.xcodeproj`. */
export const SCHEME = 'UniversityAssistant';

/** The parts of `app.json` a build needs. */
export function readAppConfig() {
  const config = JSON.parse(readFileSync(APP_JSON, 'utf8')).expo ?? {};
  return {
    slug: config.slug || 'app',
    version: config.version || '',
    bundleId: config.ios?.bundleIdentifier ?? '',
  };
}

/** `CFBundleShortVersionString` and `CFBundleVersion` from an Info.plist. */
export function nativeVersion(infoPlistText) {
  const read = (key) => {
    const match = String(infoPlistText).match(
      new RegExp(`<key>${key}</key>\\s*<string>([^<]*)</string>`),
    );
    return match ? match[1].trim() : '';
  };
  return { version: read('CFBundleShortVersionString'), build: read('CFBundleVersion') };
}

/** The version the generated project was actually built at. */
export function readNativeVersion() {
  return nativeVersion(readFileSync(INFO_PLIST, 'utf8'));
}

/** The `DEVELOPMENT_TEAM` the generated Xcode project was last signed with. */
export function findTeamId(pbxprojText) {
  const match = String(pbxprojText).match(/DEVELOPMENT_TEAM = ([A-Za-z0-9]+);/);
  return match ? match[1] : '';
}

/** The team recorded in the project, or `''` when there is no project yet. */
export function projectTeamId() {
  if (!existsSync(PBXPROJ)) return '';
  return findTeamId(readFileSync(PBXPROJ, 'utf8'));
}

/**
 * Which team to sign with, in order of authority. `before` is the project as it
 * was found; `after` is the project after a prebuild, which a `--clean` run has
 * just stripped of `DEVELOPMENT_TEAM`, so the remembered value has to survive.
 */
export function resolveTeamId({ passed = '', fromEnv = '', before = '', after = '' } = {}) {
  return passed || fromEnv || after || before || '';
}
