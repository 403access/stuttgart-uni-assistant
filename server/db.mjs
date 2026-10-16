/** Server-side SQLite store: the source of truth for portal data. Clients keep their own copy for sync. */

import { DatabaseSync } from 'node:sqlite';

const MAX_PORTAL_CALLS = 2000;

const instances = new Map();

export function dbPath() {
  if (process.env.CAMPUS_DB_PATH) return process.env.CAMPUS_DB_PATH;
  return new URL('./campus-server.db', import.meta.url).pathname;
}

function parseLecturers(value) {
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((name) => typeof name === 'string') : [];
  } catch {
    return [];
  }
}

function parseIdList(value) {
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((id) => Number.isInteger(id)) : [];
  } catch {
    return [];
  }
}

export function getDb() {
  const path = dbPath();
  const cached = instances.get(path);
  if (cached) return cached;
  const db = new DatabaseSync(path);
  db.exec(`
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
    CREATE TABLE IF NOT EXISTS studies_snapshot (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      payload TEXT NOT NULL DEFAULT '[]',
      fetched_at TEXT
    );
    CREATE TABLE IF NOT EXISTS portal_calls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      time TEXT NOT NULL DEFAULT '',
      op TEXT NOT NULL DEFAULT '',
      study_id INTEGER,
      element_id INTEGER,
      ok INTEGER NOT NULL DEFAULT 1,
      http_status INTEGER,
      message TEXT,
      elapsed_ms INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `);
  instances.set(path, db);
  return db;
}

/** Test-only: drop cached handles so a new CAMPUS_DB_PATH takes effect. */
export function resetDbForTests() {
  for (const db of instances.values()) {
    try {
      db.close();
    } catch {
      // Already closed; nothing to do.
    }
  }
  instances.clear();
}

function nodeRow(row, links) {
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

function courseRow(row, links) {
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

export function saveStructure(studyId, rootElementId, nodes, expandedIds, complete) {
  const db = getDb();
  const fetchedAt = new Date().toISOString();
  const expanded = new Set(expandedIds);
  const insertNode = db.prepare(
    'INSERT INTO curriculum_nodes (study_id, id, designation, element_type, name, parent_id, completed, in_progress, fetched_at, expanded) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(study_id, id) DO UPDATE SET designation = excluded.designation, element_type = excluded.element_type, name = excluded.name, parent_id = excluded.parent_id, completed = excluded.completed, in_progress = excluded.in_progress, fetched_at = excluded.fetched_at, expanded = excluded.expanded',
  );
  const upsertSync = db.prepare(
    'INSERT INTO curriculum_sync (study_id, root_element_id, node_count, finished_at, complete) VALUES (?, ?, ?, ?, ?) ON CONFLICT(study_id) DO UPDATE SET root_element_id = excluded.root_element_id, node_count = excluded.node_count, finished_at = excluded.finished_at, complete = excluded.complete',
  );
  db.exec('BEGIN');
  try {
    for (const node of nodes) {
      insertNode.run(studyId, node.id, node.designation, node.elementType, node.name, node.parentId, node.completed ? 1 : 0, node.inProgress ? 1 : 0, fetchedAt, expanded.has(node.id) ? 1 : 0);
    }
    const count = db.prepare('SELECT COUNT(*) AS n FROM curriculum_nodes WHERE study_id = ?').get(studyId)?.n ?? 0;
    upsertSync.run(studyId, rootElementId, count, fetchedAt, complete ? 1 : 0);
    db.exec('COMMIT');
  } catch (error) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // Already rolled back; surface the original error.
    }
    throw error;
  }
}

export function loadStructure(studyId) {
  const db = getDb();
  const nodes = db.prepare('SELECT id, designation, element_type, name, parent_id, completed, in_progress FROM curriculum_nodes WHERE study_id = ? ORDER BY id').all(studyId).map((row) => nodeRow(row));
  const expanded = db.prepare('SELECT id FROM curriculum_nodes WHERE study_id = ? AND expanded = 1').all(studyId).map((row) => row.id);
  const sync = db.prepare('SELECT root_element_id, node_count, finished_at, complete FROM curriculum_sync WHERE study_id = ?').get(studyId);
  return {
    nodes,
    expandedIds: expanded,
    sync: sync
      ? { rootElementId: sync.root_element_id ?? null, nodeCount: sync.node_count, finishedAt: sync.finished_at ?? null, complete: sync.complete === 1 }
      : null,
  };
}

