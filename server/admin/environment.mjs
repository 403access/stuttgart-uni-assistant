/**
 * Environment variables, the `.env` file, and host details for the System page.
 *
 * Secrets are masked unless `reveal` is explicitly requested. The dashboard
 * only asks for plaintext after the operator confirms, and the route records
 * that read in the audit log.
 */

import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  arch,
  cpus,
  freemem,
  hostname,
  loadavg,
  platform,
  release,
  totalmem,
  type,
} from 'node:os';

const ENV_FILE = fileURLToPath(new URL('../../.env', import.meta.url));
const ENV_EXAMPLE_FILE = fileURLToPath(new URL('../../.env.example', import.meta.url));

/** A key is secret when it carries a credential, not when it merely mentions one. */
const SECRET_KEY = /(TOKEN|SECRET|PASSWORD|PASSWD|COOKIE|API_KEY|PRIVATE_KEY|CREDENTIAL)/i;
/** Public Expo variables are compiled into the app and are never secrets. */
const PUBLIC_KEY = /^EXPO_PUBLIC_/i;
/** Process-only variables that belong to this project even when `.env` lacks them. */
const APP_ENV_PREFIX = /^(CAMPUS_|ILIAS_|OIDC_|DIST_|XAI_|QUIZ_|AUTH_|DASHBOARD_|ASSISTANT_|EXPO_PUBLIC_|SMTP_|MAIL_)/;

/** Used when `.env.example` is absent; it mirrors the documented variables. */
const FALLBACK_KEYS = [
  'XAI_API_KEY', 'QUIZ_MODEL', 'PORT', 'DASHBOARD_TOKEN',
  'EXPO_PUBLIC_ASSISTANT_URL', 'EXPO_PUBLIC_ASSISTANT_TUNNEL_URL',
  'CAMPUS_BEARER_TOKEN', 'CAMPUS_SESSION_COOKIE', 'ILIAS_SESSION_COOKIE', 'ILIAS_ACCOUNT',
  'CAMPUS_STUDY_ID', 'CAMPUS_CURRICULUM_ID', 'CAMPUS_REFRESH_MINUTES', 'CAMPUS_DB_PATH',
  'AUTH_SESSION_HOURS',
  'OIDC_ISSUER', 'OIDC_CLIENT_ID', 'OIDC_CLIENT_SECRET', 'OIDC_LOGIN_HINT', 'OIDC_SCOPES',
  'OIDC_REDIRECT_URIS', 'OIDC_ALLOW_DEV_REDIRECTS',
  'DIST_TOKEN', 'DIST_URL', 'DIST_PUBLIC_URL', 'DIST_PORT', 'DIST_HOST', 'DIST_DATA_DIR',
];

/** Runtime variables that are useful even when `.env` does not mention them. */
const EXTRA_KEYS = ['NODE_ENV', 'TZ', 'LANG', 'LC_ALL', 'CAMPUS_REFRESH_MINUTES', 'CAMPUS_DB_PATH'];

function isSecretKey(key) {
  return !PUBLIC_KEY.test(key) && SECRET_KEY.test(key);
}

/** Read only the variable names of a dotenv-shaped file. Values never leave this function. */
function readEnvKeys(path, { includeComments = false } = {}) {
  try {
    const text = readFileSync(path, 'utf8');
    const keys = [];
    for (const line of text.split('\n')) {
      let trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith('#')) {
        if (!includeComments) continue;
        trimmed = trimmed.replace(/^#\s*/, '');
      }
      const splitAt = trimmed.indexOf('=');
      if (splitAt < 1) continue;
      const key = trimmed.slice(0, splitAt).trim();
      if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) keys.push(key);
    }
    return keys;
  } catch {
    return [];
  }
}

function fileInfo(path) {
  try {
    const stat = statSync(path);
    return {
      path,
      exists: true,
      modifiedAt: stat.mtime.toISOString(),
      sizeBytes: stat.size,
    };
  } catch {
    return { path, exists: false, modifiedAt: null, sizeBytes: 0 };
  }
}

function knownKeys(envKeys) {
  const example = readEnvKeys(ENV_EXAMPLE_FILE, { includeComments: true });
  const keys = [...(example.length ? example : FALLBACK_KEYS), ...envKeys, ...EXTRA_KEYS];
  for (const key of Object.keys(process.env)) {
    if (APP_ENV_PREFIX.test(key)) keys.push(key);
  }
  return [...new Set(keys)];
}

function variable(key, envKeys, reveal) {
  // The Expo rule targets bundler-time lookups in app code; this is a server-side
  // runtime inventory, so the key is intentionally dynamic.
  // eslint-disable-next-line expo/no-dynamic-env-var
  const raw = process.env[key];
  const set = raw !== undefined && raw !== '';
  const secret = isSecretKey(key);
  return {
    key,
    set,
    secret,
    length: set ? raw.length : 0,
    source: envKeys.has(key) ? 'env' : set ? 'process' : 'unset',
    value: secret && !reveal ? null : (raw ?? ''),
  };
}

/** Host and process details that do not fit the runtime block. */
export function hostInfo() {
  return {
    hostname: hostname(),
    platform: platform(),
    type: type(),
    arch: arch(),
    release: release(),
    cwd: process.cwd(),
    execPath: process.execPath,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    locale: Intl.DateTimeFormat().resolvedOptions().locale,
    cpus: cpus().length,
    totalMemory: totalmem(),
    freeMemory: freemem(),
    loadAverage: loadavg().map((value) => Number(value.toFixed(2))),
    versions: {
      node: process.version,
      v8: process.versions.v8,
      openssl: process.versions.openssl,
      sqlite: process.versions.sqlite ?? null,
    },
  };
}

/**
 * Variables known to this project, in `.env.example` order. Secrets have
 * `value: null` unless `reveal` is true; their length and presence stay visible.
 */
export function adminEnvironment({ reveal = false } = {}) {
  const envFile = fileInfo(ENV_FILE);
  const envKeys = new Set(readEnvKeys(ENV_FILE));
  const variables = knownKeys([...envKeys]).map((key) => variable(key, envKeys, reveal));
  return {
    envFile,
    variables,
    totals: {
      total: variables.length,
      set: variables.filter((item) => item.set).length,
      secrets: variables.filter((item) => item.secret).length,
      revealed: Boolean(reveal),
    },
  };
}
