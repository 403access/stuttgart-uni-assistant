import { loadCampusCurriculum } from '@/src/auth/campus';
import type { CurriculumNode } from '@/src/types';

export interface FullSyncProgress {
  /** Structure calls finished (including retries). */
  fetched: number;
  /** Node ids waiting or in flight. Exact total is unknown until the walk ends. */
  queued: number;
  /** Unique nodes collected so far. */
  nodeCount: number;
  /** Retry attempts issued so far. */
  retries: number;
  /** Element ids whose fetch failed and were skipped. */
  failedIds: number[];
}

export interface FullSyncResult {
  nodes: CurriculumNode[];
  /** Structure calls issued. */
  requests: number;
  failedIds: number[];
  cancelled: boolean;
  /** Element ids whose structure call succeeded in this run. */
  expandedIds: number[];
}

/**
 * Fetch the whole curriculum tree of one study: breadth-first walk over
 * `POST /v1/campus/structure`, starting at the root element. One call returns
 * a node and the level below it, so every unseen id is queued exactly once.
 * A failing element is retried up to three times (back of the queue, short
 * pause — transient `fetch failed` blips usually pass); only then does its
 * id land in `failedIds` while the walk continues with the others.
 *
 * A `resume` seed continues an interrupted walk instead of starting over:
 * `expanded` ids are treated as already fetched (their rows come from the
 * cache), `pending` ids are queued up front.
 */
export async function syncFullStructure(
  studyId: number,
  rootElementId: number,
  options: {
    concurrency?: number;
    onProgress?: (progress: FullSyncProgress) => void;
    isCancelled?: () => boolean;
    resume?: { expanded: number[]; pending: number[] };
  } = {},
): Promise<FullSyncResult> {
  const concurrency = Math.max(1, Math.min(5, options.concurrency ?? 3));
  const expandedSeed = options.resume?.expanded ?? [];
  const visited = new Set<number>([rootElementId, ...expandedSeed]);
  const queue: number[] = (options.resume?.pending ?? []).filter((id) => !visited.has(id));
  if (!expandedSeed.includes(rootElementId)) queue.unshift(rootElementId);
  const merged = new Map<number, CurriculumNode>();
  const expandedIds: number[] = [];
  const failedIds: number[] = [];
  const attempts = new Map<number, number>();
  let fetched = 0;
  let requests = 0;
  let retries = 0;

  const report = (): void => {
    options.onProgress?.({ fetched, queued: queue.length, nodeCount: merged.size, retries, failedIds: [...failedIds] });
  };

  const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

  async function worker(): Promise<void> {
    while (queue.length > 0) {
      if (options.isCancelled?.()) return;
      const elementId = queue.shift();
      if (elementId === undefined) return;
      requests += 1;
      try {
        const loaded = await loadCampusCurriculum(elementId, studyId);
        expandedIds.push(elementId);
        for (const node of loaded.nodes) {
          merged.set(node.id, node);
          if (!visited.has(node.id)) {
            visited.add(node.id);
            queue.push(node.id);
          }
        }
      } catch {
        const tried = (attempts.get(elementId) ?? 0) + 1;
        attempts.set(elementId, tried);
        if (tried < 3 && !(options.isCancelled?.())) {
          // Transient portal/network blips (e.g. `fetch failed`) usually pass
          // on retry: back of the queue with a short pause, others first.
          retries += 1;
          queue.push(elementId);
          await sleep(750 * tried);
        } else {
          failedIds.push(elementId);
        }
      } finally {
        fetched += 1;
        report();
      }
    }
  }

  report();
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  const cancelled = options.isCancelled?.() ?? false;
  return { nodes: [...merged.values()], requests, failedIds, cancelled, expandedIds };
}
