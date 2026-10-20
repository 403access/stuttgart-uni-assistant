import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { test } from 'node:test';

import { mask, parseArgs, probe } from './ilias-login.mjs';

const PAGE = `<!doctype html><html><body>
  <form name="login_form" enctype="multipart/form-data" action="https://ilias3.uni-stuttgart.de/ilias.php?baseClass=ilstartupgui&amp;cmd=post&amp;fallbackCmd=doStandardAuthentication" method="post">
    <input type="text" name="login_form/input_3/input_4" />
    <input type="password" name="login_form/input_3/input_5" />
  </form>
</body></html>`;

test('probe arguments keep the password out of the summary', () => {
  assert.deepEqual(parseArgs(['--user', 'st206509', '--password-stdin', '--json']), {
    user: 'st206509', password: '', passwordStdin: true, cookie: '', probe: false, json: true,
    url: 'https://ilias3.uni-stuttgart.de/ilias.php?baseClass=ilstartupgui&cmd=post&fallbackCmd=doStandardAuthentication', help: false,
  });
  assert.equal(mask('very-secret').includes('very-secret'), false);
  assert.throws(() => parseArgs(['--nope']), /unknown argument/);
});

test('the probe reads the public login form without credentials', async () => {
  const server = createServer((request, response) => {
    response.writeHead(200, { 'Content-Type': 'text/html' });
    response.end(PAGE);
  });
  const base = await new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}`)));
  try {
    const result = await probe(base);
    assert.equal(result.ok, true);
    assert.equal(result.loginPage, true);
    assert.equal(result.usernameField, 'login_form/input_3/input_4');
    assert.equal(result.passwordField, 'login_form/input_3/input_5');
    assert.match(result.action, /doStandardAuthentication/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
