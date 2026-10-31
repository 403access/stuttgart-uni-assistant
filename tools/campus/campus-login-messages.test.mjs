import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildHarvest, diagnoseLines, mergeCookieStrings } from '../../apps/mobile/src/auth/campus-harvest.ts';
import { campusMessage, formatDump, hostOf, messageFor, parseHarvestMessage } from '../../apps/mobile/src/auth/login-messages.ts';

/**
 * The pure helpers the login screen and its two WebView hooks rely on. They are
 * where a refactor can silently change behaviour, so the text mapping, the
 * message parsing and the harvest payload are pinned here.
 */

test('parseHarvestMessage accepts objects and rejects everything else', () => {
  assert.deepEqual(parseHarvestMessage('{"step":"filled"}'), { step: 'filled' });
  assert.equal(parseHarvestMessage('not json'), null);
  assert.equal(parseHarvestMessage('[1,2]'), null);
  assert.equal(parseHarvestMessage('"text"'), null);
  assert.equal(parseHarvestMessage('null'), null);
  assert.equal(parseHarvestMessage(''), null);
  assert.equal(parseHarvestMessage(undefined), null);
  assert.equal(parseHarvestMessage({ step: 'filled' }), null);
});

test('hostOf reads the host of a page URL', () => {
  assert.equal(hostOf('https://campus.uni-stuttgart.de/cusonline/ee'), 'campus.uni-stuttgart.de');
  assert.equal(hostOf('http://127.0.0.1:8787/v1/campus/login'), '127.0.0.1:8787');
  assert.equal(hostOf('Wartung'), '');
  assert.equal(hostOf(undefined), '');
});

test('formatDump names the page, the controls and every form', () => {
  const text = formatDump({
    url: 'https://idp.uni-stuttgart.de/idp/profile/oidc/authorize?execution=e1s2',
    title: 'Web Login Service',
    controls: ['input|text|j_username', 'button|submit|_eventId_proceed'],
    forms: [{ method: 'post', action: '/idp/profile/oidc/authorize?execution=e1s2', html: '<form>…</form>' }],
  });
  assert.match(text, /^URL: https:\/\/idp\.uni-stuttgart\.de/);
  assert.match(text, /TITLE: Web Login Service/);
  assert.match(text, /input\|text\|j_username/);
  assert.match(text, /FORM 1 method=post action=\/idp\/profile\/oidc\/authorize/);
  assert.match(text, /<form>…<\/form>/);
  assert.equal(formatDump({}).includes('ERROR: –'), true);
});

test('campusMessage maps every server code, keeps the detail, and stays bilingual', () => {
  const codes = ['server_unreachable', 'token_missing', 'missing_session_cookie', 'invalid_token', 'no_credentials_found', 'campus_unauthorized'];
  const german = codes.map((code) => campusMessage('de', code));
  const english = codes.map((code) => campusMessage('en', code));
  assert.equal(new Set(german).size, codes.length, 'each code needs its own text');
  german.forEach((text, index) => assert.notEqual(text, english[index], `${codes[index]} must be translated`));

  assert.match(campusMessage('de', 'campus_unauthorized', 'upstream 401'), /upstream 401/);
  assert.match(campusMessage('de', 'some_new_code'), /some_new_code/);
  assert.doesNotMatch(campusMessage('de', 'campus_unauthorized'), /undefined/);
});

test('messageFor covers the OIDC outcomes and the unreachable server', () => {
  assert.match(messageFor('de', 'cancelled', null), /abgebrochen/);
  assert.match(messageFor('en', 'cancelled', null), /cancelled/);
  assert.match(messageFor('de', 'oidc_unconfigured', null), /OIDC_CLIENT_ID/);
  assert.match(messageFor('de', 'redirect_rejected', { configured: true, loginHintSet: false }), /Redirect/);
  assert.match(messageFor('de', 'anything', null), /nicht erreichbar/);
  assert.match(messageFor('de', 'anything', { configured: true, loginHintSet: true }), /anything/);
});

test('mergeCookieStrings keeps the first value per name', () => {
  assert.equal(mergeCookieStrings('a=1; b=2', 'b=other; c=3'), 'a=1; b=2; c=3');
  assert.equal(mergeCookieStrings('', 'PSESSIONID=x'), 'PSESSIONID=x');
  assert.equal(mergeCookieStrings('  ', ''), '');
  assert.equal(mergeCookieStrings('PSESSIONID=a;  ', 'psessionid=b'), 'PSESSIONID=a');
});

test('buildHarvest filters and caps the storage the page sent', () => {
  const harvest = buildHarvest(
    {
      cookies: 'CO_LANG=de',
      storage: {
        'local:token': 'x'.repeat(5000),
        'session:scratch': 'temporary',
        'local:empty': '',
        'local:object': { nope: true },
      },
    },
    'PSESSIONID=native',
  );
  assert.equal(harvest.cookies, 'CO_LANG=de; PSESSIONID=native');
  assert.equal(Object.keys(harvest.storage).length, 2);
  assert.equal(harvest.storage['local:token'].length, 4000);
  assert.equal(harvest.storage['session:scratch'], 'temporary');
  assert.equal(harvest.storage['local:empty'], undefined);
  assert.equal(harvest.storage['local:object'], undefined);
});

test('buildHarvest survives a harvest with nothing in it', () => {
  const harvest = buildHarvest({}, '');
  assert.deepEqual(harvest, { cookies: '', storage: {} });
  const long = buildHarvest({ cookies: 'x'.repeat(10), storage: { ['k'.repeat(200)]: 'v' } }, '');
  assert.equal(Object.keys(long.storage)[0].length, 120);
});

test('diagnoseLines reports the page, both cookie stores and the web storages', () => {
  const lines = diagnoseLines(
    'de',
    { url: 'https://campus.uni-stuttgart.de/cusonline/', cookies: ['CO_LANG'], local: ['cusonline_co.login.accessToken=token:44'], session: [] },
    ['PSESSIONID', 'CO_LANG'],
  );
  assert.equal(lines.length, 5);
  assert.match(lines[0], /^Seite: https:\/\/campus/);
  assert.match(lines[1], /CO_LANG/);
  assert.match(lines[2], /PSESSIONID, CO_LANG/);
  assert.match(lines[3], /accessToken/);
  assert.match(lines[4], /–$/, 'an empty storage reads as a dash');

  const english = diagnoseLines('en', {}, []);
  assert.match(english[0], /^Page: –/);
  assert.match(english[2], /Cookies \(native, incl\. HttpOnly\): –/);
});
