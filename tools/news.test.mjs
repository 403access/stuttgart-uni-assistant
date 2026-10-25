import assert from 'node:assert/strict';
import { test } from 'node:test';

import { asNewsItem, asNewsList, mergeNews } from '../apps/mobile/src/news/parse.ts';

/**
 * The server payload is untrusted input: one malformed row must not blank the
 * feed, English may be missing, and a duplicate id keeps the server copy.
 */

function row(overrides = {}) {
  return {
    id: 'news_1',
    source: 'faculty',
    title: { de: 'Titel', en: 'Title' },
    summary: { de: 'Kurz', en: 'Short' },
    body: { de: 'Text', en: 'Body' },
    date: '2026-10-20',
    ...overrides,
  };
}

test('the news parser rejects unusable rows and falls back to German', () => {
  assert.equal(asNewsItem(null), null);
  assert.equal(asNewsItem({}), null);
  assert.equal(asNewsItem(row({ id: '  ' })), null);
  assert.equal(asNewsItem(row({ title: { de: '', en: 'Only English' } })), null);
  assert.equal(asNewsItem(row({ body: { de: '', en: 'Only English' } })), null);
  assert.equal(asNewsItem(row({ date: '20.10.2026' })), null);

  const fallback = asNewsItem(row({ title: { de: 'Nur Deutsch' }, summary: {}, body: { de: 'Text' }, source: 'twitter' }));
  assert.deepEqual(fallback, {
    id: 'news_1',
    source: 'university',
    title: { de: 'Nur Deutsch', en: 'Nur Deutsch' },
    summary: { de: '', en: '' },
    body: { de: 'Text', en: 'Text' },
    date: '2026-10-20',
  });

  assert.deepEqual(asNewsList('nope'), []);
  assert.deepEqual(asNewsList([row(), null, { id: 'broken' }]).map((item) => item.id), ['news_1']);
  assert.equal(asNewsList(Array.from({ length: 250 }, (_, index) => row({ id: `news_${index}` }))).length, 200);
});

test('merging keeps the last copy and sorts newest date first', () => {
  const bundled = [
    { ...asNewsItem(row({ id: 'bundled', date: '2026-10-01' })) },
    { ...asNewsItem(row({ id: 'shared', title: { de: 'Alt' }, date: '2026-10-02' })) },
  ];
  const server = [
    { ...asNewsItem(row({ id: 'shared', title: { de: 'Neu' }, date: '2026-10-03' })) },
    { ...asNewsItem(row({ id: 'newer', date: '2026-10-04' })) },
  ];
  const merged = mergeNews(bundled, server);
  assert.deepEqual(merged.map((item) => item.id), ['newer', 'shared', 'bundled']);
  assert.equal(merged.find((item) => item.id === 'shared').title.de, 'Neu');
});
