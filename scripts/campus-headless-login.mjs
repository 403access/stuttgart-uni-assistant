#!/usr/bin/env node
/**
 * Terminal probe for the automated C@MPUS sign-in.
 *
 * It drives the real portal from the command line with the same page logic the
 * app injects (`headlessAutofillScript`), but submits the parsed form with
 * `fetch` and a cookie jar instead of a WebView. That makes the whole flow
 * testable in seconds without rebuilding the app.
 *
 * The credential is never stored and never printed. `--password-stdin` keeps it
 * out of the shell history and the process list.
 */
import { pathToFileURL } from 'node:url';

import { JSDOM } from 'jsdom';

import { headlessAutofillScript } from '../src/auth/campus-browser-scripts.ts';

export const CAMPUS_LOGIN_START = 'https://campus.uni-stuttgart.de/cusonline/';
export const REFRESH_URL = 'https://campus.uni-stuttgart.de/cusonline/ee/rest/auth/token/refresh';
export const DEFAULT_ASSISTANT_URL = 'http://127.0.0.1:8787';

const USER_AGENT = 'Mozilla/5.0 (compatible; university-assistant-login-probe)';

/** Cookie store keyed by name, which is enough for one host's login flow. */
export class CookieJar {
  constructor() {
    this.cookies = new Map();
  }

