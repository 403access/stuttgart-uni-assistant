import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { clearMailCache, hydrateMailSnapshot } from '@/src/auth/mail';
import {
  clearAuthToken,
  createServerSession,
  fetchSessionUser,
  getActiveAuthToken,
  linkServerPlatform,
  logoutServerSession,
  readAuthToken,
  saveAuthToken,
  setActiveAuthToken,
  syncServerPlatform,
  unlinkServerPlatform,
  type AuthSession,
} from '@/src/auth/session';
import { asUserAccount, findPlatform, localUser } from '@/src/auth/user';
import { documents } from '@/src/data';
import type {
  AccountPlatformId,
  CampusStudy,
  ChatMessage,
  CurriculumNode,
  DesignMode,
  ImportedDocument,
  Locale,
  PersistedState,
  PlatformId,
  PlatformLinkStatus,
  Review,
  ThemeMode,
  TransferDraft,
  UserAccount,
} from '@/src/types';
import { applyTheme } from '@/src/theme';

export const APP_STATE_STORAGE_KEY = 'university-assistant/v1';

const empty: PersistedState = {
  locale: 'de',
  theme: 'light',
  design: 'clean',
  user: null,
  sessionAccount: null,
  sessionMode: null,
  sessionName: null,
  sessionEmail: null,
  sessionSubject: null,
  mailAccount: null,
  oidcSessionId: null,
  curriculumNodes: [],
  curriculumStudyId: null,
  campusStudies: [],
  activeStudyId: null,
  syncAt: {},
  downloadedIds: [],
  imports: [],
  reviews: [],
  transfers: [],
  messages: [],
  plannedIds: [],
};

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

type AppContextValue = PersistedState & {
  ready: boolean;
  /** Bearer token of the server session, or null while offline / signed out. Never persisted in AsyncStorage. */
  authToken: string | null;
  signInDemo: (account: string) => Promise<void>;
  signInLocal: (account: string) => Promise<void>;
  signInCampus: (profile: CampusSignInProfile) => void;
  setCurriculum: (nodes: CurriculumNode[], options?: { studyId?: number | null; replace?: boolean }) => void;
  setStudies: (studies: CampusStudy[]) => void;
  setActiveStudy: (studyId: number) => void;
  signInOidc: (profile: OidcSignInProfile) => void;
  setMailAccount: (account: string | null) => void;
  /** Re-read this account from the server (after a link, sync, or mail connect). */
  refreshUser: () => Promise<void>;
  linkAccount: (platform: AccountPlatformId, account: string | null, status?: PlatformLinkStatus, source?: string) => Promise<void>;
  syncAccount: (platform: AccountPlatformId) => Promise<void>;
  unlinkAccount: (platform: AccountPlatformId) => Promise<void>;
  signOut: () => void;
  setLocale: (locale: Locale) => void;
  setTheme: (theme: ThemeMode) => void;
  setDesign: (design: DesignMode) => void;
  syncPlatform: (platform: PlatformId) => void;
  toggleDownload: (id: string) => void;
  addImport: (document: ImportedDocument) => void;
  toggleShare: (id: string) => void;
  addReview: (review: Review) => void;
  saveTransfer: (draft: TransferDraft) => void;
  removeTransfer: (id: string) => void;
  addMessage: (message: ChatMessage) => void;
  replaceMessage: (message: ChatMessage) => void;
  clearChat: () => void;
  togglePlanned: (id: string) => void;
  reset: () => void;
};

const AppContext = createContext<AppContextValue | null>(null);

function sanitizeNodes(value: unknown): CurriculumNode[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const node = item as Partial<CurriculumNode>;
    if (typeof node.id !== 'number' || typeof node.name !== 'string') return [];
    return [
      {
        id: node.id,
        designation: typeof node.designation === 'string' ? node.designation : '',
        elementType: typeof node.elementType === 'string' ? node.elementType : '',
        name: node.name,
        parentId: typeof node.parentId === 'number' ? node.parentId : null,
        completed: Boolean(node.completed),
        inProgress: Boolean(node.inProgress),
      },
    ];
  });
}

