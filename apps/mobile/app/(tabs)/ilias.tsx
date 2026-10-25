import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, Text, useWindowDimensions, View } from 'react-native';
import { Drawer } from 'react-native-drawer-layout';

import { DrawerPanel , useResponsive } from '@ua/ui';
import { OptionRows, type DropdownOption } from '@ua/ui';
import { Button, Card, Screen } from '@/src/components/ui';
import { IliasDashboardView, iliasFilterLabel, type IliasFilter } from '@/src/ilias/components/ilias-dashboard';
import { IliasToolbar } from '@/src/ilias/components/ilias-toolbar';
import { useIlias } from '@/src/ilias/use-ilias';
import { useAppSelector } from '@/src/state/AppState';
import { colors, themedStyles } from '@ua/ui/theme';
import { formatTimestamp, tx } from '@ua/core/format';
import type { Locale } from '@ua/core/domain/types';

const ILIAS_BASE = 'https://ilias3.uni-stuttgart.de';

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
  const { isDesktop } = useResponsive();
  const { width } = useWindowDimensions();
  const drawerWidth = Math.min(340, Math.round(width * 0.86));
  const dashboard = ilias.dashboard;
  const connected = Boolean(ilias.status?.sessionActive && dashboard);
  const counts = dashboard?.counts;
  const message = ilias.unsupported
    ? tx(locale, 'tabsIlias.nur_konto')
    : ilias.reason === 'ilias_credentials_missing'
      ? tx(locale, 'tabsIlias.anmeldung_fehlt')
      : ilias.error || tx(locale, 'tabsIlias.verbindung_fehler');

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
      showMenu={!isDesktop}
    />
  ) : undefined;

  const refreshControl = connected ? (
    <RefreshControl
      refreshing={ilias.refreshing}
      onRefresh={ilias.pullToRefresh}
      tintColor={colors.blue}
      colors={[colors.blue]}
      progressBackgroundColor={colors.paper}
    />
  ) : undefined;

  /** Account, categories and actions: drawer body on the phone, left rail on the desktop. */
  const categories = (
    <>
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
    </>
  );

  const body = connected && dashboard ? (
    <IliasDashboardView dashboard={dashboard} locale={locale} filter={filter} query={query} />
  ) : ilias.loading && !ilias.unsupported ? (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.blue} />
      <Text style={styles.loadingLabel}>{tx(locale, 'tabsIlias.laedt')}</Text>
    </View>
  ) : (
    <IliasUnavailable
      locale={locale}
      message={message}
      actionLabel={
        ilias.unsupported
          ? tx(locale, 'tabsIlias.konto_wechseln')
          : ilias.canRetry
            ? ilias.savedLogin?.biometrics
              ? tx(locale, 'tabsIlias.entsperren')
              : tx(locale, 'tabsIlias.erneut')
            : undefined
      }
      onAction={() => {
        if (ilias.unsupported) router.push('/konto');
        else void ilias.retry();
      }}
    />
  );

  const errorLine = connected && ilias.error ? <Text style={styles.error}>{ilias.error}</Text> : null;

  if (isDesktop) {
    if (!connected) {
      return (
        <Screen topInset wide stickyHeader={toolbar} refreshControl={refreshControl}>
          {body}
          {errorLine}
        </Screen>
      );
    }
    return (
      <Screen topInset wide stickyHeader={toolbar} refreshControl={refreshControl}>
        <View style={styles.desktopColumns}>
          <View style={styles.desktopRail}>{categories}</View>
          <View style={styles.desktopMain}>
            {body}
            {errorLine}
          </View>
        </View>
      </Screen>
    );
  }

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
          {categories}
        </DrawerPanel>
      )}>
      <Screen topInset stickyHeader={toolbar} refreshControl={refreshControl}>
        {body}
        {errorLine}
      </Screen>
    </Drawer>
  );
}

/** The explained non-connected state; it never turns back into a login form. */
function IliasUnavailable({
  locale,
  message,
  actionLabel,
  onAction,
}: {
  locale: Locale;
  message: string;
  actionLabel?: string;
  onAction: () => void;
}) {
  return (
    <Card>
      <Text style={styles.offlineTitle}>{tx(locale, 'tabsIlias.nicht_verbunden')}</Text>
      <Text style={styles.hint}>{message}</Text>
      {actionLabel ? <Button label={actionLabel} onPress={onAction} /> : null}
      <Button
        secondary
        label={tx(locale, 'tabsIlias.im_browser')}
        onPress={() => void WebBrowser.openBrowserAsync(ILIAS_BASE).catch(() => undefined)}
      />
    </Card>
  );
}

const styles = themedStyles((colors) => ({
  desktopColumns: { flexDirection: 'row', alignItems: 'flex-start', gap: 24 },
  desktopRail: {
    width: 280,
    flexShrink: 0,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  desktopMain: { flex: 1, minWidth: 0, gap: 14 },
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
  offlineTitle: { color: colors.anthracite, fontSize: 17, fontWeight: '700' },
  hint: { color: colors.inkSoft, fontSize: 14, lineHeight: 20 },
  error: { color: colors.danger, fontSize: 14, lineHeight: 20 },
}));
