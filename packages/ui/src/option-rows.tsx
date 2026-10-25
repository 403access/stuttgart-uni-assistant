import { Fragment } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, themedStyles } from './theme';

import { ControlIcon } from './control-icon';

/** One selectable row in a dropdown, sheet, or drawer. */
import type { DropdownOption } from '@ua/core/domain/types';

export type { DropdownOption };

/** One list of options, shared by the sort sheet and both drawers. */
export function OptionRows({ options, onSelect }: { options: DropdownOption[]; onSelect: (key: string) => void }) {
  return (
    <>
      {options.map((option, index) => {
        const header = option.group && option.group !== options[index - 1]?.group ? option.group : null;
        return (
          <Fragment key={option.key}>
            {header ? (
              <View style={styles.sheetGroupWrap}>
                <Text style={styles.sheetGroupText}>{header}</Text>
              </View>
            ) : null}
            <Pressable
              style={(state: { pressed: boolean; hovered?: boolean }) => [
                styles.option,
                option.group && styles.optionGrouped,
                state.hovered && styles.optionHover,
                state.pressed && styles.pressed,
              ]}
              onPress={() => onSelect(option.key)}
              accessibilityRole="button"
            >
              <Text style={[styles.optionText, option.selected && styles.optionTextActive]} numberOfLines={2}>
                {option.label}
              </Text>
              {option.meta ? <Text style={styles.optionMeta}>{option.meta}</Text> : null}
              {option.selected ? <ControlIcon symbol="checkmark" material="check" color={colors.blue} /> : null}
            </Pressable>
          </Fragment>
        );
      })}
    </>
  );
}

const styles = themedStyles((colors) => ({
  sheetGroupWrap: { paddingTop: 16, paddingBottom: 6 },
  sheetGroupText: {
    alignSelf: 'flex-start',
    color: colors.inkSoft,
    backgroundColor: colors.mist,
    borderRadius: 8,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  optionGrouped: { paddingLeft: 14, borderLeftWidth: 2, borderLeftColor: colors.line, marginLeft: 2 },
  optionHover: { backgroundColor: colors.mist },
  optionText: { flex: 1, color: colors.anthracite, fontSize: 15 },
  optionTextActive: { color: colors.blue, fontWeight: '700' },
  optionMeta: { color: colors.mute, fontSize: 13, fontWeight: '700' },
  pressed: { opacity: 0.72 },
}));
