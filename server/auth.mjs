/**
 * Server-side users, sessions, and per-user platform links.
 *
 * The university identity (C@MPUS or SIAM) is the primary key of a user record;
 * the other platforms are links on that record. Sessions are opaque bearer
 * tokens. Only the SHA-256 hash of a token is written to SQLite, so a copy of
 * the database cannot be replayed as a login.
 *
 * This module has no HTTP dependency: `server/index.mjs` does the routing and
 * `server/auth.test.mjs` exercises the store directly.
 */

import { createHash, randomBytes } from 'node:crypto';

import { getDb } from './db.mjs';

export const PLATFORMS = ['campus', 'ilias', 'sdg', 'siam', 'mail'];
export const PLATFORM_STATUS = ['connected', 'linked'];
export const SIGN_IN_MODES = ['campus', 'oidc', 'demo', 'local'];

export function authError(status, code, detail) {
  const error = new Error(code);
  error.status = status;
  if (detail) error.detail = String(detail).slice(0, 300);
  return error;
}

export function normalizeAccount(account) {
  return String(account ?? '').trim().toLowerCase();
}

export function hashToken(token) {
  return createHash('sha256').update(String(token)).digest('hex');
}

function sessionTtlHours() {
  const value = Number(process.env.AUTH_SESSION_HOURS || 24 * 30);
  return Number.isFinite(value) && value > 0 ? Math.min(value, 24 * 365) : 24 * 30;
}

export function sessionTtlMs() {
  return Math.round(sessionTtlHours() * 60 * 60 * 1000);
}

function nowIso() {
  return new Date().toISOString();
}

function platformRow(row) {
  return {
    id: row.platform,
    account: row.account ?? null,
    status: row.status === 'connected' ? 'connected' : 'linked',
    source: row.source ?? 'sso',
    linkedAt: row.linked_at,
    lastSyncAt: row.last_sync_at ?? null,
  };
}

function userRow(row, platforms) {
  return {
    id: row.id,
    account: row.account,
    name: row.name ?? null,
    email: row.email ?? null,
    matriculation: row.matriculation ?? null,
    subject: row.subject ?? null,
    mode: SIGN_IN_MODES.includes(row.primary_mode) ? row.primary_mode : 'local',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastLoginAt: row.last_login_at ?? null,
    platforms,
  };
}

/** Create or refresh a user. The account id is the stable identity across platforms. */
export function upsertUser(input = {}) {
  const account = String(input.account ?? '').trim();
  const key = normalizeAccount(account);
  if (!key) throw authError(400, 'account_missing');
  if (key.length > 200) throw authError(400, 'account_invalid');
  const mode = SIGN_IN_MODES.includes(input.mode) ? input.mode : 'local';
  const db = getDb();
  const now = nowIso();
  const existing = db.prepare('SELECT * FROM users WHERE account_key = ?').get(key);
  if (existing) {
    db.prepare(
      'UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email), matriculation = COALESCE(?, matriculation), subject = COALESCE(?, subject), primary_mode = ?, updated_at = ?, last_login_at = ? WHERE id = ?',
    ).run(input.name ?? null, input.email ?? null, input.matriculation ?? null, input.subject ?? null, mode, now, now, existing.id);
    return getUser(existing.id);
  }
  const id = `usr_${randomBytes(12).toString('base64url')}`;
  db.prepare(
    'INSERT INTO users (id, account, account_key, name, email, matriculation, subject, primary_mode, created_at, updated_at, last_login_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  ).run(id, account, key, input.name ?? null, input.email ?? null, input.matriculation ?? null, input.subject ?? null, mode, now, now, now);
  return getUser(id);
}

export function getUser(id) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!row) return null;
  const platforms = db
    .prepare(
      "SELECT platform, account, status, source, linked_at, last_sync_at FROM user_platforms WHERE user_id = ? ORDER BY CASE platform WHEN 'campus' THEN 0 WHEN 'ilias' THEN 1 WHEN 'sdg' THEN 2 WHEN 'siam' THEN 3 WHEN 'mail' THEN 4 ELSE 5 END",
    )
    .all(id)
    .map(platformRow);
  return userRow(row, platforms);
}

/** One link per platform. A refresh keeps the original `linkedAt` but may promote `linked` to `connected`. */
export function linkPlatform(userId, input = {}) {
  const platform = String(input.platform ?? '');
  if (!PLATFORMS.includes(platform)) throw authError(400, 'bad_platform');
  const status = PLATFORM_STATUS.includes(input.status) ? input.status : 'linked';
  const source = typeof input.source === 'string' && input.source ? input.source.slice(0, 40) : 'sso';
  const account = typeof input.account === 'string' && input.account.trim() ? input.account.trim().slice(0, 200) : null;
  const db = getDb();
  const now = nowIso();
  db.prepare(
    `INSERT INTO user_platforms (user_id, platform, account, status, source, linked_at, last_sync_at)
     VALUES (?, ?, ?, ?, ?, ?, NULL)
     ON CONFLICT(user_id, platform) DO UPDATE SET
       account = COALESCE(excluded.account, user_platforms.account),
       status = CASE WHEN excluded.status = 'connected' THEN 'connected' ELSE user_platforms.status END,
       source = excluded.source,
       last_sync_at = COALESCE(excluded.last_sync_at, user_platforms.last_sync_at)`,
  ).run(userId, platform, account, status, source, now);
  return getUser(userId);
}

