#!/usr/bin/env node
/**
 * Writes one C@MPUS secret into the git-ignored `.env`.
 *
 *   npm run campus:token -- <access token>
 *   npm run campus:session -- <PSESSIONID value>
 *
 * The value may be omitted. It is then read from stdin, or asked for on a
 * terminal without echoing. A pasted `Bearer <token>` header or a full
 * `PSESSIONID=...; ...` cookie string is reduced to the bare value. The value
 * is never printed back; only a masked confirmation is shown.
 */

import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs';

const envPath = new URL('../.env', import.meta.url);
const examplePath = new URL('../.env.example', import.meta.url);

const aliases = {
  token: { key: 'CAMPUS_BEARER_TOKEN', label: 'C@MPUS bearer token', kind: 'token' },
  bearer: { key: 'CAMPUS_BEARER_TOKEN', label: 'C@MPUS bearer token', kind: 'token' },
  session: { key: 'CAMPUS_SESSION_COOKIE', label: 'PSESSIONID cookie value', kind: 'cookie' },
  cookie: { key: 'CAMPUS_SESSION_COOKIE', label: 'PSESSIONID cookie value', kind: 'cookie' },
  psessionid: { key: 'CAMPUS_SESSION_COOKIE', label: 'PSESSIONID cookie value', kind: 'cookie' },
};

function usage() {
  console.log(`Set a C@MPUS value in .env.

  npm run campus:token -- <token>     CAMPUS_BEARER_TOKEN
  npm run campus:session -- <value>   CAMPUS_SESSION_COOKIE

  npm run campus:secret -- list       Show which values are set, masked
  npm run campus:secret -- --help     This text

Omit the value to type it without echoing, or pipe it in:
  echo "$TOKEN" | npm run campus:token`);
}

/** Strip the shape a person copies out of the browser or DevTools. */
function normalize(kind, raw) {
  let value = raw.replace(/\r?\n/g, '').trim();
  if (kind === 'token') {
    value = value
      .replace(/^authorization:\s*/i, '')
      .replace(/^Bearer\s+/i, '')
      .trim();
  }
  if (kind === 'cookie') {
    value = value.replace(/^cookie:\s*/i, '');
    const match = value.match(/(?:^|;\s*)(?:P?SESSIONID|JSESSIONID)=([^;]+)/i);
    if (match) value = match[1].trim();
    else value = value.replace(/^(?:PSESSIONID|JSESSIONID)=/i, '').trim();
  }
  value = value.replace(/^['"]|['"]$/g, '').trim();
  return value;
}

function readHidden(prompt) {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    if (!stdin.isTTY) {
      let data = '';
      stdin.setEncoding('utf8');
      stdin.on('data', (chunk) => {
        data += chunk;
      });
      stdin.on('end', () => resolve(data));
      stdin.on('error', reject);
      return;
    }
    process.stdout.write(prompt);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    let value = '';
    const finish = () => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener('data', onData);
      process.stdout.write('\n');
    };
    const onData = (chunk) => {
      for (const char of chunk) {
        if (char === '\r' || char === '\n' || char === '\u0004') {
          finish();
          resolve(value);
          return;
        }
        if (char === '\u0003') {
          finish();
          process.exit(130);
        }
        if (char === '\u007f' || char === '\b') value = value.slice(0, -1);
        else value += char;
      }
    };
    stdin.on('data', onData);
  });
}

function mask(value) {
  if (!value) return '(empty)';
  if (value.length <= 8) return `…(${value.length} chars)`;
  return `${value.slice(0, 4)}…${value.slice(-2)} (${value.length} chars)`;
}

function readEnvLines() {
  if (existsSync(envPath)) {
    const text = readFileSync(envPath, 'utf8');
    return { text, created: false };
  }
  if (existsSync(examplePath)) return { text: readFileSync(examplePath, 'utf8'), created: true };
  return { text: '', created: true };
}

function writeKey(text, key, value) {
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.length ? text.split(/\r?\n/) : [];
  const pattern = new RegExp(`^\\s*${key}\\s*=`);
  const at = lines.findIndex((line) => pattern.test(line));
  const next = `${key}=${value}`;
  if (at >= 0) lines[at] = next;
  else {
    if (lines.length && lines[lines.length - 1] !== '') lines.push('');
    lines.push(next);
  }
  const joined = lines.join(eol);
  return joined.endsWith(eol) ? joined : `${joined}${eol}`;
}

function readValue(text, key) {
  const line = text.split(/\r?\n/).find((item) => new RegExp(`^\\s*${key}\\s*=`).test(item));
  return line ? line.slice(line.indexOf('=') + 1).replace(/^['"]|['"]$/g, '').trim() : '';
}

function list() {
  const { text } = readEnvLines();
  const keys = ['CAMPUS_BEARER_TOKEN', 'CAMPUS_SESSION_COOKIE', 'XAI_API_KEY'];
  for (const key of keys) {
    const value = readValue(text, key);
    console.log(`${key.padEnd(24)} ${value ? mask(value) : '(unset)'}`);
  }
}

async function main() {
  const [, , command, ...rest] = process.argv;
  if (!command || command === '--help' || command === '-h' || command === 'help') {
    usage();
    return;
  }
  if (command === 'list' || command === 'status') {
    list();
    return;
  }

  const target = aliases[command];
  if (!target) {
    console.error(`Unknown command "${command}".`);
    usage();
    process.exit(1);
  }

  const flags = rest.filter((item) => item.startsWith('-'));
  if (flags.length) {
    if (flags.includes('--help') || flags.includes('-h')) {
      usage();
      return;
    }
    console.error(`Unknown option "${flags[0]}". Nothing changed.`);
    process.exit(1);
  }

  let value = normalize(target.kind, rest.join(' '));
  if (!value) value = normalize(target.kind, await readHidden(`Paste ${target.label} (hidden): `));
  if (!value) {
    console.error('No value given. Nothing changed.');
    process.exit(1);
  }
  if (/\s/.test(value)) {
    console.error('The value still contains whitespace. Quote it, or paste just the token or cookie value.');
    process.exit(1);
  }

  const { text, created } = readEnvLines();
  const previous = readValue(text, target.key);
  writeFileSync(envPath, writeKey(text, target.key, value));
  chmodSync(envPath, 0o600);

  console.log(`${created ? 'Created .env from .env.example. ' : ''}${target.key}: ${previous ? mask(previous) : '(unset)'} -> ${mask(value)}`);
  console.log('Restart the server for the change to take effect: npm run assistant');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
