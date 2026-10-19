#!/usr/bin/env node
/**
 * Prints the Apple accounts and teams Xcode knows about, and compares them with
 * the team this project is configured to sign with.
 *
 *   npm run ios:accounts
 *   npm run ios:accounts -- --json     Machine-readable output
 *
 * `xcodebuild` cannot be told which account to use. It picks one from Xcode's
 * own preferences, and when several Apple Accounts are signed in it may reach for
 * the wrong one and log:
 *
 *   DVTDeveloperAccountManager: Failed to load credentials for <account>:
 *   "Invalid credentials in keychain for <account>, missing Xcode-Token"
 *
 * This script shows what it has to choose from, so the fix is obvious: remove a
 * stale account, or sign in again for the one that owns the team.
 *
 * Sources, both read-only:
 *   - `defaults export com.apple.dt.Xcode -`, which holds
 *     `DVTDeveloperAccountManagerAppleIDLists` (the signed-in Apple IDs) and
 *     `IDEProvisioningTeams` (each account's teams). Neither can be converted to
 *     JSON wholesale, so each key is extracted with `plutil -extract`.
 *   - `ios/**\/project.pbxproj`, for the team this project asks for.
 *
 * It cannot read credential state: the Xcode token lives in a keychain item this
 * has no reliable name for, which is why a missing token shows up here only as an
 * account with no stored identifier.
 */

import { spawnSync } from 'node:child_process';

import { invokedDirectly } from './ios/cli.mjs';
import { projectTeamId } from './ios/project.mjs';

/** The preference keys this reads. Everything else in the prefs is ignored. */
export const PREFERENCE_KEYS = {
  accounts: 'DVTDeveloperAccountManagerAppleIDLists',
  teams: 'IDEProvisioningTeams',
  teamByIdentifier: 'IDEProvisioningTeamByIdentifier',
  lastSelected: 'IDEProvisioningTeamManagerLastSelectedTeamID',
};

/** The Apple IDs signed in to Xcode, in Xcode's own order. */
export function parseAccounts(xml) {
  const body = String(xml).match(/<key>IDE\.Prod<\/key>\s*<array>([\s\S]*?)<\/array>/);
  if (!body) return [];
  return [...body[1].matchAll(/<key>username<\/key>\s*<string>([^<]*)<\/string>/g)].map((match) => match[1]);
}

/**
 * The account identifiers Xcode stores, in the same order as the Apple IDs.
 * A signed-in account with no identifier here is the shape that produces the
 * "missing Xcode-Token" message.
 */
export function parseIdentifiers(xml) {
  const body = String(xml).match(/<key>IDE\.Identifiers\.Prod<\/key>\s*<array>([\s\S]*?)<\/array>/);
  if (!body) return [];
  return [...body[1].matchAll(/<key>identifier<\/key>\s*<string>([^<]*)<\/string>/g)].map((match) => match[1]);
}

/** `{ appleId, teamId, teamName, teamType, isFree }` for every account's teams. */
export function parseTeams(xml) {
  const rows = [];
  const accounts = String(xml).matchAll(/<key>([^<]+)<\/key>\s*<array>([\s\S]*?)<\/array>/g);
  for (const account of accounts) {
    for (const entry of account[2].matchAll(/<dict>([\s\S]*?)<\/dict>/g)) {
      const dict = entry[1];
      const read = (key) => {
        const match = dict.match(new RegExp(`<key>${key}</key>\\s*<string>([^<]*)</string>`));
        return match ? match[1] : '';
      };
      rows.push({
        appleId: account[1],
        teamId: read('teamID'),
        teamName: read('teamName'),
        teamType: read('teamType'),
        isFree: /<key>isFreeProvisioningTeam<\/key>\s*<true\/>/.test(dict),
      });
    }
  }
  return rows;
}

/** The single `<string>` in a preference that holds one, such as the last team. */
export function parseString(xml) {
  const match = String(xml).match(/<string>([^<]*)<\/string>/);
  return match ? match[1] : '';
}

