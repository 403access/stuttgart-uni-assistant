/** Runtime status, sync jobs, environment, and process-wide actions. */

import {
  adminEnvironment,
  adminSystem,
  cancelAdminSyncJob,
  disconnectAdminMail,
  recordAdminAudit,
} from '../../admin/index.mjs';
import { send } from '../../http.mjs';
import { decode } from './shared.mjs';

const NO_STORE = { 'Cache-Control': 'no-store' };

export function handleSystem(request, response, url) {
  if (request.method === 'GET' && url.pathname === '/v1/admin/system') {
    send(response, 200, adminSystem(), NO_STORE);
    return true;
  }
  if (request.method === 'GET' && url.pathname === '/v1/admin/environment') {
    const reveal = url.searchParams.get('reveal') === '1';
    const environment = adminEnvironment({ reveal });
    if (reveal) {
      recordAdminAudit({
        action: 'environment.reveal',
        detail: { secrets: environment.variables.filter((item) => item.secret && item.set).length },
      });
    }
    send(response, 200, environment, NO_STORE);
    return true;
  }
  if (request.method === 'GET' && url.pathname === '/v1/admin/sync-jobs') {
    send(response, 200, { jobs: adminSystem().syncJobs }, NO_STORE);
    return true;
  }
  if (request.method === 'POST' && url.pathname === '/v1/admin/system/mail/logout') {
    send(response, 200, { ok: true, mail: disconnectAdminMail() });
    return true;
  }
  if (request.method === 'DELETE' && url.pathname.startsWith('/v1/admin/sync-jobs/')) {
    const jobId = decode(url.pathname.slice('/v1/admin/sync-jobs/'.length));
    const cancelled = jobId ? cancelAdminSyncJob(jobId) : null;
    if (!cancelled) {
      send(response, 404, { error: 'unknown_job' });
      return true;
    }
    send(response, 200, cancelled);
    return true;
  }
  return false;
}
