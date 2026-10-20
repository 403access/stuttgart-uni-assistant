/** Account, session, platform, campus, and portal mutations. */

import { randomBytes } from 'node:crypto';

import { getUser, linkPlatform, normalizeAccount, revokeAllSessions, SIGN_IN_MODES, touchPlatform, unlinkPlatform } from '../auth.mjs';
import { clearUserCampusCredential } from '../campus.mjs';
import { clearCampusSource, clearExportedEvents, getDb, LEGACY_USER, saveCampusSource } from '../db.mjs';
import { recordAdminAudit } from './audit.mjs';
import { userCounts } from './overview.mjs';
import { adminUserDetail } from './users.mjs';
import { adminError, positiveInt } from './util.mjs';

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
