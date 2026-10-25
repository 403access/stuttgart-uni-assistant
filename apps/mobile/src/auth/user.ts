/**
 * Pure helpers for the server user record. This module deliberately has no
 * React Native or network import: `AppState` uses it to sanitize persisted
 * state, and `scripts/auth-user.test.mjs` exercises it without a device.
 */

import type {
  AccountPlatformId,
  PlatformLink,
  PlatformLinkStatus,
  SessionMode,
  UserAccount,
} from '@/src/types';

const MODES: SessionMode[] = ['campus', 'oidc', 'demo', 'local'];
const PLATFORM_IDS: AccountPlatformId[] = ['campus', 'ilias', 'sdg', 'siam', 'mail'];
const STATUSES: PlatformLinkStatus[] = ['connected', 'linked'];

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function iso(value: unknown, fallback: string | null = null): string | null {
  return typeof value === 'string' && value ? value : fallback;
}

function asPlatform(value: unknown): PlatformLink | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Partial<PlatformLink>;
  if (typeof row.id !== 'string' || !PLATFORM_IDS.includes(row.id as AccountPlatformId)) return null;
  const status: PlatformLinkStatus = STATUSES.includes(row.status as PlatformLinkStatus)
    ? (row.status as PlatformLinkStatus)
    : 'linked';
  return {
    id: row.id as AccountPlatformId,
    account: text(row.account),
    status,
    source: typeof row.source === 'string' && row.source ? row.source : 'sso',
    linkedAt: iso(row.linkedAt, '') ?? '',
    lastSyncAt: iso(row.lastSyncAt),
  };
}

/** Strict-enough parse of the server's public user shape. Unknown fields are dropped. */
export function asUserAccount(value: unknown): UserAccount | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Partial<UserAccount>;
  if (typeof row.id !== 'string' || !row.id) return null;
  if (typeof row.account !== 'string' || !row.account.trim()) return null;
  const mode: SessionMode = MODES.includes(row.mode as SessionMode) ? (row.mode as SessionMode) : 'local';
  const platforms = Array.isArray(row.platforms)
    ? row.platforms.flatMap((item) => {
        const parsed = asPlatform(item);
        return parsed ? [parsed] : [];
      })
    : [];
  return {
    id: row.id,
    account: row.account.trim(),
    name: text(row.name),
    email: text(row.email),
    matriculation: text(row.matriculation),
    subject: text(row.subject),
    mode,
    createdAt: iso(row.createdAt, new Date(0).toISOString()) ?? new Date(0).toISOString(),
    updatedAt: iso(row.updatedAt, new Date(0).toISOString()) ?? new Date(0).toISOString(),
    lastLoginAt: iso(row.lastLoginAt),
    platforms,
  };
}

export function findPlatform(user: UserAccount | null, id: AccountPlatformId): PlatformLink | null {
  return user?.platforms.find((item) => item.id === id) ?? null;
}

/** Fallback user for a device that cannot reach the assistant server. Never a server identity. */
export function localUser(input: {
  account: string;
  name?: string | null;
  email?: string | null;
  subject?: string | null;
  mode: SessionMode;
  platforms?: PlatformLink[];
}): UserAccount {
  const now = new Date().toISOString();
  return {
    id: `local-${Date.now().toString(36)}`,
    account: input.account.trim(),
    name: input.name ?? null,
    email: input.email ?? null,
    matriculation: null,
    subject: input.subject ?? null,
    mode: input.mode,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
    platforms: input.platforms ?? [],
  };
}

/** Avatar text: initials of the name, otherwise the first two characters of the account. */
export function initialsFor(user: UserAccount | null): string {
  const name = user?.name?.trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    const letters = parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : parts[0].slice(0, 2);
    return letters.toUpperCase();
  }
  return (user?.account ?? '?').slice(0, 2).toUpperCase();
}

/** `st123456@stud.uni-stuttgart.de` and `st123456` name the same mailbox. */
export function sameAccount(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  const left = a.trim().toLowerCase();
  const right = b.trim().toLowerCase();
  return left === right || left === right.split('@')[0] || right === left.split('@')[0];
}
