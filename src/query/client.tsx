import * as Network from 'expo-network';
import { useState, useEffect, type ReactNode } from 'react';
import { Platform } from 'react-native';
import { QueryClient, QueryClientProvider, focusManager, onlineManager } from '@tanstack/react-query';

import { useAppStateChange } from '@/src/hooks/use-app-state-change';

/**
 * Defaults for query deeds of every screen:
 * - Campus data changes only through an explicit sync on the very server,
 *   so reads go stale after 30 seconds, not instantly.
 * - Portal reads already retry on the server and render a detailed error
 *   body; a blind client rerun would double the wait, so queries do not
 *   retry. Retry is still possible through the toast button (`refetch`).
 * - Reads refetch when a stale question comes back into view (a revisit
 *   after 30 seconds) and when the app returns to the foreground — that
 *   is what the focusManager is wired for below.
 */
function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 10 * 60_000,
        retry: false,
      },
    },
  });
}

/**
 * Provider above the app screens, below the AppStateProvider so queries
 * can read the session. Wires the two platform integrations the React
 * Query guide recommends for React Native:
 * - `focusManager` on the RN AppState event, so active queries know when
 *   the app is in the background again (web gets window events already).
 * - `onlineManager` on expo-network, so queries held offline answer
 *   refetch on reconnect (expo-network is listed for Expo Go on v57).
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(createQueryClient);

  useAppStateChange((status) => {
    focusManager.setFocused(status === 'active');
  }, Platform.OS !== 'web');

  useEffect(() => {
    onlineManager.setEventListener((setOnline) => {
      let emitted = false;
      const subscription = Network.addNetworkStateListener((state) => {
        emitted = true;
        setOnline(Boolean(state.isConnected));
      });
      Network.getNetworkStateAsync()
        .then((state) => {
          if (!emitted) setOnline(Boolean(state.isConnected));
        })
        .catch(() => {
          // getNetworkStateAsync can reject on some platforms; stay online.
        });
      return subscription.remove;
    });
  }, []);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
