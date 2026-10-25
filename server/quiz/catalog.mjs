/**
 * Quiz catalog and answer analytics.
 *
 * The catalog is seeded from the app's bundled JSON and then owned by the admin
 * dashboard. The app reads the published projection; operators see drafts,
 * edit topics/questions, and every recorded answer.
 */

import { randomBytes } from 'node:crypto';

import { recordAdminAudit } from '../admin/audit.mjs';
import { getDb } from '../db.mjs';

export const QUESTION_KINDS = [
  'single',
  'multiple',
  'true-false',
  'free-text',
  'matching',
  'ordering',
  'cloze',
  'map',
  'diagram',
  'flashcard',
];

const MAX_TEXT = 8000;
const MAX_ID = 120;

function quizError(status, code, detail) {
  const error = new Error(code);
  error.status = status;
  if (detail) error.detail = detail;
  return error;
}

function parseJson(value, fallback) {
  if (typeof value !== 'string' || !value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function localized(de, en) {
  const german = typeof de === 'string' ? de : '';
  const english = typeof en === 'string' && en.trim() ? en : german;
  return { de: german, en: english };
}

function text(value, max = MAX_TEXT) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function bool(value, fallback = true) {
  if (typeof value === 'boolean') return value;
  if (value === 0 || value === 1) return value === 1;
  if (value === '0' || value === 'false') return false;
  if (value === '1' || value === 'true') return true;
  return fallback;
}

function int(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

function cleanId(value) {
  const id = text(value, MAX_ID);
  return /^[A-Za-z0-9_-]{3,120}$/.test(id) ? id : '';
}

function generatedId(prefix) {
  return `${prefix}_${randomBytes(8).toString('hex')}`;
}

function pageSize(value, fallback = 50) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(200, Math.trunc(parsed)));
}

function pageOffset(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : 0;
}

function accuracy(correct, total) {
  return total > 0 ? Math.round((correct / total) * 100) : 0;
}

/* --------------------------------------------------------------- catalog -- */

function questionRow(row, { admin = false } = {}) {
  const payload = parseJson(row.payload, {});
  const question = {
    ...payload,
    id: row.id,
    kind: row.kind,
    difficulty: Number(row.difficulty) || 2,
    prompt: localized(row.prompt_de, row.prompt_en),
  };
  const hint = localized(row.hint_de, row.hint_en);
  const explanation = localized(row.explanation_de, row.explanation_en);
  if (hint.de) question.hint = hint;
  if (explanation.de) question.explanation = explanation;
  if (admin) {
    question.published = row.published === 1;
    question.sortOrder = Number(row.sort_order) || 0;
    question.payload = payload;
    question.payloadJson = JSON.stringify(payload, null, 2);
  }
  return question;
}

function topicRow(row, questions, { admin = false } = {}) {
  const topic = {
    id: row.id,
    moduleId: row.module_id,
    title: localized(row.title_de, row.title_en),
    summary: localized(row.summary_de, row.summary_en),
    questions,
  };
  const meeting = localized(row.meeting_de, row.meeting_en);
  const source = localized(row.source_de, row.source_en);
  if (meeting.de) topic.meeting = meeting;
  if (source.de) topic.source = source;
  const figure = parseJson(row.figure, null);
  if (figure) topic.figure = figure;
  if (admin) {
    topic.published = row.published === 1;
    topic.sortOrder = Number(row.sort_order) || 0;
    topic.updatedAt = row.updated_at;
    topic.figureJson = figure ? JSON.stringify(figure, null, 2) : '';
  }
  return topic;
}

function moduleRow(row, topics, { admin = false } = {}) {
  const module = {
    id: row.id,
    studyId: row.study_id,
    semester: Number(row.semester) || 1,
    title: localized(row.title_de, row.title_en),
    subtitle: localized(row.subtitle_de, row.subtitle_en),
    topics,
  };
  if (row.lecturer) module.lecturer = row.lecturer;
  if (row.email) module.email = row.email;
  if (admin) {
    module.published = row.published === 1;
    module.sortOrder = Number(row.sort_order) || 0;
    module.updatedAt = row.updated_at;
  }
  return module;
}

function studyRow(row, { admin = false } = {}) {
  const study = {
    id: row.id,
    title: localized(row.title_de, row.title_en),
    degree: localized(row.degree_de, row.degree_en),
    color: row.color || '#C9930A',
  };
  if (admin) {
    study.sortOrder = Number(row.sort_order) || 0;
  }
  return study;
}

/**
 * The published projection for the app. Modules without a published topic that
 * contains at least one published question are dropped, so an empty draft can
 * never start a zero-question round.
 */
export function readQuizCatalog() {
  const db = getDb();
  const studies = db.prepare('SELECT * FROM quiz_studies ORDER BY sort_order, id').all().map((row) => studyRow(row));
  const modules = db.prepare('SELECT * FROM quiz_modules WHERE published = 1 ORDER BY sort_order, id').all();
  const topics = db.prepare('SELECT * FROM quiz_topics WHERE published = 1 ORDER BY sort_order, id').all();
  const questions = db.prepare('SELECT * FROM quiz_questions WHERE published = 1 ORDER BY sort_order, id').all();

  const questionsByTopic = new Map();
  for (const row of questions) {
    const list = questionsByTopic.get(row.topic_id) ?? [];
    list.push(questionRow(row));
    questionsByTopic.set(row.topic_id, list);
  }
  const topicsByModule = new Map();
  for (const row of topics) {
    const list = questionsByTopic.get(row.id) ?? [];
    if (!list.length) continue;
    const listForModule = topicsByModule.get(row.module_id) ?? [];
    listForModule.push(topicRow(row, list));
    topicsByModule.set(row.module_id, listForModule);
  }
  const publishedModules = modules.flatMap((row) => {
    const list = topicsByModule.get(row.id) ?? [];
    return list.length ? [moduleRow(row, list)] : [];
  });
  const studyIds = new Set(publishedModules.map((module) => module.studyId));
  const version = db
    .prepare(
      `SELECT MAX(updated_at) AS updated FROM (
        SELECT updated_at FROM quiz_modules
        UNION ALL SELECT updated_at FROM quiz_topics
        UNION ALL SELECT updated_at FROM quiz_questions
      )`,
    )
    .get()?.updated ?? '';

  return {
    version,
    studies: studies.filter((study) => studyIds.has(study.id)),
    modules: publishedModules,
  };
}

/* ---------------------------------------------------------- admin catalog -- */

export function adminQuizOverview() {
  const db = getDb();
  const one = (sql, ...params) => db.prepare(sql).get(...params)?.count ?? 0;
  const attempts = one('SELECT COUNT(*) AS count FROM quiz_attempts');
  const correct = one('SELECT COUNT(*) AS count FROM quiz_attempts WHERE correct = 1');
  const users = one('SELECT COUNT(DISTINCT user_id) AS count FROM quiz_attempts WHERE user_id IS NOT NULL');
  const today = one("SELECT COUNT(*) AS count FROM quiz_attempts WHERE substr(answered_at, 1, 10) = date('now')");
  const lastAttemptAt = db.prepare('SELECT MAX(answered_at) AS value FROM quiz_attempts').get()?.value ?? null;
  const sessions = one('SELECT COUNT(*) AS count FROM quiz_sessions');

  const modules = db
    .prepare(
      `SELECT m.*, s.title_de AS study_title_de, s.title_en AS study_title_en,
        (SELECT COUNT(*) FROM quiz_topics t WHERE t.module_id = m.id) AS topics,
        (SELECT COUNT(*) FROM quiz_questions q JOIN quiz_topics t ON t.id = q.topic_id WHERE t.module_id = m.id) AS questions,
        (SELECT COUNT(*) FROM quiz_attempts a JOIN quiz_topics t ON t.id = a.topic_id WHERE t.module_id = m.id) AS attempts,
        (SELECT COUNT(*) FROM quiz_attempts a JOIN quiz_topics t ON t.id = a.topic_id WHERE t.module_id = m.id AND a.correct = 1) AS correct
       FROM quiz_modules m
       JOIN quiz_studies s ON s.id = m.study_id
       ORDER BY s.sort_order, s.id, m.sort_order, m.id`,
    )
    .all()
    .map((row) => ({
      id: row.id,
      studyId: row.study_id,
      studyTitle: localized(row.study_title_de, row.study_title_en),
      semester: Number(row.semester) || 1,
      title: localized(row.title_de, row.title_en),
      subtitle: localized(row.subtitle_de, row.subtitle_en),
      lecturer: row.lecturer ?? '',
      email: row.email ?? '',
      published: row.published === 1,
      topics: Number(row.topics) || 0,
      questions: Number(row.questions) || 0,
      attempts: Number(row.attempts) || 0,
      correct: Number(row.correct) || 0,
      accuracy: accuracy(Number(row.correct) || 0, Number(row.attempts) || 0),
    }));

  const topTopics = db
    .prepare(
      `SELECT t.id, t.title_de, t.title_en, COUNT(a.id) AS attempts,
        SUM(CASE WHEN a.correct = 1 THEN 1 ELSE 0 END) AS correct
       FROM quiz_topics t JOIN quiz_attempts a ON a.topic_id = t.id
       GROUP BY t.id ORDER BY attempts DESC, t.id LIMIT 10`,
    )
    .all()
    .map((row) => ({
      id: row.id,
      title: localized(row.title_de, row.title_en),
      attempts: Number(row.attempts) || 0,
      correct: Number(row.correct) || 0,
      accuracy: accuracy(Number(row.correct) || 0, Number(row.attempts) || 0),
    }));

  return {
    studies: one('SELECT COUNT(*) AS count FROM quiz_studies'),
    modules: one('SELECT COUNT(*) AS count FROM quiz_modules'),
    topics: one('SELECT COUNT(*) AS count FROM quiz_topics'),
    questions: one('SELECT COUNT(*) AS count FROM quiz_questions'),
    publishedTopics: one('SELECT COUNT(*) AS count FROM quiz_topics WHERE published = 1'),
    publishedQuestions: one('SELECT COUNT(*) AS count FROM quiz_questions WHERE published = 1'),
    attempts,
    correct,
    accuracy: accuracy(correct, attempts),
    users,
    today,
    sessions,
    lastAttemptAt,
    modulesList: modules,
    topTopics,
  };
}

export function listAdminQuizTopics({ query, moduleId, published, limit, offset } = {}) {
  const db = getDb();
  const where = [];
  const params = [];
  if (query) {
    where.push('(t.title_de LIKE ? OR t.title_en LIKE ? OR t.summary_de LIKE ? OR t.summary_en LIKE ? OR m.title_de LIKE ? OR m.title_en LIKE ?)');
    const needle = `%${String(query).trim().slice(0, 120)}%`;
    params.push(needle, needle, needle, needle, needle, needle);
  }
  if (moduleId) {
    where.push('t.module_id = ?');
    params.push(String(moduleId));
  }
  if (published === '1' || published === '0') {
    where.push('t.published = ?');
    params.push(published === '1' ? 1 : 0);
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const size = pageSize(limit);
  const start = pageOffset(offset);
  const total = db
    .prepare(`SELECT COUNT(*) AS count FROM quiz_topics t JOIN quiz_modules m ON m.id = t.module_id ${clause}`)
    .get(...params)?.count ?? 0;
  const items = db
    .prepare(
      `SELECT t.*, m.title_de AS module_title_de, m.title_en AS module_title_en,
        s.title_de AS study_title_de, s.title_en AS study_title_en,
        (SELECT COUNT(*) FROM quiz_questions q WHERE q.topic_id = t.id) AS question_count,
        (SELECT COUNT(*) FROM quiz_questions q WHERE q.topic_id = t.id AND q.published = 1) AS published_count,
        (SELECT COUNT(*) FROM quiz_attempts a WHERE a.topic_id = t.id) AS attempts,
        (SELECT COUNT(*) FROM quiz_attempts a WHERE a.topic_id = t.id AND a.correct = 1) AS correct
       FROM quiz_topics t
       JOIN quiz_modules m ON m.id = t.module_id
       JOIN quiz_studies s ON s.id = m.study_id
       ${clause}
       ORDER BY s.sort_order, s.id, m.sort_order, m.id, t.sort_order, t.id
       LIMIT ? OFFSET ?`,
    )
    .all(...params, size, start)
    .map((row) => ({
      id: row.id,
      moduleId: row.module_id,
      moduleTitle: localized(row.module_title_de, row.module_title_en),
      studyTitle: localized(row.study_title_de, row.study_title_en),
      title: localized(row.title_de, row.title_en),
      summary: localized(row.summary_de, row.summary_en),
      published: row.published === 1,
      questionCount: Number(row.question_count) || 0,
      publishedQuestions: Number(row.published_count) || 0,
      attempts: Number(row.attempts) || 0,
      correct: Number(row.correct) || 0,
      accuracy: accuracy(Number(row.correct) || 0, Number(row.attempts) || 0),
      updatedAt: row.updated_at,
    }));
  return { items, total, limit: size, offset: start };
}

export function getAdminQuizTopic(topicId) {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT t.*, m.title_de AS module_title_de, m.title_en AS module_title_en,
        s.title_de AS study_title_de, s.title_en AS study_title_en
       FROM quiz_topics t
       JOIN quiz_modules m ON m.id = t.module_id
       JOIN quiz_studies s ON s.id = m.study_id
       WHERE t.id = ?`,
    )
    .get(topicId);
  if (!row) return null;
  const questions = db
    .prepare(
      `SELECT q.*,
        (SELECT COUNT(*) FROM quiz_attempts a WHERE a.question_id = q.id) AS attempts,
        (SELECT COUNT(*) FROM quiz_attempts a WHERE a.question_id = q.id AND a.correct = 1) AS correct
       FROM quiz_questions q WHERE q.topic_id = ? ORDER BY q.sort_order, q.id`,
    )
    .all(topicId)
    .map((question) => {
      const item = questionRow(question, { admin: true });
      item.attempts = Number(question.attempts) || 0;
      item.correct = Number(question.correct) || 0;
      item.accuracy = accuracy(Number(question.correct) || 0, Number(question.attempts) || 0);
      return item;
    });
  const topic = topicRow(row, questions, { admin: true });
  topic.moduleTitle = localized(row.module_title_de, row.module_title_en);
  topic.studyTitle = localized(row.study_title_de, row.study_title_en);
  topic.attempts = questions.reduce((sum, question) => sum + question.attempts, 0);
  topic.correct = questions.reduce((sum, question) => sum + question.correct, 0);
  topic.accuracy = accuracy(topic.correct, topic.attempts);
  return topic;
}

export function adminQuizModules() {
  const db = getDb();
  return db
    .prepare(
      `SELECT m.*, s.title_de AS study_title_de, s.title_en AS study_title_en,
        (SELECT COUNT(*) FROM quiz_topics t WHERE t.module_id = m.id) AS topics,
        (SELECT COUNT(*) FROM quiz_questions q JOIN quiz_topics t ON t.id = q.topic_id WHERE t.module_id = m.id) AS questions
       FROM quiz_modules m JOIN quiz_studies s ON s.id = m.study_id
       ORDER BY s.sort_order, s.id, m.sort_order, m.id`,
    )
    .all()
    .map((row) => ({
      id: row.id,
      studyId: row.study_id,
      studyTitle: localized(row.study_title_de, row.study_title_en),
      semester: Number(row.semester) || 1,
      title: localized(row.title_de, row.title_en),
      subtitle: localized(row.subtitle_de, row.subtitle_en),
      lecturer: row.lecturer ?? '',
      email: row.email ?? '',
      published: row.published === 1,
      topics: Number(row.topics) || 0,
      questions: Number(row.questions) || 0,
    }));
}

/* ------------------------------------------------------- catalog mutation -- */

function cleanLocalizedValues(input, prefix, { required = false } = {}) {
  const de = text(input[`${prefix}De`]);
  const en = text(input[`${prefix}En`]);
  if (required && !de) throw quizError(400, 'quiz_text_missing', `${prefix}De`);
  return { de, en: en || de };
}

function topicValues(input, existing = null) {
  const moduleId = text(input.moduleId, MAX_ID);
  const db = getDb();
  if (!moduleId || !db.prepare('SELECT 1 FROM quiz_modules WHERE id = ?').get(moduleId)) {
    throw quizError(400, 'quiz_module_unknown');
  }
  const title = cleanLocalizedValues(input, 'title', { required: true });
  const summary = cleanLocalizedValues(input, 'summary', { required: true });
  const meeting = cleanLocalizedValues(input, 'meeting');
  const source = cleanLocalizedValues(input, 'source');
  const figure = input.figure === undefined
    ? existing?.figure ?? null
    : input.figure === null || input.figure === ''
      ? null
      : typeof input.figure === 'string'
        ? input.figure
        : JSON.stringify(input.figure);
  if (figure) {
    const parsed = parseJson(figure, null);
    if (!parsed || typeof parsed !== 'object' || !parsed.viewBox || !Array.isArray(parsed.regions)) {
      throw quizError(400, 'quiz_figure_invalid', 'viewBox und regions fehlen');
    }
    if (!parsed.title || typeof parsed.title.de !== 'string' || !parsed.title.de.trim()) {
      throw quizError(400, 'quiz_figure_invalid', 'title.de fehlt');
    }
    if (typeof parsed.viewBox !== 'string' || !/^\s*-?\d+(?:\.\d+)? -?\d+(?:\.\d+)? \d+(?:\.\d+)? \d+(?:\.\d+)?\s*$/.test(parsed.viewBox)) {
      throw quizError(400, 'quiz_figure_invalid', 'viewBox muss "x y width height" sein');
    }
    if (!Array.isArray(parsed.regions) || !parsed.regions.length) {
      throw quizError(400, 'quiz_figure_invalid', 'regions fehlen');
    }
    parsed.regions.forEach((region, index) => {
      if (!region || typeof region.id !== 'string' || !region.label || typeof region.label.de !== 'string') {
        throw quizError(400, 'quiz_figure_invalid', `regions[${index}] braucht id und label.de`);
      }
      if (!region.path && !region.circle) {
        throw quizError(400, 'quiz_figure_invalid', `regions[${index}] braucht path oder circle`);
      }
    });
  }
  const nextOrder = getDb()
    .prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM quiz_topics WHERE module_id = ?')
    .get(moduleId)?.next ?? 0;
  return {
    moduleId,
    title,
    summary,
    meeting,
    source,
    figure,
    published: bool(input.published, existing ? existing.published === 1 : true),
    sortOrder: int(input.sortOrder, existing ? Number(existing.sort_order) : nextOrder),
  };
}

function insertTopic(id, values, now) {
  getDb()
    .prepare(
      `INSERT INTO quiz_topics
        (id, module_id, title_de, title_en, summary_de, summary_en, meeting_de, meeting_en,
         source_de, source_en, figure, published, sort_order, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      values.moduleId,
      values.title.de,
      values.title.en,
      values.summary.de,
      values.summary.en,
      values.meeting.de,
      values.meeting.en,
      values.source.de,
      values.source.en,
      values.figure,
      values.published ? 1 : 0,
      values.sortOrder,
      now,
    );
}

export function createAdminQuizTopic(input = {}) {
  const rawId = text(input.id, MAX_ID);
  if (rawId && !cleanId(rawId)) throw quizError(400, 'quiz_id_invalid');
  const id = cleanId(rawId) || generatedId('topic');
  const db = getDb();
  if (db.prepare('SELECT 1 FROM quiz_topics WHERE id = ?').get(id)) {
    throw quizError(409, 'quiz_topic_exists');
  }
  if (db.prepare('SELECT 1 FROM quiz_questions WHERE id = ?').get(id)) {
    throw quizError(409, 'quiz_id_taken');
  }
  const values = topicValues(input);
  insertTopic(id, values, new Date().toISOString());
  record('quiz.topic.create', { id, moduleId: values.moduleId, published: values.published });
  return getAdminQuizTopic(id);
}

export function updateAdminQuizTopic(topicId, input = {}) {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM quiz_topics WHERE id = ?').get(topicId);
  if (!existing) return null;
  const values = topicValues(
    {
      moduleId: input.moduleId ?? existing.module_id,
      titleDe: input.titleDe ?? existing.title_de,
      titleEn: input.titleEn ?? existing.title_en,
      summaryDe: input.summaryDe ?? existing.summary_de,
      summaryEn: input.summaryEn ?? existing.summary_en,
      meetingDe: input.meetingDe ?? existing.meeting_de,
      meetingEn: input.meetingEn ?? existing.meeting_en,
      sourceDe: input.sourceDe ?? existing.source_de,
      sourceEn: input.sourceEn ?? existing.source_en,
      figure: input.figure !== undefined ? input.figure : existing.figure,
      published: input.published !== undefined ? input.published : existing.published,
      sortOrder: input.sortOrder !== undefined ? input.sortOrder : existing.sort_order,
    },
    existing,
  );
  db.prepare(
    `UPDATE quiz_topics SET module_id = ?, title_de = ?, title_en = ?, summary_de = ?, summary_en = ?,
       meeting_de = ?, meeting_en = ?, source_de = ?, source_en = ?, figure = ?,
       published = ?, sort_order = ?, updated_at = ? WHERE id = ?`,
  ).run(
    values.moduleId,
    values.title.de,
    values.title.en,
    values.summary.de,
    values.summary.en,
    values.meeting.de,
    values.meeting.en,
    values.source.de,
    values.source.en,
    values.figure,
    values.published ? 1 : 0,
    values.sortOrder,
    new Date().toISOString(),
    topicId,
  );
  record('quiz.topic.update', { id: topicId, fields: Object.keys(input), published: values.published });
  return getAdminQuizTopic(topicId);
}

export function deleteAdminQuizTopic(topicId) {
  const db = getDb();
  const existing = db.prepare('SELECT id, title_de FROM quiz_topics WHERE id = ?').get(topicId);
  if (!existing) return false;
  const questions = db.prepare('SELECT COUNT(*) AS count FROM quiz_questions WHERE topic_id = ?').get(topicId)?.count ?? 0;
  db.prepare('DELETE FROM quiz_topics WHERE id = ?').run(topicId);
  record('quiz.topic.delete', { id: topicId, title: existing.title_de, questions });
  return true;
}

function localizedPayload(value, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw quizError(400, 'quiz_payload_invalid', `${path} muss ein Objekt sein`);
  }
  if (typeof value.de !== 'string' || !value.de.trim()) {
    throw quizError(400, 'quiz_payload_invalid', `${path}.de fehlt`);
  }
  value.de = value.de.trim();
  value.en = typeof value.en === 'string' && value.en.trim() ? value.en.trim() : value.de;
  return value;
}

function list(value, path, minimum = 1) {
  if (!Array.isArray(value) || value.length < minimum) {
    throw quizError(400, 'quiz_payload_invalid', `${path} braucht mindestens ${minimum} Einträge`);
  }
  return value;
}

function validateViewBox(value) {
  if (typeof value !== 'string' || !/^\s*-?\d+(?:\.\d+)? -?\d+(?:\.\d+)? \d+(?:\.\d+)? \d+(?:\.\d+)?\s*$/.test(value)) {
    throw quizError(400, 'quiz_payload_invalid', 'viewBox muss "x y width height" sein');
  }
}

function uniqueIds(items, path) {
  const ids = items.map((item) => item?.id);
  if (ids.some((id) => typeof id !== 'string' || !id)) {
    throw quizError(400, 'quiz_payload_invalid', `${path} brauchen eine id`);
  }
  if (new Set(ids).size !== ids.length) {
    throw quizError(400, 'quiz_payload_invalid', `${path} ids müssen eindeutig sein`);
  }
}

function validateQuestionPayload(kind, payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw quizError(400, 'quiz_payload_invalid', 'payload muss ein Objekt sein');
  }
  if (!QUESTION_KINDS.includes(kind)) throw quizError(400, 'quiz_kind_invalid');
  switch (kind) {
    case 'single': {
      const options = list(payload.options, 'options', 2);
      uniqueIds(options, 'options');
      options.forEach((option, index) => {
        if (!option || typeof option.id !== 'string' || !option.id) throw quizError(400, 'quiz_payload_invalid', `options[${index}].id`);
        localizedPayload(option.label, `options[${index}].label`);
      });
      if (!options.some((option) => option.id === payload.correctId)) {
        throw quizError(400, 'quiz_payload_invalid', 'correctId fehlt in options');
      }
      break;
    }
    case 'multiple': {
      const options = list(payload.options, 'options', 2);
      uniqueIds(options, 'options');
      options.forEach((option, index) => {
        if (!option || typeof option.id !== 'string' || !option.id) throw quizError(400, 'quiz_payload_invalid', `options[${index}].id`);
        localizedPayload(option.label, `options[${index}].label`);
      });
      const correct = list(payload.correctIds, 'correctIds', 1);
      if (new Set(correct).size !== correct.length || !correct.every((id) => typeof id === 'string')) {
        throw quizError(400, 'quiz_payload_invalid', 'correctIds müssen eindeutig sein');
      }
      if (!correct.every((id) => options.some((option) => option.id === id))) {
        throw quizError(400, 'quiz_payload_invalid', 'correctIds fehlt in options');
      }
      break;
    }
    case 'true-false':
      if (typeof payload.correct !== 'boolean') throw quizError(400, 'quiz_payload_invalid', 'correct muss boolean sein');
      break;
    case 'free-text':
      list(payload.accepted, 'accepted', 1).forEach((entry, index) => {
        if (typeof entry !== 'string' || !entry.trim()) throw quizError(400, 'quiz_payload_invalid', `accepted[${index}]`);
      });
      if (payload.keywords !== undefined) {
        list(payload.keywords, 'keywords', 1);
        if (!payload.keywords.every((group) => Array.isArray(group) && group.length)) {
          throw quizError(400, 'quiz_payload_invalid', 'keywords');
        }
      }
      break;
    case 'matching': {
      const pairs = list(payload.pairs, 'pairs', 2);
      uniqueIds(pairs, 'pairs');
      pairs.forEach((pair, index) => {
        if (!pair || typeof pair.id !== 'string' || !pair.id) throw quizError(400, 'quiz_payload_invalid', `pairs[${index}].id`);
        localizedPayload(pair.left, `pairs[${index}].left`);
        localizedPayload(pair.right, `pairs[${index}].right`);
      });
      break;
    }
    case 'ordering': {
      const items = list(payload.items, 'items', 2);
      uniqueIds(items, 'items');
      items.forEach((item, index) => {
        if (!item || typeof item.id !== 'string' || !item.id) throw quizError(400, 'quiz_payload_invalid', `items[${index}].id`);
        localizedPayload(item.label, `items[${index}].label`);
      });
      break;
    }
    case 'cloze': {
      const segments = list(payload.segments, 'segments', 1);
      if (!segments.some((segment) => segment?.type === 'blank')) {
        throw quizError(400, 'quiz_payload_invalid', 'segments brauchen mindestens eine Lücke');
      }
      segments.forEach((segment, index) => {
        if (!segment || (segment.type !== 'text' && segment.type !== 'blank')) {
          throw quizError(400, 'quiz_payload_invalid', `segments[${index}].type`);
        }
        if (segment.type === 'text') localizedPayload(segment.value, `segments[${index}].value`);
        else list(segment.accepted, `segments[${index}].accepted`, 1);
      });
      break;
    }
    case 'map': {
      validateViewBox(payload.viewBox);
      const zones = list(payload.zones, 'zones', 1);
      const regions = list(payload.regions, 'regions', 1);
      uniqueIds(zones, 'zones');
      uniqueIds(regions, 'regions');
      zones.forEach((zone, index) => localizedPayload(zone.label, `zones[${index}].label`));
      const zoneIds = new Set(zones.map((zone) => zone?.id));
      regions.forEach((region, index) => {
        if (!region || typeof region.id !== 'string' || !region.id) throw quizError(400, 'quiz_payload_invalid', `regions[${index}].id`);
        localizedPayload(region.label, `regions[${index}].label`);
        if (typeof region.path !== 'string' || !region.path.trim()) throw quizError(400, 'quiz_payload_invalid', `regions[${index}].path`);
        if (!Number.isFinite(region.labelX) || !Number.isFinite(region.labelY)) throw quizError(400, 'quiz_payload_invalid', `regions[${index}] label anchor`);
        if (!zoneIds.has(payload.correct?.[region.id])) throw quizError(400, 'quiz_payload_invalid', `correct.${region.id}`);
      });
      break;
    }
    case 'diagram': {
      validateViewBox(payload.viewBox);
      if (!Array.isArray(payload.backdrop) || !payload.backdrop.every((path) => typeof path === 'string')) {
        throw quizError(400, 'quiz_payload_invalid', 'backdrop');
      }
      const regions = list(payload.regions, 'regions', 1);
      uniqueIds(regions, 'regions');
      regions.forEach((region, index) => {
        if (!region || typeof region.id !== 'string' || !region.id) throw quizError(400, 'quiz_payload_invalid', `regions[${index}].id`);
        localizedPayload(region.label, `regions[${index}].label`);
        if (!region.path && !region.circle) throw quizError(400, 'quiz_payload_invalid', `regions[${index}] braucht path oder circle`);
        if (!Number.isFinite(region.labelX) || !Number.isFinite(region.labelY)) throw quizError(400, 'quiz_payload_invalid', `regions[${index}] label anchor`);
      });
      const correct = list(payload.correctIds, 'correctIds', 1);
      if (new Set(correct).size !== correct.length || !correct.every((id) => regions.some((region) => region.id === id))) {
        throw quizError(400, 'quiz_payload_invalid', 'correctIds muss eindeutige Regionen nennen');
      }
      break;
    }
    case 'flashcard':
      localizedPayload(payload.back, 'back');
      break;
  }
}

