/** The accounts and profile routes: session, links, and platform sync. */

import {
  approveDeviceLink,
  authenticateRequest,
  createDeviceLink,
  createUserSession,
  getUserPreferences,
  linkPlatform,
  listUserDevices,
  pollDeviceLink,
  readBearer,
  requireAuth,
  revokeDeviceLink,
  revokeSession,
  saveUserPreferences,
  touchPlatform,
  unlinkPlatform,
} from '../auth.mjs';
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
    send(response, 200, { user: auth.user, session: { expiresAt: auth.expiresAt }, preferences: getUserPreferences(auth.user.id) });
    return true;
  }
  if (request.method === 'GET' && url.pathname === '/v1/auth/preferences') {
    try {
      const auth = requireAuth(request);
      send(response, 200, { preferences: getUserPreferences(auth.user.id) });
    } catch (error) {
      send(response, Number(error.status) || 400, { error: error.message || 'auth_failed' });
    }
    return true;
  }
  if (request.method === 'POST' && url.pathname === '/v1/auth/preferences') {
    const parsed = await readJsonBody(request, response);
    if (!parsed) return true;
    try {
      const auth = requireAuth(request);
      send(response, 200, { preferences: saveUserPreferences(auth.user.id, parsed.body) });
    } catch (error) {
      send(response, Number(error.status) || 400, { error: error.message || 'auth_failed' });
    }
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
  if (request.method === 'POST' && url.pathname === '/v1/auth/devices/start') {
    const parsed = await readJsonBody(request, response);
    if (!parsed) return true;
    try {
      // No session: the browser is not signed in yet. The returned token is the
      // only secret in the QR code and is valid for a single pairing.
      const link = createDeviceLink({
        name: parsed.body.name,
        userAgent: request.headers['user-agent'],
      });
      send(response, 200, { link });
    } catch (error) {
      send(response, Number(error.status) || 400, { error: error.message || 'device_link_failed' });
    }
    return true;
  }
  if (request.method === 'POST' && url.pathname === '/v1/auth/devices/poll') {
    const parsed = await readJsonBody(request, response);
    if (!parsed) return true;
    try {
      send(response, 200, pollDeviceLink(parsed.body.token));
    } catch (error) {
      send(response, Number(error.status) || 400, { error: error.message || 'device_link_failed' });
    }
    return true;
  }
  if (request.method === 'POST' && url.pathname === '/v1/auth/devices/approve') {
    const parsed = await readJsonBody(request, response);
    if (!parsed) return true;
    try {
      const auth = requireAuth(request);
      const device = approveDeviceLink(auth.user.id, parsed.body.token, { name: parsed.body.name });
      // The phone knows whether onboarding was completed and which appearance
      // the user picked; store it now so the browser can skip onboarding.
      if (parsed.body.preferences && typeof parsed.body.preferences === 'object') {
        saveUserPreferences(auth.user.id, parsed.body.preferences);
      }
      send(response, 200, { device });
    } catch (error) {
      send(response, Number(error.status) || 400, { error: error.message || 'device_link_failed' });
    }
    return true;
  }
  if (request.method === 'GET' && url.pathname === '/v1/auth/devices') {
    try {
      const auth = requireAuth(request);
      send(response, 200, { devices: listUserDevices(auth.user.id) });
    } catch (error) {
      send(response, Number(error.status) || 400, { error: error.message || 'device_link_failed' });
    }
    return true;
  }
  if (request.method === 'DELETE' && url.pathname.startsWith('/v1/auth/devices/')) {
    let deviceId = url.pathname.slice('/v1/auth/devices/'.length);
    try {
      deviceId = decodeURIComponent(deviceId);
    } catch {
      send(response, 400, { error: 'bad_device_id' });
      return true;
    }
    try {
      const auth = requireAuth(request);
      if (!revokeDeviceLink(auth.user.id, deviceId)) {
        send(response, 404, { error: 'unknown_device' });
        return true;
      }
      send(response, 200, { ok: true });
    } catch (error) {
      send(response, Number(error.status) || 400, { error: error.message || 'device_link_failed' });
    }
    return true;
  }
  return false;
}
