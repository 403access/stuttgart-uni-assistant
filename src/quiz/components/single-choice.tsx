import { useMemo } from 'react';
import { View } from 'react-native';

import { pick } from '@/src/text';
import type { Locale } from '@/src/types';

import { shuffle } from '../session';
import type { SingleChoiceQuestion } from '../types';
import { OptionRow } from './option-row';

export function SingleChoiceView({
  question,
  locale,
  value,
  revealed,
  onChange,
}: {
  question: SingleChoiceQuestion;
  locale: Locale;
  value: string | undefined;
  revealed: boolean;
  onChange: (value: string) => void;
}) {
  // Keep a stable shuffled order per question so tapping an option does not
  // move the options around.
  const options = useMemo(() => shuffle(question.options), [question.options]);
  return (
    <View style={{ gap: 8 }}>
      {options.map((option) => (
        <OptionRow
          key={option.id}
          label={pick(option.label, locale)}
          selected={value === option.id}
          correct={revealed && option.id === question.correctId}
          wrong={revealed && value === option.id && option.id !== question.correctId}
          disabled={revealed}
          onPress={() => onChange(option.id)}
        />
      ))}
    </View>
  );
}
