/** Operator login and logout. */

import {
  adminConfigured,
  adminCookie,
  adminTokenMatches,
  clearAdminCookie,
  recordAdminAudit,
} from '../../admin/index.mjs';
import { isSecureRequest, readJsonBody, send } from '../../http.mjs';

export async function handleSession(request, response, url) {
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
  return false;
}
