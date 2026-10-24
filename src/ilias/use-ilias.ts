import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { getActiveAuthToken } from '@/src/auth/session';
import { showToast } from '@/src/components/toast';
import { useAppStateChange } from '@/src/hooks/use-app-state-change';
import { disconnectIlias, fetchIliasStatus, IliasError, loadIliasDashboard } from '@/src/ilias/api';
import { ensureIliasSession } from '@/src/ilias/auto-connect';
import { iliasErrorMessage as describe } from '@/src/ilias/errors';
import type { IliasDashboard, IliasStatus } from '@/src/ilias/types';
import { useAppSelector, appActions } from '@/src/state/AppState';
import { tx } from '@/src/text';

/** Owns the automatically restored ILIAS session and its dashboard rows. */
export function useIlias() {
  const locale = useAppSelector((state) => state.locale);
  const authToken = useAppSelector((state) => state.authToken);
  const sessionAccount = useAppSelector((state) => state.sessionAccount);
  const sessionEmail = useAppSelector((state) => state.sessionEmail);
  const { refreshUser, refreshOrReauthenticate } = appActions;
  const [status, setStatus] = useState<IliasStatus | null>(null);
  const [dashboard, setDashboard] = useState<IliasDashboard | null>(null);
  const [settledToken, setSettledToken] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inFlight = useRef(false);

  const applyStatus = useCallback((next: IliasStatus) => {
    setStatus(next);
    if (!next.sessionActive) setDashboard(null);
  }, []);

  const load = useCallback(
    async (options: { quiet?: boolean; pull?: boolean } = {}) => {
      if (inFlight.current) return;
      inFlight.current = true;
      if (!options.quiet) setError('');
      try {
        const result = await loadIliasDashboard({ refresh: Boolean(options.pull) });
        applyStatus(result.status);
        setDashboard(result.dashboard);
      } catch (caught) {
        const code = caught instanceof IliasError ? caught.message : 'ilias_failed';
        applyStatus({
          ...(status ?? { baseUrl: 'https://ilias3.uni-stuttgart.de', configured: false, account: null, source: null, updatedAt: null }),
          sessionActive: false,
          account: code === 'ilias_session_expired' ? null : status?.account ?? null,
        });
        if (!options.quiet) setError(describe(caught, locale));
      } finally {
        inFlight.current = false;
      }
    },
    [applyStatus, locale, status],
  );

  useEffect(() => {
    if (!authToken) return;
    let active = true;
    (async () => {
      try {
        const next = await fetchIliasStatus();
        if (!active) return;
        applyStatus(next);
        if (!next.sessionActive) return;
        try {
          const result = await loadIliasDashboard();
          if (!active) return;
          applyStatus(result.status);
          setDashboard(result.dashboard);
        } catch (caught) {
          if (active) setError(describe(caught, locale));
        }
      } catch (caught) {
        if (active) setError(describe(caught, locale));
      } finally {
        if (active) setSettledToken(authToken);
      }
    })();
    return () => {
      active = false;
    };
  }, [applyStatus, authToken, locale]);

  const disconnect = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const next = await disconnectIlias();
      applyStatus(next);
      setDashboard(null);
      void refreshUser();
      showToast({ tone: 'success', title: tx(locale, 'tabsIlias.getrennt') });
    } catch (caught) {
      setError(describe(caught, locale));
    } finally {
      setBusy(false);
    }
  }, [applyStatus, locale, refreshUser]);

  /**
   * The app session refresh runs on every resume; the ILIAS session follows it.
   * The server keeps the PHPSESSID in memory only, so a restart while the app
   * is backgrounded leaves the tab on a dead session. Awaiting the shared
   * session probe first keeps an expired bearer from looking like an empty
   * ILIAS session, then a live session is reloaded and a dropped one is
   * re-established from the vault. Failures stay quiet; the next resume retries.
   */
  const revalidate = useCallback(async () => {
    if (inFlight.current || busy) return;
    if (!(await refreshOrReauthenticate())) return;
    // A replaced token reruns the auth-token effect above, which fetches fresh.
    if (getActiveAuthToken() !== authToken) return;
    let next: IliasStatus;
    try {
      next = await fetchIliasStatus();
    } catch {
      return;
    }
    applyStatus(next);
    if (!next.sessionActive) {
      // A remembered account is the server's evidence that the session was
      // dropped by a restart. A deliberate disconnect clears it, so the vault
      // must not quietly undo that choice.
      if (!next.account) return;
      const restored = await ensureIliasSession({ token: authToken, account: sessionEmail || sessionAccount });
      if (restored.connected) await load({ quiet: true });
      return;
    }
    await load({ quiet: true });
  }, [applyStatus, authToken, busy, load, refreshOrReauthenticate, sessionAccount, sessionEmail]);

  useAppStateChange(
    (state) => {
      if (state === 'active' && authToken && settledToken === authToken) void revalidate();
    },
    Platform.OS !== 'web',
  );

  // React Native Web does not emit AppState changes for tab switches.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return undefined;
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && authToken && settledToken === authToken) void revalidate();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [authToken, revalidate, settledToken]);

  /**
   * The server keeps ILIAS cookies in memory only, so a restart drops the
   * session. While the vault holds the C@MPUS credential, the tab reconnects
   * on first view instead of asking for the password again; later resumes go
   * through `revalidate` above.
   */
  const autoConnectedToken = useRef<string | null>(null);
  useEffect(() => {
    if (!authToken || settledToken !== authToken) return;
    if (status?.sessionActive || dashboard) return;
    if (autoConnectedToken.current === authToken) return;
    autoConnectedToken.current = authToken;
    void (async () => {
      const restored = await ensureIliasSession({
        token: authToken,
        account: sessionEmail || sessionAccount,
      });
      if (restored.connected) await load({ quiet: true });
    })();
  }, [authToken, dashboard, load, sessionAccount, sessionEmail, settledToken, status?.sessionActive]);

  const pullToRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load({ quiet: false, pull: true });
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  return {
    status,
    dashboard,
    refreshing,
    busy,
    error,
    disconnect,
    pullToRefresh,
  };
}
