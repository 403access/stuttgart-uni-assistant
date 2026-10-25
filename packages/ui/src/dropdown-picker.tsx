import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { colors, themedStyles } from './theme';

import type { DropdownOption } from './option-rows';
import { ControlIcon } from './control-icon';
import { OptionRows } from './option-rows';

/** Compact button + bottom-sheet picker; the value text comes from the active selection. */
export function DropdownPicker({
  hint,
  valueText,
  options,
  onSelect,
}: {
  hint: string;
  valueText: string;
  options: DropdownOption[];
  onSelect: (key: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <Pressable
        style={({ pressed }) => [styles.dropdown, pressed && styles.pressed]}
        onPress={() => setOpen(true)}
        accessibilityLabel={hint}
        accessibilityRole="button"
      >
        <Text style={styles.dropdownText} numberOfLines={1} ellipsizeMode="tail">
          {valueText}
        </Text>
        <ControlIcon symbol="chevron.down" material="expand-more" color={colors.mute} />
      </Pressable>
      <Modal transparent visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet}>
            <View style={styles.sheetGripWrap}>
              <View style={styles.sheetGrip} />
            </View>
            <Text style={styles.sheetTitle}>{hint}</Text>
            <ScrollView style={styles.sheetScroll}>
              <OptionRows
                options={options}
                onSelect={(key) => {
                  onSelect(key);
                  setOpen(false);
                }}
              />
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = themedStyles((colors) => ({
  dropdown: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    backgroundColor: colors.paper,
    paddingLeft: 10,
    paddingRight: 5,
    paddingVertical: 9,
    maxWidth: 118,
  },
  dropdownText: { flexShrink: 1, color: colors.anthracite, fontSize: 13, fontWeight: '600' },
  backdrop: { flex: 1, backgroundColor: 'rgba(15, 35, 55, 0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.paper,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 28,
  },
  sheetGripWrap: { alignItems: 'center', paddingBottom: 6 },
  sheetGrip: { width: 40, height: 5, borderRadius: 5, backgroundColor: colors.line },
  sheetTitle: { color: colors.blue, fontSize: 12, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase', paddingTop: 8, paddingBottom: 6 },
  sheetScroll: { maxHeight: 420 },
  pressed: { opacity: 0.72 },
}));
