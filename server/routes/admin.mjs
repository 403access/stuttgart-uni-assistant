/**
 * The `/admin` page and the `/v1/admin/*` routes behind it.
 *
 * Every function here reads across accounts, so the whole group sits behind
 * DASHBOARD_TOKEN and the cookie the login route mints. Mutations are audited
 * by `server/admin.mjs`.
 */

import { readFileSync } from 'node:fs';

import {
  adminAuthorized,
  adminConfigured,
  adminCookie,
  adminStats,
  adminSystem,
  adminTokenMatches,
  adminUserCalls,
  adminUserCourses,
  adminUserDetail,
  adminUserEvents,
  adminUserNodes,
  adminUserStudies,
  cancelAdminSyncJob,
  clearAdminCookie,
  clearAdminCalls,
  clearAdminEvents,
  clearAdminPortalData,
  createAdminUser,
  deleteAdminUser,
  disconnectAdminCampus,
  disconnectAdminMail,
  linkAdminPlatform,
  listAdminAudit,
  listUsers,
  recordAdminAudit,
  revokeAdminSession,
  revokeAdminSessions,
  startAdminSyncJob,
  touchAdminPlatform,
  unlinkAdminPlatform,
  updateAdminUser,
} from '../admin.mjs';
import { getUser } from '../auth.mjs';
import { isSecureRequest, readJsonBody, send, sendHtml } from '../http.mjs';

function adminUserId(value) {
  return typeof value === 'string' && /^usr_[A-Za-z0-9_-]{4,100}$/.test(value) ? value : null;
}

function adminGate(request, response) {
  if (!adminConfigured()) {
    send(response, 503, { error: 'admin_unconfigured' });
    return false;
  }
  if (!adminAuthorized(request)) {
    send(response, 401, { error: 'unauthorized' });
    return false;
  }
  return true;
}

function fail(response, error) {
  const status = Number(error?.status) || 400;
  send(response, status, { error: error?.message || 'admin_failed' });
}

function decode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

function query(page) {
  return {
    query: page.searchParams.get('query') || '',
    studyId: page.searchParams.get('studyId') || '',
    state: page.searchParams.get('state') || '',
    failed: page.searchParams.get('failed') || '',
    limit: page.searchParams.get('limit') || 50,
    offset: page.searchParams.get('offset') || 0,
  };
}

