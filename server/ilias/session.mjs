import { clearIliasSource, getDb, loadIliasSource, saveIliasSnapshot, saveIliasSource } from '../db.mjs';
import { ILIAS_BASE } from './constants.mjs';
import { normalizeIliasCookie } from './cookies.mjs';
import { iliasError } from './errors.mjs';
import { loginIlias } from './login.mjs';
import {
  fetchIliasContent,
  fetchIliasDashboard,
  fetchIliasFile,
  fetchIliasImageBytes,
  fetchIliasMembers,
  fetchIliasProfile,
} from './reads.mjs';
import { iliasLoginName } from './util.mjs';

/** Per-user cookies. Memory only: a server restart asks the user to reconnect. */
const userSessions = new Map();

/** The session cookie the app seeds into its WebView before harvesting pages. */
export function iliasCookieFor(userId) {
  return resolveIliasSession(userId).cookie;
}

/* ------------------------------------------------------ session registry -- */

export function setUserIliasSession(userId, session) {
  if (!userId || !session?.cookie) return;
  userSessions.set(userId, {
    cookie: normalizeIliasCookie(session.cookie),
    account: session.account ?? null,
    source: session.source === 'env' ? 'env' : 'browser',
    updatedAt: new Date().toISOString(),
  });
}

export function getUserIliasSession(userId) {
  return userId ? userSessions.get(userId) ?? null : null;
}

export function clearUserIliasSession(userId) {
  if (userId) userSessions.delete(userId);
}

export function listUserIliasSessions() {
  return [...userSessions.entries()].map(([userId, session]) => ({ userId, session }));
}

function envIliasSession() {
  const cookie = (process.env.ILIAS_SESSION_COOKIE || process.env.ILIAS_COOKIE || '').trim();
  if (!cookie) return null;
  return {
    cookie: normalizeIliasCookie(cookie),
    account: (process.env.ILIAS_ACCOUNT || '').trim() || null,
    source: 'env',
    updatedAt: null,
  };
}

/**
 * The session for one user: their in-memory login, or the operator `.env`
 * session only when that user was connected with it, or a clear 409.
 */
export function resolveIliasSession(userId) {
  if (userId) {
    const own = userSessions.get(userId);
    if (own) return own;
    const source = loadIliasSource(userId);
    if (source?.source === 'env') {
      const env = envIliasSession();
      if (env) return { ...env, account: source.account ?? env.account };
    }
    throw iliasError(409, 'ilias_credentials_missing');
  }
  const env = envIliasSession();
  if (!env) throw iliasError(503, 'ilias_not_configured');
  return env;
}

export function publicIliasStatus(userId) {
  const env = envIliasSession();
  const own = userId ? userSessions.get(userId) : null;
  const source = userId ? loadIliasSource(userId) : null;
  return {
    baseUrl: ILIAS_BASE,
    configured: Boolean(env),
    sessionActive: Boolean(own || (source?.source === 'env' && env)),
    account: own?.account ?? source?.account ?? null,
    source: own?.source ?? source?.source ?? null,
    updatedAt: own?.updatedAt ?? source?.updatedAt ?? null,
  };
}

/** Sign in once and register the cookie for this account. The password is dropped here. */
export async function connectIlias(userId, input = {}, fetchImpl = fetch) {
  if (input.env) {
    const env = envIliasSession();
    if (!env) throw iliasError(503, 'ilias_not_configured');
    const dashboard = await fetchIliasDashboard({ cookie: env.cookie, fetchImpl });
    const account = iliasLoginName(input.account) || env.account || dashboard.account;
    setUserIliasSession(userId, { cookie: env.cookie, account, source: 'env' });
    saveIliasSource(userId, 'env', account);
    saveIliasSnapshot(userId, dashboard);
    return { dashboard, source: 'env' };
  }
  const providedCookie = normalizeIliasCookie(input.cookie);
  if (providedCookie) {
    const dashboard = await fetchIliasDashboard({ cookie: providedCookie, fetchImpl });
    const account = iliasLoginName(input.account) || dashboard.account;
    setUserIliasSession(userId, { cookie: providedCookie, account, source: 'browser' });
    saveIliasSource(userId, 'browser', account);
    saveIliasSnapshot(userId, dashboard);
    return { dashboard, source: 'browser', account };
  }
  const result = await loginIlias({
    account: input.account,
    password: input.password,
    fetchImpl,
  });
  if (!result.ok) {
    throw iliasError(result.reason === 'rejected' ? 401 : 502, result.reason === 'rejected' ? 'ilias_login_rejected' : `ilias_${result.reason}`, result.rejection);
  }
  setUserIliasSession(userId, { cookie: result.cookie, account: result.account, source: 'browser' });
  saveIliasSource(userId, 'browser', result.account);
  saveIliasSnapshot(userId, result.dashboard);
  return { dashboard: result.dashboard, source: 'browser' };
}

