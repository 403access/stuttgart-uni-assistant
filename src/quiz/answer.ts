import { shuffle } from './session';
import type { QuizAnswer, QuizQuestion } from './types';

/** Fresh answer for a question. Ordering starts shuffled, cloze starts empty. */
export function initialAnswer(question: QuizQuestion): QuizAnswer | undefined {
  switch (question.kind) {
    case 'single':
    case 'free-text':
      return '';
    case 'multiple':
      return [];
    case 'matching':
    case 'map':
      return {};
    case 'ordering':
      return shuffle(question.items.map((item) => item.id));
    case 'cloze':
      return question.segments
        .filter((segment) => segment.type === 'blank')
        .map(() => '');
    case 'true-false':
    case 'flashcard':
      return undefined;
  }
}
