/** Hash parsing and user-filter URL serialization. */

import { PAGE_SIZES, PLATFORMS, SORTS } from './constants.mjs';
import { state } from './runtime.mjs';

export function parseHash() {
  const raw = String(location.hash || '#/overview').replace(/^#\/?/, '');
  const splitAt = raw.indexOf('?');
  const pathPart = splitAt >= 0 ? raw.slice(0, splitAt) : raw;
  const queryPart = splitAt >= 0 ? raw.slice(splitAt + 1) : '';
  const segments = pathPart.split('/').filter(Boolean);
  const params = new URLSearchParams(queryPart);
  if (!segments.length) return { name: 'overview', params };
  if (segments[0] === 'users' && segments[1]) {
    return { name: 'user', id: decodeURIComponent(segments[1]), tab: segments[2] || 'overview', params };
  }
  if (segments[0] === 'users') return { name: 'users', params };
  if (segments[0] === 'devices') return { name: 'devices', params };
  if (segments[0] === 'news') return { name: 'news', params };
  if (segments[0] === 'ilias') return { name: 'ilias', params };
  if (segments[0] === 'audit') return { name: 'audit', params };
  if (segments[0] === 'logs') return { name: 'logs', params };
  if (segments[0] === 'system') return { name: 'system', params };
  return { name: 'overview', params };
}

export function filtersFromParams(params) {
  const filters = {
    query: params.get('query') || '',
    mode: params.get('mode') || '',
    platform: params.get('platform') || '',
    credential: params.get('credential') || '',
    activity: params.get('activity') || '',
    data: params.get('data') || '',
    sort: SORTS.some(([key]) => key === params.get('sort')) ? params.get('sort') : 'recent',
    limit: PAGE_SIZES.includes(Number(params.get('limit'))) ? Number(params.get('limit')) : 25,
    offset: Math.max(0, Number(params.get('offset')) || 0),
  };
  if (!['campus', 'oidc', 'demo', 'local'].includes(filters.mode)) filters.mode = '';
  if (!PLATFORMS.includes(filters.platform)) filters.platform = '';
  if (!['active', 'env', 'browser', 'none'].includes(filters.credential)) filters.credential = '';
  if (!['active', 'inactive', 'never'].includes(filters.activity)) filters.activity = '';
  if (!['portal', 'courses', 'events', 'calls', 'empty'].includes(filters.data)) filters.data = '';
  return filters;
}

export function usersHash() {
  const filters = state.users;
  const params = new URLSearchParams();
  if (filters.query) params.set('query', filters.query);
  if (filters.mode) params.set('mode', filters.mode);
  if (filters.platform) params.set('platform', filters.platform);
  if (filters.credential) params.set('credential', filters.credential);
  if (filters.activity) params.set('activity', filters.activity);
  if (filters.data) params.set('data', filters.data);
  if (filters.sort !== 'recent') params.set('sort', filters.sort);
  if (filters.limit !== 25) params.set('limit', String(filters.limit));
  if (filters.offset) params.set('offset', String(filters.offset));
  const text = params.toString();
  return '#/users' + (text ? '?' + text : '');
}

export function replaceUsersUrl() {
  if (!location.hash.startsWith('#/users')) return;
  const hash = usersHash();
  state.lastUsersHash = hash;
  history.replaceState(null, '', hash);
}

