import { MaterialIcons } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Card, Meter, Pill, Screen, Section } from '@ua/ui';
import { confirmQuizAction } from '@/src/quiz/confirm';
import { useQuizCatalogVersion } from '@/src/quiz/catalog-state';
import { findQuizTopic, isMixedTopic } from '@ua/quiz-content';
import { DiagramFigureCard , QuizButton } from '@ua/feature-quiz/ui';
import { questionKindLabel , topicStats } from '@ua/feature-quiz';
import { useQuizProgress } from '@/src/quiz/progress';
import type { QuizMode, QuizTopic } from '@ua/quiz-content/types';
import { useAppSelector } from '@/src/state/AppState';
import { colors, themedStyles } from '@ua/ui/theme';
import { formatTimestamp, pick, tx } from '@ua/core/format';
import { firstParam } from '@/src/router-params';
import type { Locale } from '@ua/core/domain/types';

function parseMode(value: string | undefined): QuizMode {
  return value === 'quick' || value === 'review' || value === 'mixed' ? value : 'all';
}

export default function QuizTopicOverviewScreen() {
  const locale = useAppSelector((state) => state.locale);
  useQuizCatalogVersion();
  const params = useLocalSearchParams<{ topic: string; mode?: string }>();
  const { ready, attempts, sessions, activeSessions, clearActiveSession } = useQuizProgress();
  const topicId = firstParam(params.topic);
  const topic = findQuizTopic(topicId);

  if (!ready) {
    return (
      <Screen narrow kicker={tx(locale, 'quiz.kicker')}>
        <Stack.Screen options={{ title: tx(locale, 'quiz.title') }} />
        <Card>
          <Text style={styles.muted}>{tx(locale, 'quiz.loading')}</Text>
        </Card>
      </Screen>
    );
  }

  if (!topic) {
    return (
      <Screen narrow kicker={tx(locale, 'quiz.kicker')} subtitle={tx(locale, 'common.eintrag')}>
        <Stack.Screen options={{ title: tx(locale, 'quiz.title') }} />
      </Screen>
    );
  }

  return (
    <TopicOverview
      topic={topic}
      locale={locale}
      initialMode={isMixedTopic(topic.id) ? 'mixed' : parseMode(firstParam(params.mode))}
      attempts={attempts}
      sessions={sessions}
      active={activeSessions[topic.id]}
      clearActiveSession={clearActiveSession}
    />
  );
}

function startRun(topic: QuizTopic, mode: QuizMode, fresh: boolean) {
  router.push({
    pathname: '/quiz/[topic]/run',
    params: { topic: topic.id, mode, ...(fresh ? { fresh: '1' } : {}) },
  });
}

