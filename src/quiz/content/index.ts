import type { QuizModule, QuizQuestion, QuizTopic } from '@/src/quiz/types';

import { l } from './helpers';
import { phonemMorphem } from './linguistik/phonem-morphem';
import { sprachfamilien } from './linguistik/sprachfamilien';
import { spracheDialekt } from './linguistik/sprache-dialekt';
import { philosophieModule } from './philosophie';
import { pragmatikModule } from './pragmatik';

export const quizModules: QuizModule[] = [
  {
    id: 'ling',
    title: l(
      'Einführung in die Linguistik (für Linguist/inn/en)',
      'Introduction to Linguistics',
    ),
    subtitle: l(
      'Grundlagen der ersten Sitzung – Sprachfamilien, Sprachbegriffe und die Definitionen von Phonem und Morphem.',
      'First-session basics – language families, concepts of language, and the definitions of phoneme and morpheme.',
    ),
    topics: [sprachfamilien, spracheDialekt, phonemMorphem],
  },
  philosophieModule,
  pragmatikModule,
];

const allQuestions = quizModules.flatMap((module) =>
  module.topics.flatMap((topic) => topic.questions),
);

/** Synthetic topic that pulls every question from every module into one shuffled round. */
export const mixedTopic: QuizTopic = {
  id: 'quiz-mixed',
  title: l('Gemischte Wiederholung', 'Mixed review'),
  summary: l(
    'Alle Themen des Moduls in einer zufälligen Runde. Ideal, wenn die einzelnen Themen schon sitzen.',
    'All topics of the module in one random round. Ideal once the individual topics feel familiar.',
  ),
  source: l('Alle Themen · zufällige Auswahl', 'All topics · random selection'),
  questions: allQuestions,
};

export const quizTopics: QuizTopic[] = [
  ...quizModules.flatMap((module) => module.topics),
  mixedTopic,
];

export function findQuizTopic(topicId: string | undefined): QuizTopic | undefined {
  return quizTopics.find((topic) => topic.id === topicId);
}

export function findQuizModule(topicId: string | undefined): QuizModule | undefined {
  return quizModules.find((module) => module.topics.some((topic) => topic.id === topicId));
}

export function findQuizModuleById(moduleId: string | undefined): QuizModule | undefined {
  return quizModules.find((module) => module.id === moduleId);
}

export function findQuizQuestion(questionId: string): QuizQuestion | undefined {
  return allQuestions.find((question) => question.id === questionId);
}
