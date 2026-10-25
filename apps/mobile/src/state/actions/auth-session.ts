import { clearMailCache } from '@/src/auth/mail';
import {
  clearAuthSession,
  fetchSessionUser,
  logoutServerSession,
  readAuthSessionId,
  readAuthToken,
  saveAuthSessionId,
  saveAuthToken,
  setActiveAuthToken,
  type AuthSession,
} from '@/src/auth/session';
import { clearCampusHarvest } from '@/src/auth/vault';
import { clearQuizSyncQueue } from '@/src/quiz/remote';
import { getAppState, patchApp } from '@ua/core/state/app-store';
import { sessionFields } from '@ua/core/state/persisted';
import type { PersistedState, UserAccount } from '@ua/core/domain/types';

const signedOutFields = {
  user: null,
  sessionAccount: null,
  sessionMode: null,
  sessionName: null,
  sessionEmail: null,
  sessionSubject: null,
  mailAccount: null,
  oidcSessionId: null,
} satisfies Partial<PersistedState>;

/** Persist a server session from any sign-in route. */
export function establishAuthSession(session: AuthSession, extra: Partial<PersistedState> = {}): void {
  const sessionId = session.sessionId || null;
  setActiveAuthToken(session.token);
  void saveAuthToken(session.token);
  void saveAuthSessionId(sessionId);
  patchApp({
    ...sessionFields(session.user),
    ...extra,
    authToken: session.token,
    authSessionId: sessionId,
  });
}

/** Adopt a token that `/v1/auth/me` just confirmed. */
export function adoptAuthSession(token: string, user: UserAccount, sessionId: string): void {
  setActiveAuthToken(token);
  void saveAuthSessionId(sessionId || null);
  patchApp({
    ...sessionFields(user),
    authToken: token,
    authSessionId: sessionId || null,
  });
}

/** Drop this device's session after the server rejected it and no re-login worked. */
export async function clearLocalSession(): Promise<void> {
  await clearAuthSession();
  await clearQuizSyncQueue();
  void clearMailCache();
  setActiveAuthToken(null);
  patchApp({ ...signedOutFields, authToken: null, authSessionId: null });
}

export function signOut(): void {
  const { authToken } = getAppState();
  void logoutServerSession(authToken);
  void clearAuthSession();
  void clearCampusHarvest();
  void clearMailCache();
  void clearQuizSyncQueue();
  setActiveAuthToken(null);
  patchApp({
    ...signedOutFields,
    authToken: null,
    authSessionId: null,
    curriculumNodes: [],
    curriculumStudyId: null,
    campusStudies: [],
    activeStudyId: null,
  });
}

/**
 * Restore the device vault on launch. A rejected token is deliberately kept:
 * `SessionRefresh` gets one silent re-login attempt before anything is dropped.
 */
export async function restoreAuthSession(isActive: () => boolean = () => true): Promise<void> {
  const [token, sessionId] = await Promise.all([readAuthToken(), readAuthSessionId()]);
  if (!isActive() || !token) return;
  setActiveAuthToken(token);
  patchApp({ authToken: token, authSessionId: sessionId });
  const result = await fetchSessionUser(token);
  if (!isActive() || !result || !('user' in result)) return;
  if (result.sessionId) void saveAuthSessionId(result.sessionId);
  patchApp({
    ...sessionFields(result.user),
    ...(result.sessionId ? { authSessionId: result.sessionId } : {}),
  });
}
