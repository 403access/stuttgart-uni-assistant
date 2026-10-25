/** Serves the dashboard shell and its browser modules. */

import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { sendAsset, sendHtml } from '../../http.mjs';

const DIST_ROOT = process.env.ADMIN_DIST_DIR
  ? resolve(process.env.ADMIN_DIST_DIR)
  : fileURLToPath(new URL('../../../admin/dist/', import.meta.url));
const ROOT = DIST_ROOT;
const TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

/** Only dashboard files reachable from the browser, never the whole server tree. */
function assetFile(pathname) {
  const relative = pathname.replace(/^\/admin\//, '');
  if (!relative || relative.includes('..')) return null;
  const file = resolve(ROOT, relative);
  if (!file.startsWith(ROOT.endsWith(sep) ? ROOT : ROOT + sep)) return null;
  const type = TYPES[extname(file)];
  if (!type || !existsSync(file) || !statSync(file).isFile()) return null;
  return { file, type };
}

function dashboardIndex(response) {
  // Read per request: a dashboard edit or a new Vite build does not need a restart.
  try {
    sendHtml(response, readFileSync(resolve(ROOT, 'index.html'), 'utf8'));
  } catch {
    sendHtml(response, `<!doctype html><html lang="de"><meta charset="utf-8"><title>Verwaltung</title><body style="font:16px/1.5 -apple-system,sans-serif;padding:40px"><h1>Verwaltung nicht gebaut</h1><p>Baue das React-Admin mit <code>bun run admin:build</code> oder setze <code>ADMIN_DIST_DIR</code>.</p></body></html>`);
  }
}

export function dashboardPage(request, response, url) {
  if (request.method !== 'GET' || (url.pathname !== '/admin' && url.pathname !== '/admin/')) return false;
  dashboardIndex(response);
  return true;
}

export function dashboardAsset(request, response, url) {
  if (request.method !== 'GET' || !url.pathname.startsWith('/admin/')) return false;
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return false;
  }
  const asset = assetFile(pathname);
  if (!asset) {
    // A React route such as /admin/users has no extension; serve the shell so
    // a browser reload reaches the client router. A missing asset still 404s.
    if (!extname(pathname)) {
      dashboardIndex(response);
      return true;
    }
    return false;
  }
  let body;
  try {
    body = readFileSync(asset.file);
  } catch {
    return false;
  }
  sendAsset(response, body, asset.type);
  return true;
}
