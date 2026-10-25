import { createStore } from '@tanstack/store';
import { useSelector } from '@tanstack/react-store';

export type QuizCatalogSource = 'bundled' | 'cache' | 'server';

/**
 * Bumped whenever the live catalog is replaced. The quiz screens subscribe so
 * the live `quizModules` / `quizTopics` bindings are read again after a server
 * fetch or an offline-cache hydration.
 */
export const quizCatalogStore = createStore<{
  version: number;
  source: QuizCatalogSource;
  updatedAt: string | null;
}>({
  version: 0,
  source: 'bundled',
  updatedAt: null,
});

export function markQuizCatalog(source: QuizCatalogSource): void {
  quizCatalogStore.setState((current) => ({
    version: current.version + 1,
    source,
    updatedAt: new Date().toISOString(),
  }));
}

export function useQuizCatalogVersion(): number {
  return useSelector(quizCatalogStore, (state) => state.version);
}
