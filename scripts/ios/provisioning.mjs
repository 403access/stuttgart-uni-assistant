/**
 * Reading an exported `.ipa` back, to answer the only question that matters
 * after a build: which team actually signed it, and until when.
 *
 * The embedded provisioning profile carries its own expiry, which is also the
 * one offline signal that separates a free Apple Account (7-day profiles) from
 * a paid membership (about a year).
 */

import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

/**
 * A free Apple Account's profiles last 7 days; a paid membership's last about a
 * year. Anything at or below this is the free-account lifetime.
 */
export const PERSONAL_TEAM_MAX_DAYS = 8;

/** The fields of an embedded provisioning profile that decide what was signed. */
export function parseProvisioningProfile(xml) {
  const text = String(xml);
  const read = (key) => {
    // ExpirationDate and CreationDate are `<date>`, the rest are `<string>`.
    const match = text.match(
      new RegExp(`<key>${key}</key>\\s*<(?:string|date)>([^<]*)</(?:string|date)>`),
    );
    return match ? match[1] : '';
  };
  const team = text.match(/<key>TeamIdentifier<\/key>\s*<array>\s*<string>([^<]*)<\/string>/);
  const devices = text.match(/<key>ProvisionedDevices<\/key>\s*<array>([\s\S]*?)<\/array>/);
  return {
    name: read('Name'),
    teamName: read('TeamName'),
    teamId: team ? team[1] : '',
    expiresAt: read('ExpirationDate'),
    applicationIdentifier: read('application-identifier'),
    getTaskAllow: /<key>get-task-allow<\/key>\s*<true\/>/.test(text),
    provisionedDevices: devices ? (devices[1].match(/<string>/g) ?? []).length : 0,
  };
}

/**
 * What an exported `.ipa` carries. This is the only place that can answer
 * "which team signed it" with certainty: the account `xcodebuild` *tried* is a
 * different question, and a mismatched team can still produce a file.
 */
export function assessSignature(profile, expectedTeamId, now = new Date()) {
  const problems = [];
  const notes = [];

  if (!profile.teamId) {
    problems.push('The embedded provisioning profile names no team.');
  } else if (expectedTeamId && profile.teamId !== expectedTeamId) {
    problems.push(`Signed by team ${profile.teamId}, but ${expectedTeamId} was requested.`);
  }

  const expires = Date.parse(profile.expiresAt);
  const days = Number.isFinite(expires) ? Math.floor((expires - now.getTime()) / 86_400_000) : null;
  if (days === null) {
    notes.push('The profile carries no readable expiry date.');
  } else if (days < 0) {
    problems.push(`The provisioning profile expired ${-days} day(s) ago.`);
  } else if (days <= PERSONAL_TEAM_MAX_DAYS) {
    notes.push(
      `The profile expires in ${days} day(s) — the 7-day lifetime a free Apple Account issues.`,
    );
  } else {
    notes.push(
      `The profile is valid for ${days} more day(s), which a free Apple Account cannot issue: this is a paid membership.`,
    );
  }

  if (!profile.getTaskAllow) {
    problems.push('get-task-allow is absent, so this is not a development build.');
  }

  return { problems, notes, days };
}

/** Read the embedded profile out of an exported `.ipa`. `null` when it cannot. */
export function readIpaProfile(ipaPath) {
  const scratch = mkdtempSync(join(tmpdir(), 'ios-ipa-inspect-'));
  try {
    const unzipped = spawnSync('unzip', ['-q', '-o', ipaPath, '-d', scratch], { encoding: 'utf8' });
    if (unzipped.status !== 0) return null;
    const payload = join(scratch, 'Payload');
    const app = existsSync(payload)
      ? readdirSync(payload).find((entry) => entry.endsWith('.app'))
      : undefined;
    if (!app) return null;
    const profilePath = join(payload, app, 'embedded.mobileprovision');
    if (!existsSync(profilePath)) return null;
    const decoded = spawnSync('security', ['cms', '-D', '-i', profilePath], { encoding: 'utf8' });
    if (decoded.status !== 0 || !decoded.stdout) return null;
    return parseProvisioningProfile(decoded.stdout);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}
