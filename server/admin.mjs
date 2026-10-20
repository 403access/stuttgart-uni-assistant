/**
 * Admin data layer for the server-hosted dashboard. This is deliberately
 * separate from the app's user-facing routes: every function here reads across
 * accounts, so `server/routes/admin.mjs` gates the whole group behind
 * DASHBOARD_TOKEN. Every mutation writes one row to `admin_audit`.
 */

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { statSync } from 'node:fs';

import { getUser, linkPlatform, normalizeAccount, revokeAllSessions, SIGN_IN_MODES, touchPlatform, unlinkPlatform } from './auth.mjs';
import { clearUserCampusCredential, getUserCampusCredential, listUserCampusCredentials, publicCampusStatus } from './campus.mjs';
import { ASSISTANT_MODEL } from './config.mjs';
import { clearCampusSource, clearExportedEvents, dbPath, getDb, LEGACY_USER, loadCampusSource, loadStudiesSnapshot, saveCampusSource } from './db.mjs';
import { forgetMailCredentials, publicMailStatus } from './mail.mjs';
import { publicOidcStatus } from './oidc.mjs';
import { cancelSyncJob, listSyncJobs, startSyncJob } from './sync.mjs';

export const ADMIN_COOKIE = 'ua_admin';
const ADMIN_COOKIE_MAX_AGE = 12 * 60 * 60;
const MAX_PAGE = 200;

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

function adminError(status, code) {
  const error = new Error(code);
  error.status = status;
  return error;
}

function pageSize(value, fallback = 50) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(MAX_PAGE, Math.trunc(parsed)));
}

function pageOffset(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.trunc(parsed);
}

function positiveInt(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseIdList(value) {
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((id) => Number.isInteger(id)) : [];
  } catch {
    return [];
  }
}

