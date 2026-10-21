import { useState } from 'react';
import { RefreshControl, Text } from 'react-native';

import { Screen } from '@/src/components/ui';
import { iliasAccountFrom } from '@/src/ilias/account';
import { IliasConnectionPanel } from '@/src/ilias/components/ilias-connection-panel';
import { IliasDashboardView } from '@/src/ilias/components/ilias-dashboard';
import { useIlias } from '@/src/ilias/use-ilias';
import { useAppSelector } from '@/src/state/AppState';
import { colors, themedStyles } from '@/src/theme';
import { tx } from '@/src/text';

export default function IliasScreen() {
  const locale = useAppSelector((state) => state.locale);
  const sessionAccount = useAppSelector((state) => state.sessionAccount);
  const sessionEmail = useAppSelector((state) => state.sessionEmail);
  const ilias = useIlias();
  const [account, setAccount] = useState(() => iliasAccountFrom(sessionEmail || sessionAccount));
  const [password, setPassword] = useState('');
  const [cookie, setCookie] = useState('');
  const connected = ilias.status?.sessionActive && ilias.dashboard;

  const submit = () => {
    if (cookie.trim()) ilias.connect({ cookie });
    else ilias.connect({ account, password });
  };

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
      {ilias.loading && !ilias.status ? (
        <Text style={styles.loading}>{tx(locale, 'tabsIlias.laedt')}</Text>
      ) : connected && ilias.dashboard ? (
        <IliasDashboardView
          dashboard={ilias.dashboard}
          locale={locale}
          busy={ilias.busy}
          onRefresh={ilias.refresh}
          onDisconnect={ilias.disconnect}
        />
      ) : (
        <IliasConnectionPanel
          status={ilias.status}
          sessionAccount={sessionAccount}
          account={account}
          password={password}
          cookie={cookie}
          busy={ilias.busy}
          note={ilias.note}
          error={ilias.error}
          locale={locale}
          savedLogin={ilias.savedLogin}
          onAccountChange={setAccount}
          onPasswordChange={setPassword}
          onCookieChange={setCookie}
          onUseSaved={ilias.connectSaved}
          onConnect={submit}
        />
      )}
      {connected && ilias.error ? <Text style={styles.error}>{ilias.error}</Text> : null}
    </Screen>
  );
}

const styles = themedStyles((colors) => ({
  loading: { color: colors.inkSoft, fontSize: 14, lineHeight: 20 },
  error: { color: colors.danger, fontSize: 14, lineHeight: 20 },
}));
