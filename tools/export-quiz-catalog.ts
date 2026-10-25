/**
 * Exports the bundled quiz catalog for the assistant server.
 *
 * The app keeps its TypeScript content as the offline fallback. The server
 * seeds its database from this JSON on first start; the admin dashboard then
 * manages the live catalog. Run this after changing quiz content:
 *
 *   npm run quiz:export-catalog
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { quizModules, quizStudies } from '../apps/mobile/src/quiz/content';

const target = resolve('apps/server/quiz/catalog.json');
const catalog = {
  version: 1,
  generatedAt: new Date().toISOString(),
  studies: quizStudies,
  modules: quizModules,
};

mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, `${JSON.stringify(catalog, null, 2)}\n`);

const topics = quizModules.reduce((count, module) => count + module.topics.length, 0);
const questions = quizModules.reduce(
  (count, module) =>
    count + module.topics.reduce((topicCount, topic) => topicCount + topic.questions.length, 0),
  0,
);
console.log(`Wrote ${target}: ${quizStudies.length} studies, ${quizModules.length} modules, ${topics} topics, ${questions} questions.`);
