import { useCallback, useMemo } from 'react';

import { signInWithCampusToken, submitBrowserCredentials } from '@/src/auth/campus';
import { createServerSession, fetchSessionUser, getActiveAuthToken, readAuthToken, type AuthSession } from '@/src/auth/session';
import { clearCampusHarvest, readCampusHarvest } from '@/src/auth/vault';
import type { CampusSignInProfile } from '@/src/state/app-context';
import type { PersistedState, UserAccount } from '@/src/types';

interface SessionResumeDeps {
  state: PersistedState;
  establish: (session: AuthSession, extra?: Partial<PersistedState>) => void;
  adopt: (token: string, user: UserAccount, sessionId: string) => void;
  clearLocalSession: () => Promise<void>;
  applyCampusProfile: (profile: CampusSignInProfile) => void;
}

/**
 * Foreground renewal. `SessionRefresh` calls `refreshOrReauthenticate` on every
 * resume: a live token is adopted, a rejected one triggers the silent re-login,
 * and an unreachable server leaves the cached session alone.
 */
export function useSessionResume({
  state,
  establish,
  adopt,
  clearLocalSession,
  applyCampusProfile,
}: SessionResumeDeps): { refreshOrReauthenticate: () => Promise<boolean> } {
  const { sessionMode, sessionAccount, sessionName, sessionEmail } = state;

  /**
   * Re-establish the app session without UI. Demo and local accounts can be
   * minted from the stored account. C@MPUS re-submits the last portal session
   * the server accepted; that is the same validation the browser login does,
   * so the server mints a fresh app session for the same account. OIDC has no
   * reusable credential and returns `failed`.
   */
  const relogin = useCallback(async (): Promise<'ok' | 'failed' | 'unreachable'> => {
    if (!sessionMode || !sessionAccount) return 'failed';
    if (sessionMode === 'demo' || sessionMode === 'local') {
      try {
        const session = await createServerSession({ mode: sessionMode, account: sessionAccount, name: sessionName, email: sessionEmail });
        establish(session);
        return 'ok';
      } catch (caught) {
        return caught instanceof Error && caught.message === 'server_unreachable' ? 'unreachable' : 'failed';
      }
    }
    if (sessionMode === 'campus') {
      const harvest = await readCampusHarvest();
      if (!harvest) return 'failed';
      try {
        const validated = await submitBrowserCredentials(harvest);
        if (!validated.ticket) return 'failed';
        applyCampusProfile(await signInWithCampusToken(validated.ticket));
        return 'ok';
      } catch (caught) {
        const code = caught instanceof Error ? caught.message : '';
        // A network failure keeps the session and the harvest for the next
        // resume. A rejected harvest is gone for good; an upstream 5xx keeps
        // it in case the portal recovers.
        if (code === 'server_unreachable') return 'unreachable';
        if (code !== 'campus_failed') await clearCampusHarvest();
        return 'failed';
      }
    }
    return 'failed';
  }, [applyCampusProfile, establish, sessionAccount, sessionEmail, sessionMode, sessionName]);

  const refreshOrReauthenticate = useCallback(async (): Promise<boolean> => {
    const token = getActiveAuthToken() ?? (await readAuthToken());
    if (!token) {
      // Signed out, or the vault lost the token while the account record is
      // still cached (offline launch). Try the silent path once; if it fails,
      // keep the cached account rather than dropping it for good.
      return sessionAccount ? (await relogin()) === 'ok' : false;
    }
    const result = await fetchSessionUser(token);
    if (result && 'user' in result) {
      adopt(token, result.user, result.sessionId);
      return true;
    }
    if (result && 'unauthorized' in result) {
      const restored = await relogin();
      // Only a definitive rejection drops the account; an unreachable server
      // leaves the cached session for the next resume.
      if (restored === 'failed') await clearLocalSession();
      return restored === 'ok';
    }
    return true;
  }, [adopt, clearLocalSession, relogin, sessionAccount]);

  return useMemo(() => ({ refreshOrReauthenticate }), [refreshOrReauthenticate]);
}
