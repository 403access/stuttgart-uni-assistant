/** ILIAS connections, snapshot counts, and per-account detail for the console. */

import { getUser } from '../auth.mjs';
import { getDb, loadIliasSnapshot, loadIliasSource } from '../db.mjs';
import { disconnectIlias, getUserIliasSession, listUserIliasSessions, publicIliasStatus, readIliasContent, readIliasFile, readIliasMembers } from '../ilias.mjs';
import { recordAdminAudit } from './audit.mjs';

function countsOf(snapshot) {
  const counts = snapshot?.dashboard?.counts ?? {};
  return {
    memberships: Number(counts.memberships) || 0,
    courses: Number(counts.courses) || 0,
    groups: Number(counts.groups) || 0,
    news: Number(counts.news) || 0,
    mails: Number(counts.mails) || 0,
    unreadMails: Number(counts.unreadMails) || 0,
    tasks: Number(counts.tasks) || 0,
  };
}

function addCounts(target, counts) {
  for (const key of Object.keys(counts)) target[key] = (target[key] ?? 0) + counts[key];
  return target;
}

export function adminUserIlias(userId) {
  const source = loadIliasSource(userId);
  const session = getUserIliasSession(userId);
  const snapshot = loadIliasSnapshot(userId);
  return {
    source: source?.source ?? null,
    account: source?.account ?? null,
    updatedAt: source?.updatedAt ?? null,
    active: Boolean(session),
    canRead: Boolean(publicIliasStatus(userId).sessionActive),
    credentialAccount: session?.account ?? null,
    credentialSource: session?.source ?? null,
    envConfigured: publicIliasStatus().configured,
    fetchedAt: snapshot?.fetchedAt ?? null,
    counts: countsOf(snapshot),
    dashboard: snapshot?.dashboard ?? null,
  };
}

export function adminIlias() {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT users.id, users.account, users.name,
              i.source AS ilias_source, i.account AS ilias_account, i.updated_at AS ilias_updated_at,
              s.payload AS snapshot, s.fetched_at AS snapshot_fetched_at
         FROM users
         LEFT JOIN user_ilias i ON i.user_id = users.id
         LEFT JOIN user_ilias_snapshot s ON s.user_id = users.id
        WHERE i.user_id IS NOT NULL OR s.user_id IS NOT NULL
        ORDER BY COALESCE(s.fetched_at, i.updated_at) DESC, users.account`,
    )
    .all();
  const active = new Map(listUserIliasSessions().map((entry) => [entry.userId, entry.session]));
  const totals = { memberships: 0, courses: 0, groups: 0, news: 0, mails: 0, unreadMails: 0, tasks: 0 };
  const sources = new Map();
  const users = rows.map((row) => {
    let dashboard = null;
    try {
      dashboard = row.snapshot ? JSON.parse(row.snapshot) : null;
    } catch {
      dashboard = null;
    }
    const snapshot = dashboard ? { dashboard } : null;
    const counts = countsOf(snapshot);
    addCounts(totals, counts);
    const source = row.ilias_source ?? null;
    if (source) sources.set(source, (sources.get(source) ?? 0) + 1);
    return {
      id: row.id,
      account: row.account,
      iliasAccount: row.ilias_account ?? dashboard?.account ?? null,
      source,
      active: active.has(row.id),
      canRead: publicIliasStatus(row.id).sessionActive,
      updatedAt: row.ilias_updated_at ?? null,
      fetchedAt: row.snapshot_fetched_at ?? null,
      counts,
      memberships: dashboard?.memberships?.slice(0, 12) ?? [],
      name: dashboard?.name ?? row.name ?? null,
    };
  });
  return {
    configured: publicIliasStatus().configured,
    activeSessions: active.size,
    totals,
    sources: [...sources.entries()].map(([source, count]) => ({ source, count })),
    users,
  };
}

/** Live-read one course, group, or folder page for an operator. */
export function readAdminUserIliasContent(userId, input, fetchImpl = fetch) {
  return readIliasContent(userId, input, fetchImpl);
}

/** Live-read the members tab of one course or group for an operator. */
export function readAdminUserIliasMembers(userId, input, fetchImpl = fetch) {
  return readIliasMembers(userId, input, fetchImpl);
}

/** Live-download one material file for an operator. */
export function readAdminUserIliasFile(userId, input, fetchImpl = fetch) {
  return readIliasFile(userId, input, fetchImpl);
}

/** Explicit operator action: forget the in-memory cookie and downgrade the link. */
export function disconnectAdminIlias(userId) {
  const account = getUser(userId)?.account ?? null;
  disconnectIlias(userId);
  recordAdminAudit({ action: 'ilias.disconnect', userId, account });
  return adminUserIlias(userId);
}
