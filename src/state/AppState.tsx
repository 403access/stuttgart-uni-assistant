import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { documents } from '@/src/data';
import type {
  ChatMessage,
  ImportedDocument,
  Locale,
  PersistedState,
  PlatformId,
  Review,
  TransferDraft,
} from '@/src/types';

const STORAGE_KEY = 'stuttgart-uni-assistant/v1';

const empty: PersistedState = {
  locale: 'de',
  sessionAccount: null,
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
  signIn: (account: string) => void;
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

function sanitize(value: Partial<PersistedState> | null): PersistedState {
  if (!value) return empty;
  return {
    locale: value.locale === 'en' ? 'en' : 'de',
    sessionAccount: typeof value.sessionAccount === 'string' ? value.sessionAccount : null,
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
      signIn: (account) => setState((current) => ({ ...current, sessionAccount: account.trim() || 'st123456' })),
      signOut: () => setState((current) => ({ ...current, sessionAccount: null })),
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
      reset: () => setState((current) => ({ ...empty, locale: current.locale, sessionAccount: current.sessionAccount })),
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
