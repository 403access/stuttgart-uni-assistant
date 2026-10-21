import { useMemo, type Dispatch, type SetStateAction } from 'react';

import { emptyState } from '@/src/state/persisted';
import type { DesignMode, Locale, PersistedState, ThemeMode } from '@/src/types';
import { applyTheme } from '@/src/theme';

export interface AppearanceActions {
  setLocale: (locale: Locale) => void;
  setTheme: (theme: ThemeMode) => void;
  setDesign: (design: DesignMode) => void;
  reset: () => void;
}

/**
 * Appearance plus the dev reset. `reset` clears the content but keeps the
 * signed-in identity and the data the current sign-in mode owns.
 */
export function useAppearanceActions({
  state,
  setState,
}: {
  state: PersistedState;
  setState: Dispatch<SetStateAction<PersistedState>>;
}): AppearanceActions {
  const { theme } = state;

  return useMemo(
    () => ({
      setLocale: (locale) => setState((current) => ({ ...current, locale })),
      setTheme: (nextTheme) => {
        if (nextTheme === theme) return;
        applyTheme(nextTheme);
        setState((current) => ({ ...current, theme: nextTheme }));
      },
      setDesign: (design) => setState((current) => (current.design === design ? current : { ...current, design })),
      reset: () =>
        setState((current) => ({
          ...emptyState,
          locale: current.locale,
          theme: current.theme,
          design: current.design,
          user: current.user,
          sessionAccount: current.sessionAccount,
          sessionMode: current.sessionMode,
          sessionName: current.sessionName,
          sessionEmail: current.sessionEmail,
          sessionSubject: current.sessionSubject,
          mailAccount: current.mailAccount,
          oidcSessionId: current.oidcSessionId,
          curriculumNodes: current.sessionMode === 'campus' ? current.curriculumNodes : [],
          curriculumStudyId: current.sessionMode === 'campus' ? current.curriculumStudyId : null,
          campusStudies: current.sessionMode === 'campus' ? current.campusStudies : [],
          activeStudyId: current.sessionMode === 'campus' ? current.activeStudyId : null,
          syncAt:
            current.sessionMode === 'oidc'
              ? { siam: current.syncAt.siam }
              : current.sessionMode === 'campus'
                ? { campus: current.syncAt.campus }
                : {},
        })),
    }),
    [setState, theme],
  );
}