function parseLecturers(value) {
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((name) => typeof name === 'string') : [];
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ audit -- */

const AUDIT_DETAIL_LIMIT = 1200;

function serializeAuditDetail(detail) {
  if (detail === null || detail === undefined) return '';
  if (typeof detail === 'string') return detail.slice(0, AUDIT_DETAIL_LIMIT);
  try {
    return JSON.stringify(detail).slice(0, AUDIT_DETAIL_LIMIT);
  } catch {
    return '';
  }
}

function parseAuditDetail(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

/** Never throws: an audit failure must not undo a successful mutation. */
export function recordAdminAudit({ action, userId = null, account = null, detail = null } = {}) {
  const name = typeof action === 'string' ? action.trim().slice(0, 80) : '';
  if (!name) return false;
  try {
    getDb()
      .prepare('INSERT INTO admin_audit (action, user_id, account, detail, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(name, userId ?? null, account ?? null, serializeAuditDetail(detail), new Date().toISOString());
    return true;
  } catch {
    return false;
  }
}

/** Newest first. `actions` is the full facet list, independent of the page. */
export function listAdminAudit({ query = '', action = '', userId = '', limit = 50, offset = 0 } = {}) {
  const db = getDb();
  const capped = pageSize(limit, 50);
  const skip = pageOffset(offset);
  const where = [];
  const params = [];
  const text = String(query ?? '').trim();
  if (text) {
    where.push('(action LIKE ? OR account LIKE ? OR user_id LIKE ? OR detail LIKE ?)');
    const needle = `%${text}%`;
    params.push(needle, needle, needle, needle);
  }
  if (typeof action === 'string' && action.trim()) {
    where.push('action = ?');
    params.push(action.trim());
  }
  if (typeof userId === 'string' && userId.trim()) {
    where.push('user_id = ?');
    params.push(userId.trim());
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = db.prepare(`SELECT COUNT(*) AS n FROM admin_audit ${clause}`).get(...params)?.n ?? 0;
  const entries = db
    .prepare(`SELECT id, action, user_id, account, detail, created_at FROM admin_audit ${clause} ORDER BY id DESC LIMIT ? OFFSET ?`)
    .all(...params, capped, skip)
    .map((row) => ({
      id: row.id,
      action: row.action,
      userId: row.user_id ?? null,
      account: row.account ?? null,
      detail: parseAuditDetail(row.detail),
      createdAt: row.created_at,
    }));
  const actions = db.prepare('SELECT action, COUNT(*) AS n FROM admin_audit GROUP BY action ORDER BY action').all().map((row) => ({
    action: row.action,
    count: row.n,
  }));
  return { entries, total, limit: capped, offset: skip, actions };
}

/* ----------------------------------------------------------------- counts -- */

function userCounts(userId) {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT
        (SELECT COUNT(*) FROM user_curriculum_nodes WHERE user_id = ?) AS nodes,
        (SELECT COUNT(*) FROM user_curriculum_nodes WHERE user_id = ? AND completed = 1) AS completed_nodes,
        (SELECT COUNT(*) FROM user_curriculum_nodes WHERE user_id = ? AND in_progress = 1) AS in_progress_nodes,
        (SELECT COUNT(*) FROM user_courses WHERE user_id = ?) AS courses,
        (SELECT COUNT(*) FROM user_exported_events WHERE user_id = ?) AS events,
        (SELECT COUNT(*) FROM user_portal_calls WHERE user_id = ?) AS calls`,
    )
    .get(userId, userId, userId, userId, userId, userId);
  const studies = db
    .prepare(
      `SELECT COUNT(*) AS n FROM (
        SELECT study_id FROM user_curriculum_nodes WHERE user_id = ?
        UNION SELECT study_id FROM user_courses WHERE user_id = ?
      )`,
    )
    .get(userId, userId)?.n ?? 0;
  return {
    nodes: row?.nodes ?? 0,
    completedNodes: row?.completed_nodes ?? 0,
    inProgressNodes: row?.in_progress_nodes ?? 0,
    studies,
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

function databaseCounts() {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT
        (SELECT COUNT(*) FROM users) AS users,
        (SELECT COUNT(*) FROM user_sessions) AS sessions,
        (SELECT COUNT(*) FROM user_platforms) AS platforms,
        (SELECT COUNT(*) FROM user_campus) AS campus_sources,
        (SELECT COUNT(*) FROM user_curriculum_nodes) AS nodes,
        (SELECT COUNT(*) FROM user_courses) AS courses,
        (SELECT COUNT(*) FROM user_exported_events) AS events,
        (SELECT COUNT(*) FROM user_portal_calls) AS calls,
        (SELECT COUNT(*) FROM admin_audit) AS audit`,
    )
    .get();
  return {
    users: row?.users ?? 0,
    sessions: row?.sessions ?? 0,
    platforms: row?.platforms ?? 0,
    campusSources: row?.campus_sources ?? 0,
    nodes: row?.nodes ?? 0,
    courses: row?.courses ?? 0,
    events: row?.events ?? 0,
    calls: row?.calls ?? 0,
    audit: row?.audit ?? 0,
  };
}

export function adminStats() {
  const db = getDb();
  const now = new Date().toISOString();
  const users = db.prepare('SELECT COUNT(*) AS n FROM users').get()?.n ?? 0;
  const activeSessions = db.prepare('SELECT COUNT(*) AS n FROM user_sessions WHERE revoked_at IS NULL AND expires_at > ?').get(now)?.n ?? 0;
  const usersWithSessions = db.prepare('SELECT COUNT(DISTINCT user_id) AS n FROM user_sessions WHERE revoked_at IS NULL AND expires_at > ?').get(now)?.n ?? 0;
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const recent = db.prepare('SELECT COUNT(*) AS n FROM users WHERE created_at >= ?').get(sevenDaysAgo)?.n ?? 0;
  const recentMonth = db.prepare('SELECT COUNT(*) AS n FROM users WHERE created_at >= ?').get(thirtyDaysAgo)?.n ?? 0;
  const activeWeek = db.prepare('SELECT COUNT(*) AS n FROM users WHERE last_login_at >= ?').get(sevenDaysAgo)?.n ?? 0;
  const platforms = db
    .prepare('SELECT platform, status, COUNT(*) AS n FROM user_platforms GROUP BY platform, status ORDER BY platform')
    .all()
    .map((row) => ({ platform: row.platform, status: row.status, count: row.n }));
  const modes = db
    .prepare('SELECT primary_mode AS mode, COUNT(*) AS n FROM users GROUP BY primary_mode ORDER BY n DESC, mode')
    .all()
    .map((row) => ({ mode: row.mode, count: row.n }));
  const campus = db
    .prepare('SELECT source, COUNT(*) AS n FROM user_campus GROUP BY source')
    .all()
    .map((row) => ({ source: row.source, count: row.n }));
  const credentialsActive = listUserCampusCredentials().length;
  const data = databaseCounts();
  return {
    users,
    activeSessions,
    usersWithSessions,
    recentUsers: recent,
    recentUsersMonth: recentMonth,
    activeUsersWeek: activeWeek,
    credentialsActive,
    portalNodes: data.nodes,
    portalCourses: data.courses,
    calendarEvents: data.events,
    portalCalls: data.calls,
    completedNodes: db.prepare('SELECT COUNT(*) AS n FROM user_curriculum_nodes WHERE completed = 1').get()?.n ?? 0,
    inProgressNodes: db.prepare('SELECT COUNT(*) AS n FROM user_curriculum_nodes WHERE in_progress = 1').get()?.n ?? 0,
    platforms,
    modes,
    campus,
    data,
    config: {
      admin: { configured: adminConfigured() },
      campus: publicCampusStatus(),
      oidc: publicOidcStatus(),
      mail: publicMailStatus(),
      assistant: { model: ASSISTANT_MODEL, configured: Boolean(process.env.XAI_API_KEY) },
    },
  };
}

/* ------------------------------------------------------------------ users -- */

/**
 * One page of users. Filters and sort are whitelisted; search text is bound.
 * `credential` is `env`, `browser`, `active` (live in memory), or `none`.
 */
export function listUsers({ query = '', mode = '', platform = '', credential = '', activity = '', data = '', sort = 'recent', limit = 50, offset = 0 } = {}) {
  const db = getDb();
  const capped = pageSize(limit, 50);
  const skip = pageOffset(offset);
  const where = [];
  const params = [];
  const text = String(query ?? '').trim();
  if (text) {
    where.push('(account LIKE ? OR name LIKE ? OR email LIKE ? OR matriculation LIKE ?)');
    const needle = `%${text}%`;
    params.push(needle, needle, needle, needle);
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
  } else if (credential === 'none') {
    where.push('NOT EXISTS (SELECT 1 FROM user_campus c WHERE c.user_id = users.id)');
  } else if (credential === 'active') {
    const active = listUserCampusCredentials().map((item) => item.userId);
    if (!active.length) return { users: [], total: 0, limit: capped, offset: skip, sort };
    where.push(`id IN (${active.map(() => '?').join(',')})`);
    params.push(...active);
  }
  if (activity === 'active') {
    where.push('EXISTS (SELECT 1 FROM user_sessions s WHERE s.user_id = users.id AND s.revoked_at IS NULL AND s.expires_at > ?)');
    params.push(new Date().toISOString());
  } else if (activity === 'inactive') {
    where.push('NOT EXISTS (SELECT 1 FROM user_sessions s WHERE s.user_id = users.id AND s.revoked_at IS NULL AND s.expires_at > ?)');
    params.push(new Date().toISOString());
  } else if (activity === 'never') {
    where.push('last_login_at IS NULL');
  }
  if (data === 'portal') {
    where.push('EXISTS (SELECT 1 FROM user_curriculum_nodes n WHERE n.user_id = users.id)');
  } else if (data === 'courses') {
    where.push('EXISTS (SELECT 1 FROM user_courses c WHERE c.user_id = users.id)');
  } else if (data === 'events') {
    where.push('EXISTS (SELECT 1 FROM user_exported_events e WHERE e.user_id = users.id)');
  } else if (data === 'calls') {
    where.push('EXISTS (SELECT 1 FROM user_portal_calls c WHERE c.user_id = users.id)');
  } else if (data === 'empty') {
    where.push(`NOT EXISTS (SELECT 1 FROM user_curriculum_nodes n WHERE n.user_id = users.id)
      AND NOT EXISTS (SELECT 1 FROM user_courses c WHERE c.user_id = users.id)
      AND NOT EXISTS (SELECT 1 FROM user_exported_events e WHERE e.user_id = users.id)
      AND NOT EXISTS (SELECT 1 FROM user_portal_calls pc WHERE pc.user_id = users.id)`);
  }
  const sorts = {
    recent: 'COALESCE(last_login_at, created_at) DESC, account ASC',
    created: 'created_at DESC, account ASC',
    name: 'LOWER(COALESCE(name, account)) ASC, account ASC',
    account: 'LOWER(account) ASC',
    sessions: 'active_sessions DESC, COALESCE(last_login_at, created_at) DESC',
    data: 'portal_nodes DESC, portal_courses DESC, account ASC',
  };
  const order = sorts[sort] || sorts.recent;
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = db.prepare(`SELECT COUNT(*) AS n FROM users ${clause}`).get(...params)?.n ?? 0;
  const rows = db
    .prepare(
      `SELECT users.*,
        (SELECT COUNT(*) FROM user_sessions s WHERE s.user_id = users.id AND s.revoked_at IS NULL AND s.expires_at > ?) AS active_sessions,
        (SELECT source FROM user_campus c WHERE c.user_id = users.id) AS campus_source,
        (SELECT COUNT(*) FROM user_platforms p WHERE p.user_id = users.id) AS platform_count,
        (SELECT COUNT(*) FROM user_curriculum_nodes n WHERE n.user_id = users.id) AS portal_nodes,
        (SELECT COUNT(*) FROM user_curriculum_nodes n WHERE n.user_id = users.id AND n.completed = 1) AS completed_nodes,
        (SELECT COUNT(*) FROM user_courses c WHERE c.user_id = users.id) AS portal_courses,
        (SELECT COUNT(*) FROM user_exported_events e WHERE e.user_id = users.id) AS calendar_events,
        (SELECT COUNT(*) FROM user_portal_calls pc WHERE pc.user_id = users.id) AS portal_calls
       FROM users ${clause} ORDER BY ${order} LIMIT ? OFFSET ?`,
    )
    .all(new Date().toISOString(), ...params, capped, skip);
  const platformMap = new Map();
  const ids = rows.map((row) => row.id);
  if (ids.length) {
    const links = db
      .prepare(`SELECT user_id, platform, account, status, source, last_sync_at FROM user_platforms WHERE user_id IN (${ids.map(() => '?').join(',')}) ORDER BY platform`)
      .all(...ids);
    for (const link of links) {
      const list = platformMap.get(link.user_id) ?? [];
      list.push({ id: link.platform, account: link.account ?? null, status: link.status, source: link.source, lastSyncAt: link.last_sync_at ?? null });
      platformMap.set(link.user_id, list);
    }
  }
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
      platforms: platformMap.get(row.id) ?? [],
      campusSource: row.campus_source ?? null,
      campusActive: Boolean(getUserCampusCredential(row.id)),
      data: {
        nodes: row.portal_nodes ?? 0,
        completedNodes: row.completed_nodes ?? 0,
        courses: row.portal_courses ?? 0,
        events: row.calendar_events ?? 0,
        calls: row.portal_calls ?? 0,
      },
    })),
    total,
    limit: capped,
    offset: skip,
    sort,
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
    .prepare('SELECT time, op, study_id, element_id, ok, http_status, message, elapsed_ms, created_at FROM user_portal_calls WHERE user_id = ? ORDER BY id DESC LIMIT 20')
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
  const studies = adminUserStudies(userId);
  const audit = listAdminAudit({ userId, limit: 8 });
  return {
    user,
    sessions,
    campus: {
      source: campusSource?.source ?? null,
      account: campusSource?.account ?? null,
      updatedAt: campusSource?.updatedAt ?? null,
      active: Boolean(credential),
      credentialAccount: credential?.account ?? null,
      credentialSource: credential?.source ?? null,
      envConfigured: Boolean(
        (process.env.CAMPUS_BEARER_TOKEN || '').trim() || (process.env.CAMPUS_SESSION_COOKIE || '').trim(),
      ),
    },
    counts: userCounts(userId),
    studies: studies.studies,
    studiesFetchedAt: studies.fetchedAt,
    calls,
    audit: audit.entries,
  };
}

