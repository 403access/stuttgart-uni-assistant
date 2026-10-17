/** Typed query-key factory. Nest keys under one app root so callers can invalidate one scope. */

/**
 * Scope roots:
 * - `all`     — everything in the app (rarely used directly)
 * - `campus`  — every C@MPUS read: status, studies, tree, courses, groups, portal log
 * - `oidc`    — identity-provider status
 * - `catalog` — the assistant-server API list
 */
export const keys = {
  all: () => ['app'] as const,
  campus: () => ['app', 'campus'] as const,
  campusStatus: () => ['app', 'campus', 'status'] as const,
  oidc: () => ['app', 'oidc'] as const,
  oidcStatus: () => ['app', 'oidc', 'status'] as const,
  catalog: () => ['app', 'catalog'] as const,
} as const;
