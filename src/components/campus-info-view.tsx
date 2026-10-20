import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { Platform, Pressable, Text, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { campusDetail, loadCampusCurriculum } from '@/src/auth/campus';
import { clearCachedStudy } from '@/src/campus/db';
import { useActiveStudy } from '@/src/campus/use-active-study';
import { useCampusSync } from '@/src/campus/use-campus-sync';
import { useNodeCourses } from '@/src/campus/use-node-courses';
import { Button, Card, InfoRow, Muted, Pill, Section } from '@/src/components/ui';
import { showFetchAlert } from '@/src/components/fetch-alert';
import { CurriculumTree } from '@/src/components/curriculum-tree';
import { StudySelector } from '@/src/components/study-selector';
import { keys } from '@/src/query/keys';
import { deviceNodesQuery, syncInfoQuery } from '@/src/query/queries';
import { useApp } from '@/src/state/AppState';
import { colors } from '@/src/theme';
import { formatDay, formatTime, tx } from '@/src/text';
import type { CampusStudy } from '@/src/types';

/** Live C@MPUS curriculum structure for the selected study (`POST /v1/campus/structure`). */
export function CampusInfoView() {
  const { locale, curriculumNodes, curriculumStudyId, setCurriculum } = useApp();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [busyNode, setBusyNode] = useState<number | null>(null);
  const [error, setError] = useState('');
  const autoLoaded = useRef<number | null>(null);
  const { study } = useActiveStudy();
  const stale = study !== null && curriculumStudyId !== study.studyId;
  // Device store reads through queries; the network loads below stay
  // user-driven mutations until they are converted.
  const cachedNodesQ = useQuery(deviceNodesQuery(study?.studyId ?? null, { enabled: Boolean(study?.elementId != null) }));
  const syncInfoQ = useQuery(syncInfoQuery(study?.studyId ?? null, { enabled: Boolean(study) }));
  const syncInfo = syncInfoQ.data;

  async function loadRoot(target: CampusStudy, silent = false): Promise<void> {
    if (target.elementId == null) {
      setError(
        tx(locale, 'campusInfoView.diesen'),
      );
      return;
    }
    if (!silent) {
      setError('');
      setBusy(true);
    }
    try {
      const loaded = await loadCampusCurriculum(target.elementId, target.studyId);
      setCurriculum(loaded.nodes, { studyId: loaded.studyId, replace: true });
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : 'campus_failed';
      const detail = campusDetail(caught);
      const text = tx(locale, 'campusInfoView.struktur_geladen', [code, detail ? `, ${detail}` : '']);
      setError(text);
      if (!silent) {
        showFetchAlert(locale, {
          title: tx(locale, 'campusInfoView.struktur_geladen_2'),
          code,
          detail: detail || undefined,
          onRetry: () => loadRoot(target),
        });
      }
    } finally {
      if (!silent) setBusy(false);
    }
  }

  async function loadChildren(target: CampusStudy, nodeId: number): Promise<void> {
    if (busyNode !== null) return;
    setError('');
    setBusyNode(nodeId);
    try {
      const loaded = await loadCampusCurriculum(nodeId, target.studyId);
      setCurriculum(loaded.nodes, { studyId: loaded.studyId });
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : 'campus_failed';
      const detail = campusDetail(caught);
      setError(
        tx(locale, 'campusInfoView.knoten_geladen', [code, detail ? `, ${detail}` : '']),
      );
      showFetchAlert(locale, {
        title: tx(locale, 'campusInfoView.knoten_geladen_2'),
        code,
        detail: detail || undefined,
        onRetry: () => loadChildren(target, nodeId),
      });
    } finally {
      setBusyNode(null);
    }
  }

  useEffect(() => {
    if (!study || study.elementId == null) return;
    if (autoLoaded.current === study.studyId) return;
    if (curriculumNodes.length > 0 && !stale) {
      autoLoaded.current = study.studyId;
      return;
    }
    autoLoaded.current = study.studyId;
    const cached = cachedNodesQ.data;
    if (cached && cached.length > 0) {
      // Prefer the SQLite cache: instant tree, no network.
      setCurriculum(cached, { studyId: study.studyId, replace: true });
      return;
    }
    loadRoot(study, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [study?.studyId, stale, curriculumNodes.length, cachedNodesQ.data]);

  // Structure sync through the shared hook: the job loop, progress, cancel and
  // failure bookkeeping are shared, the callbacks add only this screen's copy.
  const sync = useCampusSync({
    onTree: (studyId, tree, { isLatest }) => {
      // A late run, or a run for a study the user has since switched away
      // from, must not replace the visible tree.
      if (isLatest && studyId === study?.studyId) setCurriculum(tree.nodes, { studyId, replace: true });
    },
    onSuccess: ({ job, vars, isLatest }) => {
      if (!isLatest || job.failedIds.length === 0) return;
      showFetchAlert(locale, {
        title: tx(locale, 'common.knoten_uebersprungen', [job.failedIds.length]),
        code: 'campus_failed',
        onRetry: () => sync.run({ studyId: vars.studyId, elementId: vars.elementId, includeCourses: false }),
      });
    },
    onError: (caught, vars) => {
      const code = caught instanceof Error ? caught.message : 'sync_failed';
      const detail = campusDetail(caught);
      setError(
        tx(locale, 'campusInfoView.struktur_sync', [code, detail ? `, ${detail}` : '']),
      );
      showFetchAlert(locale, {
        title: tx(locale, 'common.struktur_sync'),
        code,
        detail: detail || undefined,
        onRetry: () => sync.run({ studyId: vars.studyId, elementId: vars.elementId, includeCourses: false }),
      });
    },
  });
  const progress = study ? sync.progressFor(study.studyId) : null;
  const syncing = study ? sync.isRunningFor(study.studyId) : false;
  const syncFailed = study ? sync.failedIdsFor(study.studyId) : [];
  const syncCancelled = study ? sync.cancelledFor(study.studyId) : false;

  function syncAll(): void {
    if (!study || study.elementId == null) return;
    setError('');
    sync.run({ studyId: study.studyId, elementId: study.elementId, includeCourses: false });
  }

  async function clearCache(): Promise<void> {
    if (!study || syncing) return;
    await clearCachedStudy(study.studyId).catch(() => undefined);
    queryClient.invalidateQueries({ queryKey: keys.syncInfo(study.studyId) });
    queryClient.invalidateQueries({ queryKey: keys.deviceNodes(study.studyId) });
  }

  return (
    <View style={{ gap: 14 }}>
      <Muted>
        {study
          ? `${study.name}${study.intendedDegree ? ` · ${study.intendedDegree}` : ''}${study.versionIdentifier ? ` · ${study.versionIdentifier}` : ''}`
          : tx(locale, 'campusInfoView.live')}
      </Muted>
      <StudySelector />
      {study === null ? (
        <Card>
          <Muted>
            {tx(locale, 'campusInfoView.melden')}
          </Muted>
        </Card>
      ) : (
        <>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Pill
              label={
                stale
                  ? tx(locale, 'campusInfoView.anderer')
                  : tx(locale, 'campusInfoView.knoten_2', [curriculumNodes.length])
              }
              tone={stale ? 'wait' : 'neutral'}
            />
            <Button label={busy ? '…' : tx(locale, 'campusInfoView.neu')} onPress={() => loadRoot(study)} secondary />
          </View>
          {stale ? (
            <Card>
              <Muted>
                {tx(locale, 'campusInfoView.knoten')}
              </Muted>
              <Button label={tx(locale, 'common.struktur')} onPress={() => loadRoot(study)} />
            </Card>
          ) : null}
          <Section title={tx(locale, 'campusInfoView.offline')} />
          <Card>
            <Text style={{ color: colors.anthracite, fontWeight: '700' }}>
              {syncInfo && syncInfo.nodeCount > 0
                ? `${syncInfo.nodeCount} ${tx(locale, 'common.knoten')}${syncInfo.finishedAt ? ` · ${formatDay(syncInfo.finishedAt, locale)}, ${formatTime(syncInfo.finishedAt)} ${tx(locale, 'common.uhr')}` : ''}${syncInfo.complete ? '' : ` · ${tx(locale, 'common.unvollstaendig')}`}`
                : tx(locale, 'campusInfoView.cache')}
            </Text>
            <Muted>
              {tx(locale, 'campusInfoView.laedt')}
            </Muted>
            {syncing && progress ? (
              <Text style={{ color: colors.blue, fontWeight: '700' }}>
                {tx(locale, 'common.abfragen', [progress.fetched, progress.nodeCount, progress.retries > 0 ? ` · ${progress.retries} Wiederholungen` : ''])}
              </Text>
            ) : null}
            {syncFailed.length > 0 ? (
              <Text style={{ color: colors.warning, fontSize: 14, lineHeight: 20 }}>
                {tx(locale, 'campusInfoView.knoten_uebersprungen', [syncFailed.length])}
              </Text>
            ) : null}
            {syncCancelled ? (
              <Text style={{ color: colors.inkSoft, fontSize: 14, lineHeight: 20 }}>
                {tx(locale, 'campusInfoView.abgebrochen')}
              </Text>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {syncing ? (
                <Button secondary label={tx(locale, 'common.abbrechen')} onPress={() => sync.cancel(study.studyId)} />
              ) : (
                <Button
                  label={syncInfo && syncInfo.nodeCount > 0 ? tx(locale, 'common.weiter') : tx(locale, 'campusInfoView.alles')}
                  onPress={syncAll}
                />
              )}
              {!syncing && syncInfo && syncInfo.nodeCount > 0 ? (
                <Button secondary label={tx(locale, 'common.cache')} onPress={clearCache} />
              ) : null}
            </View>
          </Card>
          {error ? <Text style={{ color: colors.danger, fontSize: 14, lineHeight: 20 }}>{error}</Text> : null}
          {Platform.OS === 'web' ? (
            <Button secondary label={tx(locale, 'campusInfoView.struktur_browser')} onPress={() => router.push('/strukturen')} />
          ) : null}
          {curriculumNodes.length === 0 && !stale && !error ? (
            <Card>
              <Muted>{tx(locale, 'campusInfoView.struktur_wird')}</Muted>
            </Card>
          ) : null}
          {!stale && curriculumNodes.length > 0 ? (
            <>
              <Section title={tx(locale, 'campusInfoView.struktur')} />
              <CurriculumTree
                nodes={curriculumNodes}
                locale={locale}
                busyNodeId={busyNode}
                onSelect={(nodeId) => loadChildren(study, nodeId)}
                renderUnderRow={(node) => <NodeCourses studyId={study.studyId} elementId={node.id} elementName={node.name} locale={locale} />}
              />
            </>
          ) : null}
        </>
      )}
    </View>
  );
}

function compactTime(value: string): string {
  return value.length >= 16 ? value.slice(0, 16).replace('T', ' ') : value;
}

function NodeCourses({ studyId, elementId, elementName, locale }: { studyId: number; elementId: number; elementName: string; locale: 'de' | 'en' }) {
  const [open, setOpen] = useState(false);
  // Cache first: instant and offline. Otherwise network with write-through.
  // The question runs when the node opens; a tap retries after a failure.
  const node = useNodeCourses({ studyId, elementId, elementName, enabled: open, fetchOnMiss: true });
  const courses = node.courses;
  const coursesError = node.error;

  function toggle(): void {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (coursesError) void node.refetch();
  }

  const errorText =
    coursesError == null
      ? ''
      : (() => {
          const code = coursesError instanceof Error ? coursesError.message : 'campus_failed';
          const detail = campusDetail(coursesError);
          return tx(locale, 'campusInfoView.kurse', [code, detail ? `, ${detail}` : '']);
        })();

  return (
    <View style={{ marginLeft: 8, marginBottom: 4 }}>
      <Pressable onPress={toggle} hitSlop={8}>
        <Text style={{ color: colors.blue, fontSize: 13, fontWeight: '700' }}>
          {node.busy && open && !courses
            ? '…'
            : courses
              ? `${courses.length} ${courses.length === 1 ? tx(locale, 'campusInfoView.kurs') : tx(locale, 'kurse.kurse')}`
              : tx(locale, 'common.kurse')}
        </Text>
      </Pressable>
      {errorText ? <Text style={{ color: colors.danger, fontSize: 13, lineHeight: 18 }}>{errorText}</Text> : null}
      {open && courses && courses.length === 0 ? (
        <Text style={{ color: colors.inkSoft, fontSize: 13 }}>
          {tx(locale, 'common.lehrveranstaltungen')}
        </Text>
      ) : null}
      {open &&
        courses?.map((course) => (
          <InfoRow
            key={course.id}
            title={course.title}
            meta={[course.courseTypeShort || course.courseType, course.semester].filter(Boolean).join(' · ') || String(course.id)}
            detail={[
              course.courseNumber ? `LV ${course.courseNumber}` : '',
              course.lecturers.join(', '),
              course.startTime && course.endTime
                ? `${compactTime(course.startTime)}–${compactTime(course.endTime).slice(11) || compactTime(course.endTime)}`
                : compactTime(course.startTime),
              course.roomName,
              course.registrationStatus,
            ]
              .filter(Boolean)
              .join(' · ')}
            onPress={() => router.push({ pathname: '/kurs/[id]', params: { id: String(course.id) } })}
          />
        ))}
    </View>
  );
}
