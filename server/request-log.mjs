/** Request logging and the error body shared by the portal and mail routes. */

import { logService } from './service-log.mjs';

let requestSeq = 0;

function serviceFor(route) {
  if (route.includes('/v1/ilias')) return 'ilias';
  if (route.includes('/v1/mail')) return 'mail';
  return 'campus';
}

export function logRequest(route, extra) {
  const id = ++requestSeq;
  logService(serviceFor(route), 'info', `#${id} ${route}${extra ? ` ${extra}` : ''}`, { requestId: id });
  return id;
}

export function previewBody(body) {
  try {
    return JSON.stringify(body ?? {}).slice(0, 200);
  } catch {
    return '?';
  }
}

export function errorBody(error) {
  const body = { error: error.message || 'campus_failed' };
  if (error.detail) body.detail = String(error.detail).slice(0, 300);
  if (typeof error.status === 'number') body.status = error.status;
  return body;
}
