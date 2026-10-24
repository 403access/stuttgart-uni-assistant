/**
 * ILIAS at Universität Stuttgart: the standard login form over plain HTTPS and
 * the dashboard blocks a signed-in browser would render.
 *
 * The portal has no public JSON API for students. The login is a normal form
 * post (`ilstartupgui` → `doStandardAuthentication`) that answers with a
 * redirect and the `PHPSESSID` cookie. After that, the app's hidden WebView
 * reads the authenticated HTML pages and posts them back; this module parses
 * and caches them. This module also owns the terminal probe, so the probe, the
 * app, and the tests exercise the same parsers.
 *
 * Credentials are never logged or stored. The login hands the cookie to the
 * authenticated app (which does the page reads) plus the parsed dashboard.
 */

import {
  clearIliasSource,
  getDb,
  loadIliasContent,
  loadIliasMembers,
  loadIliasPage,
  loadIliasProfile,
  loadIliasSource,
  loadIliasSnapshot,
  saveIliasContent,
  saveIliasMembers,
  saveIliasPage,
  saveIliasProfile,
  saveIliasSnapshot,
  saveIliasSource,
} from './db.mjs';

export const ILIAS_BASE = 'https://ilias3.uni-stuttgart.de';
export const ILIAS_LOGIN_URL = `${ILIAS_BASE}/ilias.php?baseClass=ilstartupgui&cmd=post&fallbackCmd=doStandardAuthentication`;
export const ILIAS_DASHBOARD_URL = `${ILIAS_BASE}/ilias.php?baseClass=ilDashboardGUI&cmd=jumpToSelectedItems`;
export const ILIAS_CLIENT_ID = 'Uni_Stuttgart';

/** Repository pages are reachable by object kind and ref id, e.g. `/go/crs/4590579`. */
export function iliasRepositoryUrl(kind, refId) {
  return `${ILIAS_BASE}/go/${kind}/${refId}`;
}

/** The file download command behind a course material row. */
export function iliasFileUrl(refId) {
  return `${ILIAS_BASE}/ilias.php?baseClass=ilrepositorygui&cmdClass=ilObjFileGUI&cmd=sendfile&ref_id=${refId}`;
}
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

/* ---------------------------------------------------------------- content -- */

const CONTENT_TYPE_LABELS = {
  crs: 'Kurs', grp: 'Gruppe', lm: 'Lernmodul', cat: 'Kategorie', file: 'Datei',
  frm: 'Forum', exc: 'Übung', tst: 'Test', fold: 'Ordner', sess: 'Termin',
  blog: 'Blog', wiki: 'Wiki', webr: 'Weblink', prtf: 'Portfolio',
  mcst: 'Medien-Cast', glo: 'Glossar', svy: 'Umfrage', copa: 'Inhaltsseite',
};

const CONTENT_CLASS_KINDS = {
  ilobjfilegui: 'file', ilobjfoldergui: 'fold', ilobjcoursegui: 'crs', ilobjgroupgui: 'grp',
  ilobjlearningmodulegui: 'lm', ilobjforumgui: 'frm', ilobjexercisegui: 'exc', ilobjtestgui: 'tst',
  ilobjsessiongui: 'sess', ilobjcategorygui: 'cat', ilobjbloggui: 'blog', ilobjwikigui: 'wiki',
  ilobjweblinkgui: 'webr', ilobjportfoliogui: 'prtf', ilobjmediacastgui: 'mcst',
  ilobjglossarygui: 'glo', ilobjsurveygui: 'svy', ilobjcontentpagegui: 'copa',
};

function contentKindFromClass(value) {
  const text = String(value ?? '').toLowerCase();
  return CONTENT_CLASS_KINDS[text] || text.replace(/^ilobj/, '').replace(/gui$/, '');
}

