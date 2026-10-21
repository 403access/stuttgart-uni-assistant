import { MaterialIcons } from '@expo/vector-icons';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { ComponentProps } from 'react';
import { Platform, Pressable } from 'react-native';

import { colors, themedStyles } from '@/src/theme';

/** One icon, SF Symbols on iOS and Material Icons everywhere else. */
export function ControlIcon({
  symbol,
  material,
  color,
}: {
  symbol: SymbolViewProps['name'];
  material: ComponentProps<typeof MaterialIcons>['name'];
  color: string;
}) {
  if (Platform.OS === 'ios') return <SymbolView name={symbol} size={16} tintColor={color} />;
  return <MaterialIcons name={material} size={18} color={color} />;
}

/** Icon-only control for the sticky bar (mailbox drawer, filter drawer). */
export function ToolButton({
  symbol,
  material,
  label,
  onPress,
  active = false,
}: {
  symbol: SymbolViewProps['name'];
  material: ComponentProps<typeof MaterialIcons>['name'];
  label: string;
  onPress: () => void;
  /** Marks an applied filter or an open drawer. */
  active?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.toolButton, active && styles.toolButtonActive, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      hitSlop={4}
    >
      <ControlIcon symbol={symbol} material={material} color={active ? colors.blue : colors.anthracite} />
    </Pressable>
  );
}

const styles = themedStyles((colors) => ({
  toolButton: {
    flexShrink: 0,
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    backgroundColor: colors.paper,
  },
  toolButtonActive: { backgroundColor: colors.blueSoft, borderColor: colors.blueSoft },
  pressed: { opacity: 0.72 },
}));
