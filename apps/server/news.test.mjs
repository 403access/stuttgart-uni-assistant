/**
 * News lifecycle: operator CRUD through `/v1/admin/news`, the public
 * `/v1/news` read model, draft visibility, ordering, and validation.
 */

import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { after, before, beforeEach, test } from 'node:test';

process.env.CAMPUS_DB_PATH = ':memory:';
process.env.DASHBOARD_TOKEN = 'news-token';

const db = await import('./db.mjs');
const { handleAdmin } = await import('./routes/admin/index.mjs');
const { handleNews } = await import('./routes/news.mjs');

let server;
let base;
let cookie;

before(async () => {
  server = createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    if (request.method === 'OPTIONS') {
      response.writeHead(204).end();
      return;
    }
    if (await handleAdmin(request, response, url)) return;
    if (handleNews(request, response, url)) return;
    response.writeHead(404, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: 'not_found' }));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

beforeEach(() => {
  db.resetDbForTests();
});

after(() => new Promise((resolve) => server.close(resolve)));

function call(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (cookie) headers.Cookie = cookie;
  return fetch(base + path, { ...options, headers });
}

async function login() {
  const response = await call('/v1/admin/login', { method: 'POST', body: JSON.stringify({ token: 'news-token' }) });
  assert.equal(response.status, 200);
  cookie = response.headers.get('set-cookie').split(';')[0];
}

const draft = {
  titleDe: 'Neue Öffnungszeiten der Bibliothek',
  titleEn: 'New library hours',
  summaryDe: 'Die Bibliothek öffnet ab Montag länger.',
  bodyDe: 'Ab Montag ist die Bibliothek bis 22 Uhr geöffnet. Der Lernbereich bleibt unverändert.',
  source: 'university',
  date: '2026-10-20',
};

test('operators create, publish, update, unpublish, and delete news', async () => {
  await login();

  const empty = await call('/v1/news');
  assert.equal(empty.status, 200);
  assert.deepEqual(await empty.json(), { items: [], total: 0 });

  const created = await call('/v1/admin/news', { method: 'POST', body: JSON.stringify(draft) });
  assert.equal(created.status, 200);
  const createdItem = (await created.json()).item;
  assert.equal(createdItem.published, false);
  assert.equal(createdItem.title.en, 'New library hours');

  // A draft never reaches the app.
  assert.deepEqual((await (await call('/v1/news')).json()).items, []);
  const draftDetail = await call(`/v1/news/${createdItem.id}`);
  assert.equal(draftDetail.status, 404);

  const detail = await call(`/v1/admin/news/${createdItem.id}`);
  assert.equal(detail.status, 200);
  assert.equal((await detail.json()).item.title.de, draft.titleDe);

  const published = await call(`/v1/admin/news/${createdItem.id}`, {
    method: 'POST',
    body: JSON.stringify({ published: true }),
  });
  assert.equal(published.status, 200);
  assert.equal((await published.json()).item.published, true);

  const publicList = await (await call('/v1/news')).json();
  assert.equal(publicList.total, 1);
  assert.equal(publicList.items[0].id, createdItem.id);
  assert.equal(publicList.items[0].title.en, 'New library hours');
  assert.equal(publicList.items[0].summary.de, draft.summaryDe);
  // The static read model never exposes the draft flag or timestamps.
  assert.equal('published' in publicList.items[0], false);

  const publicDetail = await call(`/v1/news/${createdItem.id}`);
  assert.equal(publicDetail.status, 200);
  assert.equal((await publicDetail.json()).item.body.de, draft.bodyDe);

  const edited = await call(`/v1/admin/news/${createdItem.id}`, {
    method: 'POST',
    body: JSON.stringify({ titleDe: 'Bibliothek: neue Zeiten', summaryEn: 'The library is open longer.' }),
  });
  assert.equal(edited.status, 200);
  const editedItem = (await edited.json()).item;
  assert.equal(editedItem.title.de, 'Bibliothek: neue Zeiten');
  assert.equal(editedItem.summary.en, 'The library is open longer.');
  // Omitted English title keeps the previously stored value.
  assert.equal(editedItem.title.en, 'New library hours');

  const unpublished = await call(`/v1/admin/news/${createdItem.id}`, {
    method: 'POST',
    body: JSON.stringify({ published: false }),
  });
  assert.equal(unpublished.status, 200);
  assert.equal((await unpublished.json()).item.published, false);
  assert.equal((await (await call('/v1/news')).json()).total, 0);
  assert.equal((await call(`/v1/news/${createdItem.id}`)).status, 404);

  const removed = await call(`/v1/admin/news/${createdItem.id}`, { method: 'DELETE' });
  assert.equal(removed.status, 200);
  assert.deepEqual(await removed.json(), { ok: true });
  assert.equal((await call(`/v1/admin/news/${createdItem.id}`, { method: 'DELETE' })).status, 404);

  const audit = await (await call('/v1/admin/audit?query=news.')).json();
  assert.equal(audit.entries.some((entry) => entry.action === 'news.create'), true);
  assert.equal(audit.entries.some((entry) => entry.action === 'news.update'), true);
  assert.equal(audit.entries.some((entry) => entry.action === 'news.delete'), true);
});