export function isExpanded(studyId, elementId) {
  const db = getDb();
  const row = db.prepare('SELECT expanded FROM curriculum_nodes WHERE study_id = ? AND id = ?').get(studyId, elementId);
  return row?.expanded === 1;
}

export function saveCourses(studyId, courses, fetchedElementIds, complete) {
  const db = getDb();
  const fetchedAt = new Date().toISOString();
  const insertCourse = db.prepare(
    'INSERT INTO courses (study_id, id, course_number, title, course_type, course_type_short, semester, semester_id, duration, lecturers, room_name, start_time, end_time, detail_url, registration_status, registration_action, registration_url, fetched_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(study_id, id) DO UPDATE SET course_number = excluded.course_number, title = excluded.title, course_type = excluded.course_type, course_type_short = excluded.course_type_short, semester = excluded.semester, semester_id = excluded.semester_id, duration = excluded.duration, lecturers = excluded.lecturers, room_name = excluded.room_name, start_time = excluded.start_time, end_time = excluded.end_time, detail_url = excluded.detail_url, registration_status = excluded.registration_status, registration_action = excluded.registration_action, registration_url = excluded.registration_url, fetched_at = excluded.fetched_at',
  );
  const linkElement = db.prepare('INSERT OR IGNORE INTO course_elements (study_id, course_id, element_id, element_name) VALUES (?, ?, ?, ?)');
  db.exec('BEGIN');
  try {
    for (const course of courses) {
      insertCourse.run(
        studyId, course.id, course.courseNumber, course.title, course.courseType, course.courseTypeShort,
        course.semester, course.semesterId, course.duration, JSON.stringify(course.lecturers), course.roomName,
        course.startTime, course.endTime, course.detailUrl, course.registrationStatus, course.registrationAction,
        course.registrationUrl, fetchedAt,
      );
      for (let index = 0; index < (course.elementIds?.length ?? 0); index += 1) {
        linkElement.run(studyId, course.id, course.elementIds[index], course.elementNames?.[index] ?? String(course.elementIds[index]));
      }
    }
    const known = new Set(db.prepare('SELECT element_id AS id FROM course_elements WHERE study_id = ?').all(studyId).map((row) => row.id));
    for (const id of fetchedElementIds) known.add(id);
    const count = db.prepare('SELECT COUNT(*) AS n FROM courses WHERE study_id = ?').get(studyId)?.n ?? 0;
    db.prepare(
      'INSERT INTO courses_sync (study_id, fetched_elements, course_count, finished_at, complete) VALUES (?, ?, ?, ?, ?) ON CONFLICT(study_id) DO UPDATE SET fetched_elements = excluded.fetched_elements, course_count = excluded.course_count, finished_at = excluded.finished_at, complete = excluded.complete',
    ).run(studyId, JSON.stringify([...known]), count, fetchedAt, complete ? 1 : 0);
    db.exec('COMMIT');
  } catch (error) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // Already rolled back; surface the original error.
    }
    throw error;
  }
}

function elementLinks(studyId) {
  const db = getDb();
  const map = new Map();
  for (const row of db.prepare('SELECT course_id, element_id, element_name FROM course_elements WHERE study_id = ? ORDER BY element_id').all(studyId)) {
    const list = map.get(row.course_id) ?? [];
    list.push({ elementId: row.element_id, elementName: row.element_name });
    map.set(row.course_id, list);
  }
  return map;
}

const COURSE_COLUMNS = 'id, course_number, title, course_type, course_type_short, semester, semester_id, duration, lecturers, room_name, start_time, end_time, detail_url, registration_status, registration_action, registration_url';

