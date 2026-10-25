import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, Text } from 'react-native';

import { colors, themedStyles } from '@/src/theme';

export interface OptionRowProps {
  label: string;
  selected: boolean;
  /** Revealed and this option is part of the solution. */
  correct?: boolean;
  /** Revealed, selected, and not part of the solution. */
  wrong?: boolean;
  disabled?: boolean;
  multiple?: boolean;
  onPress: () => void;
}

export function OptionRow({
  label,
  selected,
  correct = false,
  wrong = false,
  disabled = false,
  multiple = false,
  onPress,
}: OptionRowProps) {
  const state = correct ? 'correct' : wrong ? 'wrong' : selected ? 'selected' : 'idle';
  return (
    <Pressable
      accessibilityRole={multiple ? 'checkbox' : 'radio'}
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.row, styles[state], pressed && !disabled && styles.pressed]}
    >
      <MaterialIcons
        name={selected ? (multiple ? 'check-box' : 'radio-button-checked') : multiple ? 'check-box-outline-blank' : 'radio-button-unchecked'}
        size={22}
        color={correct ? colors.success : wrong ? colors.danger : selected ? colors.blue : colors.mute}
      />
      <Text style={[styles.label, correct && styles.labelCorrect, wrong && styles.labelWrong]}>{label}</Text>
      {correct ? <MaterialIcons name="check" size={20} color={colors.success} /> : null}
      {wrong ? <MaterialIcons name="close" size={20} color={colors.danger} /> : null}
    </Pressable>
  );
}

const styles = themedStyles((colors) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
  },
  idle: {},
  selected: { borderColor: colors.blue, backgroundColor: colors.blueSoft },
  correct: { borderColor: colors.success, backgroundColor: colors.successSoft },
  wrong: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  pressed: { opacity: 0.7 },
  label: { flex: 1, color: colors.anthracite, fontSize: 15, lineHeight: 21 },
  labelCorrect: { fontWeight: '700' },
  labelWrong: { fontWeight: '700' },
}));
