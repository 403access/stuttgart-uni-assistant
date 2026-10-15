import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { Platform, Pressable, Text, View } from 'react-native';

import { activeStudy, cacheCampusCourses, campusDetail, loadCampusCourses, loadCampusCurriculum } from '@/src/auth/campus';
import { clearCachedStudy, getCoursesSyncInfo, getSyncInfo, loadCachedCourses, loadCachedCoursesByElement, loadCachedNodes, loadCoursesFetchedIds, loadExpandedIds, saveCourses, saveFullStructure, type CurriculumSyncInfo } from '@/src/campus/db';
import { syncFullStructure, type FullSyncProgress } from '@/src/campus/full-sync';
import { Button, Card, InfoRow, Muted, Pill, Screen, Section } from '@/src/components/ui';
import { showFetchAlert } from '@/src/components/fetch-alert';
import { StructureRow, TreeChildren } from '@/src/components/structure-row';
import { StudySelector } from '@/src/components/study-selector';
import { useApp } from '@/src/state/AppState';
import { colors } from '@/src/theme';
import { formatDay, formatTime, tx } from '@/src/text';
import type { CampusCourse, CampusStudy, CurriculumNode } from '@/src/types';

/** Live C@MPUS curriculum structure for the selected study (`POST /v1/campus/structure`). */
export default function CampusInfoScreen() {
  const { locale, sessionMode, campusStudies, activeStudyId, curriculumNodes, curriculumStudyId, setCurriculum } = useApp();
  const [busy, setBusy] = useState(false);
  const [busyNode, setBusyNode] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState<FullSyncProgress | null>(null);
  const [syncFailed, setSyncFailed] = useState<number[]>([]);
  const [syncCancelled, setSyncCancelled] = useState(false);
  const [syncInfo, setSyncInfo] = useState<CurriculumSyncInfo | null>(null);
  const autoLoaded = useRef<number | null>(null);
  const cancelSync = useRef(false);
  const study = sessionMode === 'campus' ? activeStudy(campusStudies, activeStudyId) : null;
  const stale = study !== null && curriculumStudyId !== study.studyId;

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
    (async () => {
      // Prefer the SQLite cache: instant tree, no network.
      try {
        const cached = await loadCachedNodes(study.studyId);
        if (cached.length > 0) {
          setCurriculum(cached, { studyId: study.studyId, replace: true });
          setSyncInfo(await getSyncInfo(study.studyId).catch(() => null));
          return;
        }
      } catch {
        // Fall through to the network load below.
      }
      await loadRoot(study, true);
    })().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [study?.studyId, stale]);

  useEffect(() => {
    if (!study) {
      setSyncInfo(null);
      return;
    }
    getSyncInfo(study.studyId)
      .then(setSyncInfo)
      .catch(() => undefined);
  }, [study?.studyId]);

  async function syncAll(): Promise<void> {
    if (!study || study.elementId == null || syncing) return;
    cancelSync.current = false;
    setSyncing(true);
    setSyncFailed([]);
    setSyncCancelled(false);
    // Resume from the cache: expanded nodes are skipped, the rest is queued.
    const studyId = study.studyId;
    const rootElementId = study.elementId;
    const cached = await loadCachedNodes(studyId).catch(() => []);
    const expandedSeed = await loadExpandedIds(studyId).catch(() => []);
    const expandedSet = new Set(expandedSeed);
    const pending = cached.map((node) => node.id).filter((id) => !expandedSet.has(id));
    setProgress({ fetched: 0, queued: pending.length + 1, nodeCount: cached.length, retries: 0, failedIds: [] });
    try {
      const result = await syncFullStructure(studyId, rootElementId, {
        onProgress: setProgress,
        isCancelled: () => cancelSync.current,
        resume: { expanded: expandedSeed, pending },
      });
      const merged = new Map(cached.map((node) => [node.id, node] as const));
      for (const node of result.nodes) merged.set(node.id, node);
      const all = [...merged.values()];
      const expanded = [...new Set([...expandedSeed, ...result.expandedIds])];
      setCurriculum(all, { studyId, replace: true });
      const complete = !result.cancelled && result.failedIds.length === 0;
      await saveFullStructure(studyId, rootElementId, all, expanded, complete).catch(() => undefined);
      setSyncInfo(await getSyncInfo(studyId).catch(() => null));
      setSyncFailed(result.failedIds);
      setSyncCancelled(result.cancelled);
      if (result.failedIds.length > 0) {
        showFetchAlert(locale, {
          title: tx(locale, `${result.failedIds.length} Knoten übersprungen`, `${result.failedIds.length} nodes skipped`),
          code: 'campus_failed',
          onRetry: syncAll,
        });
      }
    } finally {
      setSyncing(false);
    }
  }

  async function clearCache(): Promise<void> {
    if (!study || syncing) return;
    await clearCachedStudy(study.studyId).catch(() => undefined);
    setSyncInfo(await getSyncInfo(study.studyId).catch(() => null));
  }

  return (
    <Screen
      kicker="C@MPUS"
      title="C@MPUS"
      subtitle={
        study
          ? `${study.name}${study.intendedDegree ? ` · ${study.intendedDegree}` : ''}${study.versionIdentifier ? ` · ${study.versionIdentifier}` : ''}`
          : tx(locale, 'Live-Struktur aus C@MPUS, kein Demonstrationsstand.', 'Live structure from C@MPUS, not the demonstration record.')
      }>
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
    </Screen>
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
      <NodeCourses studyId={studyId} elementId={node.id} locale={locale} />
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

function NodeCourses({ studyId, elementId, locale }: { studyId: number; elementId: number; locale: 'de' | 'en' }) {
  const [open, setOpen] = useState(false);
  const [courses, setCourses] = useState<CampusCourse[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function toggle(): Promise<void> {
    if (busy) return;
    if (open) {
      setOpen(false);
      return;
    }
    if (courses) {
      setOpen(true);
      return;
    }
    setError('');
    setBusy(true);
    try {
      // Cache first: instant and offline. Otherwise network with write-through.
      const cached = await loadCachedCoursesByElement(studyId, elementId).catch(() => []);
      if (cached.length > 0) {
        cacheCampusCourses(cached);
        setCourses(cached);
        setOpen(true);
        return;
      }
      const loaded = await loadCampusCourses(elementId, studyId);
      setCourses(loaded.courses);
      setOpen(true);
      const stored = await loadCachedCourses(studyId).catch(() => []);
      const map = new Map(stored.map((course) => [course.id, course]));
      for (const course of loaded.courses) {
        if (!map.has(course.id)) {
          map.set(course.id, { ...course, elementIds: [elementId], elementNames: [] });
        } else {
          const known = map.get(course.id);
          if (known && !known.elementIds.includes(elementId)) known.elementIds.push(elementId);
        }
      }
      const fetched = await loadCoursesFetchedIds(studyId).catch(() => []);
      const complete = (await getCoursesSyncInfo(studyId).catch(() => null))?.complete ?? false;
      await saveCourses(studyId, [...map.values()], [...new Set([...fetched, elementId])], complete).catch(() => undefined);
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : 'campus_failed';
      const detail = campusDetail(caught);
      setError(
        tx(
          locale,
          `Kurse nicht geladen (${code}${detail ? `, ${detail}` : ''}).`,
          `Courses not loaded (${code}${detail ? `, ${detail}` : ''}).`,
        ),
      );
      showFetchAlert(locale, {
        title: tx(locale, 'Kurse nicht geladen', 'Courses not loaded'),
        code,
        detail: detail || undefined,
        onRetry: toggle,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ marginLeft: 8, marginBottom: 4 }}>
      <Pressable onPress={toggle} hitSlop={8}>
        <Text style={{ color: colors.blue, fontSize: 13, fontWeight: '700' }}>
          {busy
            ? '…'
            : courses
              ? `${courses.length} ${tx(locale, courses.length === 1 ? 'Kurs' : 'Kurse', courses.length === 1 ? 'course' : 'courses')}`
              : tx(locale, 'Kurse', 'Courses')}
        </Text>
      </Pressable>
      {error ? <Text style={{ color: colors.danger, fontSize: 13, lineHeight: 18 }}>{error}</Text> : null}
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
