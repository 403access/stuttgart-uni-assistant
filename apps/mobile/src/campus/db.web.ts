import AsyncStorage from '@react-native-async-storage/async-storage';

import type { CampusLogEntry, PersistedApiCall } from '@/src/auth/campus-log';
import type { BulkCourse, CampusCourse, CurriculumNode } from '@/src/types';

/**
 * Web implementation of the curriculum cache (`src/campus/db.ts` is the
 * native one). `expo-sqlite` is intentionally not imported here: its web
 * worker breaks Metro bundling without a wasm/SharedArrayBuffer setup, so on
 * web the rows live in `localStorage` via AsyncStorage under the same API.
 */
export interface CurriculumSyncInfo {
  studyId: number;
  rootElementId: number | null;
  nodeCount: number;
  finishedAt: string | null;
  complete: boolean;
}

export interface CoursesSyncInfo {
  studyId: number;
  courseCount: number;
  elementsFetched: number;
  finishedAt: string | null;
  complete: boolean;
}

interface WebEntry {
  nodes: CurriculumNode[];
  expanded: number[];
  sync: { rootElementId: number | null; nodeCount: number; finishedAt: string; complete: boolean } | null;
}

const PREFIX = 'campus-cache/web/';

function key(studyId: number): string {
  return `${PREFIX}${studyId}`;
}

function sanitize(value: unknown): WebEntry {
  const empty: WebEntry = { nodes: [], expanded: [], sync: null };
  if (!value || typeof value !== 'object') return empty;
  const entry = value as Partial<WebEntry>;
  return {
    nodes: Array.isArray(entry.nodes) ? entry.nodes.filter((node) => node && typeof node.id === 'number') : [],
    expanded: Array.isArray(entry.expanded) ? entry.expanded.filter((id): id is number => typeof id === 'number') : [],
    sync: entry.sync && typeof entry.sync === 'object' ? (entry.sync as WebEntry['sync']) : null,
  };
}

async function read(studyId: number): Promise<WebEntry> {
  try {
    const raw = await AsyncStorage.getItem(key(studyId));
    return sanitize(raw ? (JSON.parse(raw) as unknown) : null);
  } catch {
    return { nodes: [], expanded: [], sync: null };
  }
}

/** Replace the cached tree of one study. Partial syncs are stored with `complete: false`. */
export async function saveFullStructure(
  studyId: number,
  rootElementId: number | null,
  nodes: CurriculumNode[],
  expandedIds: number[],
  complete: boolean,
): Promise<void> {
  const fetchedAt = new Date().toISOString();
  await AsyncStorage.setItem(
    key(studyId),
    JSON.stringify({
      nodes,
      expanded: expandedIds,
      sync: { rootElementId, nodeCount: nodes.length, finishedAt: fetchedAt, complete },
    } satisfies WebEntry),
  );
}

export async function loadCachedNodes(studyId: number): Promise<CurriculumNode[]> {
  return (await read(studyId)).nodes;
}

/** Element ids whose structure call already succeeded — the resume frontier skips them. */
export async function loadExpandedIds(studyId: number): Promise<number[]> {
  return (await read(studyId)).expanded;
}

export async function getSyncInfo(studyId: number): Promise<CurriculumSyncInfo | null> {
  const entry = await read(studyId);
  if (!entry.sync) return null;
  return { studyId, ...entry.sync };
}

export async function clearCachedStudy(studyId: number): Promise<void> {
  await AsyncStorage.removeItem(key(studyId)).catch(() => undefined);
}

export async function clearCachedCourses(studyId: number): Promise<void> {
  await AsyncStorage.removeItem(coursesKey(studyId)).catch(() => undefined);
}

export async function clearApiLog(): Promise<void> {
  await AsyncStorage.removeItem(API_KEY).catch(() => undefined);
}

interface CoursesWebEntry {
  courses: BulkCourse[];
  fetched: number[];
  sync: { courseCount: number; elementsFetched: number; finishedAt: string; complete: boolean } | null;
}

function coursesKey(studyId: number): string {
  return `${PREFIX}courses/${studyId}`;
}

async function readCoursesEntry(studyId: number): Promise<CoursesWebEntry> {
  try {
    const raw = await AsyncStorage.getItem(coursesKey(studyId));
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== 'object') return { courses: [], fetched: [], sync: null };
    const entry = parsed as Partial<CoursesWebEntry>;
    return {
      courses: Array.isArray(entry.courses) ? entry.courses.filter((course) => course && typeof course.id === 'number') : [],
      fetched: Array.isArray(entry.fetched) ? entry.fetched.filter((id): id is number => typeof id === 'number') : [],
      sync: entry.sync && typeof entry.sync === 'object' ? (entry.sync as CoursesWebEntry['sync']) : null,
    };
  } catch {
    return { courses: [], fetched: [], sync: null };
  }
}

