import { useQueries, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { deviceCoursesQuery, serverCoursesQuery } from '@/src/query/queries';
import type { BulkCourse, CampusStudy } from '@ua/core/domain/types';

const EMPTY_COURSES: BulkCourse[] = [];

/** A cached course tagged with the study it belongs to (list views span studies). */
export interface StudyCourse extends BulkCourse {
  studyId: number;
}

/** Stable key for a course inside one study (course ids are only study-unique). */
export function studyCourseKey(studyId: number, courseId: number): string {
  return `${studyId}-${courseId}`;
}

/**
 * Merge the device store with the server snapshot: stored rows win, the
 * snapshot only adds courses this device has not seen yet.
 */
export function mergeCourses(stored: readonly BulkCourse[], remote: readonly BulkCourse[]): BulkCourse[] {
  const byId = new Map(stored.map((course) => [course.id, course]));
  for (const course of remote) {
    if (!byId.has(course.id)) byId.set(course.id, course);
  }
  return [...byId.values()];
}

/** `combine` for the per-study device-store reads; module-level so it is stable. */
function courseLists(results: readonly { data?: BulkCourse[] }[]): BulkCourse[][] {
  return results.map((result) => result.data ?? EMPTY_COURSES);
}

/** `combine` for the per-study server snapshots; module-level so it is stable. */
function snapshotLists(results: readonly { data?: { courses: BulkCourse[] } | null }[]): BulkCourse[][] {
  return results.map((result) => result.data?.courses ?? EMPTY_COURSES);
}

/** All cached courses of one study: device store first, server snapshot second. */
export function useCoursesForStudy(
  studyId: number | null,
  options?: { enabled?: boolean },
): BulkCourse[] {
  const enabled = options?.enabled ?? true;
  const local = useQuery(deviceCoursesQuery(studyId, { enabled }));
  const snapshot = useQuery(serverCoursesQuery(studyId, { enabled }));
  return useMemo(
    () => mergeCourses(local.data ?? EMPTY_COURSES, snapshot.data?.courses ?? EMPTY_COURSES),
    [local.data, snapshot.data],
  );
}

/** The same merge across every enrolled study, tagging each row with its study. */
export function useCoursesForStudies(
  studies: CampusStudy[],
  options?: { enabled?: boolean },
): StudyCourse[] {
  const enabled = options?.enabled ?? true;
  const local = useQueries({
    queries: studies.map((study) => deviceCoursesQuery(study.studyId, { enabled })),
    combine: courseLists,
  });
  const snapshots = useQueries({
    queries: studies.map((study) => serverCoursesQuery(study.studyId, { enabled })),
    combine: snapshotLists,
  });

  return useMemo(() => {
    const byKey = new Map<string, StudyCourse>();
    studies.forEach((study, index) => {
      for (const course of local[index] ?? EMPTY_COURSES) {
        byKey.set(studyCourseKey(study.studyId, course.id), { ...course, studyId: study.studyId });
      }
      for (const course of snapshots[index] ?? EMPTY_COURSES) {
        const key = studyCourseKey(study.studyId, course.id);
        if (!byKey.has(key)) byKey.set(key, { ...course, studyId: study.studyId });
      }
    });
    return [...byKey.values()];
  }, [studies, local, snapshots]);
}
