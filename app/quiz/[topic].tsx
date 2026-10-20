import { MaterialIcons } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Card, Meter, Pill, Screen } from '@/src/components/ui';
import { findQuizTopic, mixedTopic } from '@/src/quiz/content';
import { initialAnswer } from '@/src/quiz/answer';
import { QuestionFeedback } from '@/src/quiz/components/question-feedback';
import { QuestionView } from '@/src/quiz/components/question-view';
import { QuizButton } from '@/src/quiz/components/quiz-button';
import { evaluateAnswer, isAnswerComplete } from '@/src/quiz/evaluate';
import { difficultyLabel, questionKindLabel } from '@/src/quiz/labels';
import { useQuizProgress } from '@/src/quiz/progress';
import { questionsForMode } from '@/src/quiz/session';
import type { QuizAnswer, QuizMode, QuizQuestion, QuizTopic } from '@/src/quiz/types';
import { useApp } from '@/src/state/AppState';
import { colors, themedStyles } from '@/src/theme';
import { firstParam, pick, tx } from '@/src/text';
import type { Locale } from '@/src/types';

function parseMode(value: string | undefined): QuizMode {
  return value === 'quick' || value === 'review' || value === 'mixed' ? value : 'all';
}

export default function QuizTopicScreen() {
  const { locale } = useApp();
  const params = useLocalSearchParams<{ topic: string; mode?: string }>();
  const { ready } = useQuizProgress();
  const topicId = firstParam(params.topic);
  const topic = findQuizTopic(topicId);
  const mode = topicId === mixedTopic.id ? 'mixed' : parseMode(firstParam(params.mode));

  if (!ready) {
    return (
      <Screen kicker={tx(locale, 'quiz.kicker')}>
        <Stack.Screen options={{ title: tx(locale, 'quiz.title') }} />
        <Card>
          <Text style={styles.muted}>{tx(locale, 'quiz.loading')}</Text>
        </Card>
      </Screen>
    );
  }

  if (!topic) {
    return (
      <Screen kicker={tx(locale, 'quiz.kicker')} subtitle={tx(locale, 'common.eintrag')}>
        <Stack.Screen options={{ title: tx(locale, 'quiz.title') }} />
      </Screen>
    );
  }

  return (
    <QuizRound
      key={`${topic.id}-${mode}`}
      topic={topic}
      mode={mode}
      locale={locale}
    />
  );
}

function QuizRound({ topic, mode, locale }: { topic: QuizTopic; mode: QuizMode; locale: Locale }) {
  const { attempts, recordAnswer, recordSession } = useQuizProgress();
  // Snapshot at mount so recording an answer cannot reshuffle the round.
  const [questions] = useState<QuizQuestion[]>(() => questionsForMode(topic, mode, attempts));
  const [index, setIndex] = useState(0);
  const [value, setValue] = useState<QuizAnswer | undefined>(() =>
    questions[0] ? initialAnswer(questions[0]) : undefined,
  );
  const [checked, setChecked] = useState<boolean | null>(null);
  const [results, setResults] = useState<{ questionId: string; correct: boolean }[]>([]);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);

  const question = questions[index];

  if (!questions.length) {
    return (
      <Screen
        kicker={tx(locale, 'quiz.kicker')}
        title={tx(locale, 'quiz.review_empty_title')}
        subtitle={tx(locale, 'quiz.review_empty')}>
        <Stack.Screen options={{ title: tx(locale, 'quiz.title') }} />
        <QuizButton label={tx(locale, 'quiz.to_overview')} onPress={() => router.back()} />
      </Screen>
    );
  }

  if (!question) return null;

  if (finished) {
    return (
      <QuizResult
        topic={topic}
        locale={locale}
        mode={mode}
        questions={questions}
        results={results}
        durationSeconds={durationSeconds ?? 1}
        onRestart={() => {
          setIndex(0);
          setValue(questions[0] ? initialAnswer(questions[0]) : undefined);
          setChecked(null);
          setResults([]);
          setStartedAt(Date.now());
          setDurationSeconds(null);
          setFinished(false);
        }}
      />
    );
  }

  const submit = () => {
    if (checked !== null || !isAnswerComplete(question, value)) return;
    const correct = evaluateAnswer(question, value);
    setChecked(correct);
    setResults((current) => [...current, { questionId: question.id, correct }]);
    recordAnswer(question.id, correct);
  };

  const selfAssess = (correct: boolean) => {
    if (checked !== null || question.kind !== 'flashcard') return;
    setValue(correct ? 'known' : 'unknown');
    setChecked(correct);
    setResults((current) => [...current, { questionId: question.id, correct }]);
    recordAnswer(question.id, correct);
  };

  const advance = () => {
    if (checked === null) return;
    if (index + 1 >= questions.length) {
      const correctCount = results.filter((entry) => entry.correct).length;
      recordSession({ topicId: topic.id, mode, correct: correctCount, total: questions.length });
      setDurationSeconds(Math.max(1, Math.round((Date.now() - startedAt) / 1000)));
      setFinished(true);
      return;
    }
    const nextIndex = index + 1;
    setIndex(nextIndex);
    setValue(questions[nextIndex] ? initialAnswer(questions[nextIndex]) : undefined);
    setChecked(null);
  };

  const canCheck = question.kind !== 'flashcard' && isAnswerComplete(question, value);
  const footer =
    checked !== null ? (
      <View style={styles.footer}>
        <QuizButton
          label={
            index + 1 >= questions.length ? tx(locale, 'quiz.finish') : tx(locale, 'quiz.next')
          }
          onPress={advance}
        />
      </View>
    ) : question.kind === 'flashcard' ? undefined : (
      <View style={styles.footer}>
        <QuizButton label={tx(locale, 'quiz.check')} onPress={submit} disabled={!canCheck} />
      </View>
    );

  return (
    <Screen
      kicker={`${tx(locale, 'quiz.question')} ${index + 1} / ${questions.length}`}
      title={pick(topic.title, locale)}
      subtitle={tx(locale, `quiz.mode.${mode}`)}
      footer={footer}>
      <Stack.Screen options={{ title: pick(topic.title, locale) }} />
      <Meter value={index + (checked !== null ? 1 : 0)} max={questions.length} />
      <View style={styles.pills}>
        <Pill label={questionKindLabel(question.kind, locale)} />
        <Pill
          label={difficultyLabel(question.difficulty ?? 2, locale)}
          tone={
            (question.difficulty ?? 2) === 1 ? 'ok' : (question.difficulty ?? 2) === 2 ? 'wait' : 'stop'
          }
        />
      </View>
      <Text style={styles.prompt}>{pick(question.prompt, locale)}</Text>
      {question.hint && checked === null ? (
        <Text style={styles.hint}>
          <Text style={styles.hintLabel}>{tx(locale, 'quiz.hint')}: </Text>
          {pick(question.hint, locale)}
        </Text>
      ) : null}
      <QuestionView
        question={question}
        locale={locale}
        value={value}
        revealed={checked !== null}
        correct={checked}
        onChange={setValue}
        onSelfAssess={selfAssess}
      />
      {checked !== null ? (
        <QuestionFeedback question={question} locale={locale} correct={checked} />
      ) : null}
    </Screen>
  );
}

