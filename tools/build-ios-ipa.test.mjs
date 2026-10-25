import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chmod, copyFile, cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { parseArgs } from './build-ios-ipa.mjs';
import { exportOptionsPlist, ipaFileName, timestamp } from './ios/artifact.mjs';
import { IOS_ENTITLEMENTS_FLAG, findBlockingEntitlements } from './ios/entitlements.mjs';
import { PERSONAL_TEAM_MAX_DAYS, assessSignature, parseProvisioningProfile } from './ios/provisioning.mjs';
import { findTeamId, nativeVersion, resolveTeamId } from './ios/project.mjs';

const scriptPath = fileURLToPath(new URL('./build-ios-ipa.mjs', import.meta.url));
const pluginPath = fileURLToPath(new URL('../apps/mobile/plugins/withVpnTunnel.js', import.meta.url));

const TEAM = 'QML5B57EMH';
const sandboxes = [];
const MAC_ONLY = process.platform !== 'darwin' ? 'iOS archives need macOS and Xcode' : false;

const APP_JSON = JSON.stringify({
  expo: {
    name: 'University Assistant',
    slug: 'university-assistant',
    version: '1.0.0',
    ios: { bundleIdentifier: 'dev.demo.universityassistant', supportsTablet: true },
  },
});

const INFO_PLIST = `<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0">
<dict>
	<key>CFBundleShortVersionString</key>
	<string>1.0.0</string>
	<key>CFBundleVersion</key>
	<string>1</string>
</dict>
</plist>
`;

const EMPTY_ENTITLEMENTS = `<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0">
  <dict/>
</plist>
`;

const VPN_ENTITLEMENTS = `<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0">
  <dict>
    <key>com.apple.developer.networking.networkextension</key>
    <array>
      <string>packet-tunnel-provider</string>
    </array>
    <key>com.apple.security.application-groups</key>
    <array>
      <string>group.dev.demo.universityassistant</string>
    </array>
  </dict>
</plist>
`;

/**
 * A stand-in for xcodebuild. It records every invocation and does the two side
 * effects the script depends on: an archive directory and an exported .ipa.
 */
const FAKE_XCODEBUILD = `#!/usr/bin/env node
const { appendFileSync, mkdirSync, writeFileSync } = require('node:fs');
const args = process.argv.slice(2);
appendFileSync(process.env.IOS_IPA_FAKE_LOG, args.join(' ') + '\\n');
const value = (flag) => {
  const index = args.indexOf(flag);
  return index === -1 ? '' : args[index + 1];
};
if (args.includes('-version')) {
  console.log('Xcode 27.1');
  console.log('Build version 27A9275');
  process.exit(0);
}
if (args.includes('-exportArchive')) {
  const out = value('-exportPath');
  mkdirSync(out, { recursive: true });
  writeFileSync(out + '/UniversityAssistant.ipa', 'ipa-bytes');
} else if (args.includes('-archivePath')) {
  const archive = value('-archivePath');
  mkdirSync(archive, { recursive: true });
  writeFileSync(archive + '/Info.plist', '<plist/>');
}
process.exit(0);
`;

/**
 * A stand-in for `bunx expo prebuild`. It does the one thing that matters to the
 * script's preflight: regenerate the project without `DEVELOPMENT_TEAM`.
 */
const FAKE_BUNX = `#!/usr/bin/env node
const { readFileSync, writeFileSync } = require('node:fs');
const args = process.argv.slice(2);
if (args[0] === 'expo' && args[1] === 'prebuild') {
  const path = 'ios/UniversityAssistant.xcodeproj/project.pbxproj';
  writeFileSync(path, readFileSync(path, 'utf8').replace(/DEVELOPMENT_TEAM = [A-Za-z0-9]+;\\n/, ''));
  console.log('(fake prebuild regenerated ios/)');
}
process.exit(0);
`;

