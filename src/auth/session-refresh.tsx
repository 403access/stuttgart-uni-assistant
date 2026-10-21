import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { useAppStateChange } from '@/src/hooks/use-app-state-change';
import { useApp } from '@/src/state/AppState';

/**
 * Keeps the app session honest across background visits. Every return to the
 * foreground revalidates the bearer with `GET /v1/auth/me`; a rejected token
 * triggers the silent re-login in `AppState` (demo/local account or the saved
 * C@MPUS portal session). The first run also covers a cold launch whose stored
 * token was already dead, which the launch restore deliberately does not drop.
 */
export function SessionRefresh() {
  const { ready, refreshOrReauthenticate } = useApp();
  const busy = useRef(false);
  const started = useRef(false);

  const run = useCallback(() => {
    if (busy.current) return;
    busy.current = true;
    void refreshOrReauthenticate().finally(() => {
      busy.current = false;
    });
  }, [refreshOrReauthenticate]);

  useAppStateChange(
    (state) => {
      if (state === 'active' && ready) run();
    },
    Platform.OS !== 'web',
  );

  // React Native Web does not emit AppState changes for tab switches.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return undefined;
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && ready) run();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [ready, run]);

  // One attempt once the stored session is available; later attempts come from
  // the foreground listener above.
  useEffect(() => {
    if (started.current || !ready) return;
    started.current = true;
    run();
  }, [ready, run]);

  return null;
}
