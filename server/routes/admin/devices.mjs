/** Operator routes for browser device links. */

import { listAdminDevices, revokeAdminDevice } from '../../admin/index.mjs';
import { send } from '../../http.mjs';

export function handleDevices(request, response, url) {
  if (url.pathname === '/v1/admin/devices' && request.method === 'GET') {
    send(response, 200, listAdminDevices({
      query: url.searchParams.get('query') || '',
      state: url.searchParams.get('state') || '',
      limit: url.searchParams.get('limit') || 50,
      offset: url.searchParams.get('offset') || 0,
    }));
    return true;
  }
  const match = url.pathname.match(/^\/v1\/admin\/devices\/([^/]+)$/);
  if (match && request.method === 'DELETE') {
    let deviceId = match[1];
    try {
      deviceId = decodeURIComponent(deviceId);
    } catch {
      send(response, 400, { error: 'bad_device_id' });
      return true;
    }
    const result = revokeAdminDevice(deviceId);
    if (!result) {
      send(response, 404, { error: 'unknown_device' });
      return true;
    }
    send(response, 200, result);
    return true;
  }
  return false;
}