/** A team is free exactly when Xcode says it is; the type name is a fallback. */
export function classifyTeam({ teamType = '', isFree = false } = {}) {
  if (isFree || teamType === 'Personal Team') return { kind: 'personal', paid: false };
  if (teamType === 'Organization') return { kind: 'organization', paid: true };
  return { kind: 'individual', paid: true };
}

/** What a team can actually distribute, in the words of the distribution doc. */
export function capabilities(team) {
  return classifyTeam(team).paid
    ? 'Ad Hoc (100 devices per membership year) and TestFlight'
    : 'a sideloaded hand-out build only';
}

/**
 * What is inconsistent (`warnings`) and what is merely worth knowing (`notes`).
 * Returned as codes so a test can assert on them without matching prose.
 */
export function diagnose({ accounts = [], identifiers = [], teams = [], cachedTeams = [], projectTeamId = '', lastSelectedTeamId = '' } = {}) {
  const warnings = [];
  const notes = [];
  const warn = (code, message) => warnings.push({ code, message });
  const note = (code, message) => notes.push({ code, message });

  const projectTeam = teams.find((team) => team.teamId === projectTeamId) ?? null;

  if (accounts.length > 1) {
    warn(
      'multiple-accounts',
      `${accounts.length} Apple Accounts are signed in. xcodebuild cannot be told which to use, so it may try all of them.`,
    );
  }
  if (identifiers.length < accounts.length) {
    const missing = accounts.length - identifiers.length;
    warn(
      'unpaired-account',
      `${missing} of ${accounts.length} signed-in accounts has no stored identifier. That is the state behind "missing Xcode-Token".`,
    );
  }
  if (projectTeamId && !projectTeam) {
    warn('project-team-unknown', `This project asks for team ${projectTeamId}, which is not among the teams above.`);
  }
  // Xcode keeps a second, older copy of the team list keyed by account
  // identifier. When the two disagree, one of them is stale.
  for (const team of teams) {
    const cached = cachedTeams.find((entry) => entry.teamId === team.teamId && entry.teamName);
    if (cached && (cached.teamType !== team.teamType || cached.isFree !== team.isFree)) {
      warn(
        'stale-team-cache',
        `Team ${team.teamId} reads as "${team.teamType}" on ${team.appleId} but as "${cached.teamType}" in Xcode's cached list. One of the two is out of date.`,
      );
    }
  }
  if (lastSelectedTeamId && projectTeamId && lastSelectedTeamId !== projectTeamId) {
    warn(
      'last-selected-differs',
      `Xcode last had team ${lastSelectedTeamId} selected, but this project asks for ${projectTeamId}.`,
    );
  }
  if (projectTeam && classifyTeam(projectTeam).paid) {
    note(
      'project-team-paid',
      `Team ${projectTeamId} is a paid ${classifyTeam(projectTeam).kind} team, so Ad Hoc and TestFlight are available and the sideloading route is unnecessary.`,
    );
  }
  if (projectTeam && !classifyTeam(projectTeam).paid) {
    note(
      'project-team-free',
      `Team ${projectTeamId} is a Personal Team, so a build signed with it can only be handed out through a sideloading host.`,
    );
  }

  return { projectTeam, warnings, notes };
}

