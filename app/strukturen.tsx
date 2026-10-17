import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { clearSessionLog, useCampusLog, type CampusLogEntry } from '@/src/auth/campus-log';
import { cacheCampusCourses, loadCampusCourses, loadCampusCurriculum, loadCampusStudies, loadServerTree } from '@/src/auth/campus';
import {
  appendElementCourses,
  clearApiLog,
  clearCachedCourses,
  clearCachedStudy,
  getCoursesSyncInfo,
  getSyncInfo,
  loadCachedCoursesByElement,
  saveFullStructure,
  type CoursesSyncInfo,
  type CurriculumSyncInfo,
} from '@/src/campus/db';
import { Button, Card, InfoRow, Muted, Pill, Screen, Section } from '@/src/components/ui';
import { showFetchAlert } from '@/src/components/fetch-alert';
import { StructureRow, TreeChildren } from '@/src/components/structure-row';
import { JsonTree } from '@/src/components/json-tree';
import { campusSyncMutation } from '@/src/query/mutations';
import { keys } from '@/src/query/keys';
import { apiLogQuery, deviceTreesQuery, serverCallsQuery } from '@/src/query/queries';
import { useApp } from '@/src/state/AppState';
import { colors } from '@/src/theme';
import { tx } from '@/src/text';
import type { CampusCourse, CampusStudy, CurriculumNode } from '@/src/types';

type StatusFilter = 'all' | 'done' | 'progress' | 'open';
type SortKey = 'name' | 'designation' | 'id';

const SEARCH_LIMIT = 200;

/**
 * Web-only browser over the cached curriculum trees of all enrolled studies.
 * Reads exclusively from the on-device cache — expanding, searching,
 * filtering, and sorting never fetch. Fetching happens only through the
 * per-study buttons below.
 */
