/** The append-only operator audit log. */

import { getDb } from '../db.mjs';
import { pageOffset, pageSize } from './util.mjs';

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
