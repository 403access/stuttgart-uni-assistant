import { useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';

import { assistantUrl } from '@/src/assistant/remote';
import { campusDetail, fetchCampusStatus, signInWithCampusToken, submitBrowserCredentials } from '@/src/auth/campus';
import { campusMessage, messageFor } from '@/src/auth/login-messages';
import { fetchMailStatus, mailDetail, mailMessage, submitMailCredentials } from '@/src/auth/mail';
import { fetchOidcStatus, signInWithUniversity, universityRedirectUri } from '@/src/auth/oidc';
import { useCampusBrowserLogin } from '@/src/auth/use-campus-browser-login';
import { useCampusHeadlessLogin } from '@/src/auth/use-campus-headless-login';
import { saveCampusHarvest } from '@/src/auth/vault';
import { showFetchAlert } from '@/src/components/fetch-alert';
import { showToast } from '@ua/ui';
import { ensureIliasSession } from '@/src/ilias/auto-connect';
import { keys } from '@/src/query/keys';
import { useAppSelector, appActions } from '@/src/state/AppState';
import { tx } from '@/src/text';

/**
 * The mail server stores the short account id (`st123456`); the sign-in form may
 * carry the long e-mail form (`st123456@stud.uni-stuttgart.de`). Both name the
 * same mailbox, so a connected account with either form is already this one.
 */
function sameAccount(stored: string | null, entered: string): boolean {
  if (!stored) return false;
  const account = stored.trim().toLowerCase();
  const value = entered.trim().toLowerCase();
  return account === value || account === value.split('@')[0];
}

/**
 * Everything the sign-in screen needs that is not layout: the two status
 * probes, the visible and the hidden browser flows, and the three mutations
 * behind them. The screen renders; this hook owns the state and the order the
 * steps run in.
 *
 * The deprecated `app/login-legacy.tsx` keeps its own copy of this wiring on
 * purpose — it is frozen, and this hook is where the live flow is maintained.
 */
export function useLoginFlow() {
  const locale = useAppSelector((state) => state.locale);
  const { signInCampus, signInOidc, setMailAccount, refreshUser } = appActions;
  // The status probes resolve to null when the server is unreachable — the
  // screen renders unknown, not an error toast.
  const status = useQuery({ queryKey: keys.oidcStatus(), queryFn: () => fetchOidcStatus() }).data ?? null;
  const campusStatus = useQuery({ queryKey: keys.campusStatus(), queryFn: () => fetchCampusStatus() }).data ?? null;
  const [error, setError] = useState('');
  const [campusLog, setCampusLog] = useState('');
  // One flag for both browser surfaces: they share the harvest mutation.
  const [harvestBusy, setHarvestBusy] = useState(false);
  // A validated harvest is handed to the login route by a short-lived ticket.
  const ticketRef = useRef<string | null>(null);
  // Credentials of the automated sign-in, held only for this attempt: the C@MPUS
  // st-account and password are the UniMail ones, so a successful sign-in reuses
  // them for the Messages tab instead of asking for them twice. Null when the
  // visible browser produced the session (there the password never reaches the app).
  const loginCredentials = useRef<{ account: string; password: string } | null>(null);
  const redirectUri = universityRedirectUri();

  // Sign-ins as mutations: the retry toast targets `mutate`, pending states come
  // from `isPending`, and the message/toast handling lives in the hooks. Both
  // browser modes submit through `submitHarvest`, which raises the busy flag of
  // the surface that is waiting.
  const browserHarvest = useMutation({
    mutationKey: ['campus-browser-harvest'],
    mutationFn: (harvest: { cookies: string; storage: Record<string, string> }) => submitBrowserCredentials(harvest),
    onMutate: () => browser.setError(''),
    onSuccess: (result, harvest) => {
      // Keep the portal session the server just accepted: when the app session
      // expires, `AppState` re-submits this harvest instead of asking again.
      void saveCampusHarvest(harvest);
      // Deliberately do not close the waiting view here. The session is not set
      // until the profile loads, and hiding it now would flash the login screen
      // between the wait and the home tabs.
      headless.setPhase('profile');
      ticketRef.current = result.ticket ?? null;
      setCampusLog(
        tx(locale, 'common.browser', [result.studies]),
      );
      campusSignIn.mutate(result.ticket);
    },
    onError: (caught) => {
      const code = caught instanceof Error ? caught.message : 'campus_failed';
      const message = campusMessage(locale, code, campusDetail(caught));
      browser.setError(message);
      setCampusLog(message);
      setError(message);
    },
    onSettled: () => setHarvestBusy(false),
  });

  const browser = useCampusBrowserLogin({ locale, busy: harvestBusy, onHarvest: submitHarvest });
  const headless = useCampusHeadlessLogin({ locale, onHarvest: submitHeadlessHarvest });

  const campusSignIn = useMutation({
    mutationKey: ['campus-sign-in'],
    mutationFn: (ticket?: string) => signInWithCampusToken(ticket),
    onMutate: () => {
      setError('');
      setCampusLog(tx(locale, 'common.rufe', [assistantUrl]));
    },
    onSuccess: (profile) => {
      const names = profile.studies.map((item) => item.name).join(', ');
      setCampusLog(
        tx(locale, 'common.angemeldet', [profile.name, profile.account, profile.nodes.length, profile.studies.length, profile.studies.length === 1 ? 'Studiengang' : 'Studiengänge', names]),
      );
      // Deliberately no close() here: the session update and the navigation land
      // in the same tick, so hiding the waiting view now would render one frame
      // of the bare login screen. It stays up and disappears with this screen
      // when the gate swaps in the tabs.
      signInCampus(profile);
      ticketRef.current = null;
      // The st-account and password work for UniMail and ILIAS too; connect
      // both so the Messages and ILIAS tabs are ready. The mutation above is
      // not held up by either. The visible-browser path has no password here,
      // so ILIAS falls back to the opt-in device vault.
      const credentials = loginCredentials.current;
      const token = profile.auth?.token ?? null;
      if (credentials) void connectMail(credentials, token);
      void connectIliasAccount(credentials, token, profile.account);
    },
    onError: (caught) => {
      const code = caught instanceof Error ? caught.message : 'campus_failed';
      const message = campusMessage(locale, code, campusDetail(caught));
      setCampusLog(message);
      setError(message);
      // The login route consumes a ticket before it reads the portal, so a
      // failed read needs a fresh harvest, not the same ticket again.
      ticketRef.current = null;
      // A failed profile load has no session to move to, so the waiting views
      // give way to the screen with the retry.
      headless.close();
      browser.close();
      showFetchAlert(locale, {
        title: tx(locale, 'common.c'),
        code,
        detail: campusDetail(caught) || undefined,
        onRetry: () => campusSignIn.mutate(ticketRef.current ?? undefined),
      });
    },
  });

  const siamSignIn = useMutation({
    mutationKey: ['siam-sign-in'],
    mutationFn: signInWithUniversity,
    onMutate: () => setError(''),
    onSuccess: (profile) => {
      signInOidc(profile);
      // OIDC does not hand the app a C@MPUS password. The opt-in vault can
      // still reconnect ILIAS in the background when it belongs to this account.
      void ensureIliasSession({
        token: profile.auth?.token ?? null,
        account: profile.email || profile.account,
      }).then((result) => {
        if (result.connected) void refreshUser();
      });
    },
    onError: (caught) => {
      const code = caught instanceof Error ? caught.message : 'oidc_failed';
      setError(messageFor(locale, code, status));
    },
  });

  /**
   * Both browser modes submit to the same harvest mutation, but only the
   * automated one holds the credential on the device. Capturing it here — tied
   * to the harvest that is actually adopted — keeps the visible browser's
   * session from reusing an earlier form entry.
   */
  function submitHarvest(harvest: { cookies: string; storage: Record<string, string> }) {
    loginCredentials.current = null;
    setHarvestBusy(true);
    browserHarvest.mutate(harvest);
  }

  function submitHeadlessHarvest(harvest: { cookies: string; storage: Record<string, string> }) {
    const account = headless.creds.account.trim();
    loginCredentials.current = account && headless.creds.password ? { account, password: headless.creds.password } : null;
    setHarvestBusy(true);
    browserHarvest.mutate(harvest);
  }

  /**
   * Reuse the C@MPUS credential for UniMail: the assistant server proves the same
   * st-account and password against the TIK IMAP host and keeps the pair in
   * process memory, so the Messages tab is connected without a second entry.
   * Best effort — the sign-in neither waits for it nor fails with it.
   */
  async function connectMail(credentials: { account: string; password: string }, token: string | null) {
    try {
      const current = await fetchMailStatus();
      if (current?.configured && sameAccount(current.account, credentials.account)) {
        void refreshUser();
        return;
      }
      const result = await submitMailCredentials(credentials, token);
      setMailAccount(result.account);
      void refreshUser();
      showToast({
        tone: 'success',
        title: tx(locale, 'tabsMail.verbunden_2', [result.account]),
        message: tx(locale, 'loginMail.verbunden'),
      });
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : 'mail_failed';
      showToast({
        tone: 'error',
        title: tx(locale, 'loginMail.fehlgeschlagen'),
        message: mailMessage(locale, code, mailDetail(caught)),
      });
    }
  }

  /**
   * Reuse the C@MPUS credential for ILIAS: the same university password, with
   * the login name being the address before the `@` (`st206509@stud.uni-stuttgart.de`
   * → `st206509`). The assistant server performs the form login once and keeps
   * only the resulting PHPSESSID, so the ILIAS tab and the onboarding preview
   * open already connected. When the visible browser produced the session there
   * is no password in memory; `ensureIliasSession` then uses the device vault.
   * Best effort — the sign-in neither waits for it nor fails with it.
   */
  async function connectIliasAccount(
    credentials: { account: string; password: string } | null,
    token: string | null,
    account: string,
  ) {
    const result = await ensureIliasSession({
      token,
      account: credentials?.account ?? account,
      credentials: credentials ?? undefined,
    });
    if (result.connected) void refreshUser();
  }

  const busy = campusSignIn.isPending || siamSignIn.isPending;

  return {
    status,
    campusStatus,
    error,
    setError,
    campusLog,
    harvestBusy,
    browser,
    headless,
    campusSignIn,
    siamSignIn,
    busy,
    redirectUri,
  };
}
