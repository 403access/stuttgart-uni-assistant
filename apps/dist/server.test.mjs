import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { loadEnv } from './env.mjs';
import { buildPage, escapeHtml, manifestPlist } from './render.mjs';

const serverPath = fileURLToPath(new URL('./server.mjs', import.meta.url));
const TOKEN = 'test-token';
const PUBLIC_URL = 'https://builds.test';

const running = [];

/** A port the OS says is free, so parallel suites do not collide. */
function freePort() {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.on('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

async function startService() {
  const dataDir = await mkdtemp(join(tmpdir(), 'dist-service-'));
  const port = await freePort();
  const child = spawn(process.execPath, [serverPath], {
    env: {
      ...process.env,
      DIST_PORT: String(port),
      DIST_HOST: '127.0.0.1',
      DIST_TOKEN: TOKEN,
      DIST_PUBLIC_URL: PUBLIC_URL,
      DIST_DATA_DIR: dataDir,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stderr = '';
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk) => {
    stderr += chunk;
  });

  const base = `http://127.0.0.1:${port}`;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await fetch(`${base}/health`);
      if (response.ok) {
        running.push({ child, dataDir });
        return { base, child, dataDir, stderr: () => stderr };
      }
    } catch {
      // not listening yet
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  child.kill('SIGKILL');
  await rm(dataDir, { recursive: true, force: true });
  throw new Error(`The service did not start.\n${stderr}`);
}

afterEach(async () => {
  await Promise.all(
    running.splice(0).map(async ({ child, dataDir }) => {
      child.kill('SIGKILL');
      await rm(dataDir, { recursive: true, force: true });
    }),
  );
});

const metadata = {
  'x-app-version': '1.0.0',
  'x-build': '1',
  'x-bundle-id': 'dev.demo.universityassistant',
  'x-app-name': encodeURIComponent('University Assistant'),
  'x-team-id': 'QML5B57EMH',
  'x-expires-at': '2027-10-18T20:48:08Z',
  'x-provisioned-devices': '2',
  'x-notes': encodeURIComponent('first test build'),
};

function upload(base, { body = Buffer.from('fake-ipa-bytes'), headers = {}, token = TOKEN } = {}) {
  return fetch(`${base}/api/builds`, {
    method: 'POST',
    headers: {
      'content-type': 'application/octet-stream',
      'x-sha256': createHash('sha256').update(body).digest('hex'),
      ...metadata,
      ...headers,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body,
  });
}

test('publishes a build and serves its history, binary and manifest', async () => {
  const { base } = await startService();

  const created = await upload(base);
  assert.equal(created.status, 201);
  const { id, url, build } = await created.json();
  assert.match(id, /^[0-9a-f]{16}$/);
  assert.equal(url, `${PUBLIC_URL}/b/${id}`);
  assert.equal(build.version, '1.0.0');
  assert.equal(build.notes, 'first test build');
  assert.equal(build.provisionedDevices, 2);
  assert.equal(build.file, undefined, 'the filesystem path must not leave the process');

  const list = await (await fetch(`${base}/api/builds`)).json();
  assert.equal(list.length, 1);
  assert.equal(list[0].id, id);
  assert.equal(list[0].sha256.length, 64);

  const binary = await fetch(`${base}/b/${id}/ipa`);
  assert.equal(binary.status, 200);
  assert.equal(await binary.text(), 'fake-ipa-bytes');

  const manifest = await fetch(`${base}/b/${id}/manifest.plist`);
  assert.equal(manifest.status, 200);
  const plist = await manifest.text();
  assert.match(plist, new RegExp(`${PUBLIC_URL}/b/${id}/ipa`));
  assert.match(plist, /dev\.demo\.universityassistant/);
  assert.match(plist, /<key>bundle-version<\/key>\s*<string>1<\/string>/);

  const page = await fetch(`${base}/b/${id}`);
  assert.match(await page.text(), /itms-services:\/\/\?action=download-manifest/);

  const index = await fetch(`${base}/`);
  assert.match(await index.text(), /1\.0\.0/);
});

test('refuses an upload without the token', async () => {
  const { base } = await startService();
  const response = await upload(base, { token: '' });
  assert.equal(response.status, 401);
});

test('refuses an upload whose body does not match the declared hash', async () => {
  const { base } = await startService();
  const body = Buffer.from('tampered');
  const response = await fetch(`${base}/api/builds`, {
    method: 'POST',
    headers: {
      'content-type': 'application/octet-stream',
      'x-sha256': '0'.repeat(64),
      ...metadata,
      authorization: `Bearer ${TOKEN}`,
    },
    body,
  });
  assert.equal(response.status, 422);
  const payload = await response.json();
  assert.equal(payload.error, 'sha256_mismatch');
  assert.equal((await (await fetch(`${base}/api/builds`)).json()).length, 0);
});

test('refuses an upload that omits the metadata', async () => {
  const { base } = await startService();
  const response = await fetch(`${base}/api/builds`, {
    method: 'POST',
    headers: { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/octet-stream' },
    body: Buffer.from('x'),
  });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, 'missing_metadata');
});

test('registers devices for the next profile, with the token', async () => {
  const { base } = await startService();
  const udid = '00008101-001971222298001E';

  const unauthorized = await fetch(`${base}/api/devices/${udid}`, { method: 'PUT' });
  assert.equal(unauthorized.status, 401);

  const created = await fetch(`${base}/api/devices/${udid}?name=Oliver%27s%20iPhone`, {
    method: 'PUT',
    headers: { authorization: `Bearer ${TOKEN}` },
  });
  assert.equal(created.status, 200);

  const devices = await (
    await fetch(`${base}/api/devices`, { headers: { authorization: `Bearer ${TOKEN}` } })
  ).json();
  assert.equal(devices.length, 1);
  assert.equal(devices[0].udid, udid);
  assert.equal(devices[0].name, "Oliver's iPhone");
});

test('answers 404 for an unknown build and an unknown route', async () => {
  const { base } = await startService();
  assert.equal((await fetch(`${base}/b/${'0'.repeat(16)}`)).status, 404);
  assert.equal((await fetch(`${base}/nope`)).status, 404);
});

test('loadEnv fills unset keys and never overrides one already set', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'dist-env-'));
  const file = join(dir, '.env');
  await writeFile(file, 'DIST_TEST_FROM_FILE=from-file\nDIST_TEST_PRESET=from-file\n# a comment\n\n');
  process.env.DIST_TEST_PRESET = 'from-shell';

  loadEnv(file);

  assert.equal(process.env.DIST_TEST_FROM_FILE, 'from-file');
  assert.equal(process.env.DIST_TEST_PRESET, 'from-shell', 'the environment wins');

  delete process.env.DIST_TEST_FROM_FILE;
  delete process.env.DIST_TEST_PRESET;
  await rm(dir, { recursive: true, force: true });
});

test('escapes build metadata before it reaches the page', () => {
  const html = buildPage(
    {
      id: 'a'.repeat(16),
      createdAt: '2026-10-19T12:00:00Z',
      version: '1.0.0',
      build: '1',
      title: '<script>alert(1)</script>',
      bundleId: 'dev.demo.universityassistant',
      notes: '<img src=x onerror=alert(2)>',
      sha256: 'f'.repeat(64),
      bytes: 1024,
      teamId: 'QML5B57EMH',
      expiresAt: '2027-10-18T20:48:08Z',
      provisionedDevices: 2,
      file: '/tmp/x.ipa',
    },
    { base: 'https://builds.test', deviceCount: 2, now: new Date('2026-10-19T12:00:00Z') },
  );

  assert.doesNotMatch(html, /<script>alert/);
  assert.doesNotMatch(html, /<img src=x/);
  assert.match(html, /&lt;script&gt;/);
  assert.equal(escapeHtml(`a&b<c>"d"'e'`), 'a&amp;b&lt;c&gt;&quot;d&quot;&#39;e&#39;');
});

test('warns when the profile covers fewer devices than are registered', () => {
  const build = {
    id: 'b'.repeat(16),
    createdAt: '2026-10-19T12:00:00Z',
    version: '1.0.0',
    build: '1',
    title: 'App',
    bundleId: 'dev.demo.universityassistant',
    notes: '',
    sha256: 'f'.repeat(64),
    bytes: 1024,
    teamId: 'QML5B57EMH',
    expiresAt: '2027-10-18T20:48:08Z',
    provisionedDevices: 2,
    file: '/tmp/x.ipa',
  };

  const html = buildPage(build, { base: 'https://builds.test', deviceCount: 5, now: new Date('2026-10-19T12:00:00Z') });
  assert.match(html, /profile covers 2 device\(s\), but 5 are registered/);
});

test('the manifest points at absolute HTTPS URLs', () => {
  const plist = manifestPlist(
    { id: 'c'.repeat(16), build: '7', bundleId: 'dev.demo.universityassistant', title: 'App & Co' },
    { base: 'https://builds.test' },
  );
  assert.match(plist, /https:\/\/builds\.test\/b\/cccccccccccccccc\/ipa/);
  assert.match(plist, /<string>7<\/string>/);
  assert.match(plist, /App &amp; Co/);
});
