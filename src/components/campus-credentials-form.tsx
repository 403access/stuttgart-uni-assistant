import { StyleSheet, Text, View } from 'react-native';

import { Chip, Field, Notice, SectionTitle } from '@/src/components/login-blocks';
import { Button } from '@/src/components/ui';
import { colors } from '@/src/theme';
import { tx } from '@/src/text';
import type { Locale } from '@/src/types';

/**
 * The automated sign-in form. The credential is typed here and, if the user
 * opts in, written to the device vault by the flow hook — never to the server.
 */
export function CampusCredentialsForm({
  locale,
  account,
  password,
  remember,
  biometrics,
  biometricsReady,
  busy,
  savedLogin,
  error,
  onAccount,
  onPassword,
  onRemember,
  onBiometrics,
  onStart,
  onStoredLogin,
  onForget,
}: {
  locale: Locale;
  account: string;
  password: string;
  remember: boolean;
  biometrics: boolean;
  biometricsReady: boolean;
  busy: boolean;
  savedLogin: { account: string } | null;
  error: string;
  onAccount: (value: string) => void;
  onPassword: (value: string) => void;
  onRemember: () => void;
  onBiometrics: () => void;
  onStart: () => void;
  onStoredLogin: () => void;
  onForget: () => void;
}) {
  return (
    <View style={styles.shell}>
      <SectionTitle>{tx(locale, 'Automatische C@MPUS-Anmeldung (Beta)', 'Automated C@MPUS sign-in (Beta)')}</SectionTitle>
      <Notice>
        {tx(
          locale,
          'Die Anmeldung läuft auf diesem Gerät in einem unsichtbaren Browser gegen die offizielle C@MPUS-Seite. Kennung und Passwort bleiben auf dem Gerät und werden nie an den Assistent-Server gesendet; der Server erhält nur die Sitzung.',
          'Sign-in runs on this device in an invisible browser against the official C@MPUS page. The account id and password stay on the device and are never sent to the assistant server; the server only receives the session.',
        )}
      </Notice>
      <Field
        label={tx(locale, 'Nutzerkennung', 'Account id')}
        value={account}
        onChangeText={onAccount}
        textContentType="username"
        placeholder="st123456"
      />
      <Field
        label={tx(locale, 'Passwort', 'Password')}
        value={password}
        onChangeText={onPassword}
        secureTextEntry
        textContentType="password"
        placeholder={tx(locale, 'Passwort des st-Kontos', 'st-account password')}
      />
      <View style={styles.toggles}>
        <Chip label={tx(locale, 'Auf diesem Gerät speichern', 'Store on this device')} on={remember} onPress={onRemember} />
        {biometricsReady ? (
          <Chip label={tx(locale, 'Mit Biometrie schützen', 'Protect with biometrics')} on={biometrics} onPress={onBiometrics} />
        ) : null}
      </View>
      <Button
        label={busy ? tx(locale, 'Anmeldung läuft …', 'Signing in …') : tx(locale, 'Automatisch anmelden', 'Sign in automatically')}
        onPress={onStart}
      />
      {savedLogin ? (
        <Button
          secondary
          label={tx(locale, `Gespeicherte Anmeldung für ${savedLogin.account} verwenden`, `Use the stored sign-in for ${savedLogin.account}`)}
          onPress={onStoredLogin}
        />
      ) : null}
      {savedLogin ? (
        <Button secondary label={tx(locale, 'Gespeicherte Anmeldung löschen', 'Delete the stored sign-in')} onPress={onForget} />
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { gap: 10 },
  toggles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  error: { color: colors.danger, fontSize: 14, lineHeight: 20 },
});
