import { useCallback, useMemo, useState } from 'react';

import { folderLabel } from '@/src/auth/mail';
import type { Locale, MailFolder, MailMessage } from '@/src/types';

import {
  buildFilterOptions,
  buildFolderOptions,
  buildSortOptions,
  describeMessages,
  filterAndSortMessages,
  resolveFilter,
  resolveSort,
} from './options';
import type { InboxFilter, InboxSort } from './types';

/**
 * Search, filter and sort over the loaded rows, plus the dropdown options they
 * support. Kept apart from fetching: a mailbox refresh changes the inputs, but
 * the chosen selection stays plain local UI state.
 */
export function useMailList({
  messages,
  folders,
  folder,
  locale,
}: {
  messages: MailMessage[];
  folders: MailFolder[];
  folder: string;
  locale: Locale;
}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<InboxFilter>({ kind: 'all' });
  const [sort, setSort] = useState<InboxSort>('newest');

  const offered = useMemo(() => describeMessages(messages), [messages]);
  const activeFilter = useMemo(() => resolveFilter(filter, offered), [filter, offered]);
  const activeSort = useMemo(() => resolveSort(sort, offered), [sort, offered]);

  /** Dropdown data: current value text plus the inferred options with their row counts. */
  const filterOptions = useMemo(() => buildFilterOptions(locale, activeFilter, offered), [locale, activeFilter, offered]);
  const sortOptions = useMemo(() => buildSortOptions(locale, activeSort, offered), [locale, activeSort, offered]);
  const sortValueText = sortOptions.find((option) => option.selected)?.label ?? '';

  const folderOptions = useMemo(() => buildFolderOptions(folders, folder, locale), [folders, folder, locale]);
  const folderValueText = folderOptions.find((option) => option.selected)?.label ?? folderLabel(folder, locale);

  const visibleMessages = useMemo(
    () => filterAndSortMessages(messages, query, activeFilter, activeSort, locale),
    [messages, query, activeFilter, activeSort, locale],
  );

  const applyFilterKey = useCallback((key: string) => {
    if (key === 'unread') setFilter({ kind: 'unread' });
    else if (key.startsWith('sender:')) setFilter({ kind: 'sender', sender: key.slice('sender:'.length) });
    else setFilter({ kind: 'all' });
  }, []);

  const applySortKey = useCallback((key: string) => {
    setSort(key === 'oldest' || key === 'sender' || key === 'unread-first' ? key : 'newest');
  }, []);

  return {
    query,
    setQuery,
    activeFilter,
    filterOptions,
    sortOptions,
    sortValueText,
    folderOptions,
    folderValueText,
    visibleMessages,
    applyFilterKey,
    applySortKey,
  };
}
