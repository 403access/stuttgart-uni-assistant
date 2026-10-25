import type { QuizModule, QuizQuestion, QuizStudy, QuizTopic } from '@/src/quiz/types';

import { l } from './helpers';
import { generatedTopics } from './generated';
import { phonemMorphem } from './linguistik/phonem-morphem';
import { phonetikModule } from './linguistik/phonetik';
import { sprachfamilien } from './linguistik/sprachfamilien';
import { spracheDialekt } from './linguistik/sprache-dialekt';
import { philosophieModule } from './philosophie';
import { pragmatikModule } from './pragmatik';
import { syntaxModule } from './syntax';

/**
 * The degree programs the quiz content belongs to. They are kept next to the
 * modules so a module can never appear without a study: the quiz hub groups
 * modules by these entries and shows the study on every module screen.
 */
const bundledStudies: QuizStudy[] = [
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

/**
 * PDF-generated topics live in their own registry so the pipeline can add and
 * replace them without editing hand-authored module files.
 */
function attachGenerated(module: QuizModule): QuizModule {
  const generated = generatedTopics
    .filter((entry) => entry.moduleId === module.id)
    .map((entry) => entry.topic);
  if (generated.length === 0) return module;
  return { ...module, topics: [...module.topics, ...generated] };
}

const bundledModules: QuizModule[] = [
  {
    id: 'ling',
    studyId: 'linguistik',
    semester: 1,
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
  phonetikModule,
  philosophieModule,
  pragmatikModule,
  syntaxModule,
].map(attachGenerated);

/**
 * The catalog is a live binding rather than a constant: the app starts with the
 * bundled content, then the catalog provider swaps in the server version when
 * it is reachable. Screens subscribe to `useQuizCatalogVersion()` so importing
 * modules see the rebuilt arrays after an install.
 */
export let quizStudies: QuizStudy[] = bundledStudies;
export let quizModules: QuizModule[] = bundledModules;
export let studyMixedTopics: { study: QuizStudy; topic: QuizTopic }[] = [];
export let mixedTopic: QuizTopic = {
  id: 'quiz-mixed',
  title: l('Gemischte Wiederholung', 'Mixed review'),
  summary: l('', ''),
  questions: [],
};
export let quizTopics: QuizTopic[] = [];

function allQuestions(): QuizQuestion[] {
  return quizModules.flatMap((module) => module.topics.flatMap((topic) => topic.questions));
}

function rebuildDerived(): void {
  const questions = allQuestions();

  /** Synthetic topic that pulls every question from every module into one shuffled round. */
  mixedTopic = {
    id: 'quiz-mixed',
    title: l('Gemischte Wiederholung', 'Mixed review'),
    summary: l(
      'Alle Themen aus allen Studiengängen in einer zufälligen Runde. Ideal, wenn die einzelnen Themen schon sitzen.',
      'All topics from every degree program in one random round. Ideal once the individual topics feel familiar.',
    ),
    source: l('Alle Studiengänge · zufällige Auswahl', 'All degree programs · random selection'),
    questions,
  };

  /**
   * One mixed round per study, so the study filter on the quiz hub also scopes
   * the practice round instead of silently pulling in questions from elsewhere.
   */
  studyMixedTopics = quizStudies.map((study) => {
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

  quizTopics = [
    ...quizModules.flatMap((module) => module.topics),
    ...studyMixedTopics.map((entry) => entry.topic),
    mixedTopic,
  ];
}

rebuildDerived();

/**
 * Installs a catalog fetched from the server (or from the offline cache).
 * Passing the bundled arrays restores the fallback.
 */
export function installQuizCatalog(studies: QuizStudy[], modules: QuizModule[]): void {
  quizStudies = studies;
  quizModules = modules;
  rebuildDerived();
}

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
  return allQuestions().find((question) => question.id === questionId);
}

/** The real topic a question belongs to, even when it was answered in a mixed round. */
export function findQuizTopicForQuestion(questionId: string): QuizTopic | undefined {
  for (const module of quizModules) {
    for (const topic of module.topics) {
      if (topic.questions.some((question) => question.id === questionId)) return topic;
    }
  }
  return undefined;
}
