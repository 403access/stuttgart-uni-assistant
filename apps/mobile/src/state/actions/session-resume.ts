import { signInWithCampusToken, submitBrowserCredentials } from '@/src/auth/campus';
import { createServerSession, fetchSessionUser, getActiveAuthToken, readAuthToken } from '@/src/auth/session';
import { clearCampusHarvest, readCampusHarvest } from '@/src/auth/vault';
import { adoptAuthSession, clearLocalSession, establishAuthSession } from '@/src/state/actions/auth-session';
import { signInCampus } from '@/src/state/actions/sign-in';
import { getAppState } from '@ua/core/state/app-store';

/**
 * Re-establish the app session without UI. Demo and local accounts can be
 * minted from the stored account. C@MPUS re-submits the last portal session
 * the server accepted; that is the same validation the browser login does,
 * so the server mints a fresh app session for the same account. OIDC has no
 * reusable credential and returns `failed`.
 */
async function relogin(): Promise<'ok' | 'failed' | 'unreachable'> {
  const { sessionMode, sessionAccount, sessionName, sessionEmail } = getAppState();
  if (!sessionMode || !sessionAccount) return 'failed';
  if (sessionMode === 'demo' || sessionMode === 'local') {
    try {
      const session = await createServerSession({ mode: sessionMode, account: sessionAccount, name: sessionName, email: sessionEmail });
      establishAuthSession(session);
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
      signInCampus(await signInWithCampusToken(validated.ticket));
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
}

/**
 * Foreground renewal. `SessionRefresh` calls this on every resume: a live token
 * is adopted, a rejected one triggers the silent re-login, and an unreachable
 * server leaves the cached session alone.
 *
 * Resumes are broadcast to more than one listener (the global `SessionRefresh`
 * and the ILIAS tab), so concurrent calls share one probe instead of racing the
 * same token against the server twice.
 */
export function refreshOrReauthenticate(): Promise<boolean> {
  inFlight ??= runRefresh().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

let inFlight: Promise<boolean> | null = null;

async function runRefresh(): Promise<boolean> {
  const { sessionAccount } = getAppState();
  const token = getActiveAuthToken() ?? (await readAuthToken());
  if (!token) {
    // Signed out, or the vault lost the token while the account record is
    // still cached (offline launch). Try the silent path once; if it fails,
    // keep the cached account rather than dropping it for good.
    return sessionAccount ? (await relogin()) === 'ok' : false;
  }
  const result = await fetchSessionUser(token);
  if (result && 'user' in result) {
    adoptAuthSession(token, result.user, result.sessionId);
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
}
