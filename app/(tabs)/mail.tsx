import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { ActivityIndicator, Animated, Easing, LayoutAnimation, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { Drawer } from 'react-native-drawer-layout';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  fetchMailFolders,
  fetchMailStatus,
  folderKind,
  folderLabel,
  getMailSnapshot,
  hydrateMailSnapshot,
  loadMailMessages,
  mailDetail,
  mailMessage,
  submitMailCredentials,
  subscribeMailSnapshot,
  type FolderKind,
} from '@/src/auth/mail';
import { Button, Card, FieldLabel, Pill, Screen } from '@/src/components/ui';
import { showToast } from '@/src/components/toast';
import { useReducedMotion } from '@/src/hooks/use-reduced-motion';
import { useApp } from '@/src/state/AppState';
import { colors, themedStyles } from '@/src/theme';
import { tx } from '@/src/text';
import type { MailFolder, MailMessage, MailStatus } from '@/src/types';

/** Deliberate fetching interval: one quiet inbox read per minute while connected. */
const REFRESH_INTERVAL_MS = 60_000;

/**
 * The list is never revealed faster than this, so opening the tab or a mailbox
 * reads as a load instead of rows popping in from a cache. A real network read
 * can take longer; the skeleton then simply stays up until the rows are there.
 */
const REVEAL_MIN_MS = 620;

/** One calm fade-and-rise when the skeleton hands over to the loaded rows. */
const REVEAL_MS = 300;

/** Filter options carry the chosen sender; the choices themselves are inferred from the loaded rows. */
type InboxFilter = { kind: 'all' } | { kind: 'unread' } | { kind: 'sender'; sender: string };

type InboxSort = 'newest' | 'oldest' | 'sender' | 'unread-first';

/** Well-known mailboxes first in a stable order, then the user's own folders (`other` last). */
const SYSTEM_FOLDER_ORDER: FolderKind[] = ['inbox', 'sent', 'drafts', 'archive', 'junk', 'trash', 'other'];

function folderSection(kind: FolderKind): 'mailbox' | 'folder' {
  return kind === 'other' ? 'folder' : 'mailbox';
}

