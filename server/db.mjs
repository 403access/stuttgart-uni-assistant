/** Server-side SQLite store: the source of truth for portal data. Clients keep their own copy for sync. */

import { DatabaseSync } from 'node:sqlite';

const MAX_PORTAL_CALLS = 2000;

/** Rows written before accounts existed or by tests without a user id. */
export const LEGACY_USER = 'legacy';

const instances = new Map();

export function dbPath() {
  if (process.env.CAMPUS_DB_PATH) return process.env.CAMPUS_DB_PATH;
  return new URL('./campus-server.db', import.meta.url).pathname;
}

function scope(userId) {
  return typeof userId === 'string' && userId ? userId : LEGACY_USER;
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
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      account TEXT NOT NULL,
      account_key TEXT NOT NULL UNIQUE,
      name TEXT,
      email TEXT,
      matriculation TEXT,
      subject TEXT,
      primary_mode TEXT NOT NULL DEFAULT 'local',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_login_at TEXT
    );
    CREATE TABLE IF NOT EXISTS user_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      last_seen_at TEXT,
      revoked_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS user_sessions_user ON user_sessions(user_id);
    /* A browser signs in by scanning a one-time QR code in the authenticated
       mobile app. user_id stays NULL until the phone approves the pairing;
       session_id points at the session minted when the browser next polls. */
    CREATE TABLE IF NOT EXISTS device_links (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      token_hash TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL DEFAULT '',
      user_agent TEXT NOT NULL DEFAULT '',
      kind TEXT NOT NULL DEFAULT 'web',
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      approved_at TEXT,
      consumed_at TEXT,
      revoked_at TEXT,
      last_seen_at TEXT,
      session_id TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (session_id) REFERENCES user_sessions(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS device_links_user ON device_links(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS device_links_expiry ON device_links(expires_at);
    /* Cross-device preferences. Onboarding is completed on the phone; the web
       build reads the result from here instead of asking again. */
    CREATE TABLE IF NOT EXISTS user_preferences (
      user_id TEXT PRIMARY KEY,
      onboarding_completed_at TEXT,
      theme TEXT,
      design TEXT,
      locale TEXT,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS user_platforms (
      user_id TEXT NOT NULL,
      platform TEXT NOT NULL,
      account TEXT,
      status TEXT NOT NULL DEFAULT 'linked',
      source TEXT NOT NULL DEFAULT 'sso',
      linked_at TEXT NOT NULL,
      last_sync_at TEXT,
      PRIMARY KEY (user_id, platform),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS user_curriculum_nodes (
      user_id TEXT NOT NULL,
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
      PRIMARY KEY (user_id, study_id, id)
    );
    CREATE TABLE IF NOT EXISTS user_curriculum_sync (
      user_id TEXT NOT NULL,
      study_id INTEGER NOT NULL,
      root_element_id INTEGER,
      node_count INTEGER NOT NULL DEFAULT 0,
      finished_at TEXT,
      complete INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (user_id, study_id)
    );
    CREATE TABLE IF NOT EXISTS user_courses (
      user_id TEXT NOT NULL,
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
      PRIMARY KEY (user_id, study_id, id)
    );
    CREATE TABLE IF NOT EXISTS user_course_elements (
      user_id TEXT NOT NULL,
      study_id INTEGER NOT NULL,
      course_id INTEGER NOT NULL,
      element_id INTEGER NOT NULL,
      element_name TEXT NOT NULL DEFAULT '',
      PRIMARY KEY (user_id, study_id, course_id, element_id)
    );
    CREATE TABLE IF NOT EXISTS user_courses_sync (
      user_id TEXT NOT NULL,
      study_id INTEGER NOT NULL,
      fetched_elements TEXT NOT NULL DEFAULT '[]',
      course_count INTEGER NOT NULL DEFAULT 0,
      finished_at TEXT,
      complete INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (user_id, study_id)
    );
    CREATE TABLE IF NOT EXISTS user_studies_snapshot (
      user_id TEXT PRIMARY KEY,
      payload TEXT NOT NULL DEFAULT '[]',
      fetched_at TEXT
    );
    CREATE TABLE IF NOT EXISTS user_exported_events (
      user_id TEXT NOT NULL,
      uid TEXT NOT NULL,
      summary TEXT NOT NULL DEFAULT '',
      location TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      dtstart TEXT NOT NULL DEFAULT '',
      dtend TEXT NOT NULL DEFAULT '',
      fetched_at TEXT NOT NULL,
      PRIMARY KEY (user_id, uid)
    );
    CREATE TABLE IF NOT EXISTS user_portal_calls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
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
    CREATE INDEX IF NOT EXISTS user_portal_calls_user ON user_portal_calls(user_id, id DESC);
    CREATE TABLE IF NOT EXISTS user_campus (
      user_id TEXT PRIMARY KEY,
      source TEXT NOT NULL DEFAULT 'browser',
      account TEXT,
      updated_at TEXT NOT NULL
    );
    /* Every operator mutation. No foreign key on purpose: the row survives a
       deleted account and keeps the account name it had at the time. */
    CREATE TABLE IF NOT EXISTS admin_audit (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      user_id TEXT,
      account TEXT,
      detail TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS admin_audit_created ON admin_audit(id DESC);
    CREATE INDEX IF NOT EXISTS admin_audit_user ON admin_audit(user_id, id DESC);
    CREATE INDEX IF NOT EXISTS admin_audit_action ON admin_audit(action, id DESC);

    /* Tables from the single-user store. Left in place so an old database is not
       rewritten; the application no longer reads or writes them. */
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
    CREATE TABLE IF NOT EXISTS exported_events (
      uid TEXT PRIMARY KEY,
      summary TEXT NOT NULL DEFAULT '',
      location TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      dtstart TEXT NOT NULL DEFAULT '',
      dtend TEXT NOT NULL DEFAULT '',
      fetched_at TEXT NOT NULL
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

function nodeRow(row) {
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

export function saveStructure(userId, studyId, rootElementId, nodes, expandedIds, complete) {
  const owner = scope(userId);
  const db = getDb();
  const fetchedAt = new Date().toISOString();
  const expanded = new Set(expandedIds);
  const insertNode = db.prepare(
    'INSERT INTO user_curriculum_nodes (user_id, study_id, id, designation, element_type, name, parent_id, completed, in_progress, fetched_at, expanded) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(user_id, study_id, id) DO UPDATE SET designation = excluded.designation, element_type = excluded.element_type, name = excluded.name, parent_id = excluded.parent_id, completed = excluded.completed, in_progress = excluded.in_progress, fetched_at = excluded.fetched_at, expanded = excluded.expanded',
  );
  const upsertSync = db.prepare(
    'INSERT INTO user_curriculum_sync (user_id, study_id, root_element_id, node_count, finished_at, complete) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(user_id, study_id) DO UPDATE SET root_element_id = excluded.root_element_id, node_count = excluded.node_count, finished_at = excluded.finished_at, complete = excluded.complete',
  );
  db.exec('BEGIN');
  try {
    for (const node of nodes) {
      insertNode.run(owner, studyId, node.id, node.designation, node.elementType, node.name, node.parentId, node.completed ? 1 : 0, node.inProgress ? 1 : 0, fetchedAt, expanded.has(node.id) ? 1 : 0);
    }
    const count = db.prepare('SELECT COUNT(*) AS n FROM user_curriculum_nodes WHERE user_id = ? AND study_id = ?').get(owner, studyId)?.n ?? 0;
    upsertSync.run(owner, studyId, rootElementId, count, fetchedAt, complete ? 1 : 0);
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

export function loadStructure(userId, studyId) {
  const owner = scope(userId);
  const db = getDb();
  const nodes = db.prepare('SELECT id, designation, element_type, name, parent_id, completed, in_progress FROM user_curriculum_nodes WHERE user_id = ? AND study_id = ? ORDER BY id').all(owner, studyId).map((row) => nodeRow(row));
  const expanded = db.prepare('SELECT id FROM user_curriculum_nodes WHERE user_id = ? AND study_id = ? AND expanded = 1').all(owner, studyId).map((row) => row.id);
  const sync = db.prepare('SELECT root_element_id, node_count, finished_at, complete FROM user_curriculum_sync WHERE user_id = ? AND study_id = ?').get(owner, studyId);
  return {
    nodes,
    expandedIds: expanded,
    sync: sync
      ? { rootElementId: sync.root_element_id ?? null, nodeCount: sync.node_count, finishedAt: sync.finished_at ?? null, complete: sync.complete === 1 }
      : null,
  };
}

export function isExpanded(userId, studyId, elementId) {
  const owner = scope(userId);
  const db = getDb();
  const row = db.prepare('SELECT expanded FROM user_curriculum_nodes WHERE user_id = ? AND study_id = ? AND id = ?').get(owner, studyId, elementId);
  return row?.expanded === 1;
}

export function saveCourses(userId, studyId, courses, fetchedElementIds, complete) {
  const owner = scope(userId);
  const db = getDb();
  const fetchedAt = new Date().toISOString();
  const insertCourse = db.prepare(
    'INSERT INTO user_courses (user_id, study_id, id, course_number, title, course_type, course_type_short, semester, semester_id, duration, lecturers, room_name, start_time, end_time, detail_url, registration_status, registration_action, registration_url, fetched_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(user_id, study_id, id) DO UPDATE SET course_number = excluded.course_number, title = excluded.title, course_type = excluded.course_type, course_type_short = excluded.course_type_short, semester = excluded.semester, semester_id = excluded.semester_id, duration = excluded.duration, lecturers = excluded.lecturers, room_name = excluded.room_name, start_time = excluded.start_time, end_time = excluded.end_time, detail_url = excluded.detail_url, registration_status = excluded.registration_status, registration_action = excluded.registration_action, registration_url = excluded.registration_url, fetched_at = excluded.fetched_at',
  );
  const linkElement = db.prepare('INSERT OR IGNORE INTO user_course_elements (user_id, study_id, course_id, element_id, element_name) VALUES (?, ?, ?, ?, ?)');
  db.exec('BEGIN');
  try {
    for (const course of courses) {
      insertCourse.run(
        owner, studyId, course.id, course.courseNumber, course.title, course.courseType, course.courseTypeShort,
        course.semester, course.semesterId, course.duration, JSON.stringify(course.lecturers), course.roomName,
        course.startTime, course.endTime, course.detailUrl, course.registrationStatus, course.registrationAction,
        course.registrationUrl, fetchedAt,
      );
      for (let index = 0; index < (course.elementIds?.length ?? 0); index += 1) {
        linkElement.run(owner, studyId, course.id, course.elementIds[index], course.elementNames?.[index] ?? String(course.elementIds[index]));
      }
    }
    const known = new Set(db.prepare('SELECT element_id AS id FROM user_course_elements WHERE user_id = ? AND study_id = ?').all(owner, studyId).map((row) => row.id));
    for (const id of fetchedElementIds) known.add(id);
    const count = db.prepare('SELECT COUNT(*) AS n FROM user_courses WHERE user_id = ? AND study_id = ?').get(owner, studyId)?.n ?? 0;
    db.prepare(
      'INSERT INTO user_courses_sync (user_id, study_id, fetched_elements, course_count, finished_at, complete) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(user_id, study_id) DO UPDATE SET fetched_elements = excluded.fetched_elements, course_count = excluded.course_count, finished_at = excluded.finished_at, complete = excluded.complete',
    ).run(owner, studyId, JSON.stringify([...known]), count, fetchedAt, complete ? 1 : 0);
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

function elementLinks(userId, studyId) {
  const owner = scope(userId);
  const db = getDb();
  const map = new Map();
  for (const row of db.prepare('SELECT course_id, element_id, element_name FROM user_course_elements WHERE user_id = ? AND study_id = ? ORDER BY element_id').all(owner, studyId)) {
    const list = map.get(row.course_id) ?? [];
    list.push({ elementId: row.element_id, elementName: row.element_name });
    map.set(row.course_id, list);
  }
  return map;
}

const COURSE_COLUMNS = 'id, course_number, title, course_type, course_type_short, semester, semester_id, duration, lecturers, room_name, start_time, end_time, detail_url, registration_status, registration_action, registration_url';

export function loadCourses(userId, studyId, elementId) {
  const owner = scope(userId);
  const db = getDb();
  const links = elementLinks(owner, studyId);
  let rows;
  if (elementId == null) {
    rows = db.prepare(`SELECT ${COURSE_COLUMNS} FROM user_courses WHERE user_id = ? AND study_id = ? ORDER BY title`).all(owner, studyId);
  } else {
    rows = db.prepare(`SELECT ${COURSE_COLUMNS} FROM user_courses WHERE user_id = ? AND study_id = ? AND id IN (SELECT course_id FROM user_course_elements WHERE user_id = ? AND study_id = ? AND element_id = ?) ORDER BY title`).all(owner, studyId, owner, studyId, elementId);
  }
  return rows.map((row) => courseRow(row, links.get(row.id) ?? []));
}

export function loadCoursesFetchedIds(userId, studyId) {
  const owner = scope(userId);
  const db = getDb();
  const row = db.prepare('SELECT fetched_elements FROM user_courses_sync WHERE user_id = ? AND study_id = ?').get(owner, studyId);
  return parseIdList(row?.fetched_elements);
}

export function getCoursesSync(userId, studyId) {
  const owner = scope(userId);
  const db = getDb();
  const row = db.prepare('SELECT course_count, fetched_elements, finished_at, complete FROM user_courses_sync WHERE user_id = ? AND study_id = ?').get(owner, studyId);
  if (!row) return null;
  const fetched = parseIdList(row.fetched_elements);
  return { courseCount: row.course_count, elementsFetched: fetched.length, finishedAt: row.finished_at ?? null, complete: row.complete === 1 };
}

export function saveStudiesSnapshot(userId, studies) {
  const owner = scope(userId);
  const db = getDb();
  db.prepare('INSERT INTO user_studies_snapshot (user_id, payload, fetched_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET payload = excluded.payload, fetched_at = excluded.fetched_at').run(
    owner,
    JSON.stringify(studies),
    new Date().toISOString(),
  );
}

export function loadStudiesSnapshot(userId) {
  const owner = scope(userId);
  const db = getDb();
  const row = db.prepare('SELECT payload, fetched_at FROM user_studies_snapshot WHERE user_id = ?').get(owner);
  if (!row) return null;
  try {
    const studies = JSON.parse(row.payload);
    if (!Array.isArray(studies)) return null;
    return { studies, fetchedAt: row.fetched_at ?? null };
  } catch {
    return null;
  }
}

export function clearStudy(userId, studyId) {
  const owner = scope(userId);
  const db = getDb();
  db.exec('BEGIN');
  try {
    for (const table of ['user_curriculum_nodes', 'user_curriculum_sync', 'user_courses', 'user_course_elements', 'user_courses_sync']) {
      db.prepare(`DELETE FROM ${table} WHERE user_id = ? AND study_id = ?`).run(owner, studyId);
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

/** Persist one portal hop for one user. Never throws; logging must not break the call. */
export function logPortalCall(entry) {
  try {
    const owner = scope(entry.userId);
    const db = getDb();
    db.prepare(
      'INSERT INTO user_portal_calls (user_id, time, op, study_id, element_id, ok, http_status, message, elapsed_ms, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ).run(
      owner,
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
    db.prepare('DELETE FROM user_portal_calls WHERE user_id = ? AND id NOT IN (SELECT id FROM user_portal_calls WHERE user_id = ? ORDER BY id DESC LIMIT ?)').run(owner, owner, MAX_PORTAL_CALLS);
  } catch {
    // Logging must never break the call it records.
  }
}

export function readPortalCalls(userId, limit = 500) {
  const owner = scope(userId);
  const capped = Math.max(1, Math.min(1000, Number(limit) || 500));
  const db = getDb();
  return db.prepare('SELECT id, time, op, study_id, element_id, ok, http_status, message, elapsed_ms, created_at FROM user_portal_calls WHERE user_id = ? ORDER BY id DESC LIMIT ?').all(owner, capped).map((row) => ({
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

export function saveExportedEvents(userId, events) {
  const owner = scope(userId);
  const db = getDb();
  const fetchedAt = new Date().toISOString();
  const insert = db.prepare(
    'INSERT OR IGNORE INTO user_exported_events (user_id, uid, summary, location, description, dtstart, dtend, fetched_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  );
  let imported = 0;
  db.exec('BEGIN');
  try {
    for (const event of events) {
      const result = insert.run(owner, event.uid, event.summary ?? '', event.location ?? '', event.description ?? '', event.dtstart ?? '', event.dtend ?? '', fetchedAt);
      imported += Number(result.changes ?? 0);
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
  return { imported, skipped: events.length - imported };
}

export function loadExportedEvents(userId, limit = 1000) {
  const owner = scope(userId);
  const db = getDb();
  const capped = Math.max(1, Math.min(5000, Number(limit) || 1000));
  return db.prepare('SELECT uid, summary, location, description, dtstart, dtend, fetched_at FROM user_exported_events WHERE user_id = ? ORDER BY dtstart LIMIT ?').all(owner, capped);
}

export function clearExportedEvents(userId) {
  const owner = scope(userId);
  const db = getDb();
  db.prepare('DELETE FROM user_exported_events WHERE user_id = ?').run(owner);
}

/** Which kind of C@MPUS credential a user signed in with. The secret itself never goes to SQLite. */
export function saveCampusSource(userId, source, account = null) {
  const owner = scope(userId);
  if (source !== 'env' && source !== 'browser') return;
  getDb()
    .prepare('INSERT INTO user_campus (user_id, source, account, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET source = excluded.source, account = COALESCE(excluded.account, user_campus.account), updated_at = excluded.updated_at')
    .run(owner, source, account, new Date().toISOString());
}

export function loadCampusSource(userId) {
  const owner = scope(userId);
  const row = getDb().prepare('SELECT source, account, updated_at FROM user_campus WHERE user_id = ?').get(owner);
  return row ? { source: row.source, account: row.account ?? null, updatedAt: row.updated_at } : null;
}

export function clearCampusSource(userId) {
  getDb().prepare('DELETE FROM user_campus WHERE user_id = ?').run(scope(userId));
}
