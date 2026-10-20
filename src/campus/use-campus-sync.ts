import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';

import type { CampusSyncJob, ServerTree } from '@/src/auth/campus';
import { hydrateStudySnapshot, type HydrateStudyResult } from '@/src/campus/hydrate-study';
import { useLatestRef } from '@/src/hooks/use-latest-ref';
import { campusSyncMutation, type CampusSyncVars } from '@/src/query/mutations';

/** Per-call configuration: which study, from where, and whether to refresh courses. */
export interface CampusSyncRunOptions {
  studyId: number;
  /** Root element to walk; omitted continues where the server stored progress. */
  elementId?: number | null;
  /** Also refresh the course store from the server snapshot. Defaults to false. */
  includeCourses?: boolean;
}

export interface CampusSyncProgress {
  fetched: number;
  nodeCount: number;
  courseCount: number;
  retries: number;
}

export interface CampusSyncOutcome extends HydrateStudyResult {
  job: CampusSyncJob;
  vars: CampusSyncVars;
  /**
   * This run is the newest one the hook started. A run that settles after a
   * newer one began must still persist its data, but must not drive
   * screen-wide UI (alerts, notes, the visible curriculum).
   */
  isLatest: boolean;
}

export interface CampusSyncMeta {
  isLatest: boolean;
}

export interface UseCampusSyncOptions {
  /** Enrolled study ids, so the aggregate `deviceTrees` cache stays in sync. */
  studyIds?: number[];
  /** Called after a run wrote a non-empty tree into the device store. */
  onTree?: (studyId: number, tree: ServerTree, meta: CampusSyncMeta) => void;
  /** Called after every successful job, including stale ones. */
  onSuccess?: (outcome: CampusSyncOutcome) => void;
  /** Called when the job itself failed (polling, server, portal). */
  onError?: (error: unknown, vars: CampusSyncVars, meta: CampusSyncMeta) => void;
}

interface InternalVars extends CampusSyncVars {
  /** Monotonic run order; only the newest run may touch screen-wide UI. */
  seq: number;
  studyIds?: number[];
}

const EMPTY_PROGRESS: CampusSyncProgress = {
  fetched: 0,
  nodeCount: 0,
  courseCount: 0,
  retries: 0,
};

/**
 * One C@MPUS sync flow per component: starts the server job, tracks progress
 * and cancellation per study, hydrates the device store and the query caches,
 * and reports the result.
 *
 * The three sync screens (`kurse`, `strukturen`, `campus-info-view`) share
 * this; the differences they keep are only UI (alerts, notes, which curriculum
 * to show), which they implement in the callbacks.
 */
export function useCampusSync(options: UseCampusSyncOptions = {}) {
  const queryClient = useQueryClient();
  const optionsRef = useLatestRef(options);
  const [progress, setProgress] = useState<Record<number, CampusSyncProgress>>({});
  const [jobs, setJobs] = useState<Record<number, CampusSyncJob>>({});
  /** Synchronous per-study guard: two taps in the same tick must not start two jobs. */
  const runningRef = useRef<Record<number, boolean>>({});
  const cancelRef = useRef<Record<number, boolean>>({});
  const seqRef = useRef(0);

  const { mutate } = useMutation<CampusSyncJob, Error, InternalVars>({
    ...campusSyncMutation(),
    onMutate: (vars) => {
      cancelRef.current[vars.studyId] = false;
      setProgress((current) => ({ ...current, [vars.studyId]: EMPTY_PROGRESS }));
      setJobs((current) => {
        const next = { ...current };
        delete next[vars.studyId];
        return next;
      });
    },
    onSuccess: async (job, vars) => {
      const result = await hydrateStudySnapshot({
        studyId: vars.studyId,
        elementId: vars.elementId ?? null,
        includeCourses: vars.includeCourses,
        jobComplete: job.state === 'done' && job.failedIds.length === 0,
        queryClient,
        studyIds: vars.studyIds,
      });
      const isLatest = vars.seq === seqRef.current;
      // Per-study state is always valid, even for a stale run: it describes
      // that study's store, not the screen currently in front.
      setJobs((current) => ({ ...current, [vars.studyId]: job }));
      if (result.tree && result.tree.nodes.length > 0) {
        optionsRef.current.onTree?.(vars.studyId, result.tree, { isLatest });
      }
      optionsRef.current.onSuccess?.({ ...result, job, vars, isLatest });
    },
    onError: (error, vars) => {
      optionsRef.current.onError?.(error, vars, { isLatest: vars.seq === seqRef.current });
    },
    onSettled: (_result, _error, vars) => {
      delete runningRef.current[vars.studyId];
      setProgress((current) => {
        const next = { ...current };
        delete next[vars.studyId];
        return next;
      });
    },
  });

  /** Start a sync. Returns false when that study is already syncing. */
  const run = useCallback(
    (input: CampusSyncRunOptions): boolean => {
      const { studyId } = input;
      if (runningRef.current[studyId]) return false;
      runningRef.current[studyId] = true;
      mutate({
        studyId,
        elementId: input.elementId ?? undefined,
        includeCourses: input.includeCourses ?? false,
        seq: ++seqRef.current,
        studyIds: optionsRef.current.studyIds,
        onProgress: (job) =>
          setProgress((current) => ({
            ...current,
            [studyId]: {
              fetched: job.fetched,
              nodeCount: job.nodeCount,
              courseCount: job.courseCount,
              retries: job.retries,
            },
          })),
        isCancelled: () => cancelRef.current[studyId] === true,
      });
      return true;
    },
    [mutate, optionsRef],
  );

  /** Ask the server to stop after the current poll round; the hook settles normally. */
  const cancel = useCallback((studyId: number) => {
    if (!runningRef.current[studyId]) return;
    cancelRef.current[studyId] = true;
  }, []);

  return {
    run,
    cancel,
    /** True while any job is running (including its cache hydration). */
    running: Object.keys(progress).length > 0,
    isRunningFor: (studyId: number): boolean => Boolean(progress[studyId]),
    progressFor: (studyId: number): CampusSyncProgress | null => progress[studyId] ?? null,
    jobFor: (studyId: number): CampusSyncJob | null => jobs[studyId] ?? null,
    failedIdsFor: (studyId: number): number[] => jobs[studyId]?.failedIds ?? [],
    cancelledFor: (studyId: number): boolean => jobs[studyId]?.state === 'cancelled',
  };
}
