import { ILIAS_BASE } from './constants.mjs';
import { attributesOf, textOf } from './markup.mjs';
import { resolveUrl } from './util.mjs';

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
