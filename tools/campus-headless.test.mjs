import assert from 'node:assert/strict';
import { test } from 'node:test';

import { JSDOM } from 'jsdom';

import {
  DIAGNOSE_JS,
  HARVEST_JS,
  HEADLESS_MAX_BROKER_CLICKS,
  HEADLESS_MAX_SUBMITS_PER_PAGE,
  HEADLESS_MAX_SUBMITS_PER_RUN,
  headlessAutofillScript,
  headlessDumpScript,
} from '../apps/mobile/src/auth/campus-browser-scripts.ts';

/**
 * The injected scripts run against a DOM, so the fixtures below are reduced
 * copies of the pages observed in the automated C@MPUS sign-in:
 *  - the CAMPUSonline Keycloak form (`#username` / `#password` / `#kc-login`),
 *  - a Shibboleth form (`j_username` / `j_password` / `_eventId_proceed`),
 *  - the C@MPUS desktop shell, whose login route also contains `/desktop/`.
 * jsdom has no layout, so every element reports a zero-sized rectangle — the
 * same signal the real hidden WebView produced.
 */

const KEYCLOAK_URL =
  'https://campus.uni-stuttgart.de/cusonline/co/public/sec/auth/realms/CAMPUSonline_IDP/protocol/openid-connect/auth?scope=openid&state=abc';
const DESKTOP_URL = 'https://campus.uni-stuttgart.de/cusonline/ee/ui/ca2/app/desktop/#/';
const DESKTOP_LOGIN_URL = 'https://campus.uni-stuttgart.de/cusonline/ee/ui/ca2/app/desktop/#/login?';

const KEYCLOAK_HTML = `<!doctype html><html><body>
  <form id="kc-form-login" action="/cusonline/co/public/sec/auth/realms/CAMPUSonline_IDP/login-actions/authenticate?execution=208a3957" method="post">
    <input type="hidden" id="idp" name="idp" value="idp-hint" />
    <input id="username" name="username" type="text" autocomplete="username" />
    <input id="password" name="password" type="password" autocomplete="current-password" />
    <input id="kc-login" name="login" type="submit" value="Sign In" />
  </form>
</body></html>`;

/**
 * The real form as it came back after a rejected submit: the account echoed
 * into the field, aria-invalid on both inputs, a password toggle button and the
 * data-test hooks. The real page also carries onsubmit="login.disabled = true";
 * the test simulates that disabled state directly instead of relying on inline
 * handler scope.
 */
const KEYCLOAK_REJECTED_HTML = `<!doctype html><html><body>
  <form id="kc-form-login" action="/cusonline/co/public/sec/auth/realms/CAMPUSonline_IDP/login-actions/authenticate?execution=208a3957" method="post">
    <input tabindex="0" id="username" name="username" value="st206509@stud.uni-stuttgart.de" type="text" autocomplete="username" aria-invalid="true" data-test="id_brm-pm-dtop_login_uname_input" />
    <button type="button" aria-label="Show password">Show password</button>
    <input tabindex="0" id="password" name="password" type="password" autocomplete="current-password" aria-invalid="true" data-test="id_brm-pm-dtop_login_pw_input" />
    <span id="input-error" aria-live="polite">Username or password invalid.</span>
    <div id="kc-form-buttons">
      <input type="hidden" id="id-hidden-input" name="credentialId" />
      <input tabindex="0" name="login" id="kc-login" type="submit" value="Sign In" data-test="id_brm-pm-dtop_login_submitbutton" />
    </div>
  </form>
</body></html>`;

/** Same form, different ids: only the data-test hooks identify the controls. */
const KEYCLOAK_DATA_TEST_HTML = `<!doctype html><html><body>
  <form id="kc-form-login" action="/login-actions/authenticate?execution=x" method="post">
    <input id="field-a" name="user-name" type="text" data-test="id_brm-pm-dtop_login_uname_input" />
    <input id="field-b" name="secret" type="password" data-test="id_brm-pm-dtop_login_pw_input" />
    <input id="field-c" name="submit-login" type="submit" data-test="id_brm-pm-dtop_login_submitbutton" />
  </form>
</body></html>`;

