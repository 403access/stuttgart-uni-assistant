/** Collection-level account routes. */

import { adminUserDetail, createAdminUser, listUsers } from '../../admin/index.mjs';
import { readJsonBody, send } from '../../http.mjs';
import { fail } from './shared.mjs';

export async function handleUsers(request, response, url) {
  if (url.pathname !== '/v1/admin/users') return false;
  if (request.method === 'POST') {
    const parsed = await readJsonBody(request, response);
    if (!parsed) return true;
    try {
      const user = createAdminUser(parsed.body);
      send(response, 200, adminUserDetail(user.id));
    } catch (error) {
      fail(response, error);
    }
    return true;
  }
  if (request.method === 'GET') {
    send(response, 200, listUsers({
      query: url.searchParams.get('query') || '',
      mode: url.searchParams.get('mode') || '',
      platform: url.searchParams.get('platform') || '',
      credential: url.searchParams.get('credential') || '',
      activity: url.searchParams.get('activity') || '',
      data: url.searchParams.get('data') || '',
      sort: url.searchParams.get('sort') || 'recent',
      limit: url.searchParams.get('limit') || 50,
      offset: url.searchParams.get('offset') || 0,
    }));
    return true;
  }
  return false;
}
