import AsyncStorage from '@react-native-async-storage/async-storage';
import { createStore } from '@tanstack/store';
import { useSelector } from '@tanstack/react-store';
import { useEffect, type ReactNode } from 'react';

import { uid } from '@/src/text';
import type { Localized } from '@/src/types';

import { enqueueQuizAttempt, enqueueQuizSession } from './remote';
import type {
  ActiveQuizSession,
  QuestionProgress,
  QuizAnswer,
  QuizMode,
  QuizQuestionKind,
  QuizSessionRecord,
} from './types';

export const QUIZ_PROGRESS_STORAGE_KEY = 'university-assistant/quiz/v1';
const MAX_SESSIONS = 60;

interface StoredProgress {
  attempts: Record<string, QuestionProgress>;
  sessions: QuizSessionRecord[];
  /** One interrupted round per topic, keyed by topic id. */
  activeSessions: Record<string, ActiveQuizSession>;
}

interface QuizProgressState extends StoredProgress {
  ready: boolean;
}

interface AnswerDetails {
  topicId: string;
  topicTitle: Localized;
  kind: QuizQuestionKind;
  prompt: Localized;
  answer: QuizAnswer;
  answerText: string;
  roundId?: string;
}

interface SessionDetails extends Omit<QuizSessionRecord, 'id' | 'at'> {
  durationSeconds?: number;
  startedAt?: string;
  topicTitle?: Localized;
}

interface QuizProgressValue extends QuizProgressState {
  recordAnswer: (questionId: string, correct: boolean, details?: AnswerDetails) => void;
  recordSession: (session: SessionDetails) => void;
  saveActiveSession: (session: ActiveQuizSession) => void;
  clearActiveSession: (topicId: string) => void;
  resetProgress: () => void;
}

const empty: StoredProgress = { attempts: {}, sessions: [], activeSessions: {} };

/** Quiz progress lives beside the main app state instead of inside it: the quiz is optional. */
export const quizProgressStore = createStore<QuizProgressState>({ ...empty, ready: false });

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

/** Stable action handles; usable from components and plain modules alike. */
export const quizProgressActions = {
  recordAnswer(questionId: string, correct: boolean, details?: AnswerDetails) {
    const at = new Date().toISOString();
    quizProgressStore.setState((current) => {
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
    if (details) {
      void enqueueQuizAttempt({
        clientId: uid('quiz-a'),
        topicId: details.topicId,
        topicTitle: details.topicTitle,
        questionId,
        kind: details.kind,
        prompt: details.prompt,
        answer: details.answer,
        answerText: details.answerText,
        correct,
        answeredAt: at,
        roundId: details.roundId,
      });
    }
  },
  recordSession(session: SessionDetails) {
    const at = new Date().toISOString();
    const { durationSeconds, startedAt, topicTitle, ...record } = session;
    const entry = { ...record, id: uid('quiz'), at };
    quizProgressStore.setState((current) => ({
      ...current,
      sessions: [entry, ...current.sessions].slice(0, MAX_SESSIONS),
    }));
    if (topicTitle) {
      void enqueueQuizSession({
        clientId: entry.id,
        topicId: entry.topicId,
        topicTitle,
        mode: entry.mode,
        correct: entry.correct,
        total: entry.total,
        durationSeconds,
        startedAt: startedAt ?? entry.at,
        finishedAt: entry.at,
      });
    }
  },
  saveActiveSession(session: ActiveQuizSession) {
    quizProgressStore.setState((current) => ({
      ...current,
      activeSessions: { ...current.activeSessions, [session.topicId]: session },
    }));
  },
  clearActiveSession(topicId: string) {
    quizProgressStore.setState((current) => {
      if (!current.activeSessions[topicId]) return current;
      const next = { ...current.activeSessions };
      delete next[topicId];
      return { ...current, activeSessions: next };
    });
  },
  resetProgress() {
    quizProgressStore.setState((current) => ({ ...empty, ready: current.ready }));
    AsyncStorage.removeItem(QUIZ_PROGRESS_STORAGE_KEY).catch(() => undefined);
  },
} as const;

/** Hydrates and persists the quiz store. No context: consumers subscribe directly. */
export function QuizProgressProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(QUIZ_PROGRESS_STORAGE_KEY)
      .then((raw) => {
        if (!active) return;
        const stored = parseStored(raw);
        quizProgressStore.setState((current) => ({ ...current, ...stored, ready: true }));
      })
      .catch(() => {
        if (active) quizProgressStore.setState((current) => ({ ...current, ready: true }));
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const subscription = quizProgressStore.subscribe((state) => {
      if (!state.ready) return;
      const stored: StoredProgress = {
        attempts: state.attempts,
        sessions: state.sessions,
        activeSessions: state.activeSessions,
      };
      AsyncStorage.setItem(QUIZ_PROGRESS_STORAGE_KEY, JSON.stringify(stored)).catch(() => undefined);
    });
    return () => subscription.unsubscribe();
  }, []);

  return <>{children}</>;
}

export function useQuizProgress(): QuizProgressValue {
  const state = useSelector(quizProgressStore);
  return { ...state, ...quizProgressActions };
}
