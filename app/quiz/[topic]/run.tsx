import { MaterialIcons } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { Card, Meter, Pill, Screen } from '@/src/components/ui';
import { initialAnswer } from '@/src/quiz/answer';
import { findQuizQuestion, findQuizTopic, isMixedTopic } from '@/src/quiz/content';
import { QuestionFeedback } from '@/src/quiz/components/question-feedback';
import { QuestionView } from '@/src/quiz/components/question-view';
import { QuizButton } from '@/src/quiz/components/quiz-button';
import { evaluateAnswer, isAnswerComplete } from '@/src/quiz/evaluate';
import { difficultyLabel, questionKindLabel } from '@/src/quiz/labels';
import { useQuizProgress } from '@/src/quiz/progress';
import { questionsForMode } from '@/src/quiz/session';
import type {
  ActiveQuizSession,
  QuizAnswer,
  QuizMode,
  QuizQuestion,
  QuizTopic,
} from '@/src/quiz/types';
import { useAppSelector } from '@/src/state/AppState';
import { colors, themedStyles } from '@/src/theme';
import { firstParam, pick, tx } from '@/src/text';
import type { Locale } from '@/src/types';

function parseMode(value: string | undefined): QuizMode {
  return value === 'quick' || value === 'review' || value === 'mixed' ? value : 'all';
}

function resolvedQuestions(resume: ActiveQuizSession | null): QuizQuestion[] {
  if (!resume) return [];
  return resume.questionIds.flatMap((id) => {
    const question = findQuizQuestion(id);
    return question ? [question] : [];
  });
}

