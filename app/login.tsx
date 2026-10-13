import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fetchOidcStatus, signInWithUniversity, universityRedirectUri, universityUrls, type OidcStatus } from '@/src/auth/oidc';
import { Button, Mark } from '@/src/components/ui';
import { student } from '@/src/data';
import { useApp } from '@/src/state/AppState';
import { colors } from '@/src/theme';
import { tx } from '@/src/text';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { locale, setLocale, signInDemo, signInOidc } = useApp();
  const [status, setStatus] = useState<OidcStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const redirectUri = universityRedirectUri();

  useEffect(() => {
    let active = true;
    fetchOidcStatus().then((next) => {
      if (active) setStatus(next);
    });
    return () => {
      active = false;
    };
  }, []);

  async function enterWithSiam() {
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      const profile = await signInWithUniversity();
      signInOidc(profile);
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : 'oidc_failed';
      setError(messageFor(locale, code, status));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.hero}>
        <Mark size={48} />
        <Text style={styles.brand}>Stuttgart Uni</Text>
        <Text style={styles.heroText}>{tx(locale, 'Studienassistenz für den Campusalltag', 'A study assistant for campus life')}</Text>
      </View>
      <ScrollView style={styles.sheet} contentContainerStyle={[styles.sheetContent, { paddingBottom: insets.bottom + 24 }]}>
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
            'SIAM ist das Nutzerkonto. Die Anmeldung selbst läuft über den Identity Provider des TIK, denselben, den C@MPUS öffnet. Das Passwort wird nur auf der Seite der Universität eingegeben und nicht in dieser App gespeichert.',
            'SIAM is the user account. Sign-in itself runs through the TIK identity provider, the same one C@MPUS opens. The password is entered only on the university page and is not stored in this app.',
          )}
        </Text>
        <Text style={styles.meta}>{universityUrls.campus}</Text>
        <Text style={styles.meta}>{universityUrls.authorize}</Text>
        <Button
          label={
            busy
              ? tx(locale, 'Anmeldung läuft …', 'Signing in …')
              : tx(locale, 'Mit SIAM anmelden', 'Sign in with SIAM')
          }
          onPress={enterWithSiam}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Text style={styles.footer}>
          {status === null
            ? tx(
                locale,
                'Der lokale Server antwortet noch nicht. Starte ihn mit npm run assistant, damit die App den IdP öffnen kann.',
                'The local server is not answering yet. Start it with npm run assistant so the app can open the IdP.',
              )
            : status.configured
              ? tx(
                  locale,
                  `Client ist konfiguriert${status.loginHintSet ? ', die Nutzerkennung wird auf der IdP-Seite vorausgefüllt' : ''}. Redirect, der beim TIK eingetragen sein muss:`,
                  `Client is configured${status.loginHintSet ? ', the account id is prefilled on the IdP page' : ''}. Redirect that must be registered with TIK:`,
                )
              : tx(
                  locale,
                  `Noch kein OIDC-Client. OIDC_CLIENT_ID und OIDC_CLIENT_SECRET kommen vom TIK (${universityUrls.support}), nicht das Passwort. Redirect für die Anfrage:`,
                  `No OIDC client yet. OIDC_CLIENT_ID and OIDC_CLIENT_SECRET come from TIK (${universityUrls.support}), not the password. Redirect to include in that request:`,
                )}
        </Text>
        <Text style={styles.redirect}>{redirectUri}</Text>
        <Button
          secondary
          label={tx(locale, 'Demonstrationsprofil öffnen', 'Open demonstration profile')}
          onPress={() => signInDemo(student.account)}
        />
        <Text style={styles.footer}>
          {tx(
            locale,
            `Ohne IdP wird der Datensatz von ${student.name} geladen. Stundenplan und Noten bleiben auch nach einer SIAM-Anmeldung dieser Demonstrationsstand, bis C@MPUS angebunden ist.`,
            `Without the IdP, the record of ${student.name} is loaded. The timetable and grades stay on that demonstration record after a SIAM sign-in, until C@MPUS is connected.`,
          )}
        </Text>
      </ScrollView>
    </View>
  );
}

function messageFor(locale: 'de' | 'en', code: string, status: OidcStatus | null): string {
  if (code === 'cancelled') return tx(locale, 'Anmeldung abgebrochen.', 'Sign-in cancelled.');
  if (code === 'oidc_unconfigured') {
    return tx(
      locale,
      'Im Server fehlt OIDC_CLIENT_ID oder OIDC_CLIENT_SECRET. Beides trägt das TIK ein, nachdem der Dienst registriert wurde.',
      'The server is missing OIDC_CLIENT_ID or OIDC_CLIENT_SECRET. TIK issues both after the service is registered.',
    );
  }
  if (code === 'redirect_rejected') {
    return tx(locale, 'Diese Redirect-Adresse lässt der lokale Server nicht zu.', 'The local server rejected this redirect address.');
  }
  if (!status) {
    return tx(locale, 'Der Anmeldungs-Server ist nicht erreichbar. Läuft npm run assistant?', 'The sign-in server is unreachable. Is npm run assistant running?');
  }
  return tx(locale, `Anmeldung nicht abgeschlossen (${code}).`, `Sign-in did not finish (${code}).`);
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.blue },
  hero: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 28, gap: 8 },
  brand: { color: '#FFFFFF', fontSize: 36, fontWeight: '700', letterSpacing: -0.8 },
  heroText: { color: '#D6E4F5', fontSize: 16, lineHeight: 22 },
  sheet: { flex: 1, backgroundColor: colors.paper, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  sheetContent: { padding: 24, gap: 10 },
  lang: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  langButton: { borderRadius: 999, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12, paddingVertical: 6 },
  langOn: { backgroundColor: colors.blue, borderColor: colors.blue },
  langText: { color: colors.anthracite, fontWeight: '700' },
  langTextOn: { color: '#FFFFFF' },
  notice: { backgroundColor: colors.lightSoft, color: colors.anthracite, borderRadius: 14, padding: 12, lineHeight: 20 },
  meta: { color: colors.inkSoft, fontSize: 12, lineHeight: 18 },
  error: { color: colors.danger, fontSize: 14, lineHeight: 20 },
  footer: { color: colors.inkSoft, fontSize: 13, lineHeight: 19 },
  redirect: { color: colors.anthracite, fontSize: 13, lineHeight: 18 },
});