/** Per-study summary: snapshot metadata merged with the stored row counts. */
export function adminUserStudies(userId) {
  if (!getUser(userId)) return { studies: [], fetchedAt: null };
  const db = getDb();
  const snapshot = loadStudiesSnapshot(userId);
  const meta = new Map();
  for (const study of Array.isArray(snapshot?.studies) ? snapshot.studies : []) {
    const studyId = Number(study?.studyId);
    if (Number.isInteger(studyId) && studyId > 0) meta.set(studyId, study);
  }
  const nodes = new Map(
    db
      .prepare(
        `SELECT study_id, COUNT(*) AS n, SUM(completed) AS completed, SUM(in_progress) AS in_progress, MAX(fetched_at) AS fetched_at
         FROM user_curriculum_nodes WHERE user_id = ? GROUP BY study_id`,
      )
      .all(userId)
      .map((row) => [row.study_id, row]),
  );
  const nodeSync = new Map(
    db
      .prepare('SELECT study_id, root_element_id, node_count, finished_at, complete FROM user_curriculum_sync WHERE user_id = ?')
      .all(userId)
      .map((row) => [row.study_id, row]),
  );
  const courses = new Map(
    db
      .prepare('SELECT study_id, COUNT(*) AS n, MAX(fetched_at) AS fetched_at FROM user_courses WHERE user_id = ? GROUP BY study_id')
      .all(userId)
      .map((row) => [row.study_id, row]),
  );
  const courseSync = new Map(
    db
      .prepare('SELECT study_id, course_count, fetched_elements, finished_at, complete FROM user_courses_sync WHERE user_id = ?')
      .all(userId)
      .map((row) => [row.study_id, row]),
  );
  const ids = new Set([...meta.keys(), ...nodes.keys(), ...nodeSync.keys(), ...courses.keys(), ...courseSync.keys()]);
  const studies = [...ids]
    .map((studyId) => {
      const info = meta.get(studyId) ?? {};
      const node = nodes.get(studyId);
      const sync = nodeSync.get(studyId);
      const course = courses.get(studyId);
      const cSync = courseSync.get(studyId);
      return {
        studyId,
        name: typeof info.name === 'string' && info.name ? info.name : `Studium ${studyId}`,
        intendedDegree: info.intendedDegree ?? null,
        versionIdentifier: info.versionIdentifier ?? null,
        identifier: info.identifier ?? null,
        studyStatus: info.studyStatus ?? null,
        curriculumId: Number.isInteger(info.curriculumId) ? info.curriculumId : null,
        elementId: Number.isInteger(info.elementId) ? info.elementId : null,
        color: typeof info.color === 'string' ? info.color : null,
        lastAccessed: info.lastAccessed === true,
        nodeCount: node?.n ?? 0,
        completedNodes: node?.completed ?? 0,
        inProgressNodes: node?.in_progress ?? 0,
        nodesFetchedAt: node?.fetched_at ?? null,
        nodesFinishedAt: sync?.finished_at ?? null,
        nodesComplete: sync?.complete === 1,
        rootElementId: sync?.root_element_id ?? null,
        courseCount: course?.n ?? cSync?.course_count ?? 0,
        coursesFetchedAt: course?.fetched_at ?? null,
        coursesFinishedAt: cSync?.finished_at ?? null,
        coursesComplete: cSync?.complete === 1,
        elementsFetched: parseIdList(cSync?.fetched_elements).length,
      };
    })
    .sort((a, b) => (Number(b.lastAccessed) - Number(a.lastAccessed)) || a.name.localeCompare(b.name, 'de'));
  return { studies, fetchedAt: snapshot?.fetchedAt ?? null };
}

