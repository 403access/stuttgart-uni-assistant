import type { QuestionProgress, QuizMode, QuizModule, QuizQuestion, QuizTopic } from './types';

const QUICK_ROUND = 5;
const MIXED_ROUND = 20;

export function shuffle<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
}

function difficultyRank(question: QuizQuestion): number {
  return question.difficulty ?? 2;
}

/**
 * Builds the round for a mode:
 * - `all` keeps the authored order (good for first contact),
 * - `quick` prefers unseen, then previously wrong questions,
 * - `review` only repeats questions that were wrong last time,
 * - `mixed` shuffles everything and caps the round.
 */
export function questionsForMode(
  topic: QuizTopic,
  mode: QuizMode,
  attempts: Record<string, QuestionProgress>,
): QuizQuestion[] {
  switch (mode) {
    case 'all':
      return [...topic.questions];
    case 'mixed':
      return shuffle(topic.questions).slice(0, MIXED_ROUND);
    case 'quick': {
      const ranked = shuffle(topic.questions);
      ranked.sort((a, b) => {
        const progressA = attempts[a.id];
        const progressB = attempts[b.id];
        const score = (progress: QuestionProgress | undefined) =>
          progress ? (progress.lastCorrect === false ? 1 : 2) : 0;
        return score(progressA) - score(progressB) || difficultyRank(a) - difficultyRank(b);
      });
      return ranked.slice(0, Math.min(QUICK_ROUND, ranked.length));
    }
    case 'review':
      return shuffle(topic.questions.filter((question) => attempts[question.id]?.lastCorrect === false));
  }
}

export interface TopicStats {
  total: number;
  seen: number;
  /** Questions that were answered correctly at least once. */
  correct: number;
  /** Questions whose most recent answer was correct. */
  mastered: number;
  /** Most recent answer was wrong and can be reviewed. */
  wrong: number;
  accuracy: number;
}

export function statsForQuestions(
  questions: readonly QuizQuestion[],
  attempts: Record<string, QuestionProgress>,
): TopicStats {
  let seen = 0;
  let correct = 0;
  let mastered = 0;
  let wrong = 0;
  let totalAttempts = 0;
  let totalCorrect = 0;
  for (const question of questions) {
    const progress = attempts[question.id];
    if (!progress) continue;
    seen += 1;
    totalAttempts += progress.attempts;
    totalCorrect += progress.correct;
    if (progress.correct > 0) correct += 1;
    if (progress.lastCorrect === true) mastered += 1;
    if (progress.lastCorrect === false) wrong += 1;
  }
  return {
    total: questions.length,
    seen,
    correct,
    mastered,
    wrong,
    accuracy: totalAttempts ? Math.round((totalCorrect / totalAttempts) * 100) : 0,
  };
}

export function topicStats(topic: QuizTopic, attempts: Record<string, QuestionProgress>): TopicStats {
  return statsForQuestions(topic.questions, attempts);
}

export function moduleStats(module: QuizModule, attempts: Record<string, QuestionProgress>): TopicStats {
  return statsForQuestions(
    module.topics.flatMap((topic) => topic.questions),
    attempts,
  );
}
