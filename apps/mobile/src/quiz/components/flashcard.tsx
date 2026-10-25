import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { colors, themedStyles } from '@ua/ui/theme';
import { pick, tx } from '@ua/core/format';
import type { Locale } from '@ua/core/domain/types';

import type { FlashcardQuestion } from '@ua/quiz-content/types';

export function FlashcardView({
  question,
  locale,
  value,
  revealed,
  onSelfAssess,
}: {
  question: FlashcardQuestion;
  locale: Locale;
  value: 'known' | 'unknown' | undefined;
  revealed: boolean;
  onSelfAssess: (correct: boolean) => void;
}) {
  const [showAnswer, setShowAnswer] = useState(false);
  const open = showAnswer || revealed;

  return (
    <View style={{ gap: 10 }}>
      <View style={styles.card}>
        <Text style={styles.label}>{tx(locale, 'quiz.flashcard_answer')}</Text>
        {open ? (
          <Text style={styles.answer}>{pick(question.back, locale)}</Text>
        ) : (
          <Text style={styles.hidden}>{tx(locale, 'quiz.flashcard_hidden')}</Text>
        )}
      </View>
      {!open ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setShowAnswer(true)}
          style={({ pressed }) => [styles.reveal, pressed && styles.pressed]}
        >
          <Text style={styles.revealText}>{tx(locale, 'quiz.flashcard_show')}</Text>
        </Pressable>
      ) : (
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            disabled={revealed}
            onPress={() => onSelfAssess(false)}
            style={({ pressed }) => [
              styles.action,
              styles.again,
              value === 'unknown' && styles.againActive,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.actionText, { color: colors.danger }]}>{tx(locale, 'quiz.flashcard_again')}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={revealed}
            onPress={() => onSelfAssess(true)}
            style={({ pressed }) => [
              styles.action,
              styles.known,
              value === 'known' && styles.knownActive,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.actionText, { color: colors.success }]}>{tx(locale, 'quiz.flashcard_known')}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = themedStyles((colors) => ({
  card: {
    minHeight: 120,
    justifyContent: 'center',
    gap: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    padding: 18,
  },
  label: {
    color: colors.blue,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  answer: { color: colors.anthracite, fontSize: 17, lineHeight: 24, fontWeight: '600' },
  hidden: { color: colors.mute, fontSize: 15, fontStyle: 'italic' },
  reveal: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.blue,
    backgroundColor: colors.blueSoft,
    paddingVertical: 13,
    alignItems: 'center',
  },
  revealText: { color: colors.blue, fontSize: 15, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 8 },
  action: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  again: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  againActive: { borderWidth: 2 },
  known: { borderColor: colors.success, backgroundColor: colors.successSoft },
  knownActive: { borderWidth: 2 },
  actionText: { fontSize: 14, fontWeight: '700' },
  pressed: { opacity: 0.7 },
}));
