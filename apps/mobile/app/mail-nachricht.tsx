import { Stack, useLocalSearchParams } from 'expo-router';

import { Screen } from '@ua/ui';
import { MailReader } from '@/src/mail/components/mail-reader';
import { useAppSelector } from '@/src/state/AppState';
import { tx } from '@ua/core/format';

/**
 * The read view for one message, pushed from a row of the Messages tab. The
 * desktop inbox shows the same reader in its split view; this route remains the
 * phone presentation and the deep-link target.
 */
export default function MailMessageScreen() {
  const locale = useAppSelector((state) => state.locale);
  const params = useLocalSearchParams<{ uid?: string | string[]; folder?: string | string[] }>();
  const rawUid = Array.isArray(params.uid) ? params.uid[0] : params.uid;
  const uid = Number(rawUid);
  const folder = (Array.isArray(params.folder) ? params.folder[0] : params.folder) ?? 'INBOX';

  return (
    <Screen flush narrow>
      <Stack.Screen options={{ title: tx(locale, 'mailNachricht.nachricht') }} />
      <MailReader uid={uid} folder={folder} locale={locale} />
    </Screen>
  );
}