const SHIBBOLETH_HTML = `<!doctype html><html><body>
  <form action="/idp/profile/oidc/authorize" method="post">
    <input type="hidden" name="csrf_token" value="csrf-hint" />
    <input type="hidden" name="execution" value="e1s2" />
    <input name="j_username" type="text" />
    <input name="j_password" type="password" />
    <input type="submit" name="_eventId_proceed" value="Anmelden" />
  </form>
</body></html>`;

const CHOOSER_HTML = `<!doctype html><html><body>
  <button type="button">Anmelden mit st-Konto</button>
</body></html>`;

/**
 * The real C@MPUS shell: the realm's own account form is embedded in the page
 * while the URL stays /cusonline/, next to the brokered sign-in entries. The
 * st-account only exists at the broker, so the entries must win.
 */
const CAMPUS_SHELL_HTML = `<!doctype html><html><body>
  <form id="kc-form-login" action="/cusonline/co/public/sec/auth/realms/CAMPUSonline_IDP/login-actions/authenticate?session_code=x" method="post">
    <input id="username" name="username" type="text" />
    <input id="password" name="password" type="password" />
    <input name="login" id="kc-login" type="submit" value="Sign In" />
  </form>
  <a href="/cusonline/co/public/sec/auth/realms/CAMPUSonline_IDP/broker/Anmeldung/login?client_id=co-iam-idp-connector&amp;tab_id=x">Alternative Anmeldung</a>
  <a href="/cusonline/co/public/sec/auth/realms/CAMPUSonline_IDP/broker/oidc/login?client_id=co-iam-idp-connector&amp;tab_id=x">Zur Anmeldung</a>
  <a href="https://www.uni-stuttgart.de/datenschutz/">Datenschutz</a>
</body></html>`;

/** Where the broker entry lands: the university identity provider. */
const SHIBBOLETH_OIDC_HTML = `<!doctype html><html><head><title>Web Login Service</title></head><body>
  <form action="/idp/profile/oidc/authorize?execution=e1s2" method="post">
    <input type="hidden" name="csrf_token" value="csrf-hint" />
    <input name="j_username" type="text" />
    <input name="j_password" type="password" />
    <input type="checkbox" name="donotcache" checked />
    <button name="_eventId_proceed" type="submit">Anmelden</button>
  </form>
</body></html>`;

/** The same form as the identity provider re-renders it after a refusal. */
const SHIBBOLETH_REJECTED_HTML = `<!doctype html><html><head><title>Web Login Service</title></head><body>
  <form action="/idp/profile/oidc/authorize?execution=e1s3" method="post">
    <input type="hidden" name="csrf_token" value="csrf-hint" />
    <input name="j_username" type="text" />
    <input name="j_password" type="password" />
    <p class="output-message output--error">Invalid authentication credentials.</p>
    <button name="_eventId_proceed" type="submit">Anmelden</button>
  </form>
</body></html>`;

/** The realm's own form, prefilled with the account from a previous attempt. */
const KEYCLOAK_PREFILLED_HTML = `<!doctype html><html><body>
  <form id="kc-form-login" action="/login-actions/authenticate?execution=x" method="post">
    <input id="username" name="username" type="text" value="st206509@stud.uni-stuttgart.de" />
    <input id="password" name="password" type="password" />
    <input id="kc-login" name="login" type="submit" value="Sign In" />
  </form>
</body></html>`;

const EMPTY_HTML = '<!doctype html><html><body><p>nothing to fill</p></body></html>';

function open(html, url) {
  const dom = new JSDOM(html, { url, runScripts: 'dangerously' });
  const messages = [];
  const submits = [];
  dom.window.ReactNativeWebView = { postMessage: (raw) => messages.push(JSON.parse(raw)) };
  dom.window.document.addEventListener('submit', (event) => {
    submits.push(event.target);
    event.preventDefault();
  }, true);
  return { dom, window: dom.window, messages, submits };
}

async function inject(page, script, settle = 550) {
  page.window.eval(script);
  await new Promise((resolve) => setTimeout(resolve, settle));
}

function last(page) {
  return page.messages[page.messages.length - 1];
}

function steps(page) {
  return page.messages.map((message) => message.step);
}

