/**
 * Client-side ILIAS page reads.
 *
 * The assistant server no longer walks ILIAS for every user. The app keeps the
 * PHPSESSID in its WebView cookie store and injects a small `fetch` into a
 * hidden page on `ilias3.uni-stuttgart.de`; the harvested HTML is posted to the
 * server, which parses and caches it. This module owns the pure parts: cookie
 * seeding, the injected script, and the bridge the provider registers.
 */

import { Platform } from 'react-native';

import { assistantUrl } from '@/src/assistant/remote';
import { authHeaders } from '@/src/auth/session';

export const ILIAS_BASE = 'https://ilias3.uni-stuttgart.de';
export const ILIAS_DASHBOARD_URL = `${ILIAS_BASE}/ilias.php?baseClass=ilDashboardGUI&cmd=jumpToSelectedItems`;

/** Repository pages are reachable by object kind and ref id, e.g. `/go/crs/4590579`. */
export function iliasRepositoryUrl(kind: string, refId: number): string {
  return `${ILIAS_BASE}/go/${kind}/${refId}`;
}

export interface IliasPageResult {
  html: string;
  url: string;
  status: number;
}

export type IliasPageFetcher = (url: string) => Promise<IliasPageResult>;

let pageFetcher: IliasPageFetcher | null = null;
let fetcherWaiters: ((fetcher: IliasPageFetcher | null) => void)[] = [];

/** The provider mounts the hidden WebView and registers its fetch here. */
export function registerIliasPageFetcher(fetcher: IliasPageFetcher | null): void {
  pageFetcher = fetcher;
  const waiters = fetcherWaiters;
  fetcherWaiters = [];
  for (const resolve of waiters) resolve(fetcher);
}

/**
 * True on a platform with an injectable WebView. Registration follows the
 * provider's first effect, so a caller may have to wait a tick.
 */
export function iliasHeadlessReady(): boolean {
  return Platform.OS !== 'web';
}

export async function fetchIliasPage(url: string): Promise<IliasPageResult> {
  if (!pageFetcher && iliasHeadlessReady()) {
    // Child effects can request a page before the root provider's effect has
    // registered. Wait briefly instead of falling back to a server fetch.
    pageFetcher = await new Promise<IliasPageFetcher | null>((resolve) => {
      const timer = setTimeout(() => resolve(null), 2000);
      fetcherWaiters.push((fetcher) => {
        clearTimeout(timer);
        resolve(fetcher);
      });
    });
  }
  if (!pageFetcher) throw new Error('ilias_headless_unavailable');
  return pageFetcher(url);
}

