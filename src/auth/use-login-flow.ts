import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';

import { assistantUrl } from '@/src/assistant/remote';
import { campusDetail, fetchCampusStatus, signInWithCampusToken, submitBrowserCredentials } from '@/src/auth/campus';
import { campusMessage, messageFor } from '@/src/auth/login-messages';
import { fetchOidcStatus, signInWithUniversity, universityRedirectUri } from '@/src/auth/oidc';
import { useCampusBrowserLogin } from '@/src/auth/use-campus-browser-login';
import { useCampusHeadlessLogin } from '@/src/auth/use-campus-headless-login';
import { showFetchAlert } from '@/src/components/fetch-alert';
import { keys } from '@/src/query/keys';
import { useApp } from '@/src/state/AppState';
import { tx } from '@/src/text';

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
  const { locale, signInCampus, signInOidc } = useApp();
  // The status probes resolve to null when the server is unreachable — the
  // screen renders unknown, not an error toast.
  const status = useQuery({ queryKey: keys.oidcStatus(), queryFn: () => fetchOidcStatus() }).data ?? null;
  const campusStatus = useQuery({ queryKey: keys.campusStatus(), queryFn: () => fetchCampusStatus() }).data ?? null;
  const [error, setError] = useState('');
  const [campusLog, setCampusLog] = useState('');
  // One flag for both browser surfaces: they share the harvest mutation.
  const [harvestBusy, setHarvestBusy] = useState(false);
  const redirectUri = universityRedirectUri();

  // Sign-ins as mutations: the retry toast targets `mutate`, pending states come
  // from `isPending`, and the message/toast handling lives in the hooks. Both
  // browser modes submit through `submitHarvest`, which raises the busy flag of
  // the surface that is waiting.
  const browserHarvest = useMutation({
    mutationKey: ['campus-browser-harvest'],
    mutationFn: (harvest: { cookies: string; storage: Record<string, string> }) => submitBrowserCredentials(harvest),
    onMutate: () => browser.setError(''),
    onSuccess: (result) => {
      // Deliberately do not close the waiting view here. The session is not set
      // until the profile loads, and hiding it now would flash the login screen
      // between the wait and the home tabs.
      headless.setPhase('profile');
      setCampusLog(
        tx(
          locale,
          `Browser-Anmeldung übernommen (${result.studies} Studiengänge). Lade Profil …`,
          `Browser sign-in adopted (${result.studies} studies). Loading profile …`,
        ),
      );
      campusSignIn.mutate();
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
  const headless = useCampusHeadlessLogin({ locale, onHarvest: submitHarvest });

  const campusSignIn = useMutation({
    mutationKey: ['campus-sign-in'],
    mutationFn: signInWithCampusToken,
    onMutate: () => {
      setError('');
      setCampusLog(tx(locale, `Rufe ${assistantUrl}/v1/campus/login auf …`, `Calling ${assistantUrl}/v1/campus/login …`));
    },
    onSuccess: (profile) => {
      const names = profile.studies.map((item) => item.name).join(', ');
      setCampusLog(
        tx(
          locale,
          `Angemeldet als ${profile.name} (${profile.account}). ${profile.nodes.length} Knoten, ${profile.studies.length} ${profile.studies.length === 1 ? 'Studiengang' : 'Studiengänge'}: ${names}.`,
          `Signed in as ${profile.name} (${profile.account}). ${profile.nodes.length} nodes, ${profile.studies.length} ${profile.studies.length === 1 ? 'study' : 'studies'}: ${names}.`,
        ),
      );
      // Deliberately no close() here: the session update and the navigation land
      // in the same tick, so hiding the waiting view now would render one frame
      // of the bare login screen. It stays up and disappears with this screen
      // when the gate swaps in the tabs.
      signInCampus(profile);
    },
    onError: (caught) => {
      const code = caught instanceof Error ? caught.message : 'campus_failed';
      const message = campusMessage(locale, code, campusDetail(caught));
      setCampusLog(message);
      setError(message);
      // A failed profile load has no session to move to, so the waiting views
      // give way to the screen with the retry.
      headless.close();
      browser.close();
      showFetchAlert(locale, {
        title: tx(locale, 'C@MPUS-Anmeldung fehlgeschlagen', 'C@MPUS sign-in failed'),
        code,
        detail: campusDetail(caught) || undefined,
        onRetry: () => campusSignIn.mutate(),
      });
    },
  });

  const siamSignIn = useMutation({
    mutationKey: ['siam-sign-in'],
    mutationFn: signInWithUniversity,
    onMutate: () => setError(''),
    onSuccess: (profile) => signInOidc(profile),
    onError: (caught) => {
      const code = caught instanceof Error ? caught.message : 'oidc_failed';
      setError(messageFor(locale, code, status));
    },
  });

  /** Both browser modes hand their harvest to the same mutation. */
  function submitHarvest(harvest: { cookies: string; storage: Record<string, string> }) {
    setHarvestBusy(true);
    browserHarvest.mutate(harvest);
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
