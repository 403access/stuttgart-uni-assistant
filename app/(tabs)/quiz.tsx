import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Card, Meter, Screen, Section } from '@/src/components/ui';
import { confirmQuizAction } from '@/src/quiz/confirm';
import { mixedTopic, quizModules } from '@/src/quiz/content';
import { useQuizProgress } from '@/src/quiz/progress';
import { moduleStats, statsForQuestions, topicStats } from '@/src/quiz/session';
import type { QuestionProgress, QuizMode, QuizModule, QuizTopic } from '@/src/quiz/types';
import { useApp } from '@/src/state/AppState';
import { colors, themedStyles } from '@/src/theme';
import { pick, tx } from '@/src/text';
import type { Locale } from '@/src/types';

function startTopic(topic: QuizTopic, mode: QuizMode) {
  router.push({ pathname: '/quiz/[topic]', params: { topic: topic.id, mode } });
}

export default function QuizScreen() {
  const { locale } = useApp();
  const { ready, attempts, sessions, resetProgress } = useQuizProgress();

  if (!ready) {
    return (
      <Screen topInset kicker={tx(locale, 'quiz.kicker')} title={tx(locale, 'quiz.title')}>
        <Card>
          <Text style={styles.muted}>{tx(locale, 'quiz.loading')}</Text>
        </Card>
      </Screen>
    );
  }

  const allQuestions = quizModules.flatMap((module) => module.topics.flatMap((topic) => topic.questions));
  const overall = statsForQuestions(allQuestions, attempts);
  const lastSession = sessions[0];
  const lastTopic = lastSession ? [mixedTopic, ...quizModules.flatMap((module) => module.topics)].find((topic) => topic.id === lastSession.topicId) : undefined;

  return (
    <Screen
      topInset
      kicker={tx(locale, 'quiz.kicker')}
      title={tx(locale, 'quiz.title')}
      subtitle={tx(locale, 'quiz.subtitle')}>
      <Card>
        <View style={styles.statsHeader}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.statsLabel}>{tx(locale, 'quiz.mastered')}</Text>
            <Text style={styles.statsValue}>
              {overall.mastered}
              <Text style={styles.statsTotal}> / {overall.total}</Text>
            </Text>
          </View>
          <View style={styles.accuracy}>
            <Text style={styles.accuracyValue}>{overall.accuracy}%</Text>
            <Text style={styles.accuracyLabel}>{tx(locale, 'quiz.accuracy')}</Text>
          </View>
        </View>
        <Meter value={overall.mastered} max={overall.total} />
        <Text style={styles.muted}>
          {tx(locale, 'quiz.stats_line', [overall.correct, overall.total, overall.wrong])}
        </Text>
        {lastSession && lastTopic ? (
          <Pressable
            onPress={() =>
              startTopic(
                lastTopic,
                lastSession.mode === 'review' && topicStats(lastTopic, attempts).wrong === 0
                  ? 'all'
                  : lastSession.mode,
              )
            }
            style={styles.lastSession}
          >
            <MaterialIcons name="history" size={18} color={colors.blue} />
            <Text style={styles.lastSessionText}>
              {tx(locale, 'quiz.last_session', [
                lastSession.correct,
                lastSession.total,
                pick(lastTopic.title, locale),
              ])}
            </Text>
            <MaterialIcons name="chevron-right" size={18} color={colors.blue} />
          </Pressable>
        ) : null}
      </Card>

      <Section title={tx(locale, 'quiz.modules')} />
      {quizModules.map((module) => (
        <ModuleBlock key={module.id} module={module} locale={locale} attempts={attempts} />
      ))}

      <Section title={tx(locale, 'quiz.practice')} />
      <Card>
        <View style={styles.mixedHeader}>
          <View style={styles.mixedIcon}>
            <MaterialIcons name="shuffle" size={22} color={colors.blue} />
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={styles.topicTitle}>{pick(mixedTopic.title, locale)}</Text>
            <Text style={styles.muted}>{pick(mixedTopic.summary, locale)}</Text>
          </View>
        </View>
        <View style={styles.actions}>
          <Pressable onPress={() => startTopic(mixedTopic, 'mixed')} style={styles.primaryAction}>
            <MaterialIcons name="play-arrow" size={18} color="#FFFFFF" />
            <Text style={styles.primaryActionText}>{tx(locale, 'quiz.start_mixed')}</Text>
          </Pressable>
        </View>
      </Card>

      {overall.seen > 0 ? (
        <Pressable
          onPress={() =>
            confirmQuizAction({
              title: tx(locale, 'quiz.reset_title'),
              message: tx(locale, 'quiz.reset_text'),
              cancelLabel: tx(locale, 'common.abbrechen'),
              confirmLabel: tx(locale, 'common.zuruecksetzen'),
              onConfirm: resetProgress,
            })
          }
          style={styles.reset}
        >
          <MaterialIcons name="delete-outline" size={16} color={colors.mute} />
          <Text style={styles.resetText}>{tx(locale, 'quiz.reset')}</Text>
        </Pressable>
      ) : null}
    </Screen>
  );
}

