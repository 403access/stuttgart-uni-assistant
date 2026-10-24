import { ILIAS_BASE, ILIAS_LOGIN_URL, ILIAS_USER_AGENT } from './constants.mjs';
import { CookieJar, setCookieValues } from './cookies.mjs';
import { parseIliasDashboard } from './dashboard.mjs';
import { attributesOf, looksLikeIliasLogin, textOf } from './markup.mjs';
import { iliasLoginName, mask, resolveUrl } from './util.mjs';

/**
 * The standard login form. ILIAS names its inputs `login_form/input_3/input_4`
 * (user) and `…/input_5` (password); the numbers can change, so the names are
 * read from the page instead of being hard-coded.
 */
export function parseIliasLoginForm(html) {
  const source = String(html ?? '');
  const open = source.match(/<form\b[^>]*(?:name\s*=\s*["']login_form["']|doStandardAuthentication)[^>]*>/i);
  if (!open || open.index === undefined) return null;
  const start = open.index + open[0].length;
  const end = source.indexOf('</form>', start);
  if (end < 0) return null;
  const body = source.slice(start, end);
  const tag = open[0];
  const attributes = attributesOf(tag);
  const inputs = [...body.matchAll(/<input\b[^>]*>/gi)].map((match) => attributesOf(match[0]));
  const password = inputs.find((input) => (input.type || '').toLowerCase() === 'password' && input.name);
  const username =
    inputs.find((input) => ['text', 'email', 'tel'].includes((input.type || '').toLowerCase()) && /input_\d+$/.test(input.name ?? '')) ??
    inputs.find((input) => ['text', 'email', 'tel'].includes((input.type || '').toLowerCase()) && input.name);
  if (!password?.name || !username?.name) return null;
  return {
    action: resolveUrl(ILIAS_BASE, attributes.action || ILIAS_LOGIN_URL),
    method: (attributes.method || 'post').toUpperCase(),
    enctype: attributes.enctype || '',
    usernameField: username.name,
    passwordField: password.name,
    inputs,
  };
}

/** A rejection text from a re-rendered login page, without any credential. */
export function iliasLoginError(html) {
  const source = String(html ?? '');
  for (const alert of source.matchAll(/<div[^>]*class\s*=\s*["'][^"']*(?:alert-danger|ilFormError|ilMessage)[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi)) {
    if (/display\s*:\s*none|hidden\b/i.test(alert[0].slice(0, alert[0].indexOf('>') + 1))) continue;
    const text = textOf(alert[1]);
    if (text) return text.slice(0, 300);
  }
  const match = source.match(/(Anmeldename und\/oder Passwort[^<]{0,140}|Ung(?:ü|u)ltige[^<]{0,140}|Login failed[^<]{0,140}|Authentifizierung[^<]{0,140})/i);
  return match ? textOf(match[1]).slice(0, 300) : '';
}

/* ------------------------------------------------------------------ login -- */

function loginHeaders(jar, referer) {
  return {
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
    'User-Agent': ILIAS_USER_AGENT,
    Origin: ILIAS_BASE,
    Referer: referer || ILIAS_LOGIN_URL,
    ...(jar.header() ? { Cookie: jar.header() } : {}),
  };
}

function formBody(form, account, password) {
  const body = new FormData();
  for (const input of form.inputs) {
    const type = (input.type || '').toLowerCase();
    if (!input.name || ['submit', 'image', 'button', 'reset', 'file', 'password'].includes(type)) continue;
    if ((type === 'checkbox' || type === 'radio') && !input.checked) continue;
    if (input.name === form.usernameField) continue;
    body.append(input.name, input.value ?? '');
  }
  body.append(form.usernameField, account);
  body.append(form.passwordField, password);
  return body;
}

/**
 * Sign in with the standard form. Resolves to
 * `{ ok, reason, account, cookie, dashboard, loginUrl, steps }`; `cookie`
 * carries `PHPSESSID`, never the password.
 */
export async function loginIlias({ account, password, fetchImpl = fetch, loginUrl = ILIAS_LOGIN_URL, log = () => {} }) {
  const user = iliasLoginName(account);
  const secret = String(password ?? '');
  if (!user || !secret) return { ok: false, reason: 'credentials_missing', steps: [] };

  const jar = new CookieJar();
  const steps = [];
  try {
    log(`    GET login page`);
    const pageResponse = await fetchImpl(loginUrl, { redirect: 'manual', headers: loginHeaders(jar) });
    jar.update(setCookieValues(pageResponse));
    const pageHtml = await pageResponse.text();
    const form = parseIliasLoginForm(pageHtml);
    if (!form) {
      const rejection = iliasLoginError(pageHtml);
      return {
        ok: false,
        reason: rejection ? 'rejected' : 'login_form_missing',
        rejection,
        cookie: jar.value('PHPSESSID'),
        steps,
      };
    }
    steps.push('login-form');

    log(`    POST ${form.action} user=${mask(user)} fields=${form.usernameField}/${form.passwordField}`);
    const response = await fetchImpl(form.action, {
      method: 'POST',
      redirect: 'manual',
      headers: loginHeaders(jar, loginUrl),
      body: formBody(form, user, secret),
    });
    jar.update(setCookieValues(response));
    steps.push(`post-${response.status}`);

    let html = '';
    let finalUrl = form.action;
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) {
        return { ok: false, reason: 'redirect_without_location', cookie: jar.value('PHPSESSID'), steps };
      }
      finalUrl = resolveUrl(form.action, location);
      log(`    ${response.status} → ${finalUrl}`);
      // Follow at most a few redirects so a SAML fallback cannot loop forever.
      let current = finalUrl;
      for (let hop = 0; hop < 4; hop += 1) {
        const next = await fetchImpl(current, { redirect: 'manual', headers: loginHeaders(jar) });
        jar.update(setCookieValues(next));
        const nextLocation = next.headers.get('location');
        if (next.status >= 300 && next.status < 400 && nextLocation) {
          current = resolveUrl(current, nextLocation);
          steps.push(`redirect-${hop + 1}`);
          continue;
        }
        html = await next.text();
        finalUrl = current;
        break;
      }
    } else {
      html = await response.text();
    }

    steps.push('redirected');
    if (!html || looksLikeIliasLogin(html)) {
      const rejection = iliasLoginError(html) || 'login_rejected';
      return { ok: false, reason: 'rejected', rejection, cookie: jar.value('PHPSESSID'), steps, finalUrl };
    }
    if (!/block_|il-mainbar|il-page-content-header/i.test(html)) {
      return { ok: false, reason: 'dashboard_missing', cookie: jar.value('PHPSESSID'), steps, finalUrl };
    }

    steps.push('dashboard');
    const dashboard = parseIliasDashboard(html);
    return {
      ok: true,
      reason: 'signed-in',
      account: user,
      loginName: user,
      cookie: jar.value('PHPSESSID'),
      cookies: jar.header(),
      dashboard,
      steps,
      finalUrl,
    };
  } catch (error) {
    return {
      ok: false,
      reason: `request_failed: ${String(error?.message ?? error).slice(0, 160)}`,
      cookie: jar.value('PHPSESSID'),
      steps,
    };
  }
}
