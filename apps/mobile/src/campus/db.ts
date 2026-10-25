import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SQLite from 'expo-sqlite';

import type { CampusLogEntry, PersistedApiCall } from '@/src/auth/campus-log';
import type { BulkCourse, CampusCourse, CurriculumNode } from '@ua/core/domain/types';

const DATABASE_NAME = 'campus-cache.db';
const FALLBACK_PREFIX = 'campus-cache/sqlite-fallback/';

export interface CurriculumSyncInfo {
  studyId: number;
  rootElementId: number | null;
  nodeCount: number;
  finishedAt: string | null;
  complete: boolean;
}

interface FallbackEntry {
  nodes: CurriculumNode[];
  expanded: number[];
  sync: { rootElementId: number | null; nodeCount: number; finishedAt: string; complete: boolean } | null;
}

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
let sqliteUnavailable = false;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS curriculum_nodes (
          study_id INTEGER NOT NULL,
          id INTEGER NOT NULL,
          designation TEXT NOT NULL DEFAULT '',
          element_type TEXT NOT NULL DEFAULT '',
          name TEXT NOT NULL,
          parent_id INTEGER,
          completed INTEGER NOT NULL DEFAULT 0,
          in_progress INTEGER NOT NULL DEFAULT 0,
          fetched_at TEXT NOT NULL,
          expanded INTEGER NOT NULL DEFAULT 0,
          PRIMARY KEY (study_id, id)
        );
        CREATE TABLE IF NOT EXISTS curriculum_sync (
          study_id INTEGER PRIMARY KEY,
          root_element_id INTEGER,
          node_count INTEGER NOT NULL DEFAULT 0,
          finished_at TEXT,
          complete INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS api_calls (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          uid TEXT NOT NULL UNIQUE,
          time TEXT NOT NULL DEFAULT '',
          op TEXT NOT NULL DEFAULT '',
          study_id INTEGER,
          element_id INTEGER,
          ok INTEGER NOT NULL DEFAULT 1,
          http_status INTEGER,
          code TEXT,
          detail TEXT,
          elapsed_ms INTEGER NOT NULL DEFAULT 0,
          request TEXT,
          response TEXT,
          response_json TEXT,
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS courses (
          study_id INTEGER NOT NULL,
          id INTEGER NOT NULL,
          course_number TEXT NOT NULL DEFAULT '',
          title TEXT NOT NULL,
          course_type TEXT NOT NULL DEFAULT '',
          course_type_short TEXT NOT NULL DEFAULT '',
          semester TEXT NOT NULL DEFAULT '',
          semester_id INTEGER,
          duration INTEGER,
          lecturers TEXT NOT NULL DEFAULT '[]',
          room_name TEXT NOT NULL DEFAULT '',
          start_time TEXT NOT NULL DEFAULT '',
          end_time TEXT NOT NULL DEFAULT '',
          detail_url TEXT NOT NULL DEFAULT '',
          registration_status TEXT NOT NULL DEFAULT '',
          registration_action TEXT NOT NULL DEFAULT '',
          registration_url TEXT NOT NULL DEFAULT '',
          fetched_at TEXT NOT NULL,
          PRIMARY KEY (study_id, id)
        );
        CREATE TABLE IF NOT EXISTS course_elements (
          study_id INTEGER NOT NULL,
          course_id INTEGER NOT NULL,
          element_id INTEGER NOT NULL,
          element_name TEXT NOT NULL DEFAULT '',
          PRIMARY KEY (study_id, course_id, element_id)
        );
        CREATE TABLE IF NOT EXISTS courses_sync (
          study_id INTEGER PRIMARY KEY,
          fetched_elements TEXT NOT NULL DEFAULT '[]',
          course_count INTEGER NOT NULL DEFAULT 0,
          finished_at TEXT,
          complete INTEGER NOT NULL DEFAULT 0
        );
      `);
      // Migration for caches written before newer columns existed.
      const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(curriculum_nodes)');
      if (!columns.some((column) => column.name === 'expanded')) {
        await db.execAsync('ALTER TABLE curriculum_nodes ADD COLUMN expanded INTEGER NOT NULL DEFAULT 0');
      }
      const callColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(api_calls)');
      if (!callColumns.some((column) => column.name === 'request')) {
        await db.execAsync('ALTER TABLE api_calls ADD COLUMN request TEXT');
      }
      if (!callColumns.some((column) => column.name === 'response')) {
        await db.execAsync('ALTER TABLE api_calls ADD COLUMN response TEXT');
      }
      if (!callColumns.some((column) => column.name === 'response_json')) {
        await db.execAsync('ALTER TABLE api_calls ADD COLUMN response_json TEXT');
      }
      return db;
    })().catch((error: unknown) => {
      dbPromise = null;
      throw error;
    });
  }
  return dbPromise;
}

interface NodeRow {
  id: number;
  designation: string;
  element_type: string;
  name: string;
  parent_id: number | null;
  completed: number;
  in_progress: number;
}

function rowToNode(row: NodeRow): CurriculumNode {
  return {
    id: row.id,
    designation: row.designation ?? '',
    elementType: row.element_type ?? '',
    name: row.name,
    parentId: typeof row.parent_id === 'number' ? row.parent_id : null,
    completed: row.completed === 1,
    inProgress: row.in_progress === 1,
  };
}

/**
 * Native implementation of the curriculum cache. The web build uses
 * `db.web.ts` instead (AsyncStorage), so `expo-sqlite` — and its web worker,
 * which breaks Metro bundling without a wasm setup — never enters the web
 * bundle. The AsyncStorage fallback below is only a safety net for native
 * when opening the database fails.
 */
async function getDbOrNull(): Promise<SQLite.SQLiteDatabase | null> {
  if (sqliteUnavailable) return null;
  try {
    return await getDb();
  } catch (error) {
    sqliteUnavailable = true;
    console.info('[campus-cache] SQLite unavailable, using AsyncStorage fallback', error instanceof Error ? error.message : error);
    return null;
  }
}

function fallbackKey(studyId: number): string {
  return `${FALLBACK_PREFIX}${studyId}`;
}

const FALLBACK_API_KEY = `${FALLBACK_PREFIX}api-log`;

async function readFallbackApiLog(): Promise<PersistedApiCall[]> {
  try {
    const raw = await AsyncStorage.getItem(FALLBACK_API_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is PersistedApiCall => !!item && typeof item === 'object' && typeof (item as PersistedApiCall).uid === 'string');
  } catch {
    return [];
  }
}

function sanitizeFallback(value: unknown): FallbackEntry {
  const empty: FallbackEntry = { nodes: [], expanded: [], sync: null };
  if (!value || typeof value !== 'object') return empty;
  const entry = value as Partial<FallbackEntry>;
  return {
    nodes: Array.isArray(entry.nodes) ? entry.nodes.filter((node) => node && typeof node.id === 'number') : [],
    expanded: Array.isArray(entry.expanded) ? entry.expanded.filter((id): id is number => typeof id === 'number') : [],
    sync: entry.sync && typeof entry.sync === 'object' ? (entry.sync as FallbackEntry['sync']) : null,
  };
}

async function readFallback(studyId: number): Promise<FallbackEntry> {
  try {
    const raw = await AsyncStorage.getItem(fallbackKey(studyId));
    return sanitizeFallback(raw ? (JSON.parse(raw) as unknown) : null);
  } catch {
    return { nodes: [], expanded: [], sync: null };
  }
}

async function writeFallback(studyId: number, entry: FallbackEntry): Promise<void> {
  await AsyncStorage.setItem(fallbackKey(studyId), JSON.stringify(entry));
}

/** Replace the cached tree of one study. Partial syncs are stored with `complete: false`. */
export async function saveFullStructure(
  studyId: number,
  rootElementId: number | null,
  nodes: CurriculumNode[],
  expandedIds: number[],
  complete: boolean,
): Promise<void> {
  const db = await getDbOrNull();
  const fetchedAt = new Date().toISOString();
  if (!db) {
    await writeFallback(studyId, {
      nodes,
      expanded: expandedIds,
      sync: { rootElementId, nodeCount: nodes.length, finishedAt: fetchedAt, complete },
    });
    return;
  }
  const expanded = new Set(expandedIds);
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM curriculum_nodes WHERE study_id = ?', studyId);
    for (const node of nodes) {
      await db.runAsync(
        'INSERT INTO curriculum_nodes (study_id, id, designation, element_type, name, parent_id, completed, in_progress, fetched_at, expanded) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        studyId,
        node.id,
        node.designation,
        node.elementType,
        node.name,
        node.parentId,
        node.completed ? 1 : 0,
        node.inProgress ? 1 : 0,
        fetchedAt,
        expanded.has(node.id) ? 1 : 0,
      );
    }
    await db.runAsync(
      'INSERT INTO curriculum_sync (study_id, root_element_id, node_count, finished_at, complete) VALUES (?, ?, ?, ?, ?) ON CONFLICT(study_id) DO UPDATE SET root_element_id = excluded.root_element_id, node_count = excluded.node_count, finished_at = excluded.finished_at, complete = excluded.complete',
      studyId,
      rootElementId,
      nodes.length,
      fetchedAt,
      complete ? 1 : 0,
    );
  });
}

export async function loadCachedNodes(studyId: number): Promise<CurriculumNode[]> {
  const db = await getDbOrNull();
  if (!db) return (await readFallback(studyId)).nodes;
  const rows = await db.getAllAsync<NodeRow>(
    'SELECT id, designation, element_type, name, parent_id, completed, in_progress FROM curriculum_nodes WHERE study_id = ? ORDER BY id',
    studyId,
  );
  return rows.map(rowToNode);
}

/** Element ids whose structure call already succeeded — the resume frontier skips them. */
export async function loadExpandedIds(studyId: number): Promise<number[]> {
  const db = await getDbOrNull();
  if (!db) return (await readFallback(studyId)).expanded;
  const rows = await db.getAllAsync<{ id: number }>(
    'SELECT id FROM curriculum_nodes WHERE study_id = ? AND expanded = 1',
    studyId,
  );
  return rows.map((row) => row.id);
}

export async function getSyncInfo(studyId: number): Promise<CurriculumSyncInfo | null> {
  const db = await getDbOrNull();
  if (!db) {
    const fallback = await readFallback(studyId);
    if (!fallback.sync) return null;
    return { studyId, ...fallback.sync };
  }
  const row = await db.getFirstAsync<{ root_element_id: number | null; node_count: number; finished_at: string | null; complete: number }>(
    'SELECT root_element_id, node_count, finished_at, complete FROM curriculum_sync WHERE study_id = ?',
    studyId,
  );
  if (!row) return null;
  return {
    studyId,
    rootElementId: typeof row.root_element_id === 'number' ? row.root_element_id : null,
    nodeCount: row.node_count,
    finishedAt: row.finished_at,
    complete: row.complete === 1,
  };
}

export async function clearCachedStudy(studyId: number): Promise<void> {
  const db = await getDbOrNull();
  if (!db) {
    await AsyncStorage.removeItem(fallbackKey(studyId)).catch(() => undefined);
    return;
  }
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM curriculum_nodes WHERE study_id = ?', studyId);
    await db.runAsync('DELETE FROM curriculum_sync WHERE study_id = ?', studyId);
  });
}

export async function clearCachedCourses(studyId: number): Promise<void> {
  const db = await getDbOrNull();
  if (!db) {
    await AsyncStorage.removeItem(fallbackCoursesKey(studyId)).catch(() => undefined);
    return;
  }
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM courses WHERE study_id = ?', studyId);
    await db.runAsync('DELETE FROM course_elements WHERE study_id = ?', studyId);
    await db.runAsync('DELETE FROM courses_sync WHERE study_id = ?', studyId);
  });
}

export interface CoursesSyncInfo {
  studyId: number;
  courseCount: number;
  elementsFetched: number;
  finishedAt: string | null;
  complete: boolean;
}

function fallbackCoursesKey(studyId: number): string {
  return `${FALLBACK_PREFIX}courses/${studyId}`;
}

interface CoursesFallback {
  courses: BulkCourse[];
  fetched: number[];
  sync: { courseCount: number; elementsFetched: number; finishedAt: string; complete: boolean } | null;
}

async function readCoursesFallback(studyId: number): Promise<CoursesFallback> {
  try {
    const raw = await AsyncStorage.getItem(fallbackCoursesKey(studyId));
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== 'object') return { courses: [], fetched: [], sync: null };
    const entry = parsed as Partial<CoursesFallback>;
    return {
      courses: Array.isArray(entry.courses) ? entry.courses.filter((course) => course && typeof course.id === 'number') : [],
      fetched: Array.isArray(entry.fetched) ? entry.fetched.filter((id): id is number => typeof id === 'number') : [],
      sync: entry.sync && typeof entry.sync === 'object' ? (entry.sync as CoursesFallback['sync']) : null,
    };
  } catch {
    return { courses: [], fetched: [], sync: null };
  }
}

function parseLecturers(value: unknown): string[] {
  if (typeof value !== 'string') return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((name): name is string => typeof name === 'string') : [];
  } catch {
    return [];
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
  const db = await getDbOrNull();
  if (!db) {
    await AsyncStorage.setItem(
      fallbackCoursesKey(studyId),
      JSON.stringify({
        courses,
        fetched: fetchedElementIds,
        sync: { courseCount: courses.length, elementsFetched: fetchedElementIds.length, finishedAt: fetchedAt, complete },
      } satisfies CoursesFallback),
    ).catch(() => undefined);
    return;
  }
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM courses WHERE study_id = ?', studyId);
    await db.runAsync('DELETE FROM course_elements WHERE study_id = ?', studyId);
    for (const course of courses) {
      await db.runAsync(
        'INSERT INTO courses (study_id, id, course_number, title, course_type, course_type_short, semester, semester_id, duration, lecturers, room_name, start_time, end_time, detail_url, registration_status, registration_action, registration_url, fetched_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        studyId,
        course.id,
        course.courseNumber,
        course.title,
        course.courseType,
        course.courseTypeShort,
        course.semester,
        course.semesterId,
        course.duration,
        JSON.stringify(course.lecturers),
        course.roomName,
        course.startTime,
        course.endTime,
        course.detailUrl,
        course.registrationStatus,
        course.registrationAction,
        course.registrationUrl,
        fetchedAt,
      );
      for (let index = 0; index < course.elementIds.length; index += 1) {
        await db.runAsync('INSERT INTO course_elements (study_id, course_id, element_id, element_name) VALUES (?, ?, ?, ?)', studyId, course.id, course.elementIds[index], course.elementNames[index] ?? String(course.elementIds[index]));
      }
    }
    await db.runAsync(
      'INSERT INTO courses_sync (study_id, fetched_elements, course_count, finished_at, complete) VALUES (?, ?, ?, ?, ?) ON CONFLICT(study_id) DO UPDATE SET fetched_elements = excluded.fetched_elements, course_count = excluded.course_count, finished_at = excluded.finished_at, complete = excluded.complete',
      studyId,
      JSON.stringify(fetchedElementIds),
      courses.length,
      fetchedAt,
      complete ? 1 : 0,
    );
  });
}

interface CourseRow {
  id: number;
  course_number: string;
  title: string;
  course_type: string;
  course_type_short: string;
  semester: string;
  semester_id: number | null;
  duration: number | null;
  lecturers: string;
  room_name: string;
  start_time: string;
  end_time: string;
  detail_url: string;
  registration_status: string;
  registration_action: string;
  registration_url: string;
}

const COURSE_COLUMNS = 'id, course_number, title, course_type, course_type_short, semester, semester_id, duration, lecturers, room_name, start_time, end_time, detail_url, registration_status, registration_action, registration_url';

async function elementsByCourse(studyId: number): Promise<Map<number, { elementId: number; elementName: string }[]>> {
  const db = await getDbOrNull();
  const map = new Map<number, { elementId: number; elementName: string }[]>();
  if (!db) return map;
  const rows = await db.getAllAsync<{ course_id: number; element_id: number; element_name: string }>(
    'SELECT course_id, element_id, element_name FROM course_elements WHERE study_id = ? ORDER BY element_id',
    studyId,
  );
  for (const row of rows) {
    const list = map.get(row.course_id) ?? [];
    list.push({ elementId: row.element_id, elementName: row.element_name });
    map.set(row.course_id, list);
  }
  return map;
}

function rowToBulkCourse(row: CourseRow, links: { elementId: number; elementName: string }[]): BulkCourse {
  return {
    id: row.id,
    courseNumber: row.course_number ?? '',
    title: row.title,
    courseType: row.course_type ?? '',
    courseTypeShort: row.course_type_short ?? '',
    semester: row.semester ?? '',
    semesterId: typeof row.semester_id === 'number' ? row.semester_id : null,
    duration: typeof row.duration === 'number' ? row.duration : null,
    lecturers: parseLecturers(row.lecturers),
    roomName: row.room_name ?? '',
    startTime: row.start_time ?? '',
    endTime: row.end_time ?? '',
    detailUrl: row.detail_url ?? '',
    registrationStatus: row.registration_status ?? '',
    registrationAction: row.registration_action ?? '',
    registrationUrl: row.registration_url ?? '',
    elementIds: links.map((link) => link.elementId),
    elementNames: links.map((link) => link.elementName),
  };
}

export async function loadCachedCourses(studyId: number): Promise<BulkCourse[]> {
  const db = await getDbOrNull();
  if (!db) return (await readCoursesFallback(studyId)).courses;
  const rows = await db.getAllAsync<CourseRow>(`SELECT ${COURSE_COLUMNS} FROM courses WHERE study_id = ? ORDER BY title`, studyId);
  const links = await elementsByCourse(studyId);
  return rows.map((row) => rowToBulkCourse(row, links.get(row.id) ?? []));
}

export async function loadCachedCoursesByElement(studyId: number, elementId: number): Promise<BulkCourse[]> {
  const db = await getDbOrNull();
  if (!db) {
    const fallback = await readCoursesFallback(studyId);
    return fallback.courses.filter((course) => course.elementIds.includes(elementId));
  }
  const rows = await db.getAllAsync<CourseRow>(
    `SELECT ${COURSE_COLUMNS} FROM courses WHERE study_id = ? AND id IN (SELECT course_id FROM course_elements WHERE study_id = ? AND element_id = ?) ORDER BY title`,
    studyId,
    studyId,
    elementId,
  );
  const links = await elementsByCourse(studyId);
  return rows.map((row) => rowToBulkCourse(row, links.get(row.id) ?? []));
}

function parseFetchedElements(value: unknown): number[] {
  if (typeof value !== 'string') return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((id): id is number => typeof id === 'number') : [];
  } catch {
    return [];
  }
}

export async function loadCoursesFetchedIds(studyId: number): Promise<number[]> {
  const db = await getDbOrNull();
  if (!db) return (await readCoursesFallback(studyId)).fetched;
  const row = await db.getFirstAsync<{ fetched_elements: string | null }>('SELECT fetched_elements FROM courses_sync WHERE study_id = ?', studyId);
  return parseFetchedElements(row?.fetched_elements);
}

export async function getCoursesSyncInfo(studyId: number): Promise<CoursesSyncInfo | null> {
  const db = await getDbOrNull();
  if (!db) {
    const fallback = await readCoursesFallback(studyId);
    if (!fallback.sync) return null;
    return { studyId, ...fallback.sync };
  }
  const row = await db.getFirstAsync<{ course_count: number; fetched_elements: string | null; finished_at: string | null; complete: number }>(
    'SELECT course_count, fetched_elements, finished_at, complete FROM courses_sync WHERE study_id = ?',
    studyId,
  );
  if (!row) return null;
  return {
    studyId,
    courseCount: row.course_count,
    elementsFetched: parseFetchedElements(row.fetched_elements).length,
    finishedAt: row.finished_at,
    complete: row.complete === 1,
  };
}

/** One cached course across all studies, for the detail screen after a restart. */
export async function findCachedCourse(id: number): Promise<BulkCourse | null> {
  const db = await getDbOrNull();
  if (!db) return null;
  const row = await db.getFirstAsync<CourseRow & { study_id: number }>(`SELECT ${COURSE_COLUMNS}, study_id FROM courses WHERE id = ? LIMIT 1`, id);
  if (!row) return null;
  const links = await elementsByCourse(row.study_id);
  return rowToBulkCourse(row, links.get(row.id) ?? []);
}

const MAX_API_CALLS = 1000;

/** Fire-and-forget from `recordCampusCall`; never throws. */
export async function appendApiCall(entry: PersistedApiCall): Promise<void> {
  try {
    const db = await getDbOrNull();
    if (!db) {
      const fallback = await readFallbackApiLog();
      fallback.unshift({ ...entry });
      await AsyncStorage.setItem(FALLBACK_API_KEY, JSON.stringify(fallback.slice(0, MAX_API_CALLS)));
      return;
    }
    await db.runAsync(
      'INSERT OR IGNORE INTO api_calls (uid, time, op, study_id, element_id, ok, http_status, code, detail, elapsed_ms, request, response, response_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      entry.uid,
      entry.time,
      entry.op,
      entry.studyId ?? null,
      entry.elementId ?? null,
      entry.ok ? 1 : 0,
      entry.httpStatus ?? null,
      entry.code ?? null,
      entry.detail ?? null,
      entry.elapsedMs,
      entry.request ?? null,
      entry.response ?? null,
      entry.responseJson ?? null,
      new Date().toISOString(),
    );
    await db.runAsync('DELETE FROM api_calls WHERE id NOT IN (SELECT id FROM api_calls ORDER BY id DESC LIMIT ?)', MAX_API_CALLS);
  } catch {
    // Logging must never break the call it records.
  }
}

export async function readApiLog(limit = 500): Promise<CampusLogEntry[]> {
  const db = await getDbOrNull();
  if (!db) {
    const fallback = await readFallbackApiLog();
    return fallback.slice(0, limit).map((call, index) => ({ ...call, id: -(index + 1), createdAt: call.createdAt ?? new Date(0).toISOString() }) satisfies CampusLogEntry);
  }
  const rows = await db.getAllAsync<{
    id: number;
    uid: string;
    time: string;
    op: string;
    study_id: number | null;
    element_id: number | null;
    ok: number;
    http_status: number | null;
    code: string | null;
    detail: string | null;
    elapsed_ms: number;
    request: string | null;
    response: string | null;
    response_json: string | null;
    created_at: string | null;
  }>('SELECT id, uid, time, op, study_id, element_id, ok, http_status, code, detail, elapsed_ms, request, response, response_json, created_at FROM api_calls ORDER BY id DESC LIMIT ?', limit);
  return rows.map((row) => ({
    id: row.id,
    uid: row.uid,
    time: row.time,
    op: row.op as PersistedApiCall['op'],
    studyId: typeof row.study_id === 'number' ? row.study_id : undefined,
    elementId: typeof row.element_id === 'number' ? row.element_id : undefined,
    ok: row.ok === 1,
    httpStatus: typeof row.http_status === 'number' ? row.http_status : undefined,
    code: typeof row.code === 'string' ? row.code : undefined,
    detail: typeof row.detail === 'string' ? row.detail : undefined,
    elapsedMs: row.elapsed_ms,
    request: typeof row.request === 'string' ? row.request : undefined,
    response: typeof row.response === 'string' ? row.response : undefined,
    responseJson: typeof row.response_json === 'string' ? row.response_json : undefined,
    createdAt: typeof row.created_at === 'string' ? row.created_at : new Date(0).toISOString(),
  }));
}

export async function clearApiLog(): Promise<void> {
  const db = await getDbOrNull();
  if (!db) {
    await AsyncStorage.removeItem(FALLBACK_API_KEY).catch(() => undefined);
    return;
  }
  await db.runAsync('DELETE FROM api_calls').catch(() => undefined);
}

/**
 * Merge one freshly loaded element into the stored course cache
 * (single toggles). Keeps the previous `complete` flag.
 */
export async function appendElementCourses(studyId: number, elementId: number, elementName: string, fresh: CampusCourse[]): Promise<void> {
  const stored = await loadCachedCourses(studyId).catch(() => []);
  const map = new Map(stored.map((course) => [course.id, course]));
  for (const course of fresh) {
    const known = map.get(course.id);
    if (!known) {
      map.set(course.id, { ...course, elementIds: [elementId], elementNames: [elementName] });
    } else if (!known.elementIds.includes(elementId)) {
      known.elementIds.push(elementId);
      if (!known.elementNames.includes(elementName)) known.elementNames.push(elementName);
    }
  }
  const fetched = await loadCoursesFetchedIds(studyId).catch(() => []);
  const complete = (await getCoursesSyncInfo(studyId).catch(() => null))?.complete ?? false;
  await saveCourses(studyId, [...map.values()], [...new Set([...fetched, elementId])], complete);
}
