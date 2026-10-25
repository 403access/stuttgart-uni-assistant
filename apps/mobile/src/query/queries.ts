/** Reusable query options for one C@MPUS read. Web + native share them. */

import { queryOptions } from '@tanstack/react-query';

import { loadServerCalls, loadServerCourses, loadServerTree } from '@/src/auth/campus';
import {
  findCachedCourse,
  getCoursesSyncInfo,
  getSyncInfo,
  loadCachedCourses,
  loadCachedCoursesByElement,
  loadCachedNodes,
  loadCoursesFetchedIds,
  readApiLog,
  type CurriculumSyncInfo,
} from '@/src/campus/db';
import type { CampusLogEntry } from '@/src/auth/campus-log';
import type { BulkCourse, CurriculumNode } from '@ua/core/domain/types';
import { keys } from '@ua/core/query/keys';
import { fetchPublishedNews } from '@/src/news/api';

interface QueryOpt {
  /** Pass false to keep the question without running it — e.g. no study selected. */
  enabled?: boolean;
}

function opt(options?: QueryOpt): { enabled: boolean } | Record<string, never> {
  return options?.enabled === false ? { enabled: false } : {};
}

/** Local structure nodes from the device cache. The store only changes through local writes. */
export function deviceNodesQuery(studyId: number | null, options?: QueryOpt) {
  return queryOptions({
    queryKey: keys.deviceNodes(studyId ?? null),
    queryFn: () => (studyId == null ? Promise.resolve<CurriculumNode[]>([]) : loadCachedNodes(studyId)),
    staleTime: Infinity,
    ...opt(options),
  });
}

/** Structure sync metadata from the device cache (node count, finished date, complete flag). */
export function syncInfoQuery(studyId: number | null, options?: QueryOpt) {
  return queryOptions({
    queryKey: keys.syncInfo(studyId ?? null),
    queryFn: () => (studyId == null ? Promise.resolve(null) : getSyncInfo(studyId).catch(() => null)),
    staleTime: Infinity,
    ...opt(options),
  });
}

/**
 * Trees and sync metadata for every enrolled study at once (structure browser).
 * One device-cache read per study, keyed by the study-id list so a new
 * enrollment refetches.
 */
export function deviceTreesQuery(studyIds: number[], options?: QueryOpt) {
  return queryOptions({
    queryKey: keys.deviceTrees(studyIds),
    queryFn: async () => {
      const trees: Record<number, CurriculumNode[]> = {};
      const infos: Record<number, CurriculumSyncInfo | null> = {};
      for (const studyId of studyIds) {
        trees[studyId] = await loadCachedNodes(studyId).catch(() => []);
        infos[studyId] = await getSyncInfo(studyId).catch(() => null);
      }
      return { trees, infos };
    },
    staleTime: Infinity,
    ...opt(options),
  });
}

/** All mapped courses of the study stored on the device. */
export function deviceCoursesQuery(studyId: number | null, options?: QueryOpt) {
  return queryOptions({
    queryKey: keys.deviceCourses(studyId ?? null),
    queryFn: () => (studyId == null ? Promise.resolve<BulkCourse[]>([]) : loadCachedCourses(studyId)),
    staleTime: Infinity,
    ...opt(options),
  });
}

/** Which element ids already have courses on the device (resume information). */
export function coursesFetchedIdsQuery(studyId: number | null, options?: QueryOpt) {
  return queryOptions({
    queryKey: keys.coursesFetchedIds(studyId ?? null),
    queryFn: () => (studyId == null ? Promise.resolve<number[]>([]) : loadCoursesFetchedIds(studyId)),
    staleTime: Infinity,
    ...opt(options),
  });
}

/** Course sync metadata from the device cache. */
export function coursesSyncQuery(studyId: number | null, options?: QueryOpt) {
  return queryOptions({
    queryKey: keys.coursesSync(studyId ?? null),
    queryFn: () => (studyId == null ? Promise.resolve(null) : getCoursesSyncInfo(studyId).catch(() => null)),
    staleTime: Infinity,
    ...opt(options),
  });
}

/** Courses of one structure element from the device cache (no network). */
export function deviceCoursesByElementQuery(studyId: number | null, elementId: number, options?: QueryOpt) {
  return queryOptions({
    queryKey: keys.deviceCoursesByElement(studyId ?? null, elementId),
    queryFn: () => (studyId == null ? Promise.resolve<BulkCourse[]>([]) : loadCachedCoursesByElement(studyId, elementId)),
    staleTime: Infinity,
    ...opt(options),
  });
}

/** One course from the persisted cache (no network; the session map already served the fast path). */
export function deviceCourseQuery(courseId: number, options?: QueryOpt) {
  return queryOptions({
    queryKey: keys.deviceCourse(courseId),
    queryFn: () => findCachedCourse(courseId),
    staleTime: Infinity,
    ...opt(options),
  });
}

/** Server-side tree snapshot (`GET /v1/campus/tree`) — the cross-device catch-up read. */
export function serverTreeQuery(studyId: number | null, options?: QueryOpt) {
  return queryOptions({
    queryKey: keys.serverTree(studyId ?? null),
    queryFn: () => (studyId == null ? Promise.resolve(null) : loadServerTree(studyId).catch(() => null)),
    staleTime: 30_000,
    ...opt(options),
  });
}

/** Server-side courses snapshot (`GET /v1/campus/courses/all`). */
export function serverCoursesQuery(studyId: number | null, options?: QueryOpt) {
  return queryOptions({
    queryKey: keys.serverCourses(studyId ?? null),
    queryFn: () => (studyId == null ? Promise.resolve(null) : loadServerCourses(studyId).catch(() => null)),
    staleTime: 30_000,
    ...opt(options),
  });
}

/** Portal-call history from the server (`GET /v1/campus/calls`). */
export function serverCallsQuery(limit: number, options?: QueryOpt) {
  return queryOptions({
    queryKey: keys.serverCalls(limit),
    queryFn: () => loadServerCalls(limit).catch(() => []),
    staleTime: 30_000,
    ...opt(options),
  });
}

/** Persisted API log from the device (`readApiLog`). */
export function apiLogQuery(limit: number, options?: QueryOpt) {
  return queryOptions({
    queryKey: keys.apiLog(limit),
    queryFn: () => readApiLog(limit).catch(() => [] as CampusLogEntry[]),
    staleTime: Infinity,
    ...opt(options),
  });
}

/** Operator-published news (`GET /v1/news`). Bundled items stay as fallback. */
export function publishedNewsQuery(options?: QueryOpt) {
  return queryOptions({
    queryKey: keys.news(),
    queryFn: fetchPublishedNews,
    staleTime: 60_000,
    ...opt(options),
  });
}
