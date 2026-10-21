import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { clearSessionLog, mergeCampusLogs, useCampusLog } from '@/src/auth/campus-log';
import type { DeviceTreesCache } from '@/src/campus/hydrate-study';
import { useCampusSync } from '@/src/campus/use-campus-sync';
import {
  clearApiLog,
  clearCachedCourses,
  clearCachedStudy,
} from '@/src/campus/db';
import { ApiEntryDetail } from '@/src/components/api-entry-detail';
import { ApiHistory } from '@/src/components/api-history';
import { CurriculumNodeDetail } from '@/src/components/curriculum-node-detail';
import { CurriculumToolbar } from '@/src/components/curriculum-toolbar';
import { CurriculumTree } from '@/src/components/curriculum-tree';
import { StudyCacheCard } from '@/src/components/study-cache-card';
import { showFetchAlert } from '@/src/components/fetch-alert';
import { Button, Card, InfoRow, Muted, Screen, Section } from '@/src/components/ui';
import {
  buildCurriculumIndex,
  curriculumSummary,
  curriculumTypes,
  filterCurriculum,
  type CurriculumSortKey,
  type CurriculumStatusFilter,
} from '@/src/domain/curriculum';
import { curriculumDetail } from '@/src/labels';
import { keys } from '@/src/query/keys';
import { apiLogQuery, deviceTreesQuery, serverCallsQuery } from '@/src/query/queries';
import { useAppSelector, appActions } from '@/src/state/AppState';
import { colors, themedStyles } from '@/src/theme';
import { tx } from '@/src/text';
import type { CurriculumNode } from '@/src/types';

const SEARCH_LIMIT = 200;

/**
 * Web-only browser over the cached curriculum trees of all enrolled studies.
 * Reads exclusively from the on-device cache — expanding, searching,
 * filtering, and sorting never fetch. Fetching happens only through the
 * per-study buttons below. The tree, toolbar, study cards, history list and
 * detail panels live in `src/components/` and are shared with the C@MPUS tab.
 */
