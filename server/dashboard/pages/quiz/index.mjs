/**
 * Lernquiz dashboard routes: overview, one topic, every answer, and rounds.
 */

import { renderAttemptsPage } from './attempts.mjs';
import { renderCatalogPage } from './catalog.mjs';
import { renderSessionsPage } from './sessions.mjs';
import { renderTopicPage } from './topic.mjs';

export async function renderQuizPage(route) {
  if (route.name === 'quiz-topic') return renderTopicPage(route);
  if (route.name === 'quiz-attempts') return renderAttemptsPage(route);
  if (route.name === 'quiz-sessions') return renderSessionsPage(route);
  return renderCatalogPage(route);
}