export default function StrukturenScreen() {
  const { locale, sessionMode, campusStudies, activeStudyId, setCurriculum } = useApp();
  const isWeb = Platform.OS === 'web';
  const log = useCampusLog();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<SortKey>('name');
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [fetching, setFetching] = useState<Record<number, { fetched: number; nodeCount: number; retries: number }>>({});
  const [fetchError, setFetchError] = useState('');
  const [syncNote, setSyncNote] = useState('');
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [showRoot, setShowRoot] = useState(false);
  const cancelFetch = useRef<Record<number, boolean>>({});
  const rowRefs = useRef(new Map<number, unknown>());
  const studyIds = useMemo(() => campusStudies.map((study) => study.studyId), [campusStudies]);
  // All device-store reads go through queries; writes set the query data directly.
  const deviceTreesQ = useQuery(deviceTreesQuery(studyIds, { enabled: isWeb && sessionMode === 'campus' }));
  const deviceLogQ = useQuery(apiLogQuery(500, { enabled: isWeb && sessionMode === 'campus' }));
  const portalCallsQ = useQuery(serverCallsQuery(300, { enabled: isWeb && sessionMode === 'campus' }));
  const trees = useMemo(() => deviceTreesQ.data?.trees ?? {}, [deviceTreesQ.data]);
  const infos = useMemo(() => deviceTreesQ.data?.infos ?? {}, [deviceTreesQ.data]);
  const storedLog = useMemo(() => deviceLogQ.data ?? [], [deviceLogQ.data]);
  const serverCalls = useMemo(() => portalCallsQ.data ?? [], [portalCallsQ.data]);

  // Structure sync through the shared mutation; the `fetching` map mirrors
  // per-study progress for the row buttons.
  const fetchMutation = useMutation({
    ...campusSyncMutation(),
    onMutate: (vars) => {
      cancelFetch.current[vars.studyId] = false;
      setFetchError('');
      setSyncNote('');
      setFetching((current) => ({ ...current, [vars.studyId]: { fetched: 0, nodeCount: 0, retries: 0 } }));
    },
    onSuccess: async (job, vars) => {
      // Hydrate the local sync cache and the browser from the server snapshot.
      const tree = await loadServerTree(vars.studyId).catch(() => null);
      if (tree && tree.nodes.length > 0) {
        queryClient.setQueryData(keys.deviceNodes(vars.studyId), tree.nodes);
        await saveFullStructure(vars.studyId, vars.elementId ?? null, tree.nodes, tree.expandedIds, tree.sync?.complete ?? false).catch(() => undefined);
        const info = await getSyncInfo(vars.studyId).catch(() => null);
        updateDeviceTrees((current) => ({ trees: { ...current.trees, [vars.studyId]: tree.nodes }, infos: { ...current.infos, [vars.studyId]: info } }));
        if (vars.studyId === activeStudyId) setCurriculum(tree.nodes, { studyId: vars.studyId, replace: true });
      }
      if (job.failedIds.length > 0) {
        const code = 'campus_failed';
        setFetchError(
          tx(
            locale,
            `${job.failedIds.length} Knoten übersprungen (3 Versuche je Knoten) — Weiter laden versucht nur den Rest.`,
            `${job.failedIds.length} nodes skipped (3 attempts each) — continue loads only the rest.`,
          ),
        );
        showFetchAlert(locale, {
          title: tx(locale, `${job.failedIds.length} Knoten übersprungen`, `${job.failedIds.length} nodes skipped`),
          code,
          onRetry: () => fetchMutation.mutate(vars),
        });
      } else if (job.state === 'done' && job.fetched === 0) {
        setSyncNote(
          tx(
            locale,
            'Keine neuen Abfragen — alles aus dem Server-Cache.',
            'No new calls — everything from the server cache.',
          ),
        );
      }
    },
    onError: (caught, vars) => {
      const code = caught instanceof Error ? caught.message : 'sync_failed';
      setFetchError(tx(locale, `Struktur-Sync nicht gestartet (${code}).`, `Structure sync did not start (${code}).`));
      showFetchAlert(locale, {
        title: tx(locale, 'Struktur-Sync fehlgeschlagen', 'Structure sync failed'),
        code,
        onRetry: () => fetchMutation.mutate(vars),
      });
    },
    onSettled: (_result, _error, vars) => {
      setFetching((current) => {
        const next = { ...current };
        delete next[vars.studyId];
        return next;
      });
    },
  });

  function fetchStudy(study: CampusStudy): void {
    if (study.elementId == null || fetching[study.studyId]) return;
    fetchMutation.mutate({
      studyId: study.studyId,
      elementId: study.elementId,
      includeCourses: false,
      onProgress: (update) =>
        setFetching((current) => ({ ...current, [study.studyId]: { fetched: update.fetched, nodeCount: update.nodeCount, retries: update.retries } })),
      isCancelled: () => cancelFetch.current[study.studyId] ?? false,
    });
  }

  /** Write a change into the device-tree query cache (and per-key device queries). */
  function updateDeviceTrees(update: (current: { trees: Record<number, CurriculumNode[]>; infos: Record<number, CurriculumSyncInfo | null> }) => { trees: Record<number, CurriculumNode[]>; infos: Record<number, CurriculumSyncInfo | null> }): void {
    const base = deviceTreesQ.data ?? { trees: {}, infos: {} };
    queryClient.setQueryData(keys.deviceTrees(studyIds), update(base));
  }

  // A fresh session-log entry means something new landed in either store.
  useEffect(() => {
    if (deviceLogQ.dataUpdatedAt === 0) return;
    deviceLogQ.refetch();
    portalCallsQ.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [log.length]);

  function registerRowRef(id: number, element: unknown): void {
    if (element) rowRefs.current.set(id, element);
    else rowRefs.current.delete(id);
  }

  function revealInTree(id: number): void {
    const byId = new Map(nodes.map((node) => [node.id, node]));
    const target = byId.get(id);
    if (!target) return;
    // Expand every ancestor so the node is visible, then jump to it.
    const ancestors: number[] = [];
    let current: CurriculumNode | undefined = target;
    while (current?.parentId !== null && current?.parentId !== undefined && byId.has(current.parentId)) {
      ancestors.push(current.parentId);
      current = byId.get(current.parentId);
    }
    if (target.parentId === null && !showRoot) setShowRoot(true);
    setExpanded((prev) => {
      const next = { ...prev };
      for (const ancestor of ancestors) next[ancestor] = true;
      return next;
    });
    setQuery('');
    selectNode(id);
    setTimeout(() => {
      const element = rowRefs.current.get(id) as unknown as { scrollIntoView?: (options?: { block?: string; behavior?: string }) => void } | null;
      element?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
    }, 80);
  }

  const history = useMemo(() => {
    const seen = new Set(log.map((entry) => entry.uid));
    const merged = [...log, ...storedLog.filter((entry) => !seen.has(entry.uid))];
    for (const entry of serverCalls) {
      if (!seen.has(entry.uid)) {
        seen.add(entry.uid);
        merged.push(entry);
      }
    }
    merged.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
    return merged;
  }, [log, storedLog, serverCalls]);

  const selectedStudy = campusStudies.find((study) => study.studyId === selectedId) ?? null;
  const selectedNode = selectedStudy && selectedNodeId !== null ? (trees[selectedStudy.studyId] ?? []).find((node) => node.id === selectedNodeId) ?? null : null;

  function selectNode(id: number): void {
    setSelectedNodeId(id);
    setSelectedUid(null);
  }

  function selectEntry(uid: string): void {
    setSelectedUid(uid);
    setSelectedNodeId(null);
  }

  useEffect(() => {
    if (!campusStudies.length) return;
    if (selectedId === null || !campusStudies.some((study) => study.studyId === selectedId)) {
      setSelectedId(activeStudyId ?? campusStudies[0].studyId);
      setSelectedNodeId(null);
    }
  }, [campusStudies, activeStudyId, selectedId]);

  async function clearStudy(studyId: number): Promise<void> {
    if (fetching[studyId]) return;
    await clearCachedStudy(studyId).catch(() => undefined);
    updateDeviceTrees((current) => ({ trees: { ...current.trees, [studyId]: [] }, infos: { ...current.infos, [studyId]: null } }));
    if (studyId === activeStudyId) setCurriculum([], { studyId, replace: true });
  }

  async function clearAll(): Promise<void> {
    if (Object.keys(fetching).length > 0) return;
    for (const study of campusStudies) {
      await clearCachedStudy(study.studyId).catch(() => undefined);
      await clearCachedCourses(study.studyId).catch(() => undefined);
    }
    for (const studyId of studyIds) {
      queryClient.setQueryData(keys.deviceNodes(studyId), []);
      queryClient.invalidateQueries({ queryKey: keys.serverCourses(studyId) });
    }
    updateDeviceTrees(() => ({ trees: {}, infos: {} }));
    if (activeStudyId !== null) setCurriculum([], { studyId: activeStudyId, replace: true });
  }

  const nodes = useMemo(() => (selectedId !== null ? (trees[selectedId] ?? []) : []), [trees, selectedId]);
  const studyMeta = useMemo(() => {
    if (!selectedStudy || nodes.length === 0) return null;
    const byId = new Set(nodes.map((node) => node.id));
    const roots = nodes.filter((node) => node.parentId === null || !byId.has(node.parentId));
    const childCount = new Map<number, number>();
    for (const node of nodes) {
      if (node.parentId !== null) childCount.set(node.parentId, (childCount.get(node.parentId) ?? 0) + 1);
    }
    const topLevel = roots.length === 1 ? (childCount.get(roots[0].id) ?? 0) : roots.length;
    return { elementId: selectedStudy.elementId, topLevel, total: nodes.length };
  }, [nodes, selectedStudy]);
  const types = useMemo(() => [...new Set(nodes.map((node) => node.elementType).filter(Boolean))].sort(), [nodes]);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = nodes.filter((node) => {
      if (typeFilter !== 'all' && node.elementType !== typeFilter) return false;
      if (statusFilter === 'done' && !node.completed) return false;
      if (statusFilter === 'progress' && !node.inProgress) return false;
      if (statusFilter === 'open' && (node.completed || node.inProgress)) return false;
      if (needle && !`${node.name} ${node.designation}`.toLowerCase().includes(needle)) return false;
      return true;
    });
    const by = {
      name: (a: CurriculumNode, b: CurriculumNode) => a.name.localeCompare(b.name),
      designation: (a: CurriculumNode, b: CurriculumNode) => a.designation.localeCompare(b.designation),
      id: (a: CurriculumNode, b: CurriculumNode) => a.id - b.id,
    }[sort];
    return [...filtered].sort(by);
  }, [nodes, query, typeFilter, statusFilter, sort]);

  if (!isWeb) {
    return (
      <Screen kicker="Web">
        <Card>
          <Muted>
            {tx(
              locale,
              'Der Struktur-Browser ist nur im Web verfügbar. Öffne die App mit Expo im Browser.',
              'The structure browser is only available on web. Open the app with Expo in the browser.',
            )}
          </Muted>
        </Card>
      </Screen>
    );
  }

  if (sessionMode !== 'campus' || campusStudies.length === 0) {
    return (
      <Screen kicker="Web">
        <Card>
          <Muted>
            {tx(
              locale,
              'Melden Sie sich mit dem C@MPUS-Token an, um die zwischengespeicherten Strukturen zu durchsuchen.',
              'Sign in with the C@MPUS token to browse the cached structures.',
            )}
          </Muted>
        </Card>
      </Screen>
    );
  }

  const searching = query.trim().length > 0;
  const shown = searching ? visible.slice(0, SEARCH_LIMIT) : visible;

  return (
    <Screen
      kicker="Web"
      subtitle={tx(
        locale,
        'Alle zwischengespeicherten Studiengänge. Blättern lädt nichts nach — nur die Knöpfe holen Daten.',
        'All cached degree programs. Browsing never refetches — only the buttons fetch.',
      )}
      scroll={!isWeb}>
      <Stack.Screen options={{ title: tx(locale, 'Strukturen', 'Structures') }} />
      <View style={[pageStyles.columns, isWeb && pageStyles.columnsWeb]}>
        <View style={[pageStyles.columnMain, isWeb && pageStyles.columnScroll]}>
          <Section title={tx(locale, 'Studiengänge', 'Degree programs')} />
          {campusStudies.length > 0 ? (
            <Button
              secondary
              label={tx(locale, 'Alle Caches leeren', 'Clear all caches')}
              onPress={clearAll}
            />
          ) : null}
          {campusStudies.map((study) => {
            const info = infos[study.studyId];
            const count = trees[study.studyId]?.length ?? 0;
            const busy = fetching[study.studyId];
            const isActive = study.studyId === selectedId;
            return (
              <Card key={study.studyId}>
                <Pressable
                  onPress={() => {
                    setSelectedId(study.studyId);
                    setSelectedNodeId(null);
                  }}>
                  <Text style={{ color: colors.anthracite, fontSize: 17, fontWeight: '700' }}>
                    {isActive ? '● ' : ''}
                    {study.name}
                  </Text>
                  <Text style={{ color: colors.inkSoft, fontSize: 13 }}>
                    {[study.intendedDegree, info && info.nodeCount > 0 ? `${info.nodeCount} ${tx(locale, 'Knoten im Cache', 'cached nodes')}` : count > 0 ? `${count} ${tx(locale, 'Knoten im Cache', 'cached nodes')}` : tx(locale, 'kein Cache', 'no cache')].filter(Boolean).join(' · ')}
                  </Text>
                </Pressable>
                {busy ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                    <Text style={{ color: colors.blue, fontWeight: '700' }}>
                      {tx(
                        locale,
                        `${busy.fetched} Abfragen · ${busy.nodeCount} Knoten${busy.retries > 0 ? ` · ${busy.retries} Wiederholungen` : ''}`,
                        `${busy.fetched} calls · ${busy.nodeCount} nodes${busy.retries > 0 ? ` · ${busy.retries} retries` : ''}`,
                      )}
                    </Text>
                    <Button secondary label={tx(locale, 'Abbrechen', 'Cancel')} onPress={() => (cancelFetch.current[study.studyId] = true)} />
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    <Button
                      secondary={count > 0}
                      label={
                        count > 0
                          ? tx(locale, 'Weiter laden', 'Continue loading')
                          : tx(locale, 'Struktur laden', 'Load structure')
                      }
                      onPress={() => fetchStudy(study)}
                    />
                    {count > 0 ? (
                      <Button secondary label={tx(locale, 'Cache leeren', 'Clear cache')} onPress={() => clearStudy(study.studyId)} />
                    ) : null}
                  </View>
                )}
              </Card>
            );
          })}
          {fetchError ? <Text style={{ color: colors.danger, fontSize: 14, lineHeight: 20 }}>{fetchError}</Text> : null}
          {syncNote ? <Text style={{ color: colors.inkSoft, fontSize: 14, lineHeight: 20 }}>{syncNote}</Text> : null}
          {selectedStudy ? (
            <>
              {showRoot || !studyMeta ? (
                <Section title={selectedStudy.name} />
              ) : (
                <Text style={{ color: colors.anthracite, fontSize: 17, fontWeight: '700' }}>
                  {selectedStudy.name}
                  <Text style={{ color: colors.inkSoft, fontWeight: '400', fontSize: 13 }}>
                    {studyMeta.elementId ? ` · Element ${studyMeta.elementId}` : ''} · {studyMeta.topLevel} {tx(locale, 'Bereiche', 'sections')} · {studyMeta.total}{' '}
                    {tx(locale, 'Knoten', 'nodes')}
                  </Text>
                </Text>
              )}
              <StudyToolbar
                locale={locale}
                query={query}
                setQuery={setQuery}
                typeFilter={typeFilter}
                setTypeFilter={setTypeFilter}
                types={types}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                sort={sort}
                setSort={setSort}
                showRoot={showRoot}
                onToggleRoot={() => setShowRoot((value) => !value)}
                onExpandAll={() => setExpanded(() => Object.fromEntries(nodes.map((node) => [node.id, true])))}
                onCollapseAll={() => setExpanded(() => ({}))}
              />
              <Button
                secondary
                label={tx(locale, 'Alle Kurse dieses Studiengangs', 'All courses of this study')}
                onPress={() => router.push('/kurse')}
              />
              {nodes.length === 0 ? (
                <Muted>
                  {tx(
                    locale,
                    'Kein Cache für diesen Studiengang. Lade die Struktur über den Knopf oben.',
                    'No cache for this study. Load the structure with the button above.',
                  )}
                </Muted>
              ) : searching ? (
                <>
                  <Muted>
                    {visible.length > SEARCH_LIMIT
                      ? tx(locale, `${SEARCH_LIMIT} von ${visible.length} Treffern`, `${SEARCH_LIMIT} of ${visible.length} matches`)
                      : tx(locale, `${visible.length} Treffer`, `${visible.length} matches`)}
                  </Muted>
                  {shown.map((node) => (
                    <InfoRow
                      key={node.id}
                      title={node.name}
                      meta={node.designation || node.elementType || String(node.id)}
                      detail={statusLine(node, locale)}
                      onPress={() => revealInTree(node.id)}
                    />
                  ))}
                </>
              ) : (
                <StudyTree
                  nodes={visible}
                  locale={locale}
                  expanded={expanded}
                  setExpanded={setExpanded}
                  selectedId={selectedNodeId}
                  onSelect={selectNode}
                  showRoot={showRoot}
                  registerRef={registerRowRef}
                />
              )}
            </>
          ) : null}
        </View>
        <View style={[pageStyles.columnSide, isWeb && pageStyles.columnScroll]}>
          <Section title={tx(locale, `API-Verlauf (${history.length})`, `API history (${history.length})`)} />
          {history.length > 0 ? (
            <Button
              secondary
              label={tx(locale, 'Verlauf löschen', 'Clear history')}
              onPress={() => {
                clearSessionLog();
                queryClient.setQueryData(keys.apiLog(500), []);
                setSelectedUid(null);
                clearApiLog().catch(() => undefined);
              }}
            />
          ) : null}
          <ApiHistory entries={history} locale={locale} selectedUid={selectedUid} onSelect={selectEntry} />
        </View>
        {isWeb ? (
          <View style={[pageStyles.columnDetail, pageStyles.columnScroll]}>
            {selectedNode && selectedStudy ? (
              <NodeDetail
                key={selectedNode.id}
                node={selectedNode}
                study={selectedStudy}
                nodes={trees[selectedStudy.studyId] ?? []}
                locale={locale}
                onSelect={selectNode}
                onClose={() => setSelectedNodeId(null)}
              />
            ) : (
              <EntryDetail
                key={selectedUid ?? 'none'}
                entry={history.find((item) => item.uid === selectedUid) ?? null}
                locale={locale}
                onClose={() => setSelectedUid(null)}
              />
            )}
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

/** Zero-width spaces after URL-ish separators so long tokens wrap instead of overflowing. */
function breakable(value: string): string {
  return value.replace(/([/?&=_\-])/g, '$1\u200B');
}

function statusLine(node: CurriculumNode, locale: 'de' | 'en'): string | undefined {
  const parts = [
    node.elementType,
    node.completed ? tx(locale, 'abgeschlossen', 'completed') : '',
    node.inProgress ? tx(locale, 'in Arbeit', 'in progress') : '',
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : undefined;
}

const sortOrder: SortKey[] = ['name', 'designation', 'id'];

function sortLabel(sort: SortKey, locale: 'de' | 'en'): string {
  return sort === 'name' ? tx(locale, 'Name', 'Name') : sort === 'designation' ? tx(locale, 'Kennung', 'Code') : 'ID';
}

function statusLabel(status: StatusFilter, locale: 'de' | 'en'): string {
  return status === 'all'
    ? tx(locale, 'Alle', 'All')
    : status === 'open'
      ? tx(locale, 'Offen', 'Open')
      : status === 'progress'
        ? tx(locale, 'In Arbeit', 'In progress')
        : tx(locale, 'Abgeschlossen', 'Completed');
}

function StudyToolbar({
  locale,
  query,
  setQuery,
  typeFilter,
  setTypeFilter,
  types,
  statusFilter,
  setStatusFilter,
  sort,
  setSort,
  showRoot,
  onToggleRoot,
  onExpandAll,
  onCollapseAll,
}: {
  locale: 'de' | 'en';
  query: string;
  setQuery: (value: string) => void;
  typeFilter: string;
  setTypeFilter: (value: string) => void;
  types: string[];
  statusFilter: StatusFilter;
  setStatusFilter: (value: StatusFilter) => void;
  sort: SortKey;
  setSort: (value: SortKey) => void;
  showRoot: boolean;
  onToggleRoot: () => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeCount = (typeFilter !== 'all' ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0);
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={tx(locale, 'Suchen …', 'Search …')}
          placeholderTextColor={colors.mute}
          style={[inputStyle, styles.search]}
        />
        <Pressable onPress={() => setSort(sortOrder[(sortOrder.indexOf(sort) + 1) % sortOrder.length])}>
          <Pill label={`${sortLabel(sort, locale)} ▾`} active />
        </Pressable>
        <Pressable onPress={() => setFiltersOpen((open) => !open)}>
          <Pill label={activeCount > 0 ? `${tx(locale, 'Filter', 'Filter')} · ${activeCount}` : `${tx(locale, 'Filter', 'Filter')} ▾`} active={filtersOpen || activeCount > 0} />
        </Pressable>
        <Pressable onPress={onExpandAll}>
          <Pill label={tx(locale, '+ Alle', '+ All')} />
        </Pressable>
        <Pressable onPress={onCollapseAll}>
          <Pill label={tx(locale, '− Alle', '− All')} />
        </Pressable>
        <Pressable onPress={onToggleRoot}>
          <Pill label={tx(locale, 'Wurzel', 'Root')} active={showRoot} />
        </Pressable>
      </View>
      {filtersOpen ? (
        <View style={styles.filterPanel}>
          <Text style={styles.filterTitle}>{tx(locale, 'Typ', 'Type')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            <Pressable onPress={() => setTypeFilter('all')}>
              <Pill label={tx(locale, 'Alle', 'All')} active={typeFilter === 'all'} />
            </Pressable>
            {types.map((type) => (
              <Pressable key={type} onPress={() => setTypeFilter(typeFilter === type ? 'all' : type)}>
                <Pill label={type} active={typeFilter === type} />
              </Pressable>
            ))}
          </View>
          <Text style={styles.filterTitle}>{tx(locale, 'Stand', 'Status')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {(['all', 'open', 'progress', 'done'] as StatusFilter[]).map((item) => (
              <Pressable key={item} onPress={() => setStatusFilter(item)}>
                <Pill label={statusLabel(item, locale)} active={statusFilter === item} />
              </Pressable>
            ))}
          </View>
          {activeCount > 0 ? (
            <Pressable onPress={() => { setTypeFilter('all'); setStatusFilter('all'); }}>
              <Text style={styles.filterReset}>{tx(locale, 'Zurücksetzen', 'Reset')}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function StudyTree({
  nodes,
  locale,
  expanded,
  setExpanded,
  selectedId,
  onSelect,
  showRoot,
  registerRef,
}: {
  nodes: CurriculumNode[];
  locale: 'de' | 'en';
  expanded: Record<number, boolean>;
  setExpanded: (update: (current: Record<number, boolean>) => Record<number, boolean>) => void;
  selectedId: number | null;
  onSelect: (id: number) => void;
  showRoot: boolean;
  registerRef: (id: number, element: unknown) => void;
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
  // Without the root (default) its direct children become the top level.
  const top = showRoot ? roots : roots.flatMap((node) => children.get(node.id) ?? []);
  return (
    <>
      {top.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          children={children}
          depth={0}
          locale={locale}
          expanded={expanded}
          setExpanded={setExpanded}
          selectedId={selectedId}
          onSelect={onSelect}
          registerRef={registerRef}
        />
      ))}
    </>
  );
}

function TreeNode({
  node,
  children,
  depth,
  locale,
  expanded,
  setExpanded,
  selectedId,
  onSelect,
  registerRef,
}: {
  node: CurriculumNode;
  children: Map<number, CurriculumNode[]>;
  depth: number;
  locale: 'de' | 'en';
  expanded: Record<number, boolean>;
  setExpanded: (update: (current: Record<number, boolean>) => Record<number, boolean>) => void;
  selectedId: number | null;
  onSelect: (id: number) => void;
  registerRef: (id: number, element: unknown) => void;
}) {
  const kids = children.get(node.id) ?? [];
  const isOpen = depth === 0 || expanded[node.id] === true;
  const toggleNode = (): void => {
    if (kids.length) setExpanded((current) => ({ ...current, [node.id]: !isOpen }));
  };
  return (
    <View
      ref={(element) => {
        registerRef(node.id, element);
      }}>
      <StructureRow
        name={node.name}
        designation={node.designation || undefined}
        elementType={node.elementType || undefined}
        status={statusLine(node, locale) || undefined}
        meta={kids.length ? `${kids.length} ${tx(locale, 'Unterpunkte', 'children')}` : undefined}
        toggle={kids.length ? (isOpen ? 'open' : 'closed') : undefined}
        onPress={() => onSelect(node.id)}
        onToggle={toggleNode}
        depth={depth}
        selected={selectedId === node.id}
      />
      {isOpen && kids.length > 0 ? (
        <TreeChildren>
          {kids.map((kid) => (
            <TreeNode
              key={kid.id}
              node={kid}
              children={children}
              depth={depth + 1}
              locale={locale}
              expanded={expanded}
              setExpanded={setExpanded}
              selectedId={selectedId}
              onSelect={onSelect}
              registerRef={registerRef}
            />
          ))}
        </TreeChildren>
      ) : null}
    </View>
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

const pageStyles = StyleSheet.create({
  columns: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  columnsWeb: { flex: 1, flexWrap: 'nowrap', minHeight: 0 },
  columnMain: { flex: 2, minWidth: 280, gap: 14 },
  columnSide: { flex: 1, minWidth: 280, gap: 14 },
  columnDetail: { flex: 1, minWidth: 260, gap: 14 },
  columnScroll: { minHeight: 0, overflowX: 'hidden', overflowY: 'scroll' },
});

const styles = StyleSheet.create({
  search: { flex: 1, paddingVertical: 8 },
  filterPanel: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 10, gap: 8 },
  filterTitle: { color: colors.blue, fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  filterReset: { color: colors.blue, fontSize: 13, fontWeight: '700' },
});

type HistoryStatus = 'all' | 'ok' | 'failed';
type HistorySort = 'new' | 'old' | 'slow';

function ApiHistory({ entries, locale, selectedUid, onSelect }: { entries: CampusLogEntry[]; locale: 'de' | 'en'; selectedUid: string | null; onSelect: (uid: string) => void }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<HistoryStatus>('all');
  const [op, setOp] = useState('all');
  const [sort, setSort] = useState<HistorySort>('new');
  const ops = useMemo(() => [...new Set(entries.map((entry) => entry.op))], [entries]);
  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = entries.filter((entry) => {
      if (status === 'ok' && !entry.ok) return false;
      if (status === 'failed' && entry.ok) return false;
      if (op !== 'all' && entry.op !== op) return false;
      if (needle) {
        const haystack = `${entry.op} ${entry.code ?? ''} ${entry.detail ?? ''} ${entry.request ?? ''} ${entry.response ?? ''} ${entry.studyId ?? ''} ${entry.elementId ?? ''} ${entry.httpStatus ?? ''}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
    const sorted = [...filtered];
    const byTime = (a: CampusLogEntry, b: CampusLogEntry): number =>
      (b.createdAt ?? '').localeCompare(a.createdAt ?? '') || b.id - a.id;
    if (sort === 'new') sorted.sort(byTime);
    if (sort === 'old') sorted.sort((a, b) => -byTime(a, b));
    if (sort === 'slow') sorted.sort((a, b) => b.elapsedMs - a.elapsedMs);
    return sorted;
  }, [entries, query, status, op, sort]);

  if (entries.length === 0) {
    return (
      <Muted>{tx(locale, 'Noch keine Aufrufe in dieser Sitzung.', 'No calls in this session yet.')}</Muted>
    );
  }
  return (
    <View style={{ gap: 10 }}>
      <TextInput value={query} onChangeText={setQuery} placeholder={tx(locale, 'Suchen …', 'Search …')} placeholderTextColor={colors.mute} style={inputStyle} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {(['all', 'ok', 'failed'] as HistoryStatus[]).map((item) => (
          <Pressable key={item} onPress={() => setStatus(item)}>
            <Pill
              label={
                item === 'all' ? tx(locale, 'Alle', 'All') : item === 'ok' ? 'OK' : tx(locale, 'Fehler', 'Errors')
              }
              active={status === item}
            />
          </Pressable>
        ))}
        {ops.map((name) => (
          <Pressable key={name} onPress={() => setOp(name)}>
            <Pill label={name} active={op === name} />
          </Pressable>
        ))}
        {(op !== 'all' || status !== 'all') && (
          <Pressable onPress={() => { setOp('all'); setStatus('all'); }}>
            <Pill label={tx(locale, 'Zurücksetzen', 'Reset')} />
          </Pressable>
        )}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {(['new', 'old', 'slow'] as HistorySort[]).map((item) => (
          <Pressable key={item} onPress={() => setSort(item)}>
            <Pill
              label={
                item === 'new'
                  ? tx(locale, 'Neueste', 'Newest')
                  : item === 'old'
                    ? tx(locale, 'Älteste', 'Oldest')
                    : tx(locale, 'Langsamste', 'Slowest')
              }
              active={sort === item}
            />
          </Pressable>
        ))}
      </View>
      <Muted>
        {shown.length === entries.length
          ? tx(locale, `${entries.length} Aufrufe`, `${entries.length} calls`)
          : tx(locale, `${shown.length} von ${entries.length} Aufrufen`, `${shown.length} of ${entries.length} calls`)}
      </Muted>
      {shown.map((entry) => (
        <View key={entry.uid} style={entry.uid === selectedUid ? { borderWidth: 2, borderColor: colors.blue, borderRadius: 20 } : undefined}>
          <Card onPress={() => onSelect(entry.uid)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 10, height: 10, borderRadius: 99, backgroundColor: entry.ok ? colors.success : colors.danger }} />
              <Text style={{ color: colors.anthracite, fontWeight: '700' }}>{entry.op}</Text>
              <Text style={{ color: colors.inkSoft, fontSize: 13 }}>
                {entry.time} · {entry.elapsedMs}ms
              </Text>
            </View>
            <Text style={{ color: colors.inkSoft, fontSize: 13 }}>
              {[entry.studyId ? `s=${entry.studyId}` : '', entry.elementId ? `e=${entry.elementId}` : '', entry.httpStatus !== undefined ? `http=${entry.httpStatus}` : '']
                .filter(Boolean)
                .join(' · ') || '–'}
            </Text>
            {!entry.ok ? (
              <Text style={{ color: colors.danger, fontSize: 13, fontWeight: '700' }} numberOfLines={2}>
                {entry.code ?? '?'}
                {entry.detail ? <Text style={{ fontWeight: '400' }}>{` — ${breakable(entry.detail)}`}</Text> : null}
              </Text>
            ) : null}
          </Card>
        </View>
      ))}
    </View>
  );
}

function ResponseToggle({ locale, view, onChange }: { locale: 'de' | 'en'; view: ResponseView; onChange: (view: ResponseView) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <Pressable onPress={() => onChange('text')}>
        <Pill label={tx(locale, 'Text', 'Text')} active={view === 'text'} />
      </Pressable>
      <Pressable onPress={() => onChange('json')}>
        <Pill label="JSON" active={view === 'json'} />
      </Pressable>
      <Pressable onPress={() => onChange('pretty')}>
        <Pill label="Pretty" active={view === 'pretty'} />
      </Pressable>
    </View>
  );
}

function responseItems(responseJson?: string): { count: number; names: string[] } | null {
  if (!responseJson) return null;
  try {
    const parsed: unknown = JSON.parse(responseJson);
    const lists: unknown[] = Array.isArray(parsed)
      ? parsed
      : typeof parsed === 'object' && parsed !== null
        ? ['nodes', 'studies', 'courses'].flatMap((key) => {
            const list = (parsed as Record<string, unknown>)[key];
            return Array.isArray(list) ? list : [];
          })
        : [];
    if (!lists.length) return null;
    const names = lists.flatMap((item) => {
      if (!item || typeof item !== 'object') return [];
      const record = item as Record<string, unknown>;
      const name = typeof record.name === 'string' ? record.name : typeof record.title === 'string' ? record.title : '';
      return name ? [name] : [];
    });
    return { count: lists.length, names: names.slice(0, 10) };
  } catch {
    return null;
  }
}

type ResponseView = 'text' | 'json' | 'pretty';

function rawResponse(entry: CampusLogEntry): string {
  if (entry.responseJson) return entry.responseJson;
  return JSON.stringify({ code: entry.code ?? null, detail: entry.detail ?? null, httpStatus: entry.httpStatus ?? null });
}

function PrettyJson({ entry }: { entry: CampusLogEntry }) {
  if (!entry.responseJson) {
    return <JsonTree value={{ code: entry.code ?? null, detail: entry.detail ?? null, httpStatus: entry.httpStatus ?? null }} />;
  }
  try {
    return <JsonTree value={JSON.parse(entry.responseJson) as unknown} />;
  } catch {
    return (
      <Text style={{ color: colors.inkSoft, fontSize: 12, lineHeight: 17, fontFamily: 'Menlo' }}>
        {breakable(entry.responseJson)}
      </Text>
    );
  }
}

function ResponseRendered({ entry, locale }: { entry: CampusLogEntry; locale: 'de' | 'en' }) {
  const preview = responseItems(entry.responseJson);
  if (!preview) {
    return entry.response ? (
      <Text style={{ color: colors.anthracite, fontSize: 14, lineHeight: 20 }}>{entry.response}</Text>
    ) : null;
  }
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: colors.anthracite, fontSize: 16, fontWeight: '700' }}>
        {tx(locale, `${preview.count} Einträge`, `${preview.count} entries`)}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {preview.names.map((name, index) => (
          <Pill key={`${name}-${index}`} label={name} />
        ))}
      </View>
      {preview.count > preview.names.length ? (
        <Muted>{tx(locale, `+ ${preview.count - preview.names.length} weitere`, `+ ${preview.count - preview.names.length} more`)}</Muted>
      ) : null}
    </View>
  );
}

function EntryDetail({ entry, locale, onClose }: { entry: CampusLogEntry | null; locale: 'de' | 'en'; onClose: () => void }) {
  const [refetching, setRefetching] = useState(false);
  const [note, setNote] = useState('');
  const [responseView, setResponseView] = useState<ResponseView>('text');

  if (!entry) {
    return (
      <Muted>{tx(locale, 'Eintrag im Verlauf wählen.', 'Select an entry in the history.')}</Muted>
    );
  }

  const canRefetch = entry.op === 'structure' || entry.op === 'courses' || entry.op === 'studies';

  async function refetch(): Promise<void> {
    if (refetching) return;
    const current = entry;
    if (!current) return;
    setRefetching(true);
    setNote('');
    try {
      if (current.op === 'structure' && current.elementId !== undefined) {
        const loaded = await loadCampusCurriculum(current.elementId, current.studyId);
        setNote(tx(locale, `Erneut geladen: ${loaded.nodes.length} Knoten.`, `Reloaded: ${loaded.nodes.length} nodes.`));
      } else if (current.op === 'courses' && current.elementId !== undefined) {
        const loaded = await loadCampusCourses(current.elementId, current.studyId);
        setNote(tx(locale, `Erneut geladen: ${loaded.courses.length} Kurse.`, `Reloaded: ${loaded.courses.length} courses.`));
      } else if (current.op === 'studies') {
        const loaded = await loadCampusStudies();
        setNote(tx(locale, `Erneut geladen: ${loaded.studies.length} Studiengänge.`, `Reloaded: ${loaded.studies.length} studies.`));
      }
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : 'campus_failed';
      setNote(tx(locale, `Erneut fehlgeschlagen (${code}).`, `Retry failed (${code}).`));
    } finally {
      setRefetching(false);
    }
  }

  const rows: Array<[string, string]> = [
    [tx(locale, 'Status', 'Status'), entry.ok ? 'OK' : (entry.code ?? '?')],
    [tx(locale, 'Operation', 'Operation'), entry.op],
    [tx(locale, 'Zeit', 'Time'), entry.time],
    [tx(locale, 'Dauer', 'Duration'), `${entry.elapsedMs} ms`],
    [tx(locale, 'HTTP', 'HTTP'), entry.httpStatus !== undefined ? String(entry.httpStatus) : '–'],
    [tx(locale, 'Studie', 'Study'), entry.studyId !== undefined ? String(entry.studyId) : '–'],
    [tx(locale, 'Element', 'Element'), entry.elementId !== undefined ? String(entry.elementId) : '–'],
  ];

  return (
    <View style={{ gap: 10 }}>
      <Section title={tx(locale, 'Details', 'Details')} action={tx(locale, 'Schließen', 'Close')} onAction={onClose} />
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 12, height: 12, borderRadius: 99, backgroundColor: entry.ok ? colors.success : colors.danger }} />
          <Text style={{ color: colors.anthracite, fontSize: 17, fontWeight: '700' }}>{entry.op}</Text>
        </View>
        {rows.map(([label, value]) => (
          <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
            <Text style={{ color: colors.inkSoft, fontSize: 14 }}>{label}</Text>
            <Text style={{ color: colors.anthracite, fontSize: 14, fontWeight: '600', textAlign: 'right', flex: 1 }}>{value}</Text>
          </View>
        ))}
        {entry.detail ? (
          <Text style={{ color: colors.inkSoft, fontSize: 12, lineHeight: 17, fontFamily: 'Menlo' }}>{breakable(entry.detail)}</Text>
        ) : null}
        {entry.request ? (
          <>
            <Text style={{ color: colors.blue, fontSize: 12, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase' }}>
              {tx(locale, 'Anfrage', 'Request')}
            </Text>
            <Text style={{ color: colors.anthracite, fontSize: 14 }}>{entry.request}</Text>
          </>
        ) : null}
        {entry.response || entry.responseJson ? (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: colors.blue, fontSize: 12, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase' }}>
                {tx(locale, 'Antwort', 'Response')}
              </Text>
              <ResponseToggle locale={locale} view={responseView} onChange={setResponseView} />
            </View>
            {responseView === 'json' ? (
              <Text style={{ color: colors.inkSoft, fontSize: 12, lineHeight: 17, fontFamily: 'Menlo' }}>
                {breakable(rawResponse(entry))}
              </Text>
            ) : responseView === 'pretty' ? (
              <PrettyJson entry={entry} />
            ) : (
              <ResponseRendered entry={entry} locale={locale} />
            )}
          </>
        ) : null}
      </Card>
      {canRefetch ? (
        <Button label={refetching ? '…' : tx(locale, 'Erneut laden', 'Reload')} onPress={refetch} secondary />
      ) : null}
      {note ? <Text style={{ color: colors.inkSoft, fontSize: 14, lineHeight: 20 }}>{note}</Text> : null}
    </View>
  );
}

function NodeDetail({
  node,
  study,
  nodes,
  locale,
  onSelect,
  onClose,
}: {
  node: CurriculumNode;
  study: CampusStudy;
  nodes: CurriculumNode[];
  locale: 'de' | 'en';
  onSelect: (id: number) => void;
  onClose: () => void;
}) {
  const [courses, setCourses] = useState<CampusCourse[] | null>(null);
  const [coursesBusy, setCoursesBusy] = useState(false);
  const [coursesError, setCoursesError] = useState('');
  const [coursesSync, setCoursesSync] = useState<CoursesSyncInfo | null>(null);
  const parent = node.parentId !== null ? nodes.find((item) => item.id === node.parentId) ?? null : null;
  const kids = nodes.filter((item) => item.parentId === node.id);

  // Cache first: courses loaded via /kurse show up instantly, no refetch.
  useEffect(() => {
    let active = true;
    loadCachedCoursesByElement(study.studyId, node.id)
      .then((cached) => {
        if (active && cached.length > 0) {
          cacheCampusCourses(cached);
          setCourses(cached);
        }
      })
      .catch(() => undefined);
    getCoursesSyncInfo(study.studyId)
      .then((info) => {
        if (active) setCoursesSync(info);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [study.studyId, node.id]);

  async function loadNodeCourses(): Promise<void> {
    if (coursesBusy) return;
    setCoursesError('');
    setCoursesBusy(true);
    try {
      const loaded = await loadCampusCourses(node.id, study.studyId);
      setCourses(loaded.courses);
      await appendElementCourses(study.studyId, node.id, node.name, loaded.courses).catch(() => undefined);
      setCoursesSync(await getCoursesSyncInfo(study.studyId).catch(() => null));
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : 'campus_failed';
      setCoursesError(tx(locale, `Kurse nicht geladen (${code}).`, `Courses not loaded (${code}).`));
    } finally {
      setCoursesBusy(false);
    }
  }

  const rows: Array<[string, string]> = [
    [tx(locale, 'Kennung', 'Code'), node.designation || '–'],
    [
      tx(locale, 'Stand', 'Status'),
      node.completed ? tx(locale, 'abgeschlossen', 'completed') : node.inProgress ? tx(locale, 'in Arbeit', 'in progress') : tx(locale, 'offen', 'open'),
    ],
    [tx(locale, 'Studiengang', 'Study'), study.name],
    [tx(locale, 'Element-ID', 'Element ID'), String(node.id)],
    [tx(locale, 'Überpunkt', 'Parent'), parent ? parent.name : tx(locale, 'Wurzel', 'Root')],
    [tx(locale, 'Unterpunkte', 'Children'), kids.length ? String(kids.length) : '–'],
  ];

  return (
    <View style={{ gap: 10 }}>
      <Section title={node.elementType || tx(locale, 'Knoten', 'Node')} action={tx(locale, 'Schließen', 'Close')} onAction={onClose} />
      <Card>
        <Text style={{ color: colors.anthracite, fontSize: 17, fontWeight: '700' }}>{node.name}</Text>
        {rows.map(([label, value]) => (
          <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
            <Text style={{ color: colors.inkSoft, fontSize: 14 }}>{label}</Text>
            <Text style={{ color: colors.anthracite, fontSize: 14, fontWeight: '600', textAlign: 'right', flex: 1 }}>{value}</Text>
          </View>
        ))}
      </Card>
      {kids.length > 0 ? (
        <>
          <Section title={tx(locale, 'Unterpunkte', 'Children')} />
          {kids.map((kid) => (
            <Card key={kid.id} onPress={() => onSelect(kid.id)}>
              <Text style={{ color: colors.anthracite, fontWeight: '700' }}>{kid.name}</Text>
              <Text style={{ color: colors.inkSoft, fontSize: 13 }}>{[kid.designation, kid.elementType].filter(Boolean).join(' · ')}</Text>
            </Card>
          ))}
        </>
      ) : null}
      <Section title={tx(locale, 'Kurse', 'Courses')} />
      {courses === null && !coursesError ? (
        <>
          {coursesSync ? (
            <Text style={{ color: colors.inkSoft, fontSize: 13 }}>
              {tx(
                locale,
                `Kurs-Cache: ${coursesSync.courseCount} Kurse aus ${coursesSync.elementsFetched} Elementen — dieses Element fehlt noch.`,
                `Course cache: ${coursesSync.courseCount} courses from ${coursesSync.elementsFetched} elements — this element is still missing.`,
              )}
            </Text>
          ) : null}
          <Button
            secondary
            label={coursesBusy ? '…' : tx(locale, 'Kurse laden', 'Load courses')}
            onPress={loadNodeCourses}
          />
        </>
      ) : null}
      {coursesError ? <Text style={{ color: colors.danger, fontSize: 14, lineHeight: 20 }}>{coursesError}</Text> : null}
      {courses && courses.length === 0 ? (
        <Muted>{tx(locale, 'Keine Lehrveranstaltungen an diesem Knoten.', 'No courses on this node.')}</Muted>
      ) : null}
      {courses?.map((course) => (
        <InfoRow
          key={course.id}
          title={course.title}
          meta={[course.courseTypeShort || course.courseType, course.semester].filter(Boolean).join(' · ') || String(course.id)}
          detail={[course.lecturers.join(', '), course.registrationStatus].filter(Boolean).join(' · ')}
          onPress={() => router.push({ pathname: '/kurs/[id]', params: { id: String(course.id) } })}
        />
      ))}
    </View>
  );
}