/** Kind and ref id from a repository link (`/go/crs/4590579`) or a command URL. */
function locateContentObject(href) {
  const text = String(href ?? '');
  const go = text.match(/\/go\/([a-z0-9]+)\/(\d+)(?:[?#]|$)/i);
  if (go) return { kind: go[1].toLowerCase(), refId: Number(go[2]) };
  const refId = Number(text.match(/[?&]ref_id=(\d+)/i)?.[1] ?? 0) || null;
  const cmdClass = text.match(/[?&]cmdClass=([^&]+)/i)?.[1] ?? '';
  return { kind: cmdClass ? contentKindFromClass(cmdClass) : '', refId };
}

function itemProperties(segment) {
  const values = [];
  for (const match of String(segment).matchAll(
    /<span[^>]*class\s*=\s*["'][^"']*\bil_ItemProperty\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi,
  )) {
    const value = textOf(match[1]);
    if (value) values.push(value);
  }
  return values;
}

function splitProperty(value) {
  const match = String(value).match(/^([^:]{1,60}):\s+(.+)$/);
  return match ? { name: match[1].trim(), value: match[2].trim() } : { name: '', value: String(value) };
}

function looksLikeDate(value) {
  return (
    /^(Heute|Gestern|Vorgestern)\b/i.test(value) ||
    /^\d{1,2}\.\s*[A-Za-zÄÖÜäöüß]{3,}\.?\s*\d{4}/i.test(value) ||
    /^\d{2}\.\d{2}\.\d{4}/.test(value)
  );
}

function contentRow(segment, index) {
  const titleHtml =
    segment.match(/<h3[^>]*class\s*=\s*["'][^"']*\bil_ContainerItemTitle\b[^"']*["'][^>]*>([\s\S]*?)<\/h3>/i)?.[1] ??
    segment.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i)?.[1] ??
    '';
  const anchor = titleHtml.match(/<a\b[^>]*>/i);
  const href = anchor ? attributesOf(anchor[0]).href ?? '' : '';
  const title = textOf(titleHtml);
  if (!title && !href) return null;

  const { kind, refId } = locateContentObject(href);
  const alt = segment.match(/<img\b[^>]*class\s*=\s*["'][^"']*\bilListItemIcon\b[^"']*["'][^>]*>/i)?.[0] ?? '';
  const iconAlt = alt ? attributesOf(alt).alt ?? '' : '';
  const values = itemProperties(segment);
  const extension = kind === 'file'
    ? values.find((value) => /^(pdf|docx?|pptx?|xlsx?|odt|ods|odp|zip|txt|csv|rtf|mp4|mp3|wav|png|jpe?g|svg|gif)$/i.test(value)) ?? ''
    : '';
  const size = values.find((value) => /^[\d.,]+\s*(?:B|KB|MB|GB|TB)$/i.test(value)) ?? '';
  const pages = values.map((value) => value.match(/Anzahl Seiten:\s*(\d+)/i)).find(Boolean)?.[1] ?? '';
  const date = values.find(looksLikeDate) ?? '';

  return {
    id: refId ? `${kind || 'ref'}-${refId}` : `item-${index}`,
    kind: kind || 'item',
    type: extension || CONTENT_TYPE_LABELS[kind] || iconAlt || '',
    refId,
    title,
    description: textOf(segment.match(/<div[^>]*class\s*=\s*["'][^"']*\bil_Description\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? ''),
    url: href ? resolveUrl(ILIAS_BASE, href) : '',
    properties: values.map(splitProperty),
    date,
    size,
    pages,
    downloadable: kind === 'file' && Boolean(refId),
  };
}

/** The members tab, a user gallery, is the same GUI for courses and groups. */
export function iliasMembersUrlFromHtml(html) {
  for (const match of String(html ?? '').matchAll(/<a\b[^>]*>/gi)) {
    const href = attributesOf(match[0]).href ?? '';
    if (/\bcmdClass\s*=\s*["']?ilusersgallerygui\b/i.test(href)) return resolveUrl(ILIAS_BASE, href);
  }
  return '';
}

/**
 * Parse the object list of a course, group, folder, or category page. The page
 * renders each material as an `ilObjListRow`; files link to `sendfile`, while
 * folders and groups link through `/go/<kind>/<refId>`.
 */
export function parseIliasContent(html, { refId = null, kind = 'crs', fetchedAt = new Date().toISOString() } = {}) {
  const source = String(html ?? '');
  const headerHtml =
    source.match(/<h1[^>]*class\s*=\s*["'][^"']*\bil-page-content-header\b[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i)?.[1] ??
    source.match(/<h1[^>]*class\s*=\s*["'][^"']*\bilHeader\b[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i)?.[1] ??
    '';
  const title =
    textOf(headerHtml) ||
    textOf(source.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '');
  const description = textOf(
    source.match(/<div[^>]*class\s*=\s*["'][^"']*\bilHeaderDesc\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? '',
  );

  const start = source.search(/<div[^>]*id\s*=\s*["']ilContentContainer["']/i);
  const body = start >= 0 ? source.slice(start) : source;
  const markers = [...body.matchAll(/<li\b[^>]*class\s*=\s*["'][^"']*\bilObjListRow\b[^"']*["'][^>]*>/gi)];
  const items = [];
  const seen = new Set();
  for (const [index, marker] of markers.entries()) {
    const segment = body.slice(marker.index ?? 0, markers[index + 1]?.index ?? body.length);
    const item = contentRow(segment, index);
    if (!item) continue;
    const key = item.refId ? `${item.kind}-${item.refId}` : `${item.title}-${item.url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(item);
  }

  return {
    refId: Number(refId) || null,
    kind,
    title,
    description,
    membersUrl: iliasMembersUrlFromHtml(source),
    items,
    fetchedAt,
  };
}

/* ---------------------------------------------------------------- members -- */

const MEMBER_CARD = /<div[^>]*class\s*=\s*["'][^"']*\bil-card\b[^"']*\bthumbnail\b[^"']*["'][^>]*>/gi;
const MEMBER_HIDDEN_NAME = /^(?:nicht freigegeben|not released|not available)$/i;
const MEMBER_TUTOR_ROLE = /(kontaktperson|tutor|lehrende|dozent|administrator|owner|besitzer|teacher)/i;

/** The name ILIAS renders when a user opted out of a public profile. */
function memberProperty(segment, pattern) {
  for (const match of String(segment).matchAll(/<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi)) {
    if (pattern.test(textOf(match[1]))) return textOf(match[2]);
  }
  return '';
}

/**
 * ILIAS login names concatenate first and last names ("VivianEichholz"). When
 * the profile name is hidden, the login is all the page gives us, so space the
 * camel-case parts for readability.
 */
function memberNameFromLogin(value) {
  return String(value ?? '')
    .replace(/([\p{Ll}\d])(\p{Lu})/gu, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
}

function memberCard(segment, index) {
  const titleHtml = segment.match(/<div[^>]*class\s*=\s*["'][^"']*\bcard-title\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? '';
  const title = textOf(titleHtml);
  const username = memberProperty(segment, /^(anmeldename|benutzername|login|login name)$/i);
  const role = memberProperty(segment, /^(zuständigkeit|zustaendigkeit|rolle|funktion|role|function)$/i);
  let profileHref = titleHtml.match(/<a\b[^>]*href\s*=\s*["']([^"']+)["']/i)?.[1] ?? '';
  profileHref = decodeEntities(profileHref);
  if (!profileHref) {
    for (const match of segment.matchAll(/<a\b[^>]*>/gi)) {
      const href = attributesOf(match[0]).href ?? '';
      if (/\bcmdClass\s*=\s*["']?ilpublicuserprofilegui\b/i.test(href)) {
        profileHref = href;
        break;
      }
    }
  }
  const hidden = MEMBER_HIDDEN_NAME.test(title) || !title;
  const name = hidden ? memberNameFromLogin(username) || title : title;
  if (!name) return null;

  const userId = Number(
    profileHref.match(/[?&]user=(\d+)/i)?.[1] ?? profileHref.match(/\/go\/usr\/(\d+)/i)?.[1] ?? 0,
  ) || null;
  const avatarTag = segment.match(/<img\b[^>]*>/i)?.[0] ?? '';
  const avatarSrc = avatarTag ? attributesOf(avatarTag).src ?? '' : '';

  return {
    id: `member-${username || name || index}`,
    name,
    username,
    role,
    roleKind: MEMBER_TUTOR_ROLE.test(role) ? 'tutor' : 'participant',
    hidden: hidden && Boolean(username),
    userId,
    avatarUrl: avatarSrc ? resolveUrl(ILIAS_BASE, avatarSrc) : '',
    profileUrl: profileHref ? resolveUrl(ILIAS_BASE, profileHref) : '',
  };
}

/**
 * Parse the members tab (`ilUsersGalleryGUI`). Each member is an `il-card
 * thumbnail` with the display name in `card-title`, the login in the
 * `Anmeldename` definition list, and a `Zuständigkeit` value for the tutor or
 * contact person. Users without a public profile show "Nicht freigegeben", so
 * the login name becomes the visible row.
 */
export function parseIliasMembers(html, { refId = null, kind = 'crs', fetchedAt = new Date().toISOString() } = {}) {
  const source = String(html ?? '');
  const headerHtml =
    source.match(/<h1[^>]*class\s*=\s*["'][^"']*\bil-page-content-header\b[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i)?.[1] ??
    source.match(/<h1[^>]*class\s*=\s*["'][^"']*\bilHeader\b[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i)?.[1] ??
    '';
  const title = textOf(headerHtml) || textOf(source.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '');

  const markers = [...source.matchAll(MEMBER_CARD)];
  const members = [];
  const seen = new Set();
  for (const [index, marker] of markers.entries()) {
    const segment = source.slice(marker.index ?? 0, markers[index + 1]?.index ?? source.length);
    const member = memberCard(segment, index);
    if (!member) continue;
    const key = member.username || member.name;
    if (seen.has(key)) continue;
    seen.add(key);
    members.push(member);
  }
  // The tutor belongs at the top; everybody else keeps the portal order.
  members.sort((left, right) => Number(right.roleKind === 'tutor') - Number(left.roleKind === 'tutor'));

  return {
    refId: Number(refId) || null,
    kind,
    title,
    members,
    fetchedAt,
  };
}

/* ---------------------------------------------------------------- profile -- */

const PROFILE_SECTION = /<div[^>]*class\s*=\s*["'][^"']*\bilProfileSection\b[^"']*["'][^>]*>/gi;

/** Keep the line structure of a profile section, which plain `textOf` drops. */
function profileText(html) {
  return decodeEntities(
    String(html ?? '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(?:p|div|li|dd)>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

function profileLinks(html) {
  const links = [];
  for (const match of String(html ?? '').matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const label = textOf(match[2]);
    if (!label) continue;
    links.push({ label, url: resolveUrl(ILIAS_BASE, decodeEntities(match[1])) });
  }
  return links;
}

/** Course and group links a profile may carry in a section. */
function profileCourses(links) {
  const courses = [];
  const seen = new Set();
  for (const link of links) {
    const go = link.url.match(/\/go\/(crs|grp)\/(\d+)(?:[?#]|$)/i);
    const command = link.url.match(/cmdClass\s*=\s*ilObj(Course|Group)GUI/i);
    const refId = Number(link.url.match(/[?&]ref_id=(\d+)/i)?.[1] ?? go?.[2] ?? 0);
    const kind = go?.[1]?.toLowerCase() ?? (command ? (command[1].toLowerCase() === 'course' ? 'crs' : 'grp') : '');
    if (!kind || !Number.isInteger(refId) || refId <= 0) continue;
    const key = `${kind}-${refId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    courses.push({ refId, kind, title: link.label, url: link.url });
  }
  return courses;
}

function profileAvatar(block) {
  const tag = block.match(/<img\b[^>]*class\s*=\s*["'][^"']*\bilProfileImage\b[^"']*["'][^>]*>/i)?.[0];
  return tag ? attributesOf(tag).src ?? '' : '';
}

function profileSection(segment) {
  const headTag = segment.match(
    /<h3[^>]*class\s*=\s*["'][^"']*\bilProfileSectionHead\b[^"']*["'][^>]*>([\s\S]*?)<\/h3>/i,
  );
  const title = headTag ? textOf(headTag[1]) : '';
  const actionLink =
    /<a\b[^>]*href\s*=\s*["'][^"']*(?:ilMailGUI|deliverVCard)[^"']*["'][^>]*>[\s\S]*?<\/a>/gi;
  const body = (headTag ? segment.replace(headTag[0], '') : segment).replace(actionLink, ' ');
  const text = profileText(body);
  const links = profileLinks(segment).filter(
    (link) => !/baseClass\s*=\s*ilMailGUI/i.test(link.url) && !/\bcmd\s*=\s*deliverVCard\b/i.test(link.url),
  );
  return { title, text, links };
}

/**
 * Parse the public profile ILIAS opens from a member card. The page is small:
 * the profile name, an optional avatar, and one or more `ilProfileSection`
 * blocks (institution, contact, and whatever else the user published). The
 * header keeps the course context and the h1 form of the name.
 */
export function parseIliasProfile(html, { userId = null, url = '', fetchedAt = new Date().toISOString() } = {}) {
  const source = String(html ?? '');
  const start = source.search(/<div[^>]*class\s*=\s*["'][^"']*\bilProfile\b[^"']*["'][^>]*>/i);
  const end = start >= 0 ? source.indexOf('<footer', start) : -1;
  const block = start >= 0 ? source.slice(start, end >= 0 ? end : source.length) : source;

  const id = Number(
    userId ||
      url.match(/[?&]user=(\d+)/i)?.[1] ||
      url.match(/\/go\/usr\/(\d+)/i)?.[1] ||
      0,
  ) || null;
  const name =
    textOf(block.match(/<h3[^>]*class\s*=\s*["'][^"']*\bilProfileName\b[^"']*["'][^>]*>([\s\S]*?)<\/h3>/i)?.[1] ?? '') ||
    textOf(source.match(/<h1[^>]*class\s*=\s*["'][^"']*\bil-page-content-header\b[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? '');
  const title = textOf(source.match(/<h1[^>]*class\s*=\s*["'][^"']*\bil-page-content-header\b[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? '') || name;
  const context = textOf(source.match(/<div[^>]*class\s*=\s*["'][^"']*\bilHeaderDesc\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? '');
  const avatar = profileAvatar(block);
  const allLinks = profileLinks(block);

  const markers = [...block.matchAll(PROFILE_SECTION)];
  const sections = [];
  for (const [index, marker] of markers.entries()) {
    const segment = block.slice(marker.index ?? 0, markers[index + 1]?.index ?? block.length);
    const section = profileSection(segment);
    if (section.title || section.text || section.links.length) sections.push(section);
  }

  const emailFromText = sections.map((section) => section.text).join('\n').match(/E-?Mail\s*:\s*([^\s\n]+@[^\s\n]+)/i)?.[1] ?? '';
  const emailFromLink = allLinks.map((link) => link.url.match(/mailto:([^?&\s]+)/i)?.[1] ?? '').find(Boolean) ?? '';
  const mailLink = allLinks.find((link) => /baseClass\s*=\s*ilMailGUI/i.test(link.url));
  const vcardLink = allLinks.find((link) => /\bcmd\s*=\s*deliverVCard\b/i.test(link.url));

  return {
    userId: id,
    name,
    title,
    context,
    avatarUrl: avatar ? resolveUrl(ILIAS_BASE, avatar) : '',
    email: emailFromText || emailFromLink,
    mailUrl: mailLink?.url ?? '',
    vcardUrl: vcardLink?.url ?? '',
    profileUrl: id ? `${ILIAS_BASE}/go/usr/${id}` : url,
    sections,
    courses: profileCourses(allLinks),
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

/** Fetch an authenticated HTML page, following redirects and detecting a lost session. */
async function fetchIliasHtml({ cookie, url, fetchImpl = fetch, referer = ILIAS_DASHBOARD_URL, maxHops = 5 }) {
  const value = normalizeIliasCookie(cookie);
  if (!value) throw iliasError(409, 'ilias_credentials_missing');
  let current = url;
  for (let hop = 0; hop <= maxHops; hop += 1) {
    let response;
    try {
      response = await fetchImpl(current, {
        redirect: 'manual',
        headers: { ...DASHBOARD_HEADERS, Referer: referer, Cookie: value },
      });
    } catch (error) {
      throw iliasError(502, 'ilias_unreachable', String(error?.message ?? error));
    }
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location') ?? '';
      if (!location) throw iliasError(502, 'ilias_http_error', `HTTP ${response.status}`);
      const next = resolveUrl(current, location);
      if (looksLikeIliasLogin(next)) throw iliasError(401, 'ilias_session_expired');
      current = next;
      continue;
    }
    if (response.status === 401 || response.status === 403) throw iliasError(401, 'ilias_session_expired');
    if (!response.ok) throw iliasError(502, 'ilias_http_error', `HTTP ${response.status}`);
    const html = await response.text();
    if (looksLikeIliasLogin(html)) throw iliasError(401, 'ilias_session_expired');
    return { html, url: current };
  }
  throw iliasError(502, 'ilias_redirect_loop');
}

/** Read a course, group, folder, or category page for an existing `PHPSESSID`. */
export async function fetchIliasContent({ cookie, refId, kind = 'crs', fetchImpl = fetch, contentUrl }) {
  const id = Number(refId);
  if (!Number.isInteger(id) || id <= 0) throw iliasError(400, 'ilias_ref_id_invalid');
  const safeKind = /^[a-z]{2,8}$/i.test(String(kind)) ? String(kind).toLowerCase() : 'crs';
  const url = contentUrl || iliasRepositoryUrl(safeKind, id);
  const { html } = await fetchIliasHtml({ cookie, url, fetchImpl, referer: ILIAS_DASHBOARD_URL });
  if (!/il-page-content-header|ilContentContainer|\bilHeader\b/i.test(html)) throw iliasError(502, 'ilias_content_missing');
  return parseIliasContent(html, { refId: id, kind: safeKind });
}

/**
 * Read the members tab for a course or group. The members GUI needs the
 * object-specific `cmdNode`, which only the object page carries, so without a
 * known `membersUrl` the content page is read once to discover it.
 */
export async function fetchIliasMembers({ cookie, refId, kind = 'crs', fetchImpl = fetch, membersUrl }) {
  const id = Number(refId);
  if (!Number.isInteger(id) || id <= 0) throw iliasError(400, 'ilias_ref_id_invalid');
  const safeKind = /^[a-z]{2,8}$/i.test(String(kind)) ? String(kind).toLowerCase() : 'crs';
  let url = String(membersUrl ?? '').trim();
  if (url && !isIliasUrl(url)) throw iliasError(400, 'ilias_url_invalid');
  if (!url) {
    const content = await fetchIliasHtml({ cookie, url: iliasRepositoryUrl(safeKind, id), fetchImpl, referer: ILIAS_DASHBOARD_URL });
    url = iliasMembersUrlFromHtml(content.html);
    if (!url) throw iliasError(404, 'ilias_members_missing');
  }
  const { html } = await fetchIliasHtml({ cookie, url, fetchImpl, referer: iliasRepositoryUrl(safeKind, id) });
  if (!/\bil-card\b/i.test(html)) throw iliasError(502, 'ilias_members_missing');
  return parseIliasMembers(html, { refId: id, kind: safeKind });
}

/** Read one public profile page. The link comes from a member card. */
export async function fetchIliasProfile({ cookie, userId, profileUrl, fetchImpl = fetch }) {
  const url = String(profileUrl ?? '').trim();
  if (!url) throw iliasError(400, 'ilias_profile_url_missing');
  if (!isIliasUrl(url)) throw iliasError(400, 'ilias_url_invalid');
  const { html } = await fetchIliasHtml({ cookie, url, fetchImpl, referer: ILIAS_DASHBOARD_URL });
  if (!/\bilProfile\b/i.test(html)) throw iliasError(502, 'ilias_profile_missing');
  return parseIliasProfile(html, { userId: Number(userId) || null, url });
}

/**
 * Fetch a profile image (or another image the signed-in profile page points to)
 * with the account's cookie. The bytes stay out of the parsed JSON cache.
 */
export async function fetchIliasImage(userId, imageUrl, fetchImpl = fetch) {
  const url = String(imageUrl ?? '').trim();
  if (!url) throw iliasError(400, 'ilias_image_url_missing');
  if (!isIliasUrl(url)) throw iliasError(400, 'ilias_url_invalid');
  const { cookie } = resolveIliasSession(userId);
  if (!cookie) throw iliasError(409, 'ilias_credentials_missing');
  let current = url;
  for (let hop = 0; hop <= 5; hop += 1) {
    let response;
    try {
      response = await fetchImpl(current, {
        redirect: 'manual',
        headers: { ...DASHBOARD_HEADERS, Referer: ILIAS_BASE, Cookie: cookie },
      });
    } catch (error) {
      throw iliasError(502, 'ilias_unreachable', String(error?.message ?? error));
    }
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location') ?? '';
      if (!location) throw iliasError(502, 'ilias_http_error', `HTTP ${response.status}`);
      current = resolveUrl(current, location);
      if (!isIliasUrl(current)) throw iliasError(400, 'ilias_url_invalid');
      continue;
    }
    if (response.status === 401 || response.status === 403) {
      clearUserIliasSession(userId);
      throw iliasError(401, 'ilias_session_expired');
    }
    if (!response.ok) throw iliasError(502, 'ilias_http_error', `HTTP ${response.status}`);
    const contentType = String(response.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
    if (!contentType.startsWith('image/')) throw iliasError(502, 'ilias_image_invalid');
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > 3_000_000) throw iliasError(413, 'ilias_image_too_large');
    return { bytes, contentType };
  }
  throw iliasError(502, 'ilias_redirect_loop');
}

function filenameFromDisposition(value) {
  const text = String(value ?? '');
  const encoded = text.match(/filename\*\s*=\s*UTF-8''([^;]+)/i)?.[1];
  if (encoded) {
    try {
      return decodeURIComponent(encoded.trim().replace(/^"|"$/g, ''));
    } catch {
      return encoded.trim().replace(/^"|"$/g, '');
    }
  }
  return text.match(/filename\s*=\s*"([^"]*)"/i)?.[1] ?? text.match(/filename\s*=\s*([^;]+)/i)?.[1]?.trim() ?? '';
}

async function fileFromResponse(response, url, fetchImpl, headers) {
  if (response.status === 401 || response.status === 403) throw iliasError(401, 'ilias_session_expired');
  if (!response.ok) throw iliasError(502, 'ilias_http_error', `HTTP ${response.status}`);
  const contentType = String(response.headers.get('content-type') ?? '').toLowerCase();
  const disposition = response.headers.get('content-disposition') ?? '';

  if (contentType.includes('text/html')) {
    const html = await response.text();
    if (looksLikeIliasLogin(html)) throw iliasError(401, 'ilias_session_expired');
    // Some installations answer the plain command with the file screen first;
    // follow its download link once instead of handing HTML to the app.
    const link = html.match(/href\s*=\s*["']([^"']*cmd=sendfile[^"']*ref_id=\d+[^"']*)["']/i)?.[1];
    if (!link) throw iliasError(502, 'ilias_file_missing');
    let next;
    try {
      next = await fetchImpl(resolveUrl(url, decodeEntities(link)), { redirect: 'follow', headers });
    } catch (error) {
      throw iliasError(502, 'ilias_unreachable', String(error?.message ?? error));
    }
    if (next.status === 401 || next.status === 403) throw iliasError(401, 'ilias_session_expired');
    if (!next.ok) throw iliasError(502, 'ilias_http_error', `HTTP ${next.status}`);
    const nextType = String(next.headers.get('content-type') ?? '').toLowerCase();
    if (nextType.includes('text/html')) throw iliasError(502, 'ilias_file_missing');
    return {
      bytes: Buffer.from(await next.arrayBuffer()),
      contentType: nextType.split(';')[0] || 'application/octet-stream',
      filename: filenameFromDisposition(next.headers.get('content-disposition') ?? ''),
    };
  }

  return {
    bytes: Buffer.from(await response.arrayBuffer()),
    contentType: contentType.split(';')[0] || 'application/octet-stream',
    filename: filenameFromDisposition(disposition),
  };
}

/** Download a file of the repository for an existing `PHPSESSID`. */
export async function fetchIliasFile({ cookie, refId, fetchImpl = fetch, fileUrl }) {
  const id = Number(refId);
  if (!Number.isInteger(id) || id <= 0) throw iliasError(400, 'ilias_ref_id_invalid');
  const value = normalizeIliasCookie(cookie);
  if (!value) throw iliasError(409, 'ilias_credentials_missing');
  const url = fileUrl || iliasFileUrl(id);
  const headers = {
    ...DASHBOARD_HEADERS,
    Accept: '*/*',
    Referer: iliasRepositoryUrl('file', id),
    Cookie: value,
  };
  let response;
  try {
    response = await fetchImpl(url, { redirect: 'follow', headers });
  } catch (error) {
    throw iliasError(502, 'ilias_unreachable', String(error?.message ?? error));
  }
  return fileFromResponse(response, url, fetchImpl, headers);
}

/* ------------------------------------------------------------- cache -- */

/**
 * Page reads are harvested by the app's hidden WebView and posted here. The
 * server only parses and stores them; it never walks ILIAS on behalf of a
 * signed-in user. A cached page is served until this TTL has passed, then the
 * client refreshes it.
 */
export const ILIAS_CACHE_TTL_MS = 15 * 60 * 1000;
export const ILIAS_PAGE_MAX_BYTES = 4_000_000;

function cacheIso(value) {
  const text = typeof value === 'string' ? value.trim() : '';
  return text && !Number.isNaN(Date.parse(text)) ? text : new Date().toISOString();
}

function cacheMeta(fetchedAt, ttl = ILIAS_CACHE_TTL_MS) {
  const read = Date.parse(fetchedAt ?? '');
  const stale = !Number.isFinite(read) || Date.now() - read > ttl;
  return { fetchedAt: fetchedAt ?? null, cached: true, stale };
}

function safeContentKind(value) {
  return /^[a-z]{2,8}$/i.test(String(value ?? '')) ? String(value).toLowerCase() : 'crs';
}

/** The client may hand back a members link; never send the cookie anywhere else. */
function isIliasUrl(value) {
  try {
    return new URL(String(value)).host === new URL(ILIAS_BASE).host;
  } catch {
    return false;
  }
}

/**
 * Store a page the client fetched. Dashboard HTML refreshes the snapshot, and
 * content HTML refreshes the parsed rows for that object. The raw HTML is kept
 * as well, so a parser change can replay it without another device fetch.
 */
export function ingestIliasPage(userId, input = {}) {
  if (
    input.page !== 'dashboard' &&
    input.page !== 'content' &&
    input.page !== 'members' &&
    input.page !== 'profile'
  ) {
    throw iliasError(400, 'ilias_page_invalid');
  }
  const html = String(input.html ?? '');
  if (!html) throw iliasError(400, 'ilias_page_missing');
  if (html.length > ILIAS_PAGE_MAX_BYTES) throw iliasError(413, 'ilias_page_too_large');
  if (looksLikeIliasLogin(html)) {
    // Same evidence as a live read: the cookie the server handed out is dead.
    clearUserIliasSession(userId);
    throw iliasError(401, 'ilias_session_expired');
  }
  const fetchedAt = cacheIso(input.fetchedAt);
  const url = String(input.url ?? '').slice(0, 500);

  if (input.page === 'content') {
    const refId = Number(input.refId);
    if (!Number.isInteger(refId) || refId <= 0) throw iliasError(400, 'ilias_ref_id_invalid');
    const kind = safeContentKind(input.kind);
    const content = parseIliasContent(html, { refId, kind, fetchedAt });
    saveIliasContent(userId, content);
    saveIliasPage(userId, { key: `content-${kind}-${refId}`, kind, refId, url, html, fetchedAt });
    return { page: 'content', content, ...cacheMeta(fetchedAt) };
  }

  if (input.page === 'members') {
    const refId = Number(input.refId);
    if (!Number.isInteger(refId) || refId <= 0) throw iliasError(400, 'ilias_ref_id_invalid');
    const kind = safeContentKind(input.kind);
    const members = parseIliasMembers(html, { refId, kind, fetchedAt });
    saveIliasMembers(userId, members);
    saveIliasPage(userId, { key: `members-${kind}-${refId}`, kind, refId, url, html, fetchedAt });
    return { page: 'members', members, ...cacheMeta(fetchedAt) };
  }

  if (input.page === 'profile') {
    const profileUserId = Number(input.userId) || null;
    const profile = parseIliasProfile(html, { userId: profileUserId, url, fetchedAt });
    if (!profile.userId) throw iliasError(400, 'ilias_profile_user_invalid');
    saveIliasProfile(userId, profile);
    saveIliasPage(userId, {
      key: `profile-${profile.userId}`,
      kind: 'profile',
      refId: null,
      url,
      html,
      fetchedAt,
    });
    return { page: 'profile', profile, ...cacheMeta(fetchedAt) };
  }

  const dashboard = parseIliasDashboard(html, fetchedAt);
  saveIliasSnapshot(userId, dashboard);
  saveIliasPage(userId, { key: 'dashboard', kind: 'dashboard', refId: null, url, html, fetchedAt });
  return { page: 'dashboard', dashboard, ...cacheMeta(fetchedAt) };
}

/** The stored dashboard; no ILIAS request. Throws 404 when nothing was harvested yet. */
export function cachedIliasDashboard(userId, ttl = ILIAS_CACHE_TTL_MS) {
  const stored = loadIliasSnapshot(userId);
  if (!stored) throw iliasError(404, 'ilias_cache_miss');
  return {
    dashboard: stored.dashboard,
    ...cacheMeta(stored.fetchedAt ?? stored.dashboard?.fetchedAt, ttl),
  };
}

/** The stored content page; no ILIAS request. Throws 404 when it was never harvested. */
export function cachedIliasContent(userId, input = {}, ttl = ILIAS_CACHE_TTL_MS) {
  const refId = Number(input.refId);
  if (!Number.isInteger(refId) || refId <= 0) throw iliasError(400, 'ilias_ref_id_invalid');
  const kind = safeContentKind(input.kind);
  const stored = loadIliasContent(userId, refId, kind);
  if (!stored) throw iliasError(404, 'ilias_cache_miss');
  const content = stored.content;
  // Pages harvested before the members tab was parsed still have their raw
  // HTML; read the link from there instead of asking the device for a refetch.
  if (!content.membersUrl) {
    const page = loadIliasPage(userId, `content-${kind}-${refId}`);
    if (page?.html) content.membersUrl = iliasMembersUrlFromHtml(page.html);
  }
  return {
    content,
    ...cacheMeta(stored.fetchedAt ?? stored.content?.fetchedAt, ttl),
  };
}

/** The stored members tab; no ILIAS request. Throws 404 when it was never harvested. */
export function cachedIliasMembers(userId, input = {}, ttl = ILIAS_CACHE_TTL_MS) {
  const refId = Number(input.refId);
  if (!Number.isInteger(refId) || refId <= 0) throw iliasError(400, 'ilias_ref_id_invalid');
  const kind = safeContentKind(input.kind);
  const stored = loadIliasMembers(userId, refId, kind);
  if (!stored) throw iliasError(404, 'ilias_cache_miss');
  return {
    members: stored.members,
    ...cacheMeta(stored.fetchedAt ?? stored.members?.fetchedAt, ttl),
  };
}

/** The stored public profile; no ILIAS request. Throws 404 when it was never harvested. */
export function cachedIliasProfile(userId, input = {}, ttl = ILIAS_CACHE_TTL_MS) {
  const profileUserId = Number(input.userId);
  if (!Number.isInteger(profileUserId) || profileUserId <= 0) throw iliasError(400, 'ilias_profile_user_invalid');
  const stored = loadIliasProfile(userId, profileUserId);
  if (!stored) throw iliasError(404, 'ilias_cache_miss');
  return {
    profile: stored.profile,
    ...cacheMeta(stored.fetchedAt ?? stored.profile?.fetchedAt, ttl),
  };
}

/** The session cookie the app seeds into its WebView before harvesting pages. */
export function iliasCookieFor(userId) {
  return resolveIliasSession(userId).cookie;
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

/** Read the members tab (course or group) with the user's session. */
export async function readIliasMembers(userId, input = {}, fetchImpl = fetch) {
  const session = resolveIliasSession(userId);
  try {
    return await fetchIliasMembers({
      cookie: session.cookie,
      refId: input.refId,
      kind: input.kind,
      fetchImpl,
      membersUrl: input.membersUrl,
    });
  } catch (error) {
    if (error?.status === 401) clearUserIliasSession(userId);
    throw error;
  }
}

/** Read one public profile with the user's session. */
export async function readIliasProfile(userId, input = {}, fetchImpl = fetch) {
  const session = resolveIliasSession(userId);
  try {
    return await fetchIliasProfile({
      cookie: session.cookie,
      userId: input.profileUserId,
      profileUrl: input.profileUrl,
      fetchImpl,
    });
  } catch (error) {
    if (error?.status === 401) clearUserIliasSession(userId);
    throw error;
  }
}

/** Read one repository page (course, group, folder) with the user's session. */
export async function readIliasContent(userId, input = {}, fetchImpl = fetch) {
  const session = resolveIliasSession(userId);
  try {
    return await fetchIliasContent({
      cookie: session.cookie,
      refId: input.refId,
      kind: input.kind,
      fetchImpl,
      contentUrl: input.contentUrl,
    });
  } catch (error) {
    if (error?.status === 401) clearUserIliasSession(userId);
    throw error;
  }
}

/** Download one file with the user's session. */
export async function readIliasFile(userId, input = {}, fetchImpl = fetch) {
  const session = resolveIliasSession(userId);
  try {
    return await fetchIliasFile({
      cookie: session.cookie,
      refId: input.refId,
      fetchImpl,
      fileUrl: input.fileUrl,
    });
  } catch (error) {
    if (error?.status === 401) clearUserIliasSession(userId);
    throw error;
  }
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
