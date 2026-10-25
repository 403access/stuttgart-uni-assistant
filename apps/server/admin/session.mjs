/** Dashboard token, cookie, and request authorization. */

import { createHash, timingSafeEqual } from 'node:crypto';

export const ADMIN_COOKIE = 'ua_admin';
const ADMIN_COOKIE_MAX_AGE = 12 * 60 * 60;

export function adminToken() {
  return (process.env.DASHBOARD_TOKEN || '').trim();
}

export function adminConfigured() {
  return Boolean(adminToken());
}

function digest(value) {
  return createHash('sha256').update(String(value)).digest();
}

export function adminTokenMatches(value) {
  const expected = adminToken();
  if (!expected || typeof value !== 'string' || !value.trim()) return false;
  return timingSafeEqual(digest(value.trim()), digest(expected));
}

export function parseCookies(header) {
  if (typeof header !== 'string' || !header) return {};
  const out = {};
  for (const part of header.split(';')) {
    const splitAt = part.indexOf('=');
    if (splitAt < 1) continue;
    const name = part.slice(0, splitAt).trim();
    const value = part.slice(splitAt + 1).trim();
    if (!name) continue;
    try {
      out[name] = decodeURIComponent(value);
    } catch {
      out[name] = value;
    }
  }
  return out;
}

export function adminAuthorized(request) {
  const cookies = parseCookies(request?.headers?.cookie);
  return adminTokenMatches(cookies[ADMIN_COOKIE]);
}

export function adminCookie(token, secure = false) {
  const parts = [
    `${ADMIN_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${ADMIN_COOKIE_MAX_AGE}`,
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export function clearAdminCookie() {
  return `${ADMIN_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;
}
