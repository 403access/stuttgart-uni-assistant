import { useSyncExternalStore } from 'react';
import { Dimensions, Platform } from 'react-native';

/**
 * Layout breakpoints for the web build. Native always keeps the phone layout,
 * so these only ever switch between the mobile shell and the desktop shell.
 */
export const BREAKPOINTS = {
  /**
   * From here on the bottom tab bar makes way for the sidebar. Kept above the
   * tablet breakpoint so a 1024-wide browser still gets the roomy phone shell
   * instead of a squeezed sidebar layout.
   */
  desktop: 1200,
  /** Very wide screens get roomier containers and more grid columns. */
  wide: 1440,
} as const;

export type Responsive = {
  width: number;
  height: number;
  isWeb: boolean;
  /** The classic phone layout (also used by a narrow browser window). */
  isPhone: boolean;
  /** Tablet-sized browser window: still the mobile shell, roomier content. */
  isTablet: boolean;
  /** Web only: sidebar shell and multi-column layouts. */
  isDesktop: boolean;
  /** Web only: extra-wide desktop (4-column grids). */
  isWide: boolean;
};

function subscribe(callback: () => void): () => void {
  const subscription = Dimensions.addEventListener('change', callback);
  return () => subscription.remove();
}

/** Dimensions only supports one listener shape; the cached string keeps the snapshot stable. */
let cached = '';

function getSnapshot(): string {
  const { width, height } = Dimensions.get('window');
  const next = `${width}x${height}`;
  if (next !== cached) cached = next;
  return cached;
}

/**
 * Static rendering has no window, so it reports zero and paints the mobile
 * shell. React uses this server snapshot for the hydration pass as well, then
 * swaps to the real size, which keeps hydration warning-free and still shows
 * the desktop shell on the very next render.
 */
function getServerSnapshot(): string {
  return '0x0';
}

/**
 * One place for every width-dependent decision. `useSyncExternalStore` lets the
 * server and first client render agree on the phone layout while still
 * subscribing to later resizes.
 */
export function useResponsive(): Responsive {
  const isWeb = Platform.OS === 'web';
  // Native has no server render: the real size is the hydration snapshot.
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, isWeb ? getServerSnapshot : getSnapshot);
  const [rawWidth, rawHeight] = snapshot.split('x');
  const width = Number(rawWidth) || 0;
  const height = Number(rawHeight) || 0;

  return {
    width,
    height,
    isWeb,
    isPhone: width < 768,
    isTablet: isWeb && width >= 768 && width < BREAKPOINTS.desktop,
    isDesktop: isWeb && width >= BREAKPOINTS.desktop,
    isWide: isWeb && width >= BREAKPOINTS.wide,
  };
}
