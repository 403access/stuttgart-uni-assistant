import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/src/theme';

export type ToastTone = 'error' | 'info' | 'success';

export interface ToastInput {
  title: string;
  message?: string;
  tone?: ToastTone;
  actionLabel?: string;
  onAction?: () => void;
  durationMs?: number;
}

interface ToastItem {
  id: number;
  title: string;
  message?: string;
  tone: ToastTone;
  actionLabel?: string;
  onAction?: () => void;
  durationMs?: number;
}

let seq = 0;
const listeners = new Set<(item: ToastItem) => void>();

/** Show a toast from anywhere (screens, helpers). Rendered by `<ToastHost />` at the root. */
export function showToast(input: ToastInput): void {
  const item: ToastItem = { id: ++seq, tone: 'info', ...input };
  listeners.forEach((push) => push(item));
}

const toneColor: Record<ToastTone, string> = {
  error: colors.danger,
  info: colors.blue,
  success: colors.success,
};

export function ToastHost() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(() => {
    const push = (item: ToastItem): void => {
      setItems((current) => [...current.slice(-2), item]);
      const ms = item.durationMs ?? (item.tone === 'error' ? 9000 : 3500);
      setTimeout(() => {
        setItems((current) => current.filter((entry) => entry.id !== item.id));
      }, ms);
    };
    listeners.add(push);
    return () => {
      listeners.delete(push);
    };
  }, []);
  if (items.length === 0) return null;
  return (
    <View pointerEvents="box-none" style={[styles.host, { bottom: insets.bottom + 72 }]}>
      {items.map((item) => (
        <ToastCard key={item.id} item={item} onDismiss={() => setItems((current) => current.filter((entry) => entry.id !== item.id))} />
      ))}
    </View>
  );
}

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const slide = useRef(new Animated.Value(24)).current;
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(slide, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [slide, fade]);
  const accent = toneColor[item.tone];
  return (
    <Animated.View style={[styles.card, { opacity: fade, transform: [{ translateY: slide }] }]}>
      <View style={[styles.accent, { backgroundColor: accent }]} />
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        {item.message ? (
          <Text style={styles.message} numberOfLines={4}>
            {item.message}
          </Text>
        ) : null}
        {item.actionLabel && item.onAction ? (
          <Pressable
            onPress={() => {
              item.onAction?.();
              onDismiss();
            }}
            style={({ pressed }) => [styles.action, { borderColor: accent }, pressed && styles.pressed]}>
            <Text style={[styles.actionText, { color: accent }]}>{item.actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
      <Pressable onPress={onDismiss} hitSlop={10} style={styles.close}>
        <Text style={styles.closeText}>✕</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  card: {
    flexDirection: 'row',
    maxWidth: 480,
    width: '100%',
    backgroundColor: colors.anthracite,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  accent: { width: 5 },
  body: { flex: 1, gap: 4, paddingHorizontal: 12, paddingVertical: 10 },
  title: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', lineHeight: 20 },
  message: { color: '#D7DBDE', fontSize: 13, lineHeight: 18 },
  action: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 4,
  },
  actionText: { fontSize: 13, fontWeight: '700' },
  pressed: { opacity: 0.72 },
  close: { paddingHorizontal: 12, paddingTop: 8, alignSelf: 'flex-start' },
  closeText: { color: '#9AA1A8', fontSize: 14, fontWeight: '700' },
});
