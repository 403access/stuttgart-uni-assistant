import { activeStudy } from '@/src/auth/campus';
import { useAppSelector } from '@/src/state/AppState';
import type { CampusStudy } from '@/src/types';

export interface ActiveStudy {
  study: CampusStudy | null;
  /** The effective study id, or null when no campus study is selected. */
  studyId: number | null;
  /** Signed in with C@MPUS and at least one enrolled study. */
  isCampus: boolean;
}

/**
 * The study the app is currently browsing. `activeStudy` already falls back to
 * the last-accessed or first study, so screens do not need their own copy of
 * that rule.
 */
export function useActiveStudy(): ActiveStudy {
  const sessionMode = useAppSelector((state) => state.sessionMode);
  const campusStudies = useAppSelector((state) => state.campusStudies);
  const activeStudyId = useAppSelector((state) => state.activeStudyId);
  const isCampus = sessionMode === 'campus' && campusStudies.length > 0;
  const study = isCampus ? activeStudy(campusStudies, activeStudyId) : null;
  return { study, studyId: study?.studyId ?? null, isCampus };
}