function ModuleBlock({
  module,
  locale,
  attempts,
}: {
  module: QuizModule;
  locale: Locale;
  attempts: Record<string, QuestionProgress>;
}) {
  const stats = moduleStats(module, attempts);
  return (
    <Card>
      <View style={{ gap: 2 }}>
        <Text style={styles.moduleTitle}>{pick(module.title, locale)}</Text>
        <Text style={styles.muted}>{pick(module.subtitle, locale)}</Text>
      </View>
      <Meter value={stats.mastered} max={stats.total} />
      <Text style={styles.muted}>
        {tx(locale, 'quiz.module_line', [stats.mastered, stats.total, stats.wrong])}
      </Text>
      <View style={{ gap: 8 }}>
        {module.topics.map((topic) => (
          <TopicBlock key={topic.id} topic={topic} locale={locale} attempts={attempts} />
        ))}
      </View>
    </Card>
  );
}

function TopicBlock({
  topic,
  locale,
  attempts,
}: {
  topic: QuizTopic;
  locale: Locale;
  attempts: Record<string, QuestionProgress>;
}) {
  const stats = topicStats(topic, attempts);
  return (
    <View style={styles.topic}>
      <Pressable
        accessibilityRole="button"
        onPress={() => startTopic(topic, 'all')}
        style={({ pressed }) => [styles.topicPress, pressed && styles.pressed]}
      >
        <View style={styles.topicHeader}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.topicTitle}>{pick(topic.title, locale)}</Text>
            <Text style={styles.topicMeta}>
              {topic.meeting ? `${pick(topic.meeting, locale)} · ` : ''}
              {tx(locale, 'quiz.question_count', [topic.questions.length])}
            </Text>
          </View>
          <View style={styles.play}>
            <MaterialIcons name="play-arrow" size={20} color={colors.blue} />
          </View>
        </View>
        <Meter value={stats.mastered} max={stats.total} />
      </Pressable>
      <View style={styles.topicFooter}>
        <Text style={styles.topicProgress}>
          {tx(locale, 'quiz.topic_progress', [stats.mastered, stats.total])}
        </Text>
        <View style={styles.topicLinks}>
          <Pressable accessibilityRole="button" hitSlop={6} onPress={() => startTopic(topic, 'quick')}>
            <Text style={styles.link}>{tx(locale, 'quiz.quick')}</Text>
          </Pressable>
          {stats.wrong > 0 ? (
            <Pressable accessibilityRole="button" hitSlop={6} onPress={() => startTopic(topic, 'review')}>
              <Text style={styles.link}>
                {tx(locale, 'quiz.review')} ({stats.wrong})
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = themedStyles((colors) => ({
  muted: { color: colors.inkSoft, fontSize: 13, lineHeight: 19 },
  statsHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statsLabel: { color: colors.inkSoft, fontSize: 12, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  statsValue: { color: colors.anthracite, fontSize: 32, fontWeight: '800', letterSpacing: -0.6 },
  statsTotal: { color: colors.inkSoft, fontSize: 17, fontWeight: '700' },
  accuracy: { alignItems: 'flex-end' },
  accuracyValue: { color: colors.blue, fontSize: 20, fontWeight: '800' },
  accuracyLabel: { color: colors.mute, fontSize: 11, fontWeight: '600' },
  lastSession: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  lastSessionText: { flex: 1, color: colors.blue, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  moduleTitle: { color: colors.anthracite, fontSize: 18, fontWeight: '800', lineHeight: 24 },
  topic: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 10,
    gap: 6,
  },
  topicPress: { gap: 7, borderRadius: 10 },
  pressed: { opacity: 0.7 },
  topicHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  topicTitle: { color: colors.anthracite, fontSize: 15, fontWeight: '700', lineHeight: 20 },
  topicMeta: { color: colors.mute, fontSize: 11, fontWeight: '600' },
  play: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topicFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  topicProgress: { color: colors.mute, fontSize: 11 },
  topicLinks: { flexDirection: 'row', gap: 12 },
  link: { color: colors.blue, fontSize: 12, fontWeight: '700' },
  mixedHeader: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  mixedIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: { flexDirection: 'row', marginTop: 4 },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.brand,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  primaryActionText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  reset: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8 },
  resetText: { color: colors.mute, fontSize: 12, fontWeight: '600' },
}));
