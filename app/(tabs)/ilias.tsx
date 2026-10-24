import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, Text, useWindowDimensions, View } from 'react-native';
import { Drawer } from 'react-native-drawer-layout';

import { DrawerPanel } from '@/src/components/drawer-panel';
import { OptionRows, type DropdownOption } from '@/src/components/option-rows';
import { Screen } from '@/src/components/ui';
import { IliasDashboardView, iliasFilterLabel, type IliasFilter } from '@/src/ilias/components/ilias-dashboard';
import { IliasToolbar } from '@/src/ilias/components/ilias-toolbar';
import { useIlias } from '@/src/ilias/use-ilias';
import { useAppSelector } from '@/src/state/AppState';
import { colors, themedStyles } from '@/src/theme';
import { formatTimestamp, tx } from '@/src/text';

/**
 * ILIAS is connected automatically from the signed-in C@MPUS session, so this
 * tab never offers a manual login. Categories and account actions live in the
 * left drawer; the sticky bar carries search and refresh.
 */
export default function IliasScreen() {
  const locale = useAppSelector((state) => state.locale);
  const ilias = useIlias();
  const [menuOpen, setMenuOpen] = useState(false);
  const [filter, setFilter] = useState<IliasFilter>('all');
  const [query, setQuery] = useState('');
  const { width } = useWindowDimensions();
  const drawerWidth = Math.min(340, Math.round(width * 0.86));
  const dashboard = ilias.dashboard;
  const connected = Boolean(ilias.status?.sessionActive && dashboard);
  const counts = dashboard?.counts;

  const closeMenu = () => setMenuOpen(false);

  const filterOptions: DropdownOption[] =
    dashboard && counts
      ? [
          {
            key: 'all',
            label: tx(locale, 'tabsIlias.alle'),
            meta: String(counts.memberships + counts.news + counts.mails + counts.tasks),
            selected: filter === 'all',
            group: tx(locale, 'tabsIlias.bereiche'),
          },
          ...(['courses', 'groups', 'news', 'mails', 'tasks'] as const).map((option) => ({
            key: option,
            label: iliasFilterLabel(option, locale),
            meta: String(counts[option]),
            selected: filter === option,
            group: tx(locale, 'tabsIlias.bereiche'),
          })),
        ]
      : [];

  const toolbar = connected ? (
    <IliasToolbar
      locale={locale}
      query={query}
      onQueryChange={setQuery}
      onOpenMenu={() => setMenuOpen(true)}
    />
  ) : undefined;

  return (
    <Drawer
      open={menuOpen}
      onOpen={() => setMenuOpen(true)}
      onClose={closeMenu}
      drawerPosition="left"
      drawerType="front"
      swipeEnabled={connected}
      drawerStyle={{ width: drawerWidth }}
      overlayAccessibilityLabel={tx(locale, 'common.schliessen')}
      renderDrawerContent={() => (
        <DrawerPanel
          title={tx(locale, 'tabsIlias.drawer_menu')}
          closeLabel={tx(locale, 'common.schliessen')}
          onClose={closeMenu}>
          {dashboard ? (
            <View style={styles.account}>
              <Text style={styles.accountName}>{dashboard.name || dashboard.account || tx(locale, 'tabsIlias.ilias')}</Text>
              <Text style={styles.accountStamp}>
                {tx(locale, 'tabsIlias.stand', [formatTimestamp(dashboard.fetchedAt, locale)])}
              </Text>
            </View>
          ) : null}
          <OptionRows
            options={filterOptions}
            onSelect={(key) => {
              setFilter(key as IliasFilter);
              closeMenu();
            }}
          />
          <Text style={styles.drawerGroup}>{tx(locale, 'tabsIlias.aktionen')}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              closeMenu();
              void ilias.pullToRefresh();
            }}
            style={({ pressed }) => [styles.drawerAction, pressed && styles.pressed]}>
            <MaterialIcons name="refresh" size={18} color={colors.blue} />
            <Text style={[styles.drawerActionText, styles.drawerActionBlue]}>
              {tx(locale, 'tabsIlias.aktualisieren')}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              closeMenu();
              void ilias.disconnect();
            }}
            style={({ pressed }) => [styles.drawerAction, pressed && styles.pressed]}>
            <MaterialIcons name="link-off" size={18} color={colors.danger} />
            <Text style={styles.drawerActionText}>
              {ilias.busy ? tx(locale, 'tabsIlias.trennt') : tx(locale, 'tabsIlias.trennen')}
            </Text>
          </Pressable>
        </DrawerPanel>
      )}>
      <Screen
        topInset
        stickyHeader={toolbar}
        refreshControl={
          connected ? (
            <RefreshControl
              refreshing={ilias.refreshing}
              onRefresh={ilias.pullToRefresh}
              tintColor={colors.blue}
              colors={[colors.blue]}
              progressBackgroundColor={colors.paper}
            />
          ) : undefined
        }>
        {connected && dashboard ? (
          <IliasDashboardView dashboard={dashboard} locale={locale} filter={filter} query={query} />
        ) : (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.blue} />
            <Text style={styles.loadingLabel}>{tx(locale, 'tabsIlias.laedt')}</Text>
          </View>
        )}
        {ilias.error ? <Text style={styles.error}>{ilias.error}</Text> : null}
      </Screen>
    </Drawer>
  );
}

const styles = themedStyles((colors) => ({
  account: { gap: 3, paddingBottom: 12 },
  accountName: { color: colors.anthracite, fontSize: 20, fontWeight: '700' },
  accountStamp: { color: colors.inkSoft, fontSize: 12 },
  drawerGroup: {
    alignSelf: 'flex-start',
    color: colors.inkSoft,
    backgroundColor: colors.mist,
    borderRadius: 8,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 16,
    marginBottom: 2,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  drawerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  drawerActionText: { flex: 1, color: colors.danger, fontSize: 15, fontWeight: '600' },
  drawerActionBlue: { color: colors.blue },
  pressed: { opacity: 0.72 },
  loading: { alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 40 },
  loadingLabel: { color: colors.inkSoft, fontSize: 14, lineHeight: 20 },
  error: { color: colors.danger, fontSize: 14, lineHeight: 20 },
}));
