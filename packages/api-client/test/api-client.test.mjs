import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ApiError, createAdminClient, createClient, createPublicClient } from '../index.js';

function fakeFetch(handler) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    const result = await handler(url, init);
    return {
      ok: result.status >= 200 && result.status < 300,
      status: result.status,
      text: async () => (result.body === undefined ? '' : JSON.stringify(result.body)),
    };
  };
  return { fetchImpl, calls };
}

test('a client sends JSON, bearer tokens, and query strings', async () => {
  const { fetchImpl, calls } = fakeFetch(() => ({ status: 200, body: { ok: true } }));
  const client = createClient({ baseUrl: 'https://api.test', token: 'secret', fetchImpl });
  const result = await client.get('/v1/items', { query: { q: 'a b', page: 2, skip: undefined } });
  assert.deepEqual(result, { ok: true });
  assert.equal(calls[0].url, 'https://api.test/v1/items?q=a+b&page=2');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer secret');
});

test('a POST body is serialized once as JSON', async () => {
  const { fetchImpl, calls } = fakeFetch(() => ({ status: 201, body: { id: 1 } }));
  const client = createClient({ baseUrl: 'https://api.test', fetchImpl });
  await client.post('/v1/items', { name: 'x' });
  assert.equal(calls[0].init.body, '{"name":"x"}');
  assert.equal(calls[0].init.headers['Content-Type'], 'application/json');
});

test('an error response becomes one ApiError shape', async () => {
  const { fetchImpl } = fakeFetch(() => ({ status: 409, body: { error: 'account_taken', detail: 'taken' } }));
  const client = createClient({ baseUrl: 'https://api.test', fetchImpl });
  await assert.rejects(
    () => client.post('/v1/items', {}),
    (error) => error instanceof ApiError && error.code === 'account_taken' && error.status === 409 && error.detail === 'taken',
  );
});

test('a network failure becomes an ApiError', async () => {
  const client = createClient({ baseUrl: 'https://api.test', fetchImpl: async () => { throw new Error('offline'); } });
  await assert.rejects(() => client.get('/health'), (error) => error instanceof ApiError && error.code === 'network');
});

test('the public and admin clients expose the expected surfaces', async () => {
  const { fetchImpl, calls } = fakeFetch(() => ({ status: 200, body: { ok: true } }));
  const publicClient = createPublicClient({ baseUrl: 'https://api.test', fetchImpl });
  await publicClient.health();
  await publicClient.campusStructure({ studyId: 1, elementId: 2 });
  assert.equal(calls[0].url, 'https://api.test/health');
  assert.equal(calls[1].url, 'https://api.test/v1/campus/structure');

  const adminClient = createAdminClient({ baseUrl: 'https://api.test', fetchImpl });
  await adminClient.users({ limit: 25 });
  assert.equal(calls[2].url, 'https://api.test/v1/admin/users?limit=25');
  assert.equal(calls[2].init.credentials, 'same-origin');
});
