/** Liveness and the operation catalogue the app's replay screen reads. */

import { adminConfigured } from '../admin/index.mjs';
import { apiCatalog } from '../catalog.mjs';
import { publicCampusStatus } from '../campus.mjs';
import { ASSISTANT_MODEL } from '../config.mjs';
import { publicMailStatus } from '../mail.mjs';
import { publicOidcStatus } from '../oidc.mjs';
import { send } from '../http.mjs';

export function handleHealth(request, response, url) {
  if (request.method === 'GET' && url.pathname === '/health') {
    send(response, 200, {
      ok: true,
      model: ASSISTANT_MODEL,
      configured: Boolean(process.env.XAI_API_KEY),
      oidc: publicOidcStatus(),
      campus: publicCampusStatus(),
      mail: publicMailStatus(),
      admin: { configured: adminConfigured() },
    });
    return true;
  }
  if (request.method === 'GET' && url.pathname === '/v1/api') {
    send(response, 200, apiCatalog());
    return true;
  }
  return false;
}
