import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Card, Muted, Pill, SearchField } from '@/src/components/ui';
import type { CampusLogEntry } from '@/src/auth/campus-log';
import { colors } from '@/src/theme';
import { breakable, tx } from '@/src/text';
import type { Locale } from '@/src/types';

type HistoryStatus = 'all' | 'ok' | 'failed';
type HistorySort = 'new' | 'old' | 'slow';

const statusOrder: HistoryStatus[] = ['all', 'ok', 'failed'];
const sortOrder: HistorySort[] = ['new', 'old', 'slow'];

function statusLabel(status: HistoryStatus, locale: Locale): string {
  if (status === 'all') return tx(locale, 'common.alle');
  if (status === 'ok') return 'OK';
  return tx(locale, 'apiHistory.fehler');
}

function sortLabel(sort: HistorySort, locale: Locale): string {
  if (sort === 'new') return tx(locale, 'common.neueste');
  if (sort === 'old') return tx(locale, 'common.aelteste');
  return tx(locale, 'apiHistory.langsamste');
}

export interface ApiHistoryProps {
  entries: CampusLogEntry[];
  locale: Locale;
  selectedUid: string | null;
  onSelect: (uid: string) => void;
}

/**
 * Searchable, filterable, sortable list of C@MPUS portal calls. Tapping a row
 * selects it for the detail panel; the caller owns the selection.
 */
export function ApiHistory({ entries, locale, selectedUid, onSelect }: ApiHistoryProps) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<HistoryStatus>('all');
  const [op, setOp] = useState('all');
  const [sort, setSort] = useState<HistorySort>('new');
  const ops = useMemo(() => [...new Set(entries.map((entry) => entry.op))], [entries]);
  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = entries.filter((entry) => {
      if (status === 'ok' && !entry.ok) return false;
      if (status === 'failed' && entry.ok) return false;
      if (op !== 'all' && entry.op !== op) return false;
      if (needle) {
        const haystack = `${entry.op} ${entry.code ?? ''} ${entry.detail ?? ''} ${entry.request ?? ''} ${entry.response ?? ''} ${entry.studyId ?? ''} ${entry.elementId ?? ''} ${entry.httpStatus ?? ''}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
    const sorted = [...filtered];
    const byTime = (a: CampusLogEntry, b: CampusLogEntry): number =>
      (b.createdAt ?? '').localeCompare(a.createdAt ?? '') || b.id - a.id;
    if (sort === 'new') sorted.sort(byTime);
    if (sort === 'old') sorted.sort((a, b) => -byTime(a, b));
    if (sort === 'slow') sorted.sort((a, b) => b.elapsedMs - a.elapsedMs);
    return sorted;
  }, [entries, query, status, op, sort]);

  if (entries.length === 0) {
    return <Muted>{tx(locale, 'apiHistory.aufrufe_sitzung')}</Muted>;
  }
  return (
    <View style={{ gap: 10 }}>
      <SearchField value={query} onChangeText={setQuery} placeholder={tx(locale, 'common.suchen')} />
      <View style={styles.pills}>
        {statusOrder.map((item) => (
          <Pressable key={item} onPress={() => setStatus(item)}>
            <Pill label={statusLabel(item, locale)} active={status === item} />
          </Pressable>
        ))}
        {ops.map((name) => (
          <Pressable key={name} onPress={() => setOp(name)}>
            <Pill label={name} active={op === name} />
          </Pressable>
        ))}
        {op !== 'all' || status !== 'all' ? (
          <Pressable onPress={() => { setOp('all'); setStatus('all'); }}>
            <Pill label={tx(locale, 'common.zuruecksetzen')} />
          </Pressable>
        ) : null}
      </View>
      <View style={styles.pills}>
        {sortOrder.map((item) => (
          <Pressable key={item} onPress={() => setSort(item)}>
            <Pill label={sortLabel(item, locale)} active={sort === item} />
          </Pressable>
        ))}
      </View>
      <Muted>
        {shown.length === entries.length
          ? tx(locale, 'apiHistory.aufrufe', [entries.length])
          : tx(locale, 'apiHistory.aufrufen', [shown.length, entries.length])}
      </Muted>
      {shown.map((entry) => (
        <View key={entry.uid} style={entry.uid === selectedUid ? styles.selected : undefined}>
          <Card onPress={() => onSelect(entry.uid)}>
            <View style={styles.head}>
              <View style={[styles.dot, { backgroundColor: entry.ok ? colors.success : colors.danger }]} />
              <Text style={styles.op}>{entry.op}</Text>
              <Text style={styles.time}>
                {entry.time} · {entry.elapsedMs}ms
              </Text>
            </View>
            <Text style={styles.ids}>
              {[entry.studyId ? `s=${entry.studyId}` : '', entry.elementId ? `e=${entry.elementId}` : '', entry.httpStatus !== undefined ? `http=${entry.httpStatus}` : '']
                .filter(Boolean)
                .join(' · ') || '–'}
            </Text>
            {!entry.ok ? (
              <Text style={styles.failure} numberOfLines={2}>
                {entry.code ?? '?'}
                {entry.detail ? <Text style={{ fontWeight: '400' }}>{` — ${breakable(entry.detail)}`}</Text> : null}
              </Text>
            ) : null}
          </Card>
        </View>
      ))}
    </View>
  );
}

const styles = {
  pills: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 },
  selected: { borderWidth: 2, borderColor: colors.blue, borderRadius: 20 },
  head: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 99 },
  op: { color: colors.anthracite, fontWeight: '700' as const },
  time: { color: colors.inkSoft, fontSize: 13 },
  ids: { color: colors.inkSoft, fontSize: 13 },
  failure: { color: colors.danger, fontSize: 13, fontWeight: '700' as const },
};