export function adminUserCourses(userId, { studyId = '', query = '', limit = 50, offset = 0 } = {}) {
  if (!getUser(userId)) return null;
  const db = getDb();
  const capped = pageSize(limit, 50);
  const skip = pageOffset(offset);
  const study = positiveInt(studyId);
  const where = ['user_id = ?'];
  const params = [userId];
  if (study) {
    where.push('study_id = ?');
    params.push(study);
  }
  const text = String(query ?? '').trim();
  if (text) {
    where.push('(title LIKE ? OR course_number LIKE ? OR lecturers LIKE ? OR semester LIKE ? OR room_name LIKE ?)');
    const needle = `%${text}%`;
    params.push(needle, needle, needle, needle, needle);
  }
  const clause = `WHERE ${where.join(' AND ')}`;
  const total = db.prepare(`SELECT COUNT(*) AS n FROM user_courses ${clause}`).get(...params)?.n ?? 0;
  const rows = db
    .prepare(
      `SELECT id, study_id, course_number, title, course_type, course_type_short, semester, semester_id, duration, lecturers, room_name,
        start_time, end_time, detail_url, registration_status, registration_action, registration_url, fetched_at
       FROM user_courses ${clause} ORDER BY semester DESC, title COLLATE NOCASE LIMIT ? OFFSET ?`,
    )
    .all(...params, capped, skip);
  const links = new Map();
  if (rows.length) {
    const courseIds = rows.map((row) => row.id);
    const linkRows = db
      .prepare(
        `SELECT course_id, element_id, element_name FROM user_course_elements
         WHERE user_id = ? AND course_id IN (${courseIds.map(() => '?').join(',')})
         ORDER BY element_id`,
      )
      .all(userId, ...courseIds);
    for (const link of linkRows) {
      const list = links.get(link.course_id) ?? [];
      list.push({ elementId: link.element_id, elementName: link.element_name });
      links.set(link.course_id, list);
    }
  }
  return {
    courses: rows.map((row) => ({
      id: row.id,
      studyId: row.study_id,
      courseNumber: row.course_number ?? '',
      title: row.title,
      courseType: row.course_type ?? '',
      courseTypeShort: row.course_type_short ?? '',
      semester: row.semester ?? '',
      semesterId: row.semester_id ?? null,
      duration: row.duration ?? null,
      lecturers: parseLecturers(row.lecturers),
      roomName: row.room_name ?? '',
      startTime: row.start_time ?? '',
      endTime: row.end_time ?? '',
      detailUrl: row.detail_url ?? '',
      registrationStatus: row.registration_status ?? '',
      registrationAction: row.registration_action ?? '',
      registrationUrl: row.registration_url ?? '',
      fetchedAt: row.fetched_at,
      elements: links.get(row.id) ?? [],
    })),
    total,
    limit: capped,
    offset: skip,
    studyId: study,
  };
}

