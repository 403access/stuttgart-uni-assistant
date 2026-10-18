import { Platform } from 'react-native';

export {
  DIAGNOSE_JS,
  HARVEST_JS,
  HEADLESS_MAX_SUBMITS_PER_PAGE,
  HEADLESS_MAX_SUBMITS_PER_RUN,
  HEADLESS_SUBMIT_COOLDOWN_MS,
  headlessAutofillScript,
  headlessDumpScript,
} from '@/src/auth/campus-browser-scripts';

export const CAMPUS_START_URL = 'https://campus.uni-stuttgart.de/cusonline/';
export const CAMPUS_COOKIE_URL = 'https://campus.uni-stuttgart.de/cusonline/';

export interface NativeCookies {
  header: string;
  names: string[];
}

export const NO_NATIVE_COOKIES: NativeCookies = { header: '', names: [] };

/**
 * Read the cookie store of the WebView natively. `document.cookie` never shows
 * `HttpOnly` cookies, and C@MPUS needs `PSESSIONID` (HttpOnly) next to the
 * bearer token. On iOS that store is the WebKit one the WebView itself uses.
 */
export async function readNativeCampusCookies(): Promise<NativeCookies> {
  if (Platform.OS === 'web') return NO_NATIVE_COOKIES;
  try {
    const { default: CookieManager } = await import('@preeternal/react-native-cookie-manager');
    const cookies = await CookieManager.getAsArray(
      CAMPUS_COOKIE_URL,
      Platform.OS === 'ios' ? { iosCookieStore: 'webKit' } : undefined,
    );
    return {
      header: cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; '),
      names: cookies.map((cookie) => cookie.name),
    };
  } catch (caught) {
    console.info('[campus-cookies] native read failed', caught instanceof Error ? caught.message : String(caught));
    return NO_NATIVE_COOKIES;
  }
}

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
