import { tx } from '@/src/text';
import type { Locale, SessionMode } from '@/src/types';

export function modeLabel(mode: SessionMode, locale: Locale): string {
  if (mode === 'campus') return tx(locale, 'konto.modus.campus');
  if (mode === 'oidc') return tx(locale, 'konto.modus.oidc');
  if (mode === 'demo') return tx(locale, 'konto.modus.demo');
  return tx(locale, 'konto.modus.local');
}

export function formatStamp(value: string | null, locale: Locale): string {
  if (!value) return tx(locale, 'konto.nie');
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(locale === 'de' ? 'de-DE' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}
