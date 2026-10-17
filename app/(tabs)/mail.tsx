import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentProps } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  fetchMailFolders,
  fetchMailStatus,
  folderKind,
  folderLabel,
  getMailSnapshot,
  loadMailMessages,
  mailDetail,
  mailMessage,
  submitMailCredentials,
  subscribeMailSnapshot,
  type FolderKind,
} from '@/src/auth/mail';
import { Button, Card, FieldLabel, Pill, Screen } from '@/src/components/ui';
import { useApp } from '@/src/state/AppState';
import { colors } from '@/src/theme';
import { tx } from '@/src/text';
import type { MailFolder, MailMessage, MailStatus } from '@/src/types';

/** Deliberate fetching interval: one quiet inbox read per minute while connected. */
const REFRESH_INTERVAL_MS = 60_000;

/** Filter options carry the chosen sender; the choices themselves are inferred from the loaded rows. */
type InboxFilter = { kind: 'all' } | { kind: 'unread' } | { kind: 'sender'; sender: string };

type InboxSort = 'newest' | 'oldest' | 'sender' | 'unread-first';

/** Well-known mailboxes first in a stable order, then the user's own folders (`other` last). */
const SYSTEM_FOLDER_ORDER: FolderKind[] = ['inbox', 'sent', 'drafts', 'archive', 'junk', 'trash', 'other'];

function folderSection(kind: FolderKind): 'mailbox' | 'folder' {
  return kind === 'other' ? 'folder' : 'mailbox';
}

function folderSectionLabel(section: 'mailbox' | 'folder', locale: 'de' | 'en'): string {
  return section === 'folder' ? tx(locale, 'Eigene Ordner', 'Your folders') : tx(locale, 'Postfächer', 'Mailboxes');
}

interface DropdownOption {
  key: string;
  label: string;
  meta?: string;
  selected: boolean;
  /** Section header this option sits under; consecutive options sharing it render one header. */
  group?: string;
}

function ControlIcon({
  symbol,
  material,
  color,
}: {
  symbol: SymbolViewProps['name'];
  material: ComponentProps<typeof MaterialIcons>['name'];
  color: string;
}) {
  if (Platform.OS === 'ios') return <SymbolView name={symbol} size={16} tintColor={color} />;
  return <MaterialIcons name={material} size={18} color={color} />;
}

