/**
 * Structured diagnostics for every server-side service.
 *
 * `logService()` writes to stdout (so `npm run assistant` keeps its familiar
 * output) and to the bounded `service_logs` table the admin console reads.
 * Callers pass a service id, a level, and an optional detail object. A
 * `userId` in the detail object is stored as a column so the dashboard can link
 * a line to an account; the rest is stored as compact JSON.
 */

import { writeServiceLog } from './db.mjs';

export const SERVICE_NAMES = ['assistant', 'campus', 'ilias', 'mail', 'oidc', 'sync', 'auth', 'admin', 'http', 'server'];
export const LOG_LEVELS = ['debug', 'info', 'warn', 'error'];

const services = new Set(SERVICE_NAMES);
const levels = new Set(LOG_LEVELS);

function splitDetail(detail) {
  if (detail === null || detail === undefined) return { userId: null, detail: null };
  if (typeof detail !== 'object') return { userId: null, detail };
  const { userId, ...rest } = detail;
  return {
    userId: typeof userId === 'string' && userId ? userId : null,
    detail: Object.keys(rest).length ? rest : null,
  };
}

function print(level, line) {
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export function logService(service, level, message, detail = null) {
  const name = services.has(service) ? service : 'server';
  const severity = levels.has(level) ? level : 'info';
  const text = String(message ?? '').slice(0, 2000);
  const split = splitDetail(detail);
  print(severity, `[${name}] ${text}`);
  writeServiceLog({ service: name, level: severity, message: text, userId: split.userId, detail: split.detail });
  return { service: name, level: severity };
}

export function logInfo(service, message, detail) {
  return logService(service, 'info', message, detail);
}

export function logWarn(service, message, detail) {
  return logService(service, 'warn', message, detail);
}

export function logError(service, message, detail) {
  return logService(service, 'error', message, detail);
}
