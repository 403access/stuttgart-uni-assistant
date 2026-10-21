/** Operator-managed app news: list, create, update, publish, and delete. */

import { randomBytes } from 'node:crypto';

import { getDb } from '../db.mjs';
import { NEWS_ROW_COLUMNS, adminNewsRow, normalizeNewsInput } from '../news.mjs';
import { recordAdminAudit } from './audit.mjs';
import { pageOffset, pageSize } from './util.mjs';

/* ------------------------------------------------------------------- news -- */

function findNewsRow(id) {
  if (typeof id !== 'string' || !id) return null;
  return getDb().prepare(`SELECT ${NEWS_ROW_COLUMNS} FROM news_items WHERE id = ?`).get(id) ?? null;
}

function newsFields(clean) {
  return [
    clean.source,
    clean.titleDe,
    clean.titleEn,
    clean.summaryDe,
    clean.summaryEn,
    clean.bodyDe,
    clean.bodyEn,
    clean.date,
    clean.published ? 1 : 0,
  ];
}

const FIELD_MAP = [
  ['source', 'source'],
  ['titleDe', 'title_de'],
  ['titleEn', 'title_en'],
  ['summaryDe', 'summary_de'],
  ['summaryEn', 'summary_en'],
  ['bodyDe', 'body_de'],
  ['bodyEn', 'body_en'],
  ['date', 'date'],
  ['published', 'published'],
];

/** Newest editorial date first; drafts stay visible only to the operator. */
export function listAdminNews({ query = '', state = '', limit = 50, offset = 0 } = {}) {
  const db = getDb();
  const capped = pageSize(limit, 50);
  const skip = pageOffset(offset);
  const where = [];
  const params = [];
  const text = String(query ?? '').trim();
  if (text) {
    const needle = `%${text}%`;
    where.push('(title_de LIKE ? OR title_en LIKE ? OR summary_de LIKE ? OR summary_en LIKE ? OR body_de LIKE ? OR body_en LIKE ?)');
    params.push(needle, needle, needle, needle, needle, needle);
  }
  if (state === 'published') where.push('published = 1');
  else if (state === 'draft') where.push('published = 0');
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = db.prepare(`SELECT COUNT(*) AS n FROM news_items ${clause}`).get(...params)?.n ?? 0;
  const items = db
    .prepare(`SELECT ${NEWS_ROW_COLUMNS} FROM news_items ${clause} ORDER BY date DESC, created_at DESC LIMIT ? OFFSET ?`)
    .all(...params, capped, skip)
    .map(adminNewsRow);
  return { items, total, limit: capped, offset: skip };
}

export function getAdminNews(id) {
  const row = findNewsRow(id);
  return row ? adminNewsRow(row) : null;
}

export function createAdminNews(input = {}) {
  const clean = normalizeNewsInput(input);
  const db = getDb();
  const now = new Date().toISOString();
  const id = `news_${randomBytes(9).toString('base64url')}`;
  db.prepare(
    `INSERT INTO news_items (id, source, title_de, title_en, summary_de, summary_en, body_de, body_en, date, published, published_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, ...newsFields(clean), clean.published ? now : null, now, now);
  recordAdminAudit({ action: 'news.create', detail: { id, source: clean.source, date: clean.date, published: clean.published } });
  return adminNewsRow(findNewsRow(id));
}

export function updateAdminNews(id, input = {}) {
  const existing = findNewsRow(id);
  if (!existing) return null;
  const clean = normalizeNewsInput(input, existing);
  const changed = FIELD_MAP.filter(([camel, column]) => {
    const before = column === 'published' ? existing.published === 1 : existing[column];
    return clean[camel] !== before;
  }).map(([camel]) => camel);
  if (!changed.length) return adminNewsRow(existing);

  const now = new Date().toISOString();
  const publishNow = clean.published && existing.published !== 1;
  const publishedAt = clean.published ? (publishNow || !existing.published_at ? now : existing.published_at) : existing.published_at;
  getDb()
    .prepare(
      `UPDATE news_items SET source = ?, title_de = ?, title_en = ?, summary_de = ?, summary_en = ?, body_de = ?, body_en = ?, date = ?, published = ?, published_at = ?, updated_at = ? WHERE id = ?`,
    )
    .run(...newsFields(clean), publishedAt, now, id);
  recordAdminAudit({ action: 'news.update', detail: { id, fields: changed, published: clean.published } });
  return adminNewsRow(findNewsRow(id));
}

export function deleteAdminNews(id) {
  const existing = findNewsRow(id);
  if (!existing) return false;
  getDb().prepare('DELETE FROM news_items WHERE id = ?').run(id);
  recordAdminAudit({ action: 'news.delete', detail: { id, title: existing.title_de, source: existing.source } });
  return true;
}
