import type { QueryClient } from '@tanstack/react-query';

import {
  loadServerCourses,
  loadServerTree,
  type ServerCourses,
  type ServerTree,
} from '@/src/auth/campus';
import {
  getCoursesSyncInfo,
  getSyncInfo,
  loadCachedCourses,
  loadCoursesFetchedIds,
  saveCourses,
  saveFullStructure,
  type CoursesSyncInfo,
  type CurriculumSyncInfo,
} from '@/src/campus/db';
import { keys } from '@/src/query/keys';
import type { BulkCourse, CurriculumNode } from '@/src/types';

/** Value of the aggregate device-tree query (structure browser / onboarding). */
export interface DeviceTreesCache {
  trees: Record<number, CurriculumNode[]>;
  infos: Record<number, CurriculumSyncInfo | null>;
}

export interface HydrateStudyInput {
  studyId: number;
  /** Root element the job walked, for the stored sync metadata. */
  elementId: number | null;
  /** Also refresh the course store from the server snapshot. */
  includeCourses: boolean;
  /** The job finished and reported no skipped elements. */
  jobComplete: boolean;
  queryClient: QueryClient;
  /** Study ids of the aggregate device-tree cache, when one is open. */
  studyIds?: number[];
}

export interface HydrateStudyResult {
  tree: ServerTree | null;
  courses: BulkCourse[];
  fetchedIds: number[];
  coursesSync: CoursesSyncInfo | null;
  syncInfo: CurriculumSyncInfo | null;
  /** Set when the course store could not be written; the UI may surface it. */
  saveError: string | null;
}

function treesUpdater(
  studyId: number,
  nodes: CurriculumNode[],
  info: CurriculumSyncInfo | null,
) {
  return (current: DeviceTreesCache | undefined): DeviceTreesCache => ({
    trees: { ...(current?.trees ?? {}), [studyId]: nodes },
    infos: { ...(current?.infos ?? {}), [studyId]: info },
  });
}

/**
 * Write one finished C@MPUS sync job into the device store and the React Query
 * caches. This is the shared body of every sync screen: the job itself (portal
 * walk + polling) runs on the assistant server; here the server snapshot is
 * copied into SQLite/AsyncStorage and the query caches are updated in place so
 * no screen has to refetch what it just wrote.
 *
 * Reads are best-effort: a missing server snapshot keeps the stored rows and
 * reports the tree as `null` instead of failing the whole run.
 */
export async function hydrateStudySnapshot(input: HydrateStudyInput): Promise<HydrateStudyResult> {
  const { studyId, elementId, includeCourses, jobComplete, queryClient, studyIds } = input;

  const [tree, remote] = await Promise.all([
    loadServerTree(studyId).catch(() => null),
    includeCourses
      ? loadServerCourses(studyId).catch(() => null)
      : Promise.resolve<ServerCourses | null>(null),
  ]);

  // Structure: replace the stored tree, then mirror it into every cache the
  // screens read from. An empty snapshot never clears an existing cache.
  if (tree && tree.nodes.length > 0) {
    queryClient.setQueryData(keys.deviceNodes(studyId), tree.nodes);
    await saveFullStructure(
      studyId,
      elementId,
      tree.nodes,
      tree.expandedIds,
      tree.sync?.complete ?? false,
    ).catch(() => undefined);
  }

  const syncInfo = await getSyncInfo(studyId).catch(() => null);
  // A transient read failure must not pin `null` into a query that never goes
  // stale; invalidate instead so the next reader retries the store.
  if (syncInfo) queryClient.setQueryData(keys.syncInfo(studyId), syncInfo);
  else void queryClient.invalidateQueries({ queryKey: keys.syncInfo(studyId) });
  if (studyIds?.length && tree && tree.nodes.length > 0) {
    queryClient.setQueryData<DeviceTreesCache>(
      keys.deviceTrees(studyIds),
      treesUpdater(studyId, tree.nodes, syncInfo),
    );
  }

  let courses: BulkCourse[] = [];
  let fetchedIds: number[] = [];
  let coursesSync: CoursesSyncInfo | null = null;
  let saveError: string | null = null;

  if (includeCourses) {
    const [stored, storedFetched, previous] = await Promise.all([
      loadCachedCourses(studyId).catch(() => [] as BulkCourse[]),
      loadCoursesFetchedIds(studyId).catch(() => [] as number[]),
      getCoursesSyncInfo(studyId).catch(() => null),
    ]);

    const byId = new Map(stored.map((course) => [course.id, course]));
    for (const course of remote?.courses ?? []) {
      if (!byId.has(course.id)) byId.set(course.id, { ...course });
    }
    courses = [...byId.values()];
    fetchedIds = [...new Set([...storedFetched, ...(remote?.fetchedElementIds ?? [])])];

    // Conservative: a cache only counts as complete when the job itself was
    // clean and the server snapshot agrees. Marking it complete on a failed
    // snapshot read would make the next run skip the portal walk.
    const complete = jobComplete && (remote?.sync?.complete ?? false);
    const changed =
      courses.length !== stored.length ||
      fetchedIds.length !== storedFetched.length ||
      complete !== (previous?.complete ?? false);
    if (changed) {
      try {
        await saveCourses(studyId, courses, fetchedIds, complete);
      } catch (caught) {
        saveError = caught instanceof Error ? caught.message : 'cache_save_failed';
      }
    }

    coursesSync = await getCoursesSyncInfo(studyId).catch(() => null);
    queryClient.setQueryData(keys.deviceCourses(studyId), courses);
    queryClient.setQueryData(keys.coursesFetchedIds(studyId), fetchedIds);
    if (coursesSync) queryClient.setQueryData(keys.coursesSync(studyId), coursesSync);
    else void queryClient.invalidateQueries({ queryKey: keys.coursesSync(studyId) });
    void queryClient.invalidateQueries({ queryKey: keys.serverCourses(studyId) });
  }

  return { tree, courses, fetchedIds, coursesSync, syncInfo, saveError };
}
