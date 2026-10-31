#!/usr/bin/env node
/**
 * Builds the iOS test build as an `.ipa`, signed with the Apple Account that is
 * already signed in to Xcode on this machine.
 *
 *   npm run ios:ipa                 Archive what is in ios/ and export the .ipa
 *   npm run ios:ipa -- --prebuild   Regenerate ios/ first, then build
 *   npm run ios:ipa -- --clean      Regenerate ios/ from scratch, then build
 *   npm run ios:ipa -- --team ABCDE12345
 *   npm run ios:ipa -- --out /tmp/ipa
 *
 * This file is the orchestration only. The pieces live in `tools/release/ios/`:
 *
 *   project.mjs       paths, app.json, Info.plist, the team
 *   entitlements.mjs  the capabilities a free Account cannot sign
 *   provisioning.mjs  reading the signature back out of the exported .ipa
 *   artifact.mjs      the .ipa's name, export options and checksum
 *   cli.mjs           child processes, failure reporting, entry-point detection
 *
 * Why a script and not the Organizer: the signing identity lives in this Mac's
 * keychain, the one thing that silently breaks it is a stale entitlements file,
 * and the Organizer does not tell you either of those until ten minutes in.
 *
 * What it does, in order:
 *   1. Reads `app.json`, `ios/**\/Info.plist` and the Xcode project.
 *   2. Refuses to start an archive the local Account cannot sign.
 *   3. Archives `Release` for `generic/platform=iOS`, so the JavaScript bundle
 *      is embedded and a tester needs no development server.
 *   4. Exports the `.ipa`, reads the embedded provisioning profile back, and
 *      fails if the wrong team signed it.
 *
 * The `.ipa` is a payload, not an installer: it carries this team's signature,
 * and a tester on a free Account re-signs it with their own. See
 * docs/engineering/ios-distribution.md.
 */

import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { basename, join, resolve } from 'node:path';

import { sha256, exportOptionsPlist, ipaFileName } from './ios/artifact.mjs';
import { fail, invokedDirectly, run } from './ios/cli.mjs';
import { IOS_ENTITLEMENTS_FLAG, readBlockingEntitlements } from './ios/entitlements.mjs';
import { assessSignature, readIpaProfile, PERSONAL_TEAM_MAX_DAYS } from './ios/provisioning.mjs';
import {
  ARCHIVE,
  DEFAULT_OUT_DIR,
  ENTITLEMENTS,
  EXPORT_SCRATCH,
  INFO_PLIST,
  IOS_DIR,
  APP_DIR,
  ROOT,
  SCHEME,
  WORKSPACE,
  nativeVersion,
  projectTeamId,
  readAppConfig,
  resolveTeamId,
} from './ios/project.mjs';

/** Printed when xcodebuild stops on something an Apple Account could explain. */
const ACCOUNT_HINT =
  'If the log mentions credentials, an Apple Account or a missing Xcode-Token,\nrun this to see which account owns which team: npm run ios:accounts';

export function parseArgs(argv) {
  const options = { prebuild: false, clean: false, team: '', out: DEFAULT_OUT_DIR, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--prebuild') {
      options.prebuild = true;
    } else if (arg === '--clean') {
      options.clean = true;
      options.prebuild = true;
    } else if (arg === '--team') {
      options.team = argv[index + 1] ?? '';
      index += 1;
      if (!options.team) throw new Error('--team needs the 10-character team id.');
    } else if (arg === '--out') {
      options.out = resolve(argv[index + 1] ?? '');
      index += 1;
      if (!argv[index]) throw new Error('--out needs a directory.');
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else {
      throw new Error(`Unknown option "${arg}". Nothing was built.`);
    }
  }
  return options;
}

function usage() {
  console.log(`Build the iOS test build as an .ipa.

  npm run ios:ipa                  Archive ios/ as Release and export the .ipa
  npm run ios:ipa -- --prebuild    Regenerate ios/ first, then build
  npm run ios:ipa -- --clean       Regenerate ios/ from scratch, then build
  npm run ios:ipa -- --team ABCDE12345
  npm run ios:ipa -- --out /tmp/ipa
  npm run ios:ipa -- --help        This text

Needs Xcode with an Apple Account signed in (Xcode > Settings > Accounts) and a
physical device connected once, so the Account knows about it.

The output .ipa carries this team's signature. Read back after the export, so a
wrong or expired signature fails the run. Details:
docs/engineering/ios-distribution.md`);
}

