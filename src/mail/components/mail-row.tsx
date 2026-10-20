import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, themedStyles } from '@/src/theme';
import { tx } from '@/src/text';
import type { Locale, MailMessage } from '@/src/types';

/** One inbox row; the read flag only dims the dot and the subject, the row stays tappable. */
export function MailRow({ message, folder, last, locale }: { message: MailMessage; folder: string; last: boolean; locale: Locale }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.listRow, !last && styles.listRowLine, pressed && styles.pressed]}
      onPress={() =>
        router.push({
          pathname: '/mail-nachricht',
          params: { uid: String(message.uid), folder },
        })
      }
      accessibilityLabel={tx(locale, 'tabsMail.nachricht', [message.subject || 'ohne Betreff'])}
    >
      <View style={styles.rowTop}>
        <View style={[styles.dot, { backgroundColor: message.seen ? colors.line : colors.blue }]} />
        <View style={styles.rowBody}>
          <Text style={[styles.subject, message.seen && styles.subjectSeen]} numberOfLines={2}>
            {message.subject || tx(locale, 'common.ohne')}
          </Text>
          <Text style={styles.from} numberOfLines={1}>
            {message.from || '–'}
          </Text>
          <Text style={styles.meta}>
            {message.date ? new Date(message.date).toLocaleString(locale === 'de' ? 'de-DE' : 'en-GB') : '–'}
            {!message.seen ? tx(locale, 'tabsMail.neu') : ''}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = themedStyles((colors) => ({
  listRow: { paddingHorizontal: 20, paddingVertical: 14 },
  listRowLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  pressed: { opacity: 0.72 },
  rowTop: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  rowBody: { flex: 1, gap: 4 },
  dot: { width: 10, height: 10, borderRadius: 10, marginTop: 6 },
  subject: { color: colors.anthracite, fontSize: 16, fontWeight: '700' },
  subjectSeen: { fontWeight: '600', color: colors.inkSoft },
  from: { color: colors.inkSoft, fontSize: 14 },
  meta: { color: colors.inkSoft, fontSize: 12 },
}));
