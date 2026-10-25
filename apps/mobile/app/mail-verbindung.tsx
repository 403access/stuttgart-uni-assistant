import { Stack, router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import {
  forgetMail,
  folderLabel,
  getMailSnapshot,
  loadMailMessages,
  mailDetail,
  mailMessage,
} from '@/src/auth/mail';
import { useMailSnapshot } from '@/src/mail/use-mail-snapshot';
import { Button, Card, Pill, Screen } from '@/src/components/ui';
import { useAppSelector, appActions } from '@/src/state/AppState';
import { colors, themedStyles } from '@ua/ui/theme';
import { tx } from '@ua/core/format';

/** Opened from the E-Mail item on the Campus tab. */
export default function MailConnectionScreen() {
  const locale = useAppSelector((state) => state.locale);
  const authToken = useAppSelector((state) => state.authToken);
  const { setMailAccount, refreshUser } = appActions;
  const { status } = useMailSnapshot();
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  async function refreshInbox() {
    if (busy || loading) return;
    setError('');
    setNote('');
    setLoading(true);
    try {
      const folder = getMailSnapshot().folder ?? 'INBOX';
      const display = getMailSnapshot().folders?.find((candidate) => candidate.name === folder)?.display ?? folder;
      const messages = await loadMailMessages(25, folder);
      setNote(
        tx(locale, 'mailVerbindung.nachrichten', [messages.length, folderLabel(display, locale)]),
      );
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : 'mail_failed';
      setError(mailMessage(locale, code, mailDetail(caught)));
    } finally {
      setLoading(false);
    }
  }

  async function disconnect() {
    if (busy) return;
    setError('');
    setNote('');
    setBusy(true);
    try {
      await forgetMail(authToken);
      setMailAccount(null);
      void refreshUser();
      router.back();
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : 'mail_failed';
      setError(mailMessage(locale, code, mailDetail(caught)));
    } finally {
      setBusy(false);
    }
  }

  const connected = status?.configured ?? false;

  return (
    <Screen
      narrow
      kicker="UniMail"
      title={tx(locale, 'mailVerbindung.verbindung_2')}
      subtitle={tx(locale, 'mailVerbindung.lesen')}
    >
      <Stack.Screen options={{ title: tx(locale, 'mailVerbindung.unimail') }} />
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <Text style={{ color: colors.anthracite, fontSize: 18, fontWeight: '700' }}>UniMail</Text>
          <Pill tone={connected ? 'ok' : 'wait'} label={connected ? tx(locale, 'mailVerbindung.verbunden') : tx(locale, 'tabsMail.verbunden')} />
        </View>
        <Text style={{ color: colors.inkSoft, lineHeight: 20 }}>
          {status === null
            ? tx(locale, 'common.assistenz')
            : connected
              ? tx(locale, 'mailVerbindung.konto', [status.account ?? '–', status.address ? ` · ${status.address}` : '', status.imap])
              : tx(locale, 'mailVerbindung.anmeldedaten')}
        </Text>
        <Text style={{ color: colors.inkSoft, fontSize: 13, lineHeight: 19 }}>
          {tx(locale, 'mailVerbindung.webmail', [status?.webmail ?? 'https://mail.uni-stuttgart.de/'])}
        </Text>
      </Card>
      {note ? <Text style={styles.note}>{note}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {connected ? (
        <>
          <Button
            label={loading ? tx(locale, 'mailVerbindung.posteingang_laedt') : tx(locale, 'mailVerbindung.posteingang')}
            onPress={refreshInbox}
          />
          <Button secondary label={busy ? tx(locale, 'mailVerbindung.verbindung_wird') : tx(locale, 'mailVerbindung.verbindung_loesen')} onPress={disconnect} />
        </>
      ) : null}
      <Card>
        <Text style={{ color: colors.inkSoft, fontSize: 13, lineHeight: 19 }}>
          {tx(locale, 'mailVerbindung.verbindung')}
        </Text>
      </Card>
    </Screen>
  );
}

const styles = themedStyles((colors) => ({
  note: { color: colors.success, fontSize: 14, lineHeight: 20 },
  error: { color: colors.danger, fontSize: 14, lineHeight: 20 },
}));
