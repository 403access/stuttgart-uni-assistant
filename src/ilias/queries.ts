/** Query options for one ILIAS repository page. */

import { queryOptions, type QueryClient } from '@tanstack/react-query';

import { keys } from '@/src/query/keys';

import { loadIliasContent } from './api';

export function iliasContentQuery(refId: number, kind: string, options?: { enabled?: boolean }) {
  return queryOptions({
    queryKey: keys.iliasContent(refId, kind),
    queryFn: () => loadIliasContent({ refId, kind }),
    staleTime: 60_000,
    ...(options?.enabled === false ? { enabled: false } : {}),
  });
}

/** Pull-to-refresh must bypass the server TTL and harvest the page again. */
export async function refreshIliasContent(queryClient: QueryClient, refId: number, kind: string) {
  return queryClient.fetchQuery({
    queryKey: keys.iliasContent(refId, kind),
    queryFn: () => loadIliasContent({ refId, kind, refresh: true }),
  });
}