export function adminUserNodes(userId, { studyId = '', query = '', state = '', limit = 50, offset = 0 } = {}) {
  if (!getUser(userId)) return null;
  const db = getDb();
  const capped = pageSize(limit, 50);
  const skip = pageOffset(offset);
  const study = positiveInt(studyId);
  const where = ['user_id = ?'];
  const params = [userId];
  if (study) {
    where.push('study_id = ?');
    params.push(study);
  }
  const text = String(query ?? '').trim();
  if (text) {
    where.push('(name LIKE ? OR designation LIKE ? OR element_type LIKE ?)');
    const needle = `%${text}%`;
    params.push(needle, needle, needle);
  }
  if (state === 'completed') where.push('completed = 1');
  else if (state === 'in_progress') where.push('in_progress = 1');
  else if (state === 'open') where.push('completed = 0 AND in_progress = 0');
  const clause = `WHERE ${where.join(' AND ')}`;
  const total = db.prepare(`SELECT COUNT(*) AS n FROM user_curriculum_nodes ${clause}`).get(...params)?.n ?? 0;
  const nodes = db
    .prepare(
      `SELECT id, study_id, designation, element_type, name, parent_id, completed, in_progress, fetched_at, expanded
       FROM user_curriculum_nodes ${clause} ORDER BY name COLLATE NOCASE, id LIMIT ? OFFSET ?`,
    )
    .all(...params, capped, skip)
    .map((row) => ({
      id: row.id,
      studyId: row.study_id,
      designation: row.designation ?? '',
      elementType: row.element_type ?? '',
      name: row.name,
      parentId: row.parent_id ?? null,
      completed: row.completed === 1,
      inProgress: row.in_progress === 1,
      expanded: row.expanded === 1,
      fetchedAt: row.fetched_at,
    }));
  return { nodes, total, limit: capped, offset: skip, studyId: study };
}

