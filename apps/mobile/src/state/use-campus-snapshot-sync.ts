import { useEffect } from 'react';

import { loadCampusStudies } from '@/src/auth/campus';
import { updateApp } from '@ua/core/state/app-store';
import { pickActiveStudyId } from '@ua/core/state/persisted';
import { useAppSelector } from '@/src/state/use-app-store';

/**
 * A web session starts without the phone's local study list. The server holds
 * the cross-device snapshot, so fetch it once the campus session is present;
 * the calendar and course tabs then read the server snapshots too.
 */
export function useCampusSnapshotSync(): void {
  const authToken = useAppSelector((state) => state.authToken);
  const sessionMode = useAppSelector((state) => state.sessionMode);
  const hasStudies = useAppSelector((state) => state.campusStudies.length > 0);

  useEffect(() => {
    if (!authToken || sessionMode !== 'campus' || hasStudies) return;
    let active = true;
    loadCampusStudies()
      .then((loaded) => {
        if (!active || !loaded.studies.length) return;
        updateApp((current) => {
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
  }, [authToken, hasStudies, sessionMode]);
}