test('the admin list filters by state and text, and public items sort by date', async () => {
  await login();
  const older = await call('/v1/admin/news', {
    method: 'POST',
    body: JSON.stringify({ ...draft, titleDe: 'Ältere Meldung', date: '2026-10-01', published: true }),
  });
  const newer = await call('/v1/admin/news', {
    method: 'POST',
    body: JSON.stringify({ ...draft, titleDe: 'Neuere Meldung', date: '2026-10-22', published: true }),
  });
  await call('/v1/admin/news', { method: 'POST', body: JSON.stringify({ ...draft, titleDe: 'Entwurf', published: false }) });
  assert.equal(older.status, 200);
  assert.equal(newer.status, 200);

  const published = await (await call('/v1/admin/news?state=published')).json();
  assert.equal(published.total, 2);
  assert.deepEqual(published.items.map((item) => item.title.de), ['Neuere Meldung', 'Ältere Meldung']);

  const drafts = await (await call('/v1/admin/news?state=draft')).json();
  assert.equal(drafts.total, 1);
  assert.equal(drafts.items[0].title.de, 'Entwurf');

  const search = await (await call('/v1/admin/news?query=Neuere')).json();
  assert.equal(search.total, 1);
  assert.equal(search.items[0].title.de, 'Neuere Meldung');

  const publicList = await (await call('/v1/news')).json();
  assert.deepEqual(publicList.items.map((item) => item.title.de), ['Neuere Meldung', 'Ältere Meldung']);

  const limited = await (await call('/v1/news?limit=1')).json();
  assert.equal(limited.total, 1);
  assert.equal(limited.items[0].title.de, 'Neuere Meldung');
});

test('invalid writes are rejected and unknown ids answer 404', async () => {
  await login();

  const noTitle = await call('/v1/admin/news', { method: 'POST', body: JSON.stringify({ ...draft, titleDe: '   ' }) });
  assert.equal(noTitle.status, 400);
  assert.equal((await noTitle.json()).error, 'news_title_missing');

  const noBody = await call('/v1/admin/news', { method: 'POST', body: JSON.stringify({ ...draft, bodyDe: '' }) });
  assert.equal(noBody.status, 400);
  assert.equal((await noBody.json()).error, 'news_body_missing');

  const badSource = await call('/v1/admin/news', { method: 'POST', body: JSON.stringify({ ...draft, source: 'twitter' }) });
  assert.equal(badSource.status, 400);
  assert.equal((await badSource.json()).error, 'bad_news_source');

  const badDate = await call('/v1/admin/news', { method: 'POST', body: JSON.stringify({ ...draft, date: '20.10.2026' }) });
  assert.equal(badDate.status, 400);
  assert.equal((await badDate.json()).error, 'bad_news_date');

  const missing = await call('/v1/admin/news/news_missing', { method: 'POST', body: '{}' });
  assert.equal(missing.status, 404);
  assert.equal((await missing.json()).error, 'unknown_news');

  assert.equal((await call('/v1/news/news_missing')).status, 404);
  assert.equal((await call('/v1/news/')).status, 404);
});
