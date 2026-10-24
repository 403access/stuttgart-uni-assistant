/** Query options for one ILIAS repository page and its members tab. */

import { queryOptions, type QueryClient } from '@tanstack/react-query';

import { keys } from '@/src/query/keys';

import { loadIliasContent, loadIliasMembers, loadIliasProfile } from './api';

export function iliasContentQuery(refId: number, kind: string, options?: { enabled?: boolean }) {
  return queryOptions({
    queryKey: keys.iliasContent(refId, kind),
    queryFn: () => loadIliasContent({ refId, kind }),
    staleTime: 60_000,
    ...(options?.enabled === false ? { enabled: false } : {}),
  });
}

export function iliasMembersQuery(
  refId: number,
  kind: string,
  membersUrl: string,
  options?: { enabled?: boolean },
) {
  return queryOptions({
    queryKey: keys.iliasMembers(refId, kind),
    queryFn: () => loadIliasMembers({ refId, kind, membersUrl }),
    staleTime: 60_000,
    ...(options?.enabled === false || !membersUrl ? { enabled: false } : {}),
  });
}

/** Pull-to-refresh must bypass the server TTL and harvest the page again. */
export async function refreshIliasContent(queryClient: QueryClient, refId: number, kind: string) {
  return queryClient.fetchQuery({
    queryKey: keys.iliasContent(refId, kind),
    queryFn: () => loadIliasContent({ refId, kind, refresh: true }),
  });
}

/** Refresh both tabs together; the members link comes from the content page. */
export async function refreshIliasPage(queryClient: QueryClient, refId: number, kind: string) {
  const content = await refreshIliasContent(queryClient, refId, kind);
  if (!content.membersUrl) return content;
  await queryClient.fetchQuery({
    queryKey: keys.iliasMembers(refId, kind),
    queryFn: () => loadIliasMembers({ refId, kind, membersUrl: content.membersUrl, refresh: true }),
  });
  return content;
}

export function iliasProfileQuery(userId: number | null, url: string, options?: { enabled?: boolean }) {
  return queryOptions({
    queryKey: keys.iliasProfile(userId),
    queryFn: () => loadIliasProfile({ userId, url }),
    staleTime: 60_000,
    ...(options?.enabled === false || (!userId && !url) ? { enabled: false } : {}),
  });
}

export async function refreshIliasProfile(queryClient: QueryClient, userId: number | null, url: string) {
  return queryClient.fetchQuery({
    queryKey: keys.iliasProfile(userId),
    queryFn: () => loadIliasProfile({ userId, url, refresh: true }),
  });
}
