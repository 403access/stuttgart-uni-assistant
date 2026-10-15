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

const shortMonths: Record<Locale, string[]> = {
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