function cleanPayload(value) {
  if (typeof value === 'string') {
    const parsed = parseJson(value, null);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw quizError(400, 'quiz_payload_invalid', 'payloadJson ist kein Objekt');
    }
    return parsed;
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw quizError(400, 'quiz_payload_invalid', 'payload fehlt');
  }
  return value;
}

function questionValues(input, existing = null) {
  const kind = text(input.kind, 40) || existing?.kind || 'single';
  const prompt = cleanLocalizedValues(input, 'prompt', { required: true });
  const hint = cleanLocalizedValues(input, 'hint');
  const explanation = cleanLocalizedValues(input, 'explanation');
  const rawPayload = input.payload !== undefined
    ? cleanPayload(input.payload)
    : input.payloadJson !== undefined
      ? cleanPayload(input.payloadJson)
      : parseJson(existing?.payload, null);
  const payload = rawPayload ? { ...rawPayload } : {};
  for (const key of ['id', 'kind', 'difficulty', 'prompt', 'hint', 'explanation', 'published', 'sortOrder', 'payload', 'payloadJson']) {
    delete payload[key];
  }
  validateQuestionPayload(kind, payload);
  return {
    kind,
    difficulty: Math.max(1, Math.min(3, int(input.difficulty, existing ? Number(existing.difficulty) : 2))),
    prompt,
    hint,
    explanation,
    payload,
    published: bool(input.published, existing ? existing.published === 1 : true),
    sortOrder: int(input.sortOrder, existing ? Number(existing.sort_order) : 0),
  };
}

