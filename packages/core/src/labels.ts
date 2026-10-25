import type { Campus, CurriculumNode, Locale, ModuleStatus, NewsSource, PlaceKind, PlatformId } from './domain/types';
import { tx } from './format';

export function moduleStatus(status: ModuleStatus, locale: Locale): string {
  if (status === 'passed') return tx(locale, 'labels.bestanden');
  if (status === 'enrolled') return tx(locale, 'labels.belegt');
  return tx(locale, 'common.offen');
}

export function sessionKind(kind: string, locale: Locale): string {
  if (kind === 'lecture') return tx(locale, 'labels.vorlesung');
  if (kind === 'exercise') return tx(locale, 'labels.uebung');
  return tx(locale, 'labels.seminar');
}

export function campusName(campus: Campus, locale: Locale): string {
  return campus === 'vaihingen' ? 'Vaihingen' : tx(locale, 'labels.stadtmitte');
}

export function platformName(id: PlatformId): string {
  if (id === 'campus') return 'C@MPUS';
  if (id === 'ilias') return 'ILIAS';
  if (id === 'sdg') return 'SDG Campus';
  return 'SIAM';
}

export function newsSource(source: NewsSource, locale: Locale): string {
  if (source === 'stuvus') return 'stuvus';
  if (source === 'faculty') return tx(locale, 'labels.fakultaet');
  if (source === 'institute') return tx(locale, 'labels.institut');
  if (source === 'sdg') return 'SDG Campus';
  return tx(locale, 'labels.universitaet');
}

/** Completion flags of a curriculum node as one line: `abgeschlossen · in Arbeit`. */
export function curriculumProgress(node: CurriculumNode, locale: Locale): string | undefined {
  const parts = [
    node.completed ? tx(locale, 'common.abgeschlossen') : '',
    node.inProgress ? tx(locale, 'common.arbeit') : '',
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : undefined;
}

/** One search-row line for a curriculum node: element type plus completion flags. */
export function curriculumDetail(node: CurriculumNode, locale: Locale): string | undefined {
  const parts = [node.elementType, curriculumProgress(node, locale)].filter(Boolean);
  return parts.length ? parts.join(' · ') : undefined;
}

export function placeKind(kind: PlaceKind, locale: Locale): string {
  if (kind === 'lecture') return tx(locale, 'labels.hoersaal');
  if (kind === 'exercise') return tx(locale, 'labels.uebungsraum');
  if (kind === 'seminar') return tx(locale, 'labels.seminarraum');
  if (kind === 'office') return tx(locale, 'labels.sprechzimmer');
  if (kind === 'library') return tx(locale, 'labels.bibliothek');
  if (kind === 'mensa') return tx(locale, 'labels.mensa');
  if (kind === 'study') return tx(locale, 'labels.lernort');
  return tx(locale, 'labels.haltestelle');
}
