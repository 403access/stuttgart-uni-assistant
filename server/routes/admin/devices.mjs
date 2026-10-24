/** Operator routes for browser device links. */

import { getAdminDevice, listAdminDevices, revokeAdminDevice } from '../../admin/index.mjs';
import { send } from '../../http.mjs';

function deviceIdFrom(match, response) {
  try {
    return decodeURIComponent(match[1]);
  } catch {
    send(response, 400, { error: 'bad_device_id' });
    return null;
  }
}

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
  if (match && (request.method === 'GET' || request.method === 'DELETE')) {
    const deviceId = deviceIdFrom(match, response);
    if (!deviceId) return true;
    if (request.method === 'GET') {
      const device = getAdminDevice(deviceId);
      if (!device) {
        send(response, 404, { error: 'unknown_device' });
        return true;
      }
      send(response, 200, device);
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
