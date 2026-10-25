import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { Readable } from 'node:stream';

import { constantTimeEqual, hashToken, readBearer } from '../auth.js';
import { loadEnv } from '../env.js';
import { escapeHtml } from '../html.js';
import { readBody, readRawBody, sendJson } from '../http.js';

test('loadEnv lets the process environment win', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'server-kit-'));
  const file = join(dir, '.env');
  await writeFile(file, 'UA_TEST_A=from-file\nUA_TEST_B="quoted"\n');
  process.env.UA_TEST_A = 'from-env';
  loadEnv(file);
  assert.equal(process.env.UA_TEST_A, 'from-env');
  assert.equal(process.env.UA_TEST_B, 'quoted');
  delete process.env.UA_TEST_A;
  delete process.env.UA_TEST_B;
  await rm(dir, { recursive: true, force: true });
});

test('HTML escaping covers text and attribute characters', () => {
  assert.equal(escapeHtml(`<a href="x">&'`), '&lt;a href=&quot;x&quot;&gt;&amp;&#39;');
});

test('body readers parse JSON and keep the raw bytes', async () => {
  assert.deepEqual(await readBody(Readable.from(['{"a":1}'])), { a: 1 });
  assert.equal((await readRawBody(Readable.from(['hello']))).toString(), 'hello');
  await assert.rejects(() => readRawBody(Readable.from(['12345']), 3), /larger than/);
});

test('JSON responses set the content type and length', () => {
  const response = {
    headers: null,
    body: '',
    writeHead(status, headers) { this.status = status; this.headers = headers; },
    end(body) { this.body = body; },
  };
  sendJson(response, 201, { ok: true });
  assert.equal(response.status, 201);
  assert.equal(response.headers['Content-Type'], 'application/json; charset=utf-8');
  assert.equal(response.body, '{"ok":true}');
});

test('token helpers accept bearer headers and compare safely', () => {
  assert.equal(readBearer({ headers: { authorization: `Bearer ${'a'.repeat(32)}` } }), 'a'.repeat(32));
  assert.equal(readBearer({ headers: { authorization: 'Basic abc' } }), null);
  assert.equal(hashToken('abc'), hashToken('abc'));
  assert.equal(constantTimeEqual('abc', 'abc'), true);
  assert.equal(constantTimeEqual('abc', 'abd'), false);
});
