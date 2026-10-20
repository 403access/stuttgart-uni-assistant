import { useState } from 'react';

import { useInterval } from '@/src/hooks/use-interval';

export interface Countdown {
  secondsLeft: number;
  /** `m:ss`, e.g. `4:59`. */
  label: string;
  expired: boolean;
}

/**
 * Count down to an absolute timestamp (ISO string or epoch millis). `null`
 * stops the clock and reports zero, so callers can render an idle state.
 */
export function useCountdown(expiresAt: string | number | null): Countdown {
  const target = expiresAt ? new Date(expiresAt).getTime() : 0;
  const [now, setNow] = useState(() => Date.now());

  useInterval(() => setNow(Date.now()), target ? 1000 : null);

  const secondsLeft = target ? Math.max(0, Math.ceil((target - now) / 1000)) : 0;
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = String(secondsLeft % 60).padStart(2, '0');
  return { secondsLeft, label: `${minutes}:${seconds}`, expired: target > 0 && secondsLeft === 0 };
}
