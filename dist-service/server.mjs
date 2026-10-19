#!/usr/bin/env node
/**
 * The iOS build distribution service: hosts exported `.ipa` files, keeps the
 * history, and serves the over-the-air install manifest.
 *
 *   DIST_TOKEN=... npm run dist:serve
 *
 * Deliberately a standalone process with its own port, database and data
 * directory. It shares nothing with the assistant server: this is meant to be
 * deployed on its own host behind its own domain, and to keep working when the
 * rest of the project is not running.
 *
 * What it is not: a signing service. The `.ipa` arrives already signed, and an
 * ad-hoc profile only installs on devices whose UDID is inside it. Adding a
 * tester therefore means re-exporting the build; this service can only show you
 * that the gap exists.
 *
 * Configuration (all optional except DIST_TOKEN for writes):
 *   DIST_TOKEN        bearer token that authorises uploads and device edits
 *   DIST_PORT         default 8788
 *   DIST_HOST         default 127.0.0.1, which is what a reverse proxy wants
 *   DIST_PUBLIC_URL   the public origin, e.g. https://builds.example.org; used to
 *                     build absolute URLs in the install manifest
 *   DIST_DATA_DIR     database and `.ipa` files, default ./data
 *   DIST_MAX_BYTES    upload cap, default 512 MB
 */

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { createReadStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join } from 'node:path';

import {
  countDevices,
  createBuild,
  dataDir,
  getBuild,
  ipaDir,
  listBuilds,
  listDevices,
  registerDevice,
} from './db.mjs';
import { buildPage, indexPage, manifestPlist } from './render.mjs';
import { loadEnv } from './env.mjs';

// The repository keeps one `.env` at the root and `server/index.mjs` reads it the
// same way. Values already in the environment win, so a systemd unit on a server
// overrides the file without editing it.
loadEnv(new URL('../.env', import.meta.url));

const PORT = Number(process.env.DIST_PORT || 8788);
const HOST = process.env.DIST_HOST || '127.0.0.1';
const TOKEN = process.env.DIST_TOKEN || '';
const MAX_BYTES = Number(process.env.DIST_MAX_BYTES || 512 * 1024 * 1024);
const UDID_PATTERN = /^[A-Za-z0-9-]{8,64}$/;

/** The origin iOS will fetch the manifest and the `.ipa` from. */
function baseUrl(request) {
  if (process.env.DIST_PUBLIC_URL) return process.env.DIST_PUBLIC_URL.replace(/\/+$/, '');
  const proto = request.headers['x-forwarded-proto'] || 'http';
  const host = request.headers.host || `localhost:${PORT}`;
  return `${proto}://${host}`;
}

