/** Serves the dashboard shell and its browser modules. */

import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { sendAsset, sendHtml } from '../../http.mjs';

const ROOT = fileURLToPath(new URL('../../../admin/public/', import.meta.url));
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

export function dashboardPage(request, response, url) {
  if (request.method !== 'GET' || (url.pathname !== '/admin' && url.pathname !== '/admin/')) return false;
  // Read per request: a dashboard edit does not need a server restart.
  sendHtml(response, readFileSync(resolve(ROOT, 'index.html'), 'utf8'));
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
  if (!asset) return false;
  let body;
  try {
    body = readFileSync(asset.file);
  } catch {
    return false;
  }
  sendAsset(response, body, asset.type);
  return true;
}
