import { Stack, router } from 'expo-router';
import { useMemo, useRef, useState, useEffect } from 'react';
import { Platform, Pressable, Text, TextInput, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { campusDetail } from '@/src/auth/campus';
import { useActiveStudy } from '@/src/campus/use-active-study';
import { clearCachedCourses, getCoursesSyncInfo, loadCachedCourses, loadCoursesFetchedIds, saveCourses } from '@/src/campus/db';
import { useCampusSync } from '@/src/campus/use-campus-sync';
import { ResponsiveGrid , showToast } from '@ua/ui';
import { Button, Card, InfoRow, Muted, Pill, Screen, Section } from '@/src/components/ui';
import { showFetchAlert } from '@/src/components/fetch-alert';
import { StudySelector } from '@/src/components/study-selector';
import { keys } from '@ua/core/query/keys';
import { coursesFetchedIdsQuery, coursesSyncQuery, deviceCoursesQuery, deviceNodesQuery, serverCoursesQuery } from '@/src/query/queries';
import { useAppSelector, appActions } from '@/src/state/AppState';
import { colors, themedStyle } from '@ua/ui/theme';
import { formatDay, formatTime, tx } from '@ua/core/format';

type CourseSort = 'title' | 'type' | 'time';

/**
 * All courses of the selected study: bulk-loads `POST /v1/campus/courses`
 * across every cached structure element, then browses them by course type
 * (Seminar, Vorlesung, … — whatever the portal returns), search, and sort.
 */
export default function KurseScreen() {
  const locale = useAppSelector((state) => state.locale);
  const { setCurriculum } = appActions;
  const [failedIds, setFailedIds] = useState<number[]>([]);
  const [saveError, setSaveError] = useState('');
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sort, setSort] = useState<CourseSort>('title');
  // The device-store queries are keyed per study, so a late sync completion
  // can safely write another study's rows.
  const queryClient = useQueryClient();
  const { study, studyId } = useActiveStudy();

  // Device store first: instant list, Weiter loads only the rest.
  const nodesQ = useQuery(deviceNodesQuery(studyId));
  const coursesQ = useQuery(deviceCoursesQuery(studyId));
  const fetchedIdsQ = useQuery(coursesFetchedIdsQuery(studyId));
  const coursesSyncQ = useQuery(coursesSyncQuery(studyId));
  const elementCount = study ? (nodesQ.data?.length ?? 0) : 0;
  const courses = useMemo(() => coursesQ.data ?? [], [coursesQ.data]);
  const fetchedIds = useMemo(() => fetchedIdsQ.data ?? [], [fetchedIdsQ.data]);
  const coursesSync = coursesSyncQ.data ?? null;

  // Server snapshot second: cross-device catch-up merged into the local store.
  const snapshotQ = useQuery(serverCoursesQuery(studyId));
  const caughtUp = useRef<Set<number>>(new Set());
  useEffect(() => {
    const remote = snapshotQ.data;
    if (!remote || remote.courses.length === 0 || studyId === null) return;
    if (caughtUp.current.has(studyId)) return;
    caughtUp.current.add(studyId);
    (async () => {
      const stored = await loadCachedCourses(studyId).catch(() => []);
      const map = new Map(stored.map((course) => [course.id, course]));
      for (const course of remote.courses) {
        if (!map.has(course.id)) map.set(course.id, { ...course });
      }
      const all = [...map.values()];
      const storedFetched = await loadCoursesFetchedIds(studyId).catch(() => []);
      const allFetched = [...new Set([...storedFetched, ...remote.fetchedElementIds])];
      const prevComplete = (await getCoursesSyncInfo(studyId).catch(() => null))?.complete ?? false;
      if (all.length !== stored.length || allFetched.length !== storedFetched.length) {
        await saveCourses(studyId, all, allFetched, prevComplete).catch(() => undefined);
      }
      queryClient.invalidateQueries({ queryKey: keys.deviceCourses(studyId) });
      queryClient.invalidateQueries({ queryKey: keys.coursesSync(studyId) });
    })().catch(() => undefined);
  }, [snapshotQ.data, studyId, queryClient]);

  // UI filters reset when another study is selected (state adjusted during render — no effect cascade).
  const [lastStudyId, setLastStudyId] = useState<number | null>(studyId);
  if (lastStudyId !== studyId) {
    setLastStudyId(studyId);
    setQuery('');
    setTypeFilter('all');
    setSort('title');
    setFailedIds([]);
    setSaveError('');
  }

  // Course sync through the shared hook: job loop, hydration and cache writes
  // are shared with the structure screens; this screen adds the course copy,
  // the progress read-out and its own retry.
  const sync = useCampusSync({
    onTree: (treeStudyId, tree, { isLatest }) => {
      // Only the newest run may drive the curriculum, and only while that
      // study is still the selected one.
      if (isLatest && treeStudyId === studyId) setCurriculum(tree.nodes, { studyId: treeStudyId, replace: true });
    },
    onSuccess: ({ job, vars, isLatest, saveError: cacheError }) => {
      if (!isLatest) return;
      if (cacheError) {
        setSaveError(tx(locale, 'kurse.kurse_konnten', [cacheError]));
        showToast({ tone: 'error', title: tx(locale, 'kurse.cache_speichern'), message: cacheError });
      }
      setFailedIds(job.failedIds);
      if (job.state === 'cancelled') {
        setSaveError(tx(locale, 'kurse.abgebrochen'));
      } else if (job.failedIds.length > 0) {
        showFetchAlert(locale, {
          title: tx(locale, 'kurse.elemente_uebersprungen', [job.failedIds.length]),
          code: 'campus_failed',
          onRetry: () => sync.run({ studyId: vars.studyId, elementId: vars.elementId, includeCourses: true }),
        });
      }
    },
    onError: (caught, vars, { isLatest }) => {
      if (!isLatest) return;
      const code = caught instanceof Error ? caught.message : 'sync_failed';
      const detail = campusDetail(caught);
      setSaveError(
        tx(locale, 'kurse.kurs_sync', [code, detail ? `, ${detail}` : '']),
      );
      showFetchAlert(locale, {
        title: tx(locale, 'kurse.kurs_sync_fehlgeschlagen'),
        code,
        detail: detail || undefined,
        onRetry: () => sync.run({ studyId: vars.studyId, elementId: vars.elementId, includeCourses: true }),
      });
    },
  });
  const running = sync.running;
  const progress = studyId !== null ? sync.progressFor(studyId) : null;

  function loadAll(): void {
    if (!study || running) return;
    setFailedIds([]);
    setSaveError('');
    sync.run({ studyId: study.studyId, elementId: study.elementId, includeCourses: true });
  }

  async function clearCourseCache(): Promise<void> {
    if (studyId === null || running) return;
    await clearCachedCourses(studyId).catch(() => undefined);
    // The device store is empty now — drop the cached rows from the queries.
    queryClient.setQueryData(keys.deviceCourses(studyId), []);
    queryClient.setQueryData(keys.coursesFetchedIds(studyId), []);
    queryClient.setQueryData(keys.coursesSync(studyId), null);
  }

  const types = useMemo(() => [...new Set(courses.map((course) => course.courseType || tx(locale, 'common.ohne_typ')))].sort(), [courses, locale]);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = courses.filter((course) => {
      if (typeFilter !== 'all' && (course.courseType || tx(locale, 'common.ohne_typ')) !== typeFilter) return false;
      if (needle) {
        const haystack = `${course.title} ${course.courseNumber} ${course.lecturers.join(' ')} ${course.roomName}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
    const sorted = [...filtered];
    if (sort === 'title') sorted.sort((a, b) => a.title.localeCompare(b.title));
    if (sort === 'type') sorted.sort((a, b) => (a.courseType || '').localeCompare(b.courseType || '') || a.title.localeCompare(b.title));
    if (sort === 'time') sorted.sort((a, b) => (a.startTime || '~').localeCompare(b.startTime || '~'));
    return sorted;
  }, [courses, query, typeFilter, sort, locale]);

  return (
    <Screen
      kicker="C@MPUS"
      subtitle={
        study
          ? `${study.name} · ${courses.length} ${tx(locale, 'kurse.kurse')} · ${fetchedIds.length}/${elementCount} ${tx(locale, 'kurse.elemente')}`
          : tx(locale, 'kurse.alle_lehrveranstaltungen')
      }>
      <Stack.Screen options={{ title: tx(locale, 'common.kurse') }} />
      <StudySelector />
      {study === null ? (
        <Card>
          <Muted>
            {tx(locale, 'kurse.melden')}
          </Muted>
        </Card>
      ) : (
        <>
          <Card>
            <Text style={{ color: colors.anthracite, fontWeight: '700' }}>
              {tx(locale, 'kurse.liest')}
            </Text>
            <Text style={{ color: colors.inkSoft, fontSize: 13 }}>
              {tx(locale, 'kurse.struktur_cache', [elementCount])}
            </Text>
            {elementCount === 0 && !running ? (
              <>
                <Muted>
                  {tx(locale, 'kurse.struktur')}
                </Muted>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <Button secondary label="C@MPUS" onPress={() => router.push('/campus-info')} />
                  {Platform.OS === 'web' ? (
                    <Button
                      secondary
                      label={tx(locale, 'kurse.struktur_browser')}
                      onPress={() => router.push('/strukturen')}
                    />
                  ) : null}
                </View>
              </>
            ) : null}
            {running && progress ? (
              <Text style={{ color: colors.blue, fontWeight: '700' }}>
                {tx(locale, 'kurse.abfragen', [progress.fetched, progress.courseCount])}
              </Text>
            ) : null}
            {failedIds.length > 0 ? (
              <Text style={{ color: colors.warning, fontSize: 14, lineHeight: 20 }}>
                {tx(locale, 'kurse.elemente_uebersprungen_weiter', [failedIds.length])}
              </Text>
            ) : null}
            {saveError ? (
              <Text style={{ color: colors.danger, fontSize: 14, lineHeight: 20 }}>{saveError}</Text>
            ) : null}
            {coursesSync ? (
              <Text style={{ color: colors.inkSoft, fontSize: 13 }}>
                {tx(locale, 'kurse.cache', [coursesSync.courseCount])}
                {coursesSync.finishedAt ? ` · ${formatDay(coursesSync.finishedAt, locale)}, ${formatTime(coursesSync.finishedAt)} ${tx(locale, 'common.uhr')}` : ''}
                {coursesSync.complete ? '' : ` · ${tx(locale, 'common.unvollstaendig')}`}
              </Text>
            ) : fetchedIds.length === 0 && !running ? (
              <Text style={{ color: colors.inkSoft, fontSize: 13 }}>
                {tx(locale, 'kurse.diesen')}
              </Text>
            ) : null}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {running ? (
                <Button secondary label={tx(locale, 'common.abbrechen')} onPress={() => sync.cancel(study.studyId)} />
              ) : study.elementId != null ? (
                <Button
                  label={fetchedIds.length > 0 ? tx(locale, 'common.weiter') : tx(locale, 'kurse.alle')}
                  onPress={loadAll}
                />
              ) : null}
              {!running && courses.length > 0 ? (
                <Button secondary label={tx(locale, 'kurse.kurs')} onPress={clearCourseCache} />
              ) : null}
            </View>
          </Card>
          {courses.length > 0 ? (
            <>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={tx(locale, 'kurse.titel')}
                placeholderTextColor={colors.mute}
                style={{ ...inputStyle }}
              />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <Pressable onPress={() => setTypeFilter('all')}>
                  <Pill label={tx(locale, 'kurse.alle_typen')} active={typeFilter === 'all'} />
                </Pressable>
                {types.map((type) => (
                  <Pressable key={type} onPress={() => setTypeFilter(typeFilter === type ? 'all' : type)}>
                    <Pill label={type} active={typeFilter === type} />
                  </Pressable>
                ))}
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {(['title', 'type', 'time'] as CourseSort[]).map((item) => (
                  <Pressable key={item} onPress={() => setSort(item)}>
                    <Pill
                      label={item === 'title' ? tx(locale, 'common.titel') : item === 'type' ? tx(locale, 'common.typ') : tx(locale, 'common.termin')}
                      active={sort === item}
                    />
                  </Pressable>
                ))}
              </View>
              <Section title={tx(locale, 'kurse.kurse_2', [visible.length])} />
              <ResponsiveGrid minColumnWidth={340}>
                {visible.map((course) => (
                  <InfoRow
                    key={course.id}
                    title={course.title}
                    meta={[course.courseTypeShort || course.courseType, course.semester].filter(Boolean).join(' · ') || String(course.id)}
                    detail={[
                      course.lecturers.join(', '),
                      course.startTime ? `${formatDay(course.startTime, locale)}, ${formatTime(course.startTime)}${course.endTime ? `–${formatTime(course.endTime)}` : ''}` : '',
                      course.roomName,
                      course.registrationStatus,
                      course.elementNames.length > 1 ? `${course.elementNames.length} ${tx(locale, 'common.bereiche')}` : '',
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                    onPress={() => router.push({ pathname: '/kurs/[id]', params: { id: String(course.id) } })}
                  />
                ))}
              </ResponsiveGrid>
            </>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const inputStyle = themedStyle((colors) => ({
  backgroundColor: colors.paper,
  borderWidth: 1,
  borderColor: colors.line,
  borderRadius: 14,
  paddingHorizontal: 14,
  paddingVertical: 12,
  fontSize: 16,
  color: colors.anthracite,
}));
