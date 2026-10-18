import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { after, test } from 'node:test';

import { JSDOM } from 'jsdom';

import { CookieJar, collectEntries, mask, parseArgs, resolveUrl, runBrowserLogin, runLogin, verifySession } from './campus-headless-login.mjs';

/**
 * The probe is driven from the terminal instead of a WebView, so the tests
 * serve the flow locally: a redirect into a Keycloak-like login page, a form
 * POST that either sets the portal session cookie or re-renders with an error,
 * and a final page without a form. No request leaves the machine.
 */

const LOGIN_PAGE = `<!doctype html><html><body>
  <form id="kc-form-login" action="/realms/CAMPUSonline_IDP/login-actions/authenticate?session_code=y&amp;execution=x" method="post">
    <input type="hidden" name="session_code" value="y" />
    <input type="hidden" name="execution" value="x" />
    <input type="hidden" name="credentialId" value="" />
    <input id="username" name="username" type="text" />
    <input id="password" name="password" type="password" />
    <input id="kc-login" name="login" type="submit" value="Sign In" />
  </form>
</body></html>`;

const REJECTED_PAGE = `<!doctype html><html><body>
  <form id="kc-form-login" action="/realms/CAMPUSonline_IDP/login-actions/authenticate?session_code=y" method="post">
    <input id="username" name="username" type="text" value="st206509@stud.uni-stuttgart.de" aria-invalid="true" />
    <input id="password" name="password" type="password" aria-invalid="true" />
    <span id="input-error">Username or password invalid.</span>
    <input id="kc-login" name="login" type="submit" value="Sign In" />
  </form>
</body></html>`;

const SESSION_COOKIE = `PSESSIONID=${'s'.repeat(44)}`;

function startServer() {
  const requests = [];
  const server = createServer((request, response) => {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
    });
    request.on('end', () => {
      requests.push({ method: request.method, url: request.url, body, cookie: request.headers.cookie ?? '' });
      const url = request.url ?? '/';
      if (url === '/start') {
        response.writeHead(302, { Location: '/realms/CAMPUSonline_IDP/protocol/openid-connect/auth?scope=openid' });
        response.end();
      } else if (url.startsWith('/realms/CAMPUSonline_IDP/protocol/openid-connect/auth')) {
        response.writeHead(200, { 'Content-Type': 'text/html', 'Set-Cookie': 'AUTH_SESSION_ID=auth-1; Path=/' });
        response.end(LOGIN_PAGE);
      } else if (url.startsWith('/realms/CAMPUSonline_IDP/login-actions/authenticate') && request.method === 'POST') {
        if (/password=correct/.test(body)) {
          response.writeHead(302, { 'Set-Cookie': `${SESSION_COOKIE}; Path=/`, Location: '/broker' });
        } else {
          response.writeHead(200, { 'Content-Type': 'text/html' });
        }
        response.end(/password=correct/.test(body) ? undefined : REJECTED_PAGE);
      } else if (url === '/broker') {
        response.writeHead(302, { Location: '/desktop' });
        response.end();
      } else if (url === '/desktop') {
        response.writeHead(200, { 'Content-Type': 'text/html' });
        response.end('<!doctype html><html><body>signed in</body></html>');
      } else {
        response.writeHead(404);
        response.end();
      }
    });
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, requests, base: `http://127.0.0.1:${port}` });
    });
  });
}

const servers = [];
after(() => {
  for (const server of servers) server.close();
});

async function withServer() {
  const running = await startServer();
  servers.push(running.server);
  return running;
}

