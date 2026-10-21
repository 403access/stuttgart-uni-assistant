import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { Card, Meter, Pill, Screen, Section } from '@/src/components/ui';
import { confirmQuizAction } from '@/src/quiz/confirm';
import {
  findQuizStudy,
  findQuizTopic,
  mixedTopic,
  mixedTopicForStudy,
  quizModules,
  quizModulesForStudy,
  quizStudies,
} from '@/src/quiz/content';
import { useQuizProgress } from '@/src/quiz/progress';
import { moduleStats, statsForQuestions, topicStats } from '@/src/quiz/session';
import type { QuestionProgress, QuizMode, QuizModule, QuizStudy, QuizTopic } from '@/src/quiz/types';
import { useAppSelector } from '@/src/state/AppState';
import { colors, themedStyles } from '@/src/theme';
import { hay, pick, tx } from '@/src/text';
import type { Locale } from '@/src/types';

const ALL_STUDIES = 'all';

type StatusFilter = 'all' | 'done' | 'review' | 'progress' | 'new';
type SemesterFilter = 'all' | number;
type SortKey = 'progress' | 'title' | 'semester' | 'questions';
type FilterPanel = 'status' | 'semester' | 'sort' | null;

const STATUS_FILTERS: StatusFilter[] = ['all', 'done', 'review', 'progress', 'new'];
const SORT_KEYS: SortKey[] = ['progress', 'title', 'semester', 'questions'];

function startTopic(topic: QuizTopic, mode: QuizMode) {
  router.push({ pathname: '/quiz/[topic]', params: { topic: topic.id, mode } });
}

function openModule(moduleId: string) {
  router.push({ pathname: '/quiz/modul/[id]', params: { id: moduleId } });
}

function moduleCountLabel(count: number, locale: Locale): string {
  return count === 1
    ? tx(locale, 'quiz.study_module_count_one')
    : tx(locale, 'quiz.study_module_count', [count]);
}

function statusLabel(status: StatusFilter, locale: Locale): string {
  switch (status) {
    case 'done':
      return tx(locale, 'quiz.status_done');
    case 'review':
      return tx(locale, 'quiz.status_review');
    case 'progress':
      return tx(locale, 'quiz.status_progress');
    case 'new':
      return tx(locale, 'quiz.status_new');
    default:
      return tx(locale, 'common.alle');
  }
}

function sortLabel(sort: SortKey, locale: Locale): string {
  switch (sort) {
    case 'title':
      return tx(locale, 'quiz.sort_title');
    case 'semester':
      return tx(locale, 'quiz.sort_semester');
    case 'questions':
      return tx(locale, 'quiz.sort_questions');
    default:
      return tx(locale, 'quiz.sort_progress');
  }
}

function questionCount(module: QuizModule): number {
  return module.topics.reduce((sum, topic) => sum + topic.questions.length, 0);
}

function matchesStatus(
  module: QuizModule,
  status: StatusFilter,
  attempts: Record<string, QuestionProgress>,
): boolean {
  const stats = moduleStats(module, attempts);
  switch (status) {
    case 'done':
      return stats.total > 0 && stats.mastered === stats.total;
    case 'review':
      return stats.wrong > 0;
    case 'progress':
      return stats.seen > 0 && stats.mastered < stats.total && stats.wrong === 0;
    case 'new':
      return stats.seen === 0;
    default:
      return true;
  }
}

function matchesSearch(module: QuizModule, study: QuizStudy, needle: string): boolean {
  if (!needle) return true;
  const fields = [
    module.code ?? '',
    module.title.de,
    module.title.en,
    module.subtitle.de,
    module.subtitle.en,
    module.lecturer ?? '',
    module.email ?? '',
    String(module.semester),
    study.title.de,
    study.title.en,
    ...module.topics.flatMap((topic) => [topic.title.de, topic.title.en]),
  ];
  return fields.some((value) => hay(value).includes(needle));
}

function sortModules(
  modules: QuizModule[],
  sort: SortKey,
  locale: Locale,
  attempts: Record<string, QuestionProgress>,
): QuizModule[] {
  const order = new Map(modules.map((module, index) => [module.id, index]));
  const ratios = new Map<string, number>();
  for (const module of modules) {
    const stats = moduleStats(module, attempts);
    ratios.set(module.id, stats.total ? stats.mastered / stats.total : 0);
  }
  const byOrder = (a: QuizModule, b: QuizModule) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0);
  const byTitle = (a: QuizModule, b: QuizModule) =>
    pick(a.title, locale).localeCompare(pick(b.title, locale), locale);
  return [...modules].sort((a, b) => {
    switch (sort) {
      case 'title':
        return byTitle(a, b) || byOrder(a, b);
      case 'semester':
        return a.semester - b.semester || byTitle(a, b) || byOrder(a, b);
      case 'questions':
        return questionCount(b) - questionCount(a) || byTitle(a, b);
      default: {
        const ratioA = ratios.get(a.id) ?? 0;
        const ratioB = ratios.get(b.id) ?? 0;
        return ratioB - ratioA || byOrder(a, b);
      }
    }
  });
}

