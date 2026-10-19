/**
 * Admin data layer for the server-hosted dashboard. This is deliberately
 * separate from the app's user-facing routes: every function here reads across
 * accounts, so `server/index.mjs` gates the whole group behind DASHBOARD_TOKEN.
 */

import { createHash, timingSafeEqual } from 'node:crypto';

import { getUser, linkPlatform, revokeAllSessions, unlinkPlatform } from './auth.mjs';
import { clearUserCampusCredential, getUserCampusCredential, listUserCampusCredentials } from './campus.mjs';
import { clearCampusSource, getDb, LEGACY_USER, loadCampusSource, saveCampusSource } from './db.mjs';

export const ADMIN_COOKIE = 'ua_admin';
const ADMIN_COOKIE_MAX_AGE = 12 * 60 * 60;

export function adminToken() {
  return (process.env.DASHBOARD_TOKEN || '').trim();
}

export function adminConfigured() {
  return Boolean(adminToken());
}

function digest(value) {
  return createHash('sha256').update(String(value)).digest();
}

export function adminTokenMatches(value) {
  const expected = adminToken();
  if (!expected || typeof value !== 'string' || !value.trim()) return false;
  return timingSafeEqual(digest(value.trim()), digest(expected));
}

export function parseCookies(header) {
  if (typeof header !== 'string' || !header) return {};
  const out = {};
  for (const part of header.split(';')) {
    const splitAt = part.indexOf('=');
    if (splitAt < 1) continue;
    const name = part.slice(0, splitAt).trim();
    const value = part.slice(splitAt + 1).trim();
    if (!name) continue;
    try {
      out[name] = decodeURIComponent(value);
    } catch {
      out[name] = value;
    }
  }
  return out;
}

export function adminAuthorized(request) {
  const cookies = parseCookies(request?.headers?.cookie);
  return adminTokenMatches(cookies[ADMIN_COOKIE]);
}

