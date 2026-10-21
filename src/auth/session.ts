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
/** Server-side id of the session the token belongs to (`ses_…`). Not a credential. */
const SESSION_KEY = 'university-assistant/auth-session.v1';

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
  /** Server-side session row this token belongs to. Empty from older servers. */
  sessionId: string;
  expiresAt: string;
  user: UserAccount;
}

/** A browser pairing shown as a QR code in the web app. */
export interface DeviceLinkStart {
  id: string;
  token: string;
  name: string;
  expiresAt: string;
  state: 'pending';
  pairingUrl: string;
}

/** A browser link as seen by the phone or the admin dashboard. */
export interface DeviceLinkInfo {
  id: string;
  userId?: string | null;
  name: string;
  kind: string;
  userAgent: string;
  state: 'pending' | 'approved' | 'active' | 'linked' | 'expired' | 'revoked';
  createdAt: string;
  expiresAt: string;
  approvedAt: string | null;
  consumedAt: string | null;
  revokedAt: string | null;
  lastSeenAt: string | null;
  sessionId: string | null;
}

export type DevicePollResult =
  | { status: 'pending' }
  | { status: 'approved'; session: AuthSession; device: DeviceLinkInfo };

/** Preferences that follow the account across the phone and the web build. */
export interface UserPreferences {
  onboardingCompletedAt: string | null;
  theme: 'light' | 'dark' | null;
  design: 'clean' | 'playful' | null;
  locale: 'de' | 'en' | null;
  updatedAt: string | null;
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

/**
 * The token the scanner should try first. `authToken` comes from React state and
 * can be empty while the session is still restoring (or when the app was opened
 * offline); secure storage may already hold the token. Duplicates are removed.
 */
export async function authTokenCandidates(current: string | null): Promise<string[]> {
  const stored = await readAuthToken();
  return [...new Set([current, getActiveAuthToken(), stored].filter((token): token is string => Boolean(token)))];
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

/**
 * The session id is stored next to the token so a later refresh can prove which
 * server session is being resumed. It is not a bearer and cannot authenticate a
 * request on its own; the token stays the only credential.
 */
export async function readAuthSessionId(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return AsyncStorage.getItem(SESSION_KEY).catch(() => null);
  }
  const module = await secureStore();
  if (!module) return null;
  try {
    return await module.getItemAsync(SESSION_KEY);
  } catch {
    return null;
  }
}

export async function saveAuthSessionId(sessionId: string | null): Promise<void> {
  if (!sessionId) {
    await clearAuthSessionId();
    return;
  }
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(SESSION_KEY, sessionId).catch(() => undefined);
    return;
  }
  const module = await secureStore();
  if (!module) return;
  await module.setItemAsync(SESSION_KEY, sessionId).catch(() => undefined);
}

export async function clearAuthSessionId(): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(SESSION_KEY).catch(() => undefined);
    return;
  }
  const module = await secureStore();
  if (!module) return;
  await module.deleteItemAsync(SESSION_KEY).catch(() => undefined);
}

/** Drop the token and the session id together, so a later launch cannot mix them. */
export async function clearAuthSession(): Promise<void> {
  await Promise.all([clearAuthToken(), clearAuthSessionId()]);
}

export function asAuthSession(value: unknown): AuthSession | null {
  if (!value || typeof value !== 'object') return null;
  const payload = value as { token?: unknown; sessionId?: unknown; expiresAt?: unknown; user?: unknown };
  if (typeof payload.token !== 'string' || !payload.token) return null;
  const user = asUserAccount(payload.user);
  if (!user) return null;
  return {
    token: payload.token,
    sessionId: typeof payload.sessionId === 'string' ? payload.sessionId : '',
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

function asUserPreferences(value: unknown): UserPreferences | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Partial<UserPreferences>;
  return {
    onboardingCompletedAt: typeof row.onboardingCompletedAt === 'string' ? row.onboardingCompletedAt : null,
    theme: row.theme === 'light' || row.theme === 'dark' ? row.theme : null,
    design: row.design === 'clean' || row.design === 'playful' ? row.design : null,
    locale: row.locale === 'de' || row.locale === 'en' ? row.locale : null,
    updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : null,
  };
}

function asDeviceLinkInfo(value: unknown): DeviceLinkInfo | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Partial<DeviceLinkInfo>;
  if (typeof row.id !== 'string' || !row.id) return null;
  const states = ['pending', 'approved', 'active', 'linked', 'expired', 'revoked'] as const;
  return {
    id: row.id,
    userId: typeof row.userId === 'string' ? row.userId : null,
    name: typeof row.name === 'string' ? row.name : 'Gerät',
    kind: typeof row.kind === 'string' ? row.kind : 'web',
    userAgent: typeof row.userAgent === 'string' ? row.userAgent : '',
    state: states.includes(row.state as (typeof states)[number]) ? (row.state as DeviceLinkInfo['state']) : 'pending',
    createdAt: typeof row.createdAt === 'string' ? row.createdAt : '',
    expiresAt: typeof row.expiresAt === 'string' ? row.expiresAt : '',
    approvedAt: typeof row.approvedAt === 'string' ? row.approvedAt : null,
    consumedAt: typeof row.consumedAt === 'string' ? row.consumedAt : null,
    revokedAt: typeof row.revokedAt === 'string' ? row.revokedAt : null,
    lastSeenAt: typeof row.lastSeenAt === 'string' ? row.lastSeenAt : null,
    sessionId: typeof row.sessionId === 'string' ? row.sessionId : null,
  };
}

