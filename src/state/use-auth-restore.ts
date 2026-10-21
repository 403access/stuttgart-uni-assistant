import { useEffect } from 'react';

import { restoreAuthSession } from '@/src/state/actions/auth-session';

/** Restore the bearer token and session id from the device vault on launch. */
export function useAuthRestore(): void {
  useEffect(() => {
    let active = true;
    restoreAuthSession(() => active).catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);
}
