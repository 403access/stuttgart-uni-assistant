import { ILIAS_BASE } from './constants.mjs';
import { attributesOf, textOf } from './markup.mjs';
import { resolveUrl } from './util.mjs';

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
