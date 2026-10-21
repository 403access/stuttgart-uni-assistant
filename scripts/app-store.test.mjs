import assert from 'node:assert/strict';
import { test } from 'node:test';

import { appStore, patchApp, samePersisted, selectPersisted, updateApp } from '../src/state/app-store.ts';

/**
 * The store holds runtime session values next to the persisted record. The
 * persistence layer must strip them; a leaked bearer token would land in
 * AsyncStorage, where the app deliberately keeps no session secret.
 */

test('the persisted slice never contains runtime session values', () => {
  updateApp((state) => ({ ...state, authToken: null, authSessionId: null, ready: false }));

  patchApp({ authToken: 'bearer-secret', authSessionId: 'sess_1', ready: true });
  const persisted = selectPersisted(appStore.state);

  assert.equal('authToken' in persisted, false, 'authToken must not be persisted');
  assert.equal('authSessionId' in persisted, false, 'authSessionId must not be persisted');
  assert.equal('ready' in persisted, false, 'ready must not be persisted');

  updateApp((state) => ({ ...state, authToken: null, authSessionId: null, ready: false }));
});

test('samePersisted compares the persisted fields only', () => {
  updateApp((state) => ({ ...state, locale: 'de' }));
  const before = selectPersisted(appStore.state);

  patchApp({ authToken: 'another-token' });
  assert.equal(samePersisted(before, selectPersisted(appStore.state)), true, 'a token change is not a record change');

  patchApp({ locale: 'en' });
  assert.equal(samePersisted(before, selectPersisted(appStore.state)), false, 'a locale change is a record change');

  updateApp((state) => ({ ...state, authToken: null, locale: 'de' }));
});
