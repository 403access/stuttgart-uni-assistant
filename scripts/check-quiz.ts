import { initialAnswer } from '../src/quiz/answer';
import { mixedTopic, quizModules, quizStudies, quizTopics, studyMixedTopics } from '../src/quiz/content';
import { generatedTopics } from '../src/quiz/content/generated';
import { evaluateAnswer, isAnswerComplete, matchesAccepted } from '../src/quiz/evaluate';
import { questionKindLabel } from '../src/quiz/labels';
import { questionsForMode, statsForQuestions } from '../src/quiz/session';
import type { QuestionProgress, QuizAnswer, QuizQuestion, QuizQuestionKind } from '../src/quiz/types';

const failures: string[] = [];

function expect(condition: boolean, message: string) {
  if (!condition) {
    failures.push(message);
    console.error('FAIL', message);
  } else {
    console.log('ok', message);
  }
}

function blankCount(question: Extract<QuizQuestion, { kind: 'cloze' }>): number {
  return question.segments.filter((segment) => segment.type === 'blank').length;
}

function correctAnswer(question: QuizQuestion): QuizAnswer {
  switch (question.kind) {
    case 'single':
      return question.correctId;
    case 'multiple':
      return [...question.correctIds];
    case 'true-false':
      return question.correct;
    case 'free-text':
      return question.accepted[0];
    case 'matching':
      return Object.fromEntries(question.pairs.map((pair) => [pair.id, pair.id]));
    case 'ordering':
      return question.items.map((item) => item.id);
    case 'cloze':
      return question.segments
        .filter((segment) => segment.type === 'blank')
        .map((segment) => segment.accepted[0]);
    case 'map':
      return { ...question.correct };
    case 'flashcard':
      return 'known';
  }
}

function incorrectAnswer(question: QuizQuestion): QuizAnswer | undefined {
  switch (question.kind) {
    case 'single': {
      const wrong = question.options.find((option) => option.id !== question.correctId);
      return wrong?.id;
    }
    case 'multiple': {
      const subset = question.correctIds.slice(0, Math.max(0, question.correctIds.length - 1));
      return subset.length === question.correctIds.length ? [] : subset;
    }
    case 'true-false':
      return !question.correct;
    case 'free-text':
      return 'diese antwort ist ganz sicher falsch';
    case 'matching': {
      if (question.pairs.length < 2) return {};
      const ids = question.pairs.map((pair) => pair.id);
      const mapping: Record<string, string> = {};
      ids.forEach((id, index) => {
        mapping[id] = ids[(index + 1) % ids.length];
      });
      return mapping;
    }
    case 'ordering':
      return [...question.items].reverse().map((item) => item.id);
    case 'cloze':
      return question.segments
        .filter((segment) => segment.type === 'blank')
        .map(() => 'falsch');
    case 'map': {
      if (question.zones.length < 2) return {};
      const mapping: Record<string, string> = {};
      for (const [regionId, zoneId] of Object.entries(question.correct)) {
        const index = question.zones.findIndex((zone) => zone.id === zoneId);
        mapping[regionId] = question.zones[(index + 1) % question.zones.length].id;
      }
      return mapping;
    }
    case 'flashcard':
      return 'unknown';
  }
}

