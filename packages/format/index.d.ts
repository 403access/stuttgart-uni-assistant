export type Locale = 'de' | 'en';
export type Localized = { de: string; en: string };

export const shortMonths: Record<Locale, string[]>;
export const weekdays: Record<Locale, string[]>;

export function pick(value: Localized, locale: Locale): string;
export function formatDate(iso: string, locale: Locale): string;
export function formatDay(value: string, locale: Locale): string;
export function formatTime(value: string): string;
export function localDay(date?: Date): string;
export function formatTimestamp(value: string, locale: Locale): string;
export function formatGrade(value: number, locale: Locale): string;
export function monthShort(iso: string, locale: Locale): string;
export function weekdayOf(iso: string, locale: Locale): string;
export function shiftDay(iso: string, delta: number): string;
export function hay(value: string): string;
export function uid(prefix: string): string;
export function breakable(value: string): string;
export function formatBytes(size: number, locale: Locale): string;
