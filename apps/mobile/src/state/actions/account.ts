import { clearMailCache } from '@/src/auth/mail';
import { getActiveAuthToken, linkServerPlatform, syncServerPlatform, unlinkServerPlatform } from '@/src/auth/session';
import { findPlatform } from '@/src/auth/user';
import { refreshOrReauthenticate } from '@/src/state/actions/session-resume';
import { updateApp } from '@/src/state/app-store';
import type { AccountPlatformId, PlatformLinkStatus } from '@/src/types';

/** Account-level server calls: refresh the profile, link, sync, and unlink platforms. */
export async function refreshUser(): Promise<void> {
  await refreshOrReauthenticate();
}

export async function linkAccount(
  platform: AccountPlatformId,
  account: string | null,
  status: PlatformLinkStatus = 'connected',
  source = 'client',
): Promise<void> {
  const user = await linkServerPlatform(getActiveAuthToken(), platform, account, status, source);
  if (!user) return;
  updateApp((current) => ({
    ...current,
    user,
    mailAccount: platform === 'mail' ? account : (current.mailAccount ?? findPlatform(user, 'mail')?.account ?? null),
  }));
}

export async function syncAccount(platform: AccountPlatformId): Promise<void> {
  const user = await syncServerPlatform(getActiveAuthToken(), platform);
  if (!user) return;
  updateApp((current) => ({
    ...current,
    user,
    syncAt: platform === 'mail' ? current.syncAt : { ...current.syncAt, [platform]: new Date().toISOString() },
  }));
}

export async function unlinkAccount(platform: AccountPlatformId): Promise<void> {
  const user = await unlinkServerPlatform(getActiveAuthToken(), platform);
  if (!user) return;
  if (platform === 'mail') void clearMailCache();
  updateApp((current) => ({ ...current, user, mailAccount: platform === 'mail' ? null : current.mailAccount }));
}