const allQuestions = quizModules.flatMap((module) =>
  module.topics.flatMap((topic) => topic.questions),
);
const ids = new Set<string>();
for (const question of allQuestions) {
  expect(!ids.has(question.id), `question id is unique: ${question.id}`);
  ids.add(question.id);
  expect(Boolean(question.prompt.de && question.prompt.en), `prompt is bilingual: ${question.id}`);
  expect(
    Boolean(question.explanation?.de && question.explanation?.en) || !question.explanation,
    `explanation is bilingual when present: ${question.id}`,
  );

  switch (question.kind) {
    case 'single': {
      const optionIds = new Set(question.options.map((option) => option.id));
      expect(optionIds.size === question.options.length, `single options have unique ids: ${question.id}`);
      expect(optionIds.has(question.correctId), `single correct id exists: ${question.id}`);
      expect(question.options.length >= 2, `single has at least two options: ${question.id}`);
      break;
    }
    case 'multiple': {
      const optionIds = new Set(question.options.map((option) => option.id));
      expect(optionIds.size === question.options.length, `multiple options have unique ids: ${question.id}`);
      expect(question.correctIds.length > 0, `multiple has correct ids: ${question.id}`);
      expect(
        question.correctIds.every((id) => optionIds.has(id)),
        `multiple correct ids exist: ${question.id}`,
      );
      break;
    }
    case 'matching': {
      const pairIds = new Set(question.pairs.map((pair) => pair.id));
      expect(pairIds.size === question.pairs.length, `matching pair ids are unique: ${question.id}`);
      expect(question.pairs.length >= 2, `matching has at least two pairs: ${question.id}`);
      break;
    }
    case 'ordering': {
      const itemIds = new Set(question.items.map((item) => item.id));
      expect(itemIds.size === question.items.length, `ordering item ids are unique: ${question.id}`);
      expect(question.items.length >= 2, `ordering has at least two items: ${question.id}`);
      break;
    }
    case 'cloze': {
      expect(blankCount(question) > 0, `cloze has at least one blank: ${question.id}`);
      expect(
        question.segments.every(
          (segment) => segment.type === 'text' || segment.accepted.length > 0,
        ),
        `every cloze blank has an accepted answer: ${question.id}`,
      );
      break;
    }
    case 'map': {
      const zoneIds = new Set(question.zones.map((zone) => zone.id));
      const regionIds = new Set(question.regions.map((region) => region.id));
      expect(zoneIds.size === question.zones.length, `map zone ids are unique: ${question.id}`);
      expect(regionIds.size === question.regions.length, `map region ids are unique: ${question.id}`);
      expect(
        question.regions.every((region) => zoneIds.has(question.correct[region.id])),
        `every map region maps to an existing zone: ${question.id}`,
      );
      expect(
        /^0 0 \d+(?:\.\d+)? \d+(?:\.\d+)?$/.test(question.viewBox),
        `map viewBox has the expected shape: ${question.id}`,
      );
      expect(
        question.regions.every((region) => region.path.trim().length > 0),
        `every map region has an outline: ${question.id}`,
      );
      expect(
        question.regions.every(
          (region) => Number.isFinite(region.labelX) && Number.isFinite(region.labelY),
        ),
        `every map region has a label anchor: ${question.id}`,
      );
      expect(
        !question.backdrop || question.backdrop.every((path) => path.trim().length > 0),
        `map backdrop paths are non-empty: ${question.id}`,
      );
      break;
    }
    case 'true-false':
    case 'free-text':
    case 'flashcard':
      break;
  }

  const right = correctAnswer(question);
  expect(isAnswerComplete(question, right), `correct answer is complete: ${question.id}`);
  expect(evaluateAnswer(question, right), `correct answer evaluates as correct: ${question.id}`);

  const wrong = incorrectAnswer(question);
  if (wrong !== undefined) {
    expect(!evaluateAnswer(question, wrong), `wrong answer evaluates as wrong: ${question.id}`);
  }
}

// Free-text matching is deliberately forgiving (case, umlauts, punctuation, small typos).
expect(matchesAccepted('PHONEM', ['Phonem']), 'free text ignores case');
expect(matchesAccepted('phonem.', ['Phonem']), 'free text ignores punctuation');
expect(matchesAccepted('bedeutungsunterscheidend', ['bedeutungsunterscheidende']), 'free text accepts a stem');
expect(matchesAccepted('Saussure', ['Ferdinand de Saussure']), 'free text accepts a surname');
expect(matchesAccepted('Feridnand de Saussure', ['Ferdinand de Saussure']), 'free text tolerates a typo');
expect(matchesAccepted('6.000', ['6000', '6.000']), 'free text accepts a thousands separator');

const kinds: QuizQuestionKind[] = [
  'single',
  'multiple',
  'true-false',
  'free-text',
  'matching',
  'ordering',
  'cloze',
  'map',
  'flashcard',
];
for (const kind of kinds) {
  const label = questionKindLabel(kind, 'de');
  expect(label !== `quiz.type.${kind}`, `question kind has a label: ${kind}`);
}