/** A project tree the script can preflight, plus fake `xcodebuild` and `bunx` on PATH. */
async function sandbox({ entitlements = EMPTY_ENTITLEMENTS, appJson = APP_JSON } = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'ios-ipa-'));
  sandboxes.push(dir);

  await mkdir(join(dir, 'tools'), { recursive: true });
  await mkdir(join(dir, 'apps', 'mobile'), { recursive: true });
  await copyFile(scriptPath, join(dir, 'tools', 'build-ios-ipa.mjs'));
  await cp(join(dirname(scriptPath), 'ios'), join(dir, 'tools', 'ios'), { recursive: true });
  await writeFile(join(dir, 'apps', 'mobile', 'app.json'), appJson);

  await mkdir(join(dir, 'apps', 'mobile', 'ios', 'UniversityAssistant'), { recursive: true });
  await mkdir(join(dir, 'apps', 'mobile', 'ios', 'UniversityAssistant.xcodeproj'), { recursive: true });
  await writeFile(join(dir, 'apps', 'mobile', 'ios', 'UniversityAssistant.xcworkspace'), 'workspace');
  await writeFile(join(dir, 'apps', 'mobile', 'ios', 'UniversityAssistant', 'Info.plist'), INFO_PLIST);
  await writeFile(join(dir, 'apps', 'mobile', 'ios', 'UniversityAssistant', 'UniversityAssistant.entitlements'), entitlements);
  await writeFile(
    join(dir, 'apps', 'mobile', 'ios', 'UniversityAssistant.xcodeproj', 'project.pbxproj'),
    `CODE_SIGN_STYLE = Automatic;\nDEVELOPMENT_TEAM = ${TEAM};\nPRODUCT_BUNDLE_IDENTIFIER = dev.demo.universityassistant;\n`,
  );

  const bin = join(dir, 'bin');
  await mkdir(bin, { recursive: true });
  const fake = join(bin, 'xcodebuild');
  await writeFile(fake, FAKE_XCODEBUILD);
  await chmod(fake, 0o755);
  const fakeBunx = join(bin, 'bunx');
  await writeFile(fakeBunx, FAKE_BUNX);
  await chmod(fakeBunx, 0o755);

  return { dir, log: join(dir, 'xcodebuild.log') };
}

