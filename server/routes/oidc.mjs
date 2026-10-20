/** SIAM / OIDC routes: start the browser login, exchange the code, end it. */

import { createUserSession, oidcPlatformLinks } from '../auth.mjs';
import { readJsonBody, send } from '../http.mjs';
import { endRemoteSession, exchangeCode, publicOidcStatus, startLogin } from '../oidc.mjs';

const OIDC_PATHS = new Set(['/v1/oidc/start', '/v1/oidc/exchange', '/v1/oidc/logout']);

export async function handleOidc(request, response, url) {
  if (request.method === 'GET' && url.pathname === '/v1/oidc/config') {
    send(response, 200, publicOidcStatus());
    return true;
  }
  if (!OIDC_PATHS.has(url.pathname)) return false;
  if (request.method !== 'POST') {
    send(response, 405, { error: 'method' });
    return true;
  }
  const parsed = await readJsonBody(request, response);
  if (!parsed) return true;
  const body = parsed.body;
  try {
    if (url.pathname === '/v1/oidc/start') {
      send(response, 200, await startLogin(String(body.redirectUri ?? '')));
      return true;
    }
    if (url.pathname === '/v1/oidc/exchange') {
      const exchanged = await exchangeCode({ code: body.code, state: body.state, redirectUri: String(body.redirectUri ?? '') });
      const session = createUserSession({
        account: exchanged.profile.account,
        name: exchanged.profile.name,
        email: exchanged.profile.email,
        subject: exchanged.profile.subject,
        mode: 'oidc',
        platforms: oidcPlatformLinks({ account: exchanged.profile.account }),
      });
      send(response, 200, { ...exchanged, user: session.user, token: session.token, expiresAt: session.expiresAt });
      return true;
    }
    send(response, 200, await endRemoteSession(body.sessionId));
  } catch (error) {
    const status = Number(error.status) || 500;
    send(response, status, { error: error.message || 'oidc_failed', detail: error.detail });
  }
  return true;
}
