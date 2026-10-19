#!/usr/bin/env node
/**
 * Publishes an exported `.ipa` to the distribution service.
 *
 *   npm run dist:publish                      Newest .ipa in dist/ios
 *   npm run dist:publish -- path/to/app.ipa
 *   npm run dist:publish -- --notes "first test build"
 *   npm run dist:publish -- --url https://builds.example.org
 *
 * Reads what it can out of the file itself — version, build number, bundle id and
 * the embedded provisioning profile — so the record matches what was signed
 * rather than what a caller claims. Talks to the service with a plain POST and
 * the raw bytes; there is no upload token or two-step dance.
 *
 * Configuration: DIST_URL (default http://127.0.0.1:8788) and DIST_TOKEN, or
 * --url / --token. The token is required; the service refuses writes without it.
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { invokedDirectly } from './ios/cli.mjs';
import { nativeVersion } from './ios/project.mjs';
import { readIpaProfile } from './ios/provisioning.mjs';
import { loadEnv } from '../dist-service/env.mjs';

// The service and this client read the same repository `.env`, so the token does
// not have to be exported twice. `DIST_URL` is read below, so this runs first.
loadEnv(new URL('../.env', import.meta.url));

const DEFAULT_URL = process.env.DIST_URL || 'http://127.0.0.1:8788';

export function parseArgs(argv) {
  const options = {
    ipa: '',
    url: DEFAULT_URL,
    token: process.env.DIST_TOKEN || '',
    notes: '',
    help: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--url') {
      options.url = argv[index + 1] ?? '';
      index += 1;
      if (!options.url) throw new Error('--url needs an origin, for example https://builds.example.org');
    } else if (arg === '--token') {
      options.token = argv[index + 1] ?? '';
      index += 1;
      if (!options.token) throw new Error('--token needs the service token.');
    } else if (arg === '--notes') {
      options.notes = argv[index + 1] ?? '';
      index += 1;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg.startsWith('-')) {
      throw new Error(`Unknown option "${arg}". Nothing was uploaded.`);
    } else if (!options.ipa) {
      options.ipa = arg;
    } else {
      throw new Error(`Unexpected argument "${arg}". Nothing was uploaded.`);
    }
  }
  return options;
}

function usage() {
  console.log(`Publish an .ipa to the distribution service.

  npm run dist:publish                         Newest .ipa in dist/ios
  npm run dist:publish -- path/to/app.ipa
  npm run dist:publish -- --notes "text"
  npm run dist:publish -- --url https://builds.example.org
  npm run dist:publish -- --token <token>
  npm run dist:publish -- --help

DIST_URL and DIST_TOKEN are read from the environment. The token is required.

The version, build number, bundle id, team and profile expiry are read out of
the .ipa, so the record matches what was signed. See dist-service/README.md.`);
}

/** One `<key>` value out of an XML plist. */
export function plistValue(xml, key) {
  const match = String(xml).match(
    new RegExp(`<key>${key}</key>\\s*<(?:string|date)>([^<]*)</(?:string|date)>`),
  );
  return match ? match[1].trim() : '';
}

/**
 * The `.ipa`'s own Info.plist, converted from whatever binary form Xcode wrote.
 * `plutil` reads stdin, so the plist never lands on disk.
 */
export function readIpaInfo(ipaPath) {
  const unzipped = spawnSync('unzip', ['-p', ipaPath, 'Payload/*.app/Info.plist'], {
    maxBuffer: 16 * 1024 * 1024,
  });
  if (unzipped.status !== 0 || !unzipped.stdout?.length) {
    throw new Error(`Could not read Payload/*.app/Info.plist out of ${ipaPath}.`);
  }
  const converted = spawnSync('plutil', ['-convert', 'xml1', '-o', '-', '-'], {
    input: unzipped.stdout,
    encoding: 'utf8',
  });
  if (converted.status !== 0 || !converted.stdout) {
    throw new Error(`Could not convert the Info.plist in ${ipaPath}.`);
  }
  const xml = converted.stdout;
  const { version, build } = nativeVersion(xml);
  return {
    version,
    build,
    bundleId: plistValue(xml, 'CFBundleIdentifier'),
    title: plistValue(xml, 'CFBundleDisplayName') || plistValue(xml, 'CFBundleName'),
  };
}

/** Newest `.ipa` in `dist/ios`, so the common case needs no argument. */
export function newestIpa(dir = fileURLToPath(new URL('../dist/ios', import.meta.url))) {
  let entries;
  try {
    entries = readdirSync(dir).filter((name) => name.endsWith('.ipa'));
  } catch {
    return '';
  }
  if (entries.length === 0) return '';
  return entries
    .map((name) => join(dir, name))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0];
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    usage();
    return;
  }

  const ipaPath = options.ipa || newestIpa();
  if (!ipaPath) {
    throw new Error('No .ipa found. Build one with "npm run ios:ipa", or pass a path.');
  }
  if (!options.token) {
    throw new Error('No token. Set DIST_TOKEN, or pass --token.');
  }

  const info = readIpaInfo(ipaPath);
  const profile = readIpaProfile(ipaPath);
  // Hash exactly the bytes that are sent, so the service's integrity check
  // covers the same thing this side computed.
  const bytes = readFileSync(ipaPath);
  const digest = createHash('sha256').update(bytes).digest('hex');
  const base = options.url.replace(/\/+$/, '');

  console.log(`Publishing ${ipaPath}`);
  console.log(`  ${info.title} ${info.version} (${info.build}), ${info.bundleId}`);
  if (profile) {
    console.log(`  team ${profile.teamId}, profile expires ${profile.expiresAt}, ${profile.provisionedDevices} device(s)`);
  } else {
    console.log('  warning: could not read the embedded provisioning profile; the record will omit it.');
  }

  const response = await fetch(`${base}/api/builds`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${options.token}`,
      'content-type': 'application/octet-stream',
      'x-app-version': info.version,
      'x-build': info.build,
      'x-bundle-id': info.bundleId,
      'x-app-name': encodeURIComponent(info.title || 'University Assistant'),
      'x-sha256': digest,
      'x-team-id': profile?.teamId ?? '',
      'x-expires-at': profile?.expiresAt ?? '',
      'x-provisioned-devices': String(profile?.provisionedDevices ?? 0),
      'x-notes': encodeURIComponent(options.notes),
    },
    body: bytes,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`The service refused the upload (${response.status}): ${payload.error ?? 'unknown'}${
      payload.detail ? ` — ${payload.detail}` : ''
    }`);
  }

  console.log('');
  console.log(`Published as ${payload.id}`);
  console.log(`  ${payload.url}`);
  if (base.startsWith('https://')) {
    console.log('  Open that page in Safari on a registered device and tap Install.');
  } else {
    console.log('  This origin is not HTTPS, so over-the-air install will not work yet.');
    console.log('  Put it behind the Cloudflare tunnel (npm run dist:tunnel) or a TLS proxy first.');
  }
}

if (invokedDirectly(import.meta.url)) {
  main().catch((error) => {
    console.error(`\n${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
