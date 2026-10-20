import type { Locale } from '@/src/types';

import type { QuizAnswer, QuizQuestion } from '../types';
import { ClozeView } from './cloze';
import { FlashcardView } from './flashcard';
import { FreeTextView } from './free-text';
import { MapView } from './map';
import { MatchingView } from './matching';
import { MultipleChoiceView } from './multiple-choice';
import { OrderingView } from './ordering';
import { SingleChoiceView } from './single-choice';
import { TrueFalseView } from './true-false';

/**
 * Renders the right reusable question view for a question kind. The session
 * screen only owns the draft answer and the checked state.
 */
export function QuestionView({
  question,
  locale,
  value,
  revealed,
  correct,
  onChange,
  onSelfAssess,
}: {
  question: QuizQuestion;
  locale: Locale;
  value: QuizAnswer | undefined;
  revealed: boolean;
  correct: boolean | null;
  onChange: (value: QuizAnswer) => void;
  onSelfAssess: (correct: boolean) => void;
}) {
  switch (question.kind) {
    case 'single':
      return (
        <SingleChoiceView
          question={question}
          locale={locale}
          value={value as string | undefined}
          revealed={revealed}
          onChange={onChange}
        />
      );
    case 'multiple':
      return (
        <MultipleChoiceView
          question={question}
          locale={locale}
          value={value as string[] | undefined}
          revealed={revealed}
          onChange={onChange}
        />
      );
    case 'true-false':
      return (
        <TrueFalseView
          question={question}
          locale={locale}
          value={value as boolean | undefined}
          revealed={revealed}
          onChange={onChange}
        />
      );
    case 'free-text':
      return (
        <FreeTextView
          question={question}
          locale={locale}
          value={value as string | undefined}
          revealed={revealed}
          correct={correct}
          onChange={onChange}
        />
      );
    case 'matching':
      return (
        <MatchingView
          question={question}
          locale={locale}
          value={value as Record<string, string> | undefined}
          revealed={revealed}
          onChange={onChange}
        />
      );
    case 'ordering':
      return (
        <OrderingView
          question={question}
          locale={locale}
          value={value as string[] | undefined}
          revealed={revealed}
          onChange={onChange}
        />
      );
    case 'cloze':
      return (
        <ClozeView
          question={question}
          locale={locale}
          value={value as string[] | undefined}
          revealed={revealed}
          onChange={onChange}
        />
      );
    case 'map':
      return (
        <MapView
          question={question}
          locale={locale}
          value={value as Record<string, string> | undefined}
          revealed={revealed}
          onChange={onChange}
        />
      );
    case 'flashcard':
      return (
        <FlashcardView
          question={question}
          locale={locale}
          value={value as 'known' | 'unknown' | undefined}
          revealed={revealed}
          onSelfAssess={onSelfAssess}
        />
      );
  }
}
