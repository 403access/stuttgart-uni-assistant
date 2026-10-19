import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

import { assistantUrl } from '@/src/assistant/remote';
import { asAuthSession, type AuthSession as AppSession } from '@/src/auth/session';

WebBrowser.maybeCompleteAuthSession();

/** Same public URLs as server/oidc.mjs. The password is never one of them. */
export const universityUrls = {
  campus: 'https://campus.uni-stuttgart.de/',
  issuer: 'https://idp.uni-stuttgart.de',
  discovery: 'https://idp.uni-stuttgart.de/.well-known/openid-configuration',
  testDiscovery: 'https://idp-test.tik.uni-stuttgart.de/.well-known/openid-configuration',
  authorize: 'https://idp.uni-stuttgart.de/idp/profile/oidc/authorize',
  token: 'https://idp.uni-stuttgart.de/idp/profile/oidc/token',
  userinfo: 'https://idp.uni-stuttgart.de/idp/profile/oidc/userinfo',
  tikSso: 'https://www.tik.uni-stuttgart.de/dienste-a-z/Anmelde--und-Authentifizierungsdienst-Single-Sign-On---SSO/',
  siam: 'https://www.tik.uni-stuttgart.de/dienste-a-z/Identitaetsmanagement-00001/',
  support: 'shibboleth-support@tik.uni-stuttgart.de',
};

export interface OidcProfile {
  account: string;
  name: string | null;
  email: string | null;
  subject: string | null;
  sessionId: string;
  /** Server user and bearer session created by the same sign-in. Absent from older servers. */
  auth?: AppSession;
}

export interface OidcStatus {
  configured: boolean;
  issuer: string;
  authorizationEndpoint: string;
  campus: string;
  support: string;
  scopes: string;
  loginHintSet: boolean;
}

export function universityRedirectUri(): string {
  return AuthSession.makeRedirectUri({
    scheme: 'universityassistant',
    path: 'oidc',
  });
}

function endpoint(path: string): string {
  return `${assistantUrl.replace(/\/$/, '')}${path}`;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(endpoint(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string; detail?: string };
  if (!response.ok) {
    const error = new Error(payload.error || `http_${response.status}`);
    (error as Error & { detail?: string }).detail = payload.detail;
    throw error;
  }
  return payload;
}

export async function fetchOidcStatus(): Promise<OidcStatus | null> {
  try {
    const response = await fetch(endpoint('/v1/oidc/config'));
    if (!response.ok) return null;
    return (await response.json()) as OidcStatus;
  } catch {
    return null;
  }
}

export async function signInWithUniversity(): Promise<OidcProfile> {
  const redirectUri = universityRedirectUri();
  const started = await postJson<{ authorizationUrl: string; state: string }>('/v1/oidc/start', { redirectUri });
  const result = await WebBrowser.openAuthSessionAsync(started.authorizationUrl, redirectUri);
  if (result.type === 'cancel' || result.type === 'dismiss') {
    throw new Error('cancelled');
  }
  if (result.type !== 'success') throw new Error('browser_failed');
  const returned = new URL(result.url);
  const error = returned.searchParams.get('error');
  if (error) throw new Error(error);
  const code = returned.searchParams.get('code');
  const state = returned.searchParams.get('state');
  if (!code || state !== started.state) throw new Error('state_invalid');
  const exchanged = await postJson<{
    sessionId: string;
    profile: Omit<OidcProfile, 'sessionId' | 'auth'>;
    token?: unknown;
    expiresAt?: unknown;
    user?: unknown;
  }>('/v1/oidc/exchange', {
    code,
    state,
    redirectUri,
  });
  const auth = asAuthSession({ token: exchanged.token, expiresAt: exchanged.expiresAt, user: exchanged.user });
  return { ...exchanged.profile, sessionId: exchanged.sessionId, auth: auth ?? undefined };
}

export async function openOfficialCampus(): Promise<void> {
  await WebBrowser.openBrowserAsync(universityUrls.campus);
}

export async function endUniversitySession(sessionId: string | null): Promise<void> {
  if (!sessionId) return;
  try {
    await postJson('/v1/oidc/logout', { sessionId });
  } catch {
    // The device session is cleared even when the server has already dropped the token.
  }
}
