import { useMemo, type ReactNode } from 'react';

import { AppContext, type AppContextValue } from '@/src/state/app-context';
import { useAccountActions } from '@/src/state/use-account-actions';
import { useAppearanceActions } from '@/src/state/use-appearance-actions';
import { useAuthSession } from '@/src/state/use-auth-session';
import { useCampusSnapshot } from '@/src/state/use-campus-snapshot';
import { useChatActions } from '@/src/state/use-chat-actions';
import { useContentActions } from '@/src/state/use-content-actions';
import { usePersistedState } from '@/src/state/use-persisted-state';
import { useSessionResume } from '@/src/state/use-session-resume';
import { useSignIn } from '@/src/state/use-sign-in';

/**
 * Composes the app store from focused hooks: disk persistence, the device
 * session, sign-in profiles, foreground renewal, account calls, and local
 * content mutations. Screens only see the single context value.
 */
export function AppStateProvider({ children }: { children: ReactNode }) {
  const { state, setState, ready } = usePersistedState();

  const auth = useAuthSession({ setState });
  const { authToken, authSessionId, establish, adopt, clearLocalSession, signOut } = auth;

  const signIn = useSignIn({ state, setState, establish });
  const { refreshOrReauthenticate } = useSessionResume({
    state,
    establish,
    adopt,
    clearLocalSession,
    applyCampusProfile: signIn.signInCampus,
  });

  const account = useAccountActions({ setState, refreshOrReauthenticate });
  const content = useContentActions({ setState });
  const chat = useChatActions({ setState });
  const appearance = useAppearanceActions({ state, setState });

  useCampusSnapshot({
    authToken,
    sessionMode: state.sessionMode,
    hasStudies: state.campusStudies.length > 0,
    setState,
  });

  const value = useMemo<AppContextValue>(
    () => ({
      ...state,
      ready,
      authToken,
      authSessionId,
      refreshOrReauthenticate,
      ...signIn,
      ...account,
      ...content,
      ...chat,
      ...appearance,
      signOut,
    }),
    [state, ready, authToken, authSessionId, refreshOrReauthenticate, signIn, account, content, chat, appearance, signOut],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
