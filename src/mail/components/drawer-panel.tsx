import type { ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, themedStyles } from '@/src/theme';

import { ControlIcon } from './control-icon';

/** Drawer body: same title, grouping, row and check treatment as the existing sheets. */
export function DrawerPanel({ title, closeLabel, onClose, children }: { title: string; closeLabel: string; onClose: () => void; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.drawerPanel, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.drawerHeader}>
        <Text style={styles.drawerTitle}>{title}</Text>
        <Pressable
          style={({ pressed }) => [styles.drawerClose, pressed && styles.pressed]}
          onPress={onClose}
          accessibilityLabel={closeLabel}
          accessibilityRole="button"
          hitSlop={8}
        >
          <ControlIcon symbol="xmark" material="close" color={colors.mute} />
        </Pressable>
      </View>
      <ScrollView style={styles.drawerScroll} contentContainerStyle={styles.drawerScrollContent}>
        {children}
      </ScrollView>
    </View>
  );
}

const styles = themedStyles((colors) => ({
  drawerPanel: { flex: 1, backgroundColor: colors.paper, paddingHorizontal: 16 },
  drawerHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 6 },
  drawerTitle: {
    flex: 1,
    color: colors.blue,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    paddingTop: 8,
    paddingBottom: 6,
  },
  drawerClose: { padding: 6, borderRadius: 999 },
  drawerScroll: { flex: 1 },
  drawerScrollContent: { paddingBottom: 8 },
  pressed: { opacity: 0.72 },
}));
