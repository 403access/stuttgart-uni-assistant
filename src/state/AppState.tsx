/**
 * Public entry point for the app store. Screens read state with
 * `useAppSelector` and call stable actions from `appActions`; the store itself
 * lives outside React in `app-store.ts`.
 */
export { AppStateProvider } from '@/src/state/AppStateProvider';
export { appActions } from '@/src/state/actions';
export { appStore, getAppState, type AppStoreState } from '@/src/state/app-store';
export { useAppSelector, useAppState } from '@/src/state/use-app-store';
export { APP_STATE_STORAGE_KEY, pickActiveStudyId } from '@/src/state/persisted';
export type { CampusSignInProfile, OidcSignInProfile } from '@/src/state/actions/sign-in';
