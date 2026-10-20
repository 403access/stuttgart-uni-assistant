/** Per-account curriculum, course, event, and portal-call explorers. */

import { getUser } from '../auth.mjs';
import { getDb, loadStudiesSnapshot } from '../db.mjs';
import { pageOffset, pageSize, parseIdList, parseLecturers, positiveInt } from './util.mjs';

/** Per-study summary: snapshot metadata merged with the stored row counts. */
export function adminUserStudies(userId) {
  if (!getUser(userId)) return { studies: [], fetchedAt: null };
  const db = getDb();
  const snapshot = loadStudiesSnapshot(userId);
  const meta = new Map();
  for (const study of Array.isArray(snapshot?.studies) ? snapshot.studies : []) {
    const studyId = Number(study?.studyId);
    if (Number.isInteger(studyId) && studyId > 0) meta.set(studyId, study);
  }
  const nodes = new Map(
    db
      .prepare(
        `SELECT study_id, COUNT(*) AS n, SUM(completed) AS completed, SUM(in_progress) AS in_progress, MAX(fetched_at) AS fetched_at
         FROM user_curriculum_nodes WHERE user_id = ? GROUP BY study_id`,
      )
      .all(userId)
      .map((row) => [row.study_id, row]),
  );
  const nodeSync = new Map(
    db
      .prepare('SELECT study_id, root_element_id, node_count, finished_at, complete FROM user_curriculum_sync WHERE user_id = ?')
      .all(userId)
      .map((row) => [row.study_id, row]),
  );
  const courses = new Map(
    db
      .prepare('SELECT study_id, COUNT(*) AS n, MAX(fetched_at) AS fetched_at FROM user_courses WHERE user_id = ? GROUP BY study_id')
      .all(userId)
      .map((row) => [row.study_id, row]),
  );
  const courseSync = new Map(
    db
      .prepare('SELECT study_id, course_count, fetched_elements, finished_at, complete FROM user_courses_sync WHERE user_id = ?')
      .all(userId)
      .map((row) => [row.study_id, row]),
  );
  const ids = new Set([...meta.keys(), ...nodes.keys(), ...nodeSync.keys(), ...courses.keys(), ...courseSync.keys()]);
  const studies = [...ids]
    .map((studyId) => {
      const info = meta.get(studyId) ?? {};
      const node = nodes.get(studyId);
      const sync = nodeSync.get(studyId);
      const course = courses.get(studyId);
      const cSync = courseSync.get(studyId);
      return {
        studyId,
        name: typeof info.name === 'string' && info.name ? info.name : `Studium ${studyId}`,
        intendedDegree: info.intendedDegree ?? null,
        versionIdentifier: info.versionIdentifier ?? null,
        identifier: info.identifier ?? null,
        studyStatus: info.studyStatus ?? null,
        curriculumId: Number.isInteger(info.curriculumId) ? info.curriculumId : null,
        elementId: Number.isInteger(info.elementId) ? info.elementId : null,
        color: typeof info.color === 'string' ? info.color : null,
        lastAccessed: info.lastAccessed === true,
        nodeCount: node?.n ?? 0,
        completedNodes: node?.completed ?? 0,
        inProgressNodes: node?.in_progress ?? 0,
        nodesFetchedAt: node?.fetched_at ?? null,
        nodesFinishedAt: sync?.finished_at ?? null,
        nodesComplete: sync?.complete === 1,
        rootElementId: sync?.root_element_id ?? null,
        courseCount: course?.n ?? cSync?.course_count ?? 0,
        coursesFetchedAt: course?.fetched_at ?? null,
        coursesFinishedAt: cSync?.finished_at ?? null,
        coursesComplete: cSync?.complete === 1,
        elementsFetched: parseIdList(cSync?.fetched_elements).length,
      };
    })
    .sort((a, b) => (Number(b.lastAccessed) - Number(a.lastAccessed)) || a.name.localeCompare(b.name, 'de'));
  return { studies, fetchedAt: snapshot?.fetchedAt ?? null };
}