const autofill = (account = 'st123456', password = 'secret-password', runId = 'run-1') =>
  headlessAutofillScript(account, password, runId);

test('keycloak form: fills the named fields, leaves hidden inputs alone, submits once', async () => {
  const page = open(KEYCLOAK_HTML, KEYCLOAK_URL);
  await inject(page, autofill());

  assert.equal(last(page).step, 'filled');
  assert.equal(last(page).user, 'yes');
  assert.equal(last(page).submit, 'yes');
  assert.equal(last(page).userField, 'username');
  assert.equal(last(page).passwordField, 'password');
  assert.equal(last(page).submitField, 'login');
  assert.equal(last(page).passwordIndex, 0);
  assert.equal(page.window.document.querySelector('#username').value, 'st123456');
  assert.equal(page.window.document.querySelector('#password').value, 'secret-password');
  assert.equal(page.window.document.querySelector('#idp').value, 'idp-hint');
  assert.equal(page.submits.length, 1);
  assert.equal(page.submits[0].id, 'kc-form-login');
});

test('shibboleth form: fills j_username / j_password and submits its own form', async () => {
  const page = open(SHIBBOLETH_HTML, 'https://idp.uni-stuttgart.de/idp/profile/oidc/authorize?execution=e1s2');
  await inject(page, autofill());

  assert.equal(last(page).step, 'filled');
  assert.equal(page.window.document.querySelector('input[name=j_username]').value, 'st123456');
  assert.equal(page.window.document.querySelector('input[name=j_password]').value, 'secret-password');
  assert.equal(page.window.document.querySelector('input[name=csrf_token]').value, 'csrf-hint');
  assert.equal(page.submits.length, 1);
});

test('a password field with a zero-sized rectangle is still filled (hidden WebView)', async () => {
  const page = open(KEYCLOAK_HTML, KEYCLOAK_URL);
  const rect = page.window.document.querySelector('#password').getBoundingClientRect();
  assert.equal(rect.width, 0);
  assert.equal(rect.height, 0);

  await inject(page, autofill());
  assert.equal(last(page).step, 'filled');
  assert.equal(page.window.document.querySelector('#password').value, 'secret-password');
});

test('signed in needs the token, so the desktop login route does not count', async () => {
  const withToken = open(KEYCLOAK_HTML, DESKTOP_URL);
  withToken.window.localStorage.setItem('cusonline_co.login.accessToken', 'token-value');
  await inject(withToken, autofill(), 50);
  assert.equal(last(withToken).step, 'signed-in');

  const onLoginRoute = open(EMPTY_HTML, DESKTOP_LOGIN_URL);
  onLoginRoute.window.localStorage.setItem('cusonline_co.login.accessToken', 'token-value');
  await inject(onLoginRoute, autofill(), 50);
  assert.notEqual(last(onLoginRoute).step, 'signed-in');
  assert.equal(last(onLoginRoute).step, 'no-form');
});

test('desktop shell without a token is not signed in', async () => {
  const page = open(EMPTY_HTML, DESKTOP_URL);
  await inject(page, autofill(), 50);
  assert.notEqual(last(page).step, 'signed-in');
});

test('no password field: reports why, and clicks a sign-in call to action', async () => {
  const plain = open(EMPTY_HTML, KEYCLOAK_URL);
  await inject(plain, autofill(), 50);
  assert.equal(last(plain).step, 'no-form');
  assert.equal(last(plain).passwordInputs, 0);
  assert.equal(last(plain).formCount, 0);

  const chooser = open(CHOOSER_HTML, KEYCLOAK_URL);
  await inject(chooser, autofill(), 250);
  assert.equal(steps(chooser)[0], 'cta-click');
  assert.equal(last(chooser).label, 'anmelden mit st-konto');
});

