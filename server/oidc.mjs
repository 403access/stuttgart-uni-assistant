import { createHash, randomBytes } from 'node:crypto';

import { logService } from './service-log.mjs';

/** Public URLs of the University of Stuttgart login. No secrets. */
export const references = {
  campus: 'https://campus.uni-stuttgart.de/',
  issuer: 'https://idp.uni-stuttgart.de',
  discovery: 'https://idp.uni-stuttgart.de/.well-known/openid-configuration',
  testDiscovery: 'https://idp-test.tik.uni-stuttgart.de/.well-known/openid-configuration',
  authorize: 'https://idp.uni-stuttgart.de/idp/profile/oidc/authorize',
  token: 'https://idp.uni-stuttgart.de/idp/profile/oidc/token',
  userinfo: 'https://idp.uni-stuttgart.de/idp/profile/oidc/userinfo',
  jwks: 'https://idp.uni-stuttgart.de/idp/profile/oidc/keyset',
  registration: 'https://idp.uni-stuttgart.de/idp/profile/oidc/register',
  endSession: 'https://idp.uni-stuttgart.de/idp/profile/oidc/end-session',
  revocation: 'https://idp.uni-stuttgart.de/idp/profile/oauth2/revocation',
  introspection: 'https://idp.uni-stuttgart.de/idp/profile/oauth2/introspection',
  pushedAuthorization: 'https://idp.uni-stuttgart.de/idp/profile/oauth2/pushed-authorization',
  samlMetadata: 'https://idp.uni-stuttgart.de/idp/shibboleth',
  tikSso: 'https://www.tik.uni-stuttgart.de/dienste-a-z/Anmelde--und-Authentifizierungsdienst-Single-Sign-On---SSO/',
  siam: 'https://www.tik.uni-stuttgart.de/dienste-a-z/Identitaetsmanagement-00001/',
  support: 'shibboleth-support@tik.uni-stuttgart.de',
};

const productionDiscovery = {
  issuer: references.issuer,
  authorization_endpoint: references.authorize,
  token_endpoint: references.token,
  userinfo_endpoint: references.userinfo,
  jwks_uri: references.jwks,
  end_session_endpoint: references.endSession,
  revocation_endpoint: references.revocation,
};

const pending = new Map();
const sessions = new Map();
let discoveryCache = null;

const ignoredPasswordKeys = ['OIDC_PASSWORD', 'PASSWORD', 'CAMPUS_PASSWORD', 'SIAM_PASSWORD', 'UNI_PASSWORD'];

export function warnIfPasswordPresent() {
  const found = ignoredPasswordKeys.filter((key) => process.env[key]);
  if (!found.length) return;
  logService('oidc', 'warn',
    `Ignoring ${found.join(', ')}. The university password is typed only at ${references.authorize} and is never read from the environment.`,
  );
}

export function oidcSettings() {
  const issuer = (process.env.OIDC_ISSUER || references.issuer).replace(/\/$/, '');
  return {
    issuer,
    clientId: process.env.OIDC_CLIENT_ID || '',
    clientSecret: process.env.OIDC_CLIENT_SECRET || '',
    loginHint: process.env.OIDC_LOGIN_HINT || '',
    scopes: process.env.OIDC_SCOPES || 'openid profile email uid siam',
  };
}

export function oidcConfigured() {
  const { clientId, clientSecret } = oidcSettings();
  return Boolean(clientId && clientSecret);
}

export function publicOidcStatus() {
  const { issuer, scopes, loginHint } = oidcSettings();
  return {
    configured: oidcConfigured(),
    issuer,
    discovery: `${issuer}/.well-known/openid-configuration`,
    authorizationEndpoint: references.authorize,
    campus: references.campus,
    support: references.support,
    scopes,
    loginHintSet: Boolean(loginHint),
    passwordAccepted: false,
  };
}

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

