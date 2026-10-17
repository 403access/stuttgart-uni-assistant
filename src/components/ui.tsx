import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/src/theme';

export function Mark({ size = 36 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          position: 'absolute',
          width: size * 0.72,
          height: size * 0.72,
          borderRadius: size,
          backgroundColor: colors.blue,
          left: 0,
          top: size * 0.16,
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: size * 0.46,
          height: size * 0.46,
          borderRadius: size,
          backgroundColor: colors.light,
          right: 0,
          top: 0,
        }}
      />
    </View>
  );
}

export function Screen({
  children,
  kicker,
  title,
  subtitle,
  scroll = true,
  footer,
  stickyHeader,
  action,
  flush = false,
  topInset = false,
}: {
  children: ReactNode;
  kicker?: string;
  title?: string;
  subtitle?: string;
  scroll?: boolean;
  footer?: ReactNode;
  stickyHeader?: ReactNode;
  /** Rendered at the top right of the header row, e.g. an icon button. */
  action?: ReactNode;
  /** Remove the side margins so cards reach the screen edges (e.g. the mail read view). */
  flush?: boolean;
  /**
   * Pad the top by the safe-area inset. Off by default because a screen pushed onto
   * the stack already sits below the native header, which clears the status bar — an
   * extra inset would only leave an empty gap. Headerless screens (the tabs, `oidc`)
   * pass it so their content clears the status bar.
   */
  topInset?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const header = (
    <View style={styles.headerRow}>
      <View style={{ gap: 6, flex: 1 }}>
        {kicker ? <Text style={styles.kicker}>{kicker}</Text> : null}
        {title ? <Text style={styles.title}>{title}</Text> : null}
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
  const body = (
    <View style={[styles.body, !scroll && styles.bodyFill, flush && styles.bodyFlush]}>
      {title || kicker || action ? header : null}
      {children}
    </View>
  );
  return (
    <View style={[styles.screen, topInset && { paddingTop: insets.top }]}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          stickyHeaderIndices={stickyHeader ? [0] : undefined}
        >
          {stickyHeader ?? null}
          {body}
        </ScrollView>
      ) : (
        body
      )}
      {footer ? <View style={{ paddingBottom: Math.max(insets.bottom, 8) }}>{footer}</View> : null}
    </View>
  );
}

export function Card({ children, onPress, square = false }: { children: ReactNode; onPress?: () => void; square?: boolean }) {
  if (!onPress) return <View style={[styles.card, square && styles.cardSquare]}>{children}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, square && styles.cardSquare, pressed && styles.pressed]}>
      {children}
    </Pressable>
  );
}

export function Section({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && onAction ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Pill({ label, active = false, tone = 'neutral' }: { label: string; active?: boolean; tone?: 'neutral' | 'blue' | 'ok' | 'wait' | 'stop' }) {
  const palette = {
    neutral: { bg: colors.mist, fg: colors.anthracite },
    blue: { bg: colors.blueSoft, fg: colors.blue },
    ok: { bg: colors.successSoft, fg: colors.success },
    wait: { bg: colors.warningSoft, fg: colors.warning },
    stop: { bg: colors.dangerSoft, fg: colors.danger },
  }[active ? 'blue' : tone];
  return (
    <View style={[styles.pill, { backgroundColor: palette.bg }]}>
      <Text style={[styles.pillText, { color: palette.fg }]}>{label}</Text>
    </View>
  );
}

export function Meter({ value, max }: { value: number; max: number }) {
  const width = max <= 0 ? 0 : Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${width}%` }]} />
    </View>
  );
}

export function Button({ label, onPress, secondary = false }: { label: string; onPress: () => void; secondary?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.button, secondary && styles.buttonSecondary, pressed && styles.pressed]}>
      <Text style={[styles.buttonText, secondary && styles.buttonTextSecondary]}>{label}</Text>
    </Pressable>
  );
}

export function FieldLabel({ children }: { children: string }) {
  return <Text style={styles.fieldLabel}>{children}</Text>;
}

export function Muted({ children }: { children: ReactNode }) {
  return <Text style={styles.muted}>{children}</Text>;
}

export function Strong({ children }: { children: ReactNode }) {
  return <Text style={styles.strong}>{children}</Text>;
}

export function InfoRow({ title, meta, detail, onPress }: { title: string; meta?: string; detail?: string; onPress?: () => void }) {
  return (
    <Card onPress={onPress}>
      <View style={styles.row}>
        <Text style={[styles.strong, styles.flex]}>{title}</Text>
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}
      </View>
      {detail ? <Text style={styles.muted}>{detail}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.mist },
  scroll: { paddingBottom: 28 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  body: { paddingHorizontal: 20, paddingTop: 12, gap: 14 },
  bodyFill: { flex: 1, paddingBottom: 8 },
  bodyFlush: { paddingHorizontal: 0 },
  kicker: { color: colors.blue, fontSize: 12, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase' },
  title: { color: colors.anthracite, fontSize: 30, lineHeight: 34, fontWeight: '700', letterSpacing: -0.6 },
  subtitle: { color: colors.inkSoft, fontSize: 15, lineHeight: 21 },
  card: { backgroundColor: colors.paper, borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 8 },
  cardSquare: { borderRadius: 0 },
  pressed: { opacity: 0.72 },
  section: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 },
  sectionTitle: { color: colors.blue, fontSize: 12, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase' },
  sectionAction: { color: colors.blue, fontSize: 14, fontWeight: '600' },
  pill: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontSize: 12, fontWeight: '700' },
  track: { height: 8, borderRadius: 99, backgroundColor: colors.blueSoft, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 99, backgroundColor: colors.blue },
  button: { backgroundColor: colors.blue, borderRadius: 14, minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  buttonSecondary: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  buttonTextSecondary: { color: colors.blue },
  fieldLabel: { color: colors.inkSoft, fontSize: 13, fontWeight: '600' },
  muted: { color: colors.inkSoft, fontSize: 14, lineHeight: 20 },
  strong: { color: colors.anthracite, fontSize: 16, fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' },
  flex: { flex: 1 },
  meta: { color: colors.blue, fontSize: 13, fontWeight: '700' },
});
