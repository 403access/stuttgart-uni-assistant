import { Appearance } from 'react-native';
import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';

import { themes, type ThemeColors } from '@ua/design-tokens/theme';
import type { ThemeMode } from '@/src/types';

export { themes };
export type { ThemeColors };

export const colors: ThemeColors = { ...themes.light };

type StyleMap = Record<string, ViewStyle | TextStyle | ImageStyle>;

const rebuilders = new Set<() => void>();

/**
 * A style map whose entries are replaced when the theme changes. Reference it
 * as usual (`styles.card`); each access yields a fresh object, which is what
 * React Native needs to repaint.
 */
export function themedStyles<T extends StyleMap>(factory: (colors: ThemeColors) => T): T {
  const styles = factory(colors);
  rebuilders.add(() => {
    const next = factory(colors);
    for (const key of Object.keys(styles)) delete (styles as Record<string, unknown>)[key];
    Object.assign(styles, next);
  });
  return styles;
}

/**
 * Same idea for single style objects or style fragments defined at module
 * level (`const row = { color: colors.inkSoft }`). The returned object is
 * updated in place, so pass it as a fresh spread (`style={{ ...row }}`) from
 * render code. React Native compares style props by reference.
 */
export function themedStyle<T extends object>(factory: (colors: ThemeColors) => T): T {
  const value = factory(colors);
  rebuilders.add(() => {
    const next = factory(colors);
    for (const key of Object.keys(value)) delete (value as Record<string, unknown>)[key];
    Object.assign(value, next);
  });
  return value;
}

/** Apply a palette. Call before the state update that re-renders the app. */
export function applyTheme(mode: ThemeMode): void {
  Object.assign(colors, themes[mode]);
  // Keep native surfaces (keyboard, pickers, system sheets) in the chosen
  // appearance instead of following the OS setting independently. React Native
  // Web has no override, so guard the call there.
  if (typeof Appearance.setColorScheme === 'function') Appearance.setColorScheme(mode);
  for (const rebuild of rebuilders) rebuild();
}

export const space = {
  screen: 20,
  card: 16,
};