function insertQuestion(id, topicId, values, now) {
  getDb()
    .prepare(
      `INSERT INTO quiz_questions
        (id, topic_id, kind, difficulty, prompt_de, prompt_en, hint_de, hint_en,
         explanation_de, explanation_en, payload, published, sort_order, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      topicId,
      values.kind,
      values.difficulty,
      values.prompt.de,
      values.prompt.en,
      values.hint.de,
      values.hint.en,
      values.explanation.de,
      values.explanation.en,
      JSON.stringify(values.payload),
      values.published ? 1 : 0,
      values.sortOrder,
      now,
    );
}

export function createAdminQuizQuestion(input = {}) {
  const db = getDb();
  const topicId = text(input.topicId, MAX_ID);
  const topic = topicId ? db.prepare('SELECT id FROM quiz_topics WHERE id = ?').get(topicId) : null;
  if (!topic) throw quizError(400, 'quiz_topic_unknown');
  const rawId = text(input.id, MAX_ID);
  if (rawId && !cleanId(rawId)) throw quizError(400, 'quiz_id_invalid');
  const id = cleanId(rawId) || generatedId('q');
  if (db.prepare('SELECT 1 FROM quiz_questions WHERE id = ?').get(id)) {
    throw quizError(409, 'quiz_question_exists');
  }
  const values = questionValues(
    {
      ...input,
      sortOrder: input.sortOrder !== undefined
        ? input.sortOrder
        : (db.prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM quiz_questions WHERE topic_id = ?').get(topicId)?.next ?? 0),
    },
  );
  insertQuestion(id, topicId, values, new Date().toISOString());
  record('quiz.question.create', { id, topicId, kind: values.kind, published: values.published });
  return getAdminQuizTopic(topicId);
}

export function updateAdminQuizQuestion(questionId, input = {}) {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM quiz_questions WHERE id = ?').get(questionId);
  if (!existing) return null;
  const topicId = input.topicId ?? existing.topic_id;
  if (!db.prepare('SELECT 1 FROM quiz_topics WHERE id = ?').get(topicId)) {
    throw quizError(400, 'quiz_topic_unknown');
  }
  const values = questionValues(
    {
      kind: input.kind ?? existing.kind,
      difficulty: input.difficulty !== undefined ? input.difficulty : existing.difficulty,
      promptDe: input.promptDe ?? existing.prompt_de,
      promptEn: input.promptEn ?? existing.prompt_en,
      hintDe: input.hintDe ?? existing.hint_de,
      hintEn: input.hintEn ?? existing.hint_en,
      explanationDe: input.explanationDe ?? existing.explanation_de,
      explanationEn: input.explanationEn ?? existing.explanation_en,
      payloadJson: input.payload !== undefined
        ? input.payload
        : input.payloadJson !== undefined
          ? input.payloadJson
          : existing.payload,
      published: input.published !== undefined ? input.published : existing.published,
      sortOrder: input.sortOrder !== undefined ? input.sortOrder : existing.sort_order,
    },
    existing,
  );
  db.prepare(
    `UPDATE quiz_questions SET topic_id = ?, kind = ?, difficulty = ?, prompt_de = ?, prompt_en = ?,
       hint_de = ?, hint_en = ?, explanation_de = ?, explanation_en = ?, payload = ?,
       published = ?, sort_order = ?, updated_at = ? WHERE id = ?`,
  ).run(
    topicId,
    values.kind,
    values.difficulty,
    values.prompt.de,
    values.prompt.en,
    values.hint.de,
    values.hint.en,
    values.explanation.de,
    values.explanation.en,
    JSON.stringify(values.payload),
    values.published ? 1 : 0,
    values.sortOrder,
    new Date().toISOString(),
    questionId,
  );
  record('quiz.question.update', { id: questionId, topicId, kind: values.kind, published: values.published });
  return getAdminQuizTopic(topicId);
}

export function deleteAdminQuizQuestion(questionId) {
  const db = getDb();
  const existing = db.prepare('SELECT id, topic_id, prompt_de FROM quiz_questions WHERE id = ?').get(questionId);
  if (!existing) return false;
  db.prepare('DELETE FROM quiz_questions WHERE id = ?').run(questionId);
  record('quiz.question.delete', { id: questionId, topicId: existing.topic_id, prompt: existing.prompt_de });
  return true;
}

export function updateAdminQuizModule(moduleId, input = {}) {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM quiz_modules WHERE id = ?').get(moduleId);
  if (!existing) return null;
  const title = cleanLocalizedValues(
    { titleDe: input.titleDe ?? existing.title_de, titleEn: input.titleEn ?? existing.title_en },
    'title',
    { required: true },
  );
  const subtitle = cleanLocalizedValues(
    { subtitleDe: input.subtitleDe ?? existing.subtitle_de, subtitleEn: input.subtitleEn ?? existing.subtitle_en },
    'subtitle',
    { required: true },
  );
  db.prepare(
    `UPDATE quiz_modules SET semester = ?, title_de = ?, title_en = ?, subtitle_de = ?, subtitle_en = ?,
       lecturer = ?, email = ?, published = ?, sort_order = ?, updated_at = ? WHERE id = ?`,
  ).run(
    Math.max(1, int(input.semester, Number(existing.semester) || 1)),
    title.de,
    title.en,
    subtitle.de,
    subtitle.en,
    input.lecturer !== undefined ? text(input.lecturer, 200) : existing.lecturer,
    input.email !== undefined ? text(input.email, 200) : existing.email,
    bool(input.published, existing.published === 1) ? 1 : 0,
    int(input.sortOrder, Number(existing.sort_order) || 0),
    new Date().toISOString(),
    moduleId,
  );
  record('quiz.module.update', { id: moduleId, fields: Object.keys(input) });
  return adminQuizModules().find((module) => module.id === moduleId) ?? null;
}

/* ---------------------------------------------------------- answer sync -- */

function isoOrNow(value) {
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return new Date().toISOString();
}

function jsonAnswer(value) {
  try {
    const encoded = JSON.stringify(value ?? null);
    return encoded.length > 20_000 ? JSON.stringify(String(value).slice(0, 2000)) : encoded;
  } catch {
    return 'null';
  }
}

/** Accepts a bounded batch from the offline queue. Duplicates are ignored. */
export function recordQuizSync(userId, input = {}) {
  const db = getDb();
  const now = new Date().toISOString();
  const attempts = Array.isArray(input.attempts) ? input.attempts.slice(0, 200) : [];
  const sessions = Array.isArray(input.sessions) ? input.sessions.slice(0, 50) : [];
  const insertAttempt = db.prepare(
    `INSERT OR IGNORE INTO quiz_attempts
      (client_id, user_id, topic_id, topic_title_de, topic_title_en, question_id, kind,
       prompt_de, prompt_en, answer_json, answer_text, correct, answered_at, round_id, received_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertSession = db.prepare(
    `INSERT OR IGNORE INTO quiz_sessions
      (client_id, user_id, topic_id, topic_title_de, topic_title_en, mode, correct, total,
       duration_seconds, started_at, finished_at, received_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  let acceptedAttempts = 0;
  let duplicateAttempts = 0;
  let acceptedSessions = 0;
  let duplicateSessions = 0;

  db.exec('BEGIN');
  try {
    for (const attempt of attempts) {
      const clientId = text(attempt?.clientId, 120);
      const topicId = text(attempt?.topicId, MAX_ID);
      const questionId = text(attempt?.questionId, MAX_ID);
      if (!clientId || !topicId || !questionId || typeof attempt?.correct !== 'boolean') continue;
      const topicTitle = attempt?.topicTitle && typeof attempt.topicTitle === 'object' ? attempt.topicTitle : {};
      const prompt = attempt?.prompt && typeof attempt.prompt === 'object' ? attempt.prompt : {};
      const result = insertAttempt.run(
        clientId,
        userId,
        topicId,
        text(topicTitle.de, 300),
        text(topicTitle.en, 300) || text(topicTitle.de, 300),
        questionId,
        text(attempt?.kind, 40),
        text(prompt.de, 4000),
        text(prompt.en, 4000) || text(prompt.de, 4000),
        jsonAnswer(attempt?.answer),
        text(attempt?.answerText, 4000),
        attempt.correct ? 1 : 0,
        isoOrNow(attempt?.answeredAt),
        text(attempt?.roundId, 200) || null,
        now,
      );
      if (result.changes > 0) acceptedAttempts += 1;
      else duplicateAttempts += 1;
    }
    for (const session of sessions) {
      const clientId = text(session?.clientId, 120);
      const topicId = text(session?.topicId, MAX_ID);
      if (!clientId || !topicId) continue;
      const topicTitle = session?.topicTitle && typeof session.topicTitle === 'object' ? session.topicTitle : {};
      const result = insertSession.run(
        clientId,
        userId,
        topicId,
        text(topicTitle.de, 300),
        text(topicTitle.en, 300) || text(topicTitle.de, 300),
        text(session?.mode, 20),
        Math.max(0, int(session?.correct, 0)),
        Math.max(0, int(session?.total, 0)),
        session?.durationSeconds === null || session?.durationSeconds === undefined
          ? null
          : Math.max(0, int(session.durationSeconds, 0)),
        isoOrNow(session?.startedAt),
        isoOrNow(session?.finishedAt),
        now,
      );
      if (result.changes > 0) acceptedSessions += 1;
      else duplicateSessions += 1;
    }
    db.exec('COMMIT');
  } catch (error) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // Already rolled back.
    }
    throw error;
  }

  return {
    attempts: { accepted: acceptedAttempts, duplicates: duplicateAttempts },
    sessions: { accepted: acceptedSessions, duplicates: duplicateSessions },
  };
}

/* -------------------------------------------------------------- attempts -- */

function attemptFilters(source) {
  const where = [];
  const values = [];
  const query = text(source.query, 160);
  if (query) {
    const needle = `%${query}%`;
    where.push(`(u.account LIKE ? OR u.name LIKE ? OR a.prompt_de LIKE ? OR a.prompt_en LIKE ?
      OR a.answer_text LIKE ? OR a.topic_title_de LIKE ? OR a.topic_title_en LIKE ? OR a.question_id LIKE ?)`);
    values.push(needle, needle, needle, needle, needle, needle, needle, needle);
  }
  const topicId = text(source.topicId, MAX_ID);
  if (topicId) {
    where.push('a.topic_id = ?');
    values.push(topicId);
  }
  const userId = text(source.userId, MAX_ID);
  if (userId) {
    where.push('a.user_id = ?');
    values.push(userId);
  }
  const questionId = text(source.questionId, MAX_ID);
  if (questionId) {
    where.push('a.question_id = ?');
    values.push(questionId);
  }
  if (source.correct === '1' || source.correct === '0') {
    where.push('a.correct = ?');
    values.push(source.correct === '1' ? 1 : 0);
  }
  const from = text(source.from, 40);
  if (from) {
    where.push('a.answered_at >= ?');
    values.push(from);
  }
  const to = text(source.to, 40);
  if (to) {
    where.push('a.answered_at <= ?');
    values.push(to);
  }
  return { clause: where.length ? `WHERE ${where.join(' AND ')}` : '', values };
}

function attemptItem(row) {
  return {
    id: row.id,
    clientId: row.client_id,
    userId: row.user_id,
    account: row.account ?? '',
    name: row.name ?? '',
    topicId: row.topic_id,
    topicTitle: localized(row.topic_title_de, row.topic_title_en),
    questionId: row.question_id,
    kind: row.kind,
    prompt: localized(row.prompt_de, row.prompt_en),
    answer: parseJson(row.answer_json, null),
    answerText: row.answer_text,
    correct: row.correct === 1,
    answeredAt: row.answered_at,
    roundId: row.round_id,
    receivedAt: row.received_at,
  };
}

function attemptStats(clause, values) {
  const row = getDb()
    .prepare(
      `SELECT COUNT(*) AS total, SUM(CASE WHEN a.correct = 1 THEN 1 ELSE 0 END) AS correct,
        COUNT(DISTINCT a.user_id) AS users, MAX(a.answered_at) AS last
       FROM quiz_attempts a LEFT JOIN users u ON u.id = a.user_id ${clause}`,
    )
    .get(...values);
  const total = Number(row?.total) || 0;
  const correct = Number(row?.correct) || 0;
  return { total, correct, users: Number(row?.users) || 0, accuracy: accuracy(correct, total), lastAt: row?.last ?? null };
}

export function listAdminQuizAttempts(options = {}) {
  const { clause, values } = attemptFilters(options);
  const size = pageSize(options.limit);
  const start = pageOffset(options.offset);
  const db = getDb();
  const total = db
    .prepare(`SELECT COUNT(*) AS count FROM quiz_attempts a LEFT JOIN users u ON u.id = a.user_id ${clause}`)
    .get(...values)?.count ?? 0;
  const items = db
    .prepare(
      `SELECT a.*, u.account, u.name FROM quiz_attempts a LEFT JOIN users u ON u.id = a.user_id
       ${clause} ORDER BY a.answered_at DESC, a.id DESC LIMIT ? OFFSET ?`,
    )
    .all(...values, size, start)
    .map(attemptItem);
  return { items, total, limit: size, offset: start, stats: attemptStats(clause, values) };
}

export function quizAttemptsCsv(options = {}) {
  const { clause, values } = attemptFilters(options);
  const rows = getDb()
    .prepare(
      `SELECT a.*, u.account, u.name FROM quiz_attempts a LEFT JOIN users u ON u.id = a.user_id
       ${clause} ORDER BY a.answered_at DESC, a.id DESC LIMIT 5000`,
    )
    .all(...values);
  const cell = (value) => {
    let text = String(value ?? '');
    // Spreadsheet formula injection: prefix a harmless apostrophe.
    if (/^[=+\-@]/.test(text)) text = "'" + text;
    return `"${text.replace(/"/g, '""')}"`;
  };
  const lines = [
    ['Zeit', 'Konto', 'Name', 'Thema', 'Frage', 'Antwort', 'Richtig'].map(cell).join(';'),
    ...rows.map((row) => {
      const item = attemptItem(row);
      return [
        item.answeredAt,
        item.account,
        item.name,
        item.topicTitle.de,
        item.prompt.de,
        item.answerText,
        item.correct ? 'ja' : 'nein',
      ].map(cell).join(';');
    }),
  ];
  return lines.join('\r\n');
}

