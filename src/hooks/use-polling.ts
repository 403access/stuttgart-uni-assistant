import { useEffect, useRef } from 'react';

import { useLatestRef } from '@/src/hooks/use-latest-ref';

export interface UsePollingOptions<T> {
  /** Interval between polls; `null` pauses polling. */
  delayMs: number | null;
  onResult?: (result: T) => void;
  onError?: (error: unknown) => void;
  /** Return true to stop polling after this result. */
  stopOn?: (result: T) => boolean;
  /** Return true to stop polling after this error. */
  stopOnError?: (error: unknown) => boolean;
}

/**
 * Poll an async function on an interval. One poll runs at a time, and `stopOn`
 * / `stopOnError` end the loop without unmounting the component.
 */
export function usePolling<T>(poll: () => Promise<T>, options: UsePollingOptions<T>): void {
  const { delayMs } = options;
  const pollRef = useLatestRef(poll);
  const optionsRef = useLatestRef(options);
  const stopped = useRef(false);

  useEffect(() => {
    if (delayMs === null) return undefined;
    stopped.current = false;
    let active = true;
    let inFlight = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    const stop = () => {
      stopped.current = true;
      if (timer) clearInterval(timer);
      timer = undefined;
    };

    const tick = async () => {
      if (!active || inFlight || stopped.current) return;
      inFlight = true;
      try {
        const result = await pollRef.current();
        if (!active) return;
        optionsRef.current.onResult?.(result);
        if (optionsRef.current.stopOn?.(result)) stop();
      } catch (error) {
        if (!active) return;
        optionsRef.current.onError?.(error);
        if (optionsRef.current.stopOnError?.(error)) stop();
      } finally {
        inFlight = false;
      }
    };

    timer = setInterval(() => {
      void tick();
    }, delayMs);

    return () => {
      active = false;
      if (timer) clearInterval(timer);
    };
  }, [delayMs, optionsRef, pollRef]);
}