/** Compact button + bottom-sheet picker; the value text comes from the active selection. */
function DropdownPicker({
  hint,
  valueText,
  options,
  onSelect,
}: {
  hint: string;
  valueText: string;
  options: DropdownOption[];
  onSelect: (key: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <Pressable
        style={({ pressed }) => [styles.dropdown, pressed && styles.pressed]}
        onPress={() => setOpen(true)}
        accessibilityLabel={hint}
        accessibilityRole="button"
      >
        <Text style={styles.dropdownText} numberOfLines={1} ellipsizeMode="tail">
          {valueText}
        </Text>
        <ControlIcon symbol="chevron.down" material="expand-more" color={colors.mute} />
      </Pressable>
      <Modal transparent visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet}>
            <View style={styles.sheetGripWrap}>
              <View style={styles.sheetGrip} />
            </View>
            <Text style={styles.sheetTitle}>{hint}</Text>
            <ScrollView style={styles.sheetScroll}>
              {options.map((option, index) => {
                const header = option.group && option.group !== options[index - 1]?.group ? option.group : null;
                return (
                  <Fragment key={option.key}>
                    {header ? (
                      <View style={styles.sheetGroupWrap}>
                        <Text style={styles.sheetGroupText}>{header}</Text>
                      </View>
                    ) : null}
                    <Pressable
                      style={({ pressed }) => [styles.option, option.group && styles.optionGrouped, pressed && styles.pressed]}
                      onPress={() => {
                        onSelect(option.key);
                        setOpen(false);
                      }}
                      accessibilityRole="button"
                    >
                      <Text style={[styles.optionText, option.selected && styles.optionTextActive]} numberOfLines={2}>
                        {option.label}
                      </Text>
                      {option.meta ? <Text style={styles.optionMeta}>{option.meta}</Text> : null}
                      {option.selected ? <ControlIcon symbol="checkmark" material="check" color={colors.blue} /> : null}
                    </Pressable>
                  </Fragment>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

/** Display name of a From header without the angle-bracket address. */
function senderName(from: string): string {
  const cleaned = String(from ?? '').replace(/"/g, '').trim();
  const at = cleaned.indexOf('<');
  const name = (at > 0 ? cleaned.slice(0, at) : cleaned).trim();
  return name || cleaned;
}

function messageTime(message: { date: string }): number {
  return message.date && !Number.isNaN(Date.parse(message.date)) ? Date.parse(message.date) : 0;
}

export default function MailScreen() {
  const { locale, sessionAccount, mailAccount, setMailAccount } = useApp();
  const [status, setStatus] = useState<MailStatus | null>(() => getMailSnapshot().status);
  const [messages, setMessages] = useState<MailMessage[]>(() => getMailSnapshot().messages ?? []);
  const [account, setAccount] = useState(mailAccount ?? sessionAccount ?? '');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  /** Guards so neither auto-load nor the poll interval stacks duplicate server calls. */
  const inFlight = useRef(false);
  const autoLoaded = useRef(false);

  const connected = status?.configured ?? false;

  /** Search text, filter membership and sort order — all over the loaded rows only. */
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<InboxFilter>({ kind: 'all' });
  const [sort, setSort] = useState<InboxSort>('newest');

  /** The mailbox shown: IMAP folder name, default INBOX; the list comes from the server. */
  const [folder, setFolder] = useState(() => getMailSnapshot().folder ?? 'INBOX');
  const [folders, setFolders] = useState<MailFolder[]>(() => getMailSnapshot().folders ?? []);
  /** Mirror for the refresh callbacks so a folder switch does not re-create them (and rerun the load effects). */
  const folderRef = useRef(folder);

  /** What the current data supports. Missing variety removes the option instead of showing a dead control. */
  const offered = useMemo(() => {
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
  }, [messages]);

  /**
   * The stored selection is only intent; the effective value is derived in render, so a
   * refresh that removes the variety (unread cleared, one sender left) silently falls
   * back to newest — without a following setState-in-effect round.
   */
  const activeFilter = useMemo<InboxFilter>(
    () => (filter.kind === 'sender' && !offered.senders.includes(filter.sender) ? { kind: 'all' } : filter),
    [filter, offered.senders],
  );
  const activeSort = useMemo<InboxSort>(
    () =>
      (sort === 'sender' && !offered.multipleSenders) || (sort === 'unread-first' && offered.unread === 0) || (sort === 'oldest' && !offered.anyDates)
        ? 'newest'
        : sort,
    [sort, offered.multipleSenders, offered.unread, offered.anyDates],
  );

  /** Dropdown data: current value text plus the inferred options with their row counts. */
  const filterOptions = useMemo<DropdownOption[]>(() => {
    const options: DropdownOption[] = [{ key: 'all', label: tx(locale, 'Alle', 'All'), selected: activeFilter.kind === 'all' }];
    if (offered.unread > 0)
      options.push({
        key: 'unread',
        label: tx(locale, 'Neu', 'Unread'),
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
  }, [locale, activeFilter, offered]);

  const sortOptions = useMemo<DropdownOption[]>(() => {
    const options: DropdownOption[] = [{ key: 'newest', label: tx(locale, 'Neueste', 'Newest'), selected: activeSort === 'newest' }];
    if (offered.anyDates) options.push({ key: 'oldest', label: tx(locale, 'Älteste', 'Oldest'), selected: activeSort === 'oldest' });
    if (offered.multipleSenders) options.push({ key: 'sender', label: tx(locale, 'Absender', 'Sender'), selected: activeSort === 'sender' });
    if (offered.unread > 0) options.push({ key: 'unread-first', label: tx(locale, 'Neu zuerst', 'Unread first'), selected: activeSort === 'unread-first' });
    return options;
  }, [locale, activeSort, offered.anyDates, offered.multipleSenders, offered.unread]);

  const filterValueText = useMemo(() => {
    if (activeFilter.kind === 'sender') return activeFilter.sender;
    if (activeFilter.kind === 'unread') return filterOptions.find((option) => option.key === 'unread')?.label ?? '';
    return filterOptions[0]?.label ?? '';
  }, [activeFilter, filterOptions]);

  const sortValueText = sortOptions.find((option) => option.selected)?.label ?? '';

  /** Mailboxes: offered by the IMAP server; without a fetched list only INBOX is safe to assume. */
  const folderOptions = useMemo<DropdownOption[]>(() => {
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
  }, [folders, folder, locale]);

  const folderValueText = folderOptions.find((option) => option.selected)?.label ?? folderLabel(folder, locale);

  function applyFolderKey(key: string) {
    if (key === folder) return;
    folderRef.current = key;
    setFolder(key);
    setMessages([]);
    refreshMessages({ quiet: false, folder: key }).catch(() => undefined);
  }

  function applyFilterKey(key: string) {
    if (key === 'unread') setFilter({ kind: 'unread' });
    else if (key.startsWith('sender:')) setFilter({ kind: 'sender', sender: key.slice('sender:'.length) });
    else setFilter({ kind: 'all' });
  }

  function applySortKey(key: string) {
    setSort((key === 'oldest' || key === 'sender' || key === 'unread-first' ? key : 'newest') as InboxSort);
  }

  const visibleMessages = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const rows = messages.filter((message) => {
      if (activeFilter.kind === 'unread' && message.seen) return false;
      if (activeFilter.kind === 'sender' && senderName(message.from) !== activeFilter.sender) return false;
      if (!needle) return true;
      return [message.subject, message.from, message.to, message.preview].some((field) => String(field ?? '').toLowerCase().includes(needle));
    });
    const sorted = [...rows];
    if (activeSort === 'oldest') sorted.sort((a, b) => messageTime(a) - messageTime(b));
    else if (activeSort === 'sender')
      sorted.sort((a, b) => senderName(a.from).localeCompare(senderName(b.from), locale === 'de' ? 'de-DE' : 'en') || messageTime(b) - messageTime(a));
    else if (activeSort === 'unread-first')
      sorted.sort((a, b) => Number(a.seen) - Number(b.seen) || messageTime(b) - messageTime(a));
    else sorted.sort((a, b) => messageTime(b) - messageTime(a));
    return sorted;
  }, [messages, query, activeFilter, activeSort, locale]);

  /**
   * One mailbox read through the assistant server (one IMAP session each). `quiet` runs are
   * the auto-load and the polling interval: they must not flash the refresh button and
   * not overwrite the visible note, only their own errors surface via `mailMessage`.
   */
  const refreshMessages = useCallback(
    async (options: { quiet?: boolean; folder?: string } = {}) => {
      if (inFlight.current) return;
      inFlight.current = true;
      const quiet = options.quiet ?? false;
      const target = options.folder ?? folderRef.current;
      if (!quiet) {
        setError('');
        setNote('');
        setLoading(true);
      }
      try {
        const loaded = await loadMailMessages(25, target);
        setMessages(loaded);
        const display = getMailSnapshot().folders?.find((candidate) => candidate.name === target)?.display ?? target;
        if (!quiet) setNote(tx(locale, `„${folderLabel(display, locale)}“ geladen.`, `"${folderLabel(display, locale)}" loaded.`));
      } catch (caught) {
        const code = caught instanceof Error ? caught.message : 'mail_failed';
        if (!quiet) setError(mailMessage(locale, code, mailDetail(caught)));
        if (code === 'mail_not_configured') {
          // The server restarted and forgot the credentials: resync once, the poll interval stops because connected becomes false.
          await fetchMailStatus();
        }
      } finally {
        inFlight.current = false;
        if (!quiet) setLoading(false);
      }
    },
    [locale],
  );

  /** The pushed connection screen publishes server-side changes; apply them here directly. */
  useEffect(
    () =>
      subscribeMailSnapshot(() => {
        const snap = getMailSnapshot();
        if (snap.status) setStatus(snap.status);
        if (snap.messages) setMessages(snap.messages);
        if (snap.folders) setFolders(snap.folders);
        if (snap.status && !snap.status.configured) {
          setMessages([]);
          setFolders([]);
          folderRef.current = 'INBOX';
          setFolder('INBOX');
          setNote('');
          setError('');
        }
      }),
    [],
  );

  /** Auto-load exactly once per mount — the same attempt must never repeat by effect reruns. */
  useEffect(() => {
    let active = true;
    fetchMailStatus()
      .then((next) => {
        if (!active) return;
        if (next?.configured) {
          if (next.account) setMailAccount(next.account);
          fetchMailFolders()
            .catch(() => undefined)
            .finally(() => {
              if (!autoLoaded.current) {
                autoLoaded.current = true;
                refreshMessages({ quiet: true }).catch(() => undefined);
              }
            });
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [setMailAccount, refreshMessages]);

  /** Deliberate fetching interval: one quiet refresh per minute while connected. */
  useEffect(() => {
    if (!connected) return;
    const interval = setInterval(() => {
      refreshMessages({ quiet: true }).catch(() => undefined);
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [connected, refreshMessages]);

  async function connect() {
    if (busy) return;
    setError('');
    setNote('');
    setBusy(true);
    try {
      const result = await submitMailCredentials({ account, password });
      setPassword('');
      setMailAccount(result.account);
      setNote(tx(locale, `Verbunden als ${result.account} (${result.address || 'Uni-Mail'}).`, `Connected as ${result.account} (${result.address || 'university mail'}).`));
      fetchMailFolders().catch(() => undefined);
      await refreshMessages({ quiet: true });
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : 'mail_failed';
      setError(mailMessage(locale, code, mailDetail(caught)));
    } finally {
      setBusy(false);
    }
  }

  /**
   * Sticky controls: one horizontally scrollable row — mailbox first, then search,
   * filter, sort — plus the connection cog. The row stays pinned while the inbox
   * scrolls under it, and the strip keeps every control at its natural width instead
   * of squeezing five controls into one narrow screen width.
   */
  const controlsBar = connected ? (
    <View style={styles.stickyBar}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.controlsRow}>
        <DropdownPicker
          hint={tx(locale, 'Postfach wählen', 'Choose mailbox')}
          valueText={folderValueText}
          options={folderOptions}
          onSelect={applyFolderKey}
        />
        {messages.length > 0 ? (
          <>
            <View style={styles.searchRow}>
              <ControlIcon symbol="magnifyingglass" material="search" color={colors.mute} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                style={styles.searchInput}
                placeholder={tx(locale, 'Suche', 'Search')}
                placeholderTextColor={colors.mute}
                autoCorrect={false}
                autoCapitalize="none"
              />
              {query ? (
                <Pressable hitSlop={8} onPress={() => setQuery('')} accessibilityLabel={tx(locale, 'Suche leeren', 'Clear search')}>
                  <Text style={styles.clear}>✕</Text>
                </Pressable>
              ) : null}
            </View>
            <DropdownPicker
              hint={tx(locale, 'Nach Absender und Neuheit filtern', 'Filter by sender and unread')}
              valueText={filterValueText}
              options={filterOptions}
              onSelect={applyFilterKey}
            />
            <DropdownPicker hint={tx(locale, 'Sortieren', 'Sort')} valueText={sortValueText} options={sortOptions} onSelect={applySortKey} />
          </>
        ) : null}
        <Pressable
          hitSlop={8}
          onPress={() => router.push('/mail-verbindung')}
          accessibilityLabel={tx(locale, 'Verbindung verwalten', 'Manage connection')}
          accessibilityRole="button"
          style={({ pressed }) => [pressed && styles.pressed]}
        >
          {Platform.OS === 'ios' ? (
            <SymbolView name="gearshape.fill" size={20} tintColor={colors.blue} />
          ) : (
            <MaterialIcons name="settings" size={21} color={colors.blue} />
          )}
        </Pressable>
      </ScrollView>
    </View>
  ) : null;

  return (
    <Screen stickyHeader={controlsBar} topInset>
      {!connected ? (
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <Text style={{ color: colors.anthracite, fontSize: 18, fontWeight: '700' }}>UniMail</Text>
            <Pill tone="wait" label={tx(locale, 'Nicht verbunden', 'Not connected')} />
          </View>
          <Text style={{ color: colors.inkSoft, lineHeight: 20 }}>
            {status === null
              ? tx(locale, 'Der Assistenz-Server antwortet noch nicht. Starte npm run assistant.', 'The assistant server is not answering yet. Start npm run assistant.')
              : tx(
                  locale,
                  'Trage kurz Nutzerkennung und Passwort ein, damit der Server den Posteingang über IMAP abrufen darf.',
                  'Enter the user id and password so the server may read the inbox over IMAP.',
                )}
          </Text>
          <FieldLabel>{tx(locale, 'Nutzerkennung (kurz, z. B. st123456)', 'User id (short, e.g. st123456)')}</FieldLabel>
          <TextInput
            value={account}
            onChangeText={setAccount}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
            placeholder={sessionAccount ?? 'st123456'}
            placeholderTextColor={colors.mute}
          />
          <FieldLabel>{tx(locale, 'Passwort des Uni-Kontos', 'University account password')}</FieldLabel>
          <TextInput value={password} onChangeText={setPassword} secureTextEntry style={styles.input} placeholder="••••••••" placeholderTextColor={colors.mute} />
          <Button label={busy ? tx(locale, 'Verbindung läuft …', 'Connecting …') : tx(locale, 'Mit UniMail verbinden', 'Connect with UniMail')} onPress={connect} />
          <Text style={styles.hint}>
            {tx(
              locale,
              'Das Passwort wird geprüft, indem der Server sich einmal beim IMAP-Dienst des TIK anmeldet. Es bleibt im Speicher des Servers, wird weder auf dem Gerät gespeichert noch angezeigt.',
              'The password is proofed by signing the server in once at the TIK IMAP service. It stays in the server memory, never stored on this device or shown again.',
            )}
          </Text>
        </Card>
      ) : null}
      {note ? <Text style={styles.note}>{note}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {activeFilter.kind !== 'all' || query ? (
        <Text style={styles.meta}>
          {tx(
            locale,
            `${visibleMessages.length} von ${messages.length}${activeFilter.kind === 'sender' ? ` · ${activeFilter.sender}` : ''}${query ? ` · „${query.trim()}“` : ''}`,
            `${visibleMessages.length} of ${messages.length}${activeFilter.kind === 'sender' ? ` · ${activeFilter.sender}` : ''}${query ? ` · “${query.trim()}”` : ''}`,
          )}
        </Text>
      ) : null}
      {messages.length === 0 ? (
        <Text style={styles.hint}>
          {connected
            ? tx(
                locale,
                loading ? `Lade „${folderValueText}“ …` : `Keine Nachrichten in „${folderValueText}“.`,
                loading ? `Loading "${folderValueText}" …` : `No messages in "${folderValueText}".`,
              )
            : tx(locale, 'Erst verbinden, dann erscheinen die neuesten Nachrichten hier.', 'Connect first; the newest messages then appear here.')}
        </Text>
      ) : visibleMessages.length === 0 ? (
        <Text style={styles.hint}>
          {tx(locale, 'Kein Treffer für Suche oder Filter im geladenen Bestand.', 'No match for the search or filter in the loaded messages.')}
        </Text>
      ) : null}
      {visibleMessages.length > 0 ? (
        <View style={styles.list}>
          {visibleMessages.map((message, index) => {
            const last = index === visibleMessages.length - 1;
            return (
              <Pressable
                key={message.uid}
                style={({ pressed }) => [
                  styles.listRow,
                  !last && styles.listRowLine,
                  pressed && styles.pressed,
                ]}
                onPress={() =>
                  router.push({
                    pathname: '/mail-nachricht',
                    params: { uid: String(message.uid), folder },
                  })
                }
                accessibilityLabel={tx(locale, `Nachricht öffnen: ${message.subject || 'ohne Betreff'}`, `Open message: ${message.subject || 'no subject'}`)}
              >
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                  <View style={[styles.dot, { backgroundColor: message.seen ? colors.line : colors.blue }]} />
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={[styles.subject, message.seen && styles.subjectSeen]} numberOfLines={2}>
                      {message.subject || tx(locale, '(ohne Betreff)', '(no subject)')}
                    </Text>
                    <Text style={styles.from} numberOfLines={1}>
                      {message.from || '–'}
                    </Text>
                    <Text style={styles.meta}>
                      {message.date ? new Date(message.date).toLocaleString(locale === 'de' ? 'de-DE' : 'en-GB') : '–'}
                      {!message.seen ? tx(locale, ' · neu', ' · new') : ''}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      <Card>
        <Text style={styles.hint}>
          {tx(
            locale,
            'Nur gelesen und angezeigt. Antworten und Versand bleiben beim Webmail unter https://mail.uni-stuttgart.de/, das die Universität selbst betreibt.',
            'Read and shown only. Replying and sending stay in the webmail at https://mail.uni-stuttgart.de/, operated by the university itself.',
          )}
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  controlsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 4 },
  stickyBar: {
    backgroundColor: colors.paper,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  list: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 0,
    backgroundColor: colors.paper,
    marginHorizontal: -20,
  },
  listRow: { paddingHorizontal: 20, paddingVertical: 14 },
  listRowLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  searchRow: {
    width: 190,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.mist,
    borderRadius: 12,
    paddingHorizontal: 10,
  },
  searchInput: { flex: 1, minWidth: 0, fontSize: 15, color: colors.anthracite, paddingVertical: 9 },
  clear: { color: colors.mute, fontSize: 13, fontWeight: '700' },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    backgroundColor: colors.paper,
    paddingLeft: 10,
    paddingRight: 5,
    paddingVertical: 9,
    maxWidth: 118,
  },
  dropdownText: { flexShrink: 1, color: colors.anthracite, fontSize: 13, fontWeight: '600' },
  backdrop: { flex: 1, backgroundColor: 'rgba(15, 35, 55, 0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.paper,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 28,
  },
  sheetGripWrap: { alignItems: 'center', paddingBottom: 6 },
  sheetGrip: { width: 40, height: 5, borderRadius: 5, backgroundColor: colors.line },
  sheetTitle: { color: colors.blue, fontSize: 12, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase', paddingTop: 8, paddingBottom: 6 },
  sheetGroupWrap: { paddingTop: 16, paddingBottom: 6 },
  sheetGroupText: {
    alignSelf: 'flex-start',
    color: colors.inkSoft,
    backgroundColor: colors.mist,
    borderRadius: 8,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  sheetScroll: { maxHeight: 420 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  optionText: { flex: 1, color: colors.anthracite, fontSize: 15 },
  optionGrouped: { paddingLeft: 14, borderLeftWidth: 2, borderLeftColor: colors.line, marginLeft: 2 },
  optionTextActive: { color: colors.blue, fontWeight: '700' },
  optionMeta: { color: colors.mute, fontSize: 13, fontWeight: '700' },
  pressed: { opacity: 0.72 },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.anthracite,
  },
  hint: { color: colors.inkSoft, fontSize: 13, lineHeight: 19 },
  note: { color: colors.success, fontSize: 14, lineHeight: 20 },
  error: { color: colors.danger, fontSize: 14, lineHeight: 20 },
  dot: { width: 10, height: 10, borderRadius: 10, marginTop: 6 },
  subject: { color: colors.anthracite, fontSize: 16, fontWeight: '700' },
  subjectSeen: { fontWeight: '600', color: colors.inkSoft },
  from: { color: colors.inkSoft, fontSize: 14 },
  meta: { color: colors.inkSoft, fontSize: 12 },
});
