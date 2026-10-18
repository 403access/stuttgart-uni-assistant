/**
 * Build the payload the assistant server validates from a WebView message, and
 * the diagnostic lines the visible browser shows. Pure: no React Native import.
 */

import type { HarvestMessage } from '@/src/auth/login-messages';
import { tx } from '@/src/text';
import type { Locale } from '@/src/types';

/** Caps from the page scripts and the credentials route. */
const KEY_LIMIT = 120;
const VALUE_LIMIT = 4000;

/** Join cookie strings; the first value per name wins, so the native store fills the HttpOnly gaps. */
export function mergeCookieStrings(...parts: string[]): string {
  const seen = new Set<string>();
  const pairs: string[] = [];
  for (const part of parts) {
    for (const pair of part.split(';')) {
      const trimmed = pair.trim();
      if (!trimmed) continue;
      const separator = trimmed.indexOf('=');
      const name = (separator > 0 ? trimmed.slice(0, separator) : trimmed).trim().toLowerCase();
      if (seen.has(name)) continue;
      seen.add(name);
      pairs.push(trimmed);
    }
  }
  return pairs.join('; ');
}

export interface BrowserHarvest {
  cookies: string;
  storage: Record<string, string>;
}

/**
 * The in-page harvest puts every storage entry under `local:`/`session:`. Keep
 * only non-empty strings, trimmed to the caps the server expects, and merge the
 * natively read cookies (which include the `HttpOnly` session cookie that
 * `document.cookie` cannot see).
 */
export function buildHarvest(parsed: HarvestMessage, nativeCookieHeader: string): BrowserHarvest {
  const storage: Record<string, string> = {};
  if (parsed.storage && typeof parsed.storage === 'object') {
    for (const [key, value] of Object.entries(parsed.storage as Record<string, unknown>)) {
      if (typeof value === 'string' && value) storage[String(key).slice(0, KEY_LIMIT)] = value.slice(0, VALUE_LIMIT);
    }
  }
  const cookies = mergeCookieStrings(typeof parsed.cookies === 'string' ? parsed.cookies : '', nativeCookieHeader);
  return { cookies, storage };
}

/** The lines the visible browser shows after `Speicher diagnostizieren`. */
export function diagnoseLines(locale: Locale, parsed: HarvestMessage, nativeCookieNames: string[]): string[] {
  const names = (value: unknown): string => (Array.isArray(value) && value.length ? value.map(String).join(', ') : '–');
  return [
    `${tx(locale, 'campusHarvest.seite')}: ${typeof parsed.url === 'string' ? parsed.url.slice(0, 120) : '–'}`,
    `${tx(locale, 'campusHarvest.cookies')}: ${names(parsed.cookies)}`,
    `${tx(locale, 'campusHarvest.cookies_nativ')}: ${nativeCookieNames.length ? nativeCookieNames.join(', ') : '–'}`,
    `localStorage: ${names(parsed.local)}`,
    `sessionStorage: ${names(parsed.session)}`,
  ];
}
