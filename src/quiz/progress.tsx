import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { uid } from '@/src/text';

import type { QuestionProgress, QuizSessionRecord } from './types';

export const QUIZ_PROGRESS_STORAGE_KEY = 'university-assistant/quiz/v1';
const MAX_SESSIONS = 60;

interface StoredProgress {
  attempts: Record<string, QuestionProgress>;
  sessions: QuizSessionRecord[];
}

interface QuizProgressValue extends StoredProgress {
  ready: boolean;
  recordAnswer: (questionId: string, correct: boolean) => void;
  recordSession: (session: Omit<QuizSessionRecord, 'id' | 'at'>) => void;
  resetProgress: () => void;
}

const empty: StoredProgress = { attempts: {}, sessions: [] };

const QuizProgressContext = createContext<QuizProgressValue | null>(null);

function parseStored(raw: string | null): StoredProgress {
  if (!raw) return empty;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredProgress>;
    return {
      attempts: parsed.attempts && typeof parsed.attempts === 'object' ? parsed.attempts : {},
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions.slice(0, MAX_SESSIONS) : [],
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

  const resetProgress = useCallback(() => {
    setState(empty);
    AsyncStorage.removeItem(QUIZ_PROGRESS_STORAGE_KEY).catch(() => undefined);
  }, []);

  const value = useMemo<QuizProgressValue>(
    () => ({ ...state, ready, recordAnswer, recordSession, resetProgress }),
    [state, ready, recordAnswer, recordSession, resetProgress],
  );

  return <QuizProgressContext.Provider value={value}>{children}</QuizProgressContext.Provider>;
}

export function useQuizProgress(): QuizProgressValue {
  const value = useContext(QuizProgressContext);
  if (!value) throw new Error('useQuizProgress must be used inside QuizProgressProvider');
  return value;
}
