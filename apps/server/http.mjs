/** HTTP helpers shared by the route modules. No route logic lives here. */

export function readBody(request, limit = 200_000) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error('body too large'));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {});
      } catch (error) {
        reject(error);
      }
    });
    request.on('error', reject);
  });
}

/**
 * Parse a JSON body. On failure this answers 400 and returns null, so callers
 * only have to check for null and stop.
 */
export async function readJsonBody(request, response, limit) {
  try {
    // A JSON `null` is valid syntax but no body; routes then read `{}`.
    return { body: (await readBody(request, limit)) ?? {} };
  } catch {
    send(response, 400, { error: 'bad_json' });
    return null;
  }
}

export function send(response, status, body, headers = {}) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    ...headers,
  });
  response.end(JSON.stringify(body));
}

export function sendHtml(response, html) {
  response.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'",
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
  // Node reports IPv4 peers as `::ffff:192.0.2.1`; show the readable form.
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