/** Everything that has to be true before xcodebuild is worth starting. */
export function preflight(options) {
  if (process.platform !== 'darwin') {
    fail('This builds an iOS app, so it only runs on macOS.');
  }

  const xcodeVersion = spawnSync('xcodebuild', ['-version'], { encoding: 'utf8' });
  if (xcodeVersion.error || xcodeVersion.status !== 0) {
    fail(
      'xcodebuild is not available.',
      'Install Xcode, then run: sudo xcode-select -s /Applications/Xcode.app',
    );
  }
  console.log(xcodeVersion.stdout.trim().replace(/\n/g, ' — '));

  const app = readAppConfig();
  if (!app.bundleId) {
    fail(
      'app.json has no expo.ios.bundleIdentifier.',
      'A bundle id is required before anything can be signed.',
    );
  }
  console.log(`App:      ${app.slug} ${app.version} (${app.bundleId})`);

  if (!existsSync(IOS_DIR)) {
    console.log('\nios/ does not exist, so it will be generated first.');
    options.prebuild = true;
  }

  // A --clean prebuild strips DEVELOPMENT_TEAM from the project, so read it
  // before the tree is regenerated.
  const teamBefore = projectTeamId();

  if (options.prebuild) {
    const args = ['expo', 'prebuild', '--platform', 'ios'];
    if (options.clean) args.push('--clean');
    console.log(`\n$ bunx ${args.join(' ')}`);
    if (process.env[IOS_ENTITLEMENTS_FLAG] === '1') {
      console.log(
        `Note: ${IOS_ENTITLEMENTS_FLAG}=1 is set, so the VPN entitlements will be written\n` +
          'and a free Account will not be able to sign the result.',
      );
    }
    run('bunx', args, { cwd: APP_DIR, label: 'expo prebuild' });
  }

  if (!existsSync(ENTITLEMENTS)) {
    fail(`No entitlements file at ${ENTITLEMENTS}.`, 'Run again with --prebuild to generate ios/.');
  }

  // The one check that saves a ten-minute archive.
  const blocking = readBlockingEntitlements();
  if (blocking.length > 0) {
    fail(
      `The entitlements file asks for capabilities a free Apple Account cannot sign:\n  ${blocking.join('\n  ')}`,
      'This is the prebuild trap in docs/engineering/ios-distribution.md. Either run\n' +
        'again with --clean to regenerate ios/ without them (the plugin keeps the iOS\n' +
        `entitlements off unless ${IOS_ENTITLEMENTS_FLAG}=1), or remove them by hand from\n` +
        `  ${ENTITLEMENTS}`,
    );
  }

  const team = resolveTeamId({
    passed: options.team,
    fromEnv: process.env.APPLE_TEAM_ID ?? '',
    before: teamBefore,
    after: projectTeamId(),
  });
  if (!team) {
    fail(
      'No Apple team id found.',
      'Sign the project once in Xcode, or pass one: npm run ios:ipa -- --team ABCDE12345\n' +
        'To see the teams Xcode knows about: npm run ios:accounts',
    );
  }
  const teamSource = options.team
    ? 'from --team'
    : process.env.APPLE_TEAM_ID
      ? 'from APPLE_TEAM_ID'
      : 'from the Xcode project';
  console.log(`Team:     ${team} (${teamSource})`);

  if (!existsSync(INFO_PLIST)) {
    fail(`No Info.plist at ${INFO_PLIST}.`, 'Run again with --prebuild.');
  }
  const native = nativeVersion(readFileSync(INFO_PLIST, 'utf8'));
  console.log(`Native:   ${native.version} (build ${native.build})`);
  if (app.version && native.version && app.version !== native.version) {
    console.log(
      `\nWarning: app.json says ${app.version} but ios/ was built at ${native.version}.\n` +
        'The .ipa ships the native version printed above. Run with --clean to regenerate.',
    );
  }

  return { app, native, team };
}

/** Archive Release for a device, signed by `team`. */
function archive(team) {
  console.log('\n$ xcodebuild … archive (-configuration Release)');
  rmSync(ARCHIVE, { recursive: true, force: true });
  run(
    'xcodebuild',
    [
      '-workspace', WORKSPACE,
      '-scheme', SCHEME,
      '-configuration', 'Release',
      '-destination', 'generic/platform=iOS',
      '-archivePath', ARCHIVE,
      '-allowProvisioningUpdates',
      '-quiet',
      `DEVELOPMENT_TEAM=${team}`,
      'CODE_SIGN_STYLE=Automatic',
      'archive',
    ],
    { cwd: ROOT, label: 'xcodebuild archive', hint: ACCOUNT_HINT },
  );
}

