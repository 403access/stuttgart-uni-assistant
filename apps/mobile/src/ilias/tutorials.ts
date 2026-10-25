/** Turn the ILIAS dashboard rows into the tutorial preview used by onboarding. */

import type { IliasContent, IliasContentItem, IliasDashboard, IliasItem } from './types';

export interface IliasTutorialFile {
  id: string;
  refId: number;
  title: string;
  type: string;
  size: string;
  date: string;
  pages: string;
}

export interface IliasTutorial {
  id: string;
  refId: number;
  kind: string;
  title: string;
  /** The dashboard group, usually the course the tutorial belongs to. */
  course: string;
  type: string;
  description: string;
  teacher: string;
  schedule: string;
  room: string;
  properties: { name: string; value: string }[];
  files: IliasTutorialFile[];
  /** Every row the tutorial page exposes, including folders and links. */
  itemCount: number;
}

const TUTORIAL_WORD = /\btutor(?:ium|ien|ial|in|en)?\b/i;
const WEEKDAY = /\b(?:Mo|Di|Mi|Do|Fr|Sa|So)\.?(?:\s|,)/i;
const TIME_RANGE = /\d{1,2}[:.]\d{2}\s*[-–]\s*\d{1,2}[:.]\d{2}/;
const ROOM_CODE = /\b([A-Z]{1,3}\d{1,2}\.\d{1,3}[a-zA-Z]?)\b/;

function collapsed(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function propertyValue(item: IliasItem, pattern: RegExp): string {
  return collapsed(item.properties.find((entry) => pattern.test(entry.name))?.value ?? '');
}

/**
 * A tutorial is a group (or a course that carries the word in its title).
 * `Tutorium 5` in a mail subject is not a dashboard membership and never
 * reaches this function, so the title match is enough here.
 */
export function isTutorialItem(item: IliasItem): boolean {
  if (!item.refId) return false;
  if (item.kind !== 'grp' && item.kind !== 'crs') return false;
  return TUTORIAL_WORD.test(item.title);
}

/** Deduplicated tutorials in dashboard order, groups first. */
export function tutorialItems(dashboard: IliasDashboard): IliasItem[] {
  const seen = new Set<number>();
  return [...dashboard.groups, ...dashboard.courses, ...dashboard.memberships].filter((item) => {
    if (!isTutorialItem(item) || !item.refId || seen.has(item.refId)) return false;
    seen.add(item.refId);
    return true;
  });
}

function teacherFrom(item: IliasItem): string {
  const explicit = propertyValue(item, /^(tutor|tutorin|lehrende|dozent|verantwortlich|ansprechpartner)/i);
  if (explicit) return explicit;

  const title = collapsed(item.title);
  // "Tutorium 1: Montag, 15.45 Uhr bei Lea Heim"
  const named = title.match(/\b(?:bei|von|mit)\s+([\p{Lu}][\p{L}.'-]+(?:\s+[\p{Lu}][\p{L}.'-]+){0,3})\s*$/u);
  if (named) return collapsed(named[1]);
  // "Tutorium – Lea Heim"
  const afterSeparator = title.match(/^tutor(?:ium|ien)\b[^:–—-]*[:–—-]\s*(.+)$/i)?.[1]?.trim();
  if (afterSeparator && !TIME_RANGE.test(afterSeparator) && !WEEKDAY.test(afterSeparator)) return afterSeparator;
  // "Tutorium Penelope Martinez Halmen" (a bare name, not a number or slot)
  const bare = title.match(/^tutor(?:ium|ien)\s+(.+)$/i)?.[1]?.trim();
  if (bare && !TIME_RANGE.test(bare) && !WEEKDAY.test(bare) && !/^\d+$/.test(bare)) return bare;
  return '';
}

function scheduleFrom(item: IliasItem): string {
  const explicit = propertyValue(item, /^(termin|zeit|datum|wochentag)/i);
  if (explicit) return explicit;
  const description = collapsed(item.description);
  const range = description.match(new RegExp(`(?:${WEEKDAY.source})?[^·]*?${TIME_RANGE.source}`, 'i'))?.[0];
  if (range) return collapsed(range);
  return description && !description.toLowerCase().startsWith('raum') ? description : '';
}

function roomFrom(item: IliasItem): string {
  const explicit = propertyValue(item, /^(raum|ort|room)/i);
  if (explicit) return explicit;
  const description = collapsed(item.description);
  const labelled = description.match(/raum[:\s]+([^,;·]+)/i)?.[1];
  if (labelled) return collapsed(labelled);
  return description.match(ROOM_CODE)?.[1] ?? '';
}

function fileFrom(item: IliasContentItem): IliasTutorialFile | null {
  if (item.kind !== 'file' || !item.refId) return null;
  return {
    id: item.id,
    refId: item.refId,
    title: item.title,
    type: item.type,
    size: item.size,
    date: item.date,
    pages: item.pages,
  };
}

export function tutorialFromContent(item: IliasItem, content: IliasContent | null): IliasTutorial {
  return {
    id: item.id,
    refId: item.refId ?? 0,
    kind: item.kind || 'grp',
    title: item.title,
    course: item.group,
    type: item.type,
    description: collapsed(item.description),
    teacher: teacherFrom(item),
    schedule: scheduleFrom(item),
    room: roomFrom(item),
    properties: item.properties,
    files: (content?.items ?? []).flatMap((entry) => fileFrom(entry) ?? []),
    itemCount: content?.items.length ?? 0,
  };
}
