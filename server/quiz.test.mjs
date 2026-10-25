/**
 * Server-side quiz catalog and answer analytics: seeding, the public catalog,
 * the authenticated sync, and the admin CRUD/read routes.
 */

import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { after, before, beforeEach, test } from 'node:test';

process.env.CAMPUS_DB_PATH = ':memory:';
process.env.DASHBOARD_TOKEN = 'quiz-token';

const db = await import('./db.mjs');
const auth = await import('./auth.mjs');
const { seedQuizCatalog } = await import('./quiz/seed.mjs');
const { handleAdmin } = await import('./routes/admin/index.mjs');
const { handleQuiz } = await import('./routes/quiz.mjs');

let server;
let base;
let cookie;
let user;
let token;

before(async () => {
  server = createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    if (request.method === 'OPTIONS') {
      response.writeHead(204).end();
      return;
    }
    if (await handleAdmin(request, response, url)) return;
    if (await handleQuiz(request, response, url)) return;
    response.writeHead(404, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: 'not_found' }));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;

  const login = await fetch(base + '/v1/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: 'quiz-token' }),
  });
  assert.equal(login.status, 200);
  cookie = login.headers.get('set-cookie').split(';')[0];
});

beforeEach(() => {
  db.resetDbForTests();
  seedQuizCatalog();
  const session = auth.createUserSession({ account: 'quiz-user', name: 'Quiz User', mode: 'demo' });
  user = session.user;
  token = session.token;
});

after(() => new Promise((resolve) => server.close(resolve)));

function call(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.admin) headers.Cookie = cookie;
  return fetch(base + path, { ...options, headers });
}

function attempt(overrides = {}) {
  return {
    clientId: 'attempt-1',
    topicId: 'bpp-vocal-tract',
    topicTitle: { de: 'Der Kopf: Artikulatoren', en: 'The head: articulators' },
    questionId: 'bpp-diagram-velum',
    kind: 'diagram',
    prompt: { de: 'Tippe auf das Velum.', en: 'Tap the velum.' },
    answer: ['velum'],
    answerText: 'Velum (weicher Gaumen)',
    correct: true,
    answeredAt: '2026-10-25T12:00:00.000Z',
    roundId: 'bpp-vocal-tract:2026-10-25T12:00:00.000Z',
    ...overrides,
  };
}

test('the catalog seeds once and serves the published projection', async () => {
  const second = seedQuizCatalog();
  assert.equal(second.seeded, false);
  assert.equal(second.topics, 15);
  assert.equal(second.questions, 347);

  const response = await call('/v1/quiz/catalog');
  assert.equal(response.status, 200);
  const catalog = await response.json();
  assert.equal(catalog.modules.length, 5);
  const bpp = catalog.modules.find((module) => module.id === 'bpp');
  assert.ok(bpp);
  assert.equal(bpp.topics.length, 3);
  const head = bpp.topics.find((topic) => topic.id === 'bpp-vocal-tract');
  assert.ok(head);
  assert.ok(head.figure);
  const diagram = head.questions.find((question) => question.id === 'bpp-diagram-velum');
  assert.equal(diagram.kind, 'diagram');
  assert.equal(diagram.viewBox, '160 40 760 950');
  assert.ok(diagram.regions.length >= 10);
  assert.deepEqual(diagram.correctIds, ['velum']);
});

