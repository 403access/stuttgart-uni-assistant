import type { AreaId, ModuleItem, Place, ProgramArea, TeachingSession } from '@/src/types';

export interface CreditTotals {
  earned: number;
  active: number;
  open: number;
  total: number;
  remaining: number;
}

export interface ScheduledSession {
  module: ModuleItem;
  session: TeachingSession;
  place?: Place;
}

const areaRank: AreaId[] = ['math', 'sq', 'project', 'elective', 'core', 'systems', 'practical', 'theory', 'thesis'];

export function totals(modules: ModuleItem[]): CreditTotals {
  const sum = (status: ModuleItem['status']) =>
    modules.filter((item) => item.status === status).reduce((count, item) => count + item.ects, 0);
  const earned = sum('passed');
  const active = sum('enrolled');
  const open = sum('open');
  return { earned, active, open, total: earned + active + open, remaining: active + open };
}

export function weightedAverage(modules: ModuleItem[]): number | null {
  const graded = modules.filter((item) => item.status === 'passed' && typeof item.grade === 'number');
  const ects = graded.reduce((count, item) => count + item.ects, 0);
  if (!ects) return null;
  const weight = graded.reduce((count, item) => count + (item.grade ?? 0) * item.ects, 0);
  return Math.round((weight / ects) * 10) / 10;
}

export function prerequisitesMet(module: ModuleItem, modules: ModuleItem[]): boolean {
  const byId = new Map(modules.map((item) => [item.id, item]));
  return module.prerequisites.every((id) => byId.get(id)?.status === 'passed');
}

export function lockReason(module: ModuleItem, modules: ModuleItem[]): string | null {
  const earned = totals(modules).earned;
  if ((module.minEarned ?? 0) > earned) {
    return `min:${module.minEarned}`;
  }
  const missing = module.prerequisites.filter((id) => modules.find((item) => item.id === id)?.status !== 'passed');
  if (missing.length) return `prereq:${missing.join(',')}`;
  return null;
}

export function areaTotals(modules: ModuleItem[], area: AreaId): { earned: number; active: number } {
  const items = modules.filter((item) => item.area === area);
  return {
    earned: items.filter((item) => item.status === 'passed').reduce((count, item) => count + item.ects, 0),
    active: items.filter((item) => item.status === 'enrolled').reduce((count, item) => count + item.ects, 0),
  };
}

export function suggestNextSemester(modules: ModuleItem[], areas: ProgramArea[], cap = 30): ModuleItem[] {
  const picked: ModuleItem[] = [];
  const earned = totals(modules).earned;
  const sum = () => picked.reduce((count, item) => count + item.ects, 0);
  const gap = (area: AreaId) => {
    const required = areas.find((item) => item.id === area)?.ects ?? 0;
    const have = areaTotals(modules, area).earned;
    const reserved = picked.filter((item) => item.area === area).reduce((count, item) => count + item.ects, 0);
    return required - have - reserved;
  };
  const candidates = () =>
    modules.filter(
      (item) =>
        item.status === 'open' &&
        !picked.some((chosen) => chosen.id === item.id) &&
        prerequisitesMet(item, modules) &&
        (item.minEarned ?? 0) <= earned &&
        sum() + item.ects <= cap,
    );

  const closing = candidates()
    .filter((item) => gap(item.area) > 0 && item.ects >= gap(item.area))
    .sort((a, b) => gap(a.area) - gap(b.area) || a.ects - b.ects || a.code.localeCompare(b.code));
  if (closing[0]) picked.push(closing[0]);

  for (let guard = 0; guard < 20; guard += 1) {
    const options = candidates().filter((item) => gap(item.area) > 0);
    if (!options.length) break;
    const rankedAreas = [...new Set(options.map((item) => item.area))].sort(
      (a, b) => gap(b) - gap(a) || areaRank.indexOf(a) - areaRank.indexOf(b),
    );
    const area = rankedAreas[0];
    const choice = options
      .filter((item) => item.area === area)
      .sort((a, b) => a.ects - b.ects || a.code.localeCompare(b.code))[0];
    if (!choice) break;
    picked.push(choice);
  }
  return picked;
}

export function scheduleForDay(modules: ModuleItem[], day: number, roomList: Place[]): ScheduledSession[] {
  const rows: ScheduledSession[] = [];
  for (const module of modules) {
    if (module.status === 'passed') continue;
    for (const session of module.sessions) {
      if (session.day !== day) continue;
      rows.push({ module, session, place: roomList.find((place) => place.id === session.roomId) });
    }
  }
  return rows.sort((a, b) => a.session.start.localeCompare(b.session.start));
}

export function suggestRecognitionTarget(title: string, modules: ModuleItem[]): ModuleItem | undefined {
  const words = title
    .toLowerCase()
    .split(/[^a-z0-9äöüß+]+/i)
    .filter((word) => word.length > 3);
  const ranked = modules
    .map((module) => {
      const blob = `${module.title.de} ${module.title.en} ${module.aliases.join(' ')}`.toLowerCase();
      const score = words.reduce((count, word) => count + (blob.includes(word) ? word.length : 0), 0);
      return { module, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
  return ranked[0]?.module ?? modules.find((module) => module.status === 'open' && module.area === 'elective');
}

export function searchModules(modules: ModuleItem[], query: string): ModuleItem[] {
  const words = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return modules;
  return modules.filter((module) => {
    const blob = [
      module.code,
      module.title.de,
      module.title.en,
      module.summary.de,
      module.summary.en,
      ...module.topics.de,
      ...module.topics.en,
      ...module.aliases,
    ]
      .join(' ')
      .toLowerCase();
    return words.every((word) => blob.includes(word));
  });
}
