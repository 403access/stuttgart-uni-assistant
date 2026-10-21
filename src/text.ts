import type { Locale, Localized } from '@/src/types';

// Locale strings live in `src/i18n`; re-exported here so existing imports of `tx`
// keep working. Prefer importing from `@/src/i18n` in new code.
export { t, tx, type TranslationKey, type TranslateValues } from '@/src/i18n';

export function pick(value: Localized, locale: Locale): string {
  return value[locale];
}

export function formatDate(iso: string, locale: Locale): string {
  const [year, month, day] = iso.split('-');
  if (!year || !month || !day) return iso;
  if (locale === 'de') return `${day}.${month}.${year}`;
  return `${Number(day)} ${shortMonths.en[Number(month) - 1]} ${year}`;
}

export const shortMonths: Record<Locale, string[]> = {
  de: ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

/** `2026-10-19T14:00` → `19. Okt 2026` / `19 Oct 2026`. Date part only. */
export function formatDay(value: string, locale: Locale): string {
  const date = value.slice(0, 10);
  const [year, month, day] = date.split('-');
  const monthIndex = Number(month) - 1;
  if (!year || !month || !day || monthIndex < 0 || monthIndex > 11) return value;
  if (locale === 'de') return `${Number(day)}. ${shortMonths.de[monthIndex]} ${year}`;
  return `${Number(day)} ${shortMonths.en[monthIndex]} ${year}`;
}

/** `2026-10-19T14:00` → `14:00`. Time part only. */
export function formatTime(value: string): string {
  const match = value.match(/T(\d{2}:\d{2})/);
  return match ? match[1] : value;
}

/** Full ISO timestamp → local `20. Okt 2026, 01:57`. */
export function formatTimestamp(value: string, locale: Locale): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  return `${formatDay(localDay(date), locale)}, ${time}`;
}

export function formatGrade(value: number, locale: Locale): string {
  const text = value.toFixed(1);
  return locale === 'de' ? text.replace('.', ',') : text;
}

export const weekdays: Record<Locale, string[]> = {
  de: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};

/** Local calendar day as `YYYY-MM-DD` (never UTC-shifted). */
export function localDay(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** `2026-10-19` → `Okt` / `Oct`. */
export function monthShort(iso: string, locale: Locale): string {
  return shortMonths[locale][Number(iso.slice(5, 7)) - 1] ?? '';
}

/** Weekday name for a local ISO day, e.g. `Montag`. */
export function weekdayOf(iso: string, locale: Locale): string {
  return weekdays[locale][new Date(`${iso}T12:00:00`).getDay()] ?? '';
}

/** Shift an ISO day by N days without timezone drift. */
export function shiftDay(iso: string, delta: number): string {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + delta);
  return localDay(date);
}

export function hay(value: string): string {
  return value
    .toLowerCase()
    .replaceAll('ä', 'a')
    .replaceAll('ö', 'o')
    .replaceAll('ü', 'u')
    .replaceAll('ß', 'ss');
}

/** First value of an expo-router search param (repeated keys arrive as arrays). */
export function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

export function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Zero-width spaces after URL-ish separators so long tokens wrap instead of overflowing. */
export function breakable(value: string): string {
  return value.replace(/([/?&=_\-])/g, '$1\u200B');
}