test('submits are throttled, capped per page and per run', async () => {
  const cooled = open(KEYCLOAK_HTML, KEYCLOAK_URL);
  cooled.window.sessionStorage.setItem('campus_autofill_run', 'run-1');
  cooled.window.sessionStorage.setItem('campus_autofill_url', KEYCLOAK_URL);
  cooled.window.sessionStorage.setItem('campus_autofill_last', String(Date.now()));
  await inject(cooled, autofill(), 50);
  assert.equal(last(cooled).step, 'waiting');

  const capped = open(KEYCLOAK_HTML, KEYCLOAK_URL);
  capped.window.sessionStorage.setItem('campus_autofill_run', 'run-1');
  capped.window.sessionStorage.setItem('campus_autofill_url', KEYCLOAK_URL);
  capped.window.sessionStorage.setItem('campus_autofill_submits', String(HEADLESS_MAX_SUBMITS_PER_PAGE));
  await inject(capped, autofill(), 50);
  assert.equal(last(capped).step, 'too-many-attempts');

  const runCapped = open(KEYCLOAK_HTML, KEYCLOAK_URL);
  runCapped.window.sessionStorage.setItem('campus_autofill_run', 'run-1');
  runCapped.window.sessionStorage.setItem('campus_autofill_url', KEYCLOAK_URL);
  runCapped.window.sessionStorage.setItem('campus_autofill_total', String(HEADLESS_MAX_SUBMITS_PER_RUN));
  await inject(runCapped, autofill(), 50);
  assert.equal(last(runCapped).step, 'too-many-attempts');
});

test('a new run id and a new URL both restore the submit budget', async () => {
  const freshRun = open(KEYCLOAK_HTML, KEYCLOAK_URL);
  freshRun.window.sessionStorage.setItem('campus_autofill_run', 'old-run');
  freshRun.window.sessionStorage.setItem('campus_autofill_url', KEYCLOAK_URL);
  freshRun.window.sessionStorage.setItem('campus_autofill_submits', String(HEADLESS_MAX_SUBMITS_PER_PAGE));
  await inject(freshRun, autofill('st123456', 'secret-password', 'new-run'));
  assert.equal(last(freshRun).step, 'filled');

  const navigated = open(KEYCLOAK_HTML, KEYCLOAK_URL);
  navigated.window.sessionStorage.setItem('campus_autofill_run', 'run-1');
  navigated.window.sessionStorage.setItem('campus_autofill_url', 'https://campus.uni-stuttgart.de/cusonline/previous');
  navigated.window.sessionStorage.setItem('campus_autofill_submits', String(HEADLESS_MAX_SUBMITS_PER_PAGE));
  await inject(navigated, autofill());
  assert.equal(last(navigated).step, 'filled');
});

test('the prefilled account from a previous attempt is overwritten, not kept', async () => {
  const page = open(KEYCLOAK_PREFILLED_HTML, KEYCLOAK_URL);
  await inject(page, autofill('st123456', 'secret-password'));

  assert.equal(last(page).step, 'filled');
  assert.equal(page.window.document.querySelector('#username').value, 'st123456');
  assert.equal(page.window.document.querySelector('#password').value, 'secret-password');
  assert.equal(last(page).userLength, 8);
  assert.equal(last(page).passwordLength, 15);
  assert.equal(page.submits.length, 1);
});

test('a rejection is reported instead of spending the submit budget', async () => {
  const page = open(KEYCLOAK_REJECTED_HTML, KEYCLOAK_URL);
  page.window.sessionStorage.setItem('campus_autofill_run', 'run-1');
  page.window.sessionStorage.setItem('campus_autofill_url', KEYCLOAK_URL);
  page.window.sessionStorage.setItem('campus_autofill_submits', '1');
  await inject(page, autofill(), 50);

  assert.equal(last(page).step, 'rejected');
  assert.match(String(last(page).reason), /invalid/i);
  assert.equal(page.submits.length, 0);
});

test('a portal-reported rejection is honoured without spending an attempt', async () => {
  const page = open(KEYCLOAK_REJECTED_HTML, KEYCLOAK_URL);
  page.window.sessionStorage.setItem('campus_autofill_run', 'run-1');
  page.window.sessionStorage.setItem('campus_autofill_url', KEYCLOAK_URL);
  await inject(page, autofill(), 50);

  assert.equal(last(page).step, 'rejected');
  assert.match(String(last(page).reason), /invalid/i);
  assert.equal(page.submits.length, 0);
});

