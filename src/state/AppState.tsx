import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { documents } from '@/src/data';
import type {
  CampusStudy,
  ChatMessage,
  CurriculumNode,
  ImportedDocument,
  Locale,
  PersistedState,
  PlatformId,
  Review,
  SessionMode,
  TransferDraft,
} from '@/src/types';

const STORAGE_KEY = 'stuttgart-uni-assistant/v1';

const empty: PersistedState = {
  locale: 'de',
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

type AppContextValue = PersistedState & {
  ready: boolean;
  signInDemo: (account: string) => void;
  signInLocal: (account: string) => void;
  signInCampus: (profile: { account: string; name: string; nodes?: CurriculumNode[]; studyId?: number | null; studies?: CampusStudy[]; activeStudyId?: number | null }) => void;
  setCurriculum: (nodes: CurriculumNode[], options?: { studyId?: number | null; replace?: boolean }) => void;
  setStudies: (studies: CampusStudy[]) => void;
  setActiveStudy: (studyId: number) => void;
  signInOidc: (profile: { account: string; name: string | null; email: string | null; subject: string | null; sessionId: string }) => void;
  setMailAccount: (account: string | null) => void;
  signOut: () => void;
  setLocale: (locale: Locale) => void;
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
  return {
    locale: value.locale === 'en' ? 'en' : 'de',
    sessionAccount: typeof value.sessionAccount === 'string' ? value.sessionAccount : null,
    sessionMode: value.sessionMode === 'oidc' || value.sessionMode === 'demo' || value.sessionMode === 'local' || value.sessionMode === 'campus' ? value.sessionMode : null,
    sessionName: typeof value.sessionName === 'string' ? value.sessionName : null,
    sessionEmail: typeof value.sessionEmail === 'string' ? value.sessionEmail : null,
    sessionSubject: typeof value.sessionSubject === 'string' ? value.sessionSubject : null,
    mailAccount: typeof value.mailAccount === 'string' ? value.mailAccount : null,
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

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedState>(empty);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!active) return;
        if (raw) setState(sanitize(JSON.parse(raw) as Partial<PersistedState>));
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
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => undefined);
  }, [ready, state]);

  const api = useMemo<AppContextValue>(
    () => ({
      ...state,
      ready,
      signInDemo: (account) =>
        setState((current) => ({
          ...current,
          sessionAccount: account.trim() || 'st123456',
          sessionMode: 'demo' satisfies SessionMode,
          sessionName: null,
          sessionEmail: null,
          sessionSubject: null,
          oidcSessionId: null,
          curriculumNodes: [],
          curriculumStudyId: null,
          campusStudies: [],
          activeStudyId: null,
        })),
      signInLocal: (account) =>
        setState((current) => ({
          ...current,
          sessionAccount: account.trim(),
          sessionMode: 'local',
          sessionName: null,
          sessionEmail: null,
          sessionSubject: null,
          oidcSessionId: null,
          curriculumNodes: [],
          curriculumStudyId: null,
          campusStudies: [],
          activeStudyId: null,
        })),
      signInCampus: (profile) =>
        setState((current) => {
          const studies = profile.studies ?? current.campusStudies;
          const activeStudyId =
            profile.activeStudyId !== undefined && profile.activeStudyId !== null
              ? profile.activeStudyId
              : pickActiveStudyId(studies, current.activeStudyId);
          return {
            ...current,
            sessionAccount: profile.account,
            sessionMode: 'campus',
            sessionName: profile.name,
            sessionEmail: null,
            sessionSubject: null,
            oidcSessionId: null,
            // A fresh login replaces the tree so nodes from another study never linger.
            curriculumNodes: profile.nodes ?? current.curriculumNodes,
            curriculumStudyId: profile.nodes ? (profile.studyId ?? null) : current.curriculumStudyId,
            campusStudies: studies,
            activeStudyId,
            syncAt: { ...current.syncAt, campus: new Date().toISOString() },
          };
        }),
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
      signInOidc: (profile) =>
        setState((current) => ({
          ...current,
          sessionAccount: profile.account,
          sessionMode: 'oidc',
          sessionName: profile.name,
          sessionEmail: profile.email,
          sessionSubject: profile.subject,
          oidcSessionId: profile.sessionId,
          curriculumNodes: [],
          curriculumStudyId: null,
          campusStudies: [],
          activeStudyId: null,
          syncAt: { ...current.syncAt, siam: new Date().toISOString() },
        })),
      setMailAccount: (account) => setState((current) => (current.mailAccount === account ? current : { ...current, mailAccount: account })),
      signOut: () =>
        setState((current) => ({
          ...current,
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
        })),
      setLocale: (locale) => setState((current) => ({ ...current, locale })),
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
    [ready, state],
  );

  return <AppContext.Provider value={api}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp must be used inside AppStateProvider');
  return value;
}
