import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';

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
import { sessionFields } from '@/src/state/persisted';
import type { PersistedState, UserAccount } from '@/src/types';

export interface AuthSessionStore {
  authToken: string | null;
  authSessionId: string | null;
  /** Persist a server session from any sign-in route. */
  establish: (session: AuthSession, extra?: Partial<PersistedState>) => void;
  /** Adopt a token that `/v1/auth/me` just confirmed. */
  adopt: (token: string, user: UserAccount, sessionId: string) => void;
  /** Drop this device's session after the server rejected it and no re-login worked. */
  clearLocalSession: () => Promise<void>;
  signOut: () => void;
}

/**
 * The device side of the app session: the bearer token and the server session
 * id, their launch restore, and the local cleanup paths. Sign-in profiles live
 * in `use-sign-in.ts`; resume logic in `use-session-resume.ts`.
 */
export function useAuthSession({
  setState,
}: {
  setState: Dispatch<SetStateAction<PersistedState>>;
}): AuthSessionStore {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [authSessionId, setAuthSessionId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const [token, sessionId] = await Promise.all([readAuthToken(), readAuthSessionId()]);
      if (!active || !token) return;
      setAuthToken(token);
      setActiveAuthToken(token);
      setAuthSessionId(sessionId);
      const result = await fetchSessionUser(token);
      if (!active) return;
      if (result && 'unauthorized' in result) {
        // Keep the cached account for one resume attempt: `SessionRefresh`
        // re-establishes it without UI (demo/local or a saved C@MPUS harvest)
        // before anything is dropped.
        return;
      }
      if (result && 'user' in result) {
        if (result.sessionId) {
          setAuthSessionId(result.sessionId);
          void saveAuthSessionId(result.sessionId);
        }
        setState((current) => ({ ...current, ...sessionFields(result.user) }));
      }
    })().catch(() => undefined);
    return () => {
      active = false;
    };
  }, [setState]);

  const establish = useCallback(
    (session: AuthSession, extra: Partial<PersistedState> = {}) => {
      const sessionId = session.sessionId || null;
      setAuthToken(session.token);
      setActiveAuthToken(session.token);
      setAuthSessionId(sessionId);
      void saveAuthToken(session.token);
      void saveAuthSessionId(sessionId);
      setState((current) => ({ ...current, ...sessionFields(session.user), ...extra }));
    },
    [setState],
  );

  const adopt = useCallback(
    (token: string, user: UserAccount, sessionId: string) => {
      setAuthToken(token);
      setActiveAuthToken(token);
      setAuthSessionId(sessionId || null);
      void saveAuthSessionId(sessionId || null);
      setState((current) => ({ ...current, ...sessionFields(user) }));
    },
    [setState],
  );

  const clearLocalSession = useCallback(async () => {
    await clearAuthSession();
    void clearMailCache();
    setAuthToken(null);
    setActiveAuthToken(null);
    setAuthSessionId(null);
    setState((current) => ({
      ...current,
      user: null,
      sessionAccount: null,
      sessionMode: null,
      sessionName: null,
      sessionEmail: null,
      sessionSubject: null,
      mailAccount: null,
      oidcSessionId: null,
    }));
  }, [setState]);

  const signOut = useCallback(() => {
    void logoutServerSession(authToken);
    void clearAuthSession();
    void clearCampusHarvest();
    void clearMailCache();
    setAuthToken(null);
    setActiveAuthToken(null);
    setAuthSessionId(null);
    setState((current) => ({
      ...current,
      user: null,
      sessionAccount: null,
      sessionMode: null,
      sessionName: null,
      sessionEmail: null,
      sessionSubject: null,
      mailAccount: null,
      oidcSessionId: null,
      curriculumNodes: [],
      curriculumStudyId: null,
      campusStudies: [],
      activeStudyId: null,
    }));
  }, [authToken, setState]);

  return useMemo(
    () => ({ authToken, authSessionId, establish, adopt, clearLocalSession, signOut }),
    [authToken, authSessionId, establish, adopt, clearLocalSession, signOut],
  );
}
