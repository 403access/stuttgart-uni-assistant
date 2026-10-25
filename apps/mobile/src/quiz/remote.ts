import AsyncStorage from '@react-native-async-storage/async-storage';

import { assistantUrl } from '@/src/assistant/remote';
import { authHeaders, getActiveAuthToken } from '@/src/auth/session';
import type { Localized } from '@ua/core/domain/types';

import type { QuizAnswer, QuizModule, QuizQuestionKind, QuizStudy } from '@ua/quiz-content/types';
import { installQuizCatalog } from '@ua/quiz-content';
import { markQuizCatalog } from './catalog-state';

const CATALOG_CACHE_KEY = 'university-assistant/quiz-catalog/v1';
const SYNC_QUEUE_KEY = 'university-assistant/quiz-sync/v1';
const MAX_QUEUED_ATTEMPTS = 500;
const MAX_QUEUED_SESSIONS = 100;

interface CachedCatalog {
  savedAt: string;
  version: string;
  studies: QuizStudy[];
  modules: QuizModule[];
}

export interface RemoteQuizCatalog {
  version: string;
  studies: QuizStudy[];
  modules: QuizModule[];
}

export interface QuizAttemptUpload {
  clientId: string;
  topicId: string;
  topicTitle: Localized;
  questionId: string;
  kind: QuizQuestionKind;
  prompt: Localized;
  answer: QuizAnswer;
  answerText: string;
  correct: boolean;
  answeredAt: string;
  roundId?: string;
}

export interface QuizSessionUpload {
  clientId: string;
  topicId: string;
  topicTitle: Localized;
  mode: string;
  correct: number;
  total: number;
  durationSeconds?: number;
  startedAt: string;
  finishedAt: string;
}

interface SyncQueue {
  attempts: QuizAttemptUpload[];
  sessions: QuizSessionUpload[];
}

function serverBase(): string | null {
  const base = String(assistantUrl ?? '').replace(/\/$/, '');
  return base && base !== 'off' ? base : null;
}

function isLocalized(value: unknown): value is Localized {
  return Boolean(value) && typeof value === 'object'
    && typeof (value as Localized).de === 'string'
    && typeof (value as Localized).en === 'string';
}

function isStudy(value: unknown): value is QuizStudy {
  if (!value || typeof value !== 'object') return false;
  const row = value as Partial<QuizStudy>;
  return typeof row.id === 'string' && isLocalized(row.title) && isLocalized(row.degree);
}

function isModule(value: unknown): value is QuizModule {
  if (!value || typeof value !== 'object') return false;
  const row = value as Partial<QuizModule>;
  return (
    typeof row.id === 'string' &&
    typeof row.studyId === 'string' &&
    typeof row.semester === 'number' &&
    isLocalized(row.title) &&
    isLocalized(row.subtitle) &&
    Array.isArray(row.topics) &&
    row.topics.every(
      (topic) =>
        topic &&
        typeof topic.id === 'string' &&
        isLocalized(topic.title) &&
        isLocalized(topic.summary) &&
        Array.isArray(topic.questions) &&
        topic.questions.every(
          (question) =>
            question &&
            typeof question.id === 'string' &&
            typeof question.kind === 'string' &&
            isLocalized(question.prompt),
        ),
    )
  );
}

/** Shape check for the cached and fetched catalog; bad data is ignored. */
function readCatalog(value: unknown): RemoteQuizCatalog | null {
  if (!value || typeof value !== 'object') return null;
  const payload = value as Partial<RemoteQuizCatalog>;
  if (!Array.isArray(payload.modules) || !payload.modules.every(isModule)) return null;
  if (!Array.isArray(payload.studies) || !payload.studies.every(isStudy)) return null;
  return {
    version: typeof payload.version === 'string' ? payload.version : '',
    studies: payload.studies,
    modules: payload.modules,
  };
}

async function readCatalogCache(): Promise<RemoteQuizCatalog | null> {
  try {
    const raw = await AsyncStorage.getItem(CATALOG_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as Partial<CachedCatalog>;
    return readCatalog(cached);
  } catch {
    return null;
  }
}

async function writeCatalogCache(catalog: RemoteQuizCatalog): Promise<void> {
  const payload: CachedCatalog = {
    savedAt: new Date().toISOString(),
    version: catalog.version,
    studies: catalog.studies,
    modules: catalog.modules,
  };
  await AsyncStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(payload)).catch(() => undefined);
}

async function fetchQuizCatalog(): Promise<RemoteQuizCatalog | null> {
  const base = serverBase();
  if (!base) return null;
  try {
    const response = await fetch(`${base}/v1/quiz/catalog`, {
      headers: authHeaders(),
    });
    if (!response.ok) return null;
    return readCatalog(await response.json());
  } catch {
    return null;
  }
}

