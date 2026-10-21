import { createContext, useContext } from 'react';

import type { AuthSession } from '@/src/auth/session';
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
} from '@/src/types';

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

export type AppContextValue = PersistedState & {
  ready: boolean;
  /** Bearer token of the server session, or null while offline / signed out. Never persisted in AsyncStorage. */
  authToken: string | null;
  /** Server row id of that session; stored next to the token in the device vault. */
  authSessionId: string | null;
  /** Revalidate the session; if the server rejected it, re-establish it without UI when possible. */
  refreshOrReauthenticate: () => Promise<boolean>;
  signInDemo: (account: string) => Promise<void>;
  signInLocal: (account: string) => Promise<void>;
  /** Finish a web sign-in with the session minted after the phone approved the QR code. */
  signInDevice: (session: AuthSession) => void;
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

export const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp must be used inside AppStateProvider');
  return value;
}
