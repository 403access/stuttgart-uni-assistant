/** Route-level guards and query parsing shared by the admin endpoints. */

import { send } from '../../http.mjs';

export function adminUserId(value) {
  return typeof value === 'string' && /^usr_[A-Za-z0-9_-]{4,100}$/.test(value) ? value : null;
}

export function adminGate(request, response, configured, authorized) {
  if (!configured()) {
    send(response, 503, { error: 'admin_unconfigured' });
    return false;
  }
  if (!authorized(request)) {
    send(response, 401, { error: 'unauthorized' });
    return false;
  }
  return true;
}

export function fail(response, error) {
  const status = Number(error?.status) || 400;
  send(response, status, { error: error?.message || 'admin_failed', detail: error?.detail });
}

export function decode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

export function query(page) {
  return {
    query: page.searchParams.get('query') || '',
    studyId: page.searchParams.get('studyId') || '',
    state: page.searchParams.get('state') || '',
    failed: page.searchParams.get('failed') || '',
    limit: page.searchParams.get('limit') || 50,
    offset: page.searchParams.get('offset') || 0,
  };
}