let hydrating: Promise<'cache' | 'server' | 'bundled'> | null = null;

/**
 * Installs the offline cache immediately, then refreshes from the server.
 * The bundled content stays in place until either source is valid.
 */
export function hydrateQuizCatalog(): Promise<'cache' | 'server' | 'bundled'> {
  if (hydrating) return hydrating;
  hydrating = (async () => {
    let source: 'cache' | 'server' | 'bundled' = 'bundled';
    const cached = await readCatalogCache();
    if (cached) {
      installQuizCatalog(cached.studies, cached.modules);
      markQuizCatalog('cache');
      source = 'cache';
    }
    const remote = await fetchQuizCatalog();
    if (remote) {
      installQuizCatalog(remote.studies, remote.modules);
      await writeCatalogCache(remote);
      markQuizCatalog('server');
      source = 'server';
    }
    return source;
  })().finally(() => {
    hydrating = null;
  });
  return hydrating;
}

/* --------------------------------------------------------------- sync queue -- */

let queueLock: Promise<unknown> = Promise.resolve();
let flushing: Promise<void> | null = null;

async function readQueue(): Promise<SyncQueue> {
  try {
    const raw = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
    if (!raw) return { attempts: [], sessions: [] };
    const parsed = JSON.parse(raw) as Partial<SyncQueue>;
    return {
      attempts: Array.isArray(parsed.attempts) ? parsed.attempts : [],
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
    };
  } catch {
    return { attempts: [], sessions: [] };
  }
}

async function writeQueue(queue: SyncQueue): Promise<void> {
  const trimmed: SyncQueue = {
    attempts: queue.attempts.slice(-MAX_QUEUED_ATTEMPTS),
    sessions: queue.sessions.slice(-MAX_QUEUED_SESSIONS),
  };
  await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(trimmed)).catch(() => undefined);
}

function mutateQueue(mutator: (queue: SyncQueue) => void): Promise<void> {
  const run = queueLock.then(async () => {
    const queue = await readQueue();
    mutator(queue);
    await writeQueue(queue);
  });
  queueLock = run.catch(() => undefined);
  return run;
}

export function enqueueQuizAttempt(attempt: QuizAttemptUpload): Promise<void> {
  if (!getActiveAuthToken()) return Promise.resolve();
  return mutateQueue((queue) => {
    if (queue.attempts.some((entry) => entry.clientId === attempt.clientId)) return;
    queue.attempts.push(attempt);
  }).then(() => flushQuizSync());
}

export function enqueueQuizSession(session: QuizSessionUpload): Promise<void> {
  if (!getActiveAuthToken()) return Promise.resolve();
  return mutateQueue((queue) => {
    if (queue.sessions.some((entry) => entry.clientId === session.clientId)) return;
    queue.sessions.push(session);
  }).then(() => flushQuizSync());
}

/**
 * Sends queued answers and rounds in one batch. The server deduplicates by
 * `clientId`, so a timeout after a successful write is harmless.
 */
export function flushQuizSync(): Promise<void> {
  if (flushing) return flushing;
  flushing = (async () => {
    const base = serverBase();
    if (!base || !getActiveAuthToken()) return;
    await queueLock;
    const queue = await readQueue();
    if (!queue.attempts.length && !queue.sessions.length) return;

    const attempts = queue.attempts.slice(0, 100);
    const sessions = queue.sessions.slice(0, 20);
    try {
      const response = await fetch(`${base}/v1/quiz/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ attempts, sessions }),
      });
      if (!response.ok) return;
    } catch {
      return;
    }

    const sentAttempts = new Set(attempts.map((entry) => entry.clientId));
    const sentSessions = new Set(sessions.map((entry) => entry.clientId));
    await mutateQueue((pending) => {
      pending.attempts = pending.attempts.filter((entry) => !sentAttempts.has(entry.clientId));
      pending.sessions = pending.sessions.filter((entry) => !sentSessions.has(entry.clientId));
    });
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}

/**
 * Signing out drops queued answers: the queue is device-level, and the server
 * derives the account from the token. Keeping a previous user's free-text
 * answers around for the next sign-in would attribute them to the wrong account.
 */
export async function clearQuizSyncQueue(): Promise<void> {
  await queueLock;
  await AsyncStorage.removeItem(SYNC_QUEUE_KEY).catch(() => undefined);
}

/** Test/DI hook. */
export function quizSyncQueueKey(): string {
  return SYNC_QUEUE_KEY;
}