/** One preference key as XML, from a file when the tests supply one. */
function readPreference(key) {
  const fixture = process.env.XCODE_PREFS_XML_FILE;
  if (fixture) {
    const result = spawnSync('plutil', ['-extract', key, 'xml1', '-o', '-', fixture], { encoding: 'utf8' });
    return result.status === 0 ? result.stdout : '';
  }
  const exported = spawnSync('defaults', ['export', 'com.apple.dt.Xcode', '-'], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (exported.status !== 0) return '';
  const extracted = spawnSync('plutil', ['-extract', key, 'xml1', '-o', '-', '-'], {
    input: exported.stdout,
    encoding: 'utf8',
  });
  return extracted.status === 0 ? extracted.stdout : '';
}

function pad(value, width) {
  return String(value).padEnd(width);
}

export function parseArgs(argv) {
  const options = { json: false, help: false };
  for (const arg of argv) {
    if (arg === '--json') options.json = true;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error(`Unknown option "${arg}". Nothing was read.`);
  }
  return options;
}

function usage() {
  console.log(`Print the Apple accounts and teams Xcode knows about.

  npm run ios:accounts            Human-readable
  npm run ios:accounts -- --json  Machine-readable
  npm run ios:accounts -- --help  This text

Compares them with this project's DEVELOPMENT_TEAM, so a mismatch or a stale
sign-in is visible before a ten-minute archive fails. Read-only.`);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    usage();
    return;
  }
  const json = options.json;

  const accounts = parseAccounts(readPreference(PREFERENCE_KEYS.accounts));
  const identifiers = parseIdentifiers(readPreference(PREFERENCE_KEYS.accounts));
  const teams = parseTeams(readPreference(PREFERENCE_KEYS.teams));
  const cachedTeams = parseTeams(readPreference(PREFERENCE_KEYS.teamByIdentifier));
  const lastSelectedTeamId = parseString(readPreference(PREFERENCE_KEYS.lastSelected));
  const project = projectTeamId();

  const { projectTeam, warnings, notes } = diagnose({
    accounts,
    identifiers,
    teams,
    cachedTeams,
    projectTeamId: project,
    lastSelectedTeamId,
  });

  if (json) {
    console.log(JSON.stringify({ accounts, identifiers, teams, cachedTeams, lastSelectedTeamId, projectTeamId: project, projectTeam, warnings, notes }, null, 2));
    return;
  }

  if (accounts.length === 0 && teams.length === 0) {
    console.log('No Xcode Apple Accounts found.');
    console.log('Sign in with Xcode > Settings > Accounts, then run this again.');
    console.log('Read with: defaults export com.apple.dt.Xcode -');
    process.exit(1);
  }

  console.log('Xcode accounts and teams\n');

  console.log('Signed in to Xcode');
  accounts.forEach((account, index) => {
    console.log(`  ${pad(account, 30)} ${identifiers[index] ? `identifier ${identifiers[index]}` : 'identifier (none stored)'}`);
  });
  if (accounts.length === 0) console.log('  (none)');

  console.log('\nTeams');
  console.log(`  ${pad('TEAM ID', 12)} ${pad('TYPE', 15)} ${pad('ACCOUNT', 28)} NAME`);
  for (const team of teams) {
    console.log(`  ${pad(team.teamId, 12)} ${pad(team.teamType, 15)} ${pad(team.appleId, 28)} ${team.teamName}`);
  }
  if (teams.length === 0) console.log('  (none)');

  console.log(`\nLast team selected in Xcode:     ${lastSelectedTeamId || '(none)'}`);
  console.log(`This project's DEVELOPMENT_TEAM: ${project || '(none)'}`);

  console.log('\nDistribution each team allows');
  for (const team of teams) console.log(`  ${pad(team.teamId, 12)} ${capabilities(team)}`);

  console.log('\nFindings');
  if (warnings.length === 0) {
    console.log('  Nothing inconsistent: the accounts, the cached team list and the project agree.');
  }
  for (const warning of warnings) console.log(`  ! ${warning.message}`);
  for (const note of notes) console.log(`  · ${note.message}`);

  const actions = [];
  if (warnings.some((warning) => warning.code === 'multiple-accounts' || warning.code === 'unpaired-account')) {
    actions.push('Remove the account you do not sign with in Xcode > Settings > Accounts, or sign it in again.');
  }
  if (notes.some((note) => note.code === 'project-team-paid')) {
    actions.push(`Team ${project} is paid: prefer Ad Hoc or TestFlight over handing out a sideloaded build.`);
  }
  if (actions.length > 0) {
    console.log('\nWhat to do');
    for (const action of actions) console.log(`  - ${action}`);
  }
  console.log('\nRead with: defaults export com.apple.dt.Xcode -');
  console.log('Background: docs/engineering/ios-distribution.md');
}

// Run the CLI only when executed directly, so tests can import the parsers.
if (invokedDirectly(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
