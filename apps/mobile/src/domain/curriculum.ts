import type { CampusStudy, CurriculumNode } from '@/src/types';

/** Flat curriculum rows grouped into a parent → children map plus the roots. */
export interface CurriculumIndex {
  byId: Map<number, CurriculumNode>;
  children: Map<number, CurriculumNode[]>;
  roots: CurriculumNode[];
}

/**
 * Build the parent → children map once so a tree render and the ancestor walks
 * do not re-scan the flat node list for every row.
 */
export function buildCurriculumIndex(nodes: CurriculumNode[]): CurriculumIndex {
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
  return { byId, children, roots };
}

export interface CurriculumSummary {
  elementId: number | null;
  topLevel: number;
  total: number;
}

/** Header numbers for a study's tree: its element id, top-level sections and node total. */
export function curriculumSummary(nodes: CurriculumNode[], study: CampusStudy | null): CurriculumSummary | null {
  if (!study || nodes.length === 0) return null;
  const { children, roots } = buildCurriculumIndex(nodes);
  const topLevel = roots.length === 1 ? (children.get(roots[0].id)?.length ?? 0) : roots.length;
  return { elementId: study.elementId, topLevel, total: nodes.length };
}

/** Distinct element types present in a tree, for the type filter. */
export function curriculumTypes(nodes: CurriculumNode[]): string[] {
  return [...new Set(nodes.map((node) => node.elementType).filter(Boolean))].sort();
}

export type CurriculumStatusFilter = 'all' | 'done' | 'progress' | 'open';
export type CurriculumSortKey = 'name' | 'designation' | 'id';

/** The cycle order for the toolbar's sort pill. */
export const curriculumSortOrder: CurriculumSortKey[] = ['name', 'designation', 'id'];

export interface CurriculumFilter {
  query: string;
  type: string;
  status: CurriculumStatusFilter;
  sort: CurriculumSortKey;
}

/** The nodes narrowed by search and filters, then sorted by the chosen key. */
export function filterCurriculum(nodes: CurriculumNode[], filter: CurriculumFilter): CurriculumNode[] {
  const needle = filter.query.trim().toLowerCase();
  const filtered = nodes.filter((node) => {
    if (filter.type !== 'all' && node.elementType !== filter.type) return false;
    if (filter.status === 'done' && !node.completed) return false;
    if (filter.status === 'progress' && !node.inProgress) return false;
    if (filter.status === 'open' && (node.completed || node.inProgress)) return false;
    if (needle && !`${node.name} ${node.designation}`.toLowerCase().includes(needle)) return false;
    return true;
  });
  const by: Record<CurriculumSortKey, (a: CurriculumNode, b: CurriculumNode) => number> = {
    name: (a, b) => a.name.localeCompare(b.name),
    designation: (a, b) => a.designation.localeCompare(b.designation),
    id: (a, b) => a.id - b.id,
  };
  return [...filtered].sort(by[filter.sort]);
}
