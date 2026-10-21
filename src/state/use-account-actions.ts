import { useCallback, useMemo, type Dispatch, type SetStateAction } from 'react';

import { clearMailCache } from '@/src/auth/mail';
import { getActiveAuthToken, linkServerPlatform, syncServerPlatform, unlinkServerPlatform } from '@/src/auth/session';
import { findPlatform } from '@/src/auth/user';
import type { AccountPlatformId, PersistedState, PlatformLinkStatus } from '@/src/types';

export interface AccountActions {
  refreshUser: () => Promise<void>;
  linkAccount: (platform: AccountPlatformId, account: string | null, status?: PlatformLinkStatus, source?: string) => Promise<void>;
  syncAccount: (platform: AccountPlatformId) => Promise<void>;
  unlinkAccount: (platform: AccountPlatformId) => Promise<void>;
}

interface AccountDeps {
  setState: Dispatch<SetStateAction<PersistedState>>;
  refreshOrReauthenticate: () => Promise<boolean>;
}

/** Account-level server calls: refresh the profile, link, sync, and unlink platforms. */
export function useAccountActions({ setState, refreshOrReauthenticate }: AccountDeps): AccountActions {
  const refreshUser = useCallback(async () => {
    await refreshOrReauthenticate();
  }, [refreshOrReauthenticate]);

  const linkAccount = useCallback(
    async (platform: AccountPlatformId, account: string | null, status: PlatformLinkStatus = 'connected', source = 'client') => {
      const user = await linkServerPlatform(getActiveAuthToken(), platform, account, status, source);
      if (!user) return;
      setState((current) => ({
        ...current,
        user,
        mailAccount: platform === 'mail' ? account : current.mailAccount ?? findPlatform(user, 'mail')?.account ?? null,
      }));
    },
    [setState],
  );

  const syncAccount = useCallback(
    async (platform: AccountPlatformId) => {
      const user = await syncServerPlatform(getActiveAuthToken(), platform);
      if (!user) return;
      setState((current) => ({
        ...current,
        user,
        syncAt: platform === 'mail' ? current.syncAt : { ...current.syncAt, [platform]: new Date().toISOString() },
      }));
    },
    [setState],
  );

  const unlinkAccount = useCallback(
    async (platform: AccountPlatformId) => {
      const user = await unlinkServerPlatform(getActiveAuthToken(), platform);
      if (!user) return;
      if (platform === 'mail') void clearMailCache();
      setState((current) => ({ ...current, user, mailAccount: platform === 'mail' ? null : current.mailAccount }));
    },
    [setState],
  );

  return useMemo(
    () => ({ refreshUser, linkAccount, syncAccount, unlinkAccount }),
    [refreshUser, linkAccount, syncAccount, unlinkAccount],
  );
}