  update(setCookieValues) {
    for (const raw of setCookieValues) {
      const [pair, ...attributes] = String(raw).split(';');
      const separator = pair.indexOf('=');
      if (separator < 0) continue;
      const name = pair.slice(0, separator).trim();
      const value = pair.slice(separator + 1).trim();
      if (!name) continue;
      const cleared = attributes.some(
        (attribute) => /^\s*max-age\s*=\s*0\s*$/i.test(attribute) || /^\s*expires\s*=\s*thu, 01 jan 1970/i.test(attribute),
      );
      if (cleared || !value) this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
  }

  header() {
    return [...this.cookies].map(([name, value]) => `${name}=${value}`).join('; ');
  }

  names() {
    return [...this.cookies.keys()].sort();
  }

  value(name) {
    return this.cookies.get(name) ?? '';
  }

  describe() {
    return this.names().map((name) => `${name}(${this.value(name).length})`).join(', ');
  }
}

export function resolveUrl(base, location) {
  return new URL(location, base).toString();
}

/** Never print a secret; a short prefix plus the length is enough to compare runs. */
export function mask(value) {
  const text = String(value ?? '');
  if (!text) return '(empty)';
  return `${text.slice(0, 3)}…(${text.length})`;
}

export function parseArgs(argv) {
  const options = {
    user: '',
    password: '',
    passwordStdin: false,
    url: CAMPUS_LOGIN_START,
    verify: true,
    json: false,
    maxHops: 15,
    engine: 'auto',
    headless: true,
    help: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--user' || arg === '-u') options.user = argv[++index] ?? '';
    else if (arg.startsWith('--user=')) options.user = arg.slice('--user='.length);
    else if (arg === '--password' || arg === '-p') options.password = argv[++index] ?? '';
    else if (arg.startsWith('--password=')) options.password = arg.slice('--password='.length);
    else if (arg === '--password-stdin') options.passwordStdin = true;
    else if (arg === '--url') options.url = argv[++index] ?? options.url;
    else if (arg.startsWith('--url=')) options.url = arg.slice('--url='.length);
    else if (arg === '--no-verify') options.verify = false;
    else if (arg === '--json') options.json = true;
    else if (arg === '--browser') options.engine = 'browser';
    else if (arg === '--http') options.engine = 'http';
    else if (arg === '--headed') options.headless = false;
    else if (arg === '--max-hops') options.maxHops = Number(argv[++index]);
    else throw new Error(`unknown argument: ${arg}`);
  }
  return options;
}

/**
 * Serialize the form the injected script chose. Only the clicked submit button
 * and the checked choice controls are included, as a browser would send them.
 */
export function collectEntries(form, submitIdentifier) {
  const entries = [];
  for (const element of form.querySelectorAll('input,select,textarea')) {
    const name = element.getAttribute('name');
    if (!name || element.disabled) continue;
    const type = (element.getAttribute('type') || '').toLowerCase();
    if (type === 'submit' || type === 'image' || type === 'button' || type === 'reset' || type === 'file') {
      const matches = name === submitIdentifier || element.getAttribute('id') === submitIdentifier;
      if (type === 'submit' && matches) entries.push([name, element.value]);
      continue;
    }
    if ((type === 'checkbox' || type === 'radio') && !element.checked) continue;
    if (element.tagName.toLowerCase() === 'select') {
      const selected = element.selectedOptions?.[0] ?? element.options?.[element.selectedIndex] ?? element.options?.[0];
      entries.push([name, selected?.value ?? '']);
      continue;
    }
    entries.push([name, element.value]);
  }
  return entries;
}

function pageWithScripts(html, url) {
  // `outside-only` allows the injected script without running the page's own.
  const dom = new JSDOM(html, { url, runScripts: 'outside-only' });
  const messages = [];
  dom.window.ReactNativeWebView = { postMessage: (raw) => messages.push(JSON.parse(raw)) };
  dom.window.document.addEventListener('submit', (event) => event.preventDefault(), true);
  return { dom, messages };
}

function rejectionFrom(document) {
  const node = document.querySelector('#input-error, #kc-feedback, .pf-c-alert.pf-m-danger');
  const text = node ? String(node.textContent || '').replace(/\s+/g, ' ').trim() : '';
  if (text && /invalid|incorrect|falsch|ung(ü|u)ltig|fehlgeschlagen|failed/i.test(text)) return text.slice(0, 200);
  const password = document.querySelector('input[type=password][aria-invalid="true"]');
  return password ? 'aria-invalid' : '';
}

function setCookieValues(response) {
  if (typeof response.headers.getSetCookie === 'function') return response.headers.getSetCookie();
  const single = response.headers.get('set-cookie');
  return single ? [single] : [];
}

function readRefreshToken(payload) {
  for (const candidate of [payload, payload?.data]) {
    if (!candidate || typeof candidate !== 'object') continue;
    for (const key of ['access_token', 'accessToken', 'token', 'bearerToken', 'bearer_token']) {
      if (typeof candidate[key] === 'string' && candidate[key].trim()) return candidate[key].trim();
    }
  }
  return '';
}

/**
 * Drive the login until no sign-in form is left.
 *
 * Resolves to `{ ok, reason, finalUrl, jar, hops, rejection, steps }`. `ok`
 * means the portal session cookie came out of the flow; handed to the assistant
 * server, that is the same material the app harvests from its WebView.
 */
export async function runLogin({
  user,
  password,
  startUrl = CAMPUS_LOGIN_START,
  fetchImpl = fetch,
  maxHops = 15,
  runId = String(Date.now()),
  log = () => {},
}) {
  const jar = new CookieJar();
  const hops = [];
  const steps = [];
  let url = startUrl;
  let method = 'GET';
  let body = null;
  let submitted = false;

  for (let hop = 0; hop < maxHops; hop += 1) {
    const response = await fetchImpl(url, {
      method,
      redirect: 'manual',
      headers: {
        ...(jar.header() ? { Cookie: jar.header() } : {}),
        ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': USER_AGENT,
      },
      body,
    });
    jar.update(setCookieValues(response));
    const location = response.headers.get('location');
    hops.push({ url, method, status: response.status, location: location ?? null, cookies: jar.names() });

    if (response.status >= 300 && response.status < 400) {
      if (!location) return { ok: false, reason: 'redirect-without-location', finalUrl: url, jar, hops, steps };
      if (response.status !== 307 && response.status !== 308) {
        method = 'GET';
        body = null;
      }
      url = resolveUrl(url, location);
      continue;
    }

    const html = await response.text();
    if (!/text\/html/i.test(response.headers.get('content-type') || '') && !/<(html|form|input)/i.test(html)) {
      return { ok: false, reason: `unexpected-content-type: ${response.headers.get('content-type') ?? 'unknown'}`, finalUrl: url, jar, hops, steps };
    }

    const page = pageWithScripts(html, url);
    page.dom.window.eval(headlessAutofillScript(user, password, `${runId}-${hop}`));
    const messages = page.messages;
    steps.push(...messages.map((message) => message.step));
    const filled = messages.find((message) => message.step === 'filled');
    const noForm = messages.find((message) => message.step === 'no-form');

    // Each page is a fresh DOM, so the script's own per-run counters start at
    // zero here. A rejection only means something once this probe has posted.
    const rejection = rejectionFrom(page.dom.window.document);
    if (rejection && submitted) {
      return { ok: false, reason: 'rejected', rejection, finalUrl: url, jar, hops, steps };
    }

    if (!filled) {
      if (noForm && noForm.passwordInputs > 0) {
        return { ok: false, reason: 'form-not-fillable', finalUrl: url, jar, hops, steps, page: messages };
      }
      return {
        ok: jar.value('PSESSIONID') !== '',
        reason: jar.value('PSESSIONID') ? 'signed-in' : 'no-session-cookie',
        finalUrl: url,
        jar,
        hops,
        steps,
      };
    }

    const fields = page.dom.window.document.querySelectorAll('input[type=password]');
    const passwordField = fields[filled.passwordIndex] ?? fields[0];
    const form = passwordField?.form ?? passwordField?.closest('form');
    if (!form) return { ok: false, reason: 'password-field-without-form', finalUrl: url, jar, hops, steps };

    const entries = collectEntries(form, filled.submitField);
    const action = resolveUrl(url, form.getAttribute('action') || url);
    const formMethod = (form.getAttribute('method') || 'get').toUpperCase();
    const encoded = new URLSearchParams(entries).toString();
    submitted = true;
    log(`    filled user=${filled.userField} password=${filled.passwordField} submit=${filled.submitField} fields=${entries.length}`);
    if (formMethod === 'GET') {
      url = encoded ? `${action}${action.includes('?') ? '&' : '?'}${encoded}` : action;
      method = 'GET';
      body = null;
    } else {
      url = action;
      method = 'POST';
      body = encoded;
    }
  }

  return { ok: false, reason: 'too-many-hops', finalUrl: url, jar, hops, steps };
}

const HARVEST_STORAGE_SCRIPT = `(function(){
  var out = {};
  try {
    for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); out['local:' + k] = String(localStorage.getItem(k)).slice(0, 4000); }
    for (var j = 0; j < sessionStorage.length; j++) { var s = sessionStorage.key(j); out['session:' + s] = String(sessionStorage.getItem(s)).slice(0, 4000); }
  } catch (e) {}
  return out;
})()`;

/**
 * Drive the login in a real browser engine.
 *
 * The C@MPUS shell starts the SSO redirect in its own JavaScript, so no amount
 * of plain HTTP reaches the Keycloak form; only an engine that runs the page
 * does. Playwright is imported lazily, so the script still works without it.
 */
export async function runBrowserLogin({
  user,
  password,
  startUrl = CAMPUS_LOGIN_START,
  headless = true,
  timeoutMs = 90_000,
  pollMs = 3000,
  log = () => {},
}) {
  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    return { ok: false, reason: 'playwright-missing', engine: 'browser' };
  }

