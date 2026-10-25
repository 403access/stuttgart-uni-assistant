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
    return tx(locale, 'loginMessages.assistenz');
  }
  if (code === 'token_missing') {
    return tx(locale, 'loginMessages.env');
  }
  if (code === 'missing_session_cookie') {
    return tx(locale, 'loginMessages.c_mpus_hat');
  }
  if (code === 'invalid_token') {
    return tx(locale, 'loginMessages.c_mpus_meldet');
  }
  if (code === 'no_credentials_found') {
    return tx(locale, 'loginMessages.browser');
  }
  if (code === 'campus_unauthorized') {
    return tx(locale, 'loginMessages.c_mpus', [suffix]);
  }
  return tx(locale, 'loginMessages.c', [code, suffix]);
}

/** The subset of the OIDC status the copy depends on. */
export interface OidcStatusLike {
  configured: boolean;
  loginHintSet: boolean;
}

export function messageFor(locale: Locale, code: string, status: OidcStatusLike | null): string {
  if (code === 'cancelled') return tx(locale, 'loginMessages.anmeldung');
  if (code === 'oidc_unconfigured') {
    return tx(locale, 'loginMessages.server');
  }
  if (code === 'redirect_rejected') {
    return tx(locale, 'loginMessages.redirect');
  }
  if (!status) {
    return tx(locale, 'loginMessages.anmeldungs');
  }
  return tx(locale, 'loginMessages.anmeldung_abgeschlossen', [code]);
}
