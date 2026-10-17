/** Shared mutation options for the C@MPUS flows. Web + native use the same factories. */

import { mutationOptions } from '@tanstack/react-query';

import { runServerSync } from '@/src/campus/server-sync';
import type { CampusSyncJob } from '@/src/auth/campus';

/** Per-call configuration of the shared structure-sync mutation. */
export interface CampusSyncVars {
  studyId: number;
  /** Root element to walk; omitted syncs continue where the server stored progress. */
  elementId?: number;
  includeCourses: boolean;
  onProgress?: (job: CampusSyncJob) => void;
  isCancelled?: () => boolean;
}

/**
 * One C@MPUS server sync job: the polling loop runs inside the mutation
 * function, so the app only tracks `isPending` and the progress callbacks.
 * The three sync screens (Kurse, Struktur, Strukturen browse) share it.
 */
export function campusSyncMutation() {
  return mutationOptions({
    mutationKey: ['campus-sync'],
    mutationFn: (vars: CampusSyncVars) =>
      runServerSync(vars.studyId, {
        elementId: vars.elementId,
        includeCourses: vars.includeCourses,
        onProgress: vars.onProgress,
        isCancelled: vars.isCancelled,
      }),
  });
}
