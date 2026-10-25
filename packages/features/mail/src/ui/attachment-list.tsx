import { Pressable, Text, View } from 'react-native';

import { ControlIcon } from '@ua/ui';
import { colors, themedStyles } from '@ua/ui/theme';
import { tx } from '@ua/core/format';
import type { Locale, MailAttachment } from '@ua/core/domain/types';

import { MAX_TOTAL_ATTACHMENT_BYTES, formatBytes } from './attachments';

/** Attachment rows under the body: name, size, total against the server limit, remove. */
export function AttachmentList({
  attachments,
  locale,
  onRemove,
}: {
  attachments: MailAttachment[];
  locale: Locale;
  onRemove: (name: string, index: number) => void;
}) {
  if (attachments.length === 0) return null;
  const total = attachments.reduce((sum, attachment) => sum + (attachment.size || 0), 0);
  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.label}>{tx(locale, 'mailVerfassen.anhaenge')}</Text>
        <Text style={styles.total}>
          {tx(locale, 'mailVerfassen.anhang_summe', [formatBytes(total, locale), formatBytes(MAX_TOTAL_ATTACHMENT_BYTES, locale)])}
        </Text>
      </View>
      <View style={styles.list}>
        {attachments.map((attachment, index) => (
          <View key={`${attachment.name}-${index}`} style={[styles.row, index > 0 && styles.rowLine]}>
            <View style={styles.icon}>
              <ControlIcon symbol="doc.fill" material="insert-drive-file" color={colors.blue} />
            </View>
            <View style={styles.body}>
              <Text style={styles.name} numberOfLines={1}>
                {attachment.name}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {formatBytes(attachment.size, locale)}
              </Text>
            </View>
            <Pressable
              onPress={() => onRemove(attachment.name, index)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={tx(locale, 'mailVerfassen.anhang_entfernen', [attachment.name])}
              style={({ pressed }) => [styles.remove, pressed && styles.pressed]}
            >
              <Text style={styles.removeText}>✕</Text>
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = themedStyles((colors) => ({
  wrap: { gap: 6 },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  label: { color: colors.inkSoft, fontSize: 13, fontWeight: '600' },
  total: { color: colors.mute, fontSize: 11, fontWeight: '600' },
  list: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 14, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, paddingVertical: 9 },
  rowLine: { borderTopWidth: 1, borderTopColor: colors.line },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, minWidth: 0, gap: 1 },
  name: { color: colors.anthracite, fontSize: 14, fontWeight: '600' },
  meta: { color: colors.inkSoft, fontSize: 12 },
  remove: { width: 26, height: 26, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  removeText: { color: colors.mute, fontSize: 12, fontWeight: '700' },
  pressed: { opacity: 0.7 },
}));
