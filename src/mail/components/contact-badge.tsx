import { Text, View } from 'react-native';

import { colors, themedStyles } from '@/src/theme';
import { tx } from '@/src/text';
import type { Locale, MailContactSource } from '@/src/types';

/** Tones are read during render so a theme switch repaints the badges too. */
function toneFor(source: MailContactSource | 'manual'): { background: string; text: string } {
  if (source === 'lecturer') return { background: colors.blueSoft, text: colors.blue };
  if (source === 'recent') return { background: colors.successSoft, text: colors.success };
  if (source === 'manual') return { background: colors.warningSoft, text: colors.warning };
  return { background: colors.mist, text: colors.inkSoft };
}

/** Small source badge on a recipient chip or suggestion ("Dozent:in", "Postfach", …). */
export function ContactBadge({ source, locale }: { source: MailContactSource | 'manual'; locale: Locale }) {
  const key =
    source === 'lecturer'
      ? 'mailVerfassen.badge_dozent'
      : source === 'recent'
        ? 'mailVerfassen.badge_zuletzt'
        : source === 'mailbox'
          ? 'mailVerfassen.badge_postfach'
          : 'mailVerfassen.badge_neu';
  const tone = toneFor(source);
  return (
    <View style={[styles.badge, { backgroundColor: tone.background }]}>
      <Text style={[styles.text, { color: tone.text }]} numberOfLines={1}>
        {tx(locale, key)}
      </Text>
    </View>
  );
}

const styles = themedStyles(() => ({
  badge: { borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2, flexShrink: 0 },
  text: { fontSize: 10, fontWeight: '700', letterSpacing: 0.2 },
}));