export async function handleAdmin(request, response, url) {
  if (request.method === 'GET' && (url.pathname === '/admin' || url.pathname === '/admin/')) {
    // Read per request: a dashboard edit does not need a server restart.
    sendHtml(response, readFileSync(new URL('../dashboard.html', import.meta.url), 'utf8'));
    return true;
  }
  if (request.method === 'POST' && url.pathname === '/v1/admin/login') {
    const parsed = await readJsonBody(request, response);
    if (!parsed) return true;
    if (!adminConfigured()) {
      send(response, 503, { error: 'admin_unconfigured' });
      return true;
    }
    if (!adminTokenMatches(parsed.body?.token)) {
      send(response, 401, { error: 'unauthorized' });
      return true;
    }
    recordAdminAudit({ action: 'admin.login' });
    send(response, 200, { ok: true }, { 'Set-Cookie': adminCookie(String(parsed.body.token), isSecureRequest(request)) });
    return true;
  }
  if (request.method === 'POST' && url.pathname === '/v1/admin/logout') {
    recordAdminAudit({ action: 'admin.logout' });
    send(response, 200, { ok: true }, { 'Set-Cookie': clearAdminCookie() });
    return true;
  }
  if (!url.pathname.startsWith('/v1/admin/')) return false;
  if (!adminGate(request, response)) return true;

  if (request.method === 'GET' && url.pathname === '/v1/admin/overview') {
    send(response, 200, adminStats());
    return true;
  }
  if (request.method === 'POST' && url.pathname === '/v1/admin/users') {
    const parsed = await readJsonBody(request, response);
    if (!parsed) return true;
    try {
      const user = createAdminUser(parsed.body);
      send(response, 200, adminUserDetail(user.id));
    } catch (error) {
      fail(response, error);
    }
    return true;
  }
  if (request.method === 'GET' && url.pathname === '/v1/admin/users') {
    send(response, 200, listUsers({
      query: url.searchParams.get('query') || '',
      mode: url.searchParams.get('mode') || '',
      platform: url.searchParams.get('platform') || '',
      credential: url.searchParams.get('credential') || '',
      activity: url.searchParams.get('activity') || '',
      data: url.searchParams.get('data') || '',
      sort: url.searchParams.get('sort') || 'recent',
      limit: url.searchParams.get('limit') || 50,
      offset: url.searchParams.get('offset') || 0,
    }));
    return true;
  }
  if (request.method === 'GET' && url.pathname === '/v1/admin/audit') {
    send(response, 200, listAdminAudit({
      query: url.searchParams.get('query') || '',
      action: url.searchParams.get('action') || '',
      userId: url.searchParams.get('userId') || '',
      limit: url.searchParams.get('limit') || 50,
      offset: url.searchParams.get('offset') || 0,
    }));
    return true;
  }
  if (request.method === 'GET' && url.pathname === '/v1/admin/system') {
    send(response, 200, adminSystem());
    return true;
  }
  if (request.method === 'GET' && url.pathname === '/v1/admin/sync-jobs') {
    send(response, 200, { jobs: adminSystem().syncJobs });
    return true;
  }
  if (request.method === 'POST' && url.pathname === '/v1/admin/system/mail/logout') {
    send(response, 200, { ok: true, mail: disconnectAdminMail() });
    return true;
  }
  if (request.method === 'DELETE' && url.pathname.startsWith('/v1/admin/sync-jobs/')) {
    const jobId = decode(url.pathname.slice('/v1/admin/sync-jobs/'.length));
    const cancelled = jobId ? cancelAdminSyncJob(jobId) : null;
    if (!cancelled) {
      send(response, 404, { error: 'unknown_job' });
      return true;
    }
    send(response, 200, cancelled);
    return true;
  }

  const match = url.pathname.match(/^\/v1\/admin\/users\/([^/]+)(?:\/(.*))?$/);
  if (!match) {
    send(response, 404, { error: 'not_found' });
    return true;
  }
  const userId = decode(match[1]);
  if (!adminUserId(userId)) {
    send(response, 400, { error: 'bad_user_id' });
    return true;
  }
  const action = match[2] ? decode(match[2]) : '';
  if (action === null) {
    send(response, 400, { error: 'bad_action' });
    return true;
  }
  if (!getUser(userId)) {
    send(response, 404, { error: 'unknown_user' });
    return true;
  }
  const params = query(url);

  if (request.method === 'GET' && action === '') {
    send(response, 200, adminUserDetail(userId));
    return true;
  }
  if (request.method === 'POST' && action === '') {
    const parsed = await readJsonBody(request, response);
    if (!parsed) return true;
    try {
      updateAdminUser(userId, parsed.body);
      send(response, 200, adminUserDetail(userId));
    } catch (error) {
      fail(response, error);
    }
    return true;
  }
  if (request.method === 'DELETE' && action === '') {
    deleteAdminUser(userId);
    send(response, 200, { ok: true });
    return true;
  }
  if (request.method === 'GET' && action === 'studies') {
    send(response, 200, adminUserStudies(userId));
    return true;
  }
  if (request.method === 'GET' && action === 'courses') {
    send(response, 200, adminUserCourses(userId, params));
    return true;
  }
  if (request.method === 'GET' && action === 'nodes') {
    send(response, 200, adminUserNodes(userId, params));
    return true;
  }
  if (request.method === 'GET' && action === 'events') {
    send(response, 200, adminUserEvents(userId, params));
    return true;
  }
  if (request.method === 'GET' && action === 'calls') {
    send(response, 200, adminUserCalls(userId, params));
    return true;
  }
  if (request.method === 'POST' && action === 'sessions/revoke') {
    send(response, 200, revokeAdminSessions(userId));
    return true;
  }
  if (request.method === 'DELETE' && action.startsWith('sessions/')) {
    const sessionId = decode(action.slice('sessions/'.length));
    if (!sessionId || !revokeAdminSession(userId, sessionId)) {
      send(response, 404, { error: 'unknown_session' });
      return true;
    }
    send(response, 200, adminUserDetail(userId));
    return true;
  }
  if (request.method === 'POST' && action === 'platforms') {
    const parsed = await readJsonBody(request, response);
    if (!parsed) return true;
    try {
      send(response, 200, linkAdminPlatform(userId, parsed.body));
    } catch (error) {
      fail(response, error);
    }
    return true;
  }
  const touch = action.match(/^platforms\/([^/]+)\/touch$/);
  if (request.method === 'POST' && touch) {
    const platform = decode(touch[1]);
    try {
      send(response, 200, touchAdminPlatform(userId, platform));
    } catch (error) {
      fail(response, error);
    }
    return true;
  }
  if (request.method === 'DELETE' && action.startsWith('platforms/') && !action.slice('platforms/'.length).includes('/')) {
    const platform = decode(action.slice('platforms/'.length));
    try {
      send(response, 200, unlinkAdminPlatform(userId, platform));
    } catch (error) {
      fail(response, error);
    }
    return true;
  }
  if (request.method === 'POST' && action === 'campus/disconnect') {
    send(response, 200, disconnectAdminCampus(userId));
    return true;
  }
  if (request.method === 'POST' && action === 'portal/clear') {
    const parsed = await readJsonBody(request, response);
    if (!parsed) return true;
    try {
      send(response, 200, clearAdminPortalData(userId, parsed.body?.studyId));
    } catch (error) {
      fail(response, error);
    }
    return true;
  }
  if (request.method === 'POST' && action === 'portal/events/clear') {
    send(response, 200, clearAdminEvents(userId));
    return true;
  }
  if (request.method === 'POST' && action === 'portal/calls/clear') {
    send(response, 200, clearAdminCalls(userId));
    return true;
  }
  if (request.method === 'POST' && action === 'sync') {
    const parsed = await readJsonBody(request, response);
    if (!parsed) return true;
    try {
      send(response, 200, await startAdminSyncJob(userId, parsed.body));
    } catch (error) {
      fail(response, error);
    }
    return true;
  }
  send(response, 404, { error: 'not_found' });
  return true;
}
