/**
 * ILIAS routes: connect with a password or an existing PHPSESSID, read the
 * dashboard, and disconnect. The cookie stays in server memory; only the
 * parsed content is stored.
 */

import { authenticateRequest, linkPlatform, requireAuth, touchPlatform } from '../auth.mjs';
import { connectIlias, disconnectIlias, iliasError, iliasLoginName, publicIliasStatus, readIliasDashboard } from '../ilias.mjs';
import { readJsonBody, send } from '../http.mjs';
import { errorBody, logRequest } from '../request-log.mjs';

function fail(response, error) {
  send(response, Number(error?.status) || 500, errorBody(error));
}

export async function handleIlias(request, response, url) {
  if (request.method === 'GET' && url.pathname === '/v1/ilias/config') {
    const auth = authenticateRequest(request);
    send(response, 200, publicIliasStatus(auth?.user?.id));
    return true;
  }
  if (request.method === 'POST' && url.pathname === '/v1/ilias/session') {
    const reqId = logRequest('POST /v1/ilias/session');
    const parsed = await readJsonBody(request, response);
    if (!parsed) return true;
    const body = parsed.body ?? {};
    try {
      const auth = requireAuth(request);
      // ILIAS and C@MPUS share the password. ILIAS expects the mail address
      // before the @, so a C@MPUS account or e-mail can prefill it.
      const account = iliasLoginName(body.account) || iliasLoginName(auth.user.email) || iliasLoginName(auth.user.account);
      // A cookie can be read directly; otherwise the server does the form login
      // once and keeps only the resulting PHPSESSID. `env` reuses the operator
      // session from `.env` for this account.
      if (!body.env && !String(body.cookie ?? '').trim() && (!account || !String(body.password ?? '').trim())) {
        throw iliasError(400, 'ilias_credentials_missing');
      }
      const result = await connectIlias(auth.user.id, {
        account,
        password: body.password,
        cookie: body.cookie,
        env: Boolean(body.env),
      });
      linkPlatform(auth.user.id, {
        platform: 'ilias',
        account: account || result.dashboard.account || null,
        status: 'connected',
        source: result.source,
      });
      const user = touchPlatform(auth.user.id, 'ilias');
      console.log(`[ilias #${reqId}] connect ok memberships=${result.dashboard.counts.memberships} source=${result.source} user=${auth.user.id}`);
      send(response, 200, {
        ok: true,
        ...result.dashboard,
        status: publicIliasStatus(auth.user.id),
        user,
      });
    } catch (error) {
      console.log(`[ilias #${reqId}] connect failed ${error?.message ?? 'ilias_failed'}`);
      fail(response, error);
    }
    return true;
  }
  if (request.method === 'DELETE' && url.pathname === '/v1/ilias/session') {
    try {
      const auth = requireAuth(request);
      disconnectIlias(auth.user.id);
      console.log(`[ilias] disconnect user=${auth.user.id}`);
      send(response, 200, { ok: true, status: publicIliasStatus(auth.user.id) });
    } catch (error) {
      fail(response, error);
    }
    return true;
  }
  if (request.method === 'GET' && url.pathname === '/v1/ilias/dashboard') {
    const reqId = logRequest('GET /v1/ilias/dashboard');
    try {
      const auth = requireAuth(request);
      const result = await readIliasDashboard(auth.user.id);
      const user = touchPlatform(auth.user.id, 'ilias');
      console.log(`[ilias #${reqId}] dashboard ok memberships=${result.dashboard.counts.memberships} user=${auth.user.id}`);
      send(response, 200, {
        ok: true,
        ...result.dashboard,
        status: publicIliasStatus(auth.user.id),
        user,
      });
    } catch (error) {
      console.log(`[ilias #${reqId}] dashboard failed ${error?.message ?? 'ilias_failed'}`);
      fail(response, error);
    }
    return true;
  }
  return false;
}
