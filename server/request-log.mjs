/** Request logging and the error body shared by the portal and mail routes. */

let requestSeq = 0;

export function logRequest(route, extra) {
  const id = ++requestSeq;
  const stamp = new Date().toISOString();
  console.log(`[campus #${id} ${stamp}] ${route}${extra ? ` ${extra}` : ''}`);
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
