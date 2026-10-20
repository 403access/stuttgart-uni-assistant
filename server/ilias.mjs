/**
 * ILIAS at Universität Stuttgart: the standard login form over plain HTTPS and
 * the dashboard blocks a signed-in browser would render.
 *
 * The portal has no public JSON API for students. The login is a normal form
 * post (`ilstartupgui` → `doStandardAuthentication`) that answers with a
 * redirect and the `PHPSESSID` cookie; every read afterwards is an authenticated
 * HTML page. This module owns that flow so the terminal probe, the assistant
 * server, and the tests all exercise the same code.
 *
 * Credentials are never logged, stored, or returned. A successful login hands
 * back only the cookie plus the parsed dashboard.
 */

import { clearIliasSource, getDb, loadIliasSource, saveIliasSnapshot, saveIliasSource } from './db.mjs';

export const ILIAS_BASE = 'https://ilias3.uni-stuttgart.de';
export const ILIAS_LOGIN_URL = `${ILIAS_BASE}/ilias.php?baseClass=ilstartupgui&cmd=post&fallbackCmd=doStandardAuthentication`;
export const ILIAS_DASHBOARD_URL = `${ILIAS_BASE}/ilias.php?baseClass=ilDashboardGUI&cmd=jumpToSelectedItems`;
export const ILIAS_CLIENT_ID = 'Uni_Stuttgart';
export const ILIAS_USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36';

/** Per-user cookies. Memory only: a server restart asks the user to reconnect. */
const userSessions = new Map();

/* --------------------------------------------------------------- messages -- */

export function iliasError(status, code, detail) {
  const error = new Error(code);
  error.status = status;
  if (detail) error.detail = String(detail).slice(0, 300);
  return error;
}

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

