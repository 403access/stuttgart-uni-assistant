import { router } from 'expo-router';
import { Linking, Pressable, Text, View } from 'react-native';

import { ResponsiveGrid } from '@/src/components/responsive-grid';
import { Card, Pill, Section } from '@/src/components/ui';
import { hay, tx } from '@/src/text';
import { themedStyles } from '@/src/theme';
import type { Locale } from '@/src/types';

import type { IliasDashboard, IliasItem } from '../types';

/** Dashboard category as selected in the ILIAS drawer. */
export type IliasFilter = 'all' | 'courses' | 'groups' | 'news' | 'mails' | 'tasks';

/** Drawer label for one dashboard category. */
export function iliasFilterLabel(filter: IliasFilter, locale: Locale): string {
  switch (filter) {
    case 'courses':
      return tx(locale, 'tabsIlias.kurse');
    case 'groups':
      return tx(locale, 'tabsIlias.gruppen');
    case 'news':
      return tx(locale, 'tabsIlias.news');
    case 'mails':
      return tx(locale, 'tabsIlias.mails');
    case 'tasks':
      return tx(locale, 'tabsIlias.todos');
    default:
      return tx(locale, 'tabsIlias.alle');
  }
}

function itemMeta(item: IliasItem): string {
  const property = item.properties.find((entry) => /lerngruppe|anmeldung|lernfortschritt|datum|zeit|von/i.test(entry.name));
  return property ? `${property.name}: ${property.value}` : item.date || item.description;
}

function matchesQuery(item: IliasItem, needle: string): boolean {
  if (!needle) return true;
  const fields = [
    item.title,
    item.description,
    item.group,
    item.type,
    item.date,
    ...item.properties.flatMap((entry) => [entry.name, entry.value]),
  ];
  return fields.some((value) => hay(value).includes(needle));
}

function ItemRow({ item, onOpen }: { item: IliasItem; onOpen: (item: IliasItem) => void }) {
  const inApp = Boolean(item.refId) && (item.kind === 'crs' || item.kind === 'grp');
  return (
    <Pressable
      disabled={!item.url && !inApp}
      onPress={() => onOpen(item)}
      style={(state: { pressed: boolean; hovered?: boolean }) => [
        styles.item,
        state.hovered && styles.itemHover,
        state.pressed && styles.pressed,
      ]}>
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

/**
 * The dashboard rows for one drawer category. Courses and groups are slices of
 * `memberships`, so the "all" view lists them separately without duplicates.
 */
export function IliasDashboardView({
  dashboard,
  locale,
  filter,
  query,
}: {
  dashboard: IliasDashboard;
  locale: Locale;
  filter: IliasFilter;
  query: string;
}) {
  const needle = hay(query.trim());
  const sections =
    filter === 'all'
      ? [
          { id: 'courses', title: tx(locale, 'tabsIlias.kurse'), items: dashboard.courses },
          { id: 'groups', title: tx(locale, 'tabsIlias.gruppen'), items: dashboard.groups },
          { id: 'news', title: tx(locale, 'tabsIlias.news'), items: dashboard.news },
          { id: 'mails', title: tx(locale, 'tabsIlias.mails'), items: dashboard.mails },
          { id: 'tasks', title: tx(locale, 'tabsIlias.todos'), items: dashboard.tasks },
        ]
      : [
          {
            id: filter,
            title: iliasFilterLabel(filter, locale),
            items:
              filter === 'courses'
                ? dashboard.courses
                : filter === 'groups'
                  ? dashboard.groups
                  : filter === 'news'
                    ? dashboard.news
                    : filter === 'mails'
                      ? dashboard.mails
                      : dashboard.tasks,
          },
        ];
  const visible = sections
    .map((section) => ({ ...section, items: section.items.filter((item) => matchesQuery(item, needle)) }))
    .filter((section) => section.items.length > 0);

  const open = (item: IliasItem) => {
    // Courses and groups have a readable content page; the app renders it
    // instead of handing the user back to the browser.
    if ((item.kind === 'crs' || item.kind === 'grp') && item.refId) {
      router.push({
        pathname: '/ilias/[refId]',
        params: { refId: String(item.refId), kind: item.kind, title: item.title },
      });
      return;
    }
    if (item.url) Linking.openURL(item.url).catch(() => undefined);
  };

  if (!visible.length) {
    return (
      <>
        <Card>
          <Text style={styles.empty}>{tx(locale, 'tabsIlias.leer')}</Text>
        </Card>
        <Text style={styles.footer}>{tx(locale, 'tabsIlias.fussnote')}</Text>
      </>
    );
  }

  return (
    <>
      {visible.map((section) => (
        <View key={section.id} style={styles.group}>
          <Section title={`${section.title} · ${section.items.length}`} />
          <ResponsiveGrid minColumnWidth={320} gap={8}>
            {section.items.map((item) => (
              <ItemRow key={`${section.id}-${item.id}`} item={item} onOpen={open} />
            ))}
          </ResponsiveGrid>
        </View>
      ))}
      <Text style={styles.footer}>{tx(locale, 'tabsIlias.fussnote')}</Text>
    </>
  );
}

const styles = themedStyles((colors) => ({
  group: { gap: 8 },
  item: {
    backgroundColor: colors.paper,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    gap: 5,
    cursor: 'pointer',
  },
  itemHover: { borderColor: colors.light },
  pressed: { opacity: 0.72 },
  itemTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  itemTitle: { flex: 1, color: colors.anthracite, fontSize: 15, fontWeight: '600', lineHeight: 20 },
  itemGroup: { color: colors.blue, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  itemText: { color: colors.inkSoft, fontSize: 13, lineHeight: 18 },
  itemMeta: { color: colors.mute, fontSize: 12 },
  empty: { color: colors.inkSoft, fontSize: 14, lineHeight: 20 },
  footer: { color: colors.mute, fontSize: 12, lineHeight: 17, textAlign: 'center' },
}));
