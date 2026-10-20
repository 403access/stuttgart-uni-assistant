/**
 * The `/admin` dashboard and the `/v1/admin/*` API.
 *
 * The API is gated by DASHBOARD_TOKEN and its HttpOnly cookie. Route modules
 * only handle endpoints; the data layer lives in `server/admin/`.
 */

import { adminAuthorized, adminConfigured, adminIlias, adminStats } from '../../admin/index.mjs';
import { send } from '../../http.mjs';
import { dashboardAsset, dashboardPage } from './assets.mjs';
import { handleAudit } from './audit.mjs';
import { handleDevices } from './devices.mjs';
import { handleSession } from './session.mjs';
import { adminGate } from './shared.mjs';
import { handleSystem } from './system.mjs';
import { handleUser } from './user.mjs';
import { handleUsers } from './users.mjs';

export async function handleAdmin(request, response, url) {
  if (dashboardPage(request, response, url)) return true;
  if (dashboardAsset(request, response, url)) return true;
  if (await handleSession(request, response, url)) return true;
  if (!url.pathname.startsWith('/v1/admin/')) return false;
  if (!adminGate(request, response, adminConfigured, adminAuthorized)) return true;

  if (request.method === 'GET' && url.pathname === '/v1/admin/overview') {
    send(response, 200, adminStats());
    return true;
  }
  if (request.method === 'GET' && url.pathname === '/v1/admin/ilias') {
    send(response, 200, adminIlias());
    return true;
  }
  if (await handleUsers(request, response, url)) return true;
  if (handleDevices(request, response, url)) return true;
  if (handleAudit(request, response, url)) return true;
  if (handleSystem(request, response, url)) return true;
  if (await handleUser(request, response, url)) return true;

  send(response, 404, { error: 'not_found' });
  return true;
}