export function adminUserEvents(userId, { query = '', limit = 50, offset = 0 } = {}) {
  if (!getUser(userId)) return null;
  const db = getDb();
  const capped = pageSize(limit, 50);
  const skip = pageOffset(offset);
  const where = ['user_id = ?'];
  const params = [userId];
  const text = String(query ?? '').trim();
  if (text) {
    where.push('(summary LIKE ? OR location LIKE ? OR description LIKE ? OR uid LIKE ?)');
    const needle = `%${text}%`;
    params.push(needle, needle, needle, needle);
  }
  const clause = `WHERE ${where.join(' AND ')}`;
  const total = db.prepare(`SELECT COUNT(*) AS n FROM user_exported_events ${clause}`).get(...params)?.n ?? 0;
  const events = db
    .prepare(
      `SELECT uid, summary, location, description, dtstart, dtend, fetched_at
       FROM user_exported_events ${clause} ORDER BY dtstart ASC, summary COLLATE NOCASE LIMIT ? OFFSET ?`,
    )
    .all(...params, capped, skip)
    .map((row) => ({
      uid: row.uid,
      summary: row.summary ?? '',
      location: row.location ?? '',
      description: row.description ?? '',
      dtstart: row.dtstart ?? '',
      dtend: row.dtend ?? '',
      fetchedAt: row.fetched_at,
    }));
  return { events, total, limit: capped, offset: skip };
}

