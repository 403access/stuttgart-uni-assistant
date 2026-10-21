import { useEffect, type Dispatch, type SetStateAction } from 'react';

import { loadCampusStudies } from '@/src/auth/campus';
import { pickActiveStudyId } from '@/src/state/persisted';
import type { PersistedState } from '@/src/types';

/**
 * A web session starts without the phone's local study list. The server holds
 * the cross-device snapshot, so fetch it once the campus session is present;
 * the calendar and course tabs then read the server snapshots too.
 */
export function useCampusSnapshot({
  authToken,
  sessionMode,
  hasStudies,
  setState,
}: {
  authToken: string | null;
  sessionMode: PersistedState['sessionMode'];
  hasStudies: boolean;
  setState: Dispatch<SetStateAction<PersistedState>>;
}): void {
  useEffect(() => {
    if (!authToken || sessionMode !== 'campus' || hasStudies) return;
    let active = true;
    loadCampusStudies()
      .then((loaded) => {
        if (!active || !loaded.studies.length) return;
        setState((current) => {
          if (current.campusStudies.length) return current;
          return {
            ...current,
            campusStudies: loaded.studies,
            activeStudyId: pickActiveStudyId(loaded.studies, loaded.activeStudyId ?? current.activeStudyId),
            syncAt: { ...current.syncAt, campus: new Date().toISOString() },
          };
        });
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [authToken, hasStudies, sessionMode, setState]);
}
