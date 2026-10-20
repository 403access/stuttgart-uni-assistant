import { TextInput, View } from 'react-native';

import { colors, themedStyles } from '@/src/theme';
import { tx } from '@/src/text';
import type { Locale } from '@/src/types';

import type { FreeTextQuestion } from '../types';

export function FreeTextView({
  question,
  locale,
  value,
  revealed,
  correct,
  onChange,
}: {
  question: FreeTextQuestion;
  locale: Locale;
  value: string | undefined;
  revealed: boolean;
  correct: boolean | null;
  onChange: (value: string) => void;
}) {
  return (
    <View style={{ gap: 8 }}>
      <TextInput
        value={value ?? ''}
        onChangeText={onChange}
        editable={!revealed}
        placeholder={tx(locale, 'quiz.free_text_placeholder')}
        placeholderTextColor={colors.mute}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="done"
        style={[
          styles.input,
          revealed && correct === true && styles.inputCorrect,
          revealed && correct === false && styles.inputWrong,
        ]}
      />
    </View>
  );
}

const styles = themedStyles((colors) => ({
  input: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 17,
    color: colors.anthracite,
  },
  inputCorrect: { borderColor: colors.success, backgroundColor: colors.successSoft },
  inputWrong: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
}));