export function listAdminQuizSessions(options = {}) {
  const db = getDb();
  const where = [];
  const values = [];
  const query = text(options.query, 160);
  if (query) {
    const needle = `%${query}%`;
    where.push('(u.account LIKE ? OR u.name LIKE ? OR s.topic_title_de LIKE ? OR s.topic_title_en LIKE ?)');
    values.push(needle, needle, needle, needle);
  }
  const topicId = text(options.topicId, MAX_ID);
  if (topicId) {
    where.push('s.topic_id = ?');
    values.push(topicId);
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const size = pageSize(options.limit);
  const start = pageOffset(options.offset);
  const total = db
    .prepare(`SELECT COUNT(*) AS count FROM quiz_sessions s LEFT JOIN users u ON u.id = s.user_id ${clause}`)
    .get(...values)?.count ?? 0;
  const items = db
    .prepare(
      `SELECT s.*, u.account, u.name FROM quiz_sessions s LEFT JOIN users u ON u.id = s.user_id
       ${clause} ORDER BY s.finished_at DESC, s.id DESC LIMIT ? OFFSET ?`,
    )
    .all(...values, size, start)
    .map((row) => ({
      id: row.id,
      clientId: row.client_id,
      userId: row.user_id,
      account: row.account ?? '',
      name: row.name ?? '',
      topicId: row.topic_id,
      topicTitle: localized(row.topic_title_de, row.topic_title_en),
      mode: row.mode,
      correct: Number(row.correct) || 0,
      total: Number(row.total) || 0,
      accuracy: accuracy(Number(row.correct) || 0, Number(row.total) || 0),
      durationSeconds: row.duration_seconds,
      startedAt: row.started_at,
      finishedAt: row.finished_at,
    }));
  return { items, total, limit: size, offset: start };
}

export function adminUserQuiz(userId) {
  const db = getDb();
  const stats = db
    .prepare(
      `SELECT COUNT(*) AS total, SUM(CASE WHEN correct = 1 THEN 1 ELSE 0 END) AS correct,
        MAX(answered_at) AS last FROM quiz_attempts WHERE user_id = ?`,
    )
    .get(userId);
  const total = Number(stats?.total) || 0;
  const correct = Number(stats?.correct) || 0;
  const byTopic = db
    .prepare(
      `SELECT topic_id, topic_title_de, topic_title_en, COUNT(*) AS total,
        SUM(CASE WHEN correct = 1 THEN 1 ELSE 0 END) AS correct
       FROM quiz_attempts WHERE user_id = ? GROUP BY topic_id ORDER BY total DESC`,
    )
    .all(userId)
    .map((row) => ({
      topicId: row.topic_id,
      topicTitle: localized(row.topic_title_de, row.topic_title_en),
      total: Number(row.total) || 0,
      correct: Number(row.correct) || 0,
      accuracy: accuracy(Number(row.correct) || 0, Number(row.total) || 0),
    }));
  const attempts = db
    .prepare('SELECT * FROM quiz_attempts WHERE user_id = ? ORDER BY answered_at DESC, id DESC LIMIT 100')
    .all(userId)
    .map((row) => attemptItem({ ...row, account: null, name: null }));
  const sessions = db
    .prepare('SELECT * FROM quiz_sessions WHERE user_id = ? ORDER BY finished_at DESC, id DESC LIMIT 30')
    .all(userId)
    .map((row) => ({
      topicId: row.topic_id,
      topicTitle: localized(row.topic_title_de, row.topic_title_en),
      mode: row.mode,
      correct: Number(row.correct) || 0,
      total: Number(row.total) || 0,
      accuracy: accuracy(Number(row.correct) || 0, Number(row.total) || 0),
      finishedAt: row.finished_at,
    }));
  return {
    stats: { total, correct, accuracy: accuracy(correct, total), lastAt: stats?.last ?? null },
    byTopic,
    attempts,
    sessions,
  };
}

function record(action, detail) {
  recordAdminAudit({ action, detail });
}
