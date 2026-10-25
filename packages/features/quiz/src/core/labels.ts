import type { TranslationKey } from '@ua/core/i18n';
import { tx } from '@ua/core/format';
import type { Locale } from '@ua/core/domain/types';

import type { QuizDifficulty, QuizQuestionKind } from '@ua/quiz-content/types';

const difficultyKeys: Record<QuizDifficulty, TranslationKey> = {
  1: 'quiz.difficulty.1',
  2: 'quiz.difficulty.2',
  3: 'quiz.difficulty.3',
};

const kindKeys: Record<QuizQuestionKind, TranslationKey> = {
  single: 'quiz.type.single',
  multiple: 'quiz.type.multiple',
  'true-false': 'quiz.type.true_false',
  'free-text': 'quiz.type.free_text',
  matching: 'quiz.type.matching',
  ordering: 'quiz.type.ordering',
  cloze: 'quiz.type.cloze',
  map: 'quiz.type.map',
  diagram: 'quiz.type.diagram',
  flashcard: 'quiz.type.flashcard',
};

export function questionKindLabel(kind: QuizQuestionKind, locale: Locale): string {
  return tx(locale, kindKeys[kind]);
}

export function difficultyLabel(difficulty: QuizDifficulty, locale: Locale): string {
  return tx(locale, difficultyKeys[difficulty]);
}
