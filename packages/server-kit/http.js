/** HTTP helpers shared by the route modules and the distribution service. */

export function readRawBody(request, limit = 200_000) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        const error = new Error(`Body is larger than ${limit} bytes.`);
        error.status = 413;
        reject(error);
        request.destroy();
        return;
      }
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    request.on('end', () => resolve(Buffer.concat(chunks)));
    request.on('error', reject);
  });
}

export function readBody(request, limit = 200_000) {
  return readRawBody(request, limit).then((buffer) => (
    buffer.length ? JSON.parse(buffer.toString('utf8')) : {}
  ));
}

export async function readJsonBody(request, response, limit) {
  try {
    return { body: (await readBody(request, limit)) ?? {} };
  } catch {
    send(response, 400, { error: 'bad_json' });
    return null;
  }
}

export function sendJson(response, status, value, headers = {}) {
  const body = JSON.stringify(value);
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    ...headers,
  });
  response.end(body);
}

export function send(response, status, body, headers = {}) {
  sendJson(response, status, body, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    ...headers,
  });
}

/**
 * `sendHtml(response, html)` or `sendHtml(response, status, html)`.
 * The default headers keep the operator dashboard from being framed or cached.
 */
export function sendHtml(response, htmlOrStatus, maybeHtml, headers = {}) {
  const status = typeof htmlOrStatus === 'number' ? htmlOrStatus : 200;
  const html = typeof htmlOrStatus === 'number' ? maybeHtml : htmlOrStatus;
  response.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': Buffer.byteLength(html),
    'Cache-Control': 'no-store',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'",
    ...headers,
  });
  response.end(html);
}

/** RFC 6266 attachment header with an ASCII fallback and a UTF-8 filename. */
export function attachmentDisposition(filename) {
  const safe = String(filename ?? '').replace(/[\r\n"]/g, '_').trim();
  if (!safe) return '';
  const ascii = safe.replace(/[^\x20-\x7E]/g, '_');
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(safe)}`;
}

/** Static dashboard modules. The HTML shell carries the CSP; assets are inert. */
export function sendAsset(response, body, contentType, headers = {}) {
  response.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': 'no-cache',
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  });
  response.end(body);
}

export function header(request, name) {
  const value = request.headers[name];
  return typeof value === 'string' ? value : '';
}

/** A header the client percent-encoded, so non-ASCII survives the wire. */
export function decodedHeader(request, name) {
  const raw = header(request, name);
  if (!raw) return '';
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export function isSecureRequest(request) {
  return Boolean(request.socket?.encrypted) || String(request.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https';
}

function normalizedAddress(value) {
  let text = String(value ?? '').trim();
  if (!text) return '';
  if (text.startsWith('[')) {
    const end = text.indexOf(']');
    text = end === -1 ? text.slice(1) : text.slice(1, end);
  } else if (/^\d+\.\d+\.\d+\.\d+:\d+$/.test(text)) {
    text = text.slice(0, text.lastIndexOf(':'));
  }
  const mapped = text.startsWith('::ffff:') ? text.slice(7) : text;
  return (mapped === '::1' ? '127.0.0.1' : mapped).slice(0, 100);
}

function firstForwardedAddress(request) {
  for (const header of ['cf-connecting-ip', 'x-real-ip', 'x-forwarded-for']) {
    const raw = request.headers?.[header];
    const value = Array.isArray(raw) ? raw[0] : String(raw ?? '').split(',')[0].trim();
    if (value) return value;
  }
  return '';
}

/**
 * The peer address for display in the operator dashboard.
 *
 * A same-host reverse proxy (including a local `cloudflared` tunnel) connects
 * from loopback, so its forwarding headers are the only useful source. Set
 * `TRUST_PROXY=1` when the proxy runs on another host.
 */
export function clientAddress(request) {
  const socket = String(request?.socket?.remoteAddress ?? '');
  const loopback = socket === '127.0.0.1' || socket === '::1' || socket === '::ffff:127.0.0.1';
  if (loopback || process.env.TRUST_PROXY === '1') {
    const forwarded = firstForwardedAddress(request);
    if (forwarded) return normalizedAddress(forwarded);
  }
  return normalizedAddress(socket);
}
