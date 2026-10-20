/** Account list and detail reads. */

import { getUser, listUserDevices } from '../auth.mjs';
import { getUserCampusCredential, listUserCampusCredentials } from '../campus.mjs';
import { getDb, loadCampusSource } from '../db.mjs';
import { listAdminAudit } from './audit.mjs';
import { adminUserStudies } from './explorers.mjs';
import { sessionRow, userCounts } from './overview.mjs';
import { pageOffset, pageSize } from './util.mjs';

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
        (SELECT COUNT(*) FROM device_links d WHERE d.user_id = users.id AND d.revoked_at IS NULL) AS device_count,
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
      deviceCount: row.device_count ?? 0,
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
  const devices = listUserDevices(userId);
  const deviceBySession = new Map(devices.filter((item) => item.sessionId).map((item) => [item.sessionId, item]));
  const sessions = db
    .prepare('SELECT id, created_at, expires_at, last_seen_at, revoked_at FROM user_sessions WHERE user_id = ? ORDER BY created_at DESC')
    .all(userId)
    .map((row) => {
      const session = sessionRow(row);
      const device = deviceBySession.get(session.id);
      return {
        ...session,
        device: device ? { id: device.id, name: device.name, kind: device.kind, userAgent: device.userAgent } : null,
      };
    });
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
    devices,
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
