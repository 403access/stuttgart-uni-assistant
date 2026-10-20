/** The accounts and profile routes: session, links, and platform sync. */

import { authenticateRequest, createUserSession, linkPlatform, readBearer, requireAuth, revokeSession, touchPlatform, unlinkPlatform } from '../auth.mjs';
import { clearUserCampusCredential } from '../campus.mjs';
import { readJsonBody, send } from '../http.mjs';

export async function handleAuth(request, response, url) {
  if (request.method === 'POST' && url.pathname === '/v1/auth/session') {
    const parsed = await readJsonBody(request, response);
    if (!parsed) return true;
    const body = parsed.body;
    const mode = body.mode === 'demo' ? 'demo' : body.mode === 'local' ? 'local' : '';
    if (!mode) {
      send(response, 400, { error: 'bad_mode' });
      return true;
    }
    try {
      // Demo and local profiles create a server-side user without a university
      // password. Campus and OIDC sessions are only minted by their own routes,
      // which have verified the identity first.
      const session = createUserSession({
        account: body.account,
        name: typeof body.name === 'string' ? body.name : null,
        email: typeof body.email === 'string' ? body.email : null,
        mode,
      });
      console.log(`[auth] session created mode=${mode} account=${session.user.account}`);
      send(response, 200, session);
    } catch (error) {
      send(response, Number(error.status) || 400, { error: error.message || 'auth_failed', detail: error.detail });
    }
    return true;
  }
  if (request.method === 'GET' && url.pathname === '/v1/auth/me') {
    const auth = authenticateRequest(request);
    if (!auth) {
      send(response, 401, { error: 'unauthorized' });
      return true;
    }
    send(response, 200, { user: auth.user, session: { expiresAt: auth.expiresAt } });
    return true;
  }
  if (request.method === 'POST' && url.pathname === '/v1/auth/logout') {
    const token = readBearer(request);
    const auth = authenticateRequest(request);
    // Sign-out revokes the app session and drops the in-memory portal
    // credential; the per-user data stays for the next sign-in.
    if (auth) clearUserCampusCredential(auth.user.id);
    if (token) revokeSession(token);
    send(response, 200, { ok: true });
    return true;
  }
  if (request.method === 'POST' && url.pathname === '/v1/auth/links') {
    const parsed = await readJsonBody(request, response);
    if (!parsed) return true;
    const body = parsed.body;
    try {
      const auth = requireAuth(request);
      const user = linkPlatform(auth.user.id, {
        platform: body.platform,
        account: body.account,
        status: body.status,
        source: body.source,
      });
      send(response, 200, { user });
    } catch (error) {
      send(response, Number(error.status) || 400, { error: error.message || 'auth_failed', detail: error.detail });
    }
    return true;
  }
  if (request.method === 'DELETE' && url.pathname.startsWith('/v1/auth/links/')) {
    const platform = url.pathname.slice('/v1/auth/links/'.length);
    try {
      const auth = requireAuth(request);
      const user = unlinkPlatform(auth.user.id, platform);
      send(response, 200, { user });
    } catch (error) {
      send(response, Number(error.status) || 400, { error: error.message || 'auth_failed', detail: error.detail });
    }
    return true;
  }
  if (request.method === 'POST' && url.pathname === '/v1/auth/sync') {
    const parsed = await readJsonBody(request, response);
    if (!parsed) return true;
    const body = parsed.body;
    try {
      const auth = requireAuth(request);
      const user = touchPlatform(auth.user.id, body.platform, body.at);
      send(response, 200, { user });
    } catch (error) {
      send(response, Number(error.status) || 400, { error: error.message || 'auth_failed', detail: error.detail });
    }
    return true;
  }
  return false;
}