const topicIds = new Set<string>();
for (const topic of quizTopics) {
  expect(!topicIds.has(topic.id), `topic id is unique: ${topic.id}`);
  topicIds.add(topic.id);
  expect(topic.questions.length >= 5, `topic has at least five questions: ${topic.id}`);
  expect(Boolean(topic.title.de && topic.title.en), `topic title is bilingual: ${topic.id}`);
  expect(Boolean(topic.summary.de && topic.summary.en), `topic summary is bilingual: ${topic.id}`);
}

for (const entry of generatedTopics) {
  const module = quizModules.find((item) => item.id === entry.moduleId);
  expect(Boolean(module), `generated topic targets a module: ${entry.topic.id} -> ${entry.moduleId}`);
  expect(Boolean(module?.topics.includes(entry.topic)), `generated topic is attached: ${entry.topic.id}`);
}

expect(
  quizModules.every((module) => module.topics.every((topic) => quizTopics.includes(topic))),
  'every module topic is registered',
);

for (const module of quizModules) {
  const study = quizStudies.find((item) => item.id === module.studyId);
  expect(Boolean(study), `module belongs to a study: ${module.id}`);
  expect(
    Boolean(study?.title.de && study?.title.en && study?.degree.de && study?.degree.en),
    `study is bilingual: ${module.studyId}`,
  );
  expect(Boolean(study?.color), `study has an accent color: ${module.studyId}`);
  expect(Number.isInteger(module.semester) && module.semester > 0, `module has a semester: ${module.id}`);
}
expect(
  quizStudies.every((study) => quizModules.some((module) => module.studyId === study.id)),
  'every study has at least one module',
);
expect(
  studyMixedTopics.every((entry) => entry.topic.questions.length > 0 && quizTopics.includes(entry.topic)),
  'every study mixed round has questions and is registered',
);

const english = quizModules[0].topics[0];
const emptyProgress: Record<string, QuestionProgress> = {};
expect(
  questionsForMode(english, 'all', emptyProgress).length === english.questions.length,
  'all mode keeps every question',
);
expect(questionsForMode(english, 'quick', emptyProgress).length === 5, 'quick mode picks five questions');
const reviewId = english.questions[0].id;
const reviewProgress: Record<string, QuestionProgress> = {
  [reviewId]: { attempts: 1, correct: 0, lastCorrect: false, lastAt: '2026-10-20T10:00:00.000Z' },
};
const reviewRound = questionsForMode(english, 'review', reviewProgress);
expect(
  reviewRound.length === 1 && reviewRound[0].id === reviewId,
  'review mode only repeats the last wrong answer',
);
const mixedRound = questionsForMode(mixedTopic, 'mixed', emptyProgress);
expect(
  mixedRound.length === Math.min(20, mixedTopic.questions.length),
  'mixed mode caps the round at twenty questions',
);
const stats = statsForQuestions(english.questions, reviewProgress);
expect(stats.seen === 1 && stats.wrong === 1, 'stats count a wrong answer as wrong');
expect(stats.total === english.questions.length, 'stats know the topic size');

const orderingQuestion = allQuestions.find((question) => question.kind === 'ordering');
if (orderingQuestion?.kind === 'ordering') {
  const answer = initialAnswer(orderingQuestion) as string[];
  expect(
    answer.length === orderingQuestion.items.length &&
      [...answer].sort().join(',') === orderingQuestion.items.map((item) => item.id).sort().join(','),
    'ordering starts with a shuffled permutation',
  );
}
const clozeQuestion = allQuestions.find((question) => question.kind === 'cloze');
if (clozeQuestion?.kind === 'cloze') {
  const answer = initialAnswer(clozeQuestion) as string[];
  expect(
    answer.length === blankCount(clozeQuestion) && answer.every((entry) => entry === ''),
    'cloze starts with one empty field per blank',
  );
}

if (failures.length) {
  console.error(`\n${failures.length} quiz check(s) failed.`);
  process.exit(1);
}
console.log(`\n${allQuestions.length} questions across ${quizTopics.length} topics passed.`);