export function unlinkPlatform(userId, platform) {
  if (!PLATFORMS.includes(platform)) throw authError(400, 'bad_platform');
  getDb().prepare('DELETE FROM user_platforms WHERE user_id = ? AND platform = ?').run(userId, platform);
  return getUser(userId);
}

/** Explicit user action: mark the connector as consulted just now. */
export function touchPlatform(userId, platform, syncedAt = nowIso()) {
  if (!PLATFORMS.includes(platform)) throw authError(400, 'bad_platform');
  getDb()
    .prepare("UPDATE user_platforms SET last_sync_at = ?, status = 'connected' WHERE user_id = ? AND platform = ?")
    .run(syncedAt, userId, platform);
  return getUser(userId);
}

function pruneSessions() {
  // Expired rows are useless. Revoked rows are kept for a day so a stale client
  // gets an honest 401 instead of a silent new session.
  const db = getDb();
  const now = nowIso();
  const revokedCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  db.prepare('DELETE FROM user_sessions WHERE expires_at <= ? OR (revoked_at IS NOT NULL AND revoked_at <= ?)').run(now, revokedCutoff);
}

export function issueSession(userId) {
  const db = getDb();
  const token = randomBytes(32).toString('base64url');
  const now = nowIso();
  const expiresAt = new Date(Date.now() + sessionTtlMs()).toISOString();
  db.prepare(
    'INSERT INTO user_sessions (id, user_id, token_hash, created_at, expires_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(`ses_${randomBytes(12).toString('base64url')}`, userId, hashToken(token), now, expiresAt, now);
  pruneSessions();
  return { token, expiresAt };
}

export function readBearer(request) {
  const header = request?.headers?.authorization;
  if (typeof header !== 'string') return null;
  const match = /^Bearer\s+([A-Za-z0-9_-]{20,200})$/i.exec(header.trim());
  return match ? match[1] : null;
}

/** Resolve a bearer token to its user. Expired and revoked sessions are rejected. */
export function authenticateToken(token) {
  if (typeof token !== 'string' || token.length < 20) return null;
  const db = getDb();
  const row = db.prepare('SELECT * FROM user_sessions WHERE token_hash = ?').get(hashToken(token));
  if (!row || row.revoked_at || row.expires_at <= nowIso()) return null;
  const user = getUser(row.user_id);
  if (!user) return null;
  db.prepare('UPDATE user_sessions SET last_seen_at = ? WHERE id = ?').run(nowIso(), row.id);
  return { sessionId: row.id, expiresAt: row.expires_at, user };
}

export function authenticateRequest(request) {
  const token = readBearer(request);
  if (!token) return null;
  return authenticateToken(token);
}

export function requireAuth(request) {
  const auth = authenticateRequest(request);
  if (!auth) throw authError(401, 'unauthorized');
  return auth;
}

export function revokeSession(token) {
  if (typeof token !== 'string' || !token) return false;
  const db = getDb();
  const row = db.prepare('SELECT id FROM user_sessions WHERE token_hash = ?').get(hashToken(token));
  if (!row) return false;
  db.prepare('UPDATE user_sessions SET revoked_at = ? WHERE id = ?').run(nowIso(), row.id);
  return true;
}

/** Used by sign-out and by tests; a user change should not leave old tokens alive. */
export function revokeAllSessions(userId) {
  getDb().prepare('UPDATE user_sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL').run(nowIso(), userId);
}

/**
 * One call for every sign-in path: upsert the identity, link the platforms the
 * path proves, mint a session, and return the public shape.
 */
export function createUserSession(input = {}) {
  const user = upsertUser(input);
  for (const link of Array.isArray(input.platforms) ? input.platforms : []) {
    linkPlatform(user.id, link);
  }
  const session = issueSession(user.id);
  return { user: getUser(user.id), token: session.token, expiresAt: session.expiresAt };
}

/** Platform links that a C@MPUS sign-in proves about the same st-account. */
export function campusPlatformLinks({ account, mailAccount, source = 'campus' }) {
  const links = [
    { platform: 'campus', account, status: 'connected', source },
    { platform: 'ilias', account, status: 'linked', source: `${source}-sso` },
    { platform: 'sdg', account, status: 'linked', source: `${source}-sso` },
    { platform: 'siam', account, status: 'linked', source: `${source}-sso` },
  ];
  if (mailAccount) links.push({ platform: 'mail', account: mailAccount, status: 'connected', source: 'mail' });
  return links;
}

/** Platform links that an OIDC sign-in proves about the same identity. */
export function oidcPlatformLinks({ account, mailAccount }) {
  const links = [
    { platform: 'siam', account, status: 'connected', source: 'oidc' },
    { platform: 'campus', account, status: 'linked', source: 'oidc-sso' },
    { platform: 'ilias', account, status: 'linked', source: 'oidc-sso' },
    { platform: 'sdg', account, status: 'linked', source: 'oidc-sso' },
  ];
  if (mailAccount) links.push({ platform: 'mail', account: mailAccount, status: 'connected', source: 'mail' });
  return links;
}
