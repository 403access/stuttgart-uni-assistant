/** HTTP helpers shared by the route modules. No route logic lives here. */

export function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > 200_000) {
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
export async function readJsonBody(request, response) {
  try {
    // A JSON `null` is valid syntax but no body; routes then read `{}`.
    return { body: (await readBody(request)) ?? {} };
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

/** Static dashboard modules. The HTML shell carries the CSP; assets are inert. */
export function sendAsset(response, body, contentType) {
  response.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': 'no-cache',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(body);
}

export function isSecureRequest(request) {
  return Boolean(request.socket?.encrypted) || String(request.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https';
}
