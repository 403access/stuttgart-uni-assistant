/**
 * Seeds the quiz catalog from the bundled JSON snapshot.
 *
 * The snapshot is generated from the app's TypeScript content with
 * `npm run quiz:export-catalog`. Seeding is intentionally explicit: starting the
 * assistant server calls it once, tests call it themselves, and the admin
 * dashboard can re-import it after a content release.
 */

import { readFileSync } from 'node:fs';

import { getDb } from '../db.mjs';

const CATALOG_PATH = new URL('./catalog.json', import.meta.url);

export function loadBundledQuizCatalog() {
  return JSON.parse(readFileSync(CATALOG_PATH, 'utf8'));
}

function pair(value) {
  return {
    de: typeof value?.de === 'string' ? value.de : '',
    en: typeof value?.en === 'string' ? value.en : '',
  };
}

function baseQuestion(question) {
  const { id, kind, difficulty, prompt, explanation, hint, ...payload } = question;
  return {
    id,
    kind,
    difficulty: Number.isInteger(difficulty) ? difficulty : 2,
    prompt: pair(prompt),
    hint: pair(hint),
    explanationText: pair(explanation),
    payload,
  };
}

function insertCatalog(db, catalog, now) {
  const study = db.prepare(
    'INSERT OR REPLACE INTO quiz_studies (id, title_de, title_en, degree_de, degree_en, color, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
  );
  const module = db.prepare(
    `INSERT OR REPLACE INTO quiz_modules
      (id, study_id, semester, title_de, title_en, subtitle_de, subtitle_en, lecturer, email, published, sort_order, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
  );
  const topic = db.prepare(
    `INSERT OR REPLACE INTO quiz_topics
      (id, module_id, title_de, title_en, summary_de, summary_en, meeting_de, meeting_en, source_de, source_en, figure, published, sort_order, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
  );
  const question = db.prepare(
    `INSERT OR REPLACE INTO quiz_questions
      (id, topic_id, kind, difficulty, prompt_de, prompt_en, hint_de, hint_en, explanation_de, explanation_en, payload, published, sort_order, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
  );

  let studies = 0;
  let modules = 0;
  let topics = 0;
  let questions = 0;

  (catalog.studies ?? []).forEach((entry, index) => {
    study.run(
      entry.id,
      pair(entry.title).de,
      pair(entry.title).en,
      pair(entry.degree).de,
      pair(entry.degree).en,
      typeof entry.color === 'string' ? entry.color : '',
      index,
    );
    studies += 1;
  });

  (catalog.modules ?? []).forEach((entry, moduleIndex) => {
    module.run(
      entry.id,
      entry.studyId,
      Number.isInteger(entry.semester) ? entry.semester : 1,
      pair(entry.title).de,
      pair(entry.title).en,
      pair(entry.subtitle).de,
      pair(entry.subtitle).en,
      typeof entry.lecturer === 'string' ? entry.lecturer : '',
      typeof entry.email === 'string' ? entry.email : '',
      moduleIndex,
      now,
    );
    modules += 1;

    (entry.topics ?? []).forEach((topicEntry, topicIndex) => {
      topic.run(
        topicEntry.id,
        entry.id,
        pair(topicEntry.title).de,
        pair(topicEntry.title).en,
        pair(topicEntry.summary).de,
        pair(topicEntry.summary).en,
        pair(topicEntry.meeting).de,
        pair(topicEntry.meeting).en,
        pair(topicEntry.source).de,
        pair(topicEntry.source).en,
        topicEntry.figure ? JSON.stringify(topicEntry.figure) : null,
        topicIndex,
        now,
      );
      topics += 1;

      (topicEntry.questions ?? []).forEach((questionEntry, questionIndex) => {
        const base = baseQuestion(questionEntry);
        question.run(
          base.id,
          topicEntry.id,
          base.kind,
          base.difficulty,
          base.prompt.de,
          base.prompt.en,
          base.hint.de,
          base.hint.en,
          base.explanationText.de,
          base.explanationText.en,
          JSON.stringify(base.payload),
          questionIndex,
          now,
        );
        questions += 1;
      });
    });
  });

  return { studies, modules, topics, questions };
}

/**
 * Seeds only when the catalog is empty, unless `force` replaces the catalog.
 * Attempts and sessions are never touched, so re-importing after a content
 * release keeps the answer history.
 */
export function seedQuizCatalog({ force = false } = {}) {
  const db = getDb();
  const catalog = loadBundledQuizCatalog();
  const current = db.prepare('SELECT COUNT(*) AS count FROM quiz_topics').get()?.count ?? 0;
  if (current > 0 && !force) {
    return { seeded: false, version: catalog.version, ...counts(db) };
  }

  const now = new Date().toISOString();
  db.exec('BEGIN');
  try {
    if (force) {
      db.exec('DELETE FROM quiz_questions; DELETE FROM quiz_topics; DELETE FROM quiz_modules; DELETE FROM quiz_studies;');
    }
    const written = insertCatalog(db, catalog, now);
    db.exec('COMMIT');
    return { seeded: true, version: catalog.version, ...written };
  } catch (error) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // The transaction may already be rolled back by SQLite.
    }
    throw error;
  }
}

function counts(db) {
  const one = (table) => db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get()?.count ?? 0;
  return {
    studies: one('quiz_studies'),
    modules: one('quiz_modules'),
    topics: one('quiz_topics'),
    questions: one('quiz_questions'),
  };
}

export function quizCatalogCounts() {
  return counts(getDb());
}
