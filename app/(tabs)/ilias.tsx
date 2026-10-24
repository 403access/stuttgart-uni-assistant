import { ActivityIndicator, RefreshControl, Text, View } from 'react-native';

import { Screen } from '@/src/components/ui';
import { IliasDashboardView } from '@/src/ilias/components/ilias-dashboard';
import { useIlias } from '@/src/ilias/use-ilias';
import { useAppSelector } from '@/src/state/AppState';
import { colors, themedStyles } from '@/src/theme';
import { tx } from '@/src/text';

/**
 * ILIAS is connected automatically from the signed-in C@MPUS session, so this
 * tab never offers a manual login. Until the dashboard is there it only shows
 * a loading state, including while the background session is being restored.
 */
export default function IliasScreen() {
  const locale = useAppSelector((state) => state.locale);
  const ilias = useIlias();
  const connected = Boolean(ilias.status?.sessionActive && ilias.dashboard);

  return (
    <Screen
      topInset
      kicker="ILIAS"
      title={connected ? ilias.dashboard?.name || tx(locale, 'tabsIlias.ilias') : tx(locale, 'tabsIlias.titel')}
      subtitle={tx(locale, 'tabsIlias.untertitel')}
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
      {connected && ilias.dashboard ? (
        <IliasDashboardView
          dashboard={ilias.dashboard}
          locale={locale}
          busy={ilias.busy}
          onRefresh={ilias.refresh}
          onDisconnect={ilias.disconnect}
        />
      ) : (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.blue} />
          <Text style={styles.loadingLabel}>{tx(locale, 'tabsIlias.laedt')}</Text>
        </View>
      )}
      {ilias.error ? <Text style={styles.error}>{ilias.error}</Text> : null}
    </Screen>
  );
}

const styles = themedStyles((colors) => ({
  loading: { alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 40 },
  loadingLabel: { color: colors.inkSoft, fontSize: 14, lineHeight: 20 },
  error: { color: colors.danger, fontSize: 14, lineHeight: 20 },
}));
