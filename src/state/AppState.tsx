/**
 * Public entry point for the app store. The implementation lives in focused
 * modules next to this file; screens keep importing from `@/src/state/AppState`.
 */
export { AppStateProvider } from '@/src/state/AppStateProvider';
export { useApp } from '@/src/state/app-context';
export type { CampusSignInProfile, OidcSignInProfile } from '@/src/state/app-context';
export { APP_STATE_STORAGE_KEY, pickActiveStudyId } from '@/src/state/persisted';
