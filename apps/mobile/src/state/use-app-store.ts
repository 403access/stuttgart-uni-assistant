import { useSelector } from '@tanstack/react-store';

import { appStore, type AppStoreState } from '@ua/core/state/app-store';

/**
 * Subscribe a component to one slice of the app store. The selector must
 * return a stable value (a primitive or an existing reference); select several
 * fields with several calls instead of building a new object on every read.
 */
export function useAppSelector<T>(
  selector: (state: AppStoreState) => T,
  compare?: (left: T, right: T) => boolean,
): T {
  return useSelector(appStore, selector, compare ? { compare } : undefined);
}

/** Whole-store subscription. Reserved for the diagnostics screen, which renders every field. */
export function useAppState(): AppStoreState {
  return useSelector(appStore);
}