test('the authenticated sync is idempotent and the admin sees every answer', async () => {
  const payload = {
    attempts: [
      attempt(),
      attempt({
        clientId: 'attempt-2',
        questionId: 'bpp-diagram-alveolar',
        prompt: { de: 'Tippe auf den Zahndamm.', en: 'Tap the alveolar ridge.' },
        answer: ['teeth'],
        answerText: 'Zähne',
        correct: false,
        answeredAt: '2026-10-25T12:01:00.000Z',
      }),
    ],
    sessions: [{
      clientId: 'session-1',
      topicId: 'bpp-vocal-tract',
      topicTitle: { de: 'Der Kopf: Artikulatoren', en: 'The head: articulators' },
      mode: 'all',
      correct: 1,
      total: 2,
      durationSeconds: 95,
      startedAt: '2026-10-25T12:00:00.000Z',
      finishedAt: '2026-10-25T12:01:35.000Z',
    }],
  };

  const first = await call('/v1/quiz/sync', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  assert.equal(first.status, 200);
  assert.deepEqual(await first.json(), {
    attempts: { accepted: 2, duplicates: 0 },
    sessions: { accepted: 1, duplicates: 0 },
  });

  const duplicate = await call('/v1/quiz/sync', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  assert.deepEqual(await duplicate.json(), {
    attempts: { accepted: 0, duplicates: 2 },
    sessions: { accepted: 0, duplicates: 1 },
  });

  const unauthorized = await call('/v1/quiz/sync', { method: 'POST', body: JSON.stringify(payload) });
  assert.equal(unauthorized.status, 401);

  const response = await call('/v1/admin/quiz/attempts', { admin: true });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.total, 2);
  assert.equal(data.stats.correct, 1);
  assert.equal(data.stats.users, 1);
  assert.equal(data.items[0].account, 'quiz-user');
  assert.ok(data.items[0].answerText);
  assert.equal(data.items[0].answeredAt, '2026-10-25T12:01:00.000Z');

  const wrong = await call('/v1/admin/quiz/attempts?correct=0', { admin: true });
  const wrongData = await wrong.json();
  assert.equal(wrongData.total, 1);
  assert.equal(wrongData.items[0].correct, false);

  const filtered = await call('/v1/admin/quiz/attempts?query=Velum', { admin: true });
  const filteredData = await filtered.json();
  assert.equal(filteredData.total, 1);
  assert.equal(filteredData.items[0].questionId, 'bpp-diagram-velum');

  const csv = await call('/v1/admin/quiz/attempts/export.csv', { admin: true });
  assert.equal(csv.status, 200);
  assert.match(csv.headers.get('content-type'), /text\/csv/);
  const text = await csv.text();
  assert.match(text, /"Konto";"Name";"Thema"/);
  assert.match(text, /quiz-user/);
  assert.match(text, /Zähne/);

  const sessions = await call('/v1/admin/quiz/sessions', { admin: true });
  const sessionData = await sessions.json();
  assert.equal(sessionData.total, 1);
  assert.equal(sessionData.items[0].durationSeconds, 95);
  assert.equal(sessionData.items[0].accuracy, 50);

  const own = await call(`/v1/admin/quiz/users/${user.id}`, { admin: true });
  const ownData = await own.json();
  assert.equal(ownData.stats.total, 2);
  assert.equal(ownData.byTopic[0].topicId, 'bpp-vocal-tract');
  assert.equal(ownData.sessions.length, 1);

  const overview = await call('/v1/admin/quiz/overview', { admin: true });
  const overviewData = await overview.json();
  assert.equal(overviewData.attempts, 2);
  assert.equal(overviewData.users, 1);
  assert.equal(overviewData.accuracy, 50);
  assert.equal(overviewData.modulesList.find((module) => module.id === 'bpp').attempts, 2);
});

test('admins create, edit, publish, and delete topics and questions', async () => {
  const created = await call('/v1/admin/quiz/topics', {
    method: 'POST',
    admin: true,
    body: JSON.stringify({
      id: 'quiz-test-topic',
      moduleId: 'bpp',
      titleDe: 'Testthema',
      titleEn: 'Test topic',
      summaryDe: 'Eine Zusammenfassung.',
      summaryEn: 'A summary.',
      published: true,
    }),
  });
  assert.equal(created.status, 200);
  const createdData = await created.json();
  assert.equal(createdData.item.title.de, 'Testthema');
  assert.equal(createdData.item.published, true);

  const badPayload = await call('/v1/admin/quiz/questions', {
    method: 'POST',
    admin: true,
    body: JSON.stringify({
      topicId: 'quiz-test-topic',
      kind: 'single',
      promptDe: 'Frage?',
      payload: { options: [{ id: 'a', label: { de: 'A' } }], correctId: 'a' },
    }),
  });
  assert.equal(badPayload.status, 400);
  const badData = await badPayload.json();
  assert.equal(badData.error, 'quiz_payload_invalid');

  const question = await call('/v1/admin/quiz/questions', {
    method: 'POST',
    admin: true,
    body: JSON.stringify({
      id: 'quiz-test-question',
      topicId: 'quiz-test-topic',
      kind: 'single',
      difficulty: 1,
      promptDe: 'Welche Antwort?',
      promptEn: 'Which answer?',
      published: true,
      payload: {
        options: [
          { id: 'a', label: { de: 'Richtig', en: 'Correct' } },
          { id: 'b', label: { de: 'Falsch', en: 'Wrong' } },
        ],
        correctId: 'a',
      },
    }),
  });
  assert.equal(question.status, 200);
  const questionData = await question.json();
  assert.equal(questionData.topic.questions.length, 1);

  const detail = await call('/v1/admin/quiz/topics/quiz-test-topic', { admin: true });
  const detailData = await detail.json();
  assert.equal(detailData.topic.questions[0].id, 'quiz-test-question');
  assert.equal(detailData.topic.questions[0].payload.correctId, 'a');

  const shown = await call('/v1/quiz/catalog');
  const shownData = await shown.json();
  assert.ok(shownData.modules.find((module) => module.id === 'bpp').topics.some((topic) => topic.id === 'quiz-test-topic'));

  const hidden = await call('/v1/admin/quiz/topics/quiz-test-topic', {
    method: 'POST',
    admin: true,
    body: JSON.stringify({ published: false }),
  });
  assert.equal(hidden.status, 200);
  const hiddenCatalog = await (await call('/v1/quiz/catalog')).json();
  assert.equal(hiddenCatalog.modules.find((module) => module.id === 'bpp').topics.some((topic) => topic.id === 'quiz-test-topic'), false);

  const update = await call('/v1/admin/quiz/questions/quiz-test-question', {
    method: 'POST',
    admin: true,
    body: JSON.stringify({ promptDe: 'Neue Frage?', published: false }),
  });
  assert.equal(update.status, 200);
  const updated = await update.json();
  assert.equal(updated.topic.questions[0].prompt.de, 'Neue Frage?');
  assert.equal(updated.topic.questions[0].published, false);

  const deleteQuestion = await call('/v1/admin/quiz/questions/quiz-test-question', { method: 'DELETE', admin: true });
  assert.equal(deleteQuestion.status, 200);
  const deleteTopic = await call('/v1/admin/quiz/topics/quiz-test-topic', { method: 'DELETE', admin: true });
  assert.equal(deleteTopic.status, 200);

  const missing = await call('/v1/admin/quiz/topics/quiz-test-topic', { admin: true });
  assert.equal(missing.status, 404);
});

test('module metadata survives a forced catalog import and keeps answers', async () => {
  await call('/v1/quiz/sync', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ attempts: [attempt()] }),
  });

  const moduleUpdate = await call('/v1/admin/quiz/modules/bpp', {
    method: 'POST',
    admin: true,
    body: JSON.stringify({ subtitleDe: 'Neu beschrieben.', lecturer: 'Dr. Test' }),
  });
  assert.equal(moduleUpdate.status, 200);
  assert.equal((await moduleUpdate.json()).item.subtitle.de, 'Neu beschrieben.');

  const reseed = await call('/v1/admin/quiz/seed', { method: 'POST', admin: true, body: JSON.stringify({}) });
  assert.equal(reseed.status, 200);
  const reseedData = await reseed.json();
  assert.equal(reseedData.seeded, true);
  assert.equal(reseedData.questions, 347);

  const attempts = await call('/v1/admin/quiz/attempts', { admin: true });
  assert.equal((await attempts.json()).total, 1);

  const modules = await call('/v1/admin/quiz/modules', { admin: true });
  const modulesData = await modules.json();
  assert.match(modulesData.items.find((module) => module.id === 'bpp').subtitle.de, /Artikulatorische Phonetik/);
});
