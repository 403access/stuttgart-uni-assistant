import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { useAppStateChange } from '@/src/hooks/use-app-state-change';
import { ensureIliasSession } from '@/src/ilias/auto-connect';
import { useAppSelector, appActions } from '@/src/state/AppState';

/**
 * Keeps ILIAS connected alongside the app session. The assistant server holds
 * the PHPSESSID in memory only, so a cold launch or a server restart drops it
 * even though C@MPUS and UniMail are still connected. Runs once per sign-in and
 * again on every foreground return; `ensureIliasSession` leaves a live session
 * alone and never raises a biometric prompt.
 */
export function IliasAutoConnect() {
  const ready = useAppSelector((state) => state.ready);
  const authToken = useAppSelector((state) => state.authToken);
  const sessionMode = useAppSelector((state) => state.sessionMode);
  const sessionAccount = useAppSelector((state) => state.sessionAccount);
  const sessionEmail = useAppSelector((state) => state.sessionEmail);
  const { refreshUser } = appActions;
  const state = useRef({ ready, authToken, sessionMode, sessionAccount, sessionEmail });

  useEffect(() => {
    state.current = { ready, authToken, sessionMode, sessionAccount, sessionEmail };
  }, [authToken, ready, sessionAccount, sessionEmail, sessionMode]);

  const run = useCallback(() => {
    const current = state.current;
    if (!current.ready || !current.authToken) return;
    if (current.sessionMode !== 'campus' && current.sessionMode !== 'oidc') return;
    void ensureIliasSession({
      token: current.authToken,
      account: current.sessionEmail || current.sessionAccount,
    }).then((result) => {
      // A fresh connect links the platform on the server; update the account row.
      if (result.dashboard) void refreshUser();
    });
  }, [refreshUser]);

  useEffect(() => {
    if (!ready || !authToken) return;
    // The automated sign-in hands its credential to ILIAS in the same tick the
    // gate reveals the tabs. A short delay lets that stronger path go first.
    const timer = setTimeout(run, 600);
    return () => clearTimeout(timer);
  }, [authToken, ready, run]);

  useAppStateChange(
    (next) => {
      if (next === 'active') run();
    },
    Platform.OS !== 'web',
  );

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return undefined;
    const onVisibility = () => {
      if (document.visibilityState === 'visible') run();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [run]);

  return null;
}
