/**
 * Text and message shapes of the sign-in screen. Pure: no React Native import,
 * so the mappings are unit-testable (scripts/campus-login-messages.test.mjs).
 */

import { tx } from '@/src/text';
import type { Locale } from '@/src/types';

/** One message from either WebView. Every field the page scripts can send. */
export interface HarvestMessage {
  diagnostic?: boolean;
  headless?: boolean;
  step?: unknown;
  error?: unknown;
  url?: unknown;
  title?: unknown;
  label?: unknown;
  href?: unknown;
  attempt?: unknown;
  clicks?: unknown;
  reason?: unknown;
  user?: unknown;
  submit?: unknown;
  cookies?: unknown;
  local?: unknown;
  session?: unknown;
  storage?: unknown;
  passwordInputs?: unknown;
  userLength?: unknown;
  passwordLength?: unknown;
  formCount?: unknown;
  readyState?: unknown;
  passwordDisplay?: unknown;
  passwordSize?: unknown;
  submits?: unknown;
  total?: unknown;
  forms?: unknown;
  controls?: unknown;
}

/** The page scripts post JSON strings; anything else is not a message. */
export function parseHarvestMessage(raw: unknown): HarvestMessage | null {
  if (typeof raw !== 'string' || !raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return parsed as HarvestMessage;
  } catch {
    return null;
  }
}

/** Host of a page URL for the progress detail, without relying on a URL polyfill. */
export function hostOf(value: unknown): string {
  if (typeof value !== 'string') return '';
  const match = /^https?:\/\/([^/?#]+)/i.exec(value);
  return match ? match[1] : '';
}

/** Human-readable form of the identity-provider page dump for the log and the modal. */
export function formatDump(parsed: Pick<HarvestMessage, 'url' | 'title' | 'forms' | 'controls' | 'error'>): string {
  const forms = Array.isArray(parsed.forms) ? (parsed.forms as { action?: unknown; method?: unknown; html?: unknown }[]) : [];
  const controls = Array.isArray(parsed.controls) ? parsed.controls.map(String) : [];
  const lines = [
    `URL: ${typeof parsed.url === 'string' ? parsed.url : '–'}`,
    `TITLE: ${typeof parsed.title === 'string' ? parsed.title : '–'}`,
    `ERROR: ${typeof parsed.error === 'string' ? parsed.error : '–'}`,
    `CONTROLS:\n  ${controls.join('\n  ') || '–'}`,
  ];
  forms.forEach((form, index) => {
    lines.push(
      `FORM ${index + 1} method=${typeof form.method === 'string' ? form.method : '?'} action=${typeof form.action === 'string' ? form.action : '?'}`,
      typeof form.html === 'string' ? form.html : '–',
    );
  });
  return lines.join('\n');
}

/** Server code from the C@MPUS routes to a sentence a student can act on. */
export function campusMessage(locale: Locale, code: string, detail = ''): string {
  const suffix = detail ? ` ${detail}` : '';
  if (code === 'server_unreachable') {
    return tx(
      locale,
      'Der Assistenz-Server auf http://127.0.0.1:8787 antwortet nicht. Port 8081 ist nur die App. Starte im Projektordner: npm run assistant',
      'The assistant server at http://127.0.0.1:8787 is not answering. Port 8081 is only the app. In the project directory run: npm run assistant',
    );
  }
  if (code === 'token_missing') {
    return tx(locale, 'In der .env fehlt CAMPUS_BEARER_TOKEN. Server neu starten, nachdem der Wert gesetzt ist.', 'CAMPUS_BEARER_TOKEN is missing from .env. Restart the server after setting it.');
  }
  if (code === 'missing_session_cookie') {
    return tx(
      locale,
      'C@MPUS hat den Token erhalten und verlangt zusätzlich das Cookie PSESSIONID derselben Anmeldung. Setze nur diesen Wert als CAMPUS_SESSION_COOKIE in der .env und starte den Server neu.',
      'C@MPUS received the token and also requires the PSESSIONID cookie from that same login. Set only that value as CAMPUS_SESSION_COOKIE in .env and restart the server.',
    );
  }
  if (code === 'invalid_token') {
    return tx(
      locale,
      'C@MPUS meldet invalid_token. CAMPUS_BEARER_TOKEN ist abgelaufen oder gehört nicht zu diesem PSESSIONID. Setze einen neuen Token aus derselben Anmeldung und starte den Server neu.',
      'C@MPUS reports invalid_token. CAMPUS_BEARER_TOKEN has expired or does not belong to this PSESSIONID. Set a new token from the same login and restart the server.',
    );
  }
  if (code === 'no_credentials_found') {
    return tx(
      locale,
      'Aus dem Browser kam nichts Verwertbares an (Sitzungs-Cookie oft HttpOnly, kein Token im Speicher). Nutze den Token-Ablauf: C@MPUS im Browser öffnen, Token aus den Entwicklerwerkzeugen kopieren, per npm run campus:token setzen.',
      'Nothing usable came from the browser (the session cookie is often HttpOnly, no token in storage). Use the token flow instead: open C@MPUS in the browser, copy the token from devtools, set it with npm run campus:token.',
    );
  }
  if (code === 'campus_unauthorized') {
    return tx(locale, `C@MPUS hat den Token abgelehnt.${suffix}`, `C@MPUS rejected the token.${suffix}`);
  }
  return tx(locale, `C@MPUS-Anmeldung nicht abgeschlossen (${code}).${suffix}`, `C@MPUS sign-in did not finish (${code}).${suffix}`);
}

/** The subset of the OIDC status the copy depends on. */
export interface OidcStatusLike {
  configured: boolean;
  loginHintSet: boolean;
}

export function messageFor(locale: Locale, code: string, status: OidcStatusLike | null): string {
  if (code === 'cancelled') return tx(locale, 'Anmeldung abgebrochen.', 'Sign-in cancelled.');
  if (code === 'oidc_unconfigured') {
    return tx(
      locale,
      'Im Server fehlt OIDC_CLIENT_ID oder OIDC_CLIENT_SECRET. Beides trägt das TIK ein, nachdem der Dienst registriert wurde.',
      'The server is missing OIDC_CLIENT_ID or OIDC_CLIENT_SECRET. TIK issues both after the service is registered.',
    );
  }
  if (code === 'redirect_rejected') {
    return tx(locale, 'Diese Redirect-Adresse lässt der lokale Server nicht zu.', 'The local server rejected this redirect address.');
  }
  if (!status) {
    return tx(locale, 'Der Anmeldungs-Server ist nicht erreichbar. Läuft npm run assistant?', 'The sign-in server is unreachable. Is npm run assistant running?');
  }
  return tx(locale, `Anmeldung nicht abgeschlossen (${code}).`, `Sign-in did not finish (${code}).`);
}
