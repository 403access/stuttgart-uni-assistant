import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { cacheCampusCourses, loadCampusCourses } from '@/src/auth/campus';
import { appendElementCourses, loadCachedCoursesByElement } from '@/src/campus/db';
import { keys } from '@/src/query/keys';
import type { CampusCourse } from '@/src/types';

export interface UseNodeCoursesOptions {
  studyId: number;
  elementId: number;
  elementName: string;
  /** Start the cache read now, or only when the caller says so (tree rows). */
  enabled?: boolean;
  /** Fetch from the portal when the cache has no rows (tree rows). */
  fetchOnMiss?: boolean;
}

export interface NodeCourses {
  /** `null` until a read finishes; an empty array means "read, no rows". */
  courses: CampusCourse[] | null;
  busy: boolean;
  error: unknown;
  /** Re-run the cache read (e.g. after a failed fetch). */
  refetch: () => Promise<unknown>;
  /** Fetch this element from the portal and write it through to the cache. */
  fetchRemote: () => Promise<CampusCourse[]>;
}

/**
 * Courses of one curriculum element. The device cache answers first — a
 * cached element never calls the portal. Two callers use it differently:
 * the tree loads on expansion (`fetchOnMiss`), the node detail reads the
 * cache on mount and fetches only when the user taps the load button.
 */
export function useNodeCourses({
  studyId,
  elementId,
  elementName,
  enabled = true,
  fetchOnMiss = false,
}: UseNodeCoursesOptions): NodeCourses {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: keys.deviceCoursesByElement(studyId, elementId),
    queryFn: async (): Promise<CampusCourse[] | null> => {
      const cached = await loadCachedCoursesByElement(studyId, elementId).catch(() => []);
      if (cached.length > 0) {
        cacheCampusCourses(cached);
        return cached;
      }
      if (!fetchOnMiss) return null;
      const loaded = await loadCampusCourses(elementId, studyId);
      await appendElementCourses(studyId, elementId, elementName, loaded.courses).catch(() => undefined);
      return loaded.courses;
    },
    staleTime: Infinity,
    enabled,
  });

  const fetchRemote = useCallback(async (): Promise<CampusCourse[]> => {
    const loaded = await loadCampusCourses(elementId, studyId);
    await appendElementCourses(studyId, elementId, elementName, loaded.courses).catch(() => undefined);
    queryClient.setQueryData(keys.deviceCoursesByElement(studyId, elementId), loaded.courses);
    return loaded.courses;
  }, [elementId, elementName, queryClient, studyId]);

  return {
    courses: query.data ?? null,
    busy: query.isFetching,
    error: query.error,
    refetch: query.refetch,
    fetchRemote,
  };
}
