import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@ua/api-client';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      retry: (count, error) => error instanceof ApiError && error.code === 'network' ? count < 1 : false,
    },
  },
});
