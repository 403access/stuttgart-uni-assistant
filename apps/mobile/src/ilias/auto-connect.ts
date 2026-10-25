import { readLogin, storedLoginHint } from '@/src/auth/vault';
import { iliasAccountFrom } from '@/src/ilias/account';
import { connectIlias, fetchIliasStatus } from '@/src/ilias/api';
import type { IliasDashboard, IliasStatus } from '@/src/ilias/types';

/**
 * Re-establish the ILIAS session without UI.
 *
 * The assistant server keeps PHPSESSID in memory only, so every app launch and
 * every server restart loses the ILIAS session even though the C@MPUS session
 * survives. The app therefore reconnects in the background once the user is
 * signed in: a live session is left alone, otherwise the opt-in C@MPUS vault is
 * reused (the university password is the ILIAS password). An explicit
 * credential from the automated sign-in takes precedence, which is the one
 * moment the plain password is available without a biometric prompt.
 *
 * The promise never rejects; callers render the signed-in UI regardless.
 */

export interface EnsureIliasInput {
  /** Bearer token of the app session, so a fresh sign-in does not need the global one. */
  token?: string | null;
  /** Signed-in account or e-mail. A vault entry for a different account is ignored. */
  account?: string | null;
  /** Credential from the automated C@MPUS sign-in, held in memory only. */
  credentials?: { account: string; password: string };
  /** User-initiated reads may raise the biometric gate of the vault. */
  allowBiometrics?: boolean;
  /** Prompt shown if `allowBiometrics` unlocks the vault. */
  prompt?: string;
}

export interface EnsureIliasResult {
  connected: boolean;
  status: IliasStatus | null;
  dashboard: IliasDashboard | null;
  /** Error code when `connected` is false; empty when ILIAS simply was not set up. */
  reason: string;
}

/** Module-level lock: the gate, the login flow, and the tab share one attempt. */
interface IliasFlight {
  key: string;
  promise: Promise<EnsureIliasResult> | null;
}

let inFlight: IliasFlight | null = null;

function codeOf(caught: unknown): string {
  return caught instanceof Error ? caught.message || 'ilias_failed' : 'ilias_failed';
}

function sameAccount(left: string | null | undefined, right: string | null | undefined): boolean {
  const account = iliasAccountFrom(left).toLowerCase();
  const other = iliasAccountFrom(right).toLowerCase();
  return Boolean(account && other && account === other);
}

function result(connected: boolean, status: IliasStatus | null, dashboard: IliasDashboard | null, reason = ''): EnsureIliasResult {
  return { connected, status, dashboard, reason };
}

async function run(input: EnsureIliasInput): Promise<EnsureIliasResult> {
  // A session that survived (e.g. a foreground return) needs no credential.
  let status: IliasStatus | null = null;
  try {
    status = await fetchIliasStatus(input.token);
    if (status.sessionActive) return result(true, status, null);
  } catch (caught) {
    // Without the assistant server no credential can be proven either.
    return result(false, status, null, codeOf(caught));
  }

  const credential = input.credentials;
  if (credential?.account && credential.password) {
    try {
      const connected = await connectIlias({
        account: credential.account,
        password: credential.password,
        token: input.token,
      });
      return result(true, connected.status, connected.dashboard);
    } catch (caught) {
      return result(false, status, null, codeOf(caught));
    }
  }

  const hint = await storedLoginHint().catch(() => null);
  if (!hint) return result(false, status, null, 'ilias_credentials_missing');
  if (input.account && !sameAccount(hint.account, input.account)) {
    return result(false, status, null, 'ilias_credentials_missing');
  }
  // Background calls never raise a prompt: a biometric-gated entry is only
  // unlocked by an explicit user action (the ILIAS tab's saved-login button).
  if (hint.biometrics && !input.allowBiometrics) {
    return result(false, status, null, 'ilias_credentials_missing');
  }
  const stored = await readLogin(input.prompt ?? 'ILIAS', hint.biometrics && Boolean(input.allowBiometrics));
  if (!stored) return result(false, status, null, 'ilias_credentials_missing');
  if (input.account && !sameAccount(stored.account, input.account)) {
    return result(false, status, null, 'ilias_credentials_missing');
  }

  try {
    const connected = await connectIlias({
      account: iliasAccountFrom(stored.account),
      password: stored.password,
      token: input.token,
    });
    return result(true, connected.status, connected.dashboard);
  } catch (caught) {
    return result(false, status, null, codeOf(caught));
  }
}

/**
 * Connect ILIAS once for the current app session. Concurrent callers share one
 * attempt; a call with a different purpose waits for the running attempt and
 * then re-evaluates, so a credential connect is never replaced by a vault read.
 */
export function ensureIliasSession(input: EnsureIliasInput = {}): Promise<EnsureIliasResult> {
  const key = `${input.token ?? ''}|${iliasAccountFrom(input.account)}|${input.credentials ? 'credentials' : 'vault'}`;
  if (inFlight?.key === key && inFlight.promise) return inFlight.promise;
  if (inFlight?.promise) return inFlight.promise.then(() => ensureIliasSession(input));

  const current: IliasFlight = { key, promise: null };
  inFlight = current;
  const promise = run(input).finally(() => {
    if (inFlight === current) inFlight = null;
  });
  current.promise = promise;
  return promise;
}
