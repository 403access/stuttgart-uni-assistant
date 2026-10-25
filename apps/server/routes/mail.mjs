/** UniMail routes. Credentials arrive here and stay in this process. */

import { authenticateRequest, getUser, linkPlatform, unlinkPlatform } from '../auth.mjs';
import { MAIL_SEND_REQUEST_BYTES } from '../mail-mime.mjs';
import { forgetMailCredentials, loadMailBody, loadMailFolders, loadMailMessages, publicMailStatus, saveMailCredentials, sendMail, setMailSeen } from '../mail.mjs';
import { readJsonBody, send } from '../http.mjs';
import { logRequest } from '../request-log.mjs';
import { logService } from '../service-log.mjs';

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
    logService('mail', 'info', 'POST /v1/mail/credentials');
    const parsed = await readJsonBody(request, response);
    if (!parsed) return true;
    const body = parsed.body;
    try {
      // Secrets in, never out: the password is validated against the TIK IMAP server and stays in this process.
      const result = await saveMailCredentials({ account: body?.account, password: body?.password });
      const auth = authenticateRequest(request);
      if (auth) linkPlatform(auth.user.id, { platform: 'mail', account: result.account, status: 'connected', source: 'mail' });
      logService('mail', 'info', `credentials ok account=${result.account}`, auth ? { userId: auth.user.id } : null);
      send(response, 200, auth ? { ...result, user: getUser(auth.user.id) } : result);
    } catch (error) {
      const code = error.message || 'mail_failed';
      logService('mail', 'warn', `credentials failed ${code}`);
      send(response, code === 'mail_auth_failed' ? 401 : 400, { error: code, detail: error.detail });
    }
    return true;
  }
  if (request.method === 'GET' && url.pathname === '/v1/mail/folders') {
    const reqId = logRequest('GET /v1/mail/folders');
    try {
      const folders = await loadMailFolders();
      logService('mail', 'info', `#${reqId} folders ok count=${folders.length}`);
      send(response, 200, { folders });
    } catch (error) {
      const code = error.message || 'mail_failed';
      logService('mail', 'warn', `#${reqId} folders failed ${code}${error.detail ? ` detail=${error.detail}` : ''}`);
      send(response, mailStatusFor(error), { error: code, detail: error.detail });
    }
    return true;
  }
  if (request.method === 'GET' && url.pathname === '/v1/mail/messages') {
    const reqId = logRequest('GET /v1/mail/messages');
    try {
      const messages = await loadMailMessages(Number(url.searchParams.get('limit')), url.searchParams.get('folder'));
      logService('mail', 'info', `#${reqId} messages ok count=${messages.length}`);
      send(response, 200, { messages });
    } catch (error) {
      const code = error.message || 'mail_failed';
      logService('mail', 'warn', `#${reqId} messages failed ${code}${error.detail ? ` detail=${error.detail}` : ''}`);
      send(response, mailStatusFor(error), { error: code, detail: error.detail });
    }
    return true;
  }
  if (request.method === 'GET' && url.pathname === '/v1/mail/body') {
    const reqId = logRequest('GET /v1/mail/body');
    try {
      const body = await loadMailBody(url.searchParams.get('folder'), url.searchParams.get('uid'));
      logService('mail', 'info', `#${reqId} body ok html=${body.html !== null} truncated=${body.truncated}`);
      send(response, 200, body);
    } catch (error) {
      const code = error.message || 'mail_failed';
      const status = code === 'mail_not_configured' ? 409 : code === 'mail_auth_failed' ? 401 : code === 'bad_uid' ? 400 : 500;
      logService('mail', 'warn', `#${reqId} body failed ${code}${error.detail ? ` detail=${error.detail}` : ''}`);
      send(response, status, { error: code, detail: error.detail });
    }
    return true;
  }
  if (request.method === 'POST' && url.pathname === '/v1/mail/seen') {
    const reqId = logRequest('POST /v1/mail/seen');
    const parsed = await readJsonBody(request, response);
    if (!parsed) return true;
    try {
      // Explicit flag write: opening a message marks it read, the button can undo that.
      const result = await setMailSeen(parsed.body?.folder, parsed.body?.uid, parsed.body?.seen !== false);
      logService('mail', 'info', `#${reqId} seen ok uid=${result.uid} seen=${result.seen}`);
      send(response, 200, result);
    } catch (error) {
      const code = error.message || 'mail_failed';
      const status = code === 'mail_not_configured' ? 409 : code === 'mail_auth_failed' ? 401 : code === 'bad_uid' ? 400 : 500;
      logService('mail', 'warn', `#${reqId} seen failed ${code}${error.detail ? ` detail=${error.detail}` : ''}`);
      send(response, status, { error: code, detail: error.detail });
    }
    return true;
  }
  if (request.method === 'POST' && url.pathname === '/v1/mail/send') {
    const reqId = logRequest('POST /v1/mail/send');
    // Sending mail in the user's name needs the app session; reads stay open like before.
    const auth = authenticateRequest(request);
    if (!auth) {
      send(response, 401, { error: 'unauthorized' });
      return true;
    }
    const parsed = await readJsonBody(request, response, MAIL_SEND_REQUEST_BYTES);
    if (!parsed) return true;
    try {
      const result = await sendMail(parsed.body);
      logService('mail', 'info', `#${reqId} send ok accepted=${result.accepted.length} rejected=${result.rejected.length} saved=${result.saved} bytes=${result.attachmentBytes}`, { userId: auth.user.id });
      send(response, 200, result);
    } catch (error) {
      const code = error.message || 'mail_failed';
      const status =
        code === 'mail_not_configured'
          ? 409
          : code === 'mail_auth_failed'
            ? 401
            : code === 'mail_rate_limited'
              ? 429
              : code.startsWith('bad_') || code.startsWith('missing_') || code.startsWith('too_') || code.endsWith('_too_large') || code === 'subject_too_long'
                ? 400
                : 502;
      logService('mail', 'warn', `#${reqId} send failed ${code}${error.detail ? ` detail=${error.detail}` : ''}`, { userId: auth.user.id });
      send(response, status, { error: code, detail: error.detail });
    }
    return true;
  }
  if (request.method === 'POST' && url.pathname === '/v1/mail/logout') {
    logService('mail', 'info', 'POST /v1/mail/logout', auth ? { userId: auth.user.id } : null);
    const auth = authenticateRequest(request);
    if (auth) unlinkPlatform(auth.user.id, 'mail');
    forgetMailCredentials();
    send(response, 200, publicMailStatus());
    return true;
  }
  return false;
}
