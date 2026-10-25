import type { Locale, Localized } from '@/src/types';

// Locale strings live in `src/i18n`; re-exported here so existing imports of `tx`
// keep working. Prefer importing from `@/src/i18n` in new code.
export {
  breakable,
  formatBytes,
  formatDate,
  formatDay,
  formatGrade,
  formatTime,
  formatTimestamp,
  hay,
  localDay,
  monthShort,
  pick,
  shiftDay,
  shortMonths,
  uid,
  weekdays,
  weekdayOf,
} from '@ua/format';
export { t, tx, type TranslationKey, type TranslateValues } from '@/src/i18n';

/** First value of an expo-router search param (repeated keys arrive as arrays). */
export function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

// Kept for callers that import the type from this module.
export type { Locale, Localized };
