import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';

import { exportCampusCalendar, clearUserCampusCredential, loadCampusStudies, loadCourseGroups, loadCurriculumCourses, loadCurriculumStructure, publicCampusStatus, readCampusLogin, resolveLoginCredential, setUserCampusCredential, startCampusTokenRefresh, storeCampusLogin, syncExportedCalendar, validateBrowserCredentials } from './campus.mjs';
import { forgetMailCredentials, loadMailBody, loadMailFolders, loadMailMessages, publicMailStatus, saveMailCredentials } from './mail.mjs';
import { getCoursesSync, loadCourses, loadCoursesFetchedIds, loadExportedEvents, loadStructure, readPortalCalls, saveCampusSource } from './db.mjs';
import { cancelSyncJobForUser, getSyncJobForUser, startSyncJob } from './sync.mjs';
import { apiCatalog } from './catalog.mjs';
import { endRemoteSession, exchangeCode, publicOidcStatus, startLogin, warnIfPasswordPresent } from './oidc.mjs';
import { authenticateRequest, campusPlatformLinks, createUserSession, getUser, linkPlatform, oidcPlatformLinks, readBearer, requireAuth, revokeSession, touchPlatform, unlinkPlatform } from './auth.mjs';
import { adminAuthorized, adminConfigured, adminCookie, adminStats, adminTokenMatches, adminUserDetail, clearAdminCookie, clearAdminPortalData, deleteAdminUser, disconnectAdminCampus, linkAdminPlatform, listUsers, revokeAdminSession, revokeAdminSessions, unlinkAdminPlatform, updateAdminUser } from './admin.mjs';
import { t } from './i18n/index.mjs';

loadEnv(new URL('../.env', import.meta.url));
warnIfPasswordPresent();

const port = Number(process.env.PORT || 8787);
const model = 'grok-4.7';

function loadEnv(url) {
  try {
    const text = readFileSync(url, 'utf8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const splitAt = trimmed.indexOf('=');
      if (splitAt < 1) continue;
      const key = trimmed.slice(0, splitAt).trim();
      const value = trimmed.slice(splitAt + 1).trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // A missing .env is fine when the variables are already in the environment.
  }
}

function outputText(payload) {
  if (typeof payload.output_text === 'string' && payload.output_text.trim()) return payload.output_text.trim();
  const parts = [];
  for (const item of payload.output ?? []) {
    if (item.type !== 'message') continue;
    for (const block of item.content ?? []) {
      if (block.type === 'output_text' && block.text) parts.push(block.text);
    }
  }
  return parts.join('\n').trim();
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > 200_000) {
        reject(new Error('body too large'));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {});
      } catch (error) {
        reject(error);
      }
    });
    request.on('error', reject);
  });
}

function send(response, status, body, headers = {}) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    ...headers,
  });
  response.end(JSON.stringify(body));
}

function sendHtml(response, html) {
  response.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'",
  });
  response.end(html);
}

