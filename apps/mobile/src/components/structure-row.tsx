import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ReactNode } from 'react';

import { Pill } from '@ua/ui';
import { themedStyles } from '@ua/ui/theme';

/**
 * One curriculum node in a single row: toggle arrow, name, designation,
 * state, and the type pill share one line; the name part truncates when
 * crowded. The arrow tap (`onToggle`) and the row tap (`onPress`) are
 * separate press targets.
 */
export function StructureRow({
  name,
  designation,
  elementType,
  status,
  meta,
  toggle,
  onPress,
  onToggle,
  depth = 0,
  selected = false,
}: {
  name: string;
  designation?: string;
  elementType?: string;
  status?: string;
  /** Extra info, e.g. child count. Appended after designation and status. */
  meta?: string;
  /** Expand affordance. Omitted for leaves and for rows without toggling. */
  toggle?: 'open' | 'closed';
  /** Row tap. Separate from the arrow tap, which calls `onToggle`. */
  onPress?: () => void;
  onToggle?: () => void;
  /** Nesting depth. Rows below the root get a horizontal stub into the rail. */
  depth?: number;
  /** Blue outline for the selected row. */
  selected?: boolean;
}) {
  const rest = [designation, status, meta].filter(Boolean).join(' · ');
  const row = (
    <View style={styles.box}>
      <View style={styles.top}>
        {toggle ? (
          <Pressable onPress={onToggle} hitSlop={8} style={styles.arrowHit}>
            <Text style={styles.arrow}>{toggle === 'open' ? '▾' : '▸'}</Text>
          </Pressable>
        ) : null}
        <Pressable style={styles.flex} onPress={onPress} disabled={!onPress}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
            {rest ? <Text style={styles.rest}> · {rest}</Text> : null}
          </Text>
        </Pressable>
        {elementType ? <Pill label={elementType} tone={elementType === 'ROOT' ? 'blue' : 'neutral'} /> : null}
      </View>
    </View>
  );
  const framed = <View style={[styles.selectFrame, selected && styles.selected]}>{row}</View>;
  if (!depth) return framed;
  return (
    <View style={styles.branch}>
      <View style={styles.stub} />
      {framed}
    </View>
  );
}

/** Vertical rail wrapping the children of one node. Pairs with the row stubs. */
export function TreeChildren({ children }: { children: ReactNode }) {
  return <View style={styles.kids}>{children}</View>;
}

const styles = themedStyles((colors) => ({
  box: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  selectFrame: { borderWidth: 2, borderColor: 'transparent', borderRadius: 14 },
  selected: { borderColor: colors.blue },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  arrowHit: { padding: 2 },
  arrow: { color: colors.blue, fontSize: 14, fontWeight: '700', width: 14, textAlign: 'center' },
  name: { color: colors.anthracite, fontSize: 15, fontWeight: '700', lineHeight: 20 },
  rest: { color: colors.inkSoft, fontSize: 13, fontWeight: '400' },
  flex: { flex: 1 },
  branch: { position: 'relative' },
  stub: { position: 'absolute', left: -12, top: 21, width: 12, height: StyleSheet.hairlineWidth, backgroundColor: colors.line },
  kids: { marginLeft: 11, borderLeftWidth: 1, borderColor: colors.line, paddingLeft: 12, gap: 6 },
}));
