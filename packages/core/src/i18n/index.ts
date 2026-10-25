import { de, type TranslationKey } from './de';
import { en } from './en';
import type { Locale } from '../domain/types';

export type { TranslationKey };

/**
 * Every user-facing string in the app lives in `de.ts` / `en.ts` and is looked
 * up here by key. Positional `{0}`, `{1}`, … placeholders in the values are
 * filled from `values`.
 */
const catalogs: Record<Locale, Record<TranslationKey, string>> = { de, en };

export type TranslateValues = readonly (string | number | undefined)[];

export function tx(locale: Locale, key: TranslationKey, values: TranslateValues = []): string {
  const template = catalogs[locale][key] ?? key;
  if (!values.length) return template;
  return template.replace(/\{(\d+)\}/g, (match, index: string) => {
    const position = Number(index);
    return position < values.length ? String(values[position]) : match;
  });
}

/** Convenience alias for `tx`. */
export const t = tx;