function QuizResult({
  topic,
  locale,
  mode,
  questions,
  results,
  durationSeconds,
  onRestart,
}: {
  topic: QuizTopic;
  locale: Locale;
  mode: QuizMode;
  questions: QuizQuestion[];
  results: { questionId: string; correct: boolean }[];
  durationSeconds: number;
  onRestart: () => void;
}) {
  const correct = results.filter((entry) => entry.correct).length;
  const total = questions.length;
  const percent = total ? Math.round((correct / total) * 100) : 0;
  const message =
    percent >= 90 ? 'quiz.result.great' : percent >= 70 ? 'quiz.result.good' : 'quiz.result.practice';
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = String(durationSeconds % 60).padStart(2, '0');
  const byId = new Map(results.map((entry) => [entry.questionId, entry.correct]));

  return (
    <Screen
      kicker={tx(locale, 'quiz.kicker')}
      title={tx(locale, 'quiz.result_title')}
      subtitle={pick(topic.title, locale)}
      footer={
        <View style={styles.resultFooter}>
          <QuizButton label={tx(locale, 'quiz.restart')} onPress={onRestart} />
          <QuizButton label={tx(locale, 'quiz.to_overview')} onPress={() => router.back()} secondary />
        </View>
      }>
      <Stack.Screen options={{ title: tx(locale, 'quiz.title') }} />
      <Card>
        <View style={styles.scoreRow}>
          <View>
            <Text style={styles.score}>
              {correct}
              <Text style={styles.scoreTotal}> / {total}</Text>
            </Text>
            <Text style={styles.muted}>{tx(locale, 'quiz.result_correct')}</Text>
          </View>
          <View style={styles.percentBadge}>
            <Text style={styles.percent}>{percent}%</Text>
          </View>
        </View>
        <Meter value={correct} max={total} />
        <Text style={styles.muted}>
          {tx(locale, 'quiz.result_meta', [percent, `${minutes}:${seconds}`, tx(locale, `quiz.mode.${mode}`)])}
        </Text>
        <Text style={styles.resultMessage}>{tx(locale, message)}</Text>
      </Card>
      <Text style={styles.sectionTitle}>{tx(locale, 'quiz.result_review')}</Text>
      {questions.map((question, questionIndex) => {
        const isCorrect = byId.get(question.id) === true;
        return (
          <View key={question.id} style={styles.reviewRow}>
            <Text style={styles.reviewIndex}>{questionIndex + 1}</Text>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.reviewPrompt}>{pick(question.prompt, locale)}</Text>
              <Text style={styles.reviewType}>{questionKindLabel(question.kind, locale)}</Text>
            </View>
            <MaterialIcons
              name={isCorrect ? 'check-circle' : 'cancel'}
              size={20}
              color={isCorrect ? colors.success : colors.danger}
            />
          </View>
        );
      })}
    </Screen>
  );
}

const styles = themedStyles((colors) => ({
  muted: { color: colors.inkSoft, fontSize: 14, lineHeight: 20 },
  footer: { paddingHorizontal: 20, paddingTop: 8 },
  pills: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  prompt: { color: colors.anthracite, fontSize: 21, lineHeight: 28, fontWeight: '700' },
  hint: { color: colors.inkSoft, fontSize: 13, lineHeight: 19 },
  hintLabel: { color: colors.blue, fontWeight: '700' },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  score: { color: colors.anthracite, fontSize: 40, fontWeight: '800', letterSpacing: -1 },
  scoreTotal: { fontSize: 22, color: colors.inkSoft, fontWeight: '700' },
  percentBadge: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: colors.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  percent: { color: colors.blue, fontSize: 18, fontWeight: '800' },
  resultMessage: { color: colors.anthracite, fontSize: 15, lineHeight: 21, fontWeight: '600' },
  sectionTitle: {
    color: colors.blue,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.paper,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 12,
  },
  reviewIndex: { color: colors.mute, fontSize: 12, fontWeight: '700', width: 18 },
  reviewPrompt: { color: colors.anthracite, fontSize: 14, lineHeight: 19, fontWeight: '600' },
  reviewType: { color: colors.mute, fontSize: 11, fontWeight: '600' },
  resultFooter: { paddingHorizontal: 20, paddingTop: 8, gap: 8 },
}));
