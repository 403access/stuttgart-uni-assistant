/**
 * App news: the read model the public `/v1/news` route serves and the admin
 * console writes. Rows are stored in `news_items`; only published rows leave
 * the server. German is required, English falls back to German at read time.
 */

import { getDb } from './db.mjs';

export const NEWS_SOURCES = ['stuvus', 'faculty', 'institute', 'university', 'sdg'];

const NEWS_COLUMNS = 'id, source, title_de, title_en, summary_de, summary_en, body_de, body_en, date, published, published_at, created_at, updated_at';
const MAX_TITLE = 160;
const MAX_SUMMARY = 400;
const MAX_BODY = 8000;
const MAX_PUBLIC_ITEMS = 200;

function newsError(status, code) {
  const error = new Error(code);
  error.status = status;
  return error;
}

function trimText(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function localize(de, en) {
  const german = typeof de === 'string' ? de : '';
  const english = typeof en === 'string' ? en.trim() : '';
  return { de: german, en: english || german };
}

function isoDay(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : '';
}

/** One database row as the app-facing news item. */
export function newsRow(row) {
  return {
    id: row.id,
    source: NEWS_SOURCES.includes(row.source) ? row.source : 'university',
    title: localize(row.title_de, row.title_en),
    summary: localize(row.summary_de, row.summary_en),
    body: localize(row.body_de, row.body_en),
    date: row.date,
    published: row.published === 1,
    publishedAt: row.published_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** The app contract: editorial fields only, no operator metadata. */
function appNewsRow(row) {
  const item = newsRow(row);
  return { id: item.id, source: item.source, title: item.title, summary: item.summary, body: item.body, date: item.date };
}

/**
 * Operator view of one row. Unlike the public read, English stays as stored so
 * the editor can distinguish a blank translation from the German fallback.
 */
export function adminNewsRow(row) {
  const item = newsRow(row);
  const raw = (de, en) => ({ de, en: typeof en === 'string' ? en : '' });
  return {
    ...item,
    title: raw(row.title_de, row.title_en),
    summary: raw(row.summary_de, row.summary_en),
    body: raw(row.body_de, row.body_en),
  };
}

/** Published items for the app, newest first. */
export function listPublishedNews(limit = 100) {
  const parsed = Number(limit);
  const capped = Number.isFinite(parsed) ? Math.max(1, Math.min(MAX_PUBLIC_ITEMS, Math.trunc(parsed))) : 100;
  return getDb()
    .prepare(`SELECT ${NEWS_COLUMNS} FROM news_items WHERE published = 1 ORDER BY date DESC, published_at DESC, created_at DESC LIMIT ?`)
    .all(capped)
    .map(appNewsRow);
}

/** One published item, or null for a draft, an unknown id, or a malformed id. */
export function getPublishedNews(id) {
  if (typeof id !== 'string' || !id) return null;
  const row = getDb()
    .prepare(`SELECT ${NEWS_COLUMNS} FROM news_items WHERE id = ? AND published = 1`)
    .get(id);
  return row ? appNewsRow(row) : null;
}

/**
 * Validate and normalize one admin write. `base` is the stored row for an
 * update, so omitted fields keep their current value. Empty German title or
 * body is rejected; English may be left blank and is mirrored on read.
 */
export function normalizeNewsInput(input = {}, base = null) {
  const field = (key, baseKey, max) => {
    if (typeof input[key] === 'string') return trimText(input[key], max);
    return base ? trimText(base[baseKey], max) : '';
  };
  const titleDe = field('titleDe', 'title_de', MAX_TITLE);
  if (!titleDe) throw newsError(400, 'news_title_missing');
  const bodyDe = field('bodyDe', 'body_de', MAX_BODY);
  if (!bodyDe) throw newsError(400, 'news_body_missing');

  let source = base?.source ?? 'university';
  if (input.source !== undefined) {
    if (!NEWS_SOURCES.includes(input.source)) throw newsError(400, 'bad_news_source');
    source = input.source;
  }

  let date = base?.date ?? '';
  if (input.date !== undefined) {
    date = isoDay(String(input.date).trim().slice(0, 10));
    if (!date) throw newsError(400, 'bad_news_date');
  }
  if (!date) date = new Date().toISOString().slice(0, 10);

  let published = base ? base.published === 1 : false;
  if (typeof input.published === 'boolean') published = input.published;
  else if (input.published !== undefined) throw newsError(400, 'bad_news_state');

  return {
    source,
    titleDe,
    titleEn: field('titleEn', 'title_en', MAX_TITLE),
    summaryDe: field('summaryDe', 'summary_de', MAX_SUMMARY),
    summaryEn: field('summaryEn', 'summary_en', MAX_SUMMARY),
    bodyDe,
    bodyEn: field('bodyEn', 'body_en', MAX_BODY),
    date,
    published,
  };
}

/** Shared column list for the admin data layer. */
export const NEWS_ROW_COLUMNS = NEWS_COLUMNS;