/** Whether the user already put something into the current question. */
function hasDraft(value: QuizAnswer | undefined): boolean {
  if (value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.some((entry) => String(entry).trim().length > 0);
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
}

export default function QuizRunScreen() {
  const locale = useAppSelector((state) => state.locale);
  const params = useLocalSearchParams<{ topic: string; mode?: string; fresh?: string }>();
  const { ready, activeSessions } = useQuizProgress();
  const topicId = firstParam(params.topic);
  const topic = findQuizTopic(topicId);
  const mode = isMixedTopic(topicId) ? 'mixed' : parseMode(firstParam(params.mode));
  const fresh = firstParam(params.fresh) === '1';

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

  const active = fresh ? undefined : activeSessions[topic.id];
  const resume = active && resolvedQuestions(active).length > 0 ? active : null;

  return (
    <QuizRound
      // Only the route decides the key. Saving an active session must not
      // remount the round (and finishing must not start a fresh one).
      key={`${topic.id}-${mode}-${fresh ? 'fresh' : 'resume'}`}
      topic={topic}
      mode={mode}
      resume={resume}
      locale={locale}
    />
  );
}

function QuizRound({
  topic,
  mode,
  resume,
  locale,
}: {
  topic: QuizTopic;
  mode: QuizMode;
  resume: ActiveQuizSession | null;
  locale: Locale;
}) {
  const { attempts, recordAnswer, recordSession, saveActiveSession, clearActiveSession } = useQuizProgress();
  const resumed = resolvedQuestions(resume);
  const canResume = Boolean(resume && resumed.length > 0 && resume.index >= 0 && resume.index < resumed.length);

  // Snapshot at mount so recording an answer cannot reshuffle the round. A
  // resumed round reuses the exact question ids and order from the saved run.
  const [questions] = useState<QuizQuestion[]>(() =>
    canResume ? resumed : questionsForMode(topic, mode, attempts),
  );
  const [activeMode] = useState<QuizMode>(canResume ? (resume?.mode ?? mode) : mode);
  const [index, setIndex] = useState(() => (canResume ? (resume?.index ?? 0) : 0));
  const [value, setValue] = useState<QuizAnswer | undefined>(() => {
    if (canResume && resume) {
      return resume.value ?? (questions[resume.index] ? initialAnswer(questions[resume.index]) : undefined);
    }
    return questions[0] ? initialAnswer(questions[0]) : undefined;
  });
  const [checked, setChecked] = useState<boolean | null>(() =>
    canResume && resume?.checked !== null && resume?.value !== undefined ? (resume?.checked ?? null) : null,
  );
  const [results, setResults] = useState<{ questionId: string; correct: boolean }[]>(() =>
    canResume && resume ? resume.results : [],
  );
  const [startedAt, setStartedAt] = useState(() =>
    canResume && resume ? Date.parse(resume.startedAt) || Date.now() : Date.now(),
  );
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);

  const question = questions[index];
  const finishedRef = useRef(false);
  const saveableRef = useRef(false);
  const snapshotRef = useRef<ActiveQuizSession>({
    topicId: topic.id,
    mode: activeMode,
    questionIds: questions.map((entry) => entry.id),
    index,
    value,
    checked,
    results,
    startedAt: new Date(startedAt).toISOString(),
    updatedAt: new Date(startedAt).toISOString(),
  });

  const makeSession = (next: Partial<ActiveQuizSession> = {}): ActiveQuizSession => ({
    topicId: topic.id,
    mode: activeMode,
    questionIds: questions.map((entry) => entry.id),
    index,
    value,
    checked,
    results,
    startedAt: new Date(startedAt).toISOString(),
    updatedAt: new Date().toISOString(),
    ...next,
  });

  // Keep a current snapshot for the unmount save. Explicit saves below cover
  // checks, self-assessments and question changes; the cleanup only adds a
  // draft when the user actually interacted with the round.
  useEffect(() => {
    const session = makeSession();
    snapshotRef.current = session;
    saveableRef.current =
      session.results.length > 0 ||
      session.index > 0 ||
      session.checked !== null ||
      (question?.kind !== 'ordering' && hasDraft(session.value));
  });

  useEffect(() => {
    finishedRef.current = finished;
  }, [finished]);

  useEffect(
    () => () => {
      if (!finishedRef.current && saveableRef.current) {
        saveActiveSession(snapshotRef.current);
      }
    },
    [saveActiveSession],
  );

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
        mode={activeMode}
        questions={questions}
        results={results}
        durationSeconds={durationSeconds ?? 1}
        onRestart={() => {
          const nextValue = questions[0] ? initialAnswer(questions[0]) : undefined;
          const now = Date.now();
          setIndex(0);
          setValue(nextValue);
          setChecked(null);
          setResults([]);
          setStartedAt(now);
          setDurationSeconds(null);
          setFinished(false);
        }}
      />
    );
  }

  const submit = () => {
    if (checked !== null || !isAnswerComplete(question, value)) return;
    const correct = evaluateAnswer(question, value);
    const nextResults = [...results, { questionId: question.id, correct }];
    setChecked(correct);
    setResults(nextResults);
    recordAnswer(question.id, correct);
    saveActiveSession(makeSession({ checked: correct, results: nextResults }));
  };

  const selfAssess = (correct: boolean) => {
    if (checked !== null || question.kind !== 'flashcard') return;
    const nextValue = correct ? ('known' as const) : ('unknown' as const);
    const nextResults = [...results, { questionId: question.id, correct }];
    setValue(nextValue);
    setChecked(correct);
    setResults(nextResults);
    recordAnswer(question.id, correct);
    saveActiveSession(makeSession({ value: nextValue, checked: correct, results: nextResults }));
  };

  const advance = () => {
    if (checked === null) return;
    if (index + 1 >= questions.length) {
      const correctCount = results.filter((entry) => entry.correct).length;
      recordSession({ topicId: topic.id, mode: activeMode, correct: correctCount, total: questions.length });
      clearActiveSession(topic.id);
      setDurationSeconds(Math.max(1, Math.round((Date.now() - startedAt) / 1000)));
      setFinished(true);
      return;
    }
    const nextIndex = index + 1;
    const nextValue = questions[nextIndex] ? initialAnswer(questions[nextIndex]) : undefined;
    setIndex(nextIndex);
    setValue(nextValue);
    setChecked(null);
    saveActiveSession(makeSession({ index: nextIndex, value: nextValue, checked: null }));
  };

  const canCheck = question.kind !== 'flashcard' && isAnswerComplete(question, value);
  const footer =
    checked !== null ? (
      <View style={styles.footer}>
        <QuizButton
          label={index + 1 >= questions.length ? tx(locale, 'quiz.finish') : tx(locale, 'quiz.next')}
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
      subtitle={tx(locale, `quiz.mode.${activeMode}`)}
      footer={footer}>
      <Stack.Screen options={{ title: pick(topic.title, locale) }} />
      <Meter value={index + (checked !== null ? 1 : 0)} max={questions.length} />
      <View style={styles.pills}>
        <Pill label={questionKindLabel(question.kind, locale)} />
        <Pill
          label={difficultyLabel(question.difficulty ?? 2, locale)}
          tone={(question.difficulty ?? 2) === 1 ? 'ok' : (question.difficulty ?? 2) === 2 ? 'wait' : 'stop'}
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
      {checked !== null ? <QuestionFeedback question={question} locale={locale} correct={checked} /> : null}
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
