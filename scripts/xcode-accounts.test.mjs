import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { copyFile, cp, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  capabilities,
  classifyTeam,
  diagnose,
  parseAccounts,
  parseArgs,
  parseIdentifiers,
  parseString,
  parseTeams,
} from './xcode-accounts.mjs';

const scriptPath = fileURLToPath(new URL('./xcode-accounts.mjs', import.meta.url));
const sandboxes = [];

// Fragments of Xcode's preferences, copied from a real machine that had two
// Apple Accounts signed in. The contradiction between the team list and the
// cached list keyed by identifier is the point of the fixture.

const ACCOUNTS_DICT = `<dict>
	<key>IDE.Identifiers.Prod</key>
	<array>
		<dict>
			<key>identifier</key>
			<string>E80CD1F9-357A-43B6-958B-F4B9988DAC6B</string>
		</dict>
	</array>
	<key>IDE.Prod</key>
	<array>
		<dict>
			<key>username</key>
			<string>apple@olimo.me</string>
		</dict>
		<dict>
			<key>username</key>
			<string>oliver.molnar@420cloud.io</string>
		</dict>
	</array>
</dict>`;

const TEAMS_DICT = `<dict>
	<key>apple@olimo.me</key>
	<array>
		<dict>
			<key>isFreeProvisioningTeam</key>
			<false/>
			<key>teamID</key>
			<string>QML5B57EMH</string>
			<key>teamName</key>
			<string>Oliver Molnar</string>
			<key>teamType</key>
			<string>Individual</string>
		</dict>
	</array>
	<key>oliver.molnar@420cloud.io</key>
	<array>
		<dict>
			<key>isFreeProvisioningTeam</key>
			<true/>
			<key>teamID</key>
			<string>6XQ89G26PX</string>
			<key>teamName</key>
			<string>Oliver Molnar (Personal Team)</string>
			<key>teamType</key>
			<string>Personal Team</string>
		</dict>
	</array>
</dict>`;

const CACHED_TEAMS_DICT = `<dict>
	<key>E80CD1F9-357A-43B6-958B-F4B9988DAC6B</key>
	<array>
		<dict>
			<key>isFreeProvisioningTeam</key>
			<true/>
			<key>teamID</key>
			<string>QML5B57EMH</string>
			<key>teamName</key>
			<string>Oliver Molnar (Personal Team)</string>
			<key>teamType</key>
			<string>Personal Team</string>
		</dict>
	</array>
</dict>`;

const PREFERENCES = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>DVTDeveloperAccountManagerAppleIDLists</key>
	${ACCOUNTS_DICT}
	<key>IDEProvisioningTeamByIdentifier</key>
	${CACHED_TEAMS_DICT}
	<key>IDEProvisioningTeamManagerLastSelectedTeamID</key>
	<string>QML5B57EMH</string>
	<key>IDEProvisioningTeams</key>
	${TEAMS_DICT}