export default function StrukturenScreen() {
  const locale = useAppSelector((state) => state.locale);
  const sessionMode = useAppSelector((state) => state.sessionMode);
  const campusStudies = useAppSelector((state) => state.campusStudies);
  const activeStudyId = useAppSelector((state) => state.activeStudyId);
  const { setCurriculum } = appActions;
  const isWeb = Platform.OS === 'web';
  const log = useCampusLog();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<CurriculumStatusFilter>('all');
  const [sort, setSort] = useState<CurriculumSortKey>('name');
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [fetchError, setFetchError] = useState('');
  const [syncNote, setSyncNote] = useState('');
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [showRoot, setShowRoot] = useState(false);
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

  // Structure sync through the shared hook: one job per study, progress and
  // cancel tracked per study, the store and query caches hydrated for us.
  const sync = useCampusSync({
    studyIds,
    onTree: (studyId, tree) => {
      // Syncing another study must not replace the curriculum the user is
      // looking at; the aggregate device-tree cache is already updated.
      if (studyId === activeStudyId) {
        setCurriculum(tree.nodes, { studyId, replace: true });
      }
    },
    onSuccess: ({ job, vars }) => {
      if (job.failedIds.length > 0) {
        const code = 'campus_failed';
        setFetchError(tx(locale, 'strukturen.knoten', [job.failedIds.length]));
        showFetchAlert(locale, {
          title: tx(locale, 'common.knoten_uebersprungen', [job.failedIds.length]),
          code,
          onRetry: () => sync.run({ studyId: vars.studyId, elementId: vars.elementId, includeCourses: false }),
        });
      } else if (job.state === 'done' && job.fetched === 0) {
        setSyncNote(tx(locale, 'strukturen.neuen'));
      }
    },
    onError: (caught, vars) => {
      const code = caught instanceof Error ? caught.message : 'sync_failed';
      setFetchError(tx(locale, 'strukturen.struktur_sync', [code]));
      showFetchAlert(locale, {
        title: tx(locale, 'common.struktur_sync'),
        code,
        onRetry: () => sync.run({ studyId: vars.studyId, elementId: vars.elementId, includeCourses: false }),
      });
    },
  });

  function fetchStudy(studyId: number, elementId: number | null): void {
    if (elementId == null) return;
    setFetchError('');
    setSyncNote('');
    sync.run({ studyId, elementId, includeCourses: false });
  }

  /** Write a change into the device-tree query cache (and per-key device queries). */
  function updateDeviceTrees(update: (current: DeviceTreesCache) => DeviceTreesCache): void {
    queryClient.setQueryData<DeviceTreesCache>(keys.deviceTrees(studyIds), (current) =>
      update(current ?? { trees: {}, infos: {} }),
    );
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

  function revealInTree(id: number, nodes: CurriculumNode[]): void {
    const { byId } = buildCurriculumIndex(nodes);
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

  // Session log first, then the stored rows and the server's call list; later
  // sources only add entries the earlier ones did not already carry.
  const history = useMemo(() => mergeCampusLogs(serverCalls, storedLog, log), [log, storedLog, serverCalls]);

  // The chosen study is intent; when studies load or change, fall back to the active
  // study (or the first) during render instead of syncing the state back through an effect.
  const studyKnown = selectedId !== null && campusStudies.some((study) => study.studyId === selectedId);
  const effectiveSelectedId = studyKnown ? selectedId : (activeStudyId ?? campusStudies[0]?.studyId ?? null);
  const effectiveSelectedNodeId = effectiveSelectedId === selectedId ? selectedNodeId : null;
  const selectedStudy = campusStudies.find((study) => study.studyId === effectiveSelectedId) ?? null;
  const selectedNodes = selectedStudy ? trees[selectedStudy.studyId] ?? [] : [];
  const selectedNode = selectedStudy && effectiveSelectedNodeId !== null ? selectedNodes.find((node) => node.id === effectiveSelectedNodeId) ?? null : null;

  function selectStudy(studyId: number): void {
    setSelectedId(studyId);
    setSelectedNodeId(null);
  }

  function selectNode(id: number): void {
    setSelectedNodeId(id);
    setSelectedUid(null);
  }

  function selectEntry(uid: string): void {
    setSelectedUid(uid);
    setSelectedNodeId(null);
  }

  async function clearStudy(studyId: number): Promise<void> {
    if (sync.isRunningFor(studyId)) return;
    await clearCachedStudy(studyId).catch(() => undefined);
    updateDeviceTrees((current) => ({ trees: { ...current.trees, [studyId]: [] }, infos: { ...current.infos, [studyId]: null } }));
    if (studyId === activeStudyId) setCurriculum([], { studyId, replace: true });
  }

  async function clearAll(): Promise<void> {
    if (sync.running) return;
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

  const nodes = selectedNodes;
  const studyMeta = curriculumSummary(nodes, selectedStudy);
  const types = curriculumTypes(nodes);
  const visible = filterCurriculum(nodes, { query, type: typeFilter, status: statusFilter, sort });

  if (!isWeb) {
    return (
      <Screen kicker="Web">
        <Card>
          <Muted>
            {tx(locale, 'strukturen.struktur')}
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
            {tx(locale, 'strukturen.melden')}
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
      subtitle={tx(locale, 'strukturen.alle_zwischengespeicherten')}
      scroll={!isWeb}>
      <Stack.Screen options={{ title: tx(locale, 'strukturen.strukturen') }} />
      <View style={[pageStyles.columns, isWeb && pageStyles.columnsWeb]}>
        <View style={[pageStyles.columnMain, isWeb && pageStyles.columnScroll]}>
          <Section title={tx(locale, 'common.studiengaenge')} />
          <Button secondary label={tx(locale, 'strukturen.alle')} onPress={clearAll} />
          {campusStudies.map((study) => (
            <StudyCacheCard
              key={study.studyId}
              study={study}
              info={infos[study.studyId] ?? null}
              count={trees[study.studyId]?.length ?? 0}
              busy={sync.progressFor(study.studyId) ?? undefined}
              active={study.studyId === effectiveSelectedId}
              locale={locale}
              onSelect={() => selectStudy(study.studyId)}
              onLoad={() => fetchStudy(study.studyId, study.elementId)}
              onCancel={() => sync.cancel(study.studyId)}
              onClear={() => clearStudy(study.studyId)}
            />
          ))}
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
                    {studyMeta.elementId ? ` · Element ${studyMeta.elementId}` : ''} · {studyMeta.topLevel} {tx(locale, 'common.bereiche')} · {studyMeta.total}{' '}
                    {tx(locale, 'common.knoten')}
                  </Text>
                </Text>
              )}
              <CurriculumToolbar
                locale={locale}
                query={query}
                onQueryChange={setQuery}
                typeFilter={typeFilter}
                onTypeChange={setTypeFilter}
                types={types}
                statusFilter={statusFilter}
                onStatusChange={setStatusFilter}
                sort={sort}
                onSortChange={setSort}
                showRoot={showRoot}
                onToggleRoot={() => setShowRoot((value) => !value)}
                onExpandAll={() => setExpanded(() => Object.fromEntries(nodes.map((node) => [node.id, true])))}
                onCollapseAll={() => setExpanded(() => ({}))}
              />
              <Button
                secondary
                label={tx(locale, 'strukturen.alle_kurse')}
                onPress={() => router.push('/kurse')}
              />
              {nodes.length === 0 ? (
                <Muted>
                  {tx(locale, 'strukturen.cache')}
                </Muted>
              ) : searching ? (
                <>
                  <Muted>
                    {visible.length > SEARCH_LIMIT
                      ? tx(locale, 'strukturen.treffern', [SEARCH_LIMIT, visible.length])
                      : tx(locale, 'strukturen.treffer', [visible.length])}
                  </Muted>
                  {shown.map((node) => (
                    <InfoRow
                      key={node.id}
                      title={node.name}
                      meta={node.designation || node.elementType || String(node.id)}
                      detail={curriculumDetail(node, locale)}
                      onPress={() => revealInTree(node.id, nodes)}
                    />
                  ))}
                </>
              ) : (
                <CurriculumTree
                  nodes={visible}
                  locale={locale}
                  expanded={expanded}
                  onToggle={(id, open) => setExpanded((current) => ({ ...current, [id]: open }))}
                  keepRootOpen
                  showRoot={showRoot}
                  selectedId={effectiveSelectedNodeId}
                  onSelect={selectNode}
                  registerRef={registerRowRef}
                />
              )}
            </>
          ) : null}
        </View>
        <View style={[pageStyles.columnSide, isWeb && pageStyles.columnScroll]}>
          <Section title={tx(locale, 'strukturen.api', [history.length])} />
          {history.length > 0 ? (
            <Button
              secondary
              label={tx(locale, 'strukturen.verlauf')}
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
              <CurriculumNodeDetail
                key={selectedNode.id}
                node={selectedNode}
                study={selectedStudy}
                nodes={selectedNodes}
                locale={locale}
                onSelect={selectNode}
                onClose={() => setSelectedNodeId(null)}
              />
            ) : (
              <ApiEntryDetail
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

const pageStyles = themedStyles((colors) => ({
  columns: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  columnsWeb: { flex: 1, flexWrap: 'nowrap', minHeight: 0 },
  columnMain: { flex: 2, minWidth: 280, gap: 14 },
  columnSide: { flex: 1, minWidth: 280, gap: 14 },
  columnDetail: { flex: 1, minWidth: 260, gap: 14 },
  columnScroll: { minHeight: 0, overflowX: 'hidden', overflowY: 'scroll' },
}));
