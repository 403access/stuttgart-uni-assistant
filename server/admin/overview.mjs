/** Cross-account counts for the overview page and system status. */

import { listUserCampusCredentials, publicCampusStatus } from '../campus.mjs';
import { ASSISTANT_MODEL } from '../config.mjs';
import { getDb } from '../db.mjs';
import { listUserIliasSessions, publicIliasStatus } from '../ilias.mjs';
import { publicMailStatus } from '../mail.mjs';
import { publicOidcStatus } from '../oidc.mjs';
import { adminDeviceStats } from './devices.mjs';
import { adminConfigured } from './session.mjs';

/* ----------------------------------------------------------------- counts -- */

export function userCounts(userId) {
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

export function sessionRow(row) {
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

export function databaseCounts() {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT
        (SELECT COUNT(*) FROM users) AS users,
        (SELECT COUNT(*) FROM user_sessions) AS sessions,
        (SELECT COUNT(*) FROM device_links) AS devices,
        (SELECT COUNT(*) FROM user_platforms) AS platforms,
        (SELECT COUNT(*) FROM user_campus) AS campus_sources,
        (SELECT COUNT(*) FROM user_ilias) AS ilias_sources,
        (SELECT COUNT(*) FROM user_ilias_snapshot) AS ilias_snapshots,
        (SELECT COUNT(*) FROM user_curriculum_nodes) AS nodes,
        (SELECT COUNT(*) FROM user_courses) AS courses,
        (SELECT COUNT(*) FROM user_exported_events) AS events,
        (SELECT COUNT(*) FROM user_portal_calls) AS calls,
        (SELECT COUNT(*) FROM news_items) AS news,
        (SELECT COUNT(*) FROM admin_audit) AS audit`,
    )
    .get();
  return {
    users: row?.users ?? 0,
    sessions: row?.sessions ?? 0,
    devices: row?.devices ?? 0,
    platforms: row?.platforms ?? 0,
    campusSources: row?.campus_sources ?? 0,
    iliasSources: row?.ilias_sources ?? 0,
    iliasSnapshots: row?.ilias_snapshots ?? 0,
    nodes: row?.nodes ?? 0,
    courses: row?.courses ?? 0,
    events: row?.events ?? 0,
    calls: row?.calls ?? 0,
    news: row?.news ?? 0,
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
  const iliasActive = listUserIliasSessions().length;
  const data = databaseCounts();
  const deviceStats = adminDeviceStats();
  return {
    users,
    activeSessions,
    usersWithSessions,
    ...deviceStats,
    recentUsers: recent,
    recentUsersMonth: recentMonth,
    activeUsersWeek: activeWeek,
    credentialsActive,
    iliasActive,
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
      ilias: publicIliasStatus(),
      oidc: publicOidcStatus(),
      mail: publicMailStatus(),
      assistant: { model: ASSISTANT_MODEL, configured: Boolean(process.env.XAI_API_KEY) },
    },
  };
}
