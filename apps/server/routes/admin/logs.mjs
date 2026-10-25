/** Service diagnostics: list with filters and clear. */

import { clearAdminLogs, listAdminLogs } from '../../admin/index.mjs';
import { send } from '../../http.mjs';

export function handleLogs(request, response, url) {
  if (url.pathname !== '/v1/admin/logs') return false;
  if (request.method === 'GET') {
    send(response, 200, listAdminLogs({
      query: url.searchParams.get('query') || '',
      service: url.searchParams.get('service') || '',
      level: url.searchParams.get('level') || '',
      limit: url.searchParams.get('limit') || 100,
      offset: url.searchParams.get('offset') || 0,
    }));
    return true;
  }
  if (request.method === 'DELETE') {
    send(response, 200, clearAdminLogs({
      service: url.searchParams.get('service') || '',
      level: url.searchParams.get('level') || '',
    }));
    return true;
  }
  return false;
}
