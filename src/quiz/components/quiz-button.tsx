import { Pressable, Text } from 'react-native';

import { themedStyles } from '@/src/theme';

/** Footer button with a proper disabled state (the shared Button has none). */
export function QuizButton({
  label,
  onPress,
  disabled = false,
  secondary = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.secondary,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text style={[styles.label, secondary && styles.secondaryLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = themedStyles((colors) => ({
  button: {
    backgroundColor: colors.brand,
    borderRadius: 14,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  secondary: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.75 },
  label: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  secondaryLabel: { color: colors.blue },
}));
