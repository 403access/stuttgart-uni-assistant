/** Audit log reads. */

import { listAdminAudit } from '../../admin/index.mjs';
import { send } from '../../http.mjs';

export function handleAudit(request, response, url) {
  if (request.method !== 'GET' || url.pathname !== '/v1/admin/audit') return false;
  send(response, 200, listAdminAudit({
    query: url.searchParams.get('query') || '',
    action: url.searchParams.get('action') || '',
    userId: url.searchParams.get('userId') || '',
    limit: url.searchParams.get('limit') || 50,
    offset: url.searchParams.get('offset') || 0,
  }));
  return true;
}
