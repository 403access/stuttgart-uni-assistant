import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { Drawer } from 'react-native-drawer-layout';

import { DrawerPanel , useResponsive } from '@ua/ui';
import { OptionRows, type DropdownOption } from '@ua/ui';
import { Card, Meter, Screen, Section } from '@/src/components/ui';
import { confirmQuizAction } from '@/src/quiz/confirm';
import {
  findQuizStudy,
  findQuizTopic,
  mixedTopic,
  mixedTopicForStudy,
  quizModules,
  quizModulesForStudy,
  quizStudies,
} from '@ua/quiz-content';
import { QuizToolbar } from '@/src/quiz/components/quiz-toolbar';
import { useQuizCatalogVersion } from '@/src/quiz/catalog-state';
import { useQuizProgress } from '@/src/quiz/progress';
import { moduleStats, statsForQuestions, topicStats } from '@ua/feature-quiz';
import type { QuestionProgress, QuizMode, QuizModule, QuizStudy, QuizTopic } from '@ua/quiz-content/types';
import { useAppSelector } from '@/src/state/AppState';
import { colors, themedStyles } from '@ua/ui/theme';
import { hay, pick, tx } from '@ua/core/format';
import type { Locale } from '@ua/core/domain/types';

const ALL_STUDIES = 'all';

type StatusFilter = 'all' | 'done' | 'review' | 'progress' | 'new';
type SemesterFilter = 'all' | number;

const STATUS_FILTERS: StatusFilter[] = ['all', 'done', 'review', 'progress', 'new'];

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

