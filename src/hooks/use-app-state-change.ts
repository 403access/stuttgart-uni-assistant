import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useLatestRef } from '@/src/hooks/use-latest-ref';

/**
 * Subscribe to React Native's app-state changes (`active`, `background`, …).
 * Pass `enabled: false` to keep the handler for later without subscribing —
 * useful for web, where the platform already emits window events.
 */
export function useAppStateChange(
  handler: (state: AppStateStatus) => void,
  enabled = true,
): void {
  const saved = useLatestRef(handler);
  useEffect(() => {
    if (!enabled) return undefined;
    const subscription = AppState.addEventListener('change', (state) => saved.current(state));
    return () => subscription.remove();
  }, [enabled, saved]);
}