export function loadCourses(studyId, elementId) {
  const db = getDb();
  const links = elementLinks(studyId);
  let rows;
  if (elementId == null) {
    rows = db.prepare(`SELECT ${COURSE_COLUMNS} FROM courses WHERE study_id = ? ORDER BY title`).all(studyId);
  } else {
    rows = db.prepare(`SELECT ${COURSE_COLUMNS} FROM courses WHERE study_id = ? AND id IN (SELECT course_id FROM course_elements WHERE study_id = ? AND element_id = ?) ORDER BY title`).all(studyId, studyId, elementId);
  }
  return rows.map((row) => courseRow(row, links.get(row.id) ?? []));
}

export function loadCoursesFetchedIds(studyId) {
  const db = getDb();
  const row = db.prepare('SELECT fetched_elements FROM courses_sync WHERE study_id = ?').get(studyId);
  return parseIdList(row?.fetched_elements);
}

export function getCoursesSync(studyId) {
  const db = getDb();
  const row = db.prepare('SELECT course_count, fetched_elements, finished_at, complete FROM courses_sync WHERE study_id = ?').get(studyId);
  if (!row) return null;
  const fetched = parseIdList(row.fetched_elements);
  return { courseCount: row.course_count, elementsFetched: fetched.length, finishedAt: row.finished_at ?? null, complete: row.complete === 1 };
}

export function saveStudiesSnapshot(studies) {
  const db = getDb();
  db.prepare('INSERT INTO studies_snapshot (id, payload, fetched_at) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, fetched_at = excluded.fetched_at').run(
    JSON.stringify(studies),
    new Date().toISOString(),
  );
}

export function loadStudiesSnapshot() {
  const db = getDb();
  const row = db.prepare('SELECT payload, fetched_at FROM studies_snapshot WHERE id = 1').get();
  if (!row) return null;
  try {
    const studies = JSON.parse(row.payload);
    if (!Array.isArray(studies)) return null;
    return { studies, fetchedAt: row.fetched_at ?? null };
  } catch {
    return null;
  }
}

export function clearStudy(studyId) {
  const db = getDb();
  db.exec('BEGIN');
  try {
    for (const table of ['curriculum_nodes', 'curriculum_sync', 'courses', 'course_elements', 'courses_sync']) {
      db.prepare(`DELETE FROM ${table} WHERE study_id = ?`).run(studyId);
    }
    db.exec('COMMIT');
  } catch (error) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // Already rolled back; surface the original error.
    }
    throw error;
  }
}

function timeNow() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

/** Persist one portal hop. Never throws; logging must not break the call. */
export function logPortalCall(entry) {
  try {
    const db = getDb();
    db.prepare(
      'INSERT INTO portal_calls (time, op, study_id, element_id, ok, http_status, message, elapsed_ms, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ).run(
      entry.time ?? timeNow(),
      entry.op,
      entry.studyId ?? null,
      entry.elementId ?? null,
      entry.ok ? 1 : 0,
      entry.httpStatus ?? null,
      (entry.message ?? '').slice(0, 300),
      entry.elapsedMs ?? 0,
      new Date().toISOString(),
    );
    db.prepare('DELETE FROM portal_calls WHERE id NOT IN (SELECT id FROM portal_calls ORDER BY id DESC LIMIT ?)').run(MAX_PORTAL_CALLS);
  } catch {
    // Logging must never break the call it records.
  }
}

export function readPortalCalls(limit = 500) {
  const capped = Math.max(1, Math.min(1000, Number(limit) || 500));
  const db = getDb();
  return db.prepare('SELECT id, time, op, study_id, element_id, ok, http_status, message, elapsed_ms, created_at FROM portal_calls ORDER BY id DESC LIMIT ?').all(capped).map((row) => ({
    id: row.id,
    uid: `srv-${row.id}`,
    time: row.time,
    op: row.op,
    studyId: typeof row.study_id === 'number' ? row.study_id : undefined,
    elementId: typeof row.element_id === 'number' ? row.element_id : undefined,
    ok: row.ok === 1,
    httpStatus: typeof row.http_status === 'number' ? row.http_status : undefined,
    code: row.ok === 1 ? undefined : 'campus_failed',
    detail: row.message || undefined,
    elapsedMs: row.elapsed_ms,
    createdAt: row.created_at,
  }));
}
