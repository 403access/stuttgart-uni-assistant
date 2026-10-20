import { useEffect } from 'react';

import { useLatestRef } from '@/src/hooks/use-latest-ref';

/**
 * Run a callback on a fixed interval. Pass `null` to pause it.
 *
 * The interval is not reset when the callback identity changes — the latest
 * callback is read through a ref, so inline arrow functions are safe.
 */
export function useInterval(callback: () => void, delayMs: number | null): void {
  const saved = useLatestRef(callback);
  useEffect(() => {
    if (delayMs === null) return undefined;
    const id = setInterval(() => saved.current(), delayMs);
    return () => clearInterval(id);
  }, [delayMs, saved]);
}