/** The page ILIAS renders instead of a signed-in view. */
export function looksLikeIliasLoginHtml(html: string): boolean {
  const text = String(html ?? '');
  return /name\s*=\s*["']login_form["']/i.test(text) || /doStandardAuthentication/i.test(text);
}

/**
 * The script injected into the hidden ILIAS page. A same-origin `fetch` sends
 * the WebView cookie automatically, follows redirects, and hands the final HTML
 * back through the bridge.
 */
export function iliasFetchScript(url: string, id: string): string {
  return `(function(){
  // Android's WebView bridge is a Binder transaction, so a multi-megabyte page
  // is sent in chunks and reassembled by the provider.
  var CHUNK = 200000;
  function post(message){
    try { window.ReactNativeWebView.postMessage(JSON.stringify(message)); } catch (e) {}
  }
  function postPage(response, html){
    var total = Math.max(1, Math.ceil(html.length / CHUNK));
    if (total > 24) {
      post({ ilias: 'page', id: ${JSON.stringify(id)}, ok: false, status: response.status, url: response.url || ${JSON.stringify(url)}, error: 'ilias_page_too_large' });
      return;
    }
    var finalUrl = response.url || ${JSON.stringify(url)};
    for (var index = 0; index < total; index += 1) {
      post({
        ilias: 'page',
        id: ${JSON.stringify(id)},
        chunk: html.slice(index * CHUNK, (index + 1) * CHUNK),
        index: index,
        total: total,
        ok: response.ok,
        status: response.status,
        url: finalUrl
      });
    }
  }
  try {
    fetch(${JSON.stringify(url)}, {
      credentials: 'include',
      redirect: 'follow',
      headers: { 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' }
    }).then(function(response){
      return response.text().then(function(html){ postPage(response, html); });
    }).catch(function(error){
      post({ ilias: 'page', id: ${JSON.stringify(id)}, ok: false, status: 0, url: ${JSON.stringify(url)}, error: String(error && error.message ? error.message : error).slice(0, 300) });
    });
  } catch (error) {
    post({ ilias: 'page', id: ${JSON.stringify(id)}, ok: false, status: 0, url: ${JSON.stringify(url)}, error: String(error).slice(0, 300) });
  }
  return true;
})();`;
}

/* --------------------------------------------------------------- cookies -- */

interface CookieCache {
  header: string;
  at: number;
}

const COOKIE_CACHE_MS = 60_000;
let cookieCache: CookieCache | null = null;

function cookiePairs(header: string): { name: string; value: string }[] {
  const pairs: { name: string; value: string }[] = [];
  for (const part of String(header ?? '').split(';')) {
    const trimmed = part.trim();
    const separator = trimmed.indexOf('=');
    if (separator <= 0) continue;
    const name = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    if (name) pairs.push({ name, value });
  }
  return pairs;
}

/** Put the server's PHPSESSID into the native WebView cookie store. */
export async function seedIliasCookies(header: string): Promise<boolean> {
  const text = String(header ?? '').trim();
  if (!text) return false;
  cookieCache = { header: text, at: Date.now() };
  if (Platform.OS === 'web') return false;
  try {
    const { default: CookieManager } = await import('@preeternal/react-native-cookie-manager');
    const url = `${ILIAS_BASE}/`;
    for (const pair of cookiePairs(text)) {
      const cookie = {
        name: pair.name,
        value: pair.value,
        path: '/',
        domain: 'ilias3.uni-stuttgart.de',
        secure: true,
      };
      try {
        await CookieManager.set(url, cookie, Platform.OS === 'ios' ? { iosCookieStore: 'webKit' } : undefined);
      } catch {
        // A rejected cookie (e.g. an expired one) must not abort the others.
      }
    }
    await CookieManager.flush().catch(() => undefined);
    return true;
  } catch {
    return false;
  }
}

export async function clearIliasCookies(): Promise<void> {
  cookieCache = null;
  if (Platform.OS === 'web') return;
  try {
    const { default: CookieManager } = await import('@preeternal/react-native-cookie-manager');
    const url = `${ILIAS_BASE}/`;
    const options = Platform.OS === 'ios' ? { iosCookieStore: 'webKit' as const } : undefined;
    for (const name of ['PHPSESSID', 'ilClientId']) {
      await CookieManager.clearByName(url, name, options).catch(() => undefined);
    }
    await CookieManager.flush().catch(() => undefined);
  } catch {
    // Nothing to clear when the native module is unavailable.
  }
}

/**
 * Read the current session cookie from the server and seed it into the
 * WebView. The cookie is cached briefly so a screen with several content rows
 * does not ask the server for it per page.
 */
export async function ensureIliasCookies(options: { token?: string | null; refresh?: boolean } = {}): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (!options.refresh && cookieCache && Date.now() - cookieCache.at < COOKIE_CACHE_MS) return true;
  try {
    const response = await fetch(`${assistantUrl.replace(/\/$/, '')}/v1/ilias/session`, {
      headers: options.token ? { Authorization: `Bearer ${options.token}` } : authHeaders(),
    });
    if (!response.ok) return false;
    const payload = (await response.json().catch(() => ({}))) as { cookies?: unknown };
    if (typeof payload.cookies !== 'string' || !payload.cookies) return false;
    return await seedIliasCookies(payload.cookies);
  } catch {
    return false;
  }
}
