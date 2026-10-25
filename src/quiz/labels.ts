import type { TranslationKey } from '@/src/i18n';
import { tx } from '@/src/text';
import type { Locale } from '@/src/types';

import type { QuizDifficulty, QuizQuestionKind } from './types';

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
