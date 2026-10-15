import { loadCampusCourses } from '@/src/auth/campus';
import type { CampusCourse } from '@/src/types';

export interface BulkCourse extends CampusCourse {
  elementIds: number[];
  elementNames: string[];
}

export interface BulkProgress {
  /** Elements finished (including skipped failures). */
  fetched: number;
  /** Elements to visit in this run. */
  total: number;
  /** Unique courses collected so far. */
  courseCount: number;
  /** Element ids whose fetch failed and were skipped. */
  failedIds: number[];
}

export interface BulkResult {
  courses: BulkCourse[];
  /** Element ids successfully read in this run. */
  fetchedIds: number[];
  failedIds: number[];
  cancelled: boolean;
}

/**
 * Read the courses of many curriculum elements (`POST /v1/campus/courses`
 * per element) and merge them by course id. One element can list a course
 * that also appears under another element; the merged row keeps every
 * element it was seen on. Failing elements land in `failedIds` while the
 * run continues with the rest. Pass `skipIds` (already-read elements) to
 * continue an interrupted run instead of starting over.
 */
export async function fetchAllCourses(
  studyId: number,
  elements: Array<{ id: number; name: string }>,
  options: {
    concurrency?: number;
    skipIds?: number[];
    onProgress?: (progress: BulkProgress) => void;
    isCancelled?: () => boolean;
  } = {},
): Promise<BulkResult> {
  const concurrency = Math.max(1, Math.min(5, options.concurrency ?? 3));
  const skipped = new Set(options.skipIds ?? []);
  const queue = elements.map((element) => element.id).filter((id) => !skipped.has(id));
  const names = new Map(elements.map((element) => [element.id, element.name]));
  const merged = new Map<number, BulkCourse>();
  const fetchedIds: number[] = [];
  const failedIds: number[] = [];
  let fetched = 0;

  const report = (): void => {
    options.onProgress?.({ fetched, total: queue.length + fetched, courseCount: merged.size, failedIds: [...failedIds] });
  };

  async function worker(): Promise<void> {
    while (queue.length > 0) {
      if (options.isCancelled?.()) return;
      const elementId = queue.shift();
      if (elementId === undefined) return;
      try {
        const loaded = await loadCampusCourses(elementId, studyId);
        fetchedIds.push(elementId);
        for (const course of loaded.courses) {
          const known = merged.get(course.id);
          if (known) {
            if (!known.elementIds.includes(elementId)) {
              known.elementIds.push(elementId);
              known.elementNames.push(names.get(elementId) ?? String(elementId));
            }
          } else {
            merged.set(course.id, { ...course, elementIds: [elementId], elementNames: [names.get(elementId) ?? String(elementId)] });
          }
        }
      } catch {
        failedIds.push(elementId);
      } finally {
        fetched += 1;
        report();
      }
    }
  }

  report();
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  const cancelled = options.isCancelled?.() ?? false;
  return { courses: [...merged.values()], fetchedIds, failedIds, cancelled };
}