test('the form disables its own submit button; a retry still submits', async () => {
  const page = open(KEYCLOAK_HTML, KEYCLOAK_URL);
  page.window.sessionStorage.setItem('campus_autofill_run', 'run-1');
  page.window.sessionStorage.setItem('campus_autofill_url', KEYCLOAK_URL);
  await inject(page, autofill());
  assert.equal(page.submits.length, 1);

  // What the portal's own onsubmit does to the button. A disabled control
  // ignores click(), which would silently swallow the retry.
  const button = page.window.document.querySelector('#kc-login');
  button.disabled = true;
  button.click();
  assert.equal(page.submits.length, 1);

  page.window.sessionStorage.removeItem('campus_autofill_last');
  await inject(page, autofill());
  assert.equal(page.submits.length, 2);
});

test('data-test hooks identify the fields when the ids do not', async () => {
  const page = open(KEYCLOAK_DATA_TEST_HTML, KEYCLOAK_URL);
  await inject(page, autofill('st123456', 'secret-password'));

  assert.equal(last(page).step, 'filled');
  assert.equal(page.window.document.querySelector('#field-a').value, 'st123456');
  assert.equal(page.window.document.querySelector('#field-b').value, 'secret-password');
  assert.equal(last(page).passwordIndex, 0);
  assert.equal(page.submits.length, 1);
});

test('the C@MPUS shell: the brokered st-account entry wins over the embedded local form', async () => {
  const page = open(CAMPUS_SHELL_HTML, 'https://campus.uni-stuttgart.de/cusonline/');
  await inject(page, autofill(), 350);

  assert.equal(last(page).step, 'sso-click');
  assert.match(String(last(page).href), /\/broker\/oidc\/login/);
  assert.equal(page.submits.length, 0);
  assert.equal(page.window.document.querySelector('#password').value, '');
});

test('the poll does not restart the brokered flow by clicking the same entry again', async () => {
  const page = open(CAMPUS_SHELL_HTML, 'https://campus.uni-stuttgart.de/cusonline/');
  const entry = page.window.document.querySelector('a[href*="/broker/oidc/login"]');
  const clicks = [];
  entry.addEventListener('click', (event) => {
    clicks.push(event.target.href);
    event.preventDefault();
  });

  await inject(page, autofill(), 350);
  assert.equal(last(page).step, 'sso-click');
  assert.equal(clicks.length, 1);

  // The three-second poll runs while the click's navigation is in flight.
  page.messages.length = 0;
  await inject(page, autofill(), 350);
  assert.deepEqual(page.messages, [], 'a repeated poll must stay quiet');
  assert.equal(clicks.length, 1, 'and must not restart the flow');

  // After the grace period the same entry may be retried: the first click may
  // have been a no-op on a page whose own scripts had not run yet.
  page.window.sessionStorage.setItem('campus_autofill_broker_at', String(Date.now() - 9000));
  page.messages.length = 0;
  await inject(page, autofill(), 350);
  assert.equal(last(page).step, 'sso-click');
  assert.equal(clicks.length, 2);
});

test('a new page may click the entry again, and the attempt budget is a backstop', async () => {
  const page = open(CAMPUS_SHELL_HTML, 'https://campus.uni-stuttgart.de/cusonline/');
  await inject(page, autofill(), 350);
  assert.equal(page.window.sessionStorage.getItem('campus_autofill_brokers'), '1');

  // A different page (the identity provider hop in between) is a new pair.
  page.window.history.pushState({}, '', '/cusonline/co/public/sec/auth/realms/CAMPUSonline_IDP/protocol/openid-connect/auth');
  page.messages.length = 0;
  await inject(page, autofill(), 350);
  assert.equal(last(page).step, 'sso-click');
  assert.equal(page.window.sessionStorage.getItem('campus_autofill_brokers'), '2');
  assert.equal(last(page).attempt, 2);

  // The hard backstop reports once, then the poll stays quiet.
  page.window.sessionStorage.setItem('campus_autofill_brokers', String(HEADLESS_MAX_BROKER_CLICKS));
  page.window.sessionStorage.removeItem('campus_autofill_broker_key');
  page.messages.length = 0;
  await inject(page, autofill(), 350);
  assert.equal(last(page).step, 'broker-exhausted');
  assert.equal(last(page).clicks, HEADLESS_MAX_BROKER_CLICKS);

  page.messages.length = 0;
  await inject(page, autofill(), 350);
  assert.deepEqual(page.messages, [], 'the stop is reported once per attempt');
});