function run(dir, args, log) {
  return new Promise((resolve) => {
    // Hermetic: the developer's own environment must not decide the outcome.
    const env = {
      ...process.env,
      PATH: `${join(dir, 'bin')}:${process.env.PATH}`,
      IOS_IPA_FAKE_LOG: log,
    };
    delete env.APPLE_TEAM_ID;
    delete env[IOS_ENTITLEMENTS_FLAG];
    const child = spawn(process.execPath, [join(dir, 'tools', 'build-ios-ipa.mjs'), ...args], {
      cwd: dir,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

async function invocations(log) {
  try {
    return (await readFile(log, 'utf8')).trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

afterEach(async () => {
  await Promise.all(sandboxes.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

test('the flag this script names is the one the config plugin reads', async () => {
  const plugin = await readFile(pluginPath, 'utf8');
  assert.match(plugin, new RegExp(`'${IOS_ENTITLEMENTS_FLAG}'`));
});

// Mirrors a real profile from this project: a paid team's one-year development
// profile, read back with `security cms -D`.
const PROFILE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0">
<dict>
	<key>AppIDName</key>
	<string>UniversityAssistant</string>
	<key>CreationDate</key>
	<date>2026-10-18T20:48:08Z</date>
	<key>ExpirationDate</key>
	<date>2027-10-18T20:48:08Z</date>
	<key>Name</key>
	<string>iOS Team Provisioning Profile: dev.demo.universityassistant</string>
	<key>ProvisionedDevices</key>
	<array>
		<string>00008101-001971222298001E</string>
		<string>00008030-000A1B2C3D4E5F60</string>
	</array>
	<key>TeamIdentifier</key>
	<array>
		<string>QML5B57EMH</string>
	</array>
	<key>TeamName</key>
	<string>Oliver Molnar</string>
	<key>UUID</key>
	<string>5a5222e4-b325-4885-b7a6-92b26849d5c1</string>
	<key>Entitlements</key>
	<dict>
		<key>application-identifier</key>
		<string>QML5B57EMH.dev.demo.universityassistant</string>
		<key>get-task-allow</key>
		<true/>
	</dict>
</dict>
</plist>
`;

test('reads the team, the expiry and the devices out of an embedded profile', () => {
  const profile = parseProvisioningProfile(PROFILE_XML);
  assert.equal(profile.teamId, 'QML5B57EMH');
  assert.equal(profile.teamName, 'Oliver Molnar');
  assert.equal(profile.name, 'iOS Team Provisioning Profile: dev.demo.universityassistant');
  assert.equal(profile.expiresAt, '2027-10-18T20:48:08Z');
  assert.equal(profile.applicationIdentifier, 'QML5B57EMH.dev.demo.universityassistant');
  assert.equal(profile.getTaskAllow, true);
  assert.equal(profile.provisionedDevices, 2);
});

test('a one-year profile is reported as a paid membership, not a free one', () => {
  const profile = parseProvisioningProfile(PROFILE_XML);
  const { problems, notes, days } = assessSignature(profile, 'QML5B57EMH', new Date('2026-10-19T12:00:00Z'));

  assert.deepEqual(problems, []);
  assert.equal(days, 364);
  assert.match(notes.join(' '), /paid membership/);
  assert.doesNotMatch(notes.join(' '), /free Apple Account issues/);
});

test('a seven-day profile is reported as the free-account lifetime', () => {
  const profile = { ...parseProvisioningProfile(PROFILE_XML), expiresAt: '2026-10-26T12:00:00Z' };
  const { problems, notes } = assessSignature(profile, 'QML5B57EMH', new Date('2026-10-19T12:00:00Z'));

  assert.deepEqual(problems, []);
  assert.match(notes.join(' '), /7-day lifetime a free Apple Account issues/);
});

test('a signature from the wrong team is a failure, not a note', () => {
  const profile = parseProvisioningProfile(PROFILE_XML);
  const { problems } = assessSignature(profile, '6XQ89G26PX', new Date('2026-10-19T12:00:00Z'));

  assert.equal(problems.length, 1);
  assert.match(problems[0], /Signed by team QML5B57EMH, but 6XQ89G26PX was requested/);
});

test('an expired profile and a non-development build are both failures', () => {
  const expired = parseProvisioningProfile(PROFILE_XML);
  expired.expiresAt = '2026-10-01T12:00:00Z';
  expired.getTaskAllow = false;

  const { problems } = assessSignature(expired, 'QML5B57EMH', new Date('2026-10-19T12:00:00Z'));
  assert.equal(problems.length, 2, problems.join(' | '));
  assert.ok(problems.some((problem) => /expired 18 day/.test(problem)), problems.join(' | '));
  assert.ok(problems.some((problem) => /get-task-allow is absent/.test(problem)), problems.join(' | '));
});

test('finds the capabilities a free Apple Account cannot sign', () => {
  assert.deepEqual(findBlockingEntitlements(VPN_ENTITLEMENTS), [
    'com.apple.developer.networking.networkextension',
    'com.apple.security.application-groups',
  ]);
});

test('an empty entitlements file blocks nothing', () => {
  assert.deepEqual(findBlockingEntitlements(EMPTY_ENTITLEMENTS), []);
  assert.deepEqual(findBlockingEntitlements(''), []);
});

test('reads the version that will actually ship', () => {
  assert.deepEqual(nativeVersion(INFO_PLIST), { version: '1.0.0', build: '1' });
  assert.deepEqual(nativeVersion(''), { version: '', build: '' });
});

test('reads the team out of the generated project', () => {
  assert.equal(findTeamId(`DEVELOPMENT_TEAM = ${TEAM};`), TEAM);
  assert.equal(findTeamId('CODE_SIGN_STYLE = Automatic;'), '');
});

test('a flag or a remembered team beats an empty project after --clean', () => {
  // --clean regenerates the project without DEVELOPMENT_TEAM, so the value read
  // before prebuild is the only one left.
  assert.equal(resolveTeamId({ before: TEAM, after: '' }), TEAM);
  assert.equal(resolveTeamId({ before: 'OLD', after: 'NEW' }), 'NEW');
  assert.equal(resolveTeamId({ fromEnv: 'ENV123456', before: TEAM }), 'ENV123456');
  assert.equal(resolveTeamId({ passed: 'PASS123456', fromEnv: 'ENV123456', before: TEAM }), 'PASS123456');
  assert.equal(resolveTeamId({}), '');
});

test('names the ipa after the version it ships and sorts by time', () => {
  const at = new Date('2026-10-19T14:03:07Z');
  assert.equal(timestamp(at), '20261019-1403');
  assert.equal(
    ipaFileName({ slug: 'university-assistant', version: '1.0.0', build: '1', at }),
    'university-assistant-1.0.0-1-20261019-1403.ipa',
  );
  assert.equal(
    ipaFileName({ slug: 'a b/c', version: '1.0.0', build: '2', at }),
    'a-b-c-1.0.0-2-20261019-1403.ipa',
  );
});

test('exports with the strongest signature a personal team can get', () => {
  const plist = exportOptionsPlist(TEAM);
  assert.match(plist, /<key>method<\/key>\s*<string>development<\/string>/);
  assert.match(plist, new RegExp(`<key>teamID</key>\\s*<string>${TEAM}</string>`));
  assert.match(plist, /<key>signingStyle<\/key>\s*<string>automatic<\/string>/);
  assert.doesNotMatch(plist, /app-store|ad-hoc|enterprise/);
});

test('the argument parser refuses anything it does not understand', () => {
  assert.throws(() => parseArgs(['--release']), /Unknown option "--release"/);
  assert.throws(() => parseArgs(['--team']), /--team needs/);
  assert.deepEqual(parseArgs([]), {
    prebuild: false,
    clean: false,
    team: '',
    out: parseArgs([]).out,
    help: false,
  });
});

test('--clean regenerates the project, so it implies --prebuild', () => {
  const options = parseArgs(['--clean']);
  assert.equal(options.clean, true);
  assert.equal(options.prebuild, true);
});

test('preflight refuses entitlements a free account cannot sign, before xcodebuild runs', { skip: MAC_ONLY }, async () => {
  const { dir, log } = await sandbox({ entitlements: VPN_ENTITLEMENTS });
  const result = await run(dir, [], log);

  assert.equal(result.code, 1);
  assert.match(result.stderr, /com\.apple\.developer\.networking\.networkextension/);
  assert.match(result.stderr, /free Apple Account cannot sign/);
  assert.match(result.stderr, /ios-distribution\.md/);
  // The refusal has to happen before the ten-minute archive, not after it.
  assert.deepEqual(await invocations(log), ['-version']);
});

test('a clean tree archives, exports, and reports the ipa', { skip: MAC_ONLY }, async () => {
  const { dir, log } = await sandbox();
  const result = await run(dir, [], log);

  assert.equal(result.code, 0, result.stderr);
  const calls = await invocations(log);
  assert.equal(calls.length, 3, calls.join('\n'));
  assert.match(calls[0], /^-version$/);
  assert.match(calls[1], /-archivePath .*UniversityAssistant\.xcarchive/);
  assert.match(calls[1], /-configuration Release/);
  assert.match(calls[1], /-destination generic\/platform=iOS/);
  assert.match(calls[1], new RegExp(`DEVELOPMENT_TEAM=${TEAM}`));
  assert.match(calls[1], /archive$/);
  assert.match(calls[2], /^-exportArchive/);

  const ipas = (await readdir(join(dir, 'apps', 'mobile', 'dist', 'ios'))).filter((name) => name.endsWith('.ipa'));
  assert.equal(ipas.length, 1);
  assert.match(ipas[0], /^university-assistant-1\.0\.0-1-\d{8}-\d{4}\.ipa$/);
  assert.match(result.stdout, new RegExp(`sha256 [0-9a-f]{64}`));
  // The stand-in .ipa is not a real archive, so verification must degrade to a
  // visible warning rather than fail or silently claim success.
  assert.match(result.stdout, /signature was NOT verified/);
  // The scratch directory is not left behind next to the archive.
  const buildDir = await readdir(join(dir, 'apps', 'mobile', 'ios', 'build'));
  assert.ok(!buildDir.includes('export'), buildDir.join(', '));
});

test('the day count decides whether the team is reported as paid', () => {
  assert.equal(PERSONAL_TEAM_MAX_DAYS, 8);
  const paid = assessSignature({ teamId: 'T', expiresAt: '2027-10-18T00:00:00Z', getTaskAllow: true }, 'T', new Date('2026-10-19T00:00:00Z'));
  assert.match(paid.notes.join(' '), /paid membership/);
  const free = assessSignature({ teamId: 'T', expiresAt: '2026-10-26T00:00:00Z', getTaskAllow: true }, 'T', new Date('2026-10-19T00:00:00Z'));
  assert.match(free.notes.join(' '), /free Apple Account issues/);
});

test('a missing team is reported instead of guessed', { skip: MAC_ONLY }, async () => {
  const { dir, log } = await sandbox();
  await writeFile(join(dir, 'apps', 'mobile', 'ios', 'UniversityAssistant.xcodeproj', 'project.pbxproj'), 'CODE_SIGN_STYLE = Automatic;\n');
  const result = await run(dir, [], log);

  assert.equal(result.code, 1);
  assert.match(result.stderr, /No Apple team id found/);
  assert.deepEqual(await invocations(log), ['-version']);
});

test('--clean remembers the team that the regenerated project dropped', { skip: MAC_ONLY }, async () => {
  const { dir, log } = await sandbox();
  const result = await run(dir, ['--clean'], log);

  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /expo prebuild --platform ios --clean/);

  // The fake prebuild strips DEVELOPMENT_TEAM, exactly like the real one.
  const pbxproj = await readFile(join(dir, 'apps', 'mobile', 'ios', 'UniversityAssistant.xcodeproj', 'project.pbxproj'), 'utf8');
  assert.doesNotMatch(pbxproj, /DEVELOPMENT_TEAM/);

  const calls = await invocations(log);
  assert.match(calls[1], new RegExp(`DEVELOPMENT_TEAM=${TEAM}`));
  assert.match(result.stdout, /Team:\s+QML5B57EMH/);
});
