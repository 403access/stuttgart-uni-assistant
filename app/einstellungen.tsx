import { Stack } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { universityUrls } from '@/src/auth/oidc';
import { assistantUrl } from '@/src/assistant/remote';
import { Button, Card, Screen } from '@/src/components/ui';
import { useApp } from '@/src/state/AppState';
import { colors } from '@/src/theme';
import { tx } from '@/src/text';

export default function SettingsScreen() {
  const { locale, setLocale, reset } = useApp();
  return (
    <Screen kicker={tx(locale, 'App', 'App')}>
      <Stack.Screen options={{ title: tx(locale, 'Einstellungen', 'Settings') }} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable onPress={() => setLocale('de')} style={[chip, locale === 'de' && chipOn]}>
          <Text style={{ color: locale === 'de' ? '#FFFFFF' : colors.anthracite, fontWeight: '700' }}>Deutsch</Text>
        </Pressable>
        <Pressable onPress={() => setLocale('en')} style={[chip, locale === 'en' && chipOn]}>
          <Text style={{ color: locale === 'en' ? '#FFFFFF' : colors.anthracite, fontWeight: '700' }}>English</Text>
        </Pressable>
      </View>
      <Card>
        <Text style={{ color: colors.anthracite, fontWeight: '700' }}>{tx(locale, 'Assistenz-Server', 'Assistant server')}</Text>
        <Text style={{ color: colors.inkSoft }}>{assistantUrl}</Text>
        <Text style={{ color: colors.inkSoft, lineHeight: 20 }}>
          {tx(
            locale,
            'Der Schlüssel XAI_API_KEY bleibt im Serverprozess. Die App sendet nur Frage und Demonstrationskontext an diese Adresse.',
            'The XAI_API_KEY stays in the server process. The app sends only the question and the demonstration context to this address.',
          )}
        </Text>
      </Card>
      <Card>
        <Text style={{ color: colors.anthracite, lineHeight: 22 }}>
          {tx(
            locale,
            'University Assistant ist ein studentisches Demonstrationsprojekt. Es ist kein Angebot der Universität Stuttgart und verwendet nicht das amtliche Logo.',
            'University Assistant is a student demonstration project. It is not a service of the University of Stuttgart and does not use the official logo.',
          )}
        </Text>
      </Card>
      <Card>
        <Text style={{ color: colors.anthracite, fontWeight: '700' }}>{tx(locale, 'Universitätslogin', 'University sign-in')}</Text>
        <Text style={{ color: colors.inkSoft, lineHeight: 20 }}>{universityUrls.authorize}</Text>
        <Text style={{ color: colors.inkSoft, lineHeight: 20 }}>
          {tx(
            locale,
            'Client-ID und Secret liegen in der .env des Servers. Ein Passwort wird dort nicht gelesen. Abmelden widerruft das Token auf dem Server, soweit die Sitzung noch im Speicher liegt.',
            'The client id and secret live in the server .env. A password is not read there. Sign-out revokes the token on the server while that session is still in memory.',
          )}
        </Text>
      </Card>
      <Button label={tx(locale, 'Lokale Ergänzungen zurücksetzen', 'Reset local additions')} onPress={reset} secondary />
    </Screen>
  );
}

const chip = { borderRadius: 999, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.paper };
const chipOn = { backgroundColor: colors.blue, borderColor: colors.blue };
