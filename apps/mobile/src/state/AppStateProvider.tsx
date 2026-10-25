import type { ReactNode } from 'react';

import { useAppPersistence } from '@/src/state/use-app-persistence';
import { useAuthRestore } from '@/src/state/use-auth-restore';
import { useCampusSnapshotSync } from '@/src/state/use-campus-snapshot-sync';

/**
 * Mounts the store's lifecycle: disk hydration and persistence, the device
 * session restore, and the cross-device campus snapshot. The state itself lives
 * in `appStore`, so this component no longer provides a React context and does
 * not re-render its children when the store changes.
 */
export function AppStateProvider({ children }: { children: ReactNode }) {
  useAppPersistence();
  useAuthRestore();
  useCampusSnapshotSync();

  return <>{children}</>;
}