export function createPkce() {
  const verifier = base64url(randomBytes(32));
  const challenge = base64url(createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

export function allowRedirect(uri) {
  if (typeof uri !== 'string' || uri.length < 8 || uri.length > 500) return false;
  let url;
  try {
    url = new URL(uri);
  } catch {
    return false;
  }
  if (url.username || url.password || url.hash) return false;
  const extras = (process.env.OIDC_REDIRECT_URIS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  if (extras.includes(uri)) return true;
  if (process.env.OIDC_ALLOW_DEV_REDIRECTS === 'false') return false;
  if (url.protocol === 'universityassistant:' && url.hostname === 'oidc') return true;
  if (url.protocol === 'exp:' || url.protocol === 'exps:') return true;
  const localHost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  const localProtocol = url.protocol === 'http:' || url.protocol === 'https:';
  if (localProtocol && localHost && (url.pathname === '/oidc' || url.pathname.endsWith('/oidc'))) return true;
  return false;
}

export function buildAuthorizeUrl({ authorizationEndpoint, redirectUri, state, nonce, challenge, clientId, scopes, loginHint }) {
  const url = new URL(authorizationEndpoint);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', scopes);
  url.searchParams.set('state', state);
  url.searchParams.set('nonce', nonce);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  if (loginHint) url.searchParams.set('login_hint', loginHint);
  return url.toString();
}

async function loadDiscovery() {
  if (discoveryCache) return discoveryCache;
  const { issuer } = oidcSettings();
  try {
    const response = await fetch(`${issuer}/.well-known/openid-configuration`, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`discovery ${response.status}`);
    const document = await response.json();
    if (!document.authorization_endpoint || !document.token_endpoint || !document.userinfo_endpoint) {
      throw new Error('discovery incomplete');
    }
    discoveryCache = document;
    return document;
  } catch (error) {
    if (issuer === references.issuer) {
      discoveryCache = productionDiscovery;
      return productionDiscovery;
    }
    throw httpError(502, 'discovery_failed', error instanceof Error ? error.message : 'discovery_failed');
  }
}

function httpError(status, code, detail) {
  const error = new Error(code);
  error.status = status;
  error.detail = detail;
  return error;
}

function prune() {
  const pendingCutoff = Date.now() - 10 * 60 * 1000;
  for (const [key, value] of pending) if (value.created < pendingCutoff) pending.delete(key);
  const sessionCutoff = Date.now() - 12 * 60 * 60 * 1000;
  for (const [key, value] of sessions) if (value.created < sessionCutoff) sessions.delete(key);
}

export async function startLogin(redirectUri) {
  if (!oidcConfigured()) throw httpError(503, 'oidc_unconfigured');
  if (!allowRedirect(redirectUri)) throw httpError(400, 'redirect_rejected');
  const discovery = await loadDiscovery();
  const { clientId, scopes, loginHint } = oidcSettings();
  const { verifier, challenge } = createPkce();
  const state = base64url(randomBytes(16));
  const nonce = base64url(randomBytes(16));
  pending.set(state, { verifier, nonce, redirectUri, created: Date.now() });
  prune();
  return {
    authorizationUrl: buildAuthorizeUrl({
      authorizationEndpoint: discovery.authorization_endpoint,
      redirectUri,
      state,
      nonce,
      challenge,
      clientId,
      scopes,
      loginHint,
    }),
    state,
    redirectUri,
    issuer: discovery.issuer || oidcSettings().issuer,
    authorizationEndpoint: discovery.authorization_endpoint,
  };
}

function claim(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function publicProfile(user) {
  const affiliation = Array.isArray(user.eduPersonScopedAffiliation)
    ? user.eduPersonScopedAffiliation.filter((item) => typeof item === 'string')
    : claim(user.eduPersonScopedAffiliation)
      ? [user.eduPersonScopedAffiliation]
      : [];
  return {
    account: claim(user.siamAccountId) || claim(user.preferred_username) || claim(user.email) || claim(user.sub),
    name: claim(user.name),
    email: claim(user.email),
    subject: claim(user.sub),
    givenName: claim(user.given_name),
    familyName: claim(user.family_name),
    affiliation,
  };
}

function safeDetail(payload, status) {
  const code = typeof payload?.error === 'string' ? payload.error.slice(0, 80) : '';
  return code || `http_${status}`;
}

export async function exchangeCode({ code, state, redirectUri }) {
  if (typeof code !== 'string' || !code || typeof state !== 'string' || !state) throw httpError(400, 'code_missing');
  const record = pending.get(state);
  pending.delete(state);
  if (!record || record.redirectUri !== redirectUri || Date.now() - record.created > 10 * 60 * 1000) {
    throw httpError(400, 'state_invalid');
  }
  const discovery = await loadDiscovery();
  const { clientId, clientSecret } = oidcSettings();
  const basic = Buffer.from(`${encodeURIComponent(clientId)}:${encodeURIComponent(clientSecret)}`).toString('base64');
  const tokenResponse = await fetch(discovery.token_endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: record.verifier,
    }),
    signal: AbortSignal.timeout(20_000),
  });
  const tokenPayload = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok || !tokenPayload.access_token) {
    throw httpError(502, 'token_exchange_failed', safeDetail(tokenPayload, tokenResponse.status));
  }
  const userResponse = await fetch(discovery.userinfo_endpoint, {
    headers: { Authorization: `Bearer ${tokenPayload.access_token}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(20_000),
  });
  const user = await userResponse.json().catch(() => ({}));
  if (!userResponse.ok) throw httpError(502, 'userinfo_failed', safeDetail(user, userResponse.status));
  const profile = publicProfile(user);
  if (!profile.account) throw httpError(502, 'account_missing');
  const sessionId = base64url(randomBytes(24));
  sessions.set(sessionId, {
    created: Date.now(),
    accessToken: tokenPayload.access_token,
    refreshToken: tokenPayload.refresh_token || null,
    idToken: tokenPayload.id_token || null,
    profile,
  });
  prune();
  return { sessionId, profile };
}

export async function endRemoteSession(sessionId) {
  const session = typeof sessionId === 'string' ? sessions.get(sessionId) : undefined;
  if (session) sessions.delete(sessionId);
  if (!session) return { ended: false };
  const discovery = discoveryCache || productionDiscovery;
  const { clientId, clientSecret } = oidcSettings();
  if (oidcConfigured() && discovery.revocation_endpoint && (session.refreshToken || session.accessToken)) {
    const basic = Buffer.from(`${encodeURIComponent(clientId)}:${encodeURIComponent(clientSecret)}`).toString('base64');
    try {
      await fetch(discovery.revocation_endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basic}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          token: session.refreshToken || session.accessToken,
          token_type_hint: session.refreshToken ? 'refresh_token' : 'access_token',
        }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      // Local sign-out still proceeds when the IdP cannot be reached.
    }
  }
  return { ended: true };
}

export function resetOidcState() {
  pending.clear();
  sessions.clear();
  discoveryCache = null;
}
