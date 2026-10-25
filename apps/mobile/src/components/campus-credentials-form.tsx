import { Text, View } from 'react-native';

import { Chip, Field, Notice, SectionTitle } from '@/src/components/login-blocks';
import { Button } from '@ua/ui';
import { themedStyles } from '@ua/ui/theme';
import { tx } from '@ua/core/format';
import type { Locale } from '@ua/core/domain/types';

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
      <SectionTitle>{tx(locale, 'campusCredentialsForm.automatische')}</SectionTitle>
      <Notice>
        {tx(locale, 'campusCredentialsForm.anmeldung')}
      </Notice>
      <Field
        label={tx(locale, 'common.nutzerkennung')}
        value={account}
        onChangeText={onAccount}
        textContentType="username"
        placeholder="st123456"
      />
      <Field
        label={tx(locale, 'common.passwort')}
        value={password}
        onChangeText={onPassword}
        secureTextEntry
        textContentType="password"
        placeholder={tx(locale, 'common.passwort_st')}
      />
      <View style={styles.toggles}>
        <Chip label={tx(locale, 'campusCredentialsForm.diesem')} on={remember} onPress={onRemember} />
        {biometricsReady ? (
          <Chip label={tx(locale, 'campusCredentialsForm.biometrie')} on={biometrics} onPress={onBiometrics} />
        ) : null}
      </View>
      <Button
        label={busy ? tx(locale, 'common.anmeldung_laeuft') : tx(locale, 'campusCredentialsForm.automatisch')}
        onPress={onStart}
      />
      {savedLogin ? (
        <Button
          secondary
          label={tx(locale, 'common.gespeicherte', [savedLogin.account])}
          onPress={onStoredLogin}
        />
      ) : null}
      {savedLogin ? (
        <Button secondary label={tx(locale, 'common.gespeicherte_anmeldung')} onPress={onForget} />
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = themedStyles((colors) => ({
  shell: { gap: 10 },
  toggles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  error: { color: colors.danger, fontSize: 14, lineHeight: 20 },
}));
