import { MaterialIcons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { colors, themedStyles } from '@ua/ui/theme';
import { pick, tx } from '@ua/core/format';
import type { Locale } from '@ua/core/domain/types';

import { describeCorrectAnswer } from '@ua/feature-quiz';
import type { QuizQuestion } from '@ua/quiz-content/types';

export function QuestionFeedback({
  question,
  locale,
  correct,
}: {
  question: QuizQuestion;
  locale: Locale;
  correct: boolean;
}) {
  const solution = correct ? null : describeCorrectAnswer(question, locale);
  return (
    <View style={[styles.box, correct ? styles.correctBox : styles.wrongBox]}>
      <View style={styles.header}>
        <MaterialIcons
          name={correct ? 'check-circle' : 'cancel'}
          size={20}
          color={correct ? colors.success : colors.danger}
        />
        <Text style={[styles.title, { color: correct ? colors.success : colors.danger }]}>
          {tx(locale, correct ? 'quiz.correct' : 'quiz.wrong')}
        </Text>
      </View>
      {solution ? (
        <Text style={styles.solution}>
          <Text style={styles.solutionLabel}>{tx(locale, 'quiz.solution')}: </Text>
          {solution}
        </Text>
      ) : null}
      {question.explanation ? <Text style={styles.explanation}>{pick(question.explanation, locale)}</Text> : null}
    </View>
  );
}

const styles = themedStyles((colors) => ({
  box: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 7 },
  correctBox: { borderColor: colors.success, backgroundColor: colors.successSoft },
  wrongBox: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  header: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  title: { fontSize: 15, fontWeight: '800' },
  solution: { color: colors.anthracite, fontSize: 14, lineHeight: 20 },
  solutionLabel: { fontWeight: '700' },
  explanation: { color: colors.inkSoft, fontSize: 14, lineHeight: 20 },
}));