test('cookie jar keeps, deletes and describes cookies', () => {
  const jar = new CookieJar();
  jar.update(['AUTH_SESSION_ID=abc; Path=/', 'PSESSIONID=def; Path=/; HttpOnly', 'KC_RESTART=; Path=/']);
  assert.deepEqual(jar.names(), ['AUTH_SESSION_ID', 'PSESSIONID']);
  assert.equal(jar.header(), 'AUTH_SESSION_ID=abc; PSESSIONID=def');

  jar.update(['PSESSIONID=gone; Max-Age=0', 'AUTH_SESSION_ID=gone; Expires=Thu, 01 Jan 1970 00:00:00 GMT']);
  assert.deepEqual(jar.names(), []);
  assert.equal(jar.describe(), '');
});

test('resolveUrl and mask never expose a value', () => {
  assert.equal(resolveUrl('https://a.test/x/y', '/b/c'), 'https://a.test/b/c');
  assert.equal(resolveUrl('https://a.test/x/y', 'z'), 'https://a.test/x/z');
  assert.equal(resolveUrl('https://a.test/x/y', 'https://b.test/'), 'https://b.test/');
  assert.equal(mask('supersecret'), 'sup…(11)');
  assert.equal(mask(''), '(empty)');
  assert.doesNotMatch(mask('supersecret'), /secret/);
});

test('parseArgs accepts both forms and rejects unknown flags', () => {
  assert.deepEqual(parseArgs(['--user', 'st1', '--password', 'p']), {
    user: 'st1',
    password: 'p',
    passwordStdin: false,
    url: 'https://campus.uni-stuttgart.de/cusonline/',
    verify: true,
    json: false,
    maxHops: 15,
    engine: 'auto',
    headless: true,
    help: false,
  });
  const flags = parseArgs(['--user=st1', '--password-stdin', '--no-verify', '--json', '--max-hops', '3', '--url', 'https://x.test/']);
  assert.equal(flags.user, 'st1');
  assert.equal(flags.passwordStdin, true);
  assert.equal(flags.verify, false);
  assert.equal(flags.json, true);
  assert.equal(flags.maxHops, 3);
  assert.equal(flags.url, 'https://x.test/');
  assert.throws(() => parseArgs(['--nope']), /unknown argument/);
});

test('collectEntries sends hidden fields, skips unchecked and disabled controls', () => {
  const dom = new JSDOM(`<form action="/x">
    <input type="hidden" name="session_code" value="y" />
    <input name="username" value="st1" />
    <input name="password" type="password" value="secret" />
    <input name="remember" type="checkbox" value="1" />
    <input name="checked" type="checkbox" value="1" checked />
    <input name="off" value="ignored" disabled />
    <select name="realm"><option value="a" /><option value="b" selected /></select>
    <input name="login" id="kc-login" type="submit" value="Sign In" />
    <input name="other" type="submit" value="Other" />
  </form>`);
  const entries = collectEntries(dom.window.document.querySelector('form'), 'kc-login');
  assert.deepEqual(entries, [
    ['session_code', 'y'],
    ['username', 'st1'],
    ['password', 'secret'],
    ['checked', '1'],
    ['realm', 'b'],
    ['login', 'Sign In'],
  ]);
});

test('the probe follows the redirects, posts the form and keeps the session cookie', async () => {
  const { base, requests } = await withServer();
  const result = await runLogin({ user: 'st1', password: 'correct', startUrl: `${base}/start` });

  assert.equal(result.ok, true);
  assert.equal(result.reason, 'signed-in');
  assert.deepEqual(result.steps, ['filled', 'no-form']);
  assert.deepEqual(result.hops.map((hop) => hop.status), [302, 200, 302, 302, 200]);
  assert.equal(result.hops[1].url, `${base}/realms/CAMPUSonline_IDP/protocol/openid-connect/auth?scope=openid`);
  assert.equal(result.jar.value('PSESSIONID').length, 44);
  assert.match(result.jar.describe(), /AUTH_SESSION_ID\(6\)/);

  const post = requests.find((request) => request.method === 'POST');
  assert.match(post.url, /\/realms\/CAMPUSonline_IDP\/login-actions\/authenticate\?session_code=y&execution=x/);
  assert.match(post.body, /username=st1/);
  assert.match(post.body, /password=correct/);
  assert.match(post.body, /session_code=y/);
  assert.match(post.body, /login=Sign\+In/);
  // A browser submits a hidden input with no value as `name=`.
  assert.match(post.body, /credentialId=/);
  assert.match(post.cookie, /AUTH_SESSION_ID=auth-1/);

  const desktop = requests.find((request) => request.url === '/desktop');
  assert.match(desktop.cookie, /PSESSIONID=/);
});