function TopicOverview({
  topic,
  locale,
  initialMode,
  attempts,
  sessions,
  active,
  clearActiveSession,
}: {
  topic: QuizTopic;
  locale: Locale;
  initialMode: QuizMode;
  attempts: ReturnType<typeof useQuizProgress>['attempts'];
  sessions: ReturnType<typeof useQuizProgress>['sessions'];
  active: ReturnType<typeof useQuizProgress>['activeSessions'][string] | undefined;
  clearActiveSession: (topicId: string) => void;
}) {
  const isMixed = isMixedTopic(topic.id);
  const [mode, setMode] = useState<QuizMode>(isMixed ? 'mixed' : initialMode === 'mixed' ? 'all' : initialMode);
  const stats = topicStats(topic, attempts);
  const lastCompleted = sessions.find((session) => session.topicId === topic.id);
  const kinds = [...new Set(topic.questions.map((question) => question.kind))];
  const answered = active?.results.length ?? 0;
  const activeCorrect = active?.results.filter((entry) => entry.correct).length ?? 0;
  const activeWrong = answered - activeCorrect;
  const reviewDisabled = stats.wrong === 0;
  // A review round stops making sense once the last wrong answer is fixed.
  const selectedMode: QuizMode = mode === 'review' && reviewDisabled ? 'all' : mode;

  const startNew = (targetMode: QuizMode) => {
    const run = () => {
      clearActiveSession(topic.id);
      startRun(topic, targetMode, true);
    };
    if (!active) {
      run();
      return;
    }
    confirmQuizAction({
      title: tx(locale, 'quiz.discard_title'),
      message: tx(locale, 'quiz.discard_text'),
      cancelLabel: tx(locale, 'common.abbrechen'),
      confirmLabel: tx(locale, 'quiz.discard_confirm'),
      onConfirm: run,
    });
  };

  return (
    <Screen narrow
      kicker={topic.meeting ? pick(topic.meeting, locale) : tx(locale, 'quiz.kicker')}
      title={pick(topic.title, locale)}
      subtitle={pick(topic.summary, locale)}>
      <Stack.Screen options={{ title: pick(topic.title, locale) }} />

      <Card>
        <View style={styles.statsHeader}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.statsLabel}>{tx(locale, 'quiz.mastered')}</Text>
            <Text style={styles.statsValue}>
              {stats.mastered}
              <Text style={styles.statsTotal}> / {stats.total}</Text>
            </Text>
          </View>
          <View style={styles.accuracy}>
            <Text style={styles.accuracyValue}>{stats.accuracy}%</Text>
            <Text style={styles.accuracyLabel}>{tx(locale, 'quiz.accuracy')}</Text>
          </View>
        </View>
        <Meter value={stats.mastered} max={stats.total} />
        <Text style={styles.muted}>
          {tx(locale, 'quiz.stats_line', [stats.correct, stats.total, stats.wrong])}
        </Text>
        <View style={styles.kinds}>
          {kinds.map((kind) => (
            <Pill key={kind} label={questionKindLabel(kind, locale)} />
          ))}
        </View>
        {topic.source ? (
          <Text style={styles.source}>{tx(locale, 'quiz.source', [pick(topic.source, locale)])}</Text>
        ) : null}
      </Card>

      {active ? (
        <View style={styles.activeCard}>
          <View style={styles.activeHeader}>
            <MaterialIcons name="play-circle-outline" size={20} color={colors.blue} />
            <Text style={styles.sectionTitle}>{tx(locale, 'quiz.active_title')}</Text>
          </View>
          <Text style={styles.activeMode}>{tx(locale, `quiz.mode.${active.mode}`)}</Text>
          <Text style={styles.activeProgress}>
            {tx(locale, 'quiz.active_progress', [
              Math.min(active.index + 1, active.questionIds.length),
              active.questionIds.length,
              answered,
            ])}
          </Text>
          <Meter value={answered} max={active.questionIds.length} />
          <Text style={styles.muted}>{tx(locale, 'quiz.active_score', [activeCorrect, activeWrong])}</Text>
          <Text style={styles.updated}>
            {tx(locale, 'quiz.active_updated', [formatTimestamp(active.updatedAt, locale)])}
          </Text>
          <View style={styles.activeActions}>
            <QuizButton
              label={tx(locale, 'quiz.continue')}
              onPress={() => startRun(topic, active.mode, false)}
            />
            <QuizButton
              label={tx(locale, 'quiz.restart_session')}
              onPress={() => startNew(active.mode)}
              danger
            />
          </View>
        </View>
      ) : null}

      {topic.figure ? <DiagramFigureCard figure={topic.figure} locale={locale} /> : null}

      <Section title={tx(locale, 'quiz.new_round')} />
      <Card>
        <Text style={styles.muted}>
          {tx(locale, active ? 'quiz.new_round_note_active' : 'quiz.new_round_note')}
        </Text>
        {isMixed ? (
          <ModeRow
            selected={selectedMode === 'mixed'}
            title={tx(locale, 'quiz.mode.mixed')}
            detail={tx(locale, 'quiz.mode.mixed_detail', [Math.min(20, topic.questions.length)])}
            onPress={() => setMode('mixed')}
          />
        ) : (
          <>
            <ModeRow
              selected={selectedMode === 'all'}
              title={tx(locale, 'quiz.mode.all')}
              detail={tx(locale, 'quiz.mode.all_detail', [topic.questions.length])}
              onPress={() => setMode('all')}
            />
            <ModeRow
              selected={selectedMode === 'quick'}
              title={tx(locale, 'quiz.mode.quick')}
              detail={tx(locale, 'quiz.mode.quick_detail', [Math.min(5, topic.questions.length)])}
              onPress={() => setMode('quick')}
            />
            <ModeRow
              selected={selectedMode === 'review'}
              disabled={reviewDisabled}
              title={tx(locale, 'quiz.mode.review')}
              detail={
                reviewDisabled
                  ? tx(locale, 'quiz.review_unavailable')
                  : tx(locale, 'quiz.mode.review_detail', [stats.wrong])
              }
              onPress={() => setMode('review')}
            />
          </>
        )}
        <QuizButton
          label={tx(locale, 'quiz.start_named', [tx(locale, `quiz.mode.${selectedMode}`)])}
          onPress={() => startNew(selectedMode)}
          disabled={selectedMode === 'review' && reviewDisabled}
        />
      </Card>

      {lastCompleted ? (
        <>
          <Section title={tx(locale, 'quiz.last_completed')} />
          <Card>
            <View style={styles.lastRow}>
              <View style={{ gap: 2 }}>
                <Text style={styles.lastScore}>
                  {lastCompleted.correct}
                  <Text style={styles.statsTotal}> / {lastCompleted.total}</Text>
                </Text>
                <Text style={styles.muted}>
                  {tx(locale, 'quiz.last_completed_meta', [
                    tx(locale, `quiz.mode.${lastCompleted.mode}`),
                    formatTimestamp(lastCompleted.at, locale),
                  ])}
                </Text>
              </View>
              <MaterialIcons
                name={lastCompleted.correct === lastCompleted.total ? 'emoji-events' : 'history'}
                size={26}
                color={lastCompleted.correct === lastCompleted.total ? colors.success : colors.blue}
              />
            </View>
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

function ModeRow({
  selected,
  disabled = false,
  title,
  detail,
  onPress,
}: {
  selected: boolean;
  disabled?: boolean;
  title: string;
  detail: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.modeRow,
        selected && styles.modeSelected,
        disabled && styles.modeDisabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <MaterialIcons
        name={selected ? 'radio-button-checked' : 'radio-button-unchecked'}
        size={22}
        color={disabled ? colors.mute : selected ? colors.blue : colors.mute}
      />
      <View style={{ flex: 1, gap: 1 }}>
        <Text style={styles.modeTitle}>{title}</Text>
        <Text style={styles.modeDetail}>{detail}</Text>
      </View>
    </Pressable>
  );
}

const styles = themedStyles((colors) => ({
  muted: { color: colors.inkSoft, fontSize: 13, lineHeight: 19 },
  statsHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statsLabel: {
    color: colors.inkSoft,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  statsValue: { color: colors.anthracite, fontSize: 32, fontWeight: '800', letterSpacing: -0.6 },
  statsTotal: { color: colors.inkSoft, fontSize: 17, fontWeight: '700' },
  accuracy: { alignItems: 'flex-end' },
  accuracyValue: { color: colors.blue, fontSize: 20, fontWeight: '800' },
  accuracyLabel: { color: colors.mute, fontSize: 11, fontWeight: '600' },
  kinds: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  source: { color: colors.mute, fontSize: 12, lineHeight: 17, fontStyle: 'italic' },
  activeCard: {
    backgroundColor: colors.paper,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.blue,
    padding: 16,
    gap: 8,
  },
  activeHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: {
    color: colors.blue,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  activeMode: { color: colors.anthracite, fontSize: 17, fontWeight: '800' },
  activeProgress: { color: colors.anthracite, fontSize: 14, fontWeight: '600' },
  updated: { color: colors.mute, fontSize: 11 },
  activeActions: { gap: 8, marginTop: 4 },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: colors.paper,
  },
  modeSelected: { borderColor: colors.blue, backgroundColor: colors.blueSoft },
  modeDisabled: { opacity: 0.45 },
  pressed: { opacity: 0.7 },
  modeTitle: { color: colors.anthracite, fontSize: 15, fontWeight: '700' },
  modeDetail: { color: colors.inkSoft, fontSize: 12, lineHeight: 17 },
  lastRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  lastScore: { color: colors.anthracite, fontSize: 26, fontWeight: '800' },
}));
