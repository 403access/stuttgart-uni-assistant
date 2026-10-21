/**
 * Public news for the app. Only published rows are returned, so the route
 * needs no session or admin cookie. `GET /v1/news/<id>` answers one item.
 */

import { getPublishedNews, listPublishedNews } from '../news.mjs';
import { send } from '../http.mjs';

export function handleNews(request, response, url) {
  if (request.method !== 'GET') return false;
  if (url.pathname === '/v1/news') {
    const items = listPublishedNews(url.searchParams.get('limit') || 100);
    send(response, 200, { items, total: items.length });
    return true;
  }
  if (url.pathname.startsWith('/v1/news/')) {
    let id;
    try {
      id = decodeURIComponent(url.pathname.slice('/v1/news/'.length));
    } catch {
      id = '';
    }
    const item = getPublishedNews(id);
    if (!item) {
      send(response, 404, { error: 'not_found' });
      return true;
    }
    send(response, 200, { item });
    return true;
  }
  return false;
}
