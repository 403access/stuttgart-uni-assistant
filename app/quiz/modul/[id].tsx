import { MaterialIcons } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Card, Meter, Pill, Screen, Section } from '@/src/components/ui';
import { findQuizModuleById } from '@/src/quiz/content';
import { useQuizProgress } from '@/src/quiz/progress';
import { moduleStats, topicStats } from '@/src/quiz/session';
import type { QuizModule, QuizMode, QuizTopic } from '@/src/quiz/types';
import { useApp } from '@/src/state/AppState';
import { colors, themedStyles } from '@/src/theme';
import { firstParam, pick, tx } from '@/src/text';
import type { Locale } from '@/src/types';

function startTopic(topic: QuizTopic, mode: QuizMode) {
  router.push({ pathname: '/quiz/[topic]', params: { topic: topic.id, mode } });
}

export default function QuizModuleScreen() {
  const { locale } = useApp();
  const params = useLocalSearchParams<{ id: string }>();
  const { ready, attempts, activeSessions } = useQuizProgress();
  const module = findQuizModuleById(firstParam(params.id));

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

  if (!module) {
    return (
      <Screen kicker={tx(locale, 'quiz.kicker')} subtitle={tx(locale, 'common.eintrag')}>
        <Stack.Screen options={{ title: tx(locale, 'quiz.title') }} />
      </Screen>
    );
  }

  return (
    <ModuleOverview
      module={module}
      locale={locale}
      attempts={attempts}
      activeSessions={activeSessions}
    />
  );
}

function ModuleOverview({
  module,
  locale,
  attempts,
  activeSessions,
}: {
  module: QuizModule;
  locale: Locale;
  attempts: ReturnType<typeof useQuizProgress>['attempts'];
  activeSessions: ReturnType<typeof useQuizProgress>['activeSessions'];
}) {
  const stats = moduleStats(module, attempts);
  const title = pick(module.title, locale);

  return (
    <Screen kicker={tx(locale, 'quiz.module_kicker')} title={title} subtitle={pick(module.subtitle, locale)}>
      <Stack.Screen options={{ title }} />

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
        {module.lecturer ? (
          <Text style={styles.moduleMeta}>
            {module.lecturer}
            {module.email ? ` · ${module.email}` : ''}
          </Text>
        ) : null}
      </Card>

      <Section title={tx(locale, 'quiz.module_topics')} />
      {module.topics.map((topic) => (
        <TopicCard
          key={topic.id}
          topic={topic}
          locale={locale}
          attempts={attempts}
          active={activeSessions[topic.id]}
        />
      ))}
    </Screen>
  );
}

function TopicCard({
  topic,
  locale,
  attempts,
  active,
}: {
  topic: QuizTopic;
  locale: Locale;
  attempts: ReturnType<typeof useQuizProgress>['attempts'];
  active: ReturnType<typeof useQuizProgress>['activeSessions'][string] | undefined;
}) {
  const stats = topicStats(topic, attempts);
  return (
    <Card>
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

      {active ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tx(locale, 'quiz.continue')}
          onPress={() =>
            router.push({
              pathname: '/quiz/[topic]/run',
              params: { topic: topic.id, mode: active.mode },
            })
          }
          style={({ pressed }) => [styles.activeRow, pressed && styles.pressed]}
        >
          <Pill label={tx(locale, 'quiz.active_title')} tone="blue" />
          <Text style={styles.activeHint}>{tx(locale, 'quiz.continue')}</Text>
          <MaterialIcons name="chevron-right" size={16} color={colors.blue} />
        </Pressable>
      ) : null}

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
    </Card>
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
  moduleMeta: { color: colors.blue, fontSize: 12, fontWeight: '600', lineHeight: 17 },
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
  activeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  activeHint: { color: colors.blue, fontSize: 12, fontWeight: '700' },
  topicFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  topicProgress: { color: colors.mute, fontSize: 11 },
  topicLinks: { flexDirection: 'row', gap: 12 },
  link: { color: colors.blue, fontSize: 12, fontWeight: '700' },
}));
