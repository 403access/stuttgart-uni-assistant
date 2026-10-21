import * as account from '@/src/state/actions/account';
import * as appearance from '@/src/state/actions/appearance';
import * as auth from '@/src/state/actions/auth-session';
import * as chat from '@/src/state/actions/chat';
import * as content from '@/src/state/actions/content';
import * as session from '@/src/state/actions/session-resume';
import * as signIn from '@/src/state/actions/sign-in';

/** Stable action handles, usable from components and plain modules alike. */
export const appActions = {
  signInDemo: signIn.signInDemo,
  signInLocal: signIn.signInLocal,
  signInDevice: signIn.signInDevice,
  signInCampus: signIn.signInCampus,
  signInOidc: signIn.signInOidc,
  refreshOrReauthenticate: session.refreshOrReauthenticate,
  refreshUser: account.refreshUser,
  linkAccount: account.linkAccount,
  syncAccount: account.syncAccount,
  unlinkAccount: account.unlinkAccount,
  signOut: auth.signOut,
  setLocale: appearance.setLocale,
  setTheme: appearance.setTheme,
  setDesign: appearance.setDesign,
  reset: appearance.reset,
  setCurriculum: content.setCurriculum,
  setStudies: content.setStudies,
  setActiveStudy: content.setActiveStudy,
  setMailAccount: content.setMailAccount,
  syncPlatform: content.syncPlatform,
  toggleDownload: content.toggleDownload,
  addImport: content.addImport,
  toggleShare: content.toggleShare,
  addReview: content.addReview,
  saveTransfer: content.saveTransfer,
  removeTransfer: content.removeTransfer,
  addMessage: chat.addMessage,
  replaceMessage: chat.replaceMessage,
  clearChat: chat.clearChat,
  togglePlanned: chat.togglePlanned,
} as const;