/** Read the account-wide onboarding and appearance settings. */
export async function fetchServerPreferences(token: string | null): Promise<UserPreferences | null> {
  if (!token) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await request('/v1/auth/preferences', { method: 'GET', signal: controller.signal }, token);
    if (!response.ok) return null;
    const payload = (await response.json().catch(() => ({}))) as { preferences?: unknown };
    return asUserPreferences(payload.preferences);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Push the phone's completion and appearance choices for the next device. */
export async function saveServerPreferences(
  token: string | null,
  preferences: Partial<Omit<UserPreferences, 'updatedAt'>>,
): Promise<UserPreferences | null> {
  if (!token) return null;
  try {
    const response = await request('/v1/auth/preferences', {
      method: 'POST',
      body: JSON.stringify(preferences),
    }, token);
    if (!response.ok) return null;
    const payload = (await response.json().catch(() => ({}))) as { preferences?: unknown };
    return asUserPreferences(payload.preferences);
  } catch {
    return null;
  }
}
/** Create the browser pairing shown as a QR code. This call is unauthenticated. */
export async function startDeviceLink(name?: string): Promise<DeviceLinkStart> {
  let response: Response;
  try {
    response = await request('/v1/auth/devices/start', {
      method: 'POST',
      body: JSON.stringify({ name: name ?? null }),
    });
  } catch {
    throw new Error('server_unreachable');
  }
  if (!response.ok) throw await failure(response, 'device_link_failed');
  const payload = (await response.json().catch(() => ({}))) as { link?: Partial<DeviceLinkStart> };
  const link = payload.link;
  if (!link || typeof link.token !== 'string' || !link.token) throw new Error('device_link_unexpected');
  return {
    id: typeof link.id === 'string' ? link.id : '',
    token: link.token,
    name: typeof link.name === 'string' ? link.name : '',
    expiresAt: typeof link.expiresAt === 'string' ? link.expiresAt : '',
    state: 'pending',
    pairingUrl: typeof link.pairingUrl === 'string' ? link.pairingUrl : '',
  };
}

/** The web screen polls until the authenticated phone approves the QR code. */
export async function pollDeviceLink(token: string): Promise<DevicePollResult> {
  let response: Response;
  try {
    response = await request('/v1/auth/devices/poll', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  } catch {
    throw new Error('server_unreachable');
  }
  if (!response.ok) throw await failure(response, 'device_link_failed');
  const payload = (await response.json().catch(() => ({}))) as { status?: unknown; session?: unknown; device?: unknown };
  if (payload.status !== 'approved') return { status: 'pending' };
  const session = asAuthSession(payload.session);
  const device = asDeviceLinkInfo(payload.device);
  if (!session || !device) throw new Error('device_link_unexpected');
  return { status: 'approved', session, device };
}

/** Called by the authenticated phone after it scans the QR code. */
export async function approveDeviceLink(
  token: string,
  phoneToken: string | null,
  name?: string,
  preferences?: Partial<Omit<UserPreferences, 'updatedAt'>>,
): Promise<DeviceLinkInfo | null> {
  if (!phoneToken) throw new Error('unauthorized');
  let response: Response;
  try {
    response = await request(
      '/v1/auth/devices/approve',
      { method: 'POST', body: JSON.stringify({ token, name: name ?? null, preferences: preferences ?? null }) },
      phoneToken,
    );
  } catch {
    throw new Error('server_unreachable');
  }
  if (response.status === 401) throw new Error('unauthorized');
  if (!response.ok) throw await failure(response, 'device_link_failed');
  const payload = (await response.json().catch(() => ({}))) as { device?: unknown };
  return asDeviceLinkInfo(payload.device);
}

export async function fetchUserDevices(token: string | null): Promise<DeviceLinkInfo[]> {
  if (!token) return [];
  try {
    const response = await request('/v1/auth/devices', { method: 'GET' }, token);
    if (!response.ok) return [];
    const payload = (await response.json().catch(() => ({}))) as { devices?: unknown };
    return Array.isArray(payload.devices) ? payload.devices.flatMap((item) => {
      const device = asDeviceLinkInfo(item);
      return device ? [device] : [];
    }) : [];
  } catch {
    return [];
  }
}

export async function revokeServerDevice(token: string | null, deviceId: string): Promise<boolean> {
  if (!token) return false;
  try {
    const response = await request(`/v1/auth/devices/${encodeURIComponent(deviceId)}`, { method: 'DELETE' }, token);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * The QR payload is `universityassistant://device-link?token=…`. Only the
 * pairing token is accepted; the server address always comes from this app's
 * own configuration so a crafted QR code cannot redirect the bearer token.
 */
export function deviceTokenFromScan(data: string): string | null {
  const text = String(data ?? '').trim();
  if (!text) return null;
  const match = /[?&]token=([^&\s]+)/.exec(text);
  let candidate = match ? match[1] : text;
  if (match) {
    try {
      candidate = decodeURIComponent(candidate);
    } catch {
      return null;
    }
  }
  return /^[A-Za-z0-9_-]{20,200}$/.test(candidate) ? candidate : null;
}

/** `null` means the server could not be asked; `{ unauthorized: true }` means the token is dead. */
export async function fetchSessionUser(
  token: string,
): Promise<{ user: UserAccount; sessionId: string; expiresAt: string } | { unauthorized: true } | null> {
  let response: Response;
  try {
    response = await request('/v1/auth/me', { method: 'GET' }, token);
  } catch {
    return null;
  }
  if (response.status === 401) return { unauthorized: true };
  if (!response.ok) return null;
  const payload = (await response.json().catch(() => ({}))) as {
    user?: unknown;
    session?: { id?: unknown; expiresAt?: unknown };
  };
  const user = asUserAccount(payload.user);
  if (!user) return null;
  return {
    user,
    sessionId: typeof payload.session?.id === 'string' ? payload.session.id : '',
    expiresAt: typeof payload.session?.expiresAt === 'string' ? payload.session.expiresAt : '',
  };
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
