import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import {
  allowRedirect,
  buildAuthorizeUrl,
  createPkce,
  publicProfile,
  references,
  resetOidcState,
  startLogin,
} from './oidc.mjs';

afterEach(() => {
  resetOidcState();
  delete process.env.OIDC_CLIENT_ID;
  delete process.env.OIDC_CLIENT_SECRET;
  delete process.env.OIDC_LOGIN_HINT;
  delete process.env.OIDC_PASSWORD;
  delete process.env.OIDC_ALLOW_DEV_REDIRECTS;
});

test('authorize URL targets the university IdP and carries PKCE', () => {
  const { verifier, challenge } = createPkce();
  const url = new URL(
    buildAuthorizeUrl({
      authorizationEndpoint: references.authorize,
      redirectUri: 'universityassistant://oidc',
      state: 'state-1',
      nonce: 'nonce-1',
      challenge,
      clientId: 'example-client',
      scopes: 'openid profile email',
      loginHint: 'st123456',
    }),
  );
  assert.equal(url.origin + url.pathname, references.authorize);
  assert.equal(url.searchParams.get('response_type'), 'code');
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(url.searchParams.get('code_challenge'), challenge);
  assert.equal(url.searchParams.get('login_hint'), 'st123456');
  assert.equal(url.searchParams.get('execution'), null);
  assert.equal(url.searchParams.has('password'), false);
  assert.notEqual(verifier, challenge);
});

test('dev redirects are limited to this app and localhost', () => {
  assert.equal(allowRedirect('universityassistant://oidc'), true);
  assert.equal(allowRedirect('http://127.0.0.1:8081/oidc'), true);
  assert.equal(allowRedirect('http://localhost:19006/oidc'), true);
  assert.equal(allowRedirect('https://evil.example/oidc'), false);
  assert.equal(allowRedirect('https://idp.uni-stuttgart.de/idp/profile/oidc/authorize'), false);
  assert.equal(allowRedirect('universityassistant://other'), false);
});

test('start refuses to run without a registered client', async () => {
  await assert.rejects(() => startLogin('universityassistant://oidc'), /oidc_unconfigured/);
});

test('a password in the environment is not copied into the authorize URL', async () => {
  process.env.OIDC_CLIENT_ID = 'example-client';
  process.env.OIDC_CLIENT_SECRET = 'example-secret';
  process.env.OIDC_PASSWORD = 'not-used';
  process.env.OIDC_LOGIN_HINT = 'st123456';
  const started = await startLogin('universityassistant://oidc');
  assert.match(started.authorizationUrl, new RegExp(`^${references.authorize}\\?`));
  assert.equal(started.authorizationUrl.includes('not-used'), false);
  assert.equal(started.authorizationUrl.includes('example-secret'), false);
  assert.match(started.authorizationUrl, /login_hint=st123456/);
});

test('profile prefers the SIAM account id', () => {
  const profile = publicProfile({
    sub: 'pairwise-subject',
    siamAccountId: 'st998877',
    preferred_username: 'st998877',
    email: 'st998877@stud.uni-stuttgart.de',
    name: 'Ada Beispiel',
    eduPersonScopedAffiliation: ['student@uni-stuttgart.de'],
  });
  assert.equal(profile.account, 'st998877');
  assert.equal(profile.email, 'st998877@stud.uni-stuttgart.de');
  assert.deepEqual(profile.affiliation, ['student@uni-stuttgart.de']);
});
