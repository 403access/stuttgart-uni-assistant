import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { activeStudy } from '@/src/auth/campus';
import { fetchAllCourses, type BulkCourse } from '@/src/campus/courses-bulk';
import { clearCachedCourses, getCoursesSyncInfo, loadCachedCourses, loadCachedNodes, loadCoursesFetchedIds, loadExpandedIds, saveCourses, saveFullStructure, type CoursesSyncInfo } from '@/src/campus/db';
import { syncFullStructure } from '@/src/campus/full-sync';
import { Button, Card, InfoRow, Muted, Pill, Screen, Section } from '@/src/components/ui';
import { showFetchAlert } from '@/src/components/fetch-alert';
import { showToast } from '@/src/components/toast';
import { StudySelector } from '@/src/components/study-selector';
import { useApp } from '@/src/state/AppState';
import { colors } from '@/src/theme';
import { formatDay, formatTime, tx } from '@/src/text';

type CourseSort = 'title' | 'type' | 'time';

/**
 * All courses of the selected study: bulk-loads `POST /v1/campus/courses`
 * across every cached structure element, then browses them by course type
 * (Seminar, Vorlesung, … — whatever the portal returns), search, and sort.
 */
export default function KurseScreen() {
  const { locale, sessionMode, campusStudies, activeStudyId, setCurriculum } = useApp();
  const [courses, setCourses] = useState<BulkCourse[]>([]);
  const [elementCount, setElementCount] = useState(0);
  const [fetchedIds, setFetchedIds] = useState<number[]>([]);
  const [failedIds, setFailedIds] = useState<number[]>([]);
  const [coursesSync, setCoursesSync] = useState<CoursesSyncInfo | null>(null);
  const [saveError, setSaveError] = useState('');
  const [phase, setPhase] = useState<'structures' | 'courses'>('courses');
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ fetched: 0, total: 0, courseCount: 0 });
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sort, setSort] = useState<CourseSort>('title');
  const cancelRun = useRef(false);
  const loadSeq = useRef(0);
  const study = sessionMode === 'campus' ? activeStudy(campusStudies, activeStudyId) : null;

  useEffect(() => {
    loadSeq.current += 1;
    const seq = loadSeq.current;
    setCourses([]);
    setFetchedIds([]);
    setFailedIds([]);
    setCoursesSync(null);
    setSaveError('');
    setQuery('');
    setTypeFilter('all');
    setSort('title');
    setProgress({ fetched: 0, total: 0, courseCount: 0 });
    if (!study) {
      setElementCount(0);
      return;
    }
    const studyId = study.studyId;
    loadCachedNodes(studyId)
      .then((nodes) => {
        if (loadSeq.current === seq) setElementCount(nodes.length);
      })
      .catch(() => {
        if (loadSeq.current === seq) setElementCount(0);
      });
    // Hydrate from the course cache: instant list, Weiter loads only the rest.
    // Guarded by seq so a late hydration never overwrites a running load.
    loadCachedCourses(studyId)
      .then((cached) => {
        if (loadSeq.current === seq && cached.length) setCourses(cached);
      })
      .catch(() => undefined);
    loadCoursesFetchedIds(studyId)
      .then((ids) => {
        if (loadSeq.current === seq) setFetchedIds(ids);
      })
      .catch(() => undefined);
    getCoursesSyncInfo(studyId)
      .then((info) => {
        if (loadSeq.current === seq) setCoursesSync(info);
      })
      .catch(() => undefined);
  }, [study?.studyId]);

  async function loadAll(): Promise<void> {
    if (!study || running) return;
    loadSeq.current += 1;
    const seq = loadSeq.current;
    const myStudyId = study.studyId;
    const current = () => loadSeq.current === seq;
    cancelRun.current = false;
    setRunning(true);
    setFailedIds([]);
    setSaveError('');
    try {
      // Phase 1: without cached structures there is nothing to iterate —
      // sync them first (with resume), then read the courses.
      let nodes = await loadCachedNodes(myStudyId).catch(() => []);
      if (!nodes.length) {
        if (study.elementId == null) return;
        setPhase('structures');
        const expandedSeed = await loadExpandedIds(myStudyId).catch(() => []);
        const cached = nodes;
        const pending: number[] = [];
        const struct = await syncFullStructure(myStudyId, study.elementId, {
          onProgress: (update) => {
            if (current()) setProgress({ fetched: update.fetched, total: update.fetched + update.queued, courseCount: update.nodeCount });
          },
          isCancelled: () => cancelRun.current,
          resume: { expanded: expandedSeed, pending },
        });
        const mergedNodes = new Map(cached.map((node) => [node.id, node] as const));
        for (const node of struct.nodes) mergedNodes.set(node.id, node);
        nodes = [...mergedNodes.values()];
        if (current()) {
          setCurriculum(nodes, { studyId: myStudyId, replace: true });
          setElementCount(nodes.length);
        }
        const structExpanded = [...new Set([...expandedSeed, ...struct.expandedIds])];
        await saveFullStructure(myStudyId, study.elementId, nodes, structExpanded, !struct.cancelled && struct.failedIds.length === 0).catch(() => undefined);
        if (!nodes.length) return;
        if (current() && struct.failedIds.length > 0) setFailedIds(struct.failedIds);
      }
      if (cancelRun.current) return;
      setPhase('courses');
      // Read the stored state fresh: component state may predate hydration.
      const storedCourses = await loadCachedCourses(myStudyId).catch(() => []);
      const storedFetched = await loadCoursesFetchedIds(myStudyId).catch(() => []);
      const result = await fetchAllCourses(
        myStudyId,
        nodes.map((node) => ({ id: node.id, name: node.name })),
        {
          skipIds: storedFetched,
          onProgress: (update) => {
            if (current()) setProgress({ fetched: update.fetched, total: update.total, courseCount: update.courseCount });
          },
          isCancelled: () => cancelRun.current,
        },
      );
      const merged = new Map(storedCourses.map((course) => [course.id, course]));
      for (const course of result.courses) {
        const known = merged.get(course.id);
        if (known) {
          for (const elementId of course.elementIds) {
            if (!known.elementIds.includes(elementId)) {
              known.elementIds.push(elementId);
              known.elementNames.push(...course.elementNames.filter((name) => !known.elementNames.includes(name)));
            }
          }
        } else {
          merged.set(course.id, course);
        }
      }
      const all = [...merged.values()];
      const allFetched = [...new Set([...storedFetched, ...result.fetchedIds])];
      const complete = !result.cancelled && result.failedIds.length === 0;
      try {
        await saveCourses(myStudyId, all, allFetched, complete);
      } catch (caught) {
        const reason = caught instanceof Error ? caught.message : 'unbekannt';
        if (current()) {
          setSaveError(tx(locale, `Kurse konnten nicht gespeichert werden (${reason}).`, `Courses could not be saved (${reason}).`));
          showToast({ tone: 'error', title: tx(locale, 'Cache-Speichern fehlgeschlagen', 'Cache save failed'), message: reason });
        }
      }
      if (!current()) return;
      setCourses(all);
      setFetchedIds(allFetched);
      setCoursesSync(await getCoursesSyncInfo(myStudyId).catch(() => null));
      setFailedIds((currentFailed) => [...new Set([...currentFailed, ...result.failedIds])]);
      if (result.failedIds.length > 0) {
        showFetchAlert(locale, {
          title: tx(locale, `${result.failedIds.length} Elemente übersprungen`, `${result.failedIds.length} elements skipped`),
          code: 'campus_failed',
          onRetry: loadAll,
        });
      }
    } finally {
      if (current()) setRunning(false);
    }
  }

  async function clearCourseCache(): Promise<void> {
    if (!study || running) return;
    await clearCachedCourses(study.studyId).catch(() => undefined);
    setCourses([]);
    setFetchedIds([]);
    setFailedIds([]);
    setCoursesSync(null);
  }

  const types = useMemo(() => [...new Set(courses.map((course) => course.courseType || tx(locale, 'Ohne Typ', 'No type')))].sort(), [courses, locale]);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = courses.filter((course) => {
      if (typeFilter !== 'all' && (course.courseType || tx(locale, 'Ohne Typ', 'No type')) !== typeFilter) return false;
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
      back
      kicker="C@MPUS"
      title={tx(locale, 'Kurse', 'Courses')}
      subtitle={
        study
          ? `${study.name} · ${courses.length} ${tx(locale, 'Kurse', 'courses')} · ${fetchedIds.length}/${elementCount} ${tx(locale, 'Elemente gelesen', 'elements read')}`
          : tx(locale, 'Alle Lehrveranstaltungen eines Studiengangs.', 'All courses of a study.')
      }>
      <StudySelector />
      {study === null ? (
        <Card>
          <Muted>
            {tx(
              locale,
              'Melden Sie sich mit dem C@MPUS-Token an, um Kurse zu laden.',
              'Sign in with the C@MPUS token to load courses.',
            )}
          </Muted>
        </Card>
      ) : (
        <>
          <Card>
            <Text style={{ color: colors.anthracite, fontWeight: '700' }}>
              {tx(
                locale,
                'Liest die Kurse aller Strukturelemente dieses Studiengangs.',
                'Reads the courses of every structure element of this study.',
              )}
            </Text>
            <Text style={{ color: colors.inkSoft, fontSize: 13 }}>
              {tx(locale, `Struktur-Cache: ${elementCount} Knoten`, `Structure cache: ${elementCount} nodes`)}
            </Text>
            {elementCount === 0 && !running ? (
              <>
                <Muted>
                  {tx(
                    locale,
                    'Keine Struktur zwischengespeichert. Der Knopf lädt zuerst die Struktur und danach die Kurse.',
                    'No structure cached. The button loads the structure first, then the courses.',
                  )}
                </Muted>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <Button secondary label="C@MPUS" onPress={() => router.push('/campus-info')} />
                  <Button
                    secondary
                    label={tx(locale, 'Struktur-Browser', 'Structure browser')}
                    onPress={() => router.push('/strukturen')}
                  />
                </View>
              </>
            ) : null}
            {running ? (
              <Text style={{ color: colors.blue, fontWeight: '700' }}>
                {phase === 'structures'
                  ? tx(locale, `Struktur ${progress.fetched}/${progress.total}`, `Structure ${progress.fetched}/${progress.total}`)
                  : tx(locale, `${progress.fetched}/${progress.total} Elemente · ${progress.courseCount} Kurse`, `${progress.fetched}/${progress.total} elements · ${progress.courseCount} courses`)}
              </Text>
            ) : null}
            {failedIds.length > 0 ? (
              <Text style={{ color: colors.warning, fontSize: 14, lineHeight: 20 }}>
                {tx(locale, `${failedIds.length} Elemente übersprungen — Weiter lädt nur den Rest.`, `${failedIds.length} elements skipped — continue loads only the rest.`)}
              </Text>
            ) : null}
            {saveError ? (
              <Text style={{ color: colors.danger, fontSize: 14, lineHeight: 20 }}>{saveError}</Text>
            ) : null}
            {coursesSync ? (
              <Text style={{ color: colors.inkSoft, fontSize: 13 }}>
                {tx(locale, `Cache: ${coursesSync.courseCount} Kurse`, `Cache: ${coursesSync.courseCount} courses`)}
                {coursesSync.finishedAt ? ` · ${formatDay(coursesSync.finishedAt, locale)}, ${formatTime(coursesSync.finishedAt)} ${tx(locale, 'Uhr', "o'clock")}` : ''}
                {coursesSync.complete ? '' : ` · ${tx(locale, 'unvollständig', 'incomplete')}`}
              </Text>
            ) : fetchedIds.length === 0 && !running ? (
              <Text style={{ color: colors.inkSoft, fontSize: 13 }}>
                {tx(
                  locale,
                  'Für diesen Studiengang wurden noch keine Kurse geladen.',
                  'No courses loaded for this study yet.',
                )}
              </Text>
            ) : null}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {running ? (
                <Button secondary label={tx(locale, 'Abbrechen', 'Cancel')} onPress={() => (cancelRun.current = true)} />
              ) : study.elementId != null ? (
                <Button
                  label={fetchedIds.length > 0 ? tx(locale, 'Weiter laden', 'Continue loading') : tx(locale, 'Alle Kurse laden', 'Load all courses')}
                  onPress={loadAll}
                />
              ) : null}
              {!running && courses.length > 0 ? (
                <Button secondary label={tx(locale, 'Kurs-Cache leeren', 'Clear course cache')} onPress={clearCourseCache} />
              ) : null}
            </View>
          </Card>
          {courses.length > 0 ? (
            <>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={tx(locale, 'Titel, Dozent, Nummer, Raum …', 'Title, lecturer, number, room …')}
                placeholderTextColor={colors.mute}
                style={inputStyle}
              />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <Pressable onPress={() => setTypeFilter('all')}>
                  <Pill label={tx(locale, 'Alle Typen', 'All types')} active={typeFilter === 'all'} />
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
                      label={item === 'title' ? tx(locale, 'Titel', 'Title') : item === 'type' ? tx(locale, 'Typ', 'Type') : tx(locale, 'Termin', 'Date')}
                      active={sort === item}
                    />
                  </Pressable>
                ))}
              </View>
              <Section title={tx(locale, `${visible.length} Kurse`, `${visible.length} courses`)} />
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
                    course.elementNames.length > 1 ? `${course.elementNames.length} ${tx(locale, 'Bereiche', 'sections')}` : '',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                  onPress={() => router.push({ pathname: '/kurs/[id]', params: { id: String(course.id) } })}
                />
              ))}
            </>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const inputStyle = {
  backgroundColor: colors.paper,
  borderWidth: 1,
  borderColor: colors.line,
  borderRadius: 14,
  paddingHorizontal: 14,
  paddingVertical: 12,
  fontSize: 16,
  color: colors.anthracite,
};
