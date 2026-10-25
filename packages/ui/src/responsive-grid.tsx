import { Children, type ReactNode } from 'react';
import { View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { useResponsive } from './use-responsive';

/**
 * Stacks cards on the phone and flows them into equal-width columns on the
 * desktop. `minColumnWidth` is a hint: the browser decides how many columns
 * fit, so a narrow window quietly falls back to a single column.
 *
 * Mobile output is a plain spaced column, which is byte-for-byte the same
 * layout the screens use today.
 */
export function ResponsiveGrid({
  children,
  minColumnWidth = 320,
  gap = 14,
  style,
}: {
  children: ReactNode;
  /** Smallest comfortable card width before wrapping to another column. */
  minColumnWidth?: number;
  gap?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { isDesktop } = useResponsive();

  if (!isDesktop) {
    return <View style={[{ gap }, style]}>{children}</View>;
  }

  return (
    <View style={[{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch', gap }, style]}>
      {Children.toArray(children).map((child, index) => (
        <View key={index} style={{ flexGrow: 1, flexBasis: minColumnWidth, minWidth: 0 }}>
          {child}
        </View>
      ))}
    </View>
  );
}