export function resolveUrl(base, location) {
  return new URL(location, base).toString();
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

/* ---------------------------------------------------------------- markup -- */

function decodeEntities(value) {
  const named = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
    auml: 'ä', ouml: 'ö', uuml: 'ü', Auml: 'Ä', Ouml: 'Ö', Uuml: 'Ü', szlig: 'ß',
    euro: '€', ndash: '–', mdash: '—', hellip: '…', middot: '·', times: '×',
    bdquo: '„', ldquo: '“', rdquo: '”', sbquo: '‚', lsquo: '‘', rsquo: '’',
    laquo: '«', raquo: '»', copy: '©', reg: '®', trade: '™', deg: '°', plusmn: '±', sup2: '²', sup3: '³',
  };
  return String(value ?? '').replace(/&(#x?[0-9a-f]+|[a-z][a-z0-9]+);/gi, (match, entity) => {
    if (entity[0] === '#') {
      const hex = entity[1]?.toLowerCase() === 'x';
      const code = Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return named[entity] ?? named[entity.toLowerCase()] ?? match;
  });
}

/** Visible text of a fragment: tags stripped, entities decoded, whitespace collapsed. */
export function textOf(value) {
  return decodeEntities(
    String(value ?? '')
      .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .trim();
}

function attributesOf(tag) {
  const attributes = {};
  for (const match of String(tag).matchAll(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)')/g)) {
    attributes[match[1].toLowerCase()] = decodeEntities(match[3] ?? match[4] ?? '');
  }
  return attributes;
}

/** True for the page a signed-out visitor sees instead of the dashboard. */
export function looksLikeIliasLogin(html) {
  const text = String(html ?? '');
  return /name\s*=\s*["']login_form["']/i.test(text) || /doStandardAuthentication/i.test(text);
}

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

/** Name and login from the user menu; absent until the dashboard is rendered. */
export function parseIliasIdentity(html) {
  const match = String(html ?? '').match(/Profil und Datenschutz\s*·\s*([^<[\]]+?)\s*\[([^\]]+)\]/i);
  if (!match) return { name: null, account: null };
  return { name: textOf(match[1]) || null, account: textOf(match[2]) || null };
}

/* -------------------------------------------------------------- dashboard -- */

function blockSegments(html) {
  const source = String(html ?? '');
  const matches = [...source.matchAll(/<div\s+id\s*=\s*["'](block_[^"']+)["']/gi)];
  return matches.map((match, index) => ({
    id: match[1],
    html: source.slice(match.index ?? 0, matches[index + 1]?.index ?? source.length),
  }));
}

const TYPE_LABELS = {
  crs: 'Kurs', grp: 'Gruppe', lm: 'Lernmodul', cat: 'Kategorie', file: 'Datei',
  frm: 'Forum', exc: 'Übung', tst: 'Test', fold: 'Ordner', sess: 'Termin',
};

function parseProperties(segment) {
  const properties = [];
  for (const match of String(segment).matchAll(
    /<span[^>]*class\s*=\s*["'][^"']*il-item-property-name[^"']*["'][^>]*>([\s\S]*?)<\/span>\s*<span[^>]*class\s*=\s*["'][^"']*il-item-property-value[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi,
  )) {
    const name = textOf(match[1]);
    const value = textOf(match[2]);
    if (name || value) properties.push({ name, value });
  }
  return properties;
}

function itemFromSegment(segment, index) {
  const titleHtml = segment.match(/<h4[^>]*class\s*=\s*["'][^"']*il-item-title[^"']*["'][^>]*>([\s\S]*?)<\/h4>/i)?.[1] ?? '';
  const link = titleHtml.match(/<a\b[^>]*>/i);
  const href = link ? attributesOf(link[0]).href ?? '' : '';
  const title = textOf(titleHtml);
  if (!title && !href) return null;
  const url = href ? resolveUrl(ILIAS_BASE, href) : '';
  const refMatch = url.match(/\/go\/([a-z]+)\/(\d+)/i) ?? url.match(/[?&]ref_id=(\d+)/i) ?? null;
  const kind = refMatch && /\/go\//i.test(url) ? refMatch[1].toLowerCase() : '';
  const refId = refMatch ? Number(refMatch[2] ?? refMatch[1]) : null;
  const alt = segment.match(/<img\b[^>]*\balt\s*=\s*["']([^"']+)["'][^>]*>/i)?.[1] ?? '';
  const type = TYPE_LABELS[kind] || textOf(alt) || '';
  const description = textOf(segment.match(/<div[^>]*class\s*=\s*["'][^"']*il-item-description[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? '');
  const properties = parseProperties(segment);
  const property = (name) => properties.find((entry) => entry.name.toLowerCase() === name.toLowerCase())?.value ?? '';
  const newsId = Number(url.match(/[?&]news_id=(\d+)/)?.[1] ?? 0) || null;
  const mailId = Number(url.match(/[?&]mail_id=(\d+)/)?.[1] ?? 0) || null;
  return {
    id: newsId ? `news-${newsId}` : mailId ? `mail-${mailId}` : refId ? `${kind || 'ref'}-${refId}` : `item-${index}`,
    kind: kind || (newsId ? 'news' : mailId ? 'mail' : 'item'),
    type,
    refId,
    newsId,
    mailId,
    title,
    description,
    url,
    group: '',
    properties,
    date: property('Datum') || property('Zeit') || '',
  };
}

function itemsFromBlock(block) {
  const source = String(block ?? '');
  const groupParts = source.split(/<div[^>]*class\s*=\s*["'][^"']*il-item-group(?![\w-])[^"']*["'][^>]*>/i);
  const groups = groupParts.length > 1 ? groupParts.slice(1) : [source];
  const items = [];
  for (const group of groups) {
    const groupName = textOf(group.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i)?.[1] ?? '');
    const rows = group.split(/<li[^>]*class\s*=\s*["'][^"']*il-std-item-container[^"']*["'][^>]*>/i).slice(1);
    for (const [index, row] of rows.entries()) {
      const item = itemFromSegment(row, `${items.length}-${index}`);
      if (item) {
        item.group = groupName;
        items.push(item);
      }
    }
  }
  return items;
}

/**
 * Parse the dashboard blocks. Anything the portal does not render (empty
 * favourites, "no To-Dos") simply yields an empty list.
 */
export function parseIliasDashboard(html, fetchedAt = new Date().toISOString()) {
  const source = String(html ?? '');
  const identity = parseIliasIdentity(source);
  const blocks = blockSegments(source);
  const block = (...prefixes) => blocks.find((entry) => prefixes.some((prefix) => entry.id.startsWith(prefix)))?.html ?? '';
  const memberships = itemsFromBlock(block('block_dash_mem'));
  const news = itemsFromBlock(block('block_pdnews'));
  const mails = itemsFromBlock(block('block_pdmail'));
  const tasks = itemsFromBlock(block('block_pdtasks'));
  const unreadMails = Number(source.match(/(\d+)\s+ungelesene\s+Mails?/i)?.[1] ?? 0) || 0;
  const courses = memberships.filter((item) => item.kind === 'crs');
  const groups = memberships.filter((item) => item.kind === 'grp');
  const pageTitle = textOf(source.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '');
  return {
    pageTitle,
    name: identity.name,
    account: identity.account,
    memberships,
    courses,
    groups,
    news,
    mails,
    tasks,
    counts: {
      memberships: memberships.length,
      courses: courses.length,
      groups: groups.length,
      news: news.length,
      mails: mails.length,
      unreadMails,
      tasks: tasks.length,
    },
    fetchedAt,
  };
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

/* --------------------------------------------------------------- reads -- */

const DASHBOARD_HEADERS = {
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
  'User-Agent': ILIAS_USER_AGENT,
  Referer: ILIAS_DASHBOARD_URL,
};

/** Read and parse the dashboard for an existing `PHPSESSID`. */
export async function fetchIliasDashboard({ cookie, fetchImpl = fetch, dashboardUrl = ILIAS_DASHBOARD_URL }) {
  const value = normalizeIliasCookie(cookie);
  if (!value) throw iliasError(409, 'ilias_credentials_missing');
  let response;
  try {
    response = await fetchImpl(dashboardUrl, { redirect: 'manual', headers: { ...DASHBOARD_HEADERS, Cookie: value } });
  } catch (error) {
    throw iliasError(502, 'ilias_unreachable', String(error?.message ?? error));
  }
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get('location') ?? '';
    if (looksLikeIliasLogin(location)) throw iliasError(401, 'ilias_session_expired');
    return fetchIliasDashboard({ cookie: value, fetchImpl, dashboardUrl: resolveUrl(dashboardUrl, location) });
  }
  if (!response.ok) throw iliasError(502, 'ilias_http_error', `HTTP ${response.status}`);
  const html = await response.text();
  if (looksLikeIliasLogin(html)) throw iliasError(401, 'ilias_session_expired');
  if (!/block_|il-mainbar|il-page-content-header/i.test(html)) throw iliasError(502, 'ilias_dashboard_missing');
  return parseIliasDashboard(html);
}

/* ------------------------------------------------------ session registry -- */

export function setUserIliasSession(userId, session) {
  if (!userId || !session?.cookie) return;
  userSessions.set(userId, {
    cookie: normalizeIliasCookie(session.cookie),
    account: session.account ?? null,
    source: session.source === 'env' ? 'env' : 'browser',
    updatedAt: new Date().toISOString(),
  });
}

export function getUserIliasSession(userId) {
  return userId ? userSessions.get(userId) ?? null : null;
}

export function clearUserIliasSession(userId) {
  if (userId) userSessions.delete(userId);
}

export function listUserIliasSessions() {
  return [...userSessions.entries()].map(([userId, session]) => ({ userId, session }));
}

function envIliasSession() {
  const cookie = (process.env.ILIAS_SESSION_COOKIE || process.env.ILIAS_COOKIE || '').trim();
  if (!cookie) return null;
  return {
    cookie: normalizeIliasCookie(cookie),
    account: (process.env.ILIAS_ACCOUNT || '').trim() || null,
    source: 'env',
    updatedAt: null,
  };
}

/**
 * The session for one user: their in-memory login, or the operator `.env`
 * session only when that user was connected with it, or a clear 409.
 */
export function resolveIliasSession(userId) {
  if (userId) {
    const own = userSessions.get(userId);
    if (own) return own;
    const source = loadIliasSource(userId);
    if (source?.source === 'env') {
      const env = envIliasSession();
      if (env) return { ...env, account: source.account ?? env.account };
    }
    throw iliasError(409, 'ilias_credentials_missing');
  }
  const env = envIliasSession();
  if (!env) throw iliasError(503, 'ilias_not_configured');
  return env;
}

export function publicIliasStatus(userId) {
  const env = envIliasSession();
  const own = userId ? userSessions.get(userId) : null;
  const source = userId ? loadIliasSource(userId) : null;
  return {
    baseUrl: ILIAS_BASE,
    configured: Boolean(env),
    sessionActive: Boolean(own || (source?.source === 'env' && env)),
    account: own?.account ?? source?.account ?? null,
    source: own?.source ?? source?.source ?? null,
    updatedAt: own?.updatedAt ?? source?.updatedAt ?? null,
  };
}

/** Sign in once and register the cookie for this account. The password is dropped here. */
export async function connectIlias(userId, input = {}, fetchImpl = fetch) {
  if (input.env) {
    const env = envIliasSession();
    if (!env) throw iliasError(503, 'ilias_not_configured');
    const dashboard = await fetchIliasDashboard({ cookie: env.cookie, fetchImpl });
    const account = iliasLoginName(input.account) || env.account || dashboard.account;
    setUserIliasSession(userId, { cookie: env.cookie, account, source: 'env' });
    saveIliasSource(userId, 'env', account);
    saveIliasSnapshot(userId, dashboard);
    return { dashboard, source: 'env' };
  }
  const providedCookie = normalizeIliasCookie(input.cookie);
  if (providedCookie) {
    const dashboard = await fetchIliasDashboard({ cookie: providedCookie, fetchImpl });
    const account = iliasLoginName(input.account) || dashboard.account;
    setUserIliasSession(userId, { cookie: providedCookie, account, source: 'browser' });
    saveIliasSource(userId, 'browser', account);
    saveIliasSnapshot(userId, dashboard);
    return { dashboard, source: 'browser', account };
  }
  const result = await loginIlias({
    account: input.account,
    password: input.password,
    fetchImpl,
  });
  if (!result.ok) {
    throw iliasError(result.reason === 'rejected' ? 401 : 502, result.reason === 'rejected' ? 'ilias_login_rejected' : `ilias_${result.reason}`, result.rejection);
  }
  setUserIliasSession(userId, { cookie: result.cookie, account: result.account, source: 'browser' });
  saveIliasSource(userId, 'browser', result.account);
  saveIliasSnapshot(userId, result.dashboard);
  return { dashboard: result.dashboard, source: 'browser' };
}

/** Read the live dashboard and refresh the stored snapshot. */
export async function readIliasDashboard(userId, fetchImpl = fetch) {
  const session = resolveIliasSession(userId);
  let dashboard;
  try {
    dashboard = await fetchIliasDashboard({ cookie: session.cookie, fetchImpl });
  } catch (error) {
    if (error?.status === 401) clearUserIliasSession(userId);
    throw error;
  }
  saveIliasSnapshot(userId, dashboard);
  if (session.account) setUserIliasSession(userId, { ...session, account: session.account });
  return { dashboard, source: session.source, account: session.account };
}

export function disconnectIlias(userId) {
  clearUserIliasSession(userId);
  clearIliasSource(userId);
  if (userId) {
    getDb()
      .prepare("UPDATE user_platforms SET status = 'linked', last_sync_at = NULL WHERE user_id = ? AND platform = 'ilias'")
      .run(userId);
  }
}
