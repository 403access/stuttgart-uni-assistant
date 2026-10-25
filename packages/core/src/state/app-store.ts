import { createStore } from '@tanstack/store';

import { emptyState } from './persisted';
import type { PersistedState } from '../domain/types';

/**
 * The store holds both halves of the app state: the fields that survive a
 * restart and the runtime-only session values. Keeping them in one store lets
 * screens read either half through the same selector; the persistence layer
 * strips the runtime fields before writing.
 */
export interface AppStoreState extends PersistedState {
  /** Disk hydration finished; screens may decide between loading and empty. */
  ready: boolean;
  /** Bearer token of the server session, or null while offline / signed out. Never persisted in AsyncStorage. */
  authToken: string | null;
  /** Server row id of that session; stored next to the token in the device vault. */
  authSessionId: string | null;
}

export const emptyAppState: AppStoreState = {
  ...emptyState,
  ready: false,
  authToken: null,
  authSessionId: null,
};

/**
 * The single app store. It lives outside React so actions and non-React modules
 * can read and update it directly; components subscribe to the slice they need
 * with `useAppSelector` and only re-render when that slice changes.
 */
export const appStore = createStore<AppStoreState>(emptyAppState);

export function getAppState(): AppStoreState {
  return appStore.state;
}

export function updateApp(updater: (state: AppStoreState) => AppStoreState): void {
  appStore.setState(updater);
}

export function patchApp(patch: Partial<AppStoreState>): void {
  appStore.setState((state) => ({ ...state, ...patch }));
}

const persistedKeys = Object.keys(emptyState) as (keyof PersistedState)[];

/** The subset that is written to AsyncStorage; runtime session values stay in the vault. */
export function selectPersisted(state: AppStoreState): PersistedState {
  const persisted: Record<string, unknown> = {};
  for (const key of persistedKeys) {
    // Each key exists on both shapes with the same value type.
    persisted[key] = state[key];
  }
  return persisted as unknown as PersistedState;
}

/** Field-level comparison so auth-token or UI-only updates never trigger a disk write. */
export function samePersisted(left: PersistedState, right: PersistedState): boolean {
  return persistedKeys.every((key) => left[key] === right[key]);
}