function isSecureRequest(request) {
  return Boolean(request.socket?.encrypted) || String(request.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https';
}

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

function campusFailure(error) {
  const body = { error: error.message || 'campus_failed' };
  if (error.detail) body.detail = String(error.detail).slice(0, 300);
  if (typeof error.status === 'number') body.status = error.status;
  return body;
}

let campusReqSeq = 0;

function campusReq(route, extra) {
  const id = ++campusReqSeq;
  const stamp = new Date().toISOString();
  console.log(`[campus #${id} ${stamp}] ${route}${extra ? ` ${extra}` : ''}`);
  return id;
}

function previewBody(body) {
  try {
    return JSON.stringify(body ?? {}).slice(0, 200);
  } catch {
    return '?';
  }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', 'http://127.0.0.1');
  if (request.method === 'OPTIONS') {
    send(response, 204, {});
    return;
  }
  if (request.method === 'GET' && (url.pathname === '/admin' || url.pathname === '/admin/')) {
    // Read per request: a dashboard edit does not need a server restart.
    sendHtml(response, readFileSync(new URL('./dashboard.html', import.meta.url), 'utf8'));
    return;
  }
  if (request.method === 'POST' && url.pathname === '/v1/admin/login') {
    let body = {};
    try {
      body = await readBody(request);
    } catch {
      send(response, 400, { error: 'bad_json' });
      return;
    }
    if (!adminConfigured()) {
      send(response, 503, { error: 'admin_unconfigured' });
      return;
    }
    if (!adminTokenMatches(body?.token)) {
      send(response, 401, { error: 'unauthorized' });
      return;
    }
    send(response, 200, { ok: true }, { 'Set-Cookie': adminCookie(String(body.token), isSecureRequest(request)) });
    return;
  }
  if (request.method === 'POST' && url.pathname === '/v1/admin/logout') {
    send(response, 200, { ok: true }, { 'Set-Cookie': clearAdminCookie() });
    return;
  }
  if (url.pathname.startsWith('/v1/admin/')) {
    if (!adminGate(request, response)) return;
    if (request.method === 'GET' && url.pathname === '/v1/admin/overview') {
      send(response, 200, adminStats());
      return;
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
      return;
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
        return;
      }
      const action = match[2] ?? '';
      const existing = getUser(userId);
      if (!existing) {
        send(response, 404, { error: 'unknown_user' });
        return;
      }
      if (request.method === 'GET' && action === '') {
        send(response, 200, adminUserDetail(userId));
        return;
      }
      if (request.method === 'POST' && action === '') {
        let body = {};
        try {
          body = await readBody(request);
        } catch {
          send(response, 400, { error: 'bad_json' });
          return;
        }
        updateAdminUser(userId, body);
        send(response, 200, adminUserDetail(userId));
        return;
      }
      if (request.method === 'DELETE' && action === '') {
        deleteAdminUser(userId);
        send(response, 200, { ok: true });
        return;
      }
      if (request.method === 'POST' && action === 'sessions/revoke') {
        send(response, 200, revokeAdminSessions(userId));
        return;
      }
      if (request.method === 'DELETE' && action.startsWith('sessions/')) {
        const sessionId = decodeURIComponent(action.slice('sessions/'.length));
        if (!revokeAdminSession(userId, sessionId)) {
          send(response, 404, { error: 'unknown_session' });
          return;
        }
        send(response, 200, adminUserDetail(userId));
        return;
      }
      if (request.method === 'POST' && action === 'platforms') {
        let body = {};
        try {
          body = await readBody(request);
        } catch {
          send(response, 400, { error: 'bad_json' });
          return;
        }
        try {
          send(response, 200, linkAdminPlatform(userId, body));
        } catch (error) {
          send(response, Number(error.status) || 400, { error: error.message || 'admin_failed' });
        }
        return;
      }
      if (request.method === 'DELETE' && action.startsWith('platforms/')) {
        const platform = decodeURIComponent(action.slice('platforms/'.length));
        try {
          send(response, 200, unlinkAdminPlatform(userId, platform));
        } catch (error) {
          send(response, Number(error.status) || 400, { error: error.message || 'admin_failed' });
        }
        return;
      }
      if (request.method === 'POST' && action === 'campus/disconnect') {
        send(response, 200, disconnectAdminCampus(userId));
        return;
      }
      if (request.method === 'POST' && action === 'portal/clear') {
        let body = {};
        try {
          body = await readBody(request);
        } catch {
          send(response, 400, { error: 'bad_json' });
          return;
        }
        send(response, 200, clearAdminPortalData(userId, body?.studyId));
        return;
      }
    }
    send(response, 404, { error: 'not_found' });
    return;
  }
  if (request.method === 'GET' && url.pathname === '/health') {
    send(response, 200, {
      ok: true,
      model,
      configured: Boolean(process.env.XAI_API_KEY),
      oidc: publicOidcStatus(),
      campus: publicCampusStatus(),
      mail: publicMailStatus(),
      admin: { configured: adminConfigured() },
    });
    return;
  }
  if (request.method === 'GET' && url.pathname === '/v1/api') {
    send(response, 200, apiCatalog());
    return;
  }
  if (request.method === 'POST' && url.pathname === '/v1/auth/session') {
    let body = {};
    try {
      body = await readBody(request);
    } catch {
      send(response, 400, { error: 'bad_json' });
      return;
    }
    const mode = body.mode === 'demo' ? 'demo' : body.mode === 'local' ? 'local' : '';
    if (!mode) {
      send(response, 400, { error: 'bad_mode' });
      return;
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
    return;
  }
  if (request.method === 'GET' && url.pathname === '/v1/auth/me') {
    const auth = authenticateRequest(request);
    if (!auth) {
      send(response, 401, { error: 'unauthorized' });
      return;
    }
    send(response, 200, { user: auth.user, session: { expiresAt: auth.expiresAt } });
    return;
  }
  if (request.method === 'POST' && url.pathname === '/v1/auth/logout') {
    const token = readBearer(request);
    const auth = authenticateRequest(request);
    // Sign-out revokes the app session and drops the in-memory portal
    // credential; the per-user data stays for the next sign-in.
    if (auth) clearUserCampusCredential(auth.user.id);
    if (token) revokeSession(token);
    send(response, 200, { ok: true });
    return;
  }
  if (request.method === 'POST' && url.pathname === '/v1/auth/links') {
    let body = {};
    try {
      body = await readBody(request);
    } catch {
      send(response, 400, { error: 'bad_json' });
      return;
    }
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
    return;
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
    return;
  }
  if (request.method === 'POST' && url.pathname === '/v1/auth/sync') {
    let body = {};
    try {
      body = await readBody(request);
    } catch {
      send(response, 400, { error: 'bad_json' });
      return;
    }
    try {
      const auth = requireAuth(request);
      const user = touchPlatform(auth.user.id, body.platform, body.at);
      send(response, 200, { user });
    } catch (error) {
      send(response, Number(error.status) || 400, { error: error.message || 'auth_failed', detail: error.detail });
    }
    return;
  }
  if (request.method === 'GET' && url.pathname === '/v1/mail/config') {
    // Status only: whether credentials are held, no secret ever leaves the process.
    send(response, 200, publicMailStatus());
    return;
  }
  if (request.method === 'POST' && url.pathname === '/v1/mail/credentials') {
    console.log('[mail] POST /v1/mail/credentials');
    let body = {};
    try {
      body = await readBody(request);
    } catch {
      send(response, 400, { error: 'bad_json' });
      return;
    }
    try {
      // Secrets in, never out: the password is validated against the TIK IMAP server and stays in this process.
      const result = await saveMailCredentials({ account: body?.account, password: body?.password });
      const auth = authenticateRequest(request);
      if (auth) linkPlatform(auth.user.id, { platform: 'mail', account: result.account, status: 'connected', source: 'mail' });
      console.log(`[mail] credentials ok account=${result.account}`);
      send(response, 200, auth ? { ...result, user: getUser(auth.user.id) } : result);
    } catch (error) {
      const code = error.message || 'mail_failed';
      console.log(`[mail] credentials failed ${code}`);
      send(response, code === 'mail_auth_failed' ? 401 : 400, { error: code, detail: error.detail });
    }
    return;
  }
  if (request.method === 'GET' && url.pathname === '/v1/mail/folders') {
    const reqId = campusReq('GET /v1/mail/folders');
    try {
      const folders = await loadMailFolders();
      console.log(`[mail #${reqId}] folders ok count=${folders.length}`);
      send(response, 200, { folders });
    } catch (error) {
      const code = error.message || 'mail_failed';
      console.log(`[mail #${reqId}] folders failed ${code}${error.detail ? ` detail=${error.detail}` : ''}`);
      const status = code === 'mail_not_configured' ? 409 : code === 'mail_auth_failed' ? 401 : 500;
      send(response, status, { error: code, detail: error.detail });
    }
    return;
  }
  if (request.method === 'GET' && url.pathname === '/v1/mail/messages') {
    const reqId = campusReq('GET /v1/mail/messages');
    try {
      const messages = await loadMailMessages(Number(url.searchParams.get('limit')), url.searchParams.get('folder'));
      console.log(`[mail #${reqId}] messages ok count=${messages.length}`);
      send(response, 200, { messages });
    } catch (error) {
      const code = error.message || 'mail_failed';
      console.log(`[mail #${reqId}] messages failed ${code}${error.detail ? ` detail=${error.detail}` : ''}`);
      const status = code === 'mail_not_configured' ? 409 : code === 'mail_auth_failed' ? 401 : 500;
      send(response, status, { error: code, detail: error.detail });
    }
    return;
  }
  if (request.method === 'GET' && url.pathname === '/v1/mail/body') {
    const reqId = campusReq('GET /v1/mail/body');
    try {
      const body = await loadMailBody(url.searchParams.get('folder'), url.searchParams.get('uid'));
      console.log(`[mail #${reqId}] body ok html=${body.html !== null} truncated=${body.truncated}`);
      send(response, 200, body);
    } catch (error) {
      const code = error.message || 'mail_failed';
      const status = code === 'mail_not_configured' ? 409 : code === 'mail_auth_failed' ? 401 : code === 'bad_uid' ? 400 : 500;
      console.log(`[mail #${reqId}] body failed ${code}${error.detail ? ` detail=${error.detail}` : ''}`);
      send(response, status, { error: code, detail: error.detail });
    }
    return;
  }
  if (request.method === 'POST' && url.pathname === '/v1/mail/logout') {
    console.log('[mail] POST /v1/mail/logout');
    const auth = authenticateRequest(request);
    if (auth) unlinkPlatform(auth.user.id, 'mail');
    forgetMailCredentials();
    send(response, 200, publicMailStatus());
    return;
  }
  if (request.method === 'GET' && url.pathname === '/v1/campus/config') {
    const auth = authenticateRequest(request);
    send(response, 200, publicCampusStatus(auth?.user?.id));
    return;
  }
  if (request.method === 'POST' && url.pathname === '/v1/campus/credentials') {
    console.log('[campus] POST /v1/campus/credentials');
    let body = {};
    try {
      body = await readBody(request);
    } catch {
      send(response, 400, { error: 'bad_json' });
      return;
    }
    try {
      // Secrets in, never out: the body is neither logged nor echoed.
      const auth = authenticateRequest(request);
      const result = await validateBrowserCredentials({ cookies: body?.cookies, storage: body?.storage });
      if (auth) {
        // A signed-in user reconnecting C@MPUS: keep the credential under that account.
        setUserCampusCredential(auth.user.id, result.credential);
        saveCampusSource(auth.user.id, 'browser', auth.user.account);
        console.log(`[campus] credentials ok studies=${result.studies} user=${auth.user.id}`);
        send(response, 200, { ok: true, studies: result.studies, activeStudyId: result.activeStudyId, user: getUser(auth.user.id) });
        return;
      }
      // Pre-login: hand the validated credential to /v1/campus/login by ticket.
      console.log(`[campus] credentials ok studies=${result.studies} ticket issued`);
      send(response, 200, { ok: true, studies: result.studies, activeStudyId: result.activeStudyId, ticket: result.ticket });
    } catch (error) {
      const code = error.message || 'campus_failed';
      console.log(`[campus] credentials failed ${code}${error.detail ? ` detail=${error.detail}` : ''}`);
      send(response, Number(error.status) || 500, campusFailure(error));
    }
    return;
  }
  if (request.method === 'POST' && url.pathname === '/v1/campus/login') {
    const reqId = campusReq('POST /v1/campus/login');
    let body = {};
    try {
      body = await readBody(request);
    } catch {
      send(response, 400, { error: 'bad_json' });
      return;
    }
    try {
      const auth = authenticateRequest(request);
      const credential = resolveLoginCredential({ ticket: body?.ticket, userId: auth?.user?.id });
      // Read the profile before choosing the user id: a pre-login ticket has no account yet.
      const profile = await readCampusLogin(credential, fetch, auth?.user?.id ?? null, false);
      const { credential: _credential, ...profileData } = profile;
      // The C@MPUS read proves the st-account. Mint the app session for this
      // user and record the platforms that share the same SIAM identity.
      const session = createUserSession({
        account: profileData.account,
        name: profileData.name,
        mode: 'campus',
        platforms: campusPlatformLinks({ account: profileData.account }),
      });
      setUserCampusCredential(session.user.id, { ...credential, account: profileData.account });
      saveCampusSource(session.user.id, credential.source, profileData.account);
      storeCampusLogin(session.user.id, profileData);
      console.log(`[campus #${reqId}] login ok name=${profileData.name} account=${profileData.account} nodes=${profileData.nodes.length} studies=${profileData.studies?.length ?? 0} user=${session.user.id}`);
      send(response, 200, { ...profileData, user: session.user, token: session.token, expiresAt: session.expiresAt });
    } catch (error) {
      const code = error.message || 'campus_failed';
      console.log(`[campus #${reqId}] login failed ${code}${error.detail ? ` detail=${error.detail}` : ''}`);
      send(response, Number(error.status) || 500, campusFailure(error));
    }
    return;
  }
  if (request.method === 'POST' && url.pathname === '/v1/campus/structure') {
    let body = {};
    try {
      body = await readBody(request);
    } catch {
      send(response, 400, { error: 'bad_json' });
      return;
    }
    const reqId = campusReq('POST /v1/campus/structure', `body=${previewBody(body)}`);
    try {
      const auth = requireAuth(request);
      const result = await loadCurriculumStructure(body?.elementId, body?.studyId, fetch, undefined, auth.user.id);
      console.log(`[campus #${reqId}] structure ok study=${result.studyId} element=${result.elementId} nodes=${result.nodes.length}`);
      send(response, 200, result);
    } catch (error) {
      const code = error.message || 'campus_failed';
      console.log(`[campus #${reqId}] structure failed ${code}${error.detail ? ` detail=${error.detail}` : ''}`);
      send(response, Number(error.status) || 500, campusFailure(error));
    }
    return;
  }
  if (request.method === 'POST' && url.pathname === '/v1/campus/courses') {
    let body = {};
    try {
      body = await readBody(request);
    } catch {
      send(response, 400, { error: 'bad_json' });
      return;
    }
    const reqId = campusReq('POST /v1/campus/courses', `body=${previewBody(body)}`);
    try {
      const auth = requireAuth(request);
      const result = await loadCurriculumCourses(body?.studyId, body?.elementId, fetch, undefined, auth.user.id);
      console.log(`[campus #${reqId}] courses ok study=${result.studyId} element=${result.elementId} count=${result.courses.length}`);
      send(response, 200, result);
    } catch (error) {
      const code = error.message || 'campus_failed';
      console.log(`[campus #${reqId}] courses failed ${code}${error.detail ? ` detail=${error.detail}` : ''}`);
      send(response, Number(error.status) || 500, campusFailure(error));
    }
    return;
  }
  if (request.method === 'POST' && url.pathname === '/v1/campus/course-groups') {
    let body = {};
    try {
      body = await readBody(request);
    } catch {
      send(response, 400, { error: 'bad_json' });
      return;
    }
    const reqId = campusReq('POST /v1/campus/course-groups', `body=${previewBody(body)}`);
    try {
      const auth = requireAuth(request);
      const result = await loadCourseGroups(body?.courseId, fetch, undefined, auth.user.id);
      console.log(`[campus #${reqId}] course groups ok course=${result.courseId} groups=${result.groups.length}`);
      send(response, 200, result);
    } catch (error) {
      const code = error.message || 'campus_failed';
      console.log(`[campus #${reqId}] course groups failed ${code}${error.detail ? ` detail=${error.detail}` : ''}`);
      send(response, Number(error.status) || 500, campusFailure(error));
    }
    return;
  }
  if (request.method === 'POST' && url.pathname === '/v1/campus/sync') {
    let body = {};
    try {
      body = await readBody(request);
    } catch {
      send(response, 400, { error: 'bad_json' });
      return;
    }
    const reqId = campusReq('POST /v1/campus/sync', `body=${previewBody(body)}`);
    try {
      const auth = requireAuth(request);
      const job = await startSyncJob({ userId: auth.user.id, studyId: body?.studyId, elementId: body?.elementId, includeCourses: body?.includeCourses });
      console.log(`[campus #${reqId}] sync started job=${job.jobId} study=${job.studyId}`);
      send(response, 200, job);
    } catch (error) {
      const code = error.message || 'campus_failed';
      console.log(`[campus #${reqId}] sync failed ${code}${error.detail ? ` detail=${error.detail}` : ''}`);
      send(response, Number(error.status) || 500, campusFailure(error));
    }
    return;
  }
  if ((request.method === 'GET' || request.method === 'DELETE') && url.pathname.startsWith('/v1/campus/sync/')) {
    const id = url.pathname.slice('/v1/campus/sync/'.length);
    if (!/^[1-9]\d{0,9}$/.test(id)) {
      send(response, 400, { error: 'bad_job_id' });
      return;
    }
    try {
      const auth = requireAuth(request);
      const job = request.method === 'DELETE' ? cancelSyncJobForUser(auth.user.id, id) : getSyncJobForUser(auth.user.id, id);
      if (!job) {
        send(response, 404, { error: 'unknown_job' });
        return;
      }
      send(response, 200, job);
    } catch (error) {
      send(response, Number(error.status) || 500, { error: error.message || 'campus_failed' });
    }
    return;
  }
  if (request.method === 'GET' && url.pathname === '/v1/campus/tree') {
    const studyId = Number(url.searchParams.get('studyId'));
    if (!Number.isInteger(studyId) || studyId <= 0) {
      send(response, 400, { error: 'bad_study_id' });
      return;
    }
    try {
      const auth = requireAuth(request);
      const stored = loadStructure(auth.user.id, studyId);
      send(response, 200, {
        studyId,
        nodes: stored.nodes,
        expandedIds: stored.expandedIds,
        sync: stored.sync
          ? { nodeCount: stored.sync.nodeCount, finishedAt: stored.sync.finishedAt, complete: stored.sync.complete }
          : null,
      });
    } catch (error) {
      send(response, Number(error.status) || 500, { error: error.message || 'campus_failed' });
    }
    return;
  }
  if (request.method === 'GET' && url.pathname === '/v1/campus/courses/all') {
    const studyId = Number(url.searchParams.get('studyId'));
    if (!Number.isInteger(studyId) || studyId <= 0) {
      send(response, 400, { error: 'bad_study_id' });
      return;
    }
    try {
      const auth = requireAuth(request);
      const sync = getCoursesSync(auth.user.id, studyId);
      send(response, 200, {
        studyId,
        courses: loadCourses(auth.user.id, studyId),
        fetchedElementIds: loadCoursesFetchedIds(auth.user.id, studyId),
        sync: sync ? { courseCount: sync.courseCount, finishedAt: sync.finishedAt, complete: sync.complete } : null,
      });
    } catch (error) {
      send(response, Number(error.status) || 500, { error: error.message || 'campus_failed' });
    }
    return;
  }
  if (request.method === 'POST' && url.pathname === '/v1/campus/calendar-export') {
    let body = {};
    try {
      body = await readBody(request);
    } catch {
      send(response, 400, { error: 'bad_json' });
      return;
    }
    const reqId = campusReq('POST /v1/campus/calendar-export', `body=${previewBody(body)}`);
    try {
      const auth = requireAuth(request);
      const result = await exportCampusCalendar(body, undefined, auth.user.id);
      console.log(`[campus #${reqId}] calendar export ok ${result.filename} ${result.bytes} bytes`);
      send(response, 200, result);
    } catch (error) {
      const code = error.message || 'campus_failed';
      console.log(`[campus #${reqId}] calendar export failed ${code}${error.detail ? ` detail=${error.detail}` : ''}`);
      send(response, Number(error.status) || 500, campusFailure(error));
    }
    return;
  }
  if (request.method === 'POST' && url.pathname === '/v1/campus/calendar-sync') {
    let body = {};
    try {
      body = await readBody(request);
    } catch {
      send(response, 400, { error: 'bad_json' });
      return;
    }
    const reqId = campusReq('POST /v1/campus/calendar-sync', `body=${previewBody(body)}`);
    try {
      const auth = requireAuth(request);
      const result = await syncExportedCalendar(body, undefined, auth.user.id);
      console.log(`[campus #${reqId}] calendar sync ok ${result.imported} new, ${result.skipped} duplicates`);
      send(response, 200, result);
    } catch (error) {
      const code = error.message || 'campus_failed';
      console.log(`[campus #${reqId}] calendar sync failed ${code}${error.detail ? ` detail=${error.detail}` : ''}`);
      send(response, Number(error.status) || 500, campusFailure(error));
    }
    return;
  }
  if (request.method === 'GET' && url.pathname === '/v1/campus/calendar-events') {
    try {
      const auth = requireAuth(request);
      const events = loadExportedEvents(auth.user.id, url.searchParams.get('limit'));
      send(response, 200, {
        events: events.map((event) => ({
          uid: event.uid,
          summary: event.summary,
          location: event.location,
          description: event.description,
          dtstart: event.dtstart,
          dtend: event.dtend,
          fetchedAt: event.fetched_at,
        })),
      });
    } catch (error) {
      send(response, Number(error.status) || 500, { error: error.message || 'campus_failed' });
    }
    return;
  }
  if (request.method === 'GET' && url.pathname === '/v1/campus/calls') {
    try {
      const auth = requireAuth(request);
      send(response, 200, { calls: readPortalCalls(auth.user.id, url.searchParams.get('limit')) });
    } catch (error) {
      send(response, Number(error.status) || 500, { error: error.message || 'campus_failed' });
    }
    return;
  }
  if (request.method === 'GET' && url.pathname === '/v1/campus/studies') {
    const reqId = campusReq('GET /v1/campus/studies');
    try {
      const auth = requireAuth(request);
      const result = await loadCampusStudies(undefined, auth.user.id);
      console.log(`[campus #${reqId}] studies ok count=${result.studies.length}`);
      send(response, 200, result);
    } catch (error) {
      const code = error.message || 'campus_failed';
      console.log(`[campus #${reqId}] studies failed ${code}${error.detail ? ` detail=${error.detail}` : ''}`);
      send(response, Number(error.status) || 500, campusFailure(error));
    }
    return;
  }
  if (request.method === 'GET' && url.pathname === '/v1/oidc/config') {
    send(response, 200, publicOidcStatus());
    return;
  }
  if (url.pathname === '/v1/oidc/start' || url.pathname === '/v1/oidc/exchange' || url.pathname === '/v1/oidc/logout') {
    if (request.method !== 'POST') {
      send(response, 405, { error: 'method' });
      return;
    }
    let oidcBody;
    try {
      oidcBody = await readBody(request);
    } catch {
      send(response, 400, { error: 'bad_json' });
      return;
    }
    try {
      if (url.pathname === '/v1/oidc/start') {
        send(response, 200, await startLogin(String(oidcBody.redirectUri ?? '')));
        return;
      }
      if (url.pathname === '/v1/oidc/exchange') {
        const exchanged = await exchangeCode({ code: oidcBody.code, state: oidcBody.state, redirectUri: String(oidcBody.redirectUri ?? '') });
        const session = createUserSession({
          account: exchanged.profile.account,
          name: exchanged.profile.name,
          email: exchanged.profile.email,
          subject: exchanged.profile.subject,
          mode: 'oidc',
          platforms: oidcPlatformLinks({ account: exchanged.profile.account }),
        });
        send(response, 200, { ...exchanged, user: session.user, token: session.token, expiresAt: session.expiresAt });
        return;
      }
      send(response, 200, await endRemoteSession(oidcBody.sessionId));
    } catch (error) {
      const status = Number(error.status) || 500;
      send(response, status, { error: error.message || 'oidc_failed', detail: error.detail });
    }
    return;
  }
  if (request.method !== 'POST' || url.pathname !== '/v1/assist') {
    send(response, 404, { error: 'not_found' });
    return;
  }
  if (!process.env.XAI_API_KEY) {
    send(response, 503, { error: 'missing_key' });
    return;
  }

  let body;
  try {
    body = await readBody(request);
  } catch {
    send(response, 400, { error: 'bad_json' });
    return;
  }

  const locale = body.locale === 'en' ? 'en' : 'de';
  const question = String(body.question ?? '').slice(0, 4000);
  const facts = String(body.facts ?? '').slice(0, 24000);
  const history = Array.isArray(body.history) ? body.history.slice(-6) : [];
  if (!question) {
    send(response, 400, { error: 'empty_question' });
    return;
  }

  const system = t(locale, 'assist.systemPrompt');

  const input = [
    { role: 'system', content: system },
    ...history
      .filter((item) => item && (item.role === 'user' || item.role === 'assistant') && typeof item.text === 'string')
      .map((item) => ({ role: item.role, content: String(item.text).slice(0, 4000) })),
    { role: 'user', content: `FACTS:\n${facts}\n\nQUESTION:\n${question}` },
  ];

  try {
    const upstream = await fetch('https://api.x.ai/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.XAI_API_KEY}`,
      },
      body: JSON.stringify({ model, store: false, input }),
      signal: AbortSignal.timeout(50_000),
    });
    const payload = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      send(response, 502, { error: 'upstream', status: upstream.status });
      return;
    }
    const text = outputText(payload);
    if (!text) {
      send(response, 502, { error: 'empty_upstream' });
      return;
    }
    send(response, 200, { text, model });
  } catch {
    send(response, 502, { error: 'upstream_failed' });
  }
});

startCampusTokenRefresh();

server.listen(port, '0.0.0.0', () => {
  console.log(`assistant server on http://127.0.0.1:${port}`);
});