function sanitizeStudies(value: unknown): CampusStudy[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const study = item as Partial<CampusStudy>;
    if (typeof study.studyId !== 'number' || typeof study.name !== 'string') return [];
    return [
      {
        studyId: study.studyId,
        name: study.name,
        intendedDegree: typeof study.intendedDegree === 'string' ? study.intendedDegree : '',
        versionIdentifier: typeof study.versionIdentifier === 'string' ? study.versionIdentifier : '',
        studyStatus: typeof study.studyStatus === 'string' ? study.studyStatus : '',
        identifier: typeof study.identifier === 'string' ? study.identifier : '',
        curriculumVersionId: typeof study.curriculumVersionId === 'number' ? study.curriculumVersionId : null,
        curriculumId: typeof study.curriculumId === 'number' ? study.curriculumId : null,
        color: typeof study.color === 'string' ? study.color : '',
        lastAccessed: Boolean(study.lastAccessed),
        elementId: typeof study.elementId === 'number' ? study.elementId : null,
      },
    ];
  });
}

/** Single study is auto-selected. Otherwise prefer lastAccessed, then the stored choice, then the first row. */
export function pickActiveStudyId(studies: CampusStudy[], current: number | null = null): number | null {
  if (!studies.length) return null;
  if (studies.length === 1) return studies[0].studyId;
  if (current !== null && studies.some((item) => item.studyId === current)) return current;
  return studies.find((item) => item.lastAccessed)?.studyId ?? studies[0].studyId;
}

function sanitize(value: Partial<PersistedState> | null): PersistedState {
  if (!value) return empty;
  const campusStudies = sanitizeStudies(value.campusStudies);
  const activeStudyId =
    typeof value.activeStudyId === 'number' && campusStudies.some((item) => item.studyId === value.activeStudyId)
      ? value.activeStudyId
      : pickActiveStudyId(campusStudies, null);
  const user = asUserAccount(value.user);
  return {
    locale: value.locale === 'en' ? 'en' : 'de',
    theme: value.theme === 'dark' ? 'dark' : 'light',
    design: value.design === 'playful' ? 'playful' : 'clean',
    user,
    // The flat session fields predate the account record. A stored user fills them in
    // when an older payload did not carry them yet.
    sessionAccount: typeof value.sessionAccount === 'string' ? value.sessionAccount : user?.account ?? null,
    sessionMode: value.sessionMode === 'oidc' || value.sessionMode === 'demo' || value.sessionMode === 'local' || value.sessionMode === 'campus' ? value.sessionMode : user?.mode ?? null,
    sessionName: typeof value.sessionName === 'string' ? value.sessionName : user?.name ?? null,
    sessionEmail: typeof value.sessionEmail === 'string' ? value.sessionEmail : user?.email ?? null,
    sessionSubject: typeof value.sessionSubject === 'string' ? value.sessionSubject : user?.subject ?? null,
    mailAccount: typeof value.mailAccount === 'string' ? value.mailAccount : findPlatform(user, 'mail')?.account ?? null,
    oidcSessionId: typeof value.oidcSessionId === 'string' ? value.oidcSessionId : null,
    curriculumNodes: sanitizeNodes(value.curriculumNodes),
    curriculumStudyId: typeof value.curriculumStudyId === 'number' ? value.curriculumStudyId : null,
    campusStudies,
    activeStudyId,
    syncAt: value.syncAt ?? {},
    downloadedIds: Array.isArray(value.downloadedIds) ? value.downloadedIds.filter((id) => typeof id === 'string') : [],
    imports: Array.isArray(value.imports) ? value.imports : [],
    reviews: Array.isArray(value.reviews) ? value.reviews : [],
    transfers: Array.isArray(value.transfers) ? value.transfers : [],
    messages: Array.isArray(value.messages) ? value.messages.slice(-40) : [],
    plannedIds: Array.isArray(value.plannedIds) ? value.plannedIds.filter((id) => typeof id === 'string') : [],
  };
}

