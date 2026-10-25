import type { QuizTopic } from '../../types.ts';

export interface GeneratedQuizTopic {
  moduleId: string;
  topic: QuizTopic;
}

/**
 * Topics written by `bun run quiz:from-pdf`. The CLI owns this file; edit a
 * generated topic in its own file, and rerun the command with --force to
 * replace it.
 */
export const generatedTopics: GeneratedQuizTopic[] = [];
