import { useCallback, useMemo, type Dispatch, type SetStateAction } from 'react';

import { createServerSession, type AuthSession } from '@/src/auth/session';
import { localUser } from '@/src/auth/user';
import type { CampusSignInProfile, OidcSignInProfile } from '@/src/state/app-context';
import { pickActiveStudyId, sessionFields } from '@/src/state/persisted';
import type { PersistedState } from '@/src/types';

export interface SignInActions {
  signInDemo: (account: string) => Promise<void>;
  signInLocal: (account: string) => Promise<void>;
  signInDevice: (session: AuthSession) => void;
  signInCampus: (profile: CampusSignInProfile) => void;
  signInOidc: (profile: OidcSignInProfile) => void;
}

interface SignInDeps {
  state: PersistedState;
  setState: Dispatch<SetStateAction<PersistedState>>;
  establish: (session: AuthSession, extra?: Partial<PersistedState>) => void;
}

/**
 * The four sign-in surfaces. Each lands on the same account record through
 * `establish`; the C@MPUS and OIDC profiles also replace the curriculum and
 * study selection they were read with.
 */
export function useSignIn({ state, setState, establish }: SignInDeps): SignInActions {
  const { campusStudies, activeStudyId, curriculumNodes, curriculumStudyId, syncAt } = state;

  const signInCampus = useCallback(
    (profile: CampusSignInProfile) => {
      const studies = profile.studies ?? campusStudies;
      const nextActiveStudyId =
        profile.activeStudyId !== undefined && profile.activeStudyId !== null
          ? profile.activeStudyId
          : pickActiveStudyId(studies, activeStudyId);
      const extra: Partial<PersistedState> = {
        oidcSessionId: null,
        // A fresh login replaces the tree so nodes from another study never linger.
        curriculumNodes: profile.nodes ?? curriculumNodes,
        curriculumStudyId: profile.nodes ? (profile.studyId ?? null) : curriculumStudyId,
        campusStudies: studies,
        activeStudyId: nextActiveStudyId,
        syncAt: { ...syncAt, campus: new Date().toISOString() },
      };
      if (profile.auth) {
        establish(profile.auth, extra);
        return;
      }
      setState((current) => ({
        ...current,
        ...sessionFields(localUser({ account: profile.account, name: profile.name, mode: 'campus' })),
        ...extra,
      }));
    },
    [activeStudyId, campusStudies, curriculumNodes, curriculumStudyId, establish, setState, syncAt],
  );

  const signInDemo = useCallback(
    async (account: string) => {
      const accountValue = account.trim() || 'st123456';
      try {
        const session = await createServerSession({ mode: 'demo', account: accountValue, name: 'Lena Hartmann' });
        establish(session, {
          oidcSessionId: null,
          curriculumNodes: [],
          curriculumStudyId: null,
          campusStudies: [],
          activeStudyId: null,
        });
      } catch {
        // Offline: the demonstration record works without the assistant server.
        setState((current) => ({
          ...current,
          ...sessionFields(localUser({ account: accountValue, name: 'Lena Hartmann', mode: 'demo' })),
          oidcSessionId: null,
          curriculumNodes: [],
          curriculumStudyId: null,
          campusStudies: [],
          activeStudyId: null,
        }));
      }
    },
    [establish, setState],
  );

  const signInLocal = useCallback(
    async (account: string) => {
      const accountValue = account.trim();
      try {
        const session = await createServerSession({ mode: 'local', account: accountValue });
        establish(session, { oidcSessionId: null, curriculumNodes: [], curriculumStudyId: null, campusStudies: [], activeStudyId: null });
      } catch {
        setState((current) => ({
          ...current,
          ...sessionFields(localUser({ account: accountValue, mode: 'local' })),
          oidcSessionId: null,
          curriculumNodes: [],
          curriculumStudyId: null,
          campusStudies: [],
          activeStudyId: null,
        }));
      }
    },
    [establish, setState],
  );

  const signInDevice = useCallback(
    (session: AuthSession) => {
      establish(session, {
        oidcSessionId: null,
        curriculumNodes: [],
        curriculumStudyId: null,
        campusStudies: [],
        activeStudyId: null,
      });
    },
    [establish],
  );

  const signInOidc = useCallback(
    (profile: OidcSignInProfile) => {
      const extra: Partial<PersistedState> = {
        oidcSessionId: profile.sessionId,
        curriculumNodes: [],
        curriculumStudyId: null,
        campusStudies: [],
        activeStudyId: null,
        syncAt: { ...syncAt, siam: new Date().toISOString() },
      };
      if (profile.auth) {
        establish(profile.auth, extra);
        return;
      }
      setState((current) => ({
        ...current,
        ...sessionFields(localUser({ account: profile.account, name: profile.name, email: profile.email, subject: profile.subject, mode: 'oidc' })),
        ...extra,
      }));
    },
    [establish, setState, syncAt],
  );

  return useMemo(
    () => ({ signInDemo, signInLocal, signInDevice, signInCampus, signInOidc }),
    [signInDemo, signInLocal, signInDevice, signInCampus, signInOidc],
  );
}
