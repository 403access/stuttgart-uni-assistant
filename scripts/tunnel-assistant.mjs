#!/usr/bin/env node
/**
 * Puts the assistant server behind a Cloudflare quick tunnel and points the app at it.
 *
 *   npm run assistant:tunnel
 *   npm run assistant:tunnel -- --port 9000
 *
 * The Expo dev server has its own tunnel (`npm run tunnel`). A phone on that
 * tunnel is off the local network, so it cannot reach `127.0.0.1:8787` on this
 * machine — the assistant needs a public URL of its own. This script starts
 * `cloudflared tunnel --url <local assistant>`, waits for the hostname, writes
 * it to `EXPO_PUBLIC_ASSISTANT_URL` in the git-ignored `.env`, and then checks
 * `GET /health` through the tunnel.
 *
 * A quick tunnel is ephemeral: the hostname changes on every run. Run this
 * before `npm run tunnel`, and restart Expo whenever the hostname changes,
 * because `EXPO_PUBLIC_*` is read at bundle time.
 */

import { spawn } from 'node:child_process';
import { chmodSync, existsSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { readValue, writeKey } from './set-campus-secret.mjs';

const envPath = new URL('../.env', import.meta.url);
const examplePath = new URL('../.env.example', import.meta.url);
const key = 'EXPO_PUBLIC_ASSISTANT_URL';
const urlPattern = /https:\/\/[a-z0-9][a-z0-9-]*\.trycloudflare\.com/i;

/** The quick-tunnel hostname in a chunk of cloudflared output, or ''. */
export function extractHostname(text) {
  const match = String(text).match(urlPattern);
  return match ? match[0] : '';
}

function usage() {
  console.log(`Tunnel the assistant server through Cloudflare.

  npm run assistant:tunnel             Tunnel http://127.0.0.1:8787
  npm run assistant:tunnel -- --port 9000
  npm run assistant:tunnel -- --help   This text

Writes the public hostname to ${key} in .env. The hostname
changes on every run, so start the Expo tunnel afterwards:

  npm run assistant        # terminal 1
  npm run assistant:tunnel # terminal 2, this script
  npm run tunnel           # terminal 3, Expo with --tunnel`);
}

export function parseArgs(argv) {
  const options = { port: Number(process.env.PORT || 8787) };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--port' || arg === '-p') {
      options.port = Number(argv[index + 1]);
      index += 1;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else {
      throw new Error(`Unknown option "${arg}". Nothing changed.`);
    }
  }
  if (!Number.isInteger(options.port) || options.port < 1 || options.port > 65535) {
    throw new Error('--port needs a number between 1 and 65535.');
  }
  return options;
}

async function health(base) {
  try {
    const response = await fetch(`${base}/health`, { signal: AbortSignal.timeout(8000) });
    return { ok: response.ok, status: response.status };
  } catch (error) {
    return { ok: false, status: 0, detail: error instanceof Error ? error.message : String(error) };
  }
}

async function waitForHealth(base) {
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    const result = await health(base);
    if (result.ok) return result;
    if (attempt < 8) await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  return { ok: false, status: 0 };
}

function readEnvText() {
  if (existsSync(envPath)) return readFileSync(envPath, 'utf8');
  if (existsSync(examplePath)) return readFileSync(examplePath, 'utf8');
  return '';
}

async function adopt(hostname) {
  const text = readEnvText();
  const previous = readValue(text, key);
  writeFileSync(envPath, writeKey(text, key, hostname));
  chmodSync(envPath, 0o600);
  console.log('');
  console.log(`Public URL: ${hostname}`);
  console.log(`${key}: ${previous || '(unset)'} -> ${hostname}`);
  const result = await waitForHealth(hostname);
  if (result.ok) {
    console.log(`GET /health through the tunnel: ${result.status} ok`);
  } else {
    console.log('GET /health through the tunnel gave no answer yet. A fresh quick tunnel can need a moment,');
    console.log(`and the check also fails while "npm run assistant" is down. Verify with: curl ${hostname}/health`);
  }
  console.log('');
  console.log('Next: npm run tunnel   (Expo reads .env at bundle time, so start it after this)');
  console.log('Keep this process running while the phone is connected. Ctrl-C stops the tunnel.');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    usage();
    return;
  }

  const target = `http://127.0.0.1:${options.port}`;
  const local = await health(target);
  if (!local.ok) {
    console.warn(`No answer from ${target}/health. Start the assistant server first: npm run assistant`);
  }

  console.log(`Quick tunnel for ${target} (cloudflared). Waiting for the hostname…`);
  const child = spawn('cloudflared', ['tunnel', '--url', target], { stdio: ['ignore', 'pipe', 'pipe'] });

  let hostname = '';
  let buffer = '';
  const scan = (chunk) => {
    process.stderr.write(chunk);
    if (hostname) return;
    buffer = (buffer + chunk.toString()).slice(-2000);
    const found = extractHostname(buffer);
    if (found) {
      hostname = found;
      adopt(hostname).catch((error) => console.error(error instanceof Error ? error.message : String(error)));
    }
  };
  child.stdout.on('data', scan);
  child.stderr.on('data', scan);

  const guard = setTimeout(() => {
    if (!hostname) {
      console.error('No quick-tunnel hostname after 45s. Check the cloudflared output above (network or proxy).');
      child.kill('SIGTERM');
      process.exitCode = 1;
    }
  }, 45_000);
  guard.unref();

  const stop = () => child.kill('SIGINT');
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);

  child.on('error', (error) => {
    if (error.code === 'ENOENT') {
      console.error('cloudflared was not found on PATH. Install it, then run this again:\n  brew install cloudflared');
    } else {
      console.error(error.message);
    }
    process.exit(1);
  });
  child.on('exit', (code) => process.exit(code ?? 0));
}

// Run the CLI only when executed directly. Tests import the helpers above.
// argv[1] is compared through realpath because /tmp is a symlink on macOS.
if (realpathSync(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
