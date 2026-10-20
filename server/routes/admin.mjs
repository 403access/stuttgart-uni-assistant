/**
 * The `/admin` page and the `/v1/admin/*` routes behind it.
 *
 * Every function here reads across accounts, so the whole group sits behind
 * DASHBOARD_TOKEN and the cookie the login route mints.
 */

import { readFileSync } from 'node:fs';

import { adminAuthorized, adminConfigured, adminCookie, adminStats, adminTokenMatches, adminUserDetail, clearAdminCookie, clearAdminPortalData, deleteAdminUser, disconnectAdminCampus, linkAdminPlatform, listUsers, revokeAdminSession, revokeAdminSessions, unlinkAdminPlatform, updateAdminUser } from '../admin.mjs';
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

export async function handleAdmin(request, response, url) {
  if (request.method === 'GET' && (url.pathname === '/admin' || url.pathname === '/admin/')) {
    // Read per request: a dashboard edit does not need a server restart.
    sendHtml(response, readFileSync(new URL('../dashboard.html', import.meta.url), 'utf8'));
    return true;
  }
  if (request.method === 'POST' && url.pathname === '/v1/admin/login') {
    const parsed = await readJsonBody(request, response);
    if (!parsed) return true;
    const body = parsed.body;
    if (!adminConfigured()) {
      send(response, 503, { error: 'admin_unconfigured' });
      return true;
    }
    if (!adminTokenMatches(body?.token)) {
      send(response, 401, { error: 'unauthorized' });
      return true;
    }
    send(response, 200, { ok: true }, { 'Set-Cookie': adminCookie(String(body.token), isSecureRequest(request)) });
    return true;
  }
  if (request.method === 'POST' && url.pathname === '/v1/admin/logout') {
    send(response, 200, { ok: true }, { 'Set-Cookie': clearAdminCookie() });
    return true;
  }
  if (!url.pathname.startsWith('/v1/admin/')) return false;
  if (!adminGate(request, response)) return true;
  if (request.method === 'GET' && url.pathname === '/v1/admin/overview') {
    send(response, 200, adminStats());
    return true;
  }
  if (request.method === 'GET' && url.pathname === '/v1/admin/users') {
    send(response, 200, listUsers({
      query: url.searchParams.get('query') || '',
      mode: url.searchParams.get('mode') || '',
      platform: url.searchParams.get('platform') || '',
      credential: url.searchParams.get('credential') || '',
      limit: url.searchParams.get('limit') || 50,
      offset: url.searchParams.get('offset') || 0,
    }));
    return true;
  }
  const match = url.pathname.match(/^\/v1\/admin\/users\/([^/]+)(?:\/(.+))?$/);
  if (match) {
    let userId;
    try {
      userId = adminUserId(decodeURIComponent(match[1]));
    } catch {
      userId = null;
    }
    if (!userId) {
      send(response, 400, { error: 'bad_user_id' });
      return true;
    }
    const action = match[2] ?? '';
    const existing = getUser(userId);
    if (!existing) {
      send(response, 404, { error: 'unknown_user' });
      return true;
    }
    if (request.method === 'GET' && action === '') {
      send(response, 200, adminUserDetail(userId));
      return true;
    }
    if (request.method === 'POST' && action === '') {
      const parsed = await readJsonBody(request, response);
      if (!parsed) return true;
      const body = parsed.body;
      updateAdminUser(userId, body);
      send(response, 200, adminUserDetail(userId));
      return true;
    }
    if (request.method === 'DELETE' && action === '') {
      deleteAdminUser(userId);
      send(response, 200, { ok: true });
      return true;
    }
    if (request.method === 'POST' && action === 'sessions/revoke') {
      send(response, 200, revokeAdminSessions(userId));
      return true;
    }
    if (request.method === 'DELETE' && action.startsWith('sessions/')) {
      const sessionId = decodeURIComponent(action.slice('sessions/'.length));
      if (!revokeAdminSession(userId, sessionId)) {
        send(response, 404, { error: 'unknown_session' });
        return true;
      }
      send(response, 200, adminUserDetail(userId));
      return true;
    }
    if (request.method === 'POST' && action === 'platforms') {
      const parsed = await readJsonBody(request, response);
      if (!parsed) return true;
      const body = parsed.body;
      try {
        send(response, 200, linkAdminPlatform(userId, body));
      } catch (error) {
        send(response, Number(error.status) || 400, { error: error.message || 'admin_failed' });
      }
      return true;
    }
    if (request.method === 'DELETE' && action.startsWith('platforms/')) {
      const platform = decodeURIComponent(action.slice('platforms/'.length));
      try {
        send(response, 200, unlinkAdminPlatform(userId, platform));
      } catch (error) {
        send(response, Number(error.status) || 400, { error: error.message || 'admin_failed' });
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
      const body = parsed.body;
      send(response, 200, clearAdminPortalData(userId, body?.studyId));
      return true;
    }
  }
  send(response, 404, { error: 'not_found' });
  return true;
}
