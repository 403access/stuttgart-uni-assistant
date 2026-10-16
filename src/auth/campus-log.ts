import { useSyncExternalStore } from 'react';

import { appendApiCall } from '@/src/campus/db';

export type CampusOp = 'login' | 'structure' | 'studies' | 'courses' | 'sync' | 'export';

export interface CampusLogEntry {
  id: number;
  /** Stable across restarts; used to merge the session log with the stored log. */
  uid: string;
  /** HH:MM:SS local time for on-screen display. */
  time: string;
  /** Full ISO timestamp for cross-source ordering. */
  createdAt: string;
  op: CampusOp;
  studyId?: number;
  elementId?: number;
  ok: boolean;
  httpStatus?: number;
  code?: string;
  detail?: string;
  elapsedMs: number;
  /** What was asked (ids, filters) — short human-readable summary. */
  request?: string;
  /** What came back (counts plus leading names/titles) — capped summary, not the raw body. */
  response?: string;
  /** Mapped response data as compact JSON (capped) for the JSON view. */
  responseJson?: string;
}

/** Stored shape of one call (SQLite on native, AsyncStorage on web). */
export interface PersistedApiCall {
  uid: string;
  time: string;
  op: CampusOp;
  studyId?: number;
  elementId?: number;
  ok: boolean;
  httpStatus?: number;
  code?: string;
  detail?: string;
  elapsedMs: number;
  request?: string;
  response?: string;
  responseJson?: string;
  createdAt?: string;
}

const MAX_ENTRIES = 30;

let seq = 0;
let snapshot: CampusLogEntry[] = [];
const listeners = new Set<() => void>();

function timeNow(): string {
  const now = new Date();
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

export function recordCampusCall(entry: Omit<CampusLogEntry, 'id' | 'uid' | 'time' | 'createdAt'>): CampusLogEntry {
  const full: CampusLogEntry = { ...entry, id: ++seq, uid: `${Date.now().toString(36)}-${seq}`, time: timeNow(), createdAt: new Date().toISOString() };
  snapshot = [full, ...snapshot].slice(0, MAX_ENTRIES);
  listeners.forEach((notify) => notify());
  // Persisted for the history page; never blocks or throws into the caller.
  appendApiCall(full).catch(() => undefined);
  // Metro/Expo console keeps the same line for `adb logcat` and devtools.
  console.info(
    `[campus-log] ${full.op} study=${full.studyId ?? '-'} element=${full.elementId ?? '-'} ` +
      `${full.ok ? `ok http=${full.httpStatus ?? '-'}` : `FAILED http=${full.httpStatus ?? '-'} ${full.code ?? ''}${full.detail ? ` (${full.detail})` : ''}`} ` +
      `${full.elapsedMs}ms`,
  );
  return full;
}

function subscribe(notify: () => void): () => void {
  listeners.add(notify);
  return () => {
    listeners.delete(notify);
  };
}

function getSnapshot(): CampusLogEntry[] {
  return snapshot;
}

/** Last campus calls, newest first. Re-renders the component on every new entry. */
export function useCampusLog(): CampusLogEntry[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function lastCampusLog(count = 3): CampusLogEntry[] {
  return snapshot.slice(0, count);
}

/** Empty the in-memory session log (the stored log is cleared separately). */
export function clearSessionLog(): void {
  snapshot = [];
  listeners.forEach((notify) => notify());
}
