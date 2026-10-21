/** Operator news routes: collection reads/writes and one item by id. */

import { createAdminNews, deleteAdminNews, getAdminNews, listAdminNews, updateAdminNews } from '../../admin/index.mjs';
import { readJsonBody, send } from '../../http.mjs';
import { decode, fail } from './shared.mjs';

const PREFIX = '/v1/admin/news';

export async function handleNews(request, response, url) {
  if (url.pathname !== PREFIX && !url.pathname.startsWith(`${PREFIX}/`)) return false;

  if (request.method === 'GET' && url.pathname === PREFIX) {
    send(response, 200, listAdminNews({
      query: url.searchParams.get('query') || '',
      state: url.searchParams.get('state') || '',
      limit: url.searchParams.get('limit') || 50,
      offset: url.searchParams.get('offset') || 0,
    }));
    return true;
  }

  if (request.method === 'POST' && url.pathname === PREFIX) {
    const parsed = await readJsonBody(request, response);
    if (!parsed) return true;
    try {
      const item = createAdminNews(parsed.body);
      send(response, 200, { item });
    } catch (error) {
      fail(response, error);
    }
    return true;
  }

  const id = decode(url.pathname.slice(PREFIX.length + 1));
  if (!id) {
    send(response, 404, { error: 'not_found' });
    return true;
  }

  if (request.method === 'GET') {
    const item = getAdminNews(id);
    if (!item) {
      send(response, 404, { error: 'unknown_news' });
      return true;
    }
    send(response, 200, { item });
    return true;
  }

  if (request.method === 'POST') {
    const parsed = await readJsonBody(request, response);
    if (!parsed) return true;
    try {
      const item = updateAdminNews(id, parsed.body);
      if (!item) {
        send(response, 404, { error: 'unknown_news' });
        return true;
      }
      send(response, 200, { item });
    } catch (error) {
      fail(response, error);
    }
    return true;
  }

  if (request.method === 'DELETE') {
    if (!deleteAdminNews(id)) {
      send(response, 404, { error: 'unknown_news' });
      return true;
    }
    send(response, 200, { ok: true });
    return true;
  }

  return false;
}