export default function QuizScreen() {
  const locale = useAppSelector((state) => state.locale);
  useQuizCatalogVersion();
  const { ready, attempts, sessions, resetProgress } = useQuizProgress();
  const [studyFilter, setStudyFilter] = useState<string>(ALL_STUDIES);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [semesterFilter, setSemesterFilter] = useState<SemesterFilter>('all');
  const [query, setQuery] = useState('');
  const [studiesOpen, setStudiesOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const { width } = useWindowDimensions();
  const { isDesktop } = useResponsive();
  const drawerWidth = Math.min(340, Math.round(width * 0.86));
  // Two tiles per row on the phone; the desktop grid grows with the room left
  // next to the sidebar (3 at 1200, 4 at 1440, up to 6 on very wide displays).
  const tileColumns = isDesktop ? Math.max(3, Math.min(6, Math.floor((width - 252 - 64) / 300))) : 2;

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
      return modules.length ? [{ study, modules }] : [];
    })
    .filter((group) => studyFilter === ALL_STUDIES || group.study.id === studyFilter);
  const resultCount = groups.reduce((sum, group) => sum + group.modules.length, 0);
  const filtersActive =
    query.trim() !== '' || statusFilter !== 'all' || semesterFilter !== 'all' || studyFilter !== ALL_STUDIES;
  const filterActive = statusFilter !== 'all' || semesterFilter !== 'all';
  const selectedStudy = studyFilter === ALL_STUDIES ? undefined : findQuizStudy(studyFilter);
  const practiceTopic = selectedStudy ? mixedTopicForStudy(selectedStudy.id) : mixedTopic;

  const studyOptions: DropdownOption[] = [
    {
      key: ALL_STUDIES,
      label: tx(locale, 'quiz.study_all'),
      meta: moduleCountLabel(quizModules.length, locale),
      selected: studyFilter === ALL_STUDIES,
      group: tx(locale, 'quiz.drawer_studies'),
    },
    ...studiesWithModules.map((study) => ({
      key: study.id,
      label: pick(study.title, locale),
      meta: moduleCountLabel(quizModulesForStudy(study.id).length, locale),
      selected: studyFilter === study.id,
      group: tx(locale, 'quiz.drawer_studies'),
    })),
  ];

  const filterOptions: DropdownOption[] = [
    ...STATUS_FILTERS.map((status) => ({
      key: `status:${status}`,
      label: statusLabel(status, locale),
      selected: statusFilter === status,
      group: tx(locale, 'quiz.filter_status'),
    })),
    ...(semesters.length > 1
      ? [
          {
            key: 'semester:all',
            label: tx(locale, 'common.alle'),
            selected: semesterFilter === 'all',
            group: tx(locale, 'quiz.semester'),
          },
          ...semesters.map((semester) => ({
            key: `semester:${semester}`,
            label: tx(locale, 'quiz.semester_value', [semester]),
            selected: semesterFilter === semester,
            group: tx(locale, 'quiz.semester'),
          })),
        ]
      : []),
  ];

  function resetFilters(): void {
    setQuery('');
    setStatusFilter('all');
    setSemesterFilter('all');
    setStudyFilter(ALL_STUDIES);
  }

  function applyStudyKey(key: string): void {
    setStudiesOpen(false);
    setStudyFilter(key);
  }

  function applyFilterKey(key: string): void {
    setFilterOpen(false);
    if (key.startsWith('status:')) setStatusFilter(key.slice(7) as StatusFilter);
    else if (key === 'semester:all') setSemesterFilter('all');
    else if (key.startsWith('semester:')) setSemesterFilter(Number(key.slice(9)));
  }

  function clearStatusAndSemester(): void {
    setFilterOpen(false);
    setStatusFilter('all');
    setSemesterFilter('all');
  }

  function confirmResetProgress(): void {
    setStudiesOpen(false);
    confirmQuizAction({
      title: tx(locale, 'quiz.reset_title'),
      message: tx(locale, 'quiz.reset_text'),
      cancelLabel: tx(locale, 'common.abbrechen'),
      confirmLabel: tx(locale, 'common.zuruecksetzen'),
      onConfirm: resetProgress,
    });
  }

  const toolbar = (
    <QuizToolbar
      locale={locale}
      query={query}
      onQueryChange={setQuery}
      onOpenStudies={() => setStudiesOpen(true)}
      onOpenFilter={() => setFilterOpen(true)}
      studyActive={studyFilter !== ALL_STUDIES}
      filterActive={filterActive}
      showMenus={!isDesktop}
    />
  );

  const studiesPanel = (
    <>
      <OptionRows options={studyOptions} onSelect={applyStudyKey} />
      {overall.seen > 0 ? (
        <>
          <Text style={styles.drawerGroup}>{tx(locale, 'quiz.actions')}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={confirmResetProgress}
            style={({ pressed }) => [styles.drawerAction, pressed && styles.pressed]}
          >
            <MaterialIcons name="delete-outline" size={18} color={colors.danger} />
            <Text style={styles.drawerActionText}>{tx(locale, 'quiz.reset')}</Text>
          </Pressable>
        </>
      ) : null}
    </>
  );

  const filtersPanel = (
    <>
      <OptionRows options={filterOptions} onSelect={applyFilterKey} />
      {filterActive ? (
        <Pressable
          accessibilityRole="button"
          onPress={clearStatusAndSemester}
          style={({ pressed }) => [styles.drawerAction, pressed && styles.pressed]}
        >
          <MaterialIcons name="filter-alt-off" size={18} color={colors.blue} />
          <Text style={[styles.drawerActionText, styles.drawerActionBlue]}>
            {tx(locale, 'quiz.reset_filters')}
          </Text>
        </Pressable>
      ) : null}
    </>
  );

  const mainContent = (
    <>
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

      <Section
        title={tx(locale, 'quiz.modules')}
        action={filtersActive ? tx(locale, 'quiz.reset_filters') : undefined}
        onAction={resetFilters}
      />
      {filtersActive ? (
        <Text style={styles.resultCount}>
          {tx(locale, 'quiz.result_count', [resultCount, quizModules.length])}
        </Text>
      ) : null}

      {groups.length ? (
        groups.map(({ study, modules }) => (
          <StudyGroup
            key={study.id}
            study={study}
            modules={modules}
            locale={locale}
            attempts={attempts}
            columns={tileColumns}
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
    </>
  );

  if (isDesktop) {
    return (
      <Screen wide stickyHeader={toolbar} topInset>
        <View style={styles.desktopColumns}>
          <View style={styles.desktopRail}>
            <Text style={styles.railTitle}>{tx(locale, 'quiz.drawer_studies')}</Text>
            <OptionRows options={studyOptions.map((option) => ({ ...option, group: undefined }))} onSelect={applyStudyKey} />
            {overall.seen > 0 ? (
              <Pressable
                accessibilityRole="button"
                onPress={confirmResetProgress}
                style={({ pressed }) => [styles.drawerAction, pressed && styles.pressed]}
              >
                <MaterialIcons name="delete-outline" size={18} color={colors.danger} />
                <Text style={styles.drawerActionText}>{tx(locale, 'quiz.reset')}</Text>
              </Pressable>
            ) : null}
            <Text style={[styles.railTitle, styles.railTitleSpaced]}>{tx(locale, 'quiz.drawer_filter')}</Text>
            {filtersPanel}
          </View>
          <View style={styles.desktopMain}>{mainContent}</View>
        </View>
      </Screen>
    );
  }

  return (
    <Drawer
      open={studiesOpen}
      onOpen={() => setStudiesOpen(true)}
      onClose={() => setStudiesOpen(false)}
      drawerPosition="left"
      drawerType="front"
      drawerStyle={{ width: drawerWidth }}
      overlayAccessibilityLabel={tx(locale, 'common.schliessen')}
      renderDrawerContent={() => (
        <DrawerPanel
          title={tx(locale, 'quiz.drawer_menu')}
          closeLabel={tx(locale, 'common.schliessen')}
          onClose={() => setStudiesOpen(false)}
        >
          {studiesPanel}
        </DrawerPanel>
      )}
    >
      <Drawer
        open={filterOpen}
        onOpen={() => setFilterOpen(true)}
        onClose={() => setFilterOpen(false)}
        drawerPosition="right"
        drawerType="front"
        drawerStyle={{ width: drawerWidth }}
        overlayAccessibilityLabel={tx(locale, 'common.schliessen')}
        renderDrawerContent={() => (
          <DrawerPanel
            title={tx(locale, 'quiz.drawer_filter')}
            closeLabel={tx(locale, 'common.schliessen')}
            onClose={() => setFilterOpen(false)}
          >
            {filtersPanel}
          </DrawerPanel>
        )}
      >
        <Screen stickyHeader={toolbar} topInset>
          {mainContent}
        </Screen>
      </Drawer>
    </Drawer>
  );
}

function StudyGroup({
  study,
  modules,
  locale,
  attempts,
  columns,
}: {
  study: QuizStudy;
  modules: QuizModule[];
  locale: Locale;
  attempts: Record<string, QuestionProgress>;
  columns: number;
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
            columns={columns}
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
  columns,
}: {
  module: QuizModule;
  studyColor: string;
  locale: Locale;
  attempts: Record<string, QuestionProgress>;
  columns: number;
}) {
  const stats = moduleStats(module, attempts);
  const percent = stats.total > 0 ? Math.round((stats.mastered / stats.total) * 100) : 0;
  const complete = stats.total > 0 && stats.mastered === stats.total;
  const started = stats.seen > 0;
  const title = pick(module.title, locale);
  const width = columns <= 2 ? '48%' : `${(100 / columns - 1.4).toFixed(2)}%`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={tx(locale, 'quiz.open_module', [title])}
      onPress={() => openModule(module.id)}
      style={(state: { pressed: boolean; hovered?: boolean }) => [
        styles.tile,
        { width, borderTopColor: studyColor, borderTopWidth: 3 },
        state.hovered && styles.tileHover,
        state.pressed && styles.pressed,
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
  desktopColumns: { flexDirection: 'row', alignItems: 'flex-start', gap: 24 },
  desktopRail: {
    width: 300,
    flexShrink: 0,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  desktopMain: { flex: 1, minWidth: 0, gap: 14 },
  railTitle: {
    color: colors.blue,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    paddingBottom: 4,
  },
  railTitleSpaced: { paddingTop: 18 },
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
  resultCount: { color: colors.mute, fontSize: 12, fontWeight: '600', marginTop: -2 },
  link: { color: colors.blue, fontSize: 13, fontWeight: '700' },
  drawerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  drawerActionText: { flex: 1, color: colors.danger, fontSize: 15, fontWeight: '600' },
  drawerActionBlue: { color: colors.blue },
  drawerGroup: {
    alignSelf: 'flex-start',
    color: colors.inkSoft,
    backgroundColor: colors.mist,
    borderRadius: 8,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 16,
    marginBottom: 2,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  studyGroup: { gap: 8 },
  studyHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  studyTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  studyDot: { width: 10, height: 10, borderRadius: 5 },
  studyName: { color: colors.anthracite, fontSize: 17, fontWeight: '800', flexShrink: 1 },
  studyProgress: { color: colors.inkSoft, fontSize: 12, fontWeight: '700' },
  studyMeta: { color: colors.mute, fontSize: 12, marginTop: -4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  tile: {
    backgroundColor: colors.paper,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    gap: 6,
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
  },
  tileHover: { borderColor: colors.light },
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
}));
