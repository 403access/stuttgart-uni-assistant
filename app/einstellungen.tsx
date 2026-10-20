import { Stack } from 'expo-router';
import { Text } from 'react-native';

import { universityUrls } from '@/src/auth/oidc';
import { assistantUrl } from '@/src/assistant/remote';
import { Button, Card, Screen } from '@/src/components/ui';
import { useApp } from '@/src/state/AppState';
import { colors } from '@/src/theme';
import { tx } from '@/src/text';

export default function SettingsScreen() {
  const { locale, reset } = useApp();
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
