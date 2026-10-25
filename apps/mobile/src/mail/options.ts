import { folderKind, folderLabel, type FolderKind } from '@/src/auth/mail';
import { tx } from '@/src/text';
import type { Locale, MailFolder, MailMessage } from '@/src/types';

import { messageTime, senderName } from './format';
import type { DropdownOption, InboxFilter, InboxSort } from './types';

/** Well-known mailboxes first in a stable order, then the user's own folders (`other` last). */
const SYSTEM_FOLDER_ORDER: FolderKind[] = ['inbox', 'sent', 'drafts', 'archive', 'junk', 'trash', 'other'];

function folderSection(kind: FolderKind): 'mailbox' | 'folder' {
  return kind === 'other' ? 'folder' : 'mailbox';
}

function folderSectionLabel(section: 'mailbox' | 'folder', locale: Locale): string {
  return section === 'folder' ? tx(locale, 'tabsMail.eigene') : tx(locale, 'tabsMail.postfaecher');
}

/** What the current rows support, so the controls only offer choices that can match. */
export interface OfferedMessages {
  senders: string[];
  senderCounts: Record<string, number>;
  multipleSenders: boolean;
  unread: number;
  anyDates: boolean;
  multipleDays: boolean;
}

export function describeMessages(messages: MailMessage[]): OfferedMessages {
  const senders = new Set<string>();
  const senderCounts = new Map<string, number>();
  const days = new Set<string>();
  let unread = 0;
  for (const message of messages) {
    const sender = senderName(message.from);
    if (sender) {
      senders.add(sender);
      senderCounts.set(sender, (senderCounts.get(sender) ?? 0) + 1);
    }
    if (!message.seen) unread += 1;
    if (message.date) days.add(message.date.slice(0, 10));
  }
  return {
    senders: [...senders].sort((a, b) => a.localeCompare(b)),
    senderCounts: Object.fromEntries(senderCounts) as Record<string, number>,
    multipleSenders: senders.size >= 2,
    unread,
    anyDates: days.size >= 1,
    multipleDays: days.size >= 2,
  };
}

/**
 * The stored selection is only intent; the effective value is derived in render, so a
 * refresh that removes the variety (unread cleared, one sender left) silently falls
 * back to newest — without a following setState-in-effect round.
 */
export function resolveFilter(filter: InboxFilter, offered: OfferedMessages): InboxFilter {
  return filter.kind === 'sender' && !offered.senders.includes(filter.sender) ? { kind: 'all' } : filter;
}

export function resolveSort(sort: InboxSort, offered: OfferedMessages): InboxSort {
  return (sort === 'sender' && !offered.multipleSenders) || (sort === 'unread-first' && offered.unread === 0) || (sort === 'oldest' && !offered.anyDates)
    ? 'newest'
    : sort;
}

export function buildFilterOptions(locale: Locale, activeFilter: InboxFilter, offered: OfferedMessages): DropdownOption[] {
  const options: DropdownOption[] = [{ key: 'all', label: tx(locale, 'common.alle'), selected: activeFilter.kind === 'all' }];
  if (offered.unread > 0)
    options.push({
      key: 'unread',
      label: tx(locale, 'tabsMail.neu_2'),
      meta: String(offered.unread),
      selected: activeFilter.kind === 'unread',
    });
  for (const sender of offered.senders) {
    options.push({
      key: `sender:${sender}`,
      label: sender,
      meta: String(offered.senderCounts[sender] ?? 0),
      selected: activeFilter.kind === 'sender' && activeFilter.sender === sender,
    });
  }
  return options;
}

export function buildSortOptions(locale: Locale, activeSort: InboxSort, offered: OfferedMessages): DropdownOption[] {
  const options: DropdownOption[] = [{ key: 'newest', label: tx(locale, 'common.neueste'), selected: activeSort === 'newest' }];
  if (offered.anyDates) options.push({ key: 'oldest', label: tx(locale, 'common.aelteste'), selected: activeSort === 'oldest' });
  if (offered.multipleSenders) options.push({ key: 'sender', label: tx(locale, 'tabsMail.absender'), selected: activeSort === 'sender' });
  if (offered.unread > 0) options.push({ key: 'unread-first', label: tx(locale, 'tabsMail.neu_zuerst'), selected: activeSort === 'unread-first' });
  return options;
}

/** Mailboxes: offered by the IMAP server; without a fetched list only INBOX is safe to assume. */
export function buildFolderOptions(folders: MailFolder[], folder: string, locale: Locale): DropdownOption[] {
  const selectable = folders.filter((candidate) => candidate.selectable);
  const source = selectable.length > 0 ? selectable : [{ name: 'INBOX', selectable: true }];
  // Unique names only — a server that lists a mailbox twice must not get a duplicate key.
  const unique = [...new Map(source.map((candidate) => [candidate.name, candidate])).values()];
  const label = (candidate: MailFolder) => folderLabel(candidate.display || candidate.name, locale);
  // The well-known mailboxes lead in a fixed order, the account's own folders follow by name.
  const ordered = [...unique].sort((a, b) => {
    const rankA = SYSTEM_FOLDER_ORDER.indexOf(folderKind(a.name));
    const rankB = SYSTEM_FOLDER_ORDER.indexOf(folderKind(b.name));
    if (rankA !== rankB) return rankA - rankB;
    return label(a).localeCompare(label(b), locale === 'de' ? 'de-DE' : 'en');
  });
  // Headers only earn their space when both sections exist; a single section stays a flat list.
  const sections = new Set(ordered.map((candidate) => folderSection(folderKind(candidate.name))));
  const grouped = sections.size > 1;
  return ordered.map((candidate) => {
    const section = folderSection(folderKind(candidate.name));
    return {
      key: candidate.name,
      label: label(candidate),
      selected: candidate.name === folder,
      group: grouped ? folderSectionLabel(section, locale) : undefined,
    };
  });
}

export function filterAndSortMessages(
  messages: MailMessage[],
  query: string,
  filter: InboxFilter,
  sort: InboxSort,
  locale: Locale,
): MailMessage[] {
  const needle = query.trim().toLowerCase();
  const rows = messages.filter((message) => {
    if (filter.kind === 'unread' && message.seen) return false;
    if (filter.kind === 'sender' && senderName(message.from) !== filter.sender) return false;
    if (!needle) return true;
    return [message.subject, message.from, message.to, message.preview].some((field) => String(field ?? '').toLowerCase().includes(needle));
  });
  const sorted = [...rows];
  if (sort === 'oldest') sorted.sort((a, b) => messageTime(a) - messageTime(b));
  else if (sort === 'sender')
    sorted.sort((a, b) => senderName(a.from).localeCompare(senderName(b.from), locale === 'de' ? 'de-DE' : 'en') || messageTime(b) - messageTime(a));
  else if (sort === 'unread-first')
    sorted.sort((a, b) => Number(a.seen) - Number(b.seen) || messageTime(b) - messageTime(a));
  else sorted.sort((a, b) => messageTime(b) - messageTime(a));
  return sorted;
}