function authorized(request) {
  if (!TOKEN) return false;
  const given = Buffer.from(String(request.headers.authorization || ''));
  const expected = Buffer.from(`Bearer ${TOKEN}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

function sendJson(response, status, value) {
  const body = JSON.stringify(value);
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
  });
  response.end(body);
}

function sendHtml(response, status, html) {
  response.writeHead(status, {
    'content-type': 'text/html; charset=utf-8',
    'content-length': Buffer.byteLength(html),
  });
  response.end(html);
}

/** Read a request body, refusing to buffer more than the cap. */
async function readBody(request, limit = MAX_BYTES) {
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    total += chunk.length;
    if (total > limit) {
      const error = new Error(`Body is larger than ${limit} bytes.`);
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function header(request, name) {
  const value = request.headers[name];
  return typeof value === 'string' ? value : '';
}

/** A header the client percent-encoded, so non-ASCII survives the wire. */
function decodedHeader(request, name) {
  const raw = header(request, name);
  if (!raw) return '';
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/** Strip the filesystem path before anything leaves the process. */
function publicBuild(build) {
  const { file, ...rest } = build;
  return rest;
}

async function handleBuildUpload(request, response) {
  if (!TOKEN) {
    return sendJson(response, 503, {
      error: 'no_token',
      detail: 'DIST_TOKEN is not set, so uploads are disabled.',
    });
  }
  if (!authorized(request)) return sendJson(response, 401, { error: 'unauthorized' });

  const version = header(request, 'x-app-version');
  const buildNumber = header(request, 'x-build');
  const bundleId = header(request, 'x-bundle-id');
  const sha256 = header(request, 'x-sha256').toLowerCase();
  if (!version || !buildNumber || !bundleId || !sha256) {
    return sendJson(response, 400, {
      error: 'missing_metadata',
      detail: 'x-app-version, x-build, x-bundle-id and x-sha256 are required.',
    });
  }

  let body;
  try {
    body = await readBody(request);
  } catch (error) {
    request.destroy();
    return sendJson(response, error.status ?? 400, { error: 'body_rejected', detail: error.message });
  }
  if (body.length === 0) return sendJson(response, 400, { error: 'empty_body' });

  const digest = createHash('sha256').update(body).digest('hex');
  if (digest !== sha256) {
    return sendJson(response, 422, { error: 'sha256_mismatch', expected: sha256, actual: digest });
  }

  const id = randomBytes(8).toString('hex');
  mkdirSync(ipaDir(), { recursive: true });
  const file = join(ipaDir(), `${id}.ipa`);
  await writeFile(file, body);

  let notes = '';
  try {
    notes = decodeURIComponent(header(request, 'x-notes'));
  } catch {
    notes = header(request, 'x-notes');
  }

  const provisioned = Number(header(request, 'x-provisioned-devices'));

  const build = createBuild({
    id,
    createdAt: new Date().toISOString(),
    version,
    build: buildNumber,
    title: decodedHeader(request, 'x-app-name') || 'University Assistant',
    bundleId,
    notes,
    sha256: digest,
    bytes: body.length,
    teamId: header(request, 'x-team-id'),
    expiresAt: header(request, 'x-expires-at'),
    provisionedDevices: Number.isFinite(provisioned) ? provisioned : 0,
    file,
  });

  return sendJson(response, 201, {
    id,
    url: `${baseUrl(request)}/b/${id}`,
    build: publicBuild(build),
  });
}

function handleIpa(request, response, build) {
  if (!existsSync(build.file)) {
    return sendJson(response, 410, { error: 'file_missing', detail: 'The record exists but the .ipa does not.' });
  }
  const { size } = statSync(build.file);
  response.writeHead(200, {
    'content-type': 'application/octet-stream',
    'content-length': size,
    'content-disposition': `attachment; filename="${build.id}.ipa"`,
  });
  createReadStream(build.file).pipe(response);
}

async function route(request, response) {
  const url = new URL(request.url || '/', baseUrl(request));
  const { pathname } = url;
  const method = request.method || 'GET';

  if (method === 'GET' && pathname === '/health') {
    return sendJson(response, 200, { ok: true, builds: listBuilds().length });
  }

  if (method === 'GET' && pathname === '/') {
    return sendHtml(response, 200, indexPage(listBuilds(), { deviceCount: countDevices() }));
  }

  if (method === 'GET' && pathname === '/api/builds') {
    return sendJson(response, 200, listBuilds().map(publicBuild));
  }

  if (method === 'POST' && pathname === '/api/builds') {
    return handleBuildUpload(request, response);
  }

  if (pathname === '/api/devices' || pathname.startsWith('/api/devices/')) {
    if (!authorized(request)) return sendJson(response, 401, { error: 'unauthorized' });

    if (method === 'GET' && pathname === '/api/devices') {
      return sendJson(response, 200, listDevices());
    }

    const udid = decodeURIComponent(pathname.slice('/api/devices/'.length));
    if (method === 'PUT' && UDID_PATTERN.test(udid)) {
      let name = url.searchParams.get('name') || '';
      if (!name) {
        try {
          const body = await readBody(request, 4096);
          if (body.length > 0) name = String(JSON.parse(body.toString('utf8')).name || '');
        } catch {
          // A body is optional; a malformed one should not fail the registration.
        }
      }
      registerDevice({ udid, name, addedAt: new Date().toISOString() });
      return sendJson(response, 200, { udid, name });
    }
    return sendJson(response, 405, { error: 'method_not_allowed' });
  }

  const buildMatch = pathname.match(/^\/b\/([0-9a-f]{16})(?:\/(ipa|manifest\.plist))?$/);
  if (buildMatch) {
    const build = getBuild(buildMatch[1]);
    if (!build) return sendJson(response, 404, { error: 'not_found' });

    if (method !== 'GET') return sendJson(response, 405, { error: 'method_not_allowed' });

    if (buildMatch[2] === 'ipa') return handleIpa(request, response, build);
    if (buildMatch[2] === 'manifest.plist') {
      const plist = manifestPlist(build, { base: baseUrl(request) });
      response.writeHead(200, {
        'content-type': 'text/xml; charset=utf-8',
        'content-length': Buffer.byteLength(plist),
      });
      return response.end(plist);
    }
    return sendHtml(
      response,
      200,
      buildPage(build, { base: baseUrl(request), deviceCount: countDevices() }),
    );
  }

  return sendJson(response, 404, { error: 'not_found' });
}

const server = createServer((request, response) => {
  route(request, response).catch((error) => {
    console.error(`${request.method} ${request.url}:`, error);
    if (!response.headersSent) {
      sendJson(response, 500, { error: 'internal', detail: error instanceof Error ? error.message : String(error) });
    } else {
      response.end();
    }
  });
});

server.listen(PORT, HOST, () => {
  const origin = process.env.DIST_PUBLIC_URL || `http://${HOST}:${PORT}`;
  console.log(`Distribution service on ${origin}`);
  console.log(`  data:  ${dataDir()}`);
  console.log(`  token: ${TOKEN ? 'set' : 'NOT SET — uploads and device edits are disabled'}`);
  if (!origin.startsWith('https://')) {
    console.log('  note: over-the-air install needs HTTPS with a trusted certificate.');
    console.log('        Use a reverse proxy (see dist-service/Caddyfile) before handing links out.');
  }
});
