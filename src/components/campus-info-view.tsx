import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { Platform, Pressable, Text, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { activeStudy, cacheCampusCourses, campusDetail, loadCampusCourses, loadCampusCurriculum, loadServerTree } from '@/src/auth/campus';
import { appendElementCourses, clearCachedStudy, loadCachedCoursesByElement, saveFullStructure } from '@/src/campus/db';
import { runServerSync } from '@/src/campus/server-sync';
import { Button, Card, InfoRow, Muted, Pill, Section } from '@/src/components/ui';
import { showFetchAlert } from '@/src/components/fetch-alert';
import { StructureRow, TreeChildren } from '@/src/components/structure-row';
import { StudySelector } from '@/src/components/study-selector';
import { keys } from '@/src/query/keys';
import { deviceNodesQuery, syncInfoQuery } from '@/src/query/queries';
import { useApp } from '@/src/state/AppState';
import { colors } from '@/src/theme';
import { formatDay, formatTime, tx } from '@/src/text';
import type { CampusCourse, CampusStudy, CurriculumNode } from '@/src/types';

/** Live C@MPUS curriculum structure for the selected study (`POST /v1/campus/structure`). */
export function CampusInfoView() {
  const { locale, sessionMode, campusStudies, activeStudyId, curriculumNodes, curriculumStudyId, setCurriculum } = useApp();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [busyNode, setBusyNode] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState<{ fetched: number; queued: number; nodeCount: number; retries: number; failedIds: number[] } | null>(null);
  const [syncFailed, setSyncFailed] = useState<number[]>([]);
  const [syncCancelled, setSyncCancelled] = useState(false);
  const autoLoaded = useRef<number | null>(null);
  const cancelSync = useRef(false);
  const study = sessionMode === 'campus' ? activeStudy(campusStudies, activeStudyId) : null;
  const stale = study !== null && curriculumStudyId !== study.studyId;
  // Device store reads through queries; the network loads below stay
  // user-driven mutations until they are converted.
  const cachedNodesQ = useQuery(deviceNodesQuery(study?.studyId ?? null, { enabled: Boolean(study?.elementId != null) }));
  const syncInfoQ = useQuery(syncInfoQuery(study?.studyId ?? null, { enabled: Boolean(study) }));
  const syncInfo = syncInfoQ.data;

  async function loadRoot(target: CampusStudy, silent = false): Promise<void> {
    if (target.elementId == null) {
      setError(
        tx(
          locale,
          'Für diesen Studiengang fehlt die Verknüpfung aus der Chooser-Antwort.',
          'This study has no link from the chooser response.',
        ),
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
      const text = tx(
        locale,
        `Struktur nicht geladen (${code}${detail ? `, ${detail}` : ''}).`,
        `Structure not loaded (${code}${detail ? `, ${detail}` : ''}).`,
      );
      setError(text);
      if (!silent) {
        showFetchAlert(locale, {
          title: tx(locale, 'Struktur nicht geladen', 'Structure not loaded'),
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
        tx(
          locale,
          `Knoten nicht geladen (${code}${detail ? `, ${detail}` : ''}).`,
          `Node not loaded (${code}${detail ? `, ${detail}` : ''}).`,
        ),
      );
      showFetchAlert(locale, {
        title: tx(locale, 'Knoten nicht geladen', 'Node not loaded'),
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

  async function syncAll(): Promise<void> {
    if (!study || study.elementId == null || syncing) return;
    const studyId = study.studyId;
    const rootElementId = study.elementId;
    cancelSync.current = false;
    setSyncing(true);
    setSyncFailed([]);
    setSyncCancelled(false);
    setProgress({ fetched: 0, queued: 1, nodeCount: 0, retries: 0, failedIds: [] });
    try {
      const job = await runServerSync(studyId, {
        elementId: rootElementId,
        includeCourses: false,
        onProgress: (update) =>
          setProgress({ fetched: update.fetched, queued: 0, nodeCount: update.nodeCount, retries: update.retries, failedIds: update.failedIds }),
        isCancelled: () => cancelSync.current,
      });
      setSyncCancelled(job.state === 'cancelled');
      setSyncFailed(job.failedIds);
      // Hydrate the local sync cache and the view from the server snapshot.
      const tree = await loadServerTree(studyId).catch(() => null);
      if (tree && tree.nodes.length > 0) {
        setCurriculum(tree.nodes, { studyId, replace: true });
        await saveFullStructure(studyId, rootElementId, tree.nodes, tree.expandedIds, tree.sync?.complete ?? false).catch(() => undefined);
      }
      if (job.state === 'failed' || job.failedIds.length > 0) {
        const code = job.state === 'failed' ? (job.error ?? 'sync_failed') : 'campus_failed';
        showFetchAlert(locale, {
          title:
            job.state === 'failed'
              ? tx(locale, 'Struktur-Sync fehlgeschlagen', 'Structure sync failed')
              : tx(locale, `${job.failedIds.length} Knoten übersprungen`, `${job.failedIds.length} nodes skipped`),
          code,
          onRetry: syncAll,
        });
      }
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : 'sync_failed';
      const detail = campusDetail(caught);
      setError(
        tx(
          locale,
          `Struktur-Sync nicht gestartet (${code}${detail ? `, ${detail}` : ''}).`,
          `Structure sync did not start (${code}${detail ? `, ${detail}` : ''}).`,
        ),
      );
      showFetchAlert(locale, {
        title: tx(locale, 'Struktur-Sync fehlgeschlagen', 'Structure sync failed'),
        code,
        detail: detail || undefined,
        onRetry: syncAll,
      });
    } finally {
      setSyncing(false);
      // The store changed under the queries — refresh the cache metadata.
      queryClient.invalidateQueries({ queryKey: keys.syncInfo(studyId) });
    }
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
          : tx(locale, 'Live-Struktur aus C@MPUS, kein Demonstrationsstand.', 'Live structure from C@MPUS, not the demonstration record.')}
      </Muted>
      <StudySelector />
      {study === null ? (
        <Card>
          <Muted>
            {tx(
              locale,
              'Melden Sie sich mit dem C@MPUS-Token an, um die echte Curriculum-Struktur zu sehen.',
              'Sign in with the C@MPUS token to see the real curriculum structure.',
            )}
          </Muted>
        </Card>
      ) : (
        <>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Pill
              label={
                stale
                  ? tx(locale, 'Anderer Stand', 'Other state')
                  : tx(locale, `${curriculumNodes.length} Knoten`, `${curriculumNodes.length} nodes`)
              }
              tone={stale ? 'wait' : 'neutral'}
            />
            <Button label={busy ? '…' : tx(locale, 'Neu laden', 'Reload')} onPress={() => loadRoot(study)} secondary />
          </View>
          {stale ? (
            <Card>
              <Muted>
                {tx(
                  locale,
                  'Die Knoten gehören zu einem anderen Studiengang. Lade die Struktur für die Auswahl.',
                  'The nodes belong to another study. Load the structure for the selection.',
                )}
              </Muted>
              <Button label={tx(locale, 'Struktur laden', 'Load structure')} onPress={() => loadRoot(study)} />
            </Card>
          ) : null}
          <Section title={tx(locale, 'Offline-Cache', 'Offline cache')} />
          <Card>
            <Text style={{ color: colors.anthracite, fontWeight: '700' }}>
              {syncInfo && syncInfo.nodeCount > 0
                ? `${syncInfo.nodeCount} ${tx(locale, 'Knoten', 'nodes')}${syncInfo.finishedAt ? ` · ${formatDay(syncInfo.finishedAt, locale)}, ${formatTime(syncInfo.finishedAt)} ${tx(locale, 'Uhr', "o'clock")}` : ''}${syncInfo.complete ? '' : ` · ${tx(locale, 'unvollständig', 'incomplete')}`}`
                : tx(locale, 'Kein Cache für diesen Studiengang.', 'No cache for this study.')}
            </Text>
            <Muted>
              {tx(
                locale,
                'Lädt alle Ebenen der Struktur und legt sie in einer SQLite-Datenbank auf dem Gerät ab.',
                'Loads every level of the structure into an on-device SQLite database.',
              )}
            </Muted>
            {syncing && progress ? (
              <Text style={{ color: colors.blue, fontWeight: '700' }}>
                {tx(
                  locale,
                  `${progress.fetched} Abfragen · ${progress.nodeCount} Knoten${progress.retries > 0 ? ` · ${progress.retries} Wiederholungen` : ''}`,
                  `${progress.fetched} calls · ${progress.nodeCount} nodes${progress.retries > 0 ? ` · ${progress.retries} retries` : ''}`,
                )}
              </Text>
            ) : null}
            {syncFailed.length > 0 ? (
              <Text style={{ color: colors.warning, fontSize: 14, lineHeight: 20 }}>
                {tx(
                  locale,
                  `${syncFailed.length} Knoten übersprungen (3 Versuche je Knoten). Weiter laden versucht nur den Rest.`,
                  `${syncFailed.length} nodes skipped (3 attempts each). Continue loads only the rest.`,
                )}
              </Text>
            ) : null}
            {syncCancelled ? (
              <Text style={{ color: colors.inkSoft, fontSize: 14, lineHeight: 20 }}>
                {tx(locale, 'Abgebrochen. Weiter laden setzt an der Stelle fort.', 'Cancelled. Continue resumes where it stopped.')}
              </Text>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {syncing ? (
                <Button secondary label={tx(locale, 'Abbrechen', 'Cancel')} onPress={() => (cancelSync.current = true)} />
              ) : (
                <Button
                  label={syncInfo && syncInfo.nodeCount > 0 ? tx(locale, 'Weiter laden', 'Continue loading') : tx(locale, 'Alles laden', 'Load everything')}
                  onPress={syncAll}
                />
              )}
              {!syncing && syncInfo && syncInfo.nodeCount > 0 ? (
                <Button secondary label={tx(locale, 'Cache leeren', 'Clear cache')} onPress={clearCache} />
              ) : null}
            </View>
          </Card>
          {error ? <Text style={{ color: colors.danger, fontSize: 14, lineHeight: 20 }}>{error}</Text> : null}
          {Platform.OS === 'web' ? (
            <Button secondary label={tx(locale, 'Struktur-Browser öffnen', 'Open structure browser')} onPress={() => router.push('/strukturen')} />
          ) : null}
          {curriculumNodes.length === 0 && !stale && !error ? (
            <Card>
              <Muted>{tx(locale, 'Struktur wird geladen …', 'Loading structure …')}</Muted>
            </Card>
          ) : null}
          {!stale && curriculumNodes.length > 0 ? (
            <>
              <Section title={tx(locale, 'Struktur', 'Structure')} />
              <CurriculumTree
                nodes={curriculumNodes}
                studyId={study.studyId}
                locale={locale}
                busyNode={busyNode}
                onNode={(nodeId) => loadChildren(study, nodeId)}
              />
            </>
          ) : null}
        </>
      )}
    </View>
  );
}

function CurriculumTree({
  nodes,
  studyId,
  locale,
  busyNode,
  onNode,
}: {
  nodes: CurriculumNode[];
  studyId: number;
  locale: 'de' | 'en';
  busyNode: number | null;
  onNode: (nodeId: number) => void;
}) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const children = new Map<number, CurriculumNode[]>();
  const roots: CurriculumNode[] = [];
  for (const node of nodes) {
    if (node.parentId !== null && byId.has(node.parentId)) {
      const list = children.get(node.parentId) ?? [];
      list.push(node);
      children.set(node.parentId, list);
    } else {
      roots.push(node);
    }
  }
  return (
    <>
      {roots.map((node) => (
        <TreeNode key={node.id} node={node} children={children} depth={0} studyId={studyId} locale={locale} busyNode={busyNode} onNode={onNode} />
      ))}
    </>
  );
}

function TreeNode({
  node,
  children,
  depth,
  studyId,
  locale,
  busyNode,
  onNode,
}: {
  node: CurriculumNode;
  children: Map<number, CurriculumNode[]>;
  depth: number;
  studyId: number;
  locale: 'de' | 'en';
  busyNode: number | null;
  onNode: (nodeId: number) => void;
}) {
  const kids = children.get(node.id) ?? [];
  const status = [
    node.completed ? tx(locale, 'abgeschlossen', 'completed') : '',
    node.inProgress ? tx(locale, 'in Arbeit', 'in progress') : '',
    busyNode === node.id ? '…' : '',
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <View>
      <StructureRow
        name={node.name}
        designation={node.designation || undefined}
        elementType={node.elementType || undefined}
        status={status || undefined}
        meta={kids.length ? `${kids.length} ${tx(locale, 'Unterpunkte', 'children')}` : undefined}
        onPress={() => onNode(node.id)}
        depth={depth}
      />
      <NodeCourses studyId={studyId} elementId={node.id} elementName={node.name} locale={locale} />
      {kids.length > 0 ? (
        <TreeChildren>
          {kids.map((kid) => (
            <TreeNode key={kid.id} node={kid} children={children} depth={depth + 1} studyId={studyId} locale={locale} busyNode={busyNode} onNode={onNode} />
          ))}
        </TreeChildren>
      ) : null}
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
  const coursesQ = useQuery({
    queryKey: keys.deviceCoursesByElement(studyId, elementId),
    queryFn: async (): Promise<CampusCourse[]> => {
      const cached = await loadCachedCoursesByElement(studyId, elementId).catch(() => []);
      if (cached.length > 0) {
        cacheCampusCourses(cached);
        return cached;
      }
      const loaded = await loadCampusCourses(elementId, studyId);
      await appendElementCourses(studyId, elementId, elementName, loaded.courses).catch(() => undefined);
      return loaded.courses;
    },
    staleTime: Infinity,
    enabled: open,
  });
  const courses = coursesQ.data ?? null;
  const coursesError = coursesQ.error;

  function toggle(): void {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (coursesQ.isError) coursesQ.refetch();
  }

  const errorText =
    coursesError == null
      ? ''
      : (() => {
          const code = coursesError instanceof Error ? coursesError.message : 'campus_failed';
          const detail = campusDetail(coursesError);
          return tx(
            locale,
            `Kurse nicht geladen (${code}${detail ? `, ${detail}` : ''}).`,
            `Courses not loaded (${code}${detail ? `, ${detail}` : ''}).`,
          );
        })();

  return (
    <View style={{ marginLeft: 8, marginBottom: 4 }}>
      <Pressable onPress={toggle} hitSlop={8}>
        <Text style={{ color: colors.blue, fontSize: 13, fontWeight: '700' }}>
          {coursesQ.isPending && open && !courses
            ? '…'
            : courses
              ? `${courses.length} ${tx(locale, courses.length === 1 ? 'Kurs' : 'Kurse', courses.length === 1 ? 'course' : 'courses')}`
              : tx(locale, 'Kurse', 'Courses')}
        </Text>
      </Pressable>
      {errorText ? <Text style={{ color: colors.danger, fontSize: 13, lineHeight: 18 }}>{errorText}</Text> : null}
      {open && courses && courses.length === 0 ? (
        <Text style={{ color: colors.inkSoft, fontSize: 13 }}>
          {tx(locale, 'Keine Lehrveranstaltungen an diesem Knoten.', 'No courses on this node.')}
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
