import { createServerSession, type AuthSession } from '@/src/auth/session';
import { localUser } from '@/src/auth/user';
import { establishAuthSession } from '@/src/state/actions/auth-session';
import { getAppState, patchApp } from '@/src/state/app-store';
import { pickActiveStudyId, sessionFields } from '@/src/state/persisted';
import type { CampusStudy, CurriculumNode, PersistedState } from '@/src/types';

export interface CampusSignInProfile {
  account: string;
  name: string;
  nodes?: CurriculumNode[];
  studyId?: number | null;
  studies?: CampusStudy[];
  activeStudyId?: number | null;
  auth?: AuthSession;
}

export interface OidcSignInProfile {
  account: string;
  name: string | null;
  email: string | null;
  subject: string | null;
  sessionId: string;
  auth?: AuthSession;
}

/**
 * The four sign-in surfaces. Each lands on the same account record through
 * `establishAuthSession`; the C@MPUS and OIDC profiles also replace the
 * curriculum and study selection they were read with.
 */
export function signInCampus(profile: CampusSignInProfile): void {
  const state = getAppState();
  const studies = profile.studies ?? state.campusStudies;
  const nextActiveStudyId =
    profile.activeStudyId !== undefined && profile.activeStudyId !== null
      ? profile.activeStudyId
      : pickActiveStudyId(studies, state.activeStudyId);
  const extra: Partial<PersistedState> = {
    oidcSessionId: null,
    // A fresh login replaces the tree so nodes from another study never linger.
    curriculumNodes: profile.nodes ?? state.curriculumNodes,
    curriculumStudyId: profile.nodes ? (profile.studyId ?? null) : state.curriculumStudyId,
    campusStudies: studies,
    activeStudyId: nextActiveStudyId,
    syncAt: { ...state.syncAt, campus: new Date().toISOString() },
  };
  if (profile.auth) {
    establishAuthSession(profile.auth, extra);
    return;
  }
  patchApp({
    ...sessionFields(localUser({ account: profile.account, name: profile.name, mode: 'campus' })),
    ...extra,
  });
}

export async function signInDemo(account: string): Promise<void> {
  const accountValue = account.trim() || 'st123456';
  try {
    const session = await createServerSession({ mode: 'demo', account: accountValue, name: 'Lena Hartmann' });
    establishAuthSession(session, {
      oidcSessionId: null,
      curriculumNodes: [],
      curriculumStudyId: null,
      campusStudies: [],
      activeStudyId: null,
    });
  } catch {
    // Offline: the demonstration record works without the assistant server.
    patchApp({
      ...sessionFields(localUser({ account: accountValue, name: 'Lena Hartmann', mode: 'demo' })),
      oidcSessionId: null,
      curriculumNodes: [],
      curriculumStudyId: null,
      campusStudies: [],
      activeStudyId: null,
    });
  }
}

export async function signInLocal(account: string): Promise<void> {
  const accountValue = account.trim();
  try {
    const session = await createServerSession({ mode: 'local', account: accountValue });
    establishAuthSession(session, {
      oidcSessionId: null,
      curriculumNodes: [],
      curriculumStudyId: null,
      campusStudies: [],
      activeStudyId: null,
    });
  } catch {
    patchApp({
      ...sessionFields(localUser({ account: accountValue, mode: 'local' })),
      oidcSessionId: null,
      curriculumNodes: [],
      curriculumStudyId: null,
      campusStudies: [],
      activeStudyId: null,
    });
  }
}

export function signInDevice(session: AuthSession): void {
  establishAuthSession(session, {
    oidcSessionId: null,
    curriculumNodes: [],
    curriculumStudyId: null,
    campusStudies: [],
    activeStudyId: null,
  });
}

export function signInOidc(profile: OidcSignInProfile): void {
  const state = getAppState();
  const extra: Partial<PersistedState> = {
    oidcSessionId: profile.sessionId,
    curriculumNodes: [],
    curriculumStudyId: null,
    campusStudies: [],
    activeStudyId: null,
    syncAt: { ...state.syncAt, siam: new Date().toISOString() },
  };
  if (profile.auth) {
    establishAuthSession(profile.auth, extra);
    return;
  }
  patchApp({
    ...sessionFields(
      localUser({ account: profile.account, name: profile.name, email: profile.email, subject: profile.subject, mode: 'oidc' }),
    ),
    ...extra,
  });
}
