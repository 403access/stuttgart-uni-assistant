/** Typed query-key factory. Nest keys under one app root so callers can invalidate one scope. */

/**
 * Scope roots:
 * - `app`     — everything in the app (rarely used directly)
 * - `campus`  — every C@MPUS read, device store and server snapshot
 * - `oidc`    — identity-provider status
 * - `catalog` — the assistant-server API list
 * - `news`    — operator-published app news
 * - `ilias`   — ILIAS content pages read through the assistant server
 *
 * `device*` keys answer from the on-device store; `server*` keys from the
 * assistant server. Both live under `campus` so a sync can invalidate the
 * whole scope with one call.
 */
export const keys = {
  all: () => ['app'] as const,
  campus: () => ['app', 'campus'] as const,
  catalog: () => ['app', 'catalog'] as const,
  news: () => ['app', 'news'] as const,
  iliasContent: (refId: number, kind: string) => ['app', 'ilias', 'content', kind, refId] as const,

  campusStatus: () => ['app', 'campus', 'status'] as const,
  campusStudies: () => ['app', 'campus', 'studies'] as const,
  serverTree: (studyId: number | null) => ['app', 'campus', 'server-tree', studyId] as const,
  serverCourses: (studyId: number | null) => ['app', 'campus', 'server-courses', studyId] as const,
  serverCalls: (limit: number) => ['app', 'campus', 'server-calls', limit] as const,

  deviceNodes: (studyId: number | null) => ['app', 'campus', 'device-nodes', studyId] as const,
  syncInfo: (studyId: number | null) => ['app', 'campus', 'sync-info', studyId] as const,
  deviceCourses: (studyId: number | null) => ['app', 'campus', 'device-courses', studyId] as const,
  deviceCoursesByElement: (studyId: number | null, elementId: number) => ['app', 'campus', 'device-courses', studyId, elementId] as const,
  coursesFetchedIds: (studyId: number | null) => ['app', 'campus', 'device-fetched-ids', studyId] as const,
  coursesSync: (studyId: number | null) => ['app', 'campus', 'courses-sync', studyId] as const,
  deviceCourse: (courseId: number) => ['app', 'campus', 'device-course', courseId] as const,

  apiLog: (limit: number) => ['app', 'campus', 'api-log', limit] as const,
  deviceTrees: (studyIds: number[]) => ['app', 'campus', 'device-trees', ...studyIds] as const,

  oidc: () => ['app', 'oidc'] as const,
  oidcStatus: () => ['app', 'oidc', 'status'] as const,
} as const;
