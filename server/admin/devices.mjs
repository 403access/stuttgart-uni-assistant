/** Browser device links created by the QR sign-in flow. */

import { getDb } from '../db.mjs';
import { recordAdminAudit } from './audit.mjs';
import { pageOffset, pageSize } from './util.mjs';

const STATE_ORDER = new Set(['pending', 'approved', 'active', 'linked', 'expired', 'revoked']);

function deviceState(row, session) {
  if (row.revoked_at) return 'revoked';
  const now = new Date().toISOString();
  if (!row.user_id) return row.expires_at <= now ? 'expired' : 'pending';
  if (session?.revoked_at) return 'revoked';
  if (session?.expires_at && session.expires_at <= now) return 'expired';
  if (session?.id) return 'active';
  if (!row.consumed_at) return row.expires_at <= now ? 'expired' : 'approved';
  return 'linked';
}

function deviceRow(row) {
  const session = row.session_id
    ? {
        id: row.session_id,
        expiresAt: row.session_expires_at ?? null,
        revokedAt: row.session_revoked_at ?? null,
        lastSeenAt: row.session_last_seen_at ?? null,
      }
    : null;
  return {
    id: row.id,
    userId: row.user_id ?? null,
    account: row.account ?? null,
    userName: row.user_name ?? null,
    name: row.name || 'Unbekanntes Gerät',
    kind: row.kind || 'web',
    userAgent: row.user_agent || '',
    state: deviceState(row, session),
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    approvedAt: row.approved_at ?? null,
    consumedAt: row.consumed_at ?? null,
    revokedAt: row.revoked_at ?? null,
    lastSeenAt: row.last_seen_at ?? null,
    session,
  };
}

const BASE_QUERY = `SELECT d.*, u.account, u.name AS user_name,
    s.expires_at AS session_expires_at, s.revoked_at AS session_revoked_at,
    s.last_seen_at AS session_last_seen_at
  FROM device_links d
  LEFT JOIN users u ON u.id = d.user_id
  LEFT JOIN user_sessions s ON s.id = d.session_id`;

function matchingDevices({ query = '', state = '' } = {}) {
  const text = String(query ?? '').trim().toLowerCase();
  const wanted = STATE_ORDER.has(state) ? state : '';
  const rows = getDb().prepare(`${BASE_QUERY} ORDER BY COALESCE(d.approved_at, d.created_at) DESC LIMIT 2000`).all().map(deviceRow);
  return rows.filter((device) => {
    if (wanted && device.state !== wanted) return false;
    if (!text) return true;
    return [device.name, device.account, device.userName, device.userAgent, device.id]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(text));
  });
}

/** One page of browser links, newest pairing first. */
export function listAdminDevices({ query = '', state = '', limit = 50, offset = 0 } = {}) {
  const capped = pageSize(limit, 50);
  const skip = pageOffset(offset);
  const devices = matchingDevices({ query, state });
  return {
    devices: devices.slice(skip, skip + capped),
    total: devices.length,
    limit: capped,
    offset: skip,
    state: STATE_ORDER.has(state) ? state : '',
  };
}

/** Counts for the overview and the device page header. */
export function adminDeviceStats() {
  const devices = matchingDevices();
  const count = (state) => devices.filter((device) => device.state === state).length;
  return {
    devices: devices.length,
    devicesPending: count('pending'),
    devicesApproved: count('approved'),
    devicesActive: count('active') + count('linked'),
    devicesExpired: count('expired'),
    devicesRevoked: count('revoked'),
  };
}

/** Revoke a browser link, its minted session, and keep an audit row. */
export function revokeAdminDevice(deviceId) {
  if (typeof deviceId !== 'string' || !/^dev_[A-Za-z0-9_-]{4,100}$/.test(deviceId)) return null;
  const db = getDb();
  const row = db
    .prepare(`${BASE_QUERY} WHERE d.id = ?`)
    .get(deviceId);
  if (!row) return null;
  const now = new Date().toISOString();
  if (row.session_id) {
    db.prepare('UPDATE user_sessions SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL').run(now, row.session_id);
  }
  db.prepare('UPDATE device_links SET revoked_at = COALESCE(revoked_at, ?) WHERE id = ?').run(now, deviceId);
  recordAdminAudit({
    action: 'device.revoke',
    userId: row.user_id ?? null,
    account: row.account ?? null,
    detail: { deviceId, name: row.name || null, userAgent: row.user_agent || null },
  });
  return { ok: true, userId: row.user_id ?? null, account: row.account ?? null };
}