test('a rejected credential comes back as the portal message, without looping', async () => {
  const { base, requests } = await withServer();
  const result = await runLogin({ user: 'st1', password: 'wrong', startUrl: `${base}/start` });

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'rejected');
  assert.match(result.rejection, /Username or password invalid/);
  assert.equal(requests.filter((request) => request.method === 'POST').length, 1);
});

test('the probe stops at the redirect budget', async () => {
  const { base } = await withServer();
  const result = await runLogin({ user: 'st1', password: 'correct', startUrl: `${base}/start`, maxHops: 2 });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'too-many-hops');
  assert.equal(result.hops.length, 2);
});

test('verifySession mints a bearer and hands the pair to the assistant', async () => {
  const jar = new CookieJar();
  jar.update([SESSION_COOKIE]);
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    if (String(url).includes('/token/refresh')) {
      return new Response(JSON.stringify({ access_token: 'bearer-token' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ ok: true, studies: 2 }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  const result = await verifySession(jar, fetchImpl, 'http://127.0.0.1:8787');
  assert.equal(result.ok, true);
  assert.equal(result.token, true);
  assert.match(calls[0].init.headers.Cookie, /^PSESSIONID=/);
  const posted = JSON.parse(calls[1].init.body);
  assert.equal(posted.cookies, SESSION_COOKIE);
  assert.equal(posted.storage['local:cusonline_co.login.accessToken'], 'bearer-token');
});

test('verifySession without a session cookie does not call out', async () => {
  const result = await verifySession(new CookieJar(), () => {
    throw new Error('must not fetch');
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'no-session-cookie');
});

test('the browser engine drives the same flow in Chromium', { timeout: 60_000 }, async (context) => {
  const { base } = await withServer();
  const result = await runBrowserLogin({
    user: 'st1',
    password: 'correct',
    startUrl: `${base}/start`,
    timeoutMs: 30_000,
    pollMs: 300,
  });

  if (result.reason === 'playwright-missing' || result.reason === 'browser-not-installed' || String(result.reason).startsWith('browser-failed')) {
    context.skip(`playwright unavailable here: ${result.reason}`);
    return;
  }
  assert.equal(result.engine, 'browser');
  assert.equal(result.ok, true);
  assert.equal(result.reason, 'signed-in');
  assert.equal(result.jar.value('PSESSIONID').length, 44);
  assert.deepEqual(result.steps, ['filled', 'no-form']);
  assert.equal(result.proof.passwordMatch, true);
  assert.equal(result.proof.userMatch, true);
  assert.match(result.proof.url, /login-actions\/authenticate/);
});

test('the browser engine reports a rejected credential', { timeout: 60_000 }, async (context) => {
  const { base } = await withServer();
  const result = await runBrowserLogin({
    user: 'st1',
    password: 'wrong',
    startUrl: `${base}/start`,
    timeoutMs: 30_000,
    pollMs: 300,
  });

  if (result.reason === 'playwright-missing' || result.reason === 'browser-not-installed' || String(result.reason).startsWith('browser-failed')) {
    context.skip(`playwright unavailable here: ${result.reason}`);
    return;
  }
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'rejected');
  assert.match(result.rejection, /Username or password invalid|aria-invalid/);
  // The rejected value is still the value that was supplied, byte for byte.
  assert.equal(result.proof.passwordMatch, true);
  assert.equal(result.proof.userMatch, true);
  assert.equal(result.proof.passwordLength, 'wrong'.length);
});
