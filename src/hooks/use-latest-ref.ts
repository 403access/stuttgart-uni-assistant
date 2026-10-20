import { useEffect, useRef } from 'react';

/**
 * A ref that always holds the latest committed value.
 *
 * Use it for options and callbacks that async work reads later: reading them
 * from the closure of the render that started the work would keep a stale
 * value (a previous study, an old locale, an outdated handler).
 */
export function useLatestRef<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}