export function adminCookie(token, secure = false) {
  const parts = [
    `${ADMIN_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${ADMIN_COOKIE_MAX_AGE}`,
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export function clearAdminCookie() {
  return `${ADMIN_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;
}

function userCounts(userId) {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT
        (SELECT COUNT(*) FROM user_curriculum_nodes WHERE user_id = ?) AS nodes,
        (SELECT COUNT(DISTINCT study_id) FROM user_curriculum_nodes WHERE user_id = ?) AS studies,
        (SELECT COUNT(*) FROM user_courses WHERE user_id = ?) AS courses,
        (SELECT COUNT(*) FROM user_exported_events WHERE user_id = ?) AS events,
        (SELECT COUNT(*) FROM user_portal_calls WHERE user_id = ?) AS calls`,
    )
    .get(userId, userId, userId, userId, userId);
  return {
    nodes: row?.nodes ?? 0,
    studies: row?.studies ?? 0,
    courses: row?.courses ?? 0,
    events: row?.events ?? 0,
    calls: row?.calls ?? 0,
  };
}

function sessionRow(row) {
  const revoked = Boolean(row.revoked_at);
  const expired = row.expires_at <= new Date().toISOString();
  return {
    id: row.id,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    lastSeenAt: row.last_seen_at ?? null,
    revokedAt: row.revoked_at ?? null,
    state: revoked ? 'revoked' : expired ? 'expired' : 'active',
  };
}

export function adminStats() {
  const db = getDb();
  const users = db.prepare('SELECT COUNT(*) AS n FROM users').get()?.n ?? 0;
  const activeSessions = db.prepare("SELECT COUNT(*) AS n FROM user_sessions WHERE revoked_at IS NULL AND expires_at > ?").get(new Date().toISOString())?.n ?? 0;
  const usersWithSessions = db.prepare("SELECT COUNT(DISTINCT user_id) AS n FROM user_sessions WHERE revoked_at IS NULL AND expires_at > ?").get(new Date().toISOString())?.n ?? 0;
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const recent = db.prepare('SELECT COUNT(*) AS n FROM users WHERE created_at >= ?').get(sevenDaysAgo)?.n ?? 0;
  const platforms = db
    .prepare('SELECT platform, status, COUNT(*) AS n FROM user_platforms GROUP BY platform, status ORDER BY platform')
    .all()
    .map((row) => ({ platform: row.platform, status: row.status, count: row.n }));
  const campus = db
    .prepare('SELECT source, COUNT(*) AS n FROM user_campus GROUP BY source')
    .all()
    .map((row) => ({ source: row.source, count: row.n }));
  const credentialsActive = listUserCampusCredentials().length;
  const portalRows = db.prepare('SELECT COUNT(*) AS n FROM user_curriculum_nodes').get()?.n ?? 0;
  return {
    users,
    activeSessions,
    usersWithSessions,
    recentUsers: recent,
    credentialsActive,
    portalNodes: portalRows,
    platforms,
    campus,
  };
}

/**
 * One page of users. Filters are whitelisted; the search text is bound, never
 * concatenated. `credential` is `env`, `browser`, or `active`.
 */
export function listUsers({ query = '', mode = '', platform = '', credential = '', limit = 50, offset = 0 } = {}) {
  const db = getDb();
  const capped = Math.max(1, Math.min(200, Number(limit) || 50));
  const skip = Math.max(0, Number(offset) || 0);
  const where = [];
  const params = [];
  const text = String(query ?? '').trim();
  if (text) {
    where.push('(account LIKE ? OR name LIKE ? OR email LIKE ?)');
    const needle = `%${text}%`;
    params.push(needle, needle, needle);
  }
  if (['campus', 'oidc', 'demo', 'local'].includes(mode)) {
    where.push('primary_mode = ?');
    params.push(mode);
  }
  if (['campus', 'ilias', 'sdg', 'siam', 'mail'].includes(platform)) {
    where.push('EXISTS (SELECT 1 FROM user_platforms p WHERE p.user_id = users.id AND p.platform = ?)');
    params.push(platform);
  }
  if (credential === 'env' || credential === 'browser') {
    where.push('EXISTS (SELECT 1 FROM user_campus c WHERE c.user_id = users.id AND c.source = ?)');
    params.push(credential);
  } else if (credential === 'active') {
    const active = listUserCampusCredentials().map((item) => item.userId);
    if (!active.length) return { users: [], total: 0, limit: capped, offset: skip };
    where.push(`id IN (${active.map(() => '?').join(',')})`);
    params.push(...active);
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = db.prepare(`SELECT COUNT(*) AS n FROM users ${clause}`).get(...params)?.n ?? 0;
  const rows = db
    .prepare(
      `SELECT users.*,
        (SELECT COUNT(*) FROM user_sessions s WHERE s.user_id = users.id AND s.revoked_at IS NULL AND s.expires_at > ?) AS active_sessions,
        (SELECT source FROM user_campus c WHERE c.user_id = users.id) AS campus_source,
        (SELECT COUNT(*) FROM user_platforms p WHERE p.user_id = users.id) AS platform_count
       FROM users ${clause} ORDER BY COALESCE(last_login_at, created_at) DESC, account LIMIT ? OFFSET ?`,
    )
    .all(new Date().toISOString(), ...params, capped, skip);
  return {
    users: rows.map((row) => ({
      id: row.id,
      account: row.account,
      name: row.name ?? null,
      email: row.email ?? null,
      matriculation: row.matriculation ?? null,
      subject: row.subject ?? null,
      mode: row.primary_mode,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastLoginAt: row.last_login_at ?? null,
      activeSessions: row.active_sessions ?? 0,
      platformCount: row.platform_count ?? 0,
      campusSource: row.campus_source ?? null,
      campusActive: Boolean(getUserCampusCredential(row.id)),
    })),
    total,
    limit: capped,
    offset: skip,
  };
}

export function adminUserDetail(userId) {
  const user = getUser(userId);
  if (!user) return null;
  const db = getDb();
  const sessions = db
    .prepare('SELECT id, created_at, expires_at, last_seen_at, revoked_at FROM user_sessions WHERE user_id = ? ORDER BY created_at DESC')
    .all(userId)
    .map(sessionRow);
  const campusSource = loadCampusSource(userId);
  const credential = getUserCampusCredential(userId);
  const calls = db
    .prepare('SELECT time, op, study_id, element_id, ok, http_status, message, elapsed_ms, created_at FROM user_portal_calls WHERE user_id = ? ORDER BY id DESC LIMIT 12')
    .all(userId)
    .map((row) => ({
      time: row.time,
      op: row.op,
      studyId: row.study_id ?? null,
      elementId: row.element_id ?? null,
      ok: row.ok === 1,
      httpStatus: row.http_status ?? null,
      message: row.message ?? null,
      elapsedMs: row.elapsed_ms,
      createdAt: row.created_at,
    }));
  return {
    user,
    sessions,
    campus: {
      source: campusSource?.source ?? null,
      account: campusSource?.account ?? null,
      updatedAt: campusSource?.updatedAt ?? null,
      active: Boolean(credential),
      credentialAccount: credential?.account ?? null,
    },
    counts: userCounts(userId),
    calls,
  };
}

export function updateAdminUser(userId, input = {}) {
  const db = getDb();
  const fields = [];
  const params = [];
  for (const key of ['name', 'email', 'matriculation', 'subject']) {
    if (typeof input[key] === 'string') {
      fields.push(`${key} = ?`);
      params.push(input[key].trim().slice(0, 200) || null);
    }
  }
  if (!fields.length) return getUser(userId);
  fields.push('updated_at = ?');
  params.push(new Date().toISOString());
  params.push(userId);
  db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  return getUser(userId);
}

export function revokeAdminSession(userId, sessionId) {
  if (typeof sessionId !== 'string' || !sessionId) return false;
  const result = getDb()
    .prepare('UPDATE user_sessions SET revoked_at = ? WHERE id = ? AND user_id = ? AND revoked_at IS NULL')
    .run(new Date().toISOString(), sessionId, userId);
  return Number(result.changes ?? 0) > 0;
}

export function revokeAdminSessions(userId) {
  revokeAllSessions(userId);
  return adminUserDetail(userId);
}

export function disconnectAdminCampus(userId) {
  clearUserCampusCredential(userId);
  clearCampusSource(userId);
  getDb()
    .prepare("UPDATE user_platforms SET status = 'linked', last_sync_at = NULL WHERE user_id = ? AND platform = 'campus'")
    .run(userId);
  return adminUserDetail(userId);
}

/** Clear one study, or every portal row for the user when `studyId` is absent. */
export function clearAdminPortalData(userId, studyId = null) {
  const db = getDb();
  const study = Number(studyId);
  db.exec('BEGIN');
  try {
    if (Number.isInteger(study) && study > 0) {
      for (const table of ['user_curriculum_nodes', 'user_curriculum_sync', 'user_courses', 'user_course_elements', 'user_courses_sync']) {
        db.prepare(`DELETE FROM ${table} WHERE user_id = ? AND study_id = ?`).run(userId, study);
      }
    } else {
      for (const table of ['user_curriculum_nodes', 'user_curriculum_sync', 'user_courses', 'user_course_elements', 'user_courses_sync', 'user_studies_snapshot', 'user_exported_events', 'user_portal_calls']) {
        db.prepare(`DELETE FROM ${table} WHERE user_id = ?`).run(userId);
      }
    }
    db.exec('COMMIT');
  } catch (error) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // Already rolled back; surface the original error.
    }
    throw error;
  }
  return adminUserDetail(userId);
}

