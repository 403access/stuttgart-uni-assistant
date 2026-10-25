import assert from 'node:assert/strict';
import { test } from 'node:test';

import { asUserAccount, findPlatform, initialsFor, localUser, sameAccount } from '../apps/mobile/src/auth/user.ts';

/**
 * The server user record is copied to the device. This parser is the only gate
 * between whatever the server sent (or an old payload) and the account screen,
 * so its acceptance and rejection rules are pinned here.
 */

const SERVER_USER = {
  id: 'usr_abc',
  account: 'st123456',
  name: 'Lena Hartmann',
  email: 'lena.hartmann@demo.uni-stuttgart.test',
  matriculation: '4123456',
  subject: 'pairwise-subject',
  mode: 'campus',
  createdAt: '2026-10-19T08:00:00.000Z',
  updatedAt: '2026-10-19T09:00:00.000Z',
  lastLoginAt: '2026-10-19T09:00:00.000Z',
  platforms: [
    { id: 'campus', account: 'st123456', status: 'connected', source: 'campus', linkedAt: '2026-10-19T08:00:00.000Z', lastSyncAt: null },
    { id: 'ilias', account: 'st123456', status: 'linked', source: 'campus-sso', linkedAt: '2026-10-19T08:00:00.000Z' },
  ],
};

test('asUserAccount keeps a well-formed server user', () => {
  const user = asUserAccount(SERVER_USER);
  assert.equal(user.id, 'usr_abc');
  assert.equal(user.mode, 'campus');
  assert.equal(user.platforms.length, 2);
  assert.equal(user.platforms[1].lastSyncAt, null);
});

test('asUserAccount rejects anything without an id and account', () => {
  assert.equal(asUserAccount(null), null);
  assert.equal(asUserAccount('nope'), null);
  assert.equal(asUserAccount({ account: 'st123456' }), null);
  assert.equal(asUserAccount({ id: 'usr_1' }), null);
  assert.equal(asUserAccount({ id: 'usr_1', account: '   ' }), null);
});

test('asUserAccount drops unknown platforms and defaults a bad status', () => {
  const user = asUserAccount({
    id: 'usr_1',
    account: 'st1',
    mode: 'not-a-mode',
    platforms: [
      { id: 'dropbox', status: 'connected' },
      { id: 'mail', account: 'st1', status: 'weird' },
    ],
  });
  assert.equal(user.mode, 'local');
  assert.deepEqual(user.platforms.map((item) => item.id), ['mail']);
  assert.equal(user.platforms[0].status, 'linked');
});

test('findPlatform and initialsFor read the account the screen shows', () => {
  const user = asUserAccount(SERVER_USER);
  assert.equal(findPlatform(user, 'campus')?.status, 'connected');
  assert.equal(findPlatform(user, 'sdg'), null);
  assert.equal(initialsFor(user), 'LH');
  assert.equal(initialsFor(localUser({ account: 'st123456', mode: 'local' })), 'ST');
  assert.equal(initialsFor(null), '?');
});

test('localUser is an offline fallback, not a server identity', () => {
  const user = localUser({ account: 'st123456', name: 'Lena Hartmann', mode: 'demo' });
  assert.match(user.id, /^local-/);
  assert.equal(user.mode, 'demo');
  assert.equal(user.platforms.length, 0);
});

test('sameAccount treats the short id and the mail address as one account', () => {
  assert.equal(sameAccount('st123456', 'st123456@stud.uni-stuttgart.de'), true);
  assert.equal(sameAccount('st123456@stud.uni-stuttgart.de', 'ST123456'), true);
  assert.equal(sameAccount('st123456', 'st999999'), false);
  assert.equal(sameAccount(null, 'st123456'), false);
});