/** Export the development-signed `.ipa` from the archive just built. */
function exportIpa(team) {
  // xcodebuild writes next to the options file, so both get a scratch directory
  // that is deleted on the way out. The .ipa is moved to its final name after.
  rmSync(EXPORT_SCRATCH, { recursive: true, force: true });
  mkdirSync(EXPORT_SCRATCH, { recursive: true });
  const optionsPath = join(EXPORT_SCRATCH, 'ExportOptions.plist');
  writeFileSync(optionsPath, exportOptionsPlist(team));

  console.log('\n$ xcodebuild -exportArchive (-method development)');
  run(
    'xcodebuild',
    [
      '-exportArchive',
      '-archivePath', ARCHIVE,
      '-exportOptionsPlist', optionsPath,
      '-exportPath', EXPORT_SCRATCH,
      '-allowProvisioningUpdates',
    ],
    { cwd: ROOT, label: 'xcodebuild -exportArchive', hint: ACCOUNT_HINT },
  );

  const exported = join(EXPORT_SCRATCH, `${SCHEME}.ipa`);
  if (!existsSync(exported)) {
    fail(
      `The export finished but produced no .ipa at ${exported}.`,
      `Look in ${EXPORT_SCRATCH} for what it made instead.`,
    );
  }
  return exported;
}

/**
 * Read the signature back out of the exported `.ipa`. The account xcodebuild
 * *tried* is not the same question as the team that signed, and only the file
 * answers the second one.
 */
export function verifySignature(ipaPath, team) {
  const profile = readIpaProfile(ipaPath);
  if (!profile) return { profile: null, assessment: null };
  const assessment = assessSignature(profile, team);
  if (assessment.problems.length > 0) {
    fail(
      `The exported .ipa failed verification:\n  ${assessment.problems.join('\n  ')}`,
      `The file is at ${ipaPath}. Inspect it with:\n` +
        '  security cms -D -i Payload/*.app/embedded.mobileprovision',
    );
  }
  return { profile, assessment };
}

function report({ target, app, native, profile, assessment }) {
  console.log(`\nBuilt ${basename(target)}`);
  console.log(`  ${target}`);
  console.log(`  ${(statSync(target).size / (1024 * 1024)).toFixed(1)} MB`);
  console.log(`  sha256 ${sha256(target)}`);
  console.log('');
  console.log(`  Version ${native.version} (build ${native.build}), ${app.bundleId}.`);
  console.log('  Self-contained: the JavaScript bundle is inside, so no development server is needed.');

  if (!profile || !assessment) {
    console.log('');
    console.log('  Could not read the embedded provisioning profile, so the signature was NOT verified.');
    console.log('  Check it by hand: unzip -p <ipa> "Payload/*.app/embedded.mobileprovision" | security cms -D -i /dev/stdin');
    return;
  }

  console.log('');
  console.log(`  Signed by team ${profile.teamId} — ${profile.teamName || profile.name}`);
  console.log(`  ${profile.applicationIdentifier}`);
  console.log(`  Profile expires ${profile.expiresAt}`);
  console.log(`  Provisioned devices: ${profile.provisionedDevices}`);
  for (const note of assessment.notes) console.log(`  · ${note}`);
  console.log('');
  if (assessment.days !== null && assessment.days > PERSONAL_TEAM_MAX_DAYS) {
    console.log('  This team is paid, so Ad Hoc (100 devices per year) or TestFlight reach');
    console.log('  testers without a weekly refresh. The sideloading route is the fallback:');
  } else {
    console.log('  Hand this to a tester through a sideloading host:');
  }
  console.log('  install SideStore, sign in with their own Apple Account, open this .ipa in');
  console.log('  it, and refresh every 7 days. They cannot install it by tapping it.');
  console.log('  See docs/engineering/ios-distribution.md.');
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    usage();
    return;
  }

  const { app, native, team } = preflight(options);
  archive(team);

  const exported = exportIpa(team);
  mkdirSync(options.out, { recursive: true });
  const target = join(
    options.out,
    ipaFileName({ slug: app.slug, version: native.version, build: native.build, at: new Date() }),
  );
  renameSync(exported, target);
  rmSync(EXPORT_SCRATCH, { recursive: true, force: true });

  const { profile, assessment } = verifySignature(target, team);
  report({ target, app, native, profile, assessment });
}

// Run the CLI only when executed directly. Tests import the helpers above.
if (invokedDirectly(import.meta.url)) {
  try {
    main();
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
}
