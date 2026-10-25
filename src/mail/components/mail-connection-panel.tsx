import { Text, TextInput, View } from 'react-native';

import { Button, Card, FieldLabel, Pill } from '@/src/components/ui';
import { colors, themedStyles } from '@/src/theme';
import { tx } from '@/src/text';
import type { Locale, MailStatus } from '@/src/types';

/** The signed-out mailbox tab: credential handoff and the server-side privacy note. */
export function MailConnectionPanel({
  status,
  sessionAccount,
  account,
  password,
  busy,
  note,
  error,
  locale,
  onAccountChange,
  onPasswordChange,
  onConnect,
}: {
  status: MailStatus | null;
  sessionAccount: string | null;
  account: string;
  password: string;
  busy: boolean;
  note: string;
  error: string;
  locale: Locale;
  onAccountChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConnect: () => void;
}) {
  return (
    <View style={styles.panel}>
      <Card>
        <View style={styles.connectHeader}>
          <Text style={styles.brand}>UniMail</Text>
          <Pill tone="wait" label={tx(locale, 'tabsMail.verbunden')} />
        </View>
        <Text style={styles.connectHint}>{status === null ? tx(locale, 'common.assistenz') : tx(locale, 'tabsMail.trage')}</Text>
        <FieldLabel>{tx(locale, 'tabsMail.nutzerkennung')}</FieldLabel>
        <TextInput
          value={account}
          onChangeText={onAccountChange}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
          placeholder={sessionAccount ?? 'st123456'}
          placeholderTextColor={colors.mute}
        />
        <FieldLabel>{tx(locale, 'tabsMail.passwort_uni')}</FieldLabel>
        <TextInput value={password} onChangeText={onPasswordChange} secureTextEntry style={styles.input} placeholder="••••••••" placeholderTextColor={colors.mute} />
        <Button label={busy ? tx(locale, 'tabsMail.verbindung') : tx(locale, 'tabsMail.unimail')} onPress={onConnect} />
        <Text style={styles.hint}>{tx(locale, 'tabsMail.passwort')}</Text>
      </Card>
      {note ? <Text style={styles.note}>{note}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Card>
        <Text style={styles.hint}>{tx(locale, 'tabsMail.gelesen')}</Text>
      </Card>
    </View>
  );
}

const styles = themedStyles((colors) => ({
  // A credential form stays comfortable to read on a wide desktop instead of
  // stretching its text fields across the whole content column.
  panel: { width: '100%', maxWidth: 680, alignSelf: 'center', gap: 14 },
  connectHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  brand: { color: colors.anthracite, fontSize: 18, fontWeight: '700' },
  connectHint: { color: colors.inkSoft, lineHeight: 20 },
  hint: { color: colors.inkSoft, fontSize: 13, lineHeight: 19 },
  note: { color: colors.success, fontSize: 14, lineHeight: 20 },
  error: { color: colors.danger, fontSize: 14, lineHeight: 20 },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.anthracite,
  },
}));
