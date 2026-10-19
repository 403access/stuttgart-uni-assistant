/**
 * App session transport. The server mints an opaque bearer token; the device
 * keeps it in the keychain/Keystore (SecureStore) on native and in AsyncStorage
 * on web, where no secure store exists. The token is never part of the
 * AsyncStorage `PersistedState` payload.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { assistantUrl } from '@/src/assistant/remote';
import { asUserAccount } from '@/src/auth/user';
import type { AccountPlatformId, PlatformLinkStatus, UserAccount } from '@/src/types';

const TOKEN_KEY = 'university-assistant/auth.v1';

/** In-memory token for the API modules that are not React components. */
let activeToken: string | null = null;

export function setActiveAuthToken(token: string | null): void {
  activeToken = token;
}

export function getActiveAuthToken(): string | null {
  return activeToken;
}

/** `Authorization` header for campus, mail, and API calls. Empty when signed out. */
export function authHeaders(): Record<string, string> {
  return activeToken ? { Authorization: `Bearer ${activeToken}` } : {};
}

export interface AuthSession {
  token: string;
  expiresAt: string;
  user: UserAccount;
}

export interface ServerSessionInput {
  mode: 'demo' | 'local';
  account: string;
  name?: string | null;
  email?: string | null;
}

function endpoint(path: string): string {
  return `${assistantUrl.replace(/\/$/, '')}${path}`;
}

async function secureStore(): Promise<typeof import('expo-secure-store') | null> {
  if (Platform.OS === 'web') return null;
  try {
    const module = await import('expo-secure-store');
    return (await module.isAvailableAsync()) ? module : null;
  } catch {
    return null;
  }
}

export async function readAuthToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return AsyncStorage.getItem(TOKEN_KEY).catch(() => null);
  }
  const module = await secureStore();
  if (!module) return null;
  try {
    return await module.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function saveAuthToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(TOKEN_KEY, token).catch(() => undefined);
    return;
  }
  const module = await secureStore();
  if (!module) return;
  await module.setItemAsync(TOKEN_KEY, token).catch(() => undefined);
}

export async function clearAuthToken(): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(TOKEN_KEY).catch(() => undefined);
    return;
  }
  const module = await secureStore();
  if (!module) return;
  await module.deleteItemAsync(TOKEN_KEY).catch(() => undefined);
}

export function asAuthSession(value: unknown): AuthSession | null {
  if (!value || typeof value !== 'object') return null;
  const payload = value as { token?: unknown; expiresAt?: unknown; user?: unknown };
  if (typeof payload.token !== 'string' || !payload.token) return null;
  const user = asUserAccount(payload.user);
  if (!user) return null;
  return {
    token: payload.token,
    expiresAt: typeof payload.expiresAt === 'string' ? payload.expiresAt : '',
    user,
  };
}

async function request(path: string, init: RequestInit, token?: string | null): Promise<Response> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(endpoint(path), { ...init, headers });
}

async function failure(response: Response, fallback: string): Promise<Error> {
  const payload = (await response.json().catch(() => ({}))) as { error?: unknown; detail?: unknown };
  const error = new Error(typeof payload.error === 'string' && payload.error ? payload.error : fallback);
  if (typeof payload.detail === 'string' && payload.detail) (error as Error & { detail?: string }).detail = payload.detail;
  return error;
}

export async function createServerSession(input: ServerSessionInput): Promise<AuthSession> {
  let response: Response;
  try {
    response = await request('/v1/auth/session', {
      method: 'POST',
      body: JSON.stringify({ mode: input.mode, account: input.account, name: input.name ?? null, email: input.email ?? null }),
    });
  } catch {
    throw new Error('server_unreachable');
  }
  if (!response.ok) throw await failure(response, 'auth_failed');
  const session = asAuthSession(await response.json().catch(() => ({})));
  if (!session) throw new Error('auth_unexpected');
  return session;
}

/** `null` means the server could not be asked; `{ unauthorized: true }` means the token is dead. */
export async function fetchSessionUser(token: string): Promise<{ user: UserAccount; expiresAt: string } | { unauthorized: true } | null> {
  let response: Response;
  try {
    response = await request('/v1/auth/me', { method: 'GET' }, token);
  } catch {
    return null;
  }
  if (response.status === 401) return { unauthorized: true };
  if (!response.ok) return null;
  const payload = (await response.json().catch(() => ({}))) as { user?: unknown; session?: { expiresAt?: unknown } };
  const user = asUserAccount(payload.user);
  if (!user) return null;
  return { user, expiresAt: typeof payload.session?.expiresAt === 'string' ? payload.session.expiresAt : '' };
}

export async function logoutServerSession(token: string | null): Promise<void> {
  if (!token) return;
  try {
    await request('/v1/auth/logout', { method: 'POST' }, token);
  } catch {
    // The device token is cleared even when the server is unreachable.
  }
}

export async function linkServerPlatform(
  token: string | null,
  platform: AccountPlatformId,
  account: string | null,
  status: PlatformLinkStatus = 'connected',
  source = 'client',
): Promise<UserAccount | null> {
  if (!token) return null;
  try {
    const response = await request(
      '/v1/auth/links',
      { method: 'POST', body: JSON.stringify({ platform, account, status, source }) },
      token,
    );
    if (!response.ok) return null;
    const payload = (await response.json().catch(() => ({}))) as { user?: unknown };
    return asUserAccount(payload.user);
  } catch {
    return null;
  }
}

export async function syncServerPlatform(token: string | null, platform: AccountPlatformId): Promise<UserAccount | null> {
  if (!token) return null;
  try {
    const response = await request(
      '/v1/auth/sync',
      { method: 'POST', body: JSON.stringify({ platform, at: new Date().toISOString() }) },
      token,
    );
    if (!response.ok) return null;
    const payload = (await response.json().catch(() => ({}))) as { user?: unknown };
    return asUserAccount(payload.user);
  } catch {
    return null;
  }
}

export async function unlinkServerPlatform(token: string | null, platform: AccountPlatformId): Promise<UserAccount | null> {
  if (!token) return null;
  try {
    const response = await request(`/v1/auth/links/${encodeURIComponent(platform)}`, { method: 'DELETE' }, token);
    if (!response.ok) return null;
    const payload = (await response.json().catch(() => ({}))) as { user?: unknown };
    return asUserAccount(payload.user);
  } catch {
    return null;
  }
}