</dict>
</plist>
`;

const REAL_TEAMS = parseTeams(TEAMS_DICT);
const REAL_CACHED_TEAMS = parseTeams(CACHED_TEAMS_DICT);

const TEAM_BLOCK = (teamId) =>
  `CODE_SIGN_STYLE = Automatic;\nDEVELOPMENT_TEAM = ${teamId};\nPRODUCT_BUNDLE_IDENTIFIER = dev.demo.universityassistant;\n`;

async function sandbox({ projectTeamId = 'QML5B57EMH' } = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'xcode-accounts-'));
  sandboxes.push(dir);

  await mkdir(join(dir, 'scripts'), { recursive: true });
  await copyFile(scriptPath, join(dir, 'scripts', 'xcode-accounts.mjs'));
  await cp(join(dirname(scriptPath), 'ios'), join(dir, 'scripts', 'ios'), { recursive: true });

  await mkdir(join(dir, 'ios', 'UniversityAssistant.xcodeproj'), { recursive: true });
  await writeFile(join(dir, 'ios', 'UniversityAssistant.xcodeproj', 'project.pbxproj'), TEAM_BLOCK(projectTeamId));

  const preferences = join(dir, 'xcode-preferences.plist');
  await writeFile(preferences, PREFERENCES);

  return { dir, preferences };
}

function run(dir, preferences, args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [join(dir, 'scripts', 'xcode-accounts.mjs'), ...args], {
      cwd: dir,
      env: { ...process.env, XCODE_PREFS_XML_FILE: preferences },
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

afterEach(async () => {
  await Promise.all(sandboxes.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

test('lists the signed-in Apple IDs in Xcode order', () => {
  assert.deepEqual(parseAccounts(ACCOUNTS_DICT), ['apple@olimo.me', 'oliver.molnar@420cloud.io']);
  assert.deepEqual(parseIdentifiers(ACCOUNTS_DICT), ['E80CD1F9-357A-43B6-958B-F4B9988DAC6B']);
  // Two accounts, one identifier: the shape that produces "missing Xcode-Token".
  assert.ok(parseIdentifiers(ACCOUNTS_DICT).length < parseAccounts(ACCOUNTS_DICT).length);
});

test('reads every team with the account that owns it', () => {
  assert.equal(REAL_TEAMS.length, 2);
  assert.deepEqual(REAL_TEAMS[0], {
    appleId: 'apple@olimo.me',
    teamId: 'QML5B57EMH',
    teamName: 'Oliver Molnar',
    teamType: 'Individual',
    isFree: false,
  });
  assert.deepEqual(REAL_TEAMS[1], {
    appleId: 'oliver.molnar@420cloud.io',
    teamId: '6XQ89G26PX',
    teamName: 'Oliver Molnar (Personal Team)',
    teamType: 'Personal Team',
    isFree: true,
  });
});

test('an account with no teams yields no rows for it', () => {
  assert.deepEqual(parseTeams('<dict><key>nobody@example.com</key><array/></dict>'), []);
});

test('a team is free exactly when Xcode says so', () => {
  assert.deepEqual(classifyTeam({ teamType: 'Personal Team', isFree: true }), { kind: 'personal', paid: false });
  assert.deepEqual(classifyTeam({ teamType: 'Individual', isFree: false }), { kind: 'individual', paid: true });
  assert.deepEqual(classifyTeam({ teamType: 'Organization', isFree: false }), { kind: 'organization', paid: true });
  // A contradiction resolves to the safer reading: free.
  assert.deepEqual(classifyTeam({ teamType: 'Personal Team', isFree: false }), { kind: 'personal', paid: false });
  assert.deepEqual(classifyTeam({}), { kind: 'individual', paid: true });
});

test('the free team allows only a sideloaded build', () => {
  assert.match(capabilities({ teamType: 'Personal Team', isFree: true }), /sideloaded hand-out build only/);
  assert.match(capabilities({ teamType: 'Individual', isFree: false }), /Ad Hoc/);
});

test('reads a single-value preference', () => {
  assert.equal(parseString('<plist><string>QML5B57EMH</string></plist>'), 'QML5B57EMH');
  assert.equal(parseString('<plist></plist>'), '');
});

test('the argument parser refuses anything it does not understand', () => {
  assert.deepEqual(parseArgs([]), { json: false, help: false });
  assert.deepEqual(parseArgs(['--json']), { json: true, help: false });
  assert.throws(() => parseArgs(['--teams']), /Unknown option "--teams"/);
});

test('the real two-account state is reported as three problems, not one', () => {
  const { projectTeam, warnings, notes } = diagnose({
    accounts: parseAccounts(ACCOUNTS_DICT),
    identifiers: parseIdentifiers(ACCOUNTS_DICT),
    teams: REAL_TEAMS,
    cachedTeams: REAL_CACHED_TEAMS,
    projectTeamId: 'QML5B57EMH',
    lastSelectedTeamId: 'QML5B57EMH',
  });

  const codes = warnings.map((warning) => warning.code);
  assert.ok(codes.includes('multiple-accounts'), codes.join(', '));
  assert.ok(codes.includes('unpaired-account'), codes.join(', '));
  assert.ok(codes.includes('stale-team-cache'), codes.join(', '));
  // The project team is present, so this one must not fire.
  assert.ok(!codes.includes('project-team-unknown'), codes.join(', '));

  assert.equal(projectTeam?.teamId, 'QML5B57EMH');
  assert.deepEqual(notes.map((note) => note.code), ['project-team-paid']);
});

test('a project team that is not among the accounts is reported', () => {
  const { warnings } = diagnose({
    accounts: ['only@example.com'],
    identifiers: ['ONLY'],
    teams: [{ appleId: 'only@example.com', teamId: '6XQ89G26PX', teamName: 'Personal Team', teamType: 'Personal Team', isFree: true }],
    projectTeamId: 'QML5B57EMH',
    lastSelectedTeamId: '6XQ89G26PX',
  });

  const codes = warnings.map((warning) => warning.code);
  assert.ok(codes.includes('project-team-unknown'), codes.join(', '));
  assert.ok(codes.includes('last-selected-differs'), codes.join(', '));
  assert.ok(!codes.includes('multiple-accounts'), codes.join(', '));
});

test('one account, one matching team, no warnings', () => {
  const { warnings, notes } = diagnose({
    accounts: ['dev@example.com'],
    identifiers: ['ID1'],
    teams: [{ appleId: 'dev@example.com', teamId: 'ABCDE12345', teamName: 'Dev', teamType: 'Individual', isFree: false }],
    projectTeamId: 'ABCDE12345',
    lastSelectedTeamId: 'ABCDE12345',
  });

  assert.deepEqual(warnings, []);
  assert.deepEqual(notes.map((note) => note.code), ['project-team-paid']);
});

test('a personal team is noted as sideload-only, not warned about', () => {
  const { warnings, notes } = diagnose({
    accounts: ['dev@example.com'],
    identifiers: ['ID1'],
    teams: [{ appleId: 'dev@example.com', teamId: 'ABCDE12345', teamName: 'Dev (Personal Team)', teamType: 'Personal Team', isFree: true }],
    projectTeamId: 'ABCDE12345',
    lastSelectedTeamId: 'ABCDE12345',
  });

  assert.deepEqual(warnings, []);
  assert.deepEqual(notes.map((note) => note.code), ['project-team-free']);
});

test('--json prints the accounts, the teams and the findings', async () => {
  const { dir, preferences } = await sandbox();
  const result = await run(dir, preferences, ['--json']);

  assert.equal(result.code, 0, result.stderr);
  const report = JSON.parse(result.stdout);

  assert.deepEqual(report.accounts, ['apple@olimo.me', 'oliver.molnar@420cloud.io']);
  assert.equal(report.projectTeamId, 'QML5B57EMH');
  assert.equal(report.teams.length, 2);
  assert.ok(report.warnings.some((warning) => warning.code === 'multiple-accounts'));
  assert.ok(report.notes.some((note) => note.code === 'project-team-paid'));
});

test('the human-readable output names the project team and its capabilities', async () => {
  const { dir, preferences } = await sandbox();
  const result = await run(dir, preferences, []);

  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /Signed in to Xcode/);
  assert.match(result.stdout, /TEAM ID\s+TYPE\s+ACCOUNT\s+NAME/);
  assert.match(result.stdout, /This project's DEVELOPMENT_TEAM: QML5B57EMH/);
  assert.match(result.stdout, /QML5B57EMH\s+Ad Hoc/);
  assert.match(result.stdout, /6XQ89G26PX\s+a sideloaded hand-out build only/);
  assert.match(result.stdout, /!/);
  assert.match(result.stdout, /What to do/);
});

test('a project pointing at an unknown team is caught before a build', async () => {
  const { dir, preferences } = await sandbox({ projectTeamId: 'AAAAAAAAAA' });
  const result = await run(dir, preferences, ['--json']);

  assert.equal(result.code, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.ok(report.warnings.some((warning) => warning.code === 'project-team-unknown'));
  assert.equal(report.projectTeam, null);
});

test('--help explains itself and reads nothing', async () => {
  const { dir, preferences } = await sandbox();
  const result = await run(dir, preferences, ['--help']);

  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /npm run ios:accounts/);
});