export function adminUserCourses(userId, { studyId = '', query = '', limit = 50, offset = 0 } = {}) {
  if (!getUser(userId)) return null;
  const db = getDb();
  const capped = pageSize(limit, 50);
  const skip = pageOffset(offset);
  const study = positiveInt(studyId);
  const where = ['user_id = ?'];
  const params = [userId];
  if (study) {
    where.push('study_id = ?');
    params.push(study);
  }
  const text = String(query ?? '').trim();
  if (text) {
    where.push('(title LIKE ? OR course_number LIKE ? OR lecturers LIKE ? OR semester LIKE ? OR room_name LIKE ?)');
    const needle = `%${text}%`;
    params.push(needle, needle, needle, needle, needle);
  }
  const clause = `WHERE ${where.join(' AND ')}`;
  const total = db.prepare(`SELECT COUNT(*) AS n FROM user_courses ${clause}`).get(...params)?.n ?? 0;
  const rows = db
    .prepare(
      `SELECT id, study_id, course_number, title, course_type, course_type_short, semester, semester_id, duration, lecturers, room_name,
        start_time, end_time, detail_url, registration_status, registration_action, registration_url, fetched_at
       FROM user_courses ${clause} ORDER BY semester DESC, title COLLATE NOCASE LIMIT ? OFFSET ?`,
    )
    .all(...params, capped, skip);
  const links = new Map();
  if (rows.length) {
    const courseIds = rows.map((row) => row.id);
    const linkRows = db
      .prepare(
        `SELECT course_id, element_id, element_name FROM user_course_elements
         WHERE user_id = ? AND course_id IN (${courseIds.map(() => '?').join(',')})
         ORDER BY element_id`,
      )
      .all(userId, ...courseIds);
    for (const link of linkRows) {
      const list = links.get(link.course_id) ?? [];
      list.push({ elementId: link.element_id, elementName: link.element_name });
      links.set(link.course_id, list);
    }
  }
  return {
    courses: rows.map((row) => ({
      id: row.id,
      studyId: row.study_id,
      courseNumber: row.course_number ?? '',
      title: row.title,
      courseType: row.course_type ?? '',
      courseTypeShort: row.course_type_short ?? '',
      semester: row.semester ?? '',
      semesterId: row.semester_id ?? null,
      duration: row.duration ?? null,
      lecturers: parseLecturers(row.lecturers),
      roomName: row.room_name ?? '',
      startTime: row.start_time ?? '',
      endTime: row.end_time ?? '',
      detailUrl: row.detail_url ?? '',
      registrationStatus: row.registration_status ?? '',
      registrationAction: row.registration_action ?? '',
      registrationUrl: row.registration_url ?? '',
      fetchedAt: row.fetched_at,
      elements: links.get(row.id) ?? [],
    })),
    total,
    limit: capped,
    offset: skip,
    studyId: study,
  };
}

