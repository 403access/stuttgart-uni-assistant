import { Appearance } from 'react-native';
import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';

import type { ThemeMode } from '@/src/types';

/**
 * Semantic palette. The keys predate the theme support and are kept so screens
 * do not need a mapping layer; `blue` is the accent used for text/icons,
 * `brand` the solid blue behind white text.
 */
export type ThemeColors = {
  anthracite: string;
  blue: string;
  blueSoft: string;
  brand: string;
  light: string;
  lightSoft: string;
  paper: string;
  mist: string;
  line: string;
  inkSoft: string;
  mute: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  /** Solid toast backgrounds; white text needs a dark surface in both themes. */
  toastInfo: string;
  toastSuccess: string;
  toastError: string;
  /** Surface that stays dark in both themes (calendar hero). */
  inverse: string;
  /** Decorative screen backdrop: cyan glows and the faint dot grid. */
  ambientGlow: string;
  ambientGlowSoft: string;
  ambientDot: string;
};

const lightColors: ThemeColors = {
  anthracite: '#323232',
  blue: '#004191',
  blueSoft: '#E6EEF7',
  brand: '#004191',
  light: '#00BEFF',
  lightSoft: '#E5F8FF',
  paper: '#FFFFFF',
  mist: '#F3F6F8',
  line: '#E1E5E8',
  inkSoft: '#5E666E',
  mute: '#8B939A',
  success: '#1C6B45',
  successSoft: '#E5F4EC',
  warning: '#8A5A00',
  warningSoft: '#FBF3E4',
  danger: '#8E2F2F',
  dangerSoft: '#F8E8E8',
  toastInfo: '#004191',
  toastSuccess: '#1C6B45',
  toastError: '#8E2F2F',
  inverse: '#323232',
  ambientGlow: 'rgba(0, 190, 255, 0.22)',
  ambientGlowSoft: 'rgba(0, 65, 145, 0.08)',
  ambientDot: 'rgba(0, 65, 145, 0.09)',
};

const darkColors: ThemeColors = {
  anthracite: '#F1F4F7',
  blue: '#6CB4FF',
  blueSoft: '#152B42',
  brand: '#1E5FA8',
  light: '#38C6FF',
  lightSoft: '#0D2B36',
  paper: '#171B21',
  mist: '#0E1116',
  line: '#2B323C',
  inkSoft: '#A9B3BE',
  mute: '#79828D',
  success: '#5FD3A0',
  successSoft: '#102A1F',
  warning: '#F0C064',
  warningSoft: '#2C2415',
  danger: '#FF9B9B',
  dangerSoft: '#331A1C',
  toastInfo: '#1E5FA8',
  toastSuccess: '#246B4C',
  toastError: '#7A2F35',
  inverse: '#232A33',
  ambientGlow: 'rgba(56, 198, 255, 0.16)',
  ambientGlowSoft: 'rgba(30, 95, 168, 0.2)',
  ambientDot: 'rgba(108, 180, 255, 0.14)',
};

export const themes: Record<ThemeMode, ThemeColors> = {
  light: lightColors,
  dark: darkColors,
};

/**
 * Mutable palette object. Every import keeps pointing at this object, so inline
 * `colors.x` reads during render see the active theme. Static style objects
 * created at module load must go through `themedStyles`/`themedStyle` below.
 */
export const colors: ThemeColors = { ...lightColors };

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