test('a new attempt restores the broker budget', async () => {
  const page = open(CAMPUS_SHELL_HTML, 'https://campus.uni-stuttgart.de/cusonline/');
  page.window.sessionStorage.setItem('campus_autofill_run', 'old-run');
  page.window.sessionStorage.setItem('campus_autofill_brokers', String(HEADLESS_MAX_BROKER_CLICKS));
  await inject(page, autofill('st123456', 'secret-password', 'new-run'), 350);

  assert.equal(last(page).step, 'sso-click');
  assert.equal(page.window.sessionStorage.getItem('campus_autofill_brokers'), '1');
});

test('the identity-provider form behind the broker entry is filled', async () => {
  const page = open(SHIBBOLETH_OIDC_HTML, 'https://idp.uni-stuttgart.de/idp/profile/oidc/authorize?execution=e1s2');
  await inject(page, autofill());

  assert.equal(last(page).step, 'filled');
  assert.equal(last(page).userField, 'j_username');
  assert.equal(last(page).passwordField, 'j_password');
  assert.equal(last(page).submitField, '_eventId_proceed');
  assert.equal(page.window.document.querySelector('input[name=j_username]').value, 'st123456');
  assert.equal(page.window.document.querySelector('input[name=j_password]').value, 'secret-password');
  assert.equal(page.submits.length, 1);
});

test('the identity-provider refusal is reported, not retried', async () => {
  const page = open(SHIBBOLETH_REJECTED_HTML, 'https://idp.uni-stuttgart.de/idp/profile/oidc/authorize?execution=e1s3');
  await inject(page, autofill(), 50);

  assert.equal(last(page).step, 'rejected');
  assert.match(String(last(page).reason), /Invalid authentication credentials/);
  assert.equal(page.submits.length, 0);
});

test('dump: keeps structure, redacts password and token values', async () => {  const page = open(KEYCLOAK_HTML, KEYCLOAK_URL);
  page.window.document.querySelector('#password').value = 'typed-password';
  await inject(page, headlessDumpScript(), 50);

  const dump = last(page);
  assert.equal(dump.step, 'dump');
  assert.equal(dump.forms.length, 1);
  assert.equal(dump.forms[0].method, 'post');
  assert.match(dump.forms[0].action, /login-actions\/authenticate/);
  assert.doesNotMatch(dump.forms[0].html, /typed-password/);
  assert.match(dump.forms[0].html, /id="password"[^>]*value="REDACTED"/);
  assert.match(dump.forms[0].html, /value="idp-hint"/);
  assert.ok(dump.controls.some((control) => control.startsWith('input|submit|login|kc-login|')));

  const shibboleth = open(SHIBBOLETH_HTML, 'https://idp.uni-stuttgart.de/idp/profile/oidc/authorize?execution=e1s2');
  await inject(shibboleth, headlessDumpScript(), 50);
  assert.doesNotMatch(last(shibboleth).forms[0].html, /csrf-hint/);
  assert.match(last(shibboleth).forms[0].html, /name="execution" value="e1s2"/);
});

test('every generated script compiles', () => {
  const scripts = {
    autofill: headlessAutofillScript('st123456', 'secret-password', 'run-1'),
    dump: headlessDumpScript(),
    harvest: HARVEST_JS,
    diagnose: DIAGNOSE_JS,
  };
  for (const [name, script] of Object.entries(scripts)) {
    assert.doesNotThrow(() => new Function(script), `${name} must compile`);
  }
});

test('harvest script reads the cookie and both storages', async () => {
  const page = open(EMPTY_HTML, KEYCLOAK_URL);
  page.window.document.cookie = 'CO_LANG=de';
  page.window.localStorage.setItem('cusonline_co.login.accessToken', 'token-value');
  page.window.sessionStorage.setItem('scratch', 'temporary');
  await inject(page, HARVEST_JS, 50);

  const harvest = last(page);
  assert.match(harvest.cookies, /CO_LANG=de/);
  assert.equal(harvest.storage['local:cusonline_co.login.accessToken'], 'token-value');
  assert.equal(harvest.storage['session:scratch'], 'temporary');
});
