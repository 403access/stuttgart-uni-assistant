import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Mark } from '@/src/components/ui';
import { student } from '@/src/data';
import { useApp } from '@/src/state/AppState';
import { colors } from '@/src/theme';
import { tx } from '@/src/text';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { locale, setLocale, signIn } = useApp();
  const [account, setAccount] = useState(student.account);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function enter() {
    if (password.trim().length < 1) {
      setError(tx(locale, 'Bitte ein Passwort eintragen. Es bleibt auf dem Gerät und wird verworfen.', 'Enter a password. It stays on the device and is discarded.'));
      return;
    }
    signIn(account);
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.hero}>
        <Mark size={48} />
        <Text style={styles.brand}>Stuttgart Uni</Text>
        <Text style={styles.heroText}>{tx(locale, 'Studienassistenz für den Campusalltag', 'A study assistant for campus life')}</Text>
      </View>
      <View style={styles.sheet}>
        <View style={styles.lang}>
          <Pressable onPress={() => setLocale('de')} style={[styles.langButton, locale === 'de' && styles.langOn]}>
            <Text style={[styles.langText, locale === 'de' && styles.langTextOn]}>Deutsch</Text>
          </Pressable>
          <Pressable onPress={() => setLocale('en')} style={[styles.langButton, locale === 'en' && styles.langOn]}>
            <Text style={[styles.langText, locale === 'en' && styles.langTextOn]}>English</Text>
          </Pressable>
        </View>
        <Text style={styles.notice}>
          {tx(
            locale,
            'Demonstrationsprofil. Es wird keine Verbindung zu SIAM, C@MPUS oder ILIAS aufgebaut. Das Passwort wird nicht gespeichert.',
            'Demonstration profile. This screen does not contact SIAM, C@MPUS, or ILIAS. The password is not stored.',
          )}
        </Text>
        <Text style={styles.label}>{tx(locale, 'ac-Account', 'ac account')}</Text>
        <TextInput
          value={account}
          onChangeText={setAccount}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
          placeholder="st123456"
          placeholderTextColor={colors.mute}
        />
        <Text style={styles.label}>{tx(locale, 'Passwort', 'Password')}</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
          placeholder={tx(locale, 'beliebig, nur für diese Sitzung', 'anything, for this session only')}
          placeholderTextColor={colors.mute}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button label={tx(locale, 'Demonstrationsprofil öffnen', 'Open demonstration profile')} onPress={enter} />
        <Text style={styles.footer}>
          {tx(
            locale,
            `Geladen wird der Datensatz von ${student.name}, ${student.matriculation}. Ein späterer SIAM-Anschluss wäre OpenID Connect über den Universitätsserver, nicht dieses Formular.`,
            `This loads the record of ${student.name}, ${student.matriculation}. A later SIAM connection would be OpenID Connect on a university server, not this form.`,
          )}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.blue },
  hero: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 36, gap: 8 },
  brand: { color: '#FFFFFF', fontSize: 36, fontWeight: '700', letterSpacing: -0.8 },
  heroText: { color: '#D6E4F5', fontSize: 16, lineHeight: 22 },
  sheet: {
    flex: 1,
    backgroundColor: colors.paper,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    gap: 10,
  },
  lang: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  langButton: { borderRadius: 999, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12, paddingVertical: 6 },
  langOn: { backgroundColor: colors.blue, borderColor: colors.blue },
  langText: { color: colors.anthracite, fontWeight: '700' },
  langTextOn: { color: '#FFFFFF' },
  notice: { backgroundColor: colors.lightSoft, color: colors.anthracite, borderRadius: 14, padding: 12, lineHeight: 20 },
  label: { color: colors.inkSoft, fontSize: 13, fontWeight: '700', marginTop: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.anthracite,
  },
  error: { color: colors.danger, fontSize: 14 },
  footer: { color: colors.inkSoft, fontSize: 13, lineHeight: 19, marginTop: 8 },
});
