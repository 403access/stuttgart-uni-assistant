import { Stack } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { universityUrls } from '@/src/auth/oidc';
import { assistantUrl } from '@/src/assistant/remote';
import { Button, Card, Screen } from '@/src/components/ui';
import { useApp } from '@/src/state/AppState';
import { colors, themedStyle } from '@/src/theme';
import { tx } from '@/src/text';

export default function SettingsScreen() {
  const { locale, setLocale, reset } = useApp();
  return (
    <Screen kicker={tx(locale, 'common.app')}>
      <Stack.Screen options={{ title: tx(locale, 'common.einstellungen') }} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable onPress={() => setLocale('de')} style={[{ ...chip }, locale === 'de' && { ...chipOn }]}>
          <Text style={[{ ...chipText }, locale === 'de' && chipTextOn]}>Deutsch</Text>
        </Pressable>
        <Pressable onPress={() => setLocale('en')} style={[{ ...chip }, locale === 'en' && { ...chipOn }]}>
          <Text style={[{ ...chipText }, locale === 'en' && chipTextOn]}>English</Text>
        </Pressable>
      </View>
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

const chip = themedStyle((colors) => ({
  borderRadius: 999,
  borderWidth: 1,
  borderColor: colors.line,
  paddingHorizontal: 14,
  paddingVertical: 8,
  backgroundColor: colors.paper,
}));
const chipOn = themedStyle((colors) => ({ backgroundColor: colors.brand, borderColor: colors.brand }));
const chipText = themedStyle((colors) => ({ color: colors.anthracite, fontWeight: '700' as const }));
const chipTextOn = { color: '#FFFFFF', fontWeight: '700' as const };