function folderSectionLabel(section: 'mailbox' | 'folder', locale: 'de' | 'en'): string {
  return section === 'folder' ? tx(locale, 'tabsMail.eigene') : tx(locale, 'tabsMail.postfaecher');
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

/** Icon-only control for the sticky bar (mailbox drawer, filter drawer). */
function ToolButton({
  symbol,
  material,
  label,
  onPress,
}: {
  symbol: SymbolViewProps['name'];
  material: ComponentProps<typeof MaterialIcons>['name'];
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.toolButton, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={4}
    >
      <ControlIcon symbol={symbol} material={material} color={colors.anthracite} />
    </Pressable>
  );
}

/** One list of options, shared by the sort sheet and both drawers. */
function OptionRows({ options, onSelect }: { options: DropdownOption[]; onSelect: (key: string) => void }) {
  return (
    <>
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
              onPress={() => onSelect(option.key)}
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
    </>
  );
}

/** Drawer body: same title, grouping, row and check treatment as the existing sheets. */
function DrawerPanel({ title, closeLabel, onClose, children }: { title: string; closeLabel: string; onClose: () => void; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.drawerPanel, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.drawerHeader}>
        <Text style={styles.drawerTitle}>{title}</Text>
        <Pressable
          style={({ pressed }) => [styles.drawerClose, pressed && styles.pressed]}
          onPress={onClose}
          accessibilityLabel={closeLabel}
          accessibilityRole="button"
          hitSlop={8}
        >
          <ControlIcon symbol="xmark" material="close" color={colors.mute} />
        </Pressable>
      </View>
      <ScrollView style={styles.drawerScroll} contentContainerStyle={styles.drawerScrollContent}>
        {children}
      </ScrollView>
    </View>
  );
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
              <OptionRows
                options={options}
                onSelect={(key) => {
                  onSelect(key);
                  setOpen(false);
                }}
              />
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

/** Full-row equality: a changed read flag must still update the visible row. */
function sameMessageRows(a: MailMessage[], b: MailMessage[]): boolean {
  return (
    a.length === b.length &&
    a.every(
      (row, index) =>
        row.uid === b[index].uid &&
        row.seen === b[index].seen &&
        row.date === b[index].date &&
        row.from === b[index].from &&
        row.to === b[index].to &&
        row.subject === b[index].subject &&
        row.preview === b[index].preview,
    )
  );
}

/** Order-only equality: only added, removed or moved rows need a layout animation. */
function sameMessageOrder(a: MailMessage[], b: MailMessage[]): boolean {
  return a.length === b.length && a.every((row, index) => row.uid === b[index].uid);
}

/** Varying bone widths keep the skeleton from reading as a solid block. */
const SKELETON_SUBJECT_WIDTHS = ['72%', '64%', '78%', '58%'] as const;

/** One shared pulse rhythm for the list and toolbar placeholders. */
function useSkeletonPulse(animate: boolean) {
  const [pulse] = useState(() => new Animated.Value(0.55));

  useEffect(() => {
    if (!animate) {
      pulse.setValue(1);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 720, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.55, duration: 720, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [animate, pulse]);

  return pulse;
}

/**
 * Placeholder in the rhythm of the real rows: spinner, subject, sender, date.
 * The pulse stops when the platform asks for reduced motion.
 */
function MailListSkeleton({ label, animate }: { label: string; animate: boolean }) {
  const pulse = useSkeletonPulse(animate);

  return (
    <View style={styles.skeletonWrap} accessible accessibilityRole="progressbar" accessibilityLabel={label}>
      <View style={styles.loadingRow}>
        <ActivityIndicator size="small" color={colors.blue} />
        <Text style={styles.loadingText}>{label}</Text>
      </View>
      <Animated.View style={[styles.list, { opacity: pulse }]}>
        {SKELETON_SUBJECT_WIDTHS.map((width, index) => (
          <View key={width} style={[styles.skeletonRow, index < SKELETON_SUBJECT_WIDTHS.length - 1 && styles.listRowLine]}>
            <View style={styles.skeletonDot} />
            <View style={styles.skeletonLines}>
              <View style={[styles.skeletonBone, { width }]} />
              <View style={[styles.skeletonBone, styles.skeletonBoneFrom]} />
              <View style={[styles.skeletonBone, styles.skeletonBoneMeta]} />
            </View>
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

/**
 * Placeholder for the search field, sort picker and filter button. Without it
 * the sticky bar shows a lone mailbox button until the first read finishes and
 * then pops the whole control row in.
 */
function ToolbarSkeleton({ label, animate }: { label: string; animate: boolean }) {
  const pulse = useSkeletonPulse(animate);

  return (
    <Animated.View style={[styles.toolbarContent, { opacity: pulse }]} accessible accessibilityRole="progressbar" accessibilityLabel={label}>
      <View style={styles.searchSkeleton} />
      <View style={styles.dropdownSkeleton} />
      <View style={styles.toolSkeleton} />
    </Animated.View>
  );
}

/** Fade the real controls in once they become usable, instead of swapping them in. */
function ToolbarReveal({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const [opacity] = useState(() => new Animated.Value(reduced ? 1 : 0));

  useEffect(() => {
    if (reduced) {
      opacity.setValue(1);
      return undefined;
    }
    const reveal = Animated.timing(opacity, { toValue: 1, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    reveal.start();
    return () => reveal.stop();
  }, [opacity, reduced]);

  return <Animated.View style={[styles.toolbarContent, { opacity }]}>{children}</Animated.View>;
}

/**
 * Keeps the skeleton up for at least `REVEAL_MIN_MS` and hands over with one
 * fade-and-rise. `pending` holds it longer while the first read of an empty
 * mailbox is still running. Mounted under the mailbox as key, so a switch
 * starts a fresh cycle; a disconnect/connect already remounts this branch.
 */
function MailReveal({ pending, label, children }: { pending: boolean; label: string; children: ReactNode }) {
  const reduced = useReducedMotion();
  const [minElapsed, setMinElapsed] = useState(false);
  const [opacity] = useState(() => new Animated.Value(0));
  const [shift] = useState(() => new Animated.Value(10));
  const skeleton = !minElapsed || pending;

  useEffect(() => {
    const timer = setTimeout(() => setMinElapsed(true), REVEAL_MIN_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (skeleton) {
      opacity.setValue(0);
      shift.setValue(10);
      return undefined;
    }
    if (reduced) {
      opacity.setValue(1);
      shift.setValue(0);
      return undefined;
    }
    const reveal = Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: REVEAL_MS, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(shift, { toValue: 0, duration: REVEAL_MS, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]);
    reveal.start();
    return () => reveal.stop();
  }, [opacity, reduced, shift, skeleton]);

  if (skeleton) return <MailListSkeleton label={label} animate={!reduced} />;
  return <Animated.View style={[styles.reveal, { opacity, transform: [{ translateY: shift }] }]}>{children}</Animated.View>;
}

export default function MailScreen() {
  const { locale, sessionAccount, mailAccount, setMailAccount, authToken, refreshUser } = useApp();
  const [status, setStatus] = useState<MailStatus | null>(() => getMailSnapshot().status);
  const [messages, setMessages] = useState<MailMessage[]>(() => getMailSnapshot().messages ?? []);
  const [account, setAccount] = useState(mailAccount ?? sessionAccount ?? '');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  /** First status + mailbox read of this mount; without cached rows the skeleton waits for it. */
  const [bootSettled, setBootSettled] = useState(false);
  /** The on-device cache has been read, so an empty list is real rather than not-yet-hydrated. */
  const [cacheReady, setCacheReady] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  /** Guards so neither auto-load nor the poll interval stacks duplicate server calls. */
  const inFlight = useRef(false);
  const autoLoaded = useRef(false);
  /** Mirror of the rows for change detection inside async callbacks. */
  const messagesRef = useRef(messages);
  const reduced = useReducedMotion();

  const connected = status?.configured ?? false;

  /** Search text, filter membership and sort order — all over the loaded rows only. */
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<InboxFilter>({ kind: 'all' });
  const [sort, setSort] = useState<InboxSort>('newest');

  /** The mailbox opens from the left, the sender filter from the right. */
  const [mailboxOpen, setMailboxOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const { width } = useWindowDimensions();
  const drawerWidth = Math.min(340, Math.round(width * 0.86));

  /** The mailbox shown: IMAP folder name, default INBOX; the list comes from the server. */
  const [folder, setFolder] = useState(() => getMailSnapshot().folder ?? 'INBOX');
  const [folders, setFolders] = useState<MailFolder[]>(() => getMailSnapshot().folders ?? []);
  /** Mirror for the refresh callbacks so a folder switch does not re-create them (and rerun the load effects). */
  const folderRef = useRef(folder);

  /**
   * Apply a fetched list without ever remounting unchanged rows. Only a changed
   * set or order schedules a layout animation, so newly arriving mail fades and
   * pushes the rows below it down smoothly; read-flag updates stay still.
   */
  const applyMessages = useCallback((next: MailMessage[]) => {
    const current = messagesRef.current;
    if (sameMessageRows(current, next)) return;
    if (!sameMessageOrder(current, next)) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    messagesRef.current = next;
    setMessages(next);
  }, []);

  /** Read the on-device copy once; the app provider normally has done this already. */
  useEffect(() => {
    let active = true;
    hydrateMailSnapshot()
      .catch(() => undefined)
      .finally(() => {
        if (active) setCacheReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  /** Skeleton and entrance animation: a smooth minimum wait regardless of cached rows. */
  const revealPending = loading || !cacheReady || (!bootSettled && messages.length === 0);

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
  }, [locale, activeFilter, offered]);

  const sortOptions = useMemo<DropdownOption[]>(() => {
    const options: DropdownOption[] = [{ key: 'newest', label: tx(locale, 'common.neueste'), selected: activeSort === 'newest' }];
    if (offered.anyDates) options.push({ key: 'oldest', label: tx(locale, 'common.aelteste'), selected: activeSort === 'oldest' });
    if (offered.multipleSenders) options.push({ key: 'sender', label: tx(locale, 'tabsMail.absender'), selected: activeSort === 'sender' });
    if (offered.unread > 0) options.push({ key: 'unread-first', label: tx(locale, 'tabsMail.neu_zuerst'), selected: activeSort === 'unread-first' });
    return options;
  }, [locale, activeSort, offered.anyDates, offered.multipleSenders, offered.unread]);

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
    setMailboxOpen(false);
    if (key === folder) return;
    folderRef.current = key;
    setFolder(key);
    messagesRef.current = [];
    setMessages([]);
    refreshMessages({ quiet: false, folder: key }).catch(() => undefined);
  }

  function applyFilterKey(key: string) {
    setFilterOpen(false);
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
   * `pull` runs come from pull-to-refresh: their spinner lives in the list, so they skip
   * the loading copy and the success note as well.
   */
  const refreshMessages = useCallback(
    async (options: { quiet?: boolean; folder?: string; pull?: boolean } = {}) => {
      if (inFlight.current) return;
      inFlight.current = true;
      const quiet = options.quiet ?? false;
      const pull = options.pull ?? false;
      const target = options.folder ?? folderRef.current;
      if (!quiet) {
        setError('');
        setNote('');
        if (!pull) setLoading(true);
      }
      try {
        const loaded = await loadMailMessages(25, target);
        applyMessages(loaded);
        const display = getMailSnapshot().folders?.find((candidate) => candidate.name === target)?.display ?? target;
        if (!quiet && !pull) setNote(tx(locale, 'tabsMail.geladen', [folderLabel(display, locale)]));
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
    [applyMessages, locale],
  );

  /** Pull-to-refresh keeps the rows on screen; the spinner is the only feedback while it runs. */
  const pullToRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshMessages({ pull: true });
    } finally {
      setRefreshing(false);
    }
  }, [refreshMessages]);

  /** The pushed connection screen publishes server-side changes; apply them here directly. */
  useEffect(
    () =>
      subscribeMailSnapshot(() => {
        const snap = getMailSnapshot();
        setStatus(snap.status);
        if (snap.messages) applyMessages(snap.messages);
        else {
          messagesRef.current = [];
          setMessages([]);
        }
        setFolders(snap.folders ?? []);
        if (snap.status && !snap.status.configured) {
          messagesRef.current = [];
          setMessages([]);
          setFolders([]);
          folderRef.current = 'INBOX';
          setFolder('INBOX');
          setNote('');
          setError('');
        }
      }),
    [applyMessages],
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
                refreshMessages({ quiet: true })
                  .catch(() => undefined)
                  .finally(() => {
                    if (active) setBootSettled(true);
                  });
              } else if (active) {
                setBootSettled(true);
              }
            });
        } else {
          setBootSettled(true);
        }
      })
      .catch(() => {
        if (active) setBootSettled(true);
      });
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
    setBootSettled(false);
    try {
      const result = await submitMailCredentials({ account, password }, authToken);
      setPassword('');
      setMailAccount(result.account);
      void refreshUser();
      showToast({
        tone: 'success',
        title: tx(locale, 'tabsMail.verbunden_2', [result.account]),
        message: result.address || tx(locale, 'tabsMail.uni'),
      });
      fetchMailFolders().catch(() => undefined);
      await refreshMessages({ quiet: true });
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : 'mail_failed';
      setError(mailMessage(locale, code, mailDetail(caught)));
    } finally {
      setBusy(false);
      setBootSettled(true);
    }
  }

  /**
   * Sticky controls: mailbox drawer (left), full-width search, sort sheet, and the
   * filter drawer on the right edge. The search keeps the remaining width.
   */
  const controlsBar = connected ? (
    <View style={styles.stickyBar}>
      <View style={styles.controlsRow}>
        <ToolButton
          symbol="line.3.horizontal"
          material="menu"
          label={tx(locale, 'tabsMail.postfach')}
          onPress={() => setMailboxOpen(true)}
        />
        {revealPending ? (
          <ToolbarSkeleton label={tx(locale, 'tabsMail.lade', [folderValueText])} animate={!reduced} />
        ) : messages.length > 0 ? (
          <ToolbarReveal>
            <View style={styles.searchRow}>
              <ControlIcon symbol="magnifyingglass" material="search" color={colors.mute} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                style={styles.searchInput}
                placeholder={tx(locale, 'tabsMail.suche')}
                placeholderTextColor={colors.mute}
                autoCorrect={false}
                autoCapitalize="none"
              />
              {query ? (
                <Pressable hitSlop={8} onPress={() => setQuery('')} accessibilityLabel={tx(locale, 'tabsMail.suche_leeren')}>
                  <Text style={styles.clear}>✕</Text>
                </Pressable>
              ) : null}
            </View>
            <DropdownPicker hint={tx(locale, 'tabsMail.sortieren')} valueText={sortValueText} options={sortOptions} onSelect={applySortKey} />
            <ToolButton
              symbol="line.3.horizontal.decrease"
              material="filter-alt"
              label={tx(locale, 'tabsMail.filter')}
              onPress={() => setFilterOpen(true)}
            />
          </ToolbarReveal>
        ) : null}
      </View>
    </View>
  ) : null;

  return (
    <Drawer
      open={mailboxOpen}
      onOpen={() => setMailboxOpen(true)}
      onClose={() => setMailboxOpen(false)}
      drawerPosition="left"
      drawerType="front"
      drawerStyle={{ width: drawerWidth }}
      overlayAccessibilityLabel={tx(locale, 'common.schliessen')}
      renderDrawerContent={() => (
        <DrawerPanel
          title={tx(locale, 'tabsMail.postfach')}
          closeLabel={tx(locale, 'common.schliessen')}
          onClose={() => setMailboxOpen(false)}>
          <OptionRows options={folderOptions} onSelect={applyFolderKey} />
        </DrawerPanel>
      )}>
      <Drawer
        open={filterOpen}
        onOpen={() => setFilterOpen(true)}
        onClose={() => setFilterOpen(false)}
        drawerPosition="right"
        drawerType="front"
        drawerStyle={{ width: drawerWidth }}
        overlayAccessibilityLabel={tx(locale, 'common.schliessen')}
        renderDrawerContent={() => (
          <DrawerPanel
            title={tx(locale, 'tabsMail.filter')}
            closeLabel={tx(locale, 'common.schliessen')}
            onClose={() => setFilterOpen(false)}>
            <OptionRows options={filterOptions} onSelect={applyFilterKey} />
          </DrawerPanel>
        )}>
        <Screen
          stickyHeader={controlsBar}
          topInset
          refreshControl={
            connected ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={pullToRefresh}
                tintColor={colors.blue}
                colors={[colors.blue]}
                progressBackgroundColor={colors.paper}
              />
            ) : undefined
          }>
          {!connected ? (
            <>
              <Card>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <Text style={{ color: colors.anthracite, fontSize: 18, fontWeight: '700' }}>UniMail</Text>
                  <Pill tone="wait" label={tx(locale, 'tabsMail.verbunden')} />
                </View>
                <Text style={{ color: colors.inkSoft, lineHeight: 20 }}>
                  {status === null
                    ? tx(locale, 'common.assistenz')
                    : tx(locale, 'tabsMail.trage')}
                </Text>
                <FieldLabel>{tx(locale, 'tabsMail.nutzerkennung')}</FieldLabel>
                <TextInput
                  value={account}
                  onChangeText={setAccount}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                  placeholder={sessionAccount ?? 'st123456'}
                  placeholderTextColor={colors.mute}
                />
                <FieldLabel>{tx(locale, 'tabsMail.passwort_uni')}</FieldLabel>
                <TextInput value={password} onChangeText={setPassword} secureTextEntry style={styles.input} placeholder="••••••••" placeholderTextColor={colors.mute} />
                <Button label={busy ? tx(locale, 'tabsMail.verbindung') : tx(locale, 'tabsMail.unimail')} onPress={connect} />
                <Text style={styles.hint}>
                  {tx(locale, 'tabsMail.passwort')}
                </Text>
              </Card>
              {note ? <Text style={styles.note}>{note}</Text> : null}
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Card>
                <Text style={styles.hint}>
                  {tx(locale, 'tabsMail.gelesen')}
                </Text>
              </Card>
            </>
          ) : (
            <MailReveal key={folder} pending={revealPending} label={tx(locale, 'tabsMail.lade', [folderValueText])}>
              {note ? <Text style={styles.note}>{note}</Text> : null}
              {error ? <Text style={styles.error}>{error}</Text> : null}
              {activeFilter.kind !== 'all' || query ? (
                <Text style={styles.meta}>
                  {tx(locale, 'tabsMail.von', [visibleMessages.length, messages.length, activeFilter.kind === 'sender' ? ` · ${activeFilter.sender}` : '', query ? ` · „${query.trim()}“` : ''])}
                </Text>
              ) : null}
              {messages.length === 0 ? (
                <Text style={styles.hint}>
                  {tx(locale, 'tabsMail.nachrichten', [folderValueText])}
                </Text>
              ) : visibleMessages.length === 0 ? (
                <Text style={styles.hint}>
                  {tx(locale, 'tabsMail.treffer')}
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
                        accessibilityLabel={tx(locale, 'tabsMail.nachricht', [message.subject || 'ohne Betreff'])}
                      >
                        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                          <View style={[styles.dot, { backgroundColor: message.seen ? colors.line : colors.blue }]} />
                          <View style={{ flex: 1, gap: 4 }}>
                            <Text style={[styles.subject, message.seen && styles.subjectSeen]} numberOfLines={2}>
                              {message.subject || tx(locale, 'common.ohne')}
                            </Text>
                            <Text style={styles.from} numberOfLines={1}>
                              {message.from || '–'}
                            </Text>
                            <Text style={styles.meta}>
                              {message.date ? new Date(message.date).toLocaleString(locale === 'de' ? 'de-DE' : 'en-GB') : '–'}
                              {!message.seen ? tx(locale, 'tabsMail.neu') : ''}
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
                  {tx(locale, 'tabsMail.gelesen')}
                </Text>
              </Card>
            </MailReveal>
          )}
        </Screen>
      </Drawer>
    </Drawer>
  );
}

const styles = themedStyles((colors) => ({
  controlsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toolbarContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchSkeleton: { flex: 1, minWidth: 64, height: 38, borderRadius: 12, backgroundColor: colors.line },
  dropdownSkeleton: { width: 74, height: 38, borderRadius: 12, backgroundColor: colors.line },
  toolSkeleton: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.line },
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
  // The list enters as one calm block; the gap matches the Screen body spacing
  // so wrapping the rows does not tighten their rhythm.
  reveal: { gap: 14 },
  skeletonWrap: { gap: 14 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 2 },
  loadingText: { flex: 1, color: colors.inkSoft, fontSize: 13, lineHeight: 19 },
  skeletonRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingVertical: 14 },
  skeletonDot: { width: 10, height: 10, borderRadius: 10, marginTop: 6, backgroundColor: colors.line },
  skeletonLines: { flex: 1, gap: 7 },
  skeletonBone: { height: 10, borderRadius: 5, backgroundColor: colors.line },
  skeletonBoneFrom: { width: '45%' },
  skeletonBoneMeta: { width: '30%', height: 8 },
  searchRow: {
    flex: 1,
    minWidth: 64,
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
    flexShrink: 1,
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
  toolButton: {
    flexShrink: 0,
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    backgroundColor: colors.paper,
  },
  drawerPanel: { flex: 1, backgroundColor: colors.paper, paddingHorizontal: 16 },
  drawerHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 6 },
  drawerTitle: {
    flex: 1,
    color: colors.blue,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    paddingTop: 8,
    paddingBottom: 6,
  },
  drawerClose: { padding: 6, borderRadius: 999 },
  drawerScroll: { flex: 1 },
  drawerScrollContent: { paddingBottom: 8 },
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
}));
