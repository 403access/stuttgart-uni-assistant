import { View } from 'react-native';

import { tx } from '@ua/core/format';
import type { Locale } from '@ua/core/domain/types';

import type { TrueFalseQuestion } from '@ua/quiz-content/types';
import { OptionRow } from './option-row';

export function TrueFalseView({
  question,
  locale,
  value,
  revealed,
  onChange,
}: {
  question: TrueFalseQuestion;
  locale: Locale;
  value: boolean | undefined;
  revealed: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={{ gap: 8 }}>
      <OptionRow
        label={tx(locale, 'quiz.true')}
        selected={value === true}
        correct={revealed && question.correct === true}
        wrong={revealed && value === true && question.correct !== true}
        disabled={revealed}
        onPress={() => onChange(true)}
      />
      <OptionRow
        label={tx(locale, 'quiz.false')}
        selected={value === false}
        correct={revealed && question.correct === false}
        wrong={revealed && value === false && question.correct !== false}
        disabled={revealed}
        onPress={() => onChange(false)}
      />
    </View>
  );
}