export function adminUserCalls(userId, { query = '', failed = '', limit = 50, offset = 0 } = {}) {
  if (!getUser(userId)) return null;
  const db = getDb();
  const capped = pageSize(limit, 50);
  const skip = pageOffset(offset);
  const where = ['user_id = ?'];
  const params = [userId];
  const text = String(query ?? '').trim();
  if (text) {
    where.push('(op LIKE ? OR message LIKE ?)');
    params.push(`%${text}%`, `%${text}%`);
  }
  if (failed === '1' || failed === 'true') where.push('ok = 0');
  const clause = `WHERE ${where.join(' AND ')}`;
  const total = db.prepare(`SELECT COUNT(*) AS n FROM user_portal_calls ${clause}`).get(...params)?.n ?? 0;
  const calls = db
    .prepare(
      `SELECT id, time, op, study_id, element_id, ok, http_status, message, elapsed_ms, created_at
       FROM user_portal_calls ${clause} ORDER BY id DESC LIMIT ? OFFSET ?`,
    )
    .all(...params, capped, skip)
    .map((row) => ({
      id: row.id,
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
  return { calls, total, limit: capped, offset: skip };
}

/* --------------------------------------------------------------- mutations -- */

function cleanProfileValue(value) {
  return typeof value === 'string' ? value.trim().slice(0, 200) || null : null;
}

/**
 * Pre-provision an account without minting a session. The account becomes
 * usable through its normal sign-in path; local and demo accounts can be used
 * by the app's passwordless paths. No token is returned here.
 */
export function createAdminUser(input = {}) {
  const account = String(input.account ?? '').trim();
  if (!account) throw adminError(400, 'account_missing');
  if (account.length > 200) throw adminError(400, 'account_invalid');
  const key = normalizeAccount(account);
  const db = getDb();
  if (db.prepare('SELECT 1 FROM users WHERE account_key = ?').get(key)) throw adminError(409, 'account_taken');
  if (input.mode !== undefined && input.mode !== null && input.mode !== '' && !SIGN_IN_MODES.includes(input.mode)) {
    throw adminError(400, 'bad_mode');
  }
  const mode = SIGN_IN_MODES.includes(input.mode) ? input.mode : 'local';
  const now = new Date().toISOString();
  const id = `usr_${randomBytes(12).toString('base64url')}`;
  db.prepare(
    'INSERT INTO users (id, account, account_key, name, email, matriculation, subject, primary_mode, created_at, updated_at, last_login_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)',
  ).run(
    id,
    account,
    key,
    cleanProfileValue(input.name),
    cleanProfileValue(input.email),
    cleanProfileValue(input.matriculation),
    cleanProfileValue(input.subject),
    mode,
    now,
    now,
  );
  recordAdminAudit({ action: 'user.create', userId: id, account, detail: { mode } });
  return getUser(id);
}

export function updateAdminUser(userId, input = {}) {
  const existing = getUser(userId);
  if (!existing) return null;
  const db = getDb();
  const fields = [];
  const params = [];
  const changed = [];
  let nextAccount = existing.account;

  if (typeof input.account === 'string') {
    const account = input.account.trim().slice(0, 200);
    const key = normalizeAccount(account);
    if (!key) throw adminError(400, 'account_missing');
    const clash = db.prepare('SELECT id FROM users WHERE account_key = ? AND id <> ?').get(key, userId);
    if (clash) throw adminError(409, 'account_taken');
    if (account !== existing.account) {
      fields.push('account = ?', 'account_key = ?');
      params.push(account, key);
      changed.push('account');
      nextAccount = account;
    }
  }
  for (const key of ['name', 'email', 'matriculation', 'subject']) {
    if (typeof input[key] === 'string') {
      const value = input[key].trim().slice(0, 200) || null;
      if (value !== (existing[key] ?? null)) changed.push(key);
      fields.push(`${key} = ?`);
      params.push(value);
    }
  }
  if (typeof input.mode === 'string') {
    if (!SIGN_IN_MODES.includes(input.mode)) throw adminError(400, 'bad_mode');
    if (input.mode !== existing.mode) changed.push('mode');
    fields.push('primary_mode = ?');
    params.push(input.mode);
  }
  if (!fields.length) return existing;
  if (!changed.length) return existing;
  fields.push('updated_at = ?');
  params.push(new Date().toISOString());
  params.push(userId);
  db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  recordAdminAudit({ action: 'user.update', userId, account: nextAccount, detail: { fields: changed } });
  return getUser(userId);
}

export function revokeAdminSession(userId, sessionId) {
  if (typeof sessionId !== 'string' || !sessionId) return false;
  const result = getDb()
    .prepare('UPDATE user_sessions SET revoked_at = ? WHERE id = ? AND user_id = ? AND revoked_at IS NULL')
    .run(new Date().toISOString(), sessionId, userId);
  if (Number(result.changes ?? 0) > 0) {
    recordAdminAudit({ action: 'session.revoke', userId, account: getUser(userId)?.account ?? null, detail: { sessionId } });
    return true;
  }
  return false;
}

export function revokeAdminSessions(userId) {
  const active = getDb()
    .prepare('SELECT COUNT(*) AS n FROM user_sessions WHERE user_id = ? AND revoked_at IS NULL AND expires_at > ?')
    .get(userId, new Date().toISOString())?.n ?? 0;
  revokeAllSessions(userId);
  recordAdminAudit({ action: 'session.revoke_all', userId, account: getUser(userId)?.account ?? null, detail: { revoked: active } });
  return adminUserDetail(userId);
}

export function disconnectAdminCampus(userId) {
  clearUserCampusCredential(userId);
  clearCampusSource(userId);
  getDb()
    .prepare("UPDATE user_platforms SET status = 'linked', last_sync_at = NULL WHERE user_id = ? AND platform = 'campus'")
    .run(userId);
  recordAdminAudit({ action: 'campus.disconnect', userId, account: getUser(userId)?.account ?? null });
  return adminUserDetail(userId);
}

/** Clear one study, or every portal row for the user when `studyId` is absent. */
export function clearAdminPortalData(userId, studyId = null) {
  const db = getDb();
  const hasStudy = studyId !== null && studyId !== undefined && studyId !== '';
  const study = positiveInt(studyId);
  if (hasStudy && !study) throw adminError(400, 'bad_study_id');
  const account = getUser(userId)?.account ?? null;
  const before = userCounts(userId);
  db.exec('BEGIN');
  try {
    if (study) {
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
  recordAdminAudit({
    action: study ? 'portal.clear_study' : 'portal.clear_all',
    userId,
    account,
    detail: study ? { studyId: study, counts: before } : { counts: before },
  });
  return adminUserDetail(userId);
}

export function clearAdminEvents(userId) {
  clearExportedEvents(userId);
  recordAdminAudit({ action: 'calendar.clear', userId, account: getUser(userId)?.account ?? null });
  return adminUserDetail(userId);
}

export function clearAdminCalls(userId) {
  getDb().prepare('DELETE FROM user_portal_calls WHERE user_id = ?').run(userId);
  recordAdminAudit({ action: 'calls.clear', userId, account: getUser(userId)?.account ?? null });
  return adminUserDetail(userId);
}

export function deleteAdminUser(userId) {
  if (!userId || userId === LEGACY_USER) return false;
  const user = getUser(userId);
  if (!user) return false;
  const db = getDb();
  const counts = userCounts(userId);
  const platforms = user.platforms.length;
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
  recordAdminAudit({ action: 'user.delete', userId, account: user.account, detail: { ...counts, platforms } });
  return true;
}

export function linkAdminPlatform(userId, input = {}) {
  const user = linkPlatform(userId, {
    platform: input.platform,
    account: input.account,
    status: input.status,
    source: typeof input.source === 'string' && input.source ? input.source : 'dashboard',
  });
  if (user) {
    recordAdminAudit({
      action: 'platform.link',
      userId,
      account: user.account,
      detail: { platform: input.platform, account: input.account ?? null, status: input.status ?? 'linked' },
    });
  }
  return user ? adminUserDetail(userId) : null;
}

export function unlinkAdminPlatform(userId, platform) {
  const user = unlinkPlatform(userId, platform);
  if (user) {
    recordAdminAudit({ action: 'platform.unlink', userId, account: user.account, detail: { platform } });
  }
  return user ? adminUserDetail(userId) : null;
}

export function touchAdminPlatform(userId, platform) {
  const user = touchPlatform(userId, platform);
  recordAdminAudit({ action: 'platform.touch', userId, account: user?.account ?? null, detail: { platform } });
  return user ? adminUserDetail(userId) : null;
}

/** Keep the source marker in sync when the dashboard links a platform by hand. */
export function setAdminCampusSource(userId, source, account = null) {
  if (source !== 'env' && source !== 'browser') return null;
  saveCampusSource(userId, source, account);
  recordAdminAudit({ action: 'campus.source', userId, account: getUser(userId)?.account ?? null, detail: { source } });
  return adminUserDetail(userId);
}

/* ----------------------------------------------------------------- system -- */

function fileSize(path) {
  let total = 0;
  for (const suffix of ['', '-wal', '-shm']) {
    try {
      total += statSync(`${path}${suffix}`).size;
    } catch {
      // A missing sidecar is normal when the database is not in WAL mode yet.
    }
  }
  return total;
}

export function adminSystem() {
  const jobs = listSyncJobs().map((job) => ({
    ...job,
    account: job.userId ? getUser(job.userId)?.account ?? null : null,
  }));
  const memory = process.memoryUsage();
  return {
    runtime: {
      node: process.version,
      pid: process.pid,
      uptimeSeconds: Math.round(process.uptime()),
      startedAt: new Date(Date.now() - process.uptime() * 1000).toISOString(),
      memory: {
        rss: memory.rss,
        heapUsed: memory.heapUsed,
        heapTotal: memory.heapTotal,
      },
    },
    config: {
      admin: { configured: adminConfigured() },
      campus: publicCampusStatus(),
      oidc: publicOidcStatus(),
      mail: publicMailStatus(),
      assistant: { model: ASSISTANT_MODEL, configured: Boolean(process.env.XAI_API_KEY) },
    },
    database: {
      path: dbPath(),
      sizeBytes: fileSize(dbPath()),
      counts: databaseCounts(),
    },
    syncJobs: jobs,
    stats: adminStats(),
  };
}

export function cancelAdminSyncJob(jobId) {
  const id = Number(jobId);
  if (!Number.isInteger(id) || id <= 0) return null;
  const job = listSyncJobs().find((item) => item.jobId === id);
  if (!job) return null;
  const account = job.userId ? getUser(job.userId)?.account ?? null : null;
  const cancelled = cancelSyncJob(id);
  recordAdminAudit({ action: 'sync.cancel', userId: job.userId ?? null, account, detail: { jobId: id, studyId: job.studyId } });
  return cancelled;
}

/**
 * Start a full sync on behalf of one account. The job can only run while that
 * account has a usable portal credential; the operator cannot inject one.
 */
export async function startAdminSyncJob(userId, input = {}) {
  const user = getUser(userId);
  if (!user) return null;
  const studyId = positiveInt(input.studyId);
  if (!studyId) throw adminError(400, 'bad_study_id');
  const stored = getUserCampusCredential(userId);
  const source = loadCampusSource(userId);
  if (!stored && source?.source !== 'env') throw adminError(409, 'campus_credentials_missing');
  const job = await startSyncJob({
    userId,
    studyId,
    elementId: input.elementId,
    includeCourses: input.includeCourses !== false,
  });
  recordAdminAudit({
    action: 'sync.start',
    userId,
    account: user.account,
    detail: { jobId: job.jobId, studyId, includeCourses: job.includeCourses },
  });
  return job;
}

/** The mail login is process-wide, not per account: this disconnects every mail view. */
export function disconnectAdminMail() {
  const account = publicMailStatus().account ?? null;
  forgetMailCredentials();
  recordAdminAudit({ action: 'mail.disconnect', account });
  return publicMailStatus();
}
