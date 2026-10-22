/**
 * The assistant server: one HTTP listener in front of the route modules.
 *
 *   node server/index.mjs
 *
 * Each `server/routes/*.mjs` module owns one group of paths and returns true
 * when it answered the request. Anything unclaimed falls through to 404.
 */

import { createServer } from 'node:http';

import { startCampusTokenRefresh } from './campus.mjs';
import { loadEnv } from './env.mjs';
import { send } from './http.mjs';
import { warnIfPasswordPresent } from './oidc.mjs';
import { handleAdmin } from './routes/admin/index.mjs';
import { handleAssist } from './routes/assist.mjs';
import { handleAuth } from './routes/auth.mjs';
import { handleCampus } from './routes/campus.mjs';
import { handleHealth } from './routes/health.mjs';
import { handleIlias } from './routes/ilias.mjs';
import { handleMail } from './routes/mail.mjs';
import { handleNews } from './routes/news.mjs';
import { handleOidc } from './routes/oidc.mjs';
import { logService } from './service-log.mjs';

function serviceForPath(pathname) {
  if (pathname.startsWith('/admin') || pathname.startsWith('/v1/admin')) return 'admin';
  if (pathname.startsWith('/v1/campus')) return 'campus';
  if (pathname.startsWith('/v1/ilias')) return 'ilias';
  if (pathname.startsWith('/v1/mail')) return 'mail';
  if (pathname.startsWith('/v1/oidc')) return 'oidc';
  if (pathname.startsWith('/v1/auth')) return 'auth';
  if (pathname.startsWith('/v1/assist')) return 'assistant';
  return 'http';
}

loadEnv(new URL('../.env', import.meta.url));
warnIfPasswordPresent();

const port = Number(process.env.PORT || 8787);

// Order matters only where paths overlap: admin owns /admin, health owns the
// two unauthenticated status routes, news owns the public /v1/news reads, and
// the assistant is the final fallback.
const handlers = [handleAdmin, handleHealth, handleNews, handleAuth, handleMail, handleCampus, handleIlias, handleOidc, handleAssist];

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', 'http://127.0.0.1');
  if (request.method === 'OPTIONS') {
    send(response, 204, {});
    return;
  }
  try {
    for (const handle of handlers) {
      if (await handle(request, response, url)) return;
    }
    send(response, 404, { error: 'not_found' });
  } catch (error) {
    // A route that throws without answering used to leave the browser waiting
    // forever (e.g. the admin dashboard spinner). Always close the request.
    logService(serviceForPath(url.pathname), 'error', `${request.method} ${url.pathname} failed: ${error?.message ?? error}`);
    if (response.headersSent) response.end();
    else send(response, 500, { error: 'internal_error' });
  }
});

startCampusTokenRefresh();

server.listen(port, '0.0.0.0', () => {
  logService('server', 'info', `assistant server on http://127.0.0.1:${port}`);
});