export function deleteAdminUser(userId) {
  if (!userId || userId === LEGACY_USER) return false;
  const db = getDb();
  db.exec('BEGIN');
  try {
    for (const table of [
      'user_curriculum_nodes',
      'user_curriculum_sync',
      'user_courses',
      'user_course_elements',
      'user_courses_sync',
      'user_studies_snapshot',
      'user_exported_events',
      'user_portal_calls',
      'user_campus',
      'user_platforms',
      'user_sessions',
    ]) {
      db.prepare(`DELETE FROM ${table} WHERE user_id = ?`).run(userId);
    }
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    db.exec('COMMIT');
  } catch (error) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // Already rolled back; surface the original error.
    }
    throw error;
  }
  clearUserCampusCredential(userId);
  return true;
}

export function linkAdminPlatform(userId, input = {}) {
  const user = linkPlatform(userId, {
    platform: input.platform,
    account: input.account,
    status: input.status,
    source: typeof input.source === 'string' && input.source ? input.source : 'dashboard',
  });
  return user ? adminUserDetail(userId) : null;
}

export function unlinkAdminPlatform(userId, platform) {
  const user = unlinkPlatform(userId, platform);
  return user ? adminUserDetail(userId) : null;
}

/** Keep the source marker in sync when the dashboard links a platform by hand. */
export function setAdminCampusSource(userId, source, account = null) {
  if (source !== 'env' && source !== 'browser') return null;
  saveCampusSource(userId, source, account);
  return adminUserDetail(userId);
}
