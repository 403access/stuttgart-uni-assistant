import { useEffect } from 'react';
import type { ReactNode } from 'react';

import { useAppSelector } from '@/src/state/AppState';

import { flushQuizSync, hydrateQuizCatalog } from './remote';

/**
 * Loads the server-managed quiz catalog (falling back to the bundled content)
 * and retries the offline answer queue whenever the account session changes.
 */
export function QuizCatalogProvider({ children }: { children: ReactNode }) {
  const authToken = useAppSelector((state) => state.authToken);
  const sessionAccount = useAppSelector((state) => state.sessionAccount);

  useEffect(() => {
    void hydrateQuizCatalog();
  }, []);

  useEffect(() => {
    void flushQuizSync();
    if (authToken) void hydrateQuizCatalog();
  }, [authToken, sessionAccount]);

  return <>{children}</>;
}