/** Stream a profile image with the user's session. */
export async function fetchIliasImage(userId, imageUrl, fetchImpl = fetch) {
  const session = resolveIliasSession(userId);
  try {
    return await fetchIliasImageBytes({ cookie: session.cookie, imageUrl, fetchImpl });
  } catch (error) {
    if (error?.status === 401) clearUserIliasSession(userId);
    throw error;
  }
}

/** Read the members tab (course or group) with the user's session. */
export async function readIliasMembers(userId, input = {}, fetchImpl = fetch) {  const session = resolveIliasSession(userId);
  try {
    return await fetchIliasMembers({
      cookie: session.cookie,
      refId: input.refId,
      kind: input.kind,
      fetchImpl,
      membersUrl: input.membersUrl,
    });
  } catch (error) {
    if (error?.status === 401) clearUserIliasSession(userId);
    throw error;
  }
}

/** Read one public profile with the user's session. */
export async function readIliasProfile(userId, input = {}, fetchImpl = fetch) {
  const session = resolveIliasSession(userId);
  try {
    return await fetchIliasProfile({
      cookie: session.cookie,
      userId: input.profileUserId,
      profileUrl: input.profileUrl,
      fetchImpl,
    });
  } catch (error) {
    if (error?.status === 401) clearUserIliasSession(userId);
    throw error;
  }
}

/** Read one repository page (course, group, folder) with the user's session. */
export async function readIliasContent(userId, input = {}, fetchImpl = fetch) {
  const session = resolveIliasSession(userId);
  try {
    return await fetchIliasContent({
      cookie: session.cookie,
      refId: input.refId,
      kind: input.kind,
      fetchImpl,
      contentUrl: input.contentUrl,
    });
  } catch (error) {
    if (error?.status === 401) clearUserIliasSession(userId);
    throw error;
  }
}

/** Download one file with the user's session. */
export async function readIliasFile(userId, input = {}, fetchImpl = fetch) {
  const session = resolveIliasSession(userId);
  try {
    return await fetchIliasFile({
      cookie: session.cookie,
      refId: input.refId,
      fetchImpl,
      fileUrl: input.fileUrl,
    });
  } catch (error) {
    if (error?.status === 401) clearUserIliasSession(userId);
    throw error;
  }
}

/** Read the live dashboard and refresh the stored snapshot. */
export async function readIliasDashboard(userId, fetchImpl = fetch) {
  const session = resolveIliasSession(userId);
  let dashboard;
  try {
    dashboard = await fetchIliasDashboard({ cookie: session.cookie, fetchImpl });
  } catch (error) {
    if (error?.status === 401) clearUserIliasSession(userId);
    throw error;
  }
  saveIliasSnapshot(userId, dashboard);
  if (session.account) setUserIliasSession(userId, { ...session, account: session.account });
  return { dashboard, source: session.source, account: session.account };
}

export function disconnectIlias(userId) {
  clearUserIliasSession(userId);
  clearIliasSource(userId);
  if (userId) {
    getDb()
      .prepare("UPDATE user_platforms SET status = 'linked', last_sync_at = NULL WHERE user_id = ? AND platform = 'ilias'")
      .run(userId);
  }
}
