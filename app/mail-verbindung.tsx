import { Stack, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  forgetMail,
  folderLabel,
  getMailSnapshot,
  loadMailMessages,
  mailDetail,
  mailMessage,
  subscribeMailSnapshot,
} from '@/src/auth/mail';
import { Button, Card, Pill, Screen } from '@/src/components/ui';
import { useApp } from '@/src/state/AppState';
import { colors } from '@/src/theme';
import { tx } from '@/src/text';
import type { MailStatus } from '@/src/types';

/** Pushed from the gear icon of the Messages tab once UniMail is connected. */
export default function MailConnectionScreen() {
  const { locale, setMailAccount } = useApp();
  const [status, setStatus] = useState<MailStatus | null>(() => getMailSnapshot().status);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  useEffect(
    () =>
      subscribeMailSnapshot(() => {
        const snap = getMailSnapshot();
        if (snap.status) setStatus(snap.status);
      }),
    [],
  );

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
        tx(
          locale,
          `${messages.length} Nachrichten aus „${folderLabel(display, locale)}“ geladen. Der Tab zeigt sie, sobald du zurückkommst.`,
          `${messages.length} messages from "${folderLabel(display, locale)}" loaded. The tab shows them once you go back.`,
        ),
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
      await forgetMail();
      setMailAccount(null);
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
      kicker="UniMail"
      title={tx(locale, 'Verbindung', 'Connection')}
      subtitle={tx(
        locale,
        'Nur lesen: aktualisieren oder aufheben. Die Anmeldedaten liegen im Speicher des Assistenz-Servers, nie auf dem Gerät.',
        'Read-only: refresh or drop. The credentials live in the assistant server memory, never on this device.',
      )}
    >
      <Stack.Screen options={{ title: tx(locale, 'UniMail-Verbindung', 'UniMail connection') }} />
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <Text style={{ color: colors.anthracite, fontSize: 18, fontWeight: '700' }}>UniMail</Text>
          <Pill tone={connected ? 'ok' : 'wait'} label={tx(locale, connected ? 'Verbunden' : 'Nicht verbunden', connected ? 'Connected' : 'Not connected')} />
        </View>
        <Text style={{ color: colors.inkSoft, lineHeight: 20 }}>
          {status === null
            ? tx(locale, 'Der Assistenz-Server antwortet noch nicht. Starte npm run assistant.', 'The assistant server is not answering yet. Start npm run assistant.')
            : connected
              ? tx(
                  locale,
                  `Konto ${status.account ?? '–'}${status.address ? ` · ${status.address}` : ''}. Der Server liest den Posteingang über ${status.imap}.`,
                  `Account ${status.account ?? '–'}${status.address ? ` · ${status.address}` : ''}. The server reads the inbox over ${status.imap}.`,
                )
              : tx(
                  locale,
                  'Keine Anmeldedaten hinterlegt. Zurück im Tab trägst du Nutzerkennung und Passwort neu ein.',
                  'No credentials stored. In the tab, enter the user id and password again.',
                )}
        </Text>
        <Text style={{ color: colors.inkSoft, fontSize: 13, lineHeight: 19 }}>
          {tx(
            locale,
            `Webmail in der Ansicht der Universität: ${status?.webmail ?? 'https://mail.uni-stuttgart.de/'}`,
            `Webmail in the university's own view: ${status?.webmail ?? 'https://mail.uni-stuttgart.de/'}`,
          )}
        </Text>
      </Card>
      {note ? <Text style={styles.note}>{note}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {connected ? (
        <>
          <Button
            label={loading ? tx(locale, 'Posteingang lädt …', 'Inbox loading …') : tx(locale, 'Posteingang aktualisieren', 'Refresh inbox')}
            onPress={refreshInbox}
          />
          <Button secondary label={busy ? tx(locale, 'Verbindung wird gelöst …', 'Dropping connection …') : tx(locale, 'Verbindung lösen', 'Drop connection')} onPress={disconnect} />
        </>
      ) : null}
      <Card>
        <Text style={{ color: colors.inkSoft, fontSize: 13, lineHeight: 19 }}>
          {tx(
            locale,
            'Nach „Verbindung lösen“ verwirft der Server das Paar aus Nutzerkennung und Passwort — es gibt sonst keine Kopie auf dem Gerät, der Tab zeigt danach wieder das Anmeldeformular.',
            'After dropping the connection the server forgets the user id and password pair — no copy remains on the device, and the tab shows the sign-in form again.',
          )}
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: { color: colors.success, fontSize: 14, lineHeight: 20 },
  error: { color: colors.danger, fontSize: 14, lineHeight: 20 },
});
