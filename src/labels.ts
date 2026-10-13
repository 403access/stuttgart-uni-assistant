import type { Campus, Locale, ModuleStatus, NewsSource, PlaceKind, PlatformId } from '@/src/types';
import { tx } from '@/src/text';

export function moduleStatus(status: ModuleStatus, locale: Locale): string {
  if (status === 'passed') return tx(locale, 'Bestanden', 'Passed');
  if (status === 'enrolled') return tx(locale, 'Belegt', 'Enrolled');
  return tx(locale, 'Offen', 'Open');
}

export function sessionKind(kind: string, locale: Locale): string {
  if (kind === 'lecture') return tx(locale, 'Vorlesung', 'Lecture');
  if (kind === 'exercise') return tx(locale, 'Übung', 'Exercise');
  return tx(locale, 'Seminar', 'Seminar');
}

export function campusName(campus: Campus, locale: Locale): string {
  return campus === 'vaihingen' ? 'Vaihingen' : tx(locale, 'Stadtmitte', 'Stadtmitte');
}

export function platformName(id: PlatformId): string {
  if (id === 'campus') return 'C@MPUS';
  if (id === 'ilias') return 'ILIAS';
  if (id === 'sdg') return 'SDG Campus';
  return 'SIAM';
}

export function newsSource(source: NewsSource, locale: Locale): string {
  if (source === 'stuvus') return 'stuvus';
  if (source === 'faculty') return tx(locale, 'Fakultät', 'Faculty');
  if (source === 'institute') return tx(locale, 'Institut', 'Institute');
  if (source === 'sdg') return 'SDG Campus';
  return tx(locale, 'Universität', 'University');
}

export function placeKind(kind: PlaceKind, locale: Locale): string {
  const labels: Record<PlaceKind, [string, string]> = {
    lecture: ['Hörsaal', 'Lecture hall'],
    exercise: ['Übungsraum', 'Exercise room'],
    seminar: ['Seminarraum', 'Seminar room'],
    office: ['Sprechzimmer', 'Office hour room'],
    library: ['Bibliothek', 'Library'],
    mensa: ['Mensa', 'Cafeteria'],
    study: ['Lernort', 'Study space'],
    transit: ['Haltestelle', 'Stop'],
  };
  const pair = labels[kind];
  return tx(locale, pair[0], pair[1]);
}
