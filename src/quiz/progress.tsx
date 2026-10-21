import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { uid } from '@/src/text';

import type { ActiveQuizSession, QuestionProgress, QuizMode, QuizSessionRecord } from './types';

export const QUIZ_PROGRESS_STORAGE_KEY = 'university-assistant/quiz/v1';
const MAX_SESSIONS = 60;

interface StoredProgress {
  attempts: Record<string, QuestionProgress>;
  sessions: QuizSessionRecord[];
  /** One interrupted round per topic, keyed by topic id. */
  activeSessions: Record<string, ActiveQuizSession>;
}

interface QuizProgressValue extends StoredProgress {
  ready: boolean;
  recordAnswer: (questionId: string, correct: boolean) => void;
  recordSession: (session: Omit<QuizSessionRecord, 'id' | 'at'>) => void;
  saveActiveSession: (session: ActiveQuizSession) => void;
  clearActiveSession: (topicId: string) => void;
  resetProgress: () => void;
}

const empty: StoredProgress = { attempts: {}, sessions: [], activeSessions: {} };

const QuizProgressContext = createContext<QuizProgressValue | null>(null);

function isQuizMode(value: unknown): value is QuizMode {
  return value === 'all' || value === 'quick' || value === 'review' || value === 'mixed';
}

function sanitizeActiveSessions(value: unknown): Record<string, ActiveQuizSession> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const sessions: Record<string, ActiveQuizSession> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (!raw || typeof raw !== 'object') continue;
    const session = raw as Partial<ActiveQuizSession>;
    if (session.topicId !== key || !isQuizMode(session.mode)) continue;
    if (!Array.isArray(session.questionIds) || !session.questionIds.every((id) => typeof id === 'string')) continue;
    if (typeof session.index !== 'number' || session.index < 0) continue;
    if (!Array.isArray(session.results)) continue;
    if (typeof session.startedAt !== 'string' || typeof session.updatedAt !== 'string') continue;
    sessions[key] = {
      topicId: key,
      mode: session.mode,
      questionIds: session.questionIds,
      index: session.index,
      value: session.value,
      checked: typeof session.checked === 'boolean' ? session.checked : null,
      results: session.results.flatMap((entry) => {
        if (!entry || typeof entry !== 'object') return [];
        if (typeof entry.questionId !== 'string' || typeof entry.correct !== 'boolean') return [];
        return [{ questionId: entry.questionId, correct: entry.correct }];
      }),
      startedAt: session.startedAt,
      updatedAt: session.updatedAt,
    };
  }
  return sessions;
}

function parseStored(raw: string | null): StoredProgress {
  if (!raw) return empty;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredProgress>;
    return {
      attempts: parsed.attempts && typeof parsed.attempts === 'object' ? parsed.attempts : {},
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions.slice(0, MAX_SESSIONS) : [],
      activeSessions: sanitizeActiveSessions(parsed.activeSessions),
    };
  } catch {
    return empty;
  }
}

/**
 * Quiz progress lives beside the main app state instead of inside it: the quiz
 * is optional, and an older persisted app state without quiz fields should keep
 * loading unchanged.
 */
export function QuizProgressProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoredProgress>(empty);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(QUIZ_PROGRESS_STORAGE_KEY)
      .then((raw) => {
        if (active) setState(parseStored(raw));
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(QUIZ_PROGRESS_STORAGE_KEY, JSON.stringify(state)).catch(() => undefined);
  }, [ready, state]);

  const recordAnswer = useCallback((questionId: string, correct: boolean) => {
    const at = new Date().toISOString();
    setState((current) => {
      const previous = current.attempts[questionId];
      return {
        ...current,
        attempts: {
          ...current.attempts,
          [questionId]: {
            attempts: (previous?.attempts ?? 0) + 1,
            correct: (previous?.correct ?? 0) + (correct ? 1 : 0),
            lastCorrect: correct,
            lastAt: at,
          },
        },
      };
    });
  }, []);

  const recordSession = useCallback((session: Omit<QuizSessionRecord, 'id' | 'at'>) => {
    setState((current) => ({
      ...current,
      sessions: [
        { ...session, id: uid('quiz'), at: new Date().toISOString() },
        ...current.sessions,
      ].slice(0, MAX_SESSIONS),
    }));
  }, []);

  const saveActiveSession = useCallback((session: ActiveQuizSession) => {
    setState((current) => ({
      ...current,
      activeSessions: { ...current.activeSessions, [session.topicId]: session },
    }));
  }, []);

  const clearActiveSession = useCallback((topicId: string) => {
    setState((current) => {
      if (!current.activeSessions[topicId]) return current;
      const next = { ...current.activeSessions };
      delete next[topicId];
      return { ...current, activeSessions: next };
    });
  }, []);

  const resetProgress = useCallback(() => {
    setState(empty);
    AsyncStorage.removeItem(QUIZ_PROGRESS_STORAGE_KEY).catch(() => undefined);
  }, []);

  const value = useMemo<QuizProgressValue>(
    () => ({
      ...state,
      ready,
      recordAnswer,
      recordSession,
      saveActiveSession,
      clearActiveSession,
      resetProgress,
    }),
    [state, ready, recordAnswer, recordSession, saveActiveSession, clearActiveSession, resetProgress],
  );

  return <QuizProgressContext.Provider value={value}>{children}</QuizProgressContext.Provider>;
}

export function useQuizProgress(): QuizProgressValue {
  const value = useContext(QuizProgressContext);
  if (!value) throw new Error('useQuizProgress must be used inside QuizProgressProvider');
  return value;
}