  const jar = new CookieJar();
  const steps = [];
  let rejection = '';
  let storage = {};
  let browser;
  try {
    browser = await chromium.launch({ headless });
    const context = await browser.newContext({ userAgent: USER_AGENT });
    const page = await context.newPage();
    const started = Date.now();
    await page.goto(startUrl, { waitUntil: 'domcontentloaded', timeout: timeoutMs });

    while (Date.now() - started < timeoutMs) {
      const messages = await page.evaluate(`(function(){
        window.__probeMessages = [];
        window.ReactNativeWebView = { postMessage: function(raw){ try { window.__probeMessages.push(JSON.parse(raw)); } catch (e) {} } };
        ${headlessAutofillScript(user, password, `${started}`)}
        return window.__probeMessages;
      })()`);
      const last = messages[messages.length - 1];
      if (last && last.step !== 'waiting' && steps[steps.length - 1] !== last.step) {
        steps.push(last.step);
        log(`    [${last.step}] ${page.url()}`);
      }
      if (last?.step === 'rejected') {
        rejection = String(last.reason ?? 'rejected');
        break;
      }
      if (last?.step === 'too-many-attempts') {
        rejection = rejection || 'too-many-attempts';
        break;
      }

      for (const cookie of await context.cookies()) jar.update([`${cookie.name}=${cookie.value}`]);
      if (jar.value('PSESSIONID')) {
        storage = await page.evaluate(HARVEST_STORAGE_SCRIPT).catch(() => ({}));
        return { ok: true, reason: 'signed-in', engine: 'browser', finalUrl: page.url(), jar, storage, steps };
      }
      await page.waitForTimeout(pollMs);
    }
    return {
      ok: false,
      reason: rejection ? 'rejected' : 'timeout',
      rejection: rejection || null,
      engine: 'browser',
      finalUrl: page.url(),
      jar,
      storage,
      steps,
    };
  } catch (error) {
    const message = String(error?.message ?? error);
    return {
      ok: false,
      reason: /Executable doesn't exist/i.test(message) ? 'browser-not-installed' : `browser-failed: ${message}`,
      engine: 'browser',
      jar,
      steps,
    };
  } finally {
    await browser?.close().catch(() => undefined);
  }
}