/** The session fields every signed-in account mirrors, so older screens keep working. */
function sessionFields(user: UserAccount) {
  return {
    user,
    sessionAccount: user.account,
    sessionMode: user.mode,
    sessionName: user.name,
    sessionEmail: user.email,
    sessionSubject: user.subject,
    mailAccount: findPlatform(user, 'mail')?.account ?? null,
  };
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedState>(empty);
  const [ready, setReady] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    // The mail cache restores with the rest of the app state, so the messages
    // tab can render its last inbox on the first frame instead of a flash of
    // the connection form while the disk read is still pending.
    Promise.all([AsyncStorage.getItem(APP_STATE_STORAGE_KEY), hydrateMailSnapshot()])
      .then(([raw]) => {
        if (!active) return;
        if (raw) {
          const restored = sanitize(JSON.parse(raw) as Partial<PersistedState>);
          // Apply before the state update so the first visible render already
          // uses the stored palette.
          applyTheme(restored.theme);
          setState(restored);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify(state)).catch(() => undefined);
  }, [ready, state]);

  // Restore the server session on launch. A rejected token is dropped, so a
  // revoked sign-in cannot keep showing a record. A network failure keeps the
  // cached user, matching the app's offline behaviour.
  useEffect(() => {
    let active = true;
    (async () => {
      const token = await readAuthToken();
      if (!active || !token) return;
      setAuthToken(token);
      setActiveAuthToken(token);
      const result = await fetchSessionUser(token);
      if (!active) return;
      if (result && 'unauthorized' in result) {
        await clearAuthToken();
        if (!active) return;
        void clearMailCache();
        setAuthToken(null);
        setActiveAuthToken(null);
        setState((current) => ({ ...current, user: null, sessionAccount: null, sessionMode: null, sessionName: null, sessionEmail: null, sessionSubject: null, mailAccount: null, oidcSessionId: null }));
        return;
      }
      if (result && 'user' in result) {
        setState((current) => ({ ...current, ...sessionFields(result.user) }));
      }
    })().catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const api = useMemo<AppContextValue>(() => {
    /** Sign-in: persist the server token, then the user and its mirrored fields. */
    const establish = (session: AuthSession, extra: Partial<PersistedState> = {}) => {
      setAuthToken(session.token);
      setActiveAuthToken(session.token);
      void saveAuthToken(session.token);
      setState((current) => ({ ...current, ...sessionFields(session.user), ...extra }));
    };

    return {
      ...state,
      ready,
      authToken,
      signInDemo: async (account) => {
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
      signInLocal: async (account) => {
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
      signInCampus: (profile) => {
        const studies = profile.studies ?? state.campusStudies;
        const activeStudyId =
          profile.activeStudyId !== undefined && profile.activeStudyId !== null
            ? profile.activeStudyId
            : pickActiveStudyId(studies, state.activeStudyId);
        const extra: Partial<PersistedState> = {
          oidcSessionId: null,
          // A fresh login replaces the tree so nodes from another study never linger.
          curriculumNodes: profile.nodes ?? state.curriculumNodes,
          curriculumStudyId: profile.nodes ? (profile.studyId ?? null) : state.curriculumStudyId,
          campusStudies: studies,
          activeStudyId,
          syncAt: { ...state.syncAt, campus: new Date().toISOString() },
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
      setCurriculum: (nodes, options) =>
        setState((current) => {
          const studyId = options?.studyId !== undefined ? options.studyId : current.curriculumStudyId;
          if (options?.replace || (studyId !== null && studyId !== undefined && studyId !== current.curriculumStudyId)) {
            return { ...current, curriculumNodes: nodes, curriculumStudyId: studyId ?? null };
          }
          const map = new Map(current.curriculumNodes.map((node) => [node.id, node]));
          for (const node of nodes) map.set(node.id, node);
          return { ...current, curriculumNodes: [...map.values()], curriculumStudyId: studyId ?? current.curriculumStudyId };
        }),
      setStudies: (studies) =>
        setState((current) => ({ ...current, campusStudies: studies, activeStudyId: pickActiveStudyId(studies, current.activeStudyId) })),
      setActiveStudy: (studyId) =>
        setState((current) =>
          current.campusStudies.some((item) => item.studyId === studyId) ? { ...current, activeStudyId: studyId } : current,
        ),
      signInOidc: (profile) => {
        const extra: Partial<PersistedState> = {
          oidcSessionId: profile.sessionId,
          curriculumNodes: [],
          curriculumStudyId: null,
          campusStudies: [],
          activeStudyId: null,
          syncAt: { ...state.syncAt, siam: new Date().toISOString() },
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
      setMailAccount: (account) => setState((current) => (current.mailAccount === account ? current : { ...current, mailAccount: account })),
      refreshUser: async () => {
        const token = getActiveAuthToken();
        if (!token) return;
        const result = await fetchSessionUser(token);
        if (result && 'unauthorized' in result) {
          await clearAuthToken();
          setAuthToken(null);
          setActiveAuthToken(null);
          setState((current) => ({ ...current, user: null, sessionAccount: null, sessionMode: null, sessionName: null, sessionEmail: null, sessionSubject: null, mailAccount: null }));
          return;
        }
        if (result && 'user' in result) {
          setState((current) => ({ ...current, ...sessionFields(result.user) }));
        }
      },
      linkAccount: async (platform, account, status = 'connected', source = 'client') => {
        const user = await linkServerPlatform(getActiveAuthToken(), platform, account, status, source);
        if (user) setState((current) => ({ ...current, user, mailAccount: platform === 'mail' ? account : current.mailAccount ?? findPlatform(user, 'mail')?.account ?? null }));
      },
      syncAccount: async (platform) => {
        const user = await syncServerPlatform(getActiveAuthToken(), platform);
        if (!user) return;
        setState((current) => ({
          ...current,
          user,
          syncAt: platform === 'mail' ? current.syncAt : { ...current.syncAt, [platform]: new Date().toISOString() },
        }));
      },
      unlinkAccount: async (platform) => {
        const user = await unlinkServerPlatform(getActiveAuthToken(), platform);
        if (user) {
          if (platform === 'mail') void clearMailCache();
          setState((current) => ({ ...current, user, mailAccount: platform === 'mail' ? null : current.mailAccount }));
        }
      },
      signOut: () => {
        void logoutServerSession(authToken);
        void clearAuthToken();
        void clearMailCache();
        setAuthToken(null);
        setActiveAuthToken(null);
        setState((current) => ({
          ...current,
          user: null,
          sessionAccount: null,
          sessionMode: null,
          sessionName: null,
          sessionEmail: null,
          sessionSubject: null,
          mailAccount: null,
          oidcSessionId: null,
          curriculumNodes: [],
          curriculumStudyId: null,
          campusStudies: [],
          activeStudyId: null,
        }));
      },
      setLocale: (locale) => setState((current) => ({ ...current, locale })),
      setTheme: (theme) => {
        if (theme === state.theme) return;
        applyTheme(theme);
        setState((current) => ({ ...current, theme }));
      },
      setDesign: (design) => setState((current) => (current.design === design ? current : { ...current, design })),
      syncPlatform: (platform) =>
        setState((current) => ({
          ...current,
          syncAt: { ...current.syncAt, [platform]: new Date().toISOString() },
          downloadedIds:
            platform === 'ilias'
              ? [...new Set([...current.downloadedIds, ...documents.filter((item) => item.source === 'ilias').map((item) => item.id)])]
              : current.downloadedIds,
        })),
      toggleDownload: (id) =>
        setState((current) => ({
          ...current,
          downloadedIds: current.downloadedIds.includes(id)
            ? current.downloadedIds.filter((item) => item !== id)
            : [...current.downloadedIds, id],
        })),
      addImport: (document) => setState((current) => ({ ...current, imports: [document, ...current.imports].slice(0, 40) })),
      toggleShare: (id) =>
        setState((current) => ({
          ...current,
          imports: current.imports.map((item) => (item.id === id ? { ...item, shared: !item.shared } : item)),
        })),
      addReview: (review) => setState((current) => ({ ...current, reviews: [review, ...current.reviews] })),
      saveTransfer: (draft) => setState((current) => ({ ...current, transfers: [draft, ...current.transfers.filter((item) => item.id !== draft.id)] })),
      removeTransfer: (id) => setState((current) => ({ ...current, transfers: current.transfers.filter((item) => item.id !== id) })),
      addMessage: (message) => setState((current) => ({ ...current, messages: [...current.messages, message].slice(-40) })),
      replaceMessage: (message) =>
        setState((current) => ({
          ...current,
          messages: current.messages.map((item) => (item.id === message.id ? message : item)),
        })),
      clearChat: () => setState((current) => ({ ...current, messages: [] })),
      togglePlanned: (id) =>
        setState((current) => ({
          ...current,
          plannedIds: current.plannedIds.includes(id) ? current.plannedIds.filter((item) => item !== id) : [...current.plannedIds, id],
        })),
      reset: () =>
        setState((current) => ({
          ...empty,
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
    };
  }, [ready, state, authToken]);

  return <AppContext.Provider value={api}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp must be used inside AppStateProvider');
  return value;
}
