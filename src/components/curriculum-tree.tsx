import type { ReactNode } from 'react';
import { View } from 'react-native';

import { StructureRow, TreeChildren } from '@/src/components/structure-row';
import { buildCurriculumIndex } from '@/src/domain/curriculum';
import { curriculumProgress } from '@/src/labels';
import { tx } from '@/src/text';
import type { CurriculumNode, Locale } from '@/src/types';

interface TreeNodeProps {
  node: CurriculumNode;
  childMap: Map<number, CurriculumNode[]>;
  depth: number;
  locale: Locale;
  expanded?: Record<number, boolean>;
  keepRootOpen: boolean;
  onToggle?: (id: number, open: boolean) => void;
  selectedId: number | null;
  onSelect?: (id: number) => void;
  busyNodeId: number | null;
  renderUnderRow?: (node: CurriculumNode) => ReactNode;
  registerRef?: (id: number, element: unknown) => void;
}

function TreeNode({
  node,
  childMap,
  depth,
  locale,
  expanded,
  keepRootOpen,
  onToggle,
  selectedId,
  onSelect,
  busyNodeId,
  renderUnderRow,
  registerRef,
}: TreeNodeProps) {
  const kids = childMap.get(node.id) ?? [];
  // Without `onToggle` the tree is a static outline: every level stays open.
  const open = !onToggle || (depth === 0 && keepRootOpen) || expanded?.[node.id] === true;
  const status = [curriculumProgress(node, locale), busyNodeId === node.id ? '…' : ''].filter(Boolean).join(' · ') || undefined;
  const toggle = onToggle && kids.length ? (open ? 'open' : 'closed') : undefined;
  return (
    <View ref={registerRef ? (element) => registerRef(node.id, element) : undefined}>
      <StructureRow
        name={node.name}
        designation={node.designation || undefined}
        elementType={node.elementType || undefined}
        status={status}
        meta={kids.length ? `${kids.length} ${tx(locale, 'curriculumTree.unterpunkte')}` : undefined}
        toggle={toggle}
        onPress={onSelect ? () => onSelect(node.id) : undefined}
        onToggle={toggle && onToggle ? () => onToggle(node.id, !open) : undefined}
        depth={depth}
        selected={selectedId === node.id}
      />
      {renderUnderRow ? renderUnderRow(node) : null}
      {open && kids.length > 0 ? (
        <TreeChildren>
          {kids.map((kid) => (
            <TreeNode
              key={kid.id}
              node={kid}
              childMap={childMap}
              depth={depth + 1}
              locale={locale}
              expanded={expanded}
              keepRootOpen={keepRootOpen}
              onToggle={onToggle}
              selectedId={selectedId}
              onSelect={onSelect}
              busyNodeId={busyNodeId}
              renderUnderRow={renderUnderRow}
              registerRef={registerRef}
            />
          ))}
        </TreeChildren>
      ) : null}
    </View>
  );
}

export interface CurriculumTreeProps {
  nodes: CurriculumNode[];
  locale: Locale;
  /** Controlled expansion map: a node is open when `expanded[id]` is true. */
  expanded?: Record<number, boolean>;
  /**
   * Arrow toggles call this with the next state. Without it the tree renders
   * every level open and shows no arrows — a static outline.
   */
  onToggle?: (id: number, open: boolean) => void;
  /** Depth-0 rows stay open regardless of `expanded` (the browser's reading order). */
  keepRootOpen?: boolean;
  /** Hide the root node and lift its children to the top level. */
  showRoot?: boolean;
  selectedId?: number | null;
  onSelect?: (id: number) => void;
  /** Id of the node whose children are loading; adds `…` to that row's status. */
  busyNodeId?: number | null;
  /** Extra content rendered under a row, e.g. its inline courses. */
  renderUnderRow?: (node: CurriculumNode) => ReactNode;
  /** Register each row's host view so a caller can scroll a node into sight. */
  registerRef?: (id: number, element: unknown) => void;
}

/**
 * Renders a flat curriculum node list as an indented tree. The parent → children
 * map is built once here; expanding, selecting and scrolling stay with the caller.
 */
export function CurriculumTree({
  nodes,
  locale,
  expanded,
  onToggle,
  keepRootOpen = false,
  showRoot = true,
  selectedId = null,
  onSelect,
  busyNodeId = null,
  renderUnderRow,
  registerRef,
}: CurriculumTreeProps) {
  const { children: childMap, roots } = buildCurriculumIndex(nodes);
  // Without the root (default) its direct children become the top level.
  const top = showRoot ? roots : roots.flatMap((node) => childMap.get(node.id) ?? []);
  return (
    <>
      {top.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          childMap={childMap}
          depth={0}
          locale={locale}
          expanded={expanded}
          keepRootOpen={keepRootOpen}
          onToggle={onToggle}
          selectedId={selectedId}
          onSelect={onSelect}
          busyNodeId={busyNodeId}
          renderUnderRow={renderUnderRow}
          registerRef={registerRef}
        />
      ))}
    </>
  );
}
