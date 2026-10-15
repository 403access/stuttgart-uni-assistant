import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { activeStudy, campusDetail, loadCampusCurriculum } from '@/src/auth/campus';
import { Button, Card, InfoRow, Muted, Pill, Screen, Section } from '@/src/components/ui';
import { StudySelector } from '@/src/components/study-selector';
import { useApp } from '@/src/state/AppState';
import { colors } from '@/src/theme';
import { tx } from '@/src/text';
import type { CampusStudy, CurriculumNode } from '@/src/types';

/** Live C@MPUS curriculum structure for the selected study (`POST /v1/campus/structure`). */
export default function CampusInfoScreen() {
  const { locale, sessionMode, campusStudies, activeStudyId, curriculumNodes, curriculumStudyId, setCurriculum } = useApp();
  const [busy, setBusy] = useState(false);
  const [busyNode, setBusyNode] = useState<number | null>(null);
  const [error, setError] = useState('');
  const autoLoaded = useRef<number | null>(null);
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
      setError(
        tx(
          locale,
          `Struktur nicht geladen (${code}${detail ? `, ${detail}` : ''}).`,
          `Structure not loaded (${code}${detail ? `, ${detail}` : ''}).`,
        ),
      );
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
    loadRoot(study, true).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [study?.studyId, stale]);

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
          {error ? <Text style={{ color: colors.danger, fontSize: 14, lineHeight: 20 }}>{error}</Text> : null}
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
  locale,
  busyNode,
  onNode,
}: {
  nodes: CurriculumNode[];
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
        <TreeNode key={node.id} node={node} children={children} depth={0} locale={locale} busyNode={busyNode} onNode={onNode} />
      ))}
    </>
  );
}

function TreeNode({
  node,
  children,
  depth,
  locale,
  busyNode,
  onNode,
}: {
  node: CurriculumNode;
  children: Map<number, CurriculumNode[]>;
  depth: number;
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
    <View style={{ marginLeft: depth > 0 ? 16 : 0 }}>
      <InfoRow
        title={node.name}
        meta={node.designation || node.elementType || String(node.id)}
        detail={[node.elementType, status].filter(Boolean).join(' · ') || undefined}
        onPress={() => onNode(node.id)}
      />
      {kids.map((kid) => (
        <TreeNode key={kid.id} node={kid} children={children} depth={depth + 1} locale={locale} busyNode={busyNode} onNode={onNode} />
      ))}
    </View>
  );
}
