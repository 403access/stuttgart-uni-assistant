import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

import { hydrateMailSnapshot } from '@/src/auth/mail';
import { APP_STATE_STORAGE_KEY, emptyState, sanitize } from '@/src/state/persisted';
import { applyTheme } from '@/src/theme';
import type { PersistedState } from '@/src/types';

export interface PersistedStore {
  state: PersistedState;
  setState: Dispatch<SetStateAction<PersistedState>>;
  ready: boolean;
}

/**
 * Disk-backed app state. Hydration and writing are the only concerns here; the
 * provider composes the actions that mutate the state.
 */
export function usePersistedState(): PersistedStore {
  const [state, setState] = useState<PersistedState>(emptyState);
  const [ready, setReady] = useState(false);

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
          setState(restored);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify(state)).catch(() => undefined);
  }, [ready, state]);

  return { state, setState, ready };
}
