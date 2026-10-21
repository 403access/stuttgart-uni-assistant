import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';

import { hydrateMailSnapshot } from '@/src/auth/mail';
import { appStore, patchApp, samePersisted, selectPersisted } from '@/src/state/app-store';
import { APP_STATE_STORAGE_KEY, sanitize } from '@/src/state/persisted';
import { applyTheme } from '@/src/theme';
import type { PersistedState } from '@/src/types';

/**
 * Disk-backed app state. Hydration runs once; afterwards the store subscription
 * writes the persisted slice whenever one of its fields changes. Runtime values
 * (bearer token, session id, `ready`) are never written.
 */
export function useAppPersistence(): void {
  useEffect(() => {
    let active = true;
    // The mail cache restores with the rest of the app state, so the messages
    // tab can render its last inbox on the first frame instead of a flash of
    // the connection form while the disk read is still pending.
    Promise.all([AsyncStorage.getItem(APP_STATE_STORAGE_KEY), hydrateMailSnapshot()])
      .then(([raw]) => {
        if (!active) return;
        if (raw) {
          const restored = sanitize(JSON.parse(raw) as Partial<PersistedState>);
          // Apply before the state update so the first visible render already
          // uses the stored palette.
          applyTheme(restored.theme);
          patchApp(restored);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) patchApp({ ready: true });
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let last = selectPersisted(appStore.state);
    // Serialize writes so a slow earlier write cannot land after a newer one.
    let write = Promise.resolve();
    const subscription = appStore.subscribe((state) => {
      if (!state.ready) return;
      const next = selectPersisted(state);
      if (samePersisted(last, next)) return;
      last = next;
      const raw = JSON.stringify(next);
      write = write.then(() => AsyncStorage.setItem(APP_STATE_STORAGE_KEY, raw)).catch(() => undefined);
    });
    return () => subscription.unsubscribe();
  }, []);
}
