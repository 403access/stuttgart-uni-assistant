import { ILIAS_BASE } from './constants.mjs';

export function resolveUrl(base, location) {
  return new URL(location, base).toString();
}

export function mask(value) {
  const text = String(value ?? '');
  if (!text) return '(empty)';
  return `${text.slice(0, 3)}…(${text.length})`;
}

/**
 * ILIAS and C@MPUS share the password, but ILIAS expects the login name
 * without the mail domain: `st206509@stud.uni-stuttgart.de` → `st206509`.
 */
export function iliasLoginName(value) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  const at = text.indexOf('@');
  return (at > 0 ? text.slice(0, at) : text).trim();
}

export function safeContentKind(value) {
  return /^[a-z]{2,8}$/i.test(String(value ?? '')) ? String(value).toLowerCase() : 'crs';
}

/** The client may hand back a members link; never send the cookie anywhere else. */
export function isIliasUrl(value) {
  try {
    return new URL(String(value)).host === new URL(ILIAS_BASE).host;
  } catch {
    return false;
  }
}
