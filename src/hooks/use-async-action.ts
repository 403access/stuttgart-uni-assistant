import { useCallback, useRef, useState } from 'react';

import { useLatestRef } from '@/src/hooks/use-latest-ref';

export interface UseAsyncActionOptions<Result> {
  /** Map a thrown error to display text. Return '' to keep the failure silent. */
  errorMessage?: (error: unknown) => string;
  /** Runs after a successful action; awaited before `run` resolves. */
  onSuccess?: (result: Result) => void | Promise<void>;
  /** Observe failures that are not surfaced as text. */
  onError?: (error: unknown) => void;
}

export interface AsyncAction<Args extends unknown[], Result> {
  /** Run the action. Returns undefined when it is already running or failed. */
  run: (...args: Args) => Promise<Result | undefined>;
  busy: boolean;
  error: string;
  clearError: () => void;
}

/**
 * One async action with the `busy` / `error` / duplicate-tap guard that screens
 * otherwise hand-roll. The action and options are read through refs, so the
 * returned `run` is stable and always calls the latest closure.
 */
export function useAsyncAction<Args extends unknown[], Result>(
  action: (...args: Args) => Promise<Result>,
  options: UseAsyncActionOptions<Result> = {},
): AsyncAction<Args, Result> {
  const actionRef = useLatestRef(action);
  const optionsRef = useLatestRef(options);
  const runningRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = useCallback(async (...args: Args): Promise<Result | undefined> => {
    if (runningRef.current) return undefined;
    runningRef.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await actionRef.current(...args);
      try {
        await optionsRef.current.onSuccess?.(result);
      } catch (callbackError) {
        // A UI callback must not turn a successful action into a failure.
        if (__DEV__) console.warn('[async-action] onSuccess failed', callbackError);
      }
      return result;
    } catch (caught) {
      optionsRef.current.onError?.(caught);
      const message = optionsRef.current.errorMessage?.(caught) ?? '';
      if (message) setError(message);
      return undefined;
    } finally {
      runningRef.current = false;
      setBusy(false);
    }
  }, [actionRef, optionsRef]);

  const clearError = useCallback(() => setError(''), []);

  return { run, busy, error, clearError };
}
