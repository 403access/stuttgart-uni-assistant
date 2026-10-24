import { ILIAS_CLIENT_ID } from './constants.mjs';

/* ------------------------------------------------------------ cookie jar -- */

/** Cookies keyed by name; enough for one host and one login flow. */
export class CookieJar {
  constructor() {
    this.cookies = new Map();
  }

  update(setCookieValues) {
    for (const raw of setCookieValues) {
      const [pair, ...attributes] = String(raw).split(';');
      const separator = pair.indexOf('=');
      if (separator < 0) continue;
      const name = pair.slice(0, separator).trim();
      const value = pair.slice(separator + 1).trim();
      if (!name) continue;
      const cleared = attributes.some(
        (attribute) => /^\s*max-age\s*=\s*0\s*$/i.test(attribute) || /^\s*expires\s*=\s*thu, 01 jan 1970/i.test(attribute),
      );
      if (cleared || !value) this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
  }

  header() {
    return [...this.cookies].map(([name, value]) => `${name}=${value}`).join('; ');
  }

  value(name) {
    return this.cookies.get(name) ?? '';
  }

  names() {
    return [...this.cookies.keys()].sort();
  }

  describe() {
    return this.names().map((name) => `${name}(${this.value(name).length})`).join(', ');
  }
}

export function setCookieValues(response) {
  if (typeof response.headers.getSetCookie === 'function') return response.headers.getSetCookie();
  const single = response.headers.get('set-cookie');
  return single ? [single] : [];
}

/**
 * A stored ILIAS cookie. A bare value is treated as `PHPSESSID`; the client id
 * is added because ILIAS scopes its session to the installation.
 */
export function normalizeIliasCookie(value) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  if (text.includes('=')) return text;
  return `ilClientId=${ILIAS_CLIENT_ID}; PHPSESSID=${text}`;
}
