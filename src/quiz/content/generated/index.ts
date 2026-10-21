import type { QuizTopic } from '@/src/quiz/types';

export interface GeneratedQuizTopic {
  moduleId: string;
  topic: QuizTopic;
}

/**
 * Topics written by `npm run quiz:from-pdf`. The CLI owns this file: change a
 * generated topic in its own file, then rerun the command with --force.
 */
export const generatedTopics: GeneratedQuizTopic[] = [];
