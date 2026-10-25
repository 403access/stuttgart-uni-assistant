import { useMemo } from 'react';
import { View } from 'react-native';

import { pick } from '@ua/core/format';
import type { Locale } from '@ua/core/domain/types';

import { shuffle } from '@ua/feature-quiz';
import type { MultipleChoiceQuestion } from '@ua/quiz-content/types';
import { OptionRow } from './option-row';

export function MultipleChoiceView({
  question,
  locale,
  value,
  revealed,
  onChange,
}: {
  question: MultipleChoiceQuestion;
  locale: Locale;
  value: string[] | undefined;
  revealed: boolean;
  onChange: (value: string[]) => void;
}) {
  const options = useMemo(() => shuffle(question.options), [question.options]);
  const selected = value ?? [];
  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((entry) => entry !== id) : [...selected, id]);
  };
  return (
    <View style={{ gap: 8 }}>
      {options.map((option) => (
        <OptionRow
          key={option.id}
          multiple
          label={pick(option.label, locale)}
          selected={selected.includes(option.id)}
          correct={revealed && question.correctIds.includes(option.id)}
          wrong={revealed && selected.includes(option.id) && !question.correctIds.includes(option.id)}
          disabled={revealed}
          onPress={() => toggle(option.id)}
        />
      ))}
    </View>
  );
}