/** Replace the cached courses of one study, keeping every element each course was seen on. */
export async function saveCourses(
  studyId: number,
  courses: BulkCourse[],
  fetchedElementIds: number[],
  complete: boolean,
): Promise<void> {
  const fetchedAt = new Date().toISOString();
  await AsyncStorage.setItem(
    coursesKey(studyId),
    JSON.stringify({
      courses,
      fetched: fetchedElementIds,
      sync: { courseCount: courses.length, elementsFetched: fetchedElementIds.length, finishedAt: fetchedAt, complete },
    } satisfies CoursesWebEntry),
  ).catch(() => undefined);
}

export async function loadCachedCourses(studyId: number): Promise<BulkCourse[]> {
  return (await readCoursesEntry(studyId)).courses;
}

export async function loadCachedCoursesByElement(studyId: number, elementId: number): Promise<BulkCourse[]> {
  const entry = await readCoursesEntry(studyId);
  return entry.courses.filter((course) => course.elementIds.includes(elementId));
}

export async function loadCoursesFetchedIds(studyId: number): Promise<number[]> {
  return (await readCoursesEntry(studyId)).fetched;
}

export async function getCoursesSyncInfo(studyId: number): Promise<CoursesSyncInfo | null> {
  const entry = await readCoursesEntry(studyId);
  if (!entry.sync) return null;
  return { studyId, ...entry.sync };
}

/** One cached course across all studies, for the detail screen after a restart. */
export async function findCachedCourse(id: number): Promise<BulkCourse | null> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    for (const storageKey of keys) {
      if (!storageKey.startsWith(`${PREFIX}courses/`)) continue;
      const raw = await AsyncStorage.getItem(storageKey);
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      const courses = parsed && typeof parsed === 'object' && Array.isArray((parsed as CoursesWebEntry).courses) ? (parsed as CoursesWebEntry).courses : [];
      const match = courses.find((course) => course?.id === id);
      if (match) return match;
    }
    return null;
  } catch {
    return null;
  }
}

const API_KEY = `${PREFIX}api-log`;
const MAX_API_CALLS = 1000;

/** Fire-and-forget from `recordCampusCall`; never throws. */
export async function appendApiCall(entry: PersistedApiCall): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(API_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    const list = (Array.isArray(parsed) ? parsed : []).filter(
      (item): item is PersistedApiCall => !!item && typeof item === 'object' && typeof (item as PersistedApiCall).uid === 'string',
    );
    if (list.some((item) => item.uid === entry.uid)) return;
    list.unshift({ ...entry });
    await AsyncStorage.setItem(API_KEY, JSON.stringify(list.slice(0, MAX_API_CALLS)));
  } catch {
    // Logging must never break the call it records.
  }
}

export async function readApiLog(limit = 500): Promise<CampusLogEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(API_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, limit).flatMap((item, index) => {
      if (!item || typeof item !== 'object' || typeof (item as PersistedApiCall).uid !== 'string') return [];
      const call = item as PersistedApiCall;
      const entry: CampusLogEntry = {
        id: -(index + 1),
        uid: call.uid,
        time: call.time,
        createdAt: call.createdAt ?? new Date(0).toISOString(),
        op: call.op,
        studyId: call.studyId,
        elementId: call.elementId,
        ok: call.ok,
        httpStatus: call.httpStatus,
        code: call.code,
        detail: call.detail,
        elapsedMs: call.elapsedMs,
        request: call.request,
        response: call.response,
        responseJson: call.responseJson,
      };
      return [entry];
    });
  } catch {
    return [];
  }
}

/**
 * Merge one freshly loaded element into the stored course cache
 * (single toggles). Keeps the previous `complete` flag.
 */
export async function appendElementCourses(studyId: number, elementId: number, elementName: string, fresh: CampusCourse[]): Promise<void> {
  const entry = await readCoursesEntry(studyId);
  const map = new Map(entry.courses.map((course) => [course.id, course]));
  for (const course of fresh) {
    const known = map.get(course.id);
    if (!known) {
      map.set(course.id, { ...course, elementIds: [elementId], elementNames: [elementName] });
    } else if (!known.elementIds.includes(elementId)) {
      known.elementIds.push(elementId);
      if (!known.elementNames.includes(elementName)) known.elementNames.push(elementName);
    }
  }
  const fetched = [...new Set([...entry.fetched, elementId])];
  const complete = entry.sync?.complete ?? false;
  await saveCourses(studyId, [...map.values()], fetched, complete);
}
