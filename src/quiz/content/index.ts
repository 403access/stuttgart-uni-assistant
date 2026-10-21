import type { QuizModule, QuizQuestion, QuizStudy, QuizTopic } from '@/src/quiz/types';

import { l } from './helpers';
import { phonemMorphem } from './linguistik/phonem-morphem';
import { sprachfamilien } from './linguistik/sprachfamilien';
import { spracheDialekt } from './linguistik/sprache-dialekt';
import { philosophieModule } from './philosophie';
import { pragmatikModule } from './pragmatik';

/**
 * The degree programs the quiz content belongs to. They are kept next to the
 * modules so a module can never appear without a study: the quiz hub groups
 * modules by these entries and shows the study on every module screen.
 */
export const quizStudies: QuizStudy[] = [
  {
    id: 'linguistik',
    title: l('Linguistik', 'Linguistics'),
    degree: l('Bachelor of Arts', 'Bachelor of Arts'),
    color: '#C9930A',
  },
  {
    id: 'philosophie',
    title: l('Philosophie', 'Philosophy'),
    degree: l('Bachelor of Arts', 'Bachelor of Arts'),
    color: '#8A6FD1',
  },
];

export const quizModules: QuizModule[] = [
  {
    id: 'ling',
    studyId: 'linguistik',
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
    'Alle Themen aus allen Studiengängen in einer zufälligen Runde. Ideal, wenn die einzelnen Themen schon sitzen.',
    'All topics from every degree program in one random round. Ideal once the individual topics feel familiar.',
  ),
  source: l('Alle Studiengänge · zufällige Auswahl', 'All degree programs · random selection'),
  questions: allQuestions,
};

/**
 * One mixed round per study, so the study filter on the quiz hub also scopes
 * the practice round instead of silently pulling in questions from elsewhere.
 */
export const studyMixedTopics: { study: QuizStudy; topic: QuizTopic }[] = quizStudies.map((study) => {
  const modules = quizModulesForStudy(study.id);
  return {
    study,
    topic: {
      id: `quiz-mixed-${study.id}`,
      title: l('Gemischte Wiederholung', 'Mixed review'),
      summary: l(
        `Alle Themen aus ${study.title.de} in einer zufälligen Runde. Ideal, wenn die einzelnen Themen schon sitzen.`,
        `All topics from ${study.title.en} in one random round. Ideal once the individual topics feel familiar.`,
      ),
      source: l('Studiengang · zufällige Auswahl', 'Degree program · random selection'),
      questions: modules.flatMap((module) => module.topics.flatMap((topic) => topic.questions)),
    },
  };
});

export const quizTopics: QuizTopic[] = [
  ...quizModules.flatMap((module) => module.topics),
  ...studyMixedTopics.map((entry) => entry.topic),
  mixedTopic,
];

/** Whether a topic is one of the synthetic mixed rounds (all studies or one study). */
export function isMixedTopic(topicId: string | undefined): boolean {
  return topicId === mixedTopic.id || studyMixedTopics.some((entry) => entry.topic.id === topicId);
}

export function mixedTopicForStudy(studyId: string | undefined): QuizTopic | undefined {
  return studyMixedTopics.find((entry) => entry.study.id === studyId)?.topic;
}

export function findQuizTopic(topicId: string | undefined): QuizTopic | undefined {
  return quizTopics.find((topic) => topic.id === topicId);
}

export function findQuizModule(topicId: string | undefined): QuizModule | undefined {
  return quizModules.find((module) => module.topics.some((topic) => topic.id === topicId));
}

export function findQuizModuleById(moduleId: string | undefined): QuizModule | undefined {
  return quizModules.find((module) => module.id === moduleId);
}

export function findQuizStudy(studyId: string | undefined): QuizStudy | undefined {
  return quizStudies.find((study) => study.id === studyId);
}

export function studyForModule(module: QuizModule): QuizStudy | undefined {
  return findQuizStudy(module.studyId);
}

export function quizModulesForStudy(studyId: string): QuizModule[] {
  return quizModules.filter((module) => module.studyId === studyId);
}

export function findQuizQuestion(questionId: string): QuizQuestion | undefined {
  return allQuestions.find((question) => question.id === questionId);
}
