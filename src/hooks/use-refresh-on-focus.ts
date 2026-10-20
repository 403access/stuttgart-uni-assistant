import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { useLatestRef } from '@/src/hooks/use-latest-ref';

/**
 * Run a refresh when the screen regains focus. The latest callback is read
 * from a ref, so callers can pass an inline function without re-running the
 * focus effect on every render.
 */
export function useRefreshOnFocus(refresh: () => void | Promise<void>): void {
  const saved = useLatestRef(refresh);
  useFocusEffect(
    useCallback(() => {
      void saved.current();
    }, [saved]),
  );
}
