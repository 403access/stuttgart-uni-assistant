import { emptyState } from '@/src/state/persisted';
import { getAppState, updateApp } from '@/src/state/app-store';
import type { DesignMode, Locale, ThemeMode } from '@/src/types';
import { applyTheme } from '@/src/theme';

/**
 * Appearance plus the dev reset. `reset` clears the content but keeps the
 * signed-in identity and the data the current sign-in mode owns.
 */
export function setLocale(locale: Locale): void {
  updateApp((current) => ({ ...current, locale }));
}

export function setTheme(theme: ThemeMode): void {
  if (getAppState().theme === theme) return;
  applyTheme(theme);
  updateApp((current) => ({ ...current, theme }));
}

export function setDesign(design: DesignMode): void {
  updateApp((current) => (current.design === design ? current : { ...current, design }));
}

export function reset(): void {
  updateApp((current) => ({
    ...emptyState,
    ready: current.ready,
    authToken: current.authToken,
    authSessionId: current.authSessionId,
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
  }));
}