export function adminUserNodes(userId, { studyId = '', query = '', state = '', limit = 50, offset = 0 } = {}) {
  if (!getUser(userId)) return null;
  const db = getDb();
  const capped = pageSize(limit, 50);
  const skip = pageOffset(offset);
  const study = positiveInt(studyId);
  const where = ['user_id = ?'];
  const params = [userId];
  if (study) {
    where.push('study_id = ?');
    params.push(study);
  }
  const text = String(query ?? '').trim();
  if (text) {
    where.push('(name LIKE ? OR designation LIKE ? OR element_type LIKE ?)');
    const needle = `%${text}%`;
    params.push(needle, needle, needle);
  }
  if (state === 'completed') where.push('completed = 1');
  else if (state === 'in_progress') where.push('in_progress = 1');
  else if (state === 'open') where.push('completed = 0 AND in_progress = 0');
  const clause = `WHERE ${where.join(' AND ')}`;
  const total = db.prepare(`SELECT COUNT(*) AS n FROM user_curriculum_nodes ${clause}`).get(...params)?.n ?? 0;
  const nodes = db
    .prepare(
      `SELECT id, study_id, designation, element_type, name, parent_id, completed, in_progress, fetched_at, expanded
       FROM user_curriculum_nodes ${clause} ORDER BY name COLLATE NOCASE, id LIMIT ? OFFSET ?`,
    )
    .all(...params, capped, skip)
    .map((row) => ({
      id: row.id,
      studyId: row.study_id,
      designation: row.designation ?? '',
      elementType: row.element_type ?? '',
      name: row.name,
      parentId: row.parent_id ?? null,
      completed: row.completed === 1,
      inProgress: row.in_progress === 1,
      expanded: row.expanded === 1,
      fetchedAt: row.fetched_at,
    }));
  return { nodes, total, limit: capped, offset: skip, studyId: study };
}

export function adminUserEvents(userId, { query = '', limit = 50, offset = 0 } = {}) {
  if (!getUser(userId)) return null;
  const db = getDb();
  const capped = pageSize(limit, 50);
  const skip = pageOffset(offset);
  const where = ['user_id = ?'];
  const params = [userId];
  const text = String(query ?? '').trim();
  if (text) {
    where.push('(summary LIKE ? OR location LIKE ? OR description LIKE ? OR uid LIKE ?)');
    const needle = `%${text}%`;
    params.push(needle, needle, needle, needle);
  }
  const clause = `WHERE ${where.join(' AND ')}`;
  const total = db.prepare(`SELECT COUNT(*) AS n FROM user_exported_events ${clause}`).get(...params)?.n ?? 0;
  const events = db
    .prepare(
      `SELECT uid, summary, location, description, dtstart, dtend, fetched_at
       FROM user_exported_events ${clause} ORDER BY dtstart ASC, summary COLLATE NOCASE LIMIT ? OFFSET ?`,
    )
    .all(...params, capped, skip)
    .map((row) => ({
      uid: row.uid,
      summary: row.summary ?? '',
      location: row.location ?? '',
      description: row.description ?? '',
      dtstart: row.dtstart ?? '',
      dtend: row.dtend ?? '',
      fetchedAt: row.fetched_at,
    }));
  return { events, total, limit: capped, offset: skip };
}

export function adminUserCalls(userId, { query = '', failed = '', limit = 50, offset = 0 } = {}) {
  if (!getUser(userId)) return null;
  const db = getDb();
  const capped = pageSize(limit, 50);
  const skip = pageOffset(offset);
  const where = ['user_id = ?'];
  const params = [userId];
  const text = String(query ?? '').trim();
  if (text) {
    where.push('(op LIKE ? OR message LIKE ?)');
    params.push(`%${text}%`, `%${text}%`);
  }
  if (failed === '1' || failed === 'true') where.push('ok = 0');
  const clause = `WHERE ${where.join(' AND ')}`;
  const total = db.prepare(`SELECT COUNT(*) AS n FROM user_portal_calls ${clause}`).get(...params)?.n ?? 0;
  const calls = db
    .prepare(
      `SELECT id, time, op, study_id, element_id, ok, http_status, message, elapsed_ms, created_at
       FROM user_portal_calls ${clause} ORDER BY id DESC LIMIT ? OFFSET ?`,
    )
    .all(...params, capped, skip)
    .map((row) => ({
      id: row.id,
      time: row.time,
      op: row.op,
      studyId: row.study_id ?? null,
      elementId: row.element_id ?? null,
      ok: row.ok === 1,
      httpStatus: row.http_status ?? null,
      message: row.message ?? null,
      elapsedMs: row.elapsed_ms,
      createdAt: row.created_at,
    }));
  return { calls, total, limit: capped, offset: skip };
}
