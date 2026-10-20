/** Runtime status, sync jobs, and process-wide actions. */

import {
  adminSystem,
  cancelAdminSyncJob,
  disconnectAdminMail,
} from '../../admin/index.mjs';
import { send } from '../../http.mjs';
import { decode } from './shared.mjs';

export function handleSystem(request, response, url) {
  if (request.method === 'GET' && url.pathname === '/v1/admin/system') {
    send(response, 200, adminSystem());
    return true;
  }
  if (request.method === 'GET' && url.pathname === '/v1/admin/sync-jobs') {
    send(response, 200, { jobs: adminSystem().syncJobs });
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
