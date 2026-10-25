import { Text, TextInput, View } from 'react-native';

import { colors, themedStyles } from '@/src/theme';
import { tx } from '@/src/text';
import type { Locale } from '@/src/types';

import { matchesAccepted } from '../evaluate';
import type { ClozeQuestion } from '../types';

export function ClozeView({
  question,
  locale,
  value,
  revealed,
  onChange,
}: {
  question: ClozeQuestion;
  locale: Locale;
  value: string[] | undefined;
  revealed: boolean;
  onChange: (value: string[]) => void;
}) {
  const answers = value ?? [];

  const setBlank = (index: number, text: string) => {
    const next = [...answers];
    while (next.length < index) next.push('');
    next[index] = text;
    onChange(next);
  };

  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.hint}>{tx(locale, 'quiz.cloze_hint')}</Text>
      <View style={styles.sentence}>
        {question.segments.map((segment, segmentIndex) => {
          if (segment.type === 'text') {
            return segment.value[locale]
              .split(/\s+/)
              .filter(Boolean)
              .map((word, wordIndex) => (
                <Text key={`${segmentIndex}-${wordIndex}`} style={styles.text}>
                  {word}{' '}
                </Text>
              ));
          }
          const index = question.segments
            .slice(0, segmentIndex)
            .filter((entry) => entry.type === 'blank').length;
          const correct = revealed ? matchesAccepted(answers[index] ?? '', segment.accepted) : null;
          return (
            <TextInput
              key={`blank-${index}`}
              value={answers[index] ?? ''}
              onChangeText={(text) => setBlank(index, text)}
              editable={!revealed}
              placeholder="…"
              placeholderTextColor={colors.mute}
              autoCapitalize="none"
              autoCorrect={false}
              style={[
                styles.blank,
                { width: segment.width ?? 150 },
                revealed && correct === true && styles.blankCorrect,
                revealed && correct === false && styles.blankWrong,
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = themedStyles((colors) => ({
  hint: { color: colors.inkSoft, fontSize: 13, lineHeight: 18 },
  sentence: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', rowGap: 8 },
  text: { color: colors.anthracite, fontSize: 16, lineHeight: 32 },
  blank: {
    height: 36,
    marginHorizontal: 3,
    paddingHorizontal: 8,
    paddingVertical: 0,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.blue,
    backgroundColor: colors.blueSoft,
    color: colors.anthracite,
    fontSize: 15,
    textAlign: 'center',
  },
  blankCorrect: { borderColor: colors.success, backgroundColor: colors.successSoft, color: colors.success },
  blankWrong: { borderColor: colors.danger, backgroundColor: colors.dangerSoft, color: colors.danger },
}));
