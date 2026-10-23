/**
 * ILIAS routes: connect with a password or an existing PHPSESSID, ingest the
 * pages the app harvested, serve the cache, and disconnect. The server keeps
 * the cookie in memory and hands it to the authenticated client, which does
 * the page reads; the server stores the parsed rows and the raw HTML.
 */

import { authenticateRequest, linkPlatform, requireAuth, touchPlatform } from '../auth.mjs';
import {
  ILIAS_PAGE_MAX_BYTES,
  cachedIliasContent,
  cachedIliasDashboard,
  cachedIliasMembers,
  clearUserIliasSession,
  connectIlias,
  disconnectIlias,
  iliasCookieFor,
  iliasError,
  iliasLoginName,
  ingestIliasPage,
  publicIliasStatus,
  readIliasContent,
  readIliasDashboard,
  readIliasFile,
  readIliasMembers,
} from '../ilias.mjs';
import { attachmentDisposition, readJsonBody, send } from '../http.mjs';
import { errorBody, logRequest } from '../request-log.mjs';
import { logService } from '../service-log.mjs';

function fail(response, error) {
  send(response, Number(error?.status) || 500, errorBody(error));
}

export async function handleIlias(request, response, url) {
  if (request.method === 'GET' && url.pathname === '/v1/ilias/config') {
    const auth = authenticateRequest(request);
    send(response, 200, publicIliasStatus(auth?.user?.id));
    return true;
  }
  if (request.method === 'GET' && url.pathname === '/v1/ilias/session') {
    // The app seeds this cookie into its own WebView and does the page reads
    // there. The server keeps no copy in the response body beyond this call.
    try {
      const auth = requireAuth(request);
      send(response, 200, { ok: true, cookies: iliasCookieFor(auth.user.id) });
    } catch (error) {
      fail(response, error);
    }
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
      logService('ilias', 'info', `#${reqId} connect ok memberships=${result.dashboard.counts.memberships} source=${result.source} user=${auth.user.id}`, { userId: auth.user.id });
      send(response, 200, {
        ok: true,
        ...result.dashboard,
        cached: false,
        stale: false,
        // The client does the page reads; hand it the session it just created.
        cookies: iliasCookieFor(auth.user.id),
        status: publicIliasStatus(auth.user.id),
        user,
      });
    } catch (error) {
      logService('ilias', 'warn', `#${reqId} connect failed ${error?.message ?? 'ilias_failed'}`);
      fail(response, error);
    }
    return true;
  }
  if (request.method === 'POST' && url.pathname === '/v1/ilias/session/expired') {
    // The app harvested a login page: the cookie the server handed out is dead.
    // Drop only the in-memory session, so the source marker still lets the app
    // reconnect from the vault.
    try {
      const auth = requireAuth(request);
      clearUserIliasSession(auth.user.id);
      logService('ilias', 'info', `session expired user=${auth.user.id}`, { userId: auth.user.id });
      send(response, 200, { ok: true, status: publicIliasStatus(auth.user.id) });
    } catch (error) {
      fail(response, error);
    }
    return true;
  }
  if (request.method === 'DELETE' && url.pathname === '/v1/ilias/session') {
    try {
      const auth = requireAuth(request);
      disconnectIlias(auth.user.id);
      logService('ilias', 'info', `disconnect user=${auth.user.id}`, { userId: auth.user.id });
      send(response, 200, { ok: true, status: publicIliasStatus(auth.user.id) });
    } catch (error) {
      fail(response, error);
    }
    return true;
  }
  if (request.method === 'GET' && url.pathname === '/v1/ilias/content') {
    const reqId = logRequest('GET /v1/ilias/content');
    try {
      const auth = requireAuth(request);
      const refId = Number(url.searchParams.get('refId'));
      const kind = url.searchParams.get('kind') || 'crs';
      // Normal path: serve the page the app harvested earlier. `live=1` is the
      // browser fallback, which has no injectable WebView to read the page.
      const live = url.searchParams.get('live') === '1';
      const result = live
        ? { content: await readIliasContent(auth.user.id, { refId, kind }), cached: false, stale: false }
        : cachedIliasContent(auth.user.id, { refId, kind });
      const content = result.content;
      const user = touchPlatform(auth.user.id, 'ilias');
      logService('ilias', 'info', `#${reqId} content ${live ? 'live' : 'cache'} ref=${refId} kind=${kind} items=${content.items.length} stale=${result.stale} user=${auth.user.id}`, { userId: auth.user.id });
      send(response, 200, { ok: true, ...content, cached: result.cached, stale: Boolean(result.stale), user });
    } catch (error) {
      logService('ilias', 'warn', `#${reqId} content failed ${error?.message ?? 'ilias_failed'}`);
      fail(response, error);
    }
    return true;
  }
  if (request.method === 'GET' && url.pathname === '/v1/ilias/members') {
    const reqId = logRequest('GET /v1/ilias/members');
    try {
      const auth = requireAuth(request);
      const refId = Number(url.searchParams.get('refId'));
      const kind = url.searchParams.get('kind') || 'crs';
      const membersUrl = url.searchParams.get('url') || '';
      // Browser fallback: the client passes the members link it read from the
      // content page, because the object-specific `cmdNode` is not derivable.
      const live = url.searchParams.get('live') === '1';
      const result = live
        ? { members: await readIliasMembers(auth.user.id, { refId, kind, membersUrl }), cached: false, stale: false }
        : cachedIliasMembers(auth.user.id, { refId, kind });
      const members = result.members;
      const user = touchPlatform(auth.user.id, 'ilias');
      logService('ilias', 'info', `#${reqId} members ${live ? 'live' : 'cache'} ref=${refId} kind=${kind} members=${members.members.length} stale=${result.stale} user=${auth.user.id}`, { userId: auth.user.id });
      send(response, 200, { ok: true, ...members, cached: result.cached, stale: Boolean(result.stale), user });
    } catch (error) {
      logService('ilias', 'warn', `#${reqId} members failed ${error?.message ?? 'ilias_failed'}`);
      fail(response, error);
    }
    return true;
  }
  if (request.method === 'POST' && url.pathname === '/v1/ilias/ingest') {
    const reqId = logRequest('POST /v1/ilias/ingest');
    // HTML plus its JSON escaping; the page cap is checked again in the parser.
    const parsed = await readJsonBody(request, response, ILIAS_PAGE_MAX_BYTES + 500_000);
    if (!parsed) return true;
    try {
      const auth = requireAuth(request);
      const result = ingestIliasPage(auth.user.id, parsed.body ?? {});
      const user = touchPlatform(auth.user.id, 'ilias');
      if (result.page === 'dashboard') {
        logService('ilias', 'info', `#${reqId} ingest dashboard memberships=${result.dashboard.counts.memberships} user=${auth.user.id}`, { userId: auth.user.id });
        send(response, 200, {
          ok: true,
          ...result.dashboard,
          cached: false,
          stale: false,
          status: publicIliasStatus(auth.user.id),
          user,
        });
      } else if (result.page === 'content') {
        logService('ilias', 'info', `#${reqId} ingest content ref=${result.content.refId} items=${result.content.items.length} user=${auth.user.id}`, { userId: auth.user.id });
        send(response, 200, { ok: true, ...result.content, cached: false, stale: false, user });
      } else {
        logService('ilias', 'info', `#${reqId} ingest members ref=${result.members.refId} members=${result.members.members.length} user=${auth.user.id}`, { userId: auth.user.id });
        send(response, 200, { ok: true, ...result.members, cached: false, stale: false, user });
      }
    } catch (error) {
      logService('ilias', 'warn', `#${reqId} ingest failed ${error?.message ?? 'ilias_failed'}`);
      fail(response, error);
    }
    return true;
  }
  if (request.method === 'GET' && url.pathname === '/v1/ilias/file') {
    const reqId = logRequest('GET /v1/ilias/file');
    try {
      const auth = requireAuth(request);
      const refId = Number(url.searchParams.get('refId'));
      const file = await readIliasFile(auth.user.id, { refId });
      const filename = attachmentDisposition(file.filename);
      response.writeHead(200, {
        'Content-Type': file.contentType,
        'Content-Length': file.bytes.length,
        'Cache-Control': 'private, max-age=300',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Expose-Headers': 'Content-Disposition',
        ...(filename ? { 'Content-Disposition': filename } : {}),
      });
      response.end(file.bytes);
      logService('ilias', 'info', `#${reqId} file ok ref=${refId} bytes=${file.bytes.length} user=${auth.user.id}`, { userId: auth.user.id });
    } catch (error) {
      logService('ilias', 'warn', `#${reqId} file failed ${error?.message ?? 'ilias_failed'}`);
      fail(response, error);
    }
    return true;
  }
  if (request.method === 'GET' && url.pathname === '/v1/ilias/dashboard') {
    const reqId = logRequest('GET /v1/ilias/dashboard');
    try {
      const auth = requireAuth(request);
      // Stored snapshot by default; the client keeps it fresh from its WebView.
      // `live=1` exists for the web build, which cannot inject page scripts.
      const live = url.searchParams.get('live') === '1';
      const result = live ? await readIliasDashboard(auth.user.id) : cachedIliasDashboard(auth.user.id);
      const dashboard = result.dashboard;
      const user = touchPlatform(auth.user.id, 'ilias');
      logService('ilias', 'info', `#${reqId} dashboard ${live ? 'live' : 'cache'} memberships=${dashboard.counts.memberships} stale=${Boolean(result.stale)} user=${auth.user.id}`, { userId: auth.user.id });
      send(response, 200, {
        ok: true,
        ...dashboard,
        cached: result.cached ?? false,
        stale: Boolean(result.stale),
        status: publicIliasStatus(auth.user.id),
        user,
      });
    } catch (error) {
      logService('ilias', 'warn', `#${reqId} dashboard failed ${error?.message ?? 'ilias_failed'}`);
      fail(response, error);
    }
    return true;
  }
  return false;
}
