import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { news as bundledNews } from '@/src/data';
import { mergeNews } from '@/src/news/parse';
import { publishedNewsQuery } from '@/src/query/queries';
import type { NewsItem } from '@/src/types';

/**
 * The feed the screens render. A successful server read is authoritative, even
 * when it is empty; the bundled demo items only stand in while the server is
 * unreachable (or has never been queried yet).
 */
export function useNewsItems() {
  const query = useQuery(publishedNewsQuery());
  const items = useMemo<NewsItem[]>(
    () => mergeNews(query.data === undefined ? bundledNews : query.data),
    [query.data],
  );
  return { items, query };
}

/** One item by id, e.g. for the detail screen. */
export function useNewsItem(id: string) {
  const { items, query } = useNewsItems();
  return { item: items.find((entry) => entry.id === id), isLoading: query.isLoading };
}
