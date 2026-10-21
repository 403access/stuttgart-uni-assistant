import { useCallback } from 'react';

import { endUniversitySession } from '@/src/auth/oidc';
import { clearLogin } from '@/src/auth/vault';
import { useAppSelector, appActions } from '@/src/state/AppState';

/**
 * The full sign-out path used by the account and campus screens: end the IdP
 * session when signed in through SIAM, clear the device vault, then clear the
 * app session. Kept in one place so both entry points cannot drift.
 */
export function useLeaveSession(): () => Promise<void> {
  const sessionMode = useAppSelector((state) => state.sessionMode);
  const oidcSessionId = useAppSelector((state) => state.oidcSessionId);
  const { signOut } = appActions;
  return useCallback(async () => {
    if (sessionMode === 'oidc') await endUniversitySession(oidcSessionId);
    await clearLogin();
    signOut();
  }, [sessionMode, oidcSessionId, signOut]);
}
