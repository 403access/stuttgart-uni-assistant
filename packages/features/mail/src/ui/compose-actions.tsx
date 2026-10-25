import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { themedStyles } from '@ua/ui/theme';
import { tx } from '@ua/core/format';
import type { Locale } from '@ua/core/domain/types';

/** Reply and forward shortcuts under the read view header. */
export function MailComposeActions({ uid, folder, locale }: { uid: number; folder: string; locale: Locale }) {
  function open(mode: 'reply' | 'forward') {
    router.push({ pathname: '/mail-verfassen', params: { mode, uid: String(uid), folder } });
  }
  return (
    <View style={styles.row}>
      <Pressable
        style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        onPress={() => open('reply')}
        accessibilityRole="button"
        accessibilityLabel={tx(locale, 'mailVerfassen.antworten')}
      >
        <Text style={styles.actionText}>{tx(locale, 'mailVerfassen.antworten')}</Text>
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        onPress={() => open('forward')}
        accessibilityRole="button"
        accessibilityLabel={tx(locale, 'mailVerfassen.weiterleiten')}
      >
        <Text style={styles.actionText}>{tx(locale, 'mailVerfassen.weiterleiten')}</Text>
      </Pressable>
    </View>
  );
}

const styles = themedStyles((colors) => ({
  row: { flexDirection: 'row', gap: 8 },
  action: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    paddingHorizontal: 12,
  },
  actionText: { color: colors.blue, fontSize: 14, fontWeight: '700' },
  pressed: { opacity: 0.72 },
}));
