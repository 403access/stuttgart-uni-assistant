import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { ControlIcon } from '@ua/ui';
import { colors, themedStyles } from '@ua/ui/theme';
import { tx } from '@ua/core/format';
import type { Locale } from '@ua/core/domain/types';

import { mailTemplates, type MailTemplate } from '@ua/feature-mail';

/** Bottom sheet with the localized starting points for a new message. */
export function TemplateSheet({
  visible,
  locale,
  onClose,
  onSelect,
}: {
  visible: boolean;
  locale: Locale;
  onClose: () => void;
  onSelect: (template: MailTemplate) => void;
}) {
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet}>
          <View style={styles.gripWrap}>
            <View style={styles.grip} />
          </View>
          <Text style={styles.title}>{tx(locale, 'mailVerfassen.vorlagen')}</Text>
          <Text style={styles.hint}>{tx(locale, 'mailVerfassen.vorlagen_hinweis')}</Text>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            {mailTemplates.map((template) => (
              <Pressable
                key={template.id}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                onPress={() => {
                  onSelect(template);
                  onClose();
                }}
                accessibilityRole="button"
              >
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle}>{template.title[locale]}</Text>
                  <Text style={styles.rowText}>{template.description[locale]}</Text>
                </View>
                <ControlIcon symbol="chevron.right" material="chevron-right" color={colors.mute} />
              </Pressable>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = themedStyles((colors) => ({
  backdrop: { flex: 1, backgroundColor: 'rgba(15, 35, 55, 0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.paper,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 28,
    gap: 4,
  },
  gripWrap: { alignItems: 'center', paddingBottom: 6 },
  grip: { width: 40, height: 5, borderRadius: 5, backgroundColor: colors.line },
  title: {
    color: colors.blue,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    paddingTop: 8,
    paddingBottom: 2,
  },
  hint: { color: colors.inkSoft, fontSize: 13, lineHeight: 18, paddingBottom: 6 },
  scroll: { maxHeight: 420 },
  scrollContent: { gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.mist,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { color: colors.anthracite, fontSize: 15, fontWeight: '700' },
  rowText: { color: colors.inkSoft, fontSize: 13, lineHeight: 18 },
  pressed: { opacity: 0.72 },
}));
