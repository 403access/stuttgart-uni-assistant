import { useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';

import { Button, Card, Pill } from '@/src/components/ui';
import { themedStyles } from '@/src/theme';
import { tx } from '@/src/text';
import type { Locale } from '@/src/types';

import type { IliasDashboard, IliasItem } from '../types';
type Filter = 'all' | 'courses' | 'groups' | 'news' | 'mails' | 'tasks';

function formatStamp(value: string, locale: Locale): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '–';
  return parsed.toLocaleString(locale === 'de' ? 'de-DE' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

function itemMeta(item: IliasItem): string {
  const property = item.properties.find((entry) => /lerngruppe|anmeldung|lernfortschritt|datum|zeit|von/i.test(entry.name));
  return property ? `${property.name}: ${property.value}` : item.date || item.description;
}

function ItemRow({ item, onOpen }: { item: IliasItem; onOpen: (url: string) => void }) {
  return (
    <Pressable
      disabled={!item.url}
      onPress={() => onOpen(item.url)}
      style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
      <View style={styles.itemTop}>
        <Text style={styles.itemTitle} numberOfLines={2}>
          {item.title}
        </Text>
        {item.type ? <Pill label={item.type} tone="neutral" /> : null}
      </View>
      {item.group ? <Text style={styles.itemGroup}>{item.group}</Text> : null}
      {item.description ? (
        <Text style={styles.itemText} numberOfLines={2}>
          {item.description}
        </Text>
      ) : null}
      {itemMeta(item) ? (
        <Text style={styles.itemMeta} numberOfLines={1}>
          {itemMeta(item)}
        </Text>
      ) : null}
    </Pressable>
  );
}

export function IliasDashboardView({
  dashboard,
  locale,
  busy,
  onRefresh,
  onDisconnect,
}: {
  dashboard: IliasDashboard;
  locale: Locale;
  busy: boolean;
  onRefresh: () => void;
  onDisconnect: () => void;
}) {
  const [filter, setFilter] = useState<Filter>('all');
  const counts = dashboard.counts;
  const filters: { id: Filter; label: string; count: number }[] = [
    { id: 'all', label: tx(locale, 'tabsIlias.alle'), count: counts.memberships + counts.news + counts.mails + counts.tasks },
    { id: 'courses', label: tx(locale, 'tabsIlias.kurse'), count: counts.courses },
    { id: 'groups', label: tx(locale, 'tabsIlias.gruppen'), count: counts.groups },
    { id: 'news', label: tx(locale, 'tabsIlias.news'), count: counts.news },
    { id: 'mails', label: tx(locale, 'tabsIlias.mails'), count: counts.mails },
    { id: 'tasks', label: tx(locale, 'tabsIlias.todos'), count: counts.tasks },
  ];
  const rows =
    filter === 'courses'
      ? dashboard.courses
      : filter === 'groups'
        ? dashboard.groups
        : filter === 'news'
          ? dashboard.news
          : filter === 'mails'
            ? dashboard.mails
            : filter === 'tasks'
              ? dashboard.tasks
              : [...dashboard.memberships, ...dashboard.news, ...dashboard.mails, ...dashboard.tasks];

  const open = (url: string) => {
    if (url) Linking.openURL(url).catch(() => undefined);
  };

  return (
    <>
      <Card>
        <View style={styles.header}>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={styles.brand}>ILIAS</Text>
            <Text style={styles.who}>{dashboard.name || dashboard.account || tx(locale, 'tabsIlias.ilias')}</Text>
            <Text style={styles.stamp}>{tx(locale, 'tabsIlias.stand', [formatStamp(dashboard.fetchedAt, locale)])}</Text>
          </View>
          <Pill tone="ok" label={tx(locale, 'tabsIlias.verbunden')} />
        </View>
        <View style={styles.counts}>
          <Count label={tx(locale, 'tabsIlias.kurse')} value={counts.courses} />
          <Count label={tx(locale, 'tabsIlias.gruppen')} value={counts.groups} />
          <Count label={tx(locale, 'tabsIlias.news')} value={counts.news} />
          <Count label={tx(locale, 'tabsIlias.mails')} value={counts.mails} />
          <Count label={tx(locale, 'tabsIlias.todos')} value={counts.tasks} />
        </View>
        <View style={styles.actions}>
          <Button label={tx(locale, 'tabsIlias.aktualisieren')} onPress={onRefresh} secondary />
          <Button label={busy ? tx(locale, 'tabsIlias.trennt') : tx(locale, 'tabsIlias.trennen')} onPress={onDisconnect} secondary />
        </View>
      </Card>

      <View style={styles.chips}>
        {filters.map((entry) => (
          <Pressable
            key={entry.id}
            onPress={() => setFilter(entry.id)}
            style={[styles.chip, filter === entry.id && styles.chipActive]}>
            <Text style={[styles.chipText, filter === entry.id && styles.chipTextActive]}>
              {entry.label} · {entry.count}
            </Text>
          </Pressable>
        ))}
      </View>

      {rows.length ? (
        <View style={styles.list}>
          {rows.map((item) => (
            <ItemRow key={`${item.kind}-${item.id}`} item={item} onOpen={open} />
          ))}
        </View>
      ) : (
        <Card>
          <Text style={styles.empty}>{tx(locale, 'tabsIlias.leer')}</Text>
        </Card>
      )}
      <Text style={styles.footer}>{tx(locale, 'tabsIlias.fussnote')}</Text>
    </>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.count}>
      <Text style={styles.countValue}>{value}</Text>
      <Text style={styles.countLabel}>{label}</Text>
    </View>
  );
}

const styles = themedStyles((colors) => ({
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  brand: { color: colors.blue, fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  who: { color: colors.anthracite, fontSize: 20, fontWeight: '700' },
  stamp: { color: colors.inkSoft, fontSize: 12 },
  counts: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  count: { flexGrow: 1, minWidth: 62, backgroundColor: colors.mist, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  countValue: { color: colors.anthracite, fontSize: 18, fontWeight: '700' },
  countLabel: { color: colors.inkSoft, fontSize: 11 },
  actions: { flexDirection: 'row', gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderRadius: 999, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: colors.paper },
  chipActive: { backgroundColor: colors.anthracite, borderColor: colors.anthracite },
  chipText: { color: colors.inkSoft, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: colors.paper },
  list: { gap: 8 },
  item: { backgroundColor: colors.paper, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 14, gap: 5 },
  pressed: { opacity: 0.72 },
  itemTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  itemTitle: { flex: 1, color: colors.anthracite, fontSize: 15, fontWeight: '600', lineHeight: 20 },
  itemGroup: { color: colors.blue, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  itemText: { color: colors.inkSoft, fontSize: 13, lineHeight: 18 },
  itemMeta: { color: colors.mute, fontSize: 12 },
  empty: { color: colors.inkSoft, fontSize: 14, lineHeight: 20 },
  footer: { color: colors.mute, fontSize: 12, lineHeight: 17, textAlign: 'center' },
}));
