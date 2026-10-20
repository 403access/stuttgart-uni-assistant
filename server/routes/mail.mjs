/** UniMail routes. Credentials arrive here and stay in this process. */

import { authenticateRequest, getUser, linkPlatform, unlinkPlatform } from '../auth.mjs';
import { forgetMailCredentials, loadMailBody, loadMailFolders, loadMailMessages, publicMailStatus, saveMailCredentials } from '../mail.mjs';
import { readJsonBody, send } from '../http.mjs';
import { logRequest } from '../request-log.mjs';

function mailStatusFor(error, fallback = 500) {
  const code = error.message || 'mail_failed';
  if (code === 'mail_not_configured') return 409;
  if (code === 'mail_auth_failed') return 401;
  return fallback;
}

export async function handleMail(request, response, url) {
  if (request.method === 'GET' && url.pathname === '/v1/mail/config') {
    // Status only: whether credentials are held, no secret ever leaves the process.
    send(response, 200, publicMailStatus());
    return true;
  }
  if (request.method === 'POST' && url.pathname === '/v1/mail/credentials') {
    console.log('[mail] POST /v1/mail/credentials');
    const parsed = await readJsonBody(request, response);
    if (!parsed) return true;
    const body = parsed.body;
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
    return true;
  }
  if (request.method === 'GET' && url.pathname === '/v1/mail/folders') {
    const reqId = logRequest('GET /v1/mail/folders');
    try {
      const folders = await loadMailFolders();
      console.log(`[mail #${reqId}] folders ok count=${folders.length}`);
      send(response, 200, { folders });
    } catch (error) {
      const code = error.message || 'mail_failed';
      console.log(`[mail #${reqId}] folders failed ${code}${error.detail ? ` detail=${error.detail}` : ''}`);
      send(response, mailStatusFor(error), { error: code, detail: error.detail });
    }
    return true;
  }
  if (request.method === 'GET' && url.pathname === '/v1/mail/messages') {
    const reqId = logRequest('GET /v1/mail/messages');
    try {
      const messages = await loadMailMessages(Number(url.searchParams.get('limit')), url.searchParams.get('folder'));
      console.log(`[mail #${reqId}] messages ok count=${messages.length}`);
      send(response, 200, { messages });
    } catch (error) {
      const code = error.message || 'mail_failed';
      console.log(`[mail #${reqId}] messages failed ${code}${error.detail ? ` detail=${error.detail}` : ''}`);
      send(response, mailStatusFor(error), { error: code, detail: error.detail });
    }
    return true;
  }
  if (request.method === 'GET' && url.pathname === '/v1/mail/body') {
    const reqId = logRequest('GET /v1/mail/body');
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
    return true;
  }
  if (request.method === 'POST' && url.pathname === '/v1/mail/logout') {
    console.log('[mail] POST /v1/mail/logout');
    const auth = authenticateRequest(request);
    if (auth) unlinkPlatform(auth.user.id, 'mail');
    forgetMailCredentials();
    send(response, 200, publicMailStatus());
    return true;
  }
  return false;
}
