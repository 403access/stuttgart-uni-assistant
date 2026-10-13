import type { Locale, Localized } from '@/src/types';

export function tx(locale: Locale, de: string, en: string): string {
  return locale === 'de' ? de : en;
}

export function pick(value: Localized, locale: Locale): string {
  return value[locale];
}

export function formatDate(iso: string, locale: Locale): string {
  const [year, month, day] = iso.split('-');
  if (!year || !month || !day) return iso;
  if (locale === 'de') return `${day}.${month}.${year}`;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${Number(day)} ${months[Number(month) - 1]} ${year}`;
}

export function formatGrade(value: number, locale: Locale): string {
  const text = value.toFixed(1);
  return locale === 'de' ? text.replace('.', ',') : text;
}

export const weekdays: Record<Locale, string[]> = {
  de: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};

export function hay(value: string): string {
  return value
    .toLowerCase()
    .replaceAll('ä', 'a')
    .replaceAll('ö', 'o')
    .replaceAll('ü', 'u')
    .replaceAll('ß', 'ss');
}

export function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