export default function QuizScreen() {
  const locale = useAppSelector((state) => state.locale);
  const { ready, attempts, sessions, resetProgress } = useQuizProgress();
  const [studyFilter, setStudyFilter] = useState<string>(ALL_STUDIES);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [semesterFilter, setSemesterFilter] = useState<SemesterFilter>('all');
  const [sort, setSort] = useState<SortKey>('progress');
  const [query, setQuery] = useState('');
  const [panel, setPanel] = useState<FilterPanel>(null);

  if (!ready) {
    return (
      <Screen topInset>
        <Card>
          <Text style={styles.muted}>{tx(locale, 'quiz.loading')}</Text>
        </Card>
      </Screen>
    );
  }

  const allQuestions = quizModules.flatMap((module) => module.topics.flatMap((topic) => topic.questions));
  const overall = statsForQuestions(allQuestions, attempts);
  const lastSession = sessions[0];
  const lastTopic = lastSession ? findQuizTopic(lastSession.topicId) : undefined;
  const needle = hay(query.trim());
  const semesters = [...new Set(quizModules.map((module) => module.semester))].sort((a, b) => a - b);
  const studiesWithModules = quizStudies.filter((study) => quizModulesForStudy(study.id).length > 0);
  const groups = quizStudies
    .flatMap((study) => {
      const modules = quizModulesForStudy(study.id).filter(
        (module) =>
          (semesterFilter === 'all' || module.semester === semesterFilter) &&
          matchesStatus(module, statusFilter, attempts) &&
          matchesSearch(module, study, needle),
      );
      return modules.length ? [{ study, modules: sortModules(modules, sort, locale, attempts) }] : [];
    })
    .filter((group) => studyFilter === ALL_STUDIES || group.study.id === studyFilter);
  const resultCount = groups.reduce((sum, group) => sum + group.modules.length, 0);
  const filtersActive =
    query.trim() !== '' || statusFilter !== 'all' || semesterFilter !== 'all' || studyFilter !== ALL_STUDIES;
  const selectedStudy = studyFilter === ALL_STUDIES ? undefined : findQuizStudy(studyFilter);
  const practiceTopic = selectedStudy ? mixedTopicForStudy(selectedStudy.id) : mixedTopic;

  function resetFilters(): void {
    setQuery('');
    setStatusFilter('all');
    setSemesterFilter('all');
    setStudyFilter(ALL_STUDIES);
    setPanel(null);
  }

  return (
    <Screen topInset>
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
      <View style={styles.controls}>
        <View style={styles.searchRow}>
          <MaterialIcons name="search" size={20} color={colors.mute} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={tx(locale, 'quiz.search_placeholder')}
            placeholderTextColor={colors.mute}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            style={styles.searchInput}
          />
          {query ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={tx(locale, 'common.zuruecksetzen')}
              hitSlop={8}
              onPress={() => setQuery('')}
            >
              <MaterialIcons name="close" size={18} color={colors.mute} />
            </Pressable>
          ) : null}
        </View>

        {studiesWithModules.length > 1 ? (
          <View style={styles.filters}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: studyFilter === ALL_STUDIES }}
              onPress={() => {
                setStudyFilter(ALL_STUDIES);
                setPanel(null);
              }}
            >
              <Pill label={tx(locale, 'quiz.study_all')} active={studyFilter === ALL_STUDIES} />
            </Pressable>
            {studiesWithModules.map((study) => (
              <Pressable
                key={study.id}
                accessibilityRole="button"
                accessibilityState={{ selected: studyFilter === study.id }}
                onPress={() => {
                  setStudyFilter(study.id);
                  setPanel(null);
                }}
              >
                <Pill label={pick(study.title, locale)} active={studyFilter === study.id} />
              </Pressable>
            ))}
          </View>
        ) : null}

        <View style={styles.toolbar}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: panel === 'status', selected: statusFilter !== 'all' }}
            onPress={() => setPanel(panel === 'status' ? null : 'status')}
          >
            <Pill
              label={`${statusFilter === 'all' ? tx(locale, 'quiz.filter_status') : statusLabel(statusFilter, locale)} ▾`}
              active={panel === 'status' || statusFilter !== 'all'}
            />
          </Pressable>
          {semesters.length > 1 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: panel === 'semester', selected: semesterFilter !== 'all' }}
              onPress={() => setPanel(panel === 'semester' ? null : 'semester')}
            >
              <Pill
                label={`${semesterFilter === 'all' ? tx(locale, 'quiz.semester') : tx(locale, 'quiz.semester_value', [semesterFilter])} ▾`}
                active={panel === 'semester' || semesterFilter !== 'all'}
              />
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: panel === 'sort' }}
            onPress={() => setPanel(panel === 'sort' ? null : 'sort')}
          >
            <Pill label={`${sortLabel(sort, locale)} ▾`} active={panel === 'sort'} />
          </Pressable>
        </View>

        {panel === 'status' ? (
          <View style={styles.panel}>
            <View style={styles.panelRow}>
              {STATUS_FILTERS.map((status) => (
                <Pressable key={status} onPress={() => setStatusFilter(status)}>
                  <Pill label={statusLabel(status, locale)} active={statusFilter === status} />
                </Pressable>
              ))}
            </View>
            {statusFilter !== 'all' ? (
              <Pressable onPress={() => setStatusFilter('all')}>
                <Text style={styles.panelReset}>{tx(locale, 'common.zuruecksetzen')}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {panel === 'semester' ? (
          <View style={styles.panel}>
            <View style={styles.panelRow}>
              <Pressable onPress={() => setSemesterFilter('all')}>
                <Pill label={tx(locale, 'common.alle')} active={semesterFilter === 'all'} />
              </Pressable>
              {semesters.map((semester) => (
                <Pressable key={semester} onPress={() => setSemesterFilter(semester)}>
                  <Pill
                    label={tx(locale, 'quiz.semester_value', [semester])}
                    active={semesterFilter === semester}
                  />
                </Pressable>
              ))}
            </View>
            {semesterFilter !== 'all' ? (
              <Pressable onPress={() => setSemesterFilter('all')}>
                <Text style={styles.panelReset}>{tx(locale, 'common.zuruecksetzen')}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {panel === 'sort' ? (
          <View style={styles.panel}>
            <View style={styles.panelRow}>
              {SORT_KEYS.map((key) => (
                <Pressable key={key} onPress={() => setSort(key)}>
                  <Pill label={sortLabel(key, locale)} active={sort === key} />
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {filtersActive ? (
          <Text style={styles.resultCount}>
            {tx(locale, 'quiz.result_count', [resultCount, quizModules.length])}
          </Text>
        ) : null}
      </View>

      {groups.length ? (
        groups.map(({ study, modules }) => (
          <StudyGroup
            key={study.id}
            study={study}
            modules={modules}
            locale={locale}
            attempts={attempts}
          />
        ))
      ) : (
        <Card>
          <Text style={styles.muted}>{tx(locale, 'quiz.no_matches')}</Text>
          <Pressable accessibilityRole="button" onPress={resetFilters}>
            <Text style={styles.link}>{tx(locale, 'quiz.reset_filters')}</Text>
          </Pressable>
        </Card>
      )}

      {practiceTopic ? (
        <>
          <Section title={tx(locale, 'quiz.practice')} />
          <Card>
            <View style={styles.mixedHeader}>
              <View style={styles.mixedIcon}>
                <MaterialIcons name="shuffle" size={22} color={colors.blue} />
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={styles.topicTitle}>{pick(practiceTopic.title, locale)}</Text>
                <Text style={styles.muted}>{pick(practiceTopic.summary, locale)}</Text>
              </View>
            </View>
            <View style={styles.actions}>
              <Pressable onPress={() => startTopic(practiceTopic, 'mixed')} style={styles.primaryAction}>
                <MaterialIcons name="play-arrow" size={18} color="#FFFFFF" />
                <Text style={styles.primaryActionText}>{tx(locale, 'quiz.start_mixed')}</Text>
              </Pressable>
            </View>
          </Card>
        </>
      ) : null}

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

function StudyGroup({
  study,
  modules,
  locale,
  attempts,
}: {
  study: QuizStudy;
  modules: QuizModule[];
  locale: Locale;
  attempts: Record<string, QuestionProgress>;
}) {
  const questions = modules.flatMap((module) => module.topics.flatMap((topic) => topic.questions));
  const stats = statsForQuestions(questions, attempts);
  return (
    <View style={styles.studyGroup}>
      <View style={styles.studyHeader}>
        <View style={styles.studyTitleRow}>
          <View style={[styles.studyDot, { backgroundColor: study.color }]} />
          <Text style={styles.studyName}>{pick(study.title, locale)}</Text>
        </View>
        <Text style={styles.studyProgress}>
          {tx(locale, 'quiz.topic_progress', [stats.mastered, stats.total])}
        </Text>
      </View>
      <Text style={styles.studyMeta}>
        {pick(study.degree, locale)} · {moduleCountLabel(modules.length, locale)}
      </Text>
      <View style={styles.grid}>
        {modules.map((module) => (
          <ModuleTile
            key={module.id}
            module={module}
            studyColor={study.color}
            locale={locale}
            attempts={attempts}
          />
        ))}
      </View>
    </View>
  );
}

function ModuleTile({
  module,
  studyColor,
  locale,
  attempts,
}: {
  module: QuizModule;
  studyColor: string;
  locale: Locale;
  attempts: Record<string, QuestionProgress>;
}) {
  const stats = moduleStats(module, attempts);
  const percent = stats.total > 0 ? Math.round((stats.mastered / stats.total) * 100) : 0;
  const complete = stats.total > 0 && stats.mastered === stats.total;
  const started = stats.seen > 0;
  const title = pick(module.title, locale);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={tx(locale, 'quiz.open_module', [title])}
      onPress={() => openModule(module.id)}
      style={({ pressed }) => [
        styles.tile,
        { borderTopColor: studyColor, borderTopWidth: 3 },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.badge, started && styles.badgeStarted, complete && styles.badgeComplete]}>
        {complete ? (
          <MaterialIcons name="check" size={20} color={colors.success} />
        ) : (
          <Text style={[styles.badgeText, started && styles.badgeTextStarted]}>{percent}%</Text>
        )}
      </View>

      <View style={[styles.tileIcon, complete && styles.tileIconComplete]}>
        <MaterialIcons
          name={complete ? 'verified' : 'menu-book'}
          size={20}
          color={complete ? colors.success : colors.blue}
        />
      </View>

      <Text style={styles.tileTitle} numberOfLines={4}>
        {title}
      </Text>
      <Text style={styles.tileMeta}>
        {tx(locale, 'quiz.semester_value', [module.semester])} ·{' '}
        {tx(locale, 'quiz.module_meta', [module.topics.length, stats.total])}
      </Text>

      <View style={styles.tileProgress}>
        <Meter value={stats.mastered} max={stats.total} />
        <View style={styles.tileFooter}>
          <Text style={styles.tileProgressText}>
            {tx(locale, 'quiz.topic_progress', [stats.mastered, stats.total])}
          </Text>
          <MaterialIcons name="chevron-right" size={18} color={colors.blue} />
        </View>
      </View>
    </Pressable>
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
  controls: { gap: 8 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, paddingVertical: 11, fontSize: 15, color: colors.anthracite },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  panel: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 10,
    gap: 8,
  },
  panelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  panelReset: { color: colors.blue, fontSize: 13, fontWeight: '700' },
  resultCount: { color: colors.mute, fontSize: 12, fontWeight: '600', marginTop: -2 },
  link: { color: colors.blue, fontSize: 13, fontWeight: '700' },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: -6 },
  studyGroup: { gap: 8 },
  studyHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  studyTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  studyDot: { width: 10, height: 10, borderRadius: 5 },
  studyName: { color: colors.anthracite, fontSize: 17, fontWeight: '800', flexShrink: 1 },
  studyProgress: { color: colors.inkSoft, fontSize: 12, fontWeight: '700' },
  studyMeta: { color: colors.mute, fontSize: 12, marginTop: -4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  tile: {
    width: '48%',
    backgroundColor: colors.paper,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    gap: 6,
  },
  pressed: { opacity: 0.7 },
  badge: {
    position: 'absolute',
    top: 10,
    right: 10,
    minWidth: 40,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.mist,
    borderWidth: 1,
    borderColor: colors.line,
  },
  badgeStarted: { backgroundColor: colors.blueSoft, borderColor: colors.blueSoft },
  badgeComplete: { backgroundColor: colors.successSoft, borderColor: colors.successSoft },
  badgeText: { color: colors.mute, fontSize: 12, fontWeight: '800' },
  badgeTextStarted: { color: colors.blue },
  tileIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileIconComplete: { backgroundColor: colors.successSoft },
  tileTitle: { color: colors.anthracite, fontSize: 15, fontWeight: '800', lineHeight: 20, paddingRight: 2 },
  tileMeta: { color: colors.mute, fontSize: 11, fontWeight: '600', lineHeight: 15 },
  tileProgress: { marginTop: 'auto', gap: 6 },
  tileFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
  tileProgressText: { color: colors.inkSoft, fontSize: 11, fontWeight: '600' },
  topicTitle: { color: colors.anthracite, fontSize: 15, fontWeight: '700', lineHeight: 20 },
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
