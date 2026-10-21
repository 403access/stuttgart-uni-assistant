import { Stack, router } from 'expo-router';
import { Text, View } from 'react-native';

import { universityUrls } from '@/src/auth/oidc';
import { assistantUrl } from '@/src/assistant/remote';
import { Button, Card, InfoRow, Screen, Section } from '@/src/components/ui';
import { useAppSelector, appActions } from '@/src/state/AppState';
import { colors } from '@/src/theme';
import { tx } from '@/src/text';

export default function SettingsScreen() {
  const locale = useAppSelector((state) => state.locale);
  const authToken = useAppSelector((state) => state.authToken);
  const { reset } = appActions;
  return (
    <Screen kicker={tx(locale, 'common.app')}>
      <Stack.Screen options={{ title: tx(locale, 'common.einstellungen') }} />
      <Card>
        <Text style={{ color: colors.anthracite, fontWeight: '700' }}>{tx(locale, 'einstellungen.assistenz')}</Text>
        <Text style={{ color: colors.inkSoft }}>{assistantUrl}</Text>
        <Text style={{ color: colors.inkSoft, lineHeight: 20 }}>
          {tx(locale, 'einstellungen.schluessel')}
        </Text>
      </Card>
      <Section title={tx(locale, 'einstellungen.geraet_titel')} />
      <View>
        <InfoRow
          title={tx(locale, 'einstellungen.geraet_verknuepfen')}
          detail={tx(locale, authToken ? 'einstellungen.geraet_text' : 'einstellungen.geraet_offline')}
          onPress={() => router.push('/geraet-verknuepfen')}
        />
      </View>
      <Card>
        <Text style={{ color: colors.anthracite, lineHeight: 22 }}>
          {tx(locale, 'einstellungen.university')}
        </Text>
      </Card>
      <Card>
        <Text style={{ color: colors.anthracite, fontWeight: '700' }}>{tx(locale, 'einstellungen.universitaetslogin')}</Text>
        <Text style={{ color: colors.inkSoft, lineHeight: 20 }}>{universityUrls.authorize}</Text>
        <Text style={{ color: colors.inkSoft, lineHeight: 20 }}>
          {tx(locale, 'einstellungen.client')}
        </Text>
      </Card>
      <Button label={tx(locale, 'einstellungen.lokale')} onPress={reset} secondary />
    </Screen>
  );
}