/** Mint a bearer from the session cookie and hand the pair to the assistant server. */export async function verifySession(jar, fetchImpl = fetch, assistantUrl = process.env.EXPO_PUBLIC_ASSISTANT_URL || DEFAULT_ASSISTANT_URL) {
  const psessionid = jar.value('PSESSIONID');
  if (!psessionid) return { ok: false, reason: 'no-session-cookie' };
  let token = '';
  try {
    const response = await fetchImpl(REFRESH_URL, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', Cookie: `PSESSIONID=${psessionid}` },
      body: '',
    });
    token = readRefreshToken(await response.json().catch(() => ({})));
  } catch {
    return { ok: false, reason: 'refresh-request-failed' };
  }
  const base = assistantUrl.replace(/\/$/, '');
  try {
    const response = await fetchImpl(`${base}/v1/campus/credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cookies: `PSESSIONID=${psessionid}`,
        storage: token ? { 'local:cusonline_co.login.accessToken': token } : {},
      }),
    });
    const payload = await response.json().catch(() => ({}));
    return { ok: Boolean(payload.ok), status: response.status, token: Boolean(token), payload };
  } catch {
    return { ok: false, reason: 'assistant-unreachable', token: Boolean(token) };
  }
}

const HELP = `Terminal probe for the automated C@MPUS sign-in.

Usage:
  npm run campus:headless -- --user <id> [--password-stdin]
  npm run campus:headless -- --user <id> --password <secret>

Options:
  -u, --user <id>        st-account or email the portal expects (required)
  -p, --password <text>  password (lands in the shell history; prefer stdin)
      --password-stdin   read the password from stdin; on a terminal it prompts
                         without echoing, otherwise it reads until EOF
      --url <url>        override the start URL
      --browser          force the Playwright engine (default when installed)
      --http             force the plain HTTP engine, no browser download
      --headed           show the browser window (browser engine only)
      --no-verify        skip the assistant-server validation
      --json             print a JSON summary instead of the hop log
      --max-hops <n>     redirect budget for the HTTP engine (default 15)
  -h, --help             this text

Examples:
  npm run campus:headless -- --user st206509@stud.uni-stuttgart.de --password-stdin
  printf '%s' "$ST_PASSWORD" | npm run campus:headless -- --user st206509@stud.uni-stuttgart.de --password-stdin
  npm run campus:headless -- --user st206509@stud.uni-stuttgart.de --password-stdin --json
  npm run campus:headless -- --user st206509@stud.uni-stuttgart.de --password-stdin --headed

The credential is never stored and never printed. The C@MPUS shell starts its
SSO redirect in JavaScript, so the browser engine is the one that reaches the
Keycloak form; the HTTP engine exists for local and offline targets. A
successful run verifies the session against the running assistant server
(npm run assistant) by default; pass --no-verify to stop after the login.`;

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(String(chunk));
  return chunks.join('').replace(/\r?\n$/, '');
}

/** Read one line without echoing it; a piped stdin is read to EOF instead. */
async function promptPassword() {
  if (!process.stdin.isTTY) return readStdin();
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    let value = '';
    const cleanup = () => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.off('data', onData);
    };
    const onData = (chunk) => {
      for (const char of String(chunk)) {
        if (char === '\r' || char === '\n') {
          cleanup();
          process.stdout.write('\n');
          resolve(value);
          return;
        }
        if (char === '\u0003') {
          cleanup();
          process.stdout.write('\n');
          reject(new Error('cancelled'));
          return;
        }
        if (char === '\u007f' || char === '\b') {
          if (value) {
            value = value.slice(0, -1);
            process.stdout.write('\b \b');
          }
          continue;
        }
        value += char;
        process.stdout.write('*');
      }
    };
    process.stdout.write('Password: ');
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    stdin.on('data', onData);
  });
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(String(error.message));
    console.error('\nRun with --help for usage.');
    process.exitCode = 2;
    return;
  }
  if (options.help) {
    console.log(HELP);
    return;
  }
  if (options.passwordStdin) options.password = await promptPassword();
  if (!options.user || !options.password) {
    console.error('Both --user and a password are required. Run with --help for usage.');
    process.exitCode = 2;
    return;
  }

  const log = (line) => {
    if (!options.json) console.log(line);
  };
  log(`probe start url=${options.url} user=${mask(options.user)} password=${mask(options.password)} engine=${options.engine}`);

  let result;
  if (options.engine === 'http') {
    result = await runLogin({
      user: options.user,
      password: options.password,
      startUrl: options.url,
      maxHops: options.maxHops,
      log,
    });
  } else {
    result = await runBrowserLogin({
      user: options.user,
      password: options.password,
      startUrl: options.url,
      headless: options.headless,
      log,
    });
    if ((result.reason === 'playwright-missing' || result.reason === 'browser-not-installed') && options.engine === 'auto') {
      log('browser engine unavailable — install with `bun add -d playwright && bunx playwright install chromium`; falling back to HTTP');
      result = await runLogin({
        user: options.user,
        password: options.password,
        startUrl: options.url,
        maxHops: options.maxHops,
        log,
      });
    }
  }

  for (const [index, hop] of (result.hops ?? []).entries()) {
    log(`  [${index + 1}] ${hop.status} ${hop.method} ${hop.url}`);
    if (hop.location) log(`       → ${hop.location}`);
  }
  log(`engine: ${result.engine ?? 'http'}`);
  log(`steps: ${result.steps.join(' → ') || '(none)'}`);
  if (result.finalUrl) log(`final: ${result.finalUrl}`);

  let verification = null;
  if (options.verify && result.jar.value('PSESSIONID')) {
    verification = await verifySession(result.jar);
    log(verification.ok ? 'verify: portal session accepted' : `verify: not confirmed (${verification.reason ?? `http_${verification.status}`})`);
  }

  const summary = {
    ok: result.ok,
    reason: result.reason,
    engine: result.engine ?? 'http',
    rejection: result.rejection ?? null,
    finalUrl: result.finalUrl,
    cookies: result.jar.describe(),
    sessionCookie: result.jar.value('PSESSIONID') ? `present(${result.jar.value('PSESSIONID').length})` : 'missing',
    tokenSeen: Object.keys(result.storage ?? {}).some((key) => key.endsWith('cusonline_co.login.accessToken')),
    hops: result.hops?.length ?? 0,
    steps: result.steps,
    verify: verification,
  };

  if (options.json) console.log(JSON.stringify(summary, null, 2));
  else {
    log(`cookies: ${summary.cookies || '(none)'}`);
    log(`PSESSIONID: ${summary.sessionCookie}${summary.tokenSeen ? ', token seen in web storage' : ''}`);
    if (result.rejection) log(`rejected: ${result.rejection}`);
    log(`result: ${result.ok ? 'OK' : `FAILED (${result.reason})`}`);
  }

  if (result.reason === 'playwright-missing' || result.reason === 'browser-not-installed') {
    log('hint: `bun add -d playwright && bunx playwright install chromium`, or pass --http for the plain HTTP engine.');
  }
  if (verification && verification.ok === false && verification.reason) {
    log('hint: start the assistant server with `npm run assistant`, or pass --no-verify.');
  }
  process.exitCode = result.ok ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`probe failed: ${error?.message ?? error}`);
    process.exitCode = 1;
  });
}
