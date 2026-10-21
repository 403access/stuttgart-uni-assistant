/** Pure parsing and merging of app news, kept free of Expo imports for tests. */

import type { NewsItem, NewsSource } from '@/src/types';

const SOURCES: readonly NewsSource[] = ['stuvus', 'faculty', 'institute', 'university', 'sdg'];
const MAX_NEWS = 200;

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function localized(value: unknown): { de: string; en: string } {
  const record = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const de = text(record.de);
  const en = text(record.en);
  return { de, en: en || de };
}

/** One server row as a `NewsItem`, or null when the payload is unusable. */
export function asNewsItem(value: unknown): NewsItem | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const id = text(record.id);
  const title = localized(record.title);
  const body = localized(record.body);
  const date = text(record.date).slice(0, 10);
  if (!id || !title.de || !body.de || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const source = SOURCES.includes(record.source as NewsSource) ? (record.source as NewsSource) : 'university';
  return { id, source, title, summary: localized(record.summary), body, date };
}

export function asNewsList(value: unknown): NewsItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, MAX_NEWS)
    .map(asNewsItem)
    .filter((item): item is NewsItem => item !== null);
}

/** Merge bundled and server rows; the later collection wins on a duplicate id. */
export function mergeNews(...collections: NewsItem[][]): NewsItem[] {
  const byId = new Map<string, NewsItem>();
  for (const collection of collections) {
    for (const item of collection) byId.set(item.id, item);
  }
  return [...byId.values()].sort(
    (a, b) => b.date.localeCompare(a.date) || a.title.de.localeCompare(b.title.de),
  );
}
