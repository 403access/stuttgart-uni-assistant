import type { ReactElement, ReactNode } from 'react';
import { Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import type { RefreshControlProps, StyleProp, TextInputProps, TextStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AmbientBackground } from '@/src/components/ambient-background';
import { usePaneMode , useResponsive } from '@ua/ui';
import { colors, themedStyles } from '@/src/theme';

/** Pressable state as reported by react-native-web (native only sends `pressed`). */
type InteractionState = { pressed: boolean; hovered?: boolean; focused?: boolean };

/**
 * Hover treatment for clickable surfaces on the web. Native never receives the
 * style because `hovered` is always false there, so the mobile look is intact.
 */
function hoverStyle(hovered: boolean | undefined) {
  return hovered && Platform.OS === 'web' ? styles.hover : null;
}

/** Clicking a card is an obvious affordance on the web; show the pointer. */
const pointerStyle = Platform.OS === 'web' ? ({ cursor: 'pointer' } as const) : null;

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
  refreshControl,
  action,
  flush = false,
  topInset = false,
  wide = false,
  narrow = false,
}: {
  children: ReactNode;
  kicker?: string;
  title?: string;
  subtitle?: string;
  scroll?: boolean;
  footer?: ReactNode;
  /**
   * Fixed bar pinned above the scroll view. It stays put while the list scrolls and
   * while pulling to refresh, so a pull never drags the controls down with it.
   */
  stickyHeader?: ReactNode;
  /** Native pull-to-refresh indicator for the scroll view, e.g. a `RefreshControl`. */
  refreshControl?: ReactElement<RefreshControlProps>;
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
  /** Web only: use the extra-wide container for dense, multi-column screens. */
  wide?: boolean;
  /** Web only: use a reading-width column for detail pages and forms. */
  narrow?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { isDesktop } = useResponsive();
  const embedded = usePaneMode();
  const header = (
    <View style={styles.headerRow}>
      <View style={{ gap: 6, flex: 1 }}>
        {kicker ? <Text style={styles.kicker}>{kicker}</Text> : null}
        {title ? <Text style={[styles.title, isDesktop && styles.titleDesktop]}>{title}</Text> : null}
        {subtitle ? <Text style={[styles.subtitle, isDesktop && styles.subtitleDesktop]}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
  const body = (
    <View
      style={[
        styles.body,
        isDesktop && !embedded && !flush && styles.bodyDesktop,
        embedded && styles.bodyEmbedded,
        !scroll && styles.bodyFill,
        flush && styles.bodyFlush,
      ]}>
      {!embedded && (title || kicker || action) ? header : null}
      {children}
    </View>
  );
  return (
    <View style={[styles.screen, !embedded && topInset && { paddingTop: insets.top }]}>
      {embedded ? null : <AmbientBackground />}
      {/*
        On the desktop the app column uses the workspace beside the sidebar.
        Reading-heavy screens opt into `narrow`; an embedded pane always fills
        the space its host gives it.
      */}
      <View
        style={[
          styles.frame,
          !embedded && isDesktop && styles.frameDesktop,
          !embedded && isDesktop && wide && styles.frameWide,
          !embedded && isDesktop && narrow && !wide && styles.frameNarrow,
        ]}>
        {stickyHeader ? <View style={styles.stickyHeader}>{stickyHeader}</View> : null}
        {scroll ? (
          <ScrollView
            // iOS adds the home-indicator inset to the scroll content automatically.
            contentContainerStyle={[
              styles.scroll,
              !embedded && isDesktop && styles.scrollDesktop,
              Platform.OS === 'android' && !topInset && { paddingBottom: 28 + insets.bottom },
            ]}
            contentInsetAdjustmentBehavior="automatic"
            keyboardShouldPersistTaps="handled"
            refreshControl={refreshControl}
          >
            {body}
          </ScrollView>
        ) : (
          body
        )}
        {footer ? <View style={{ paddingBottom: Math.max(insets.bottom, 8) }}>{footer}</View> : null}
      </View>
    </View>
  );
}

/** Position of a row inside a grouped list: only the outer corners stay rounded. */
export type CardPosition = 'first' | 'middle' | 'last';

/** Row `index` in a grouped list of `total` rows — single rows stay a full card. */
export function listPosition(index: number, total: number): CardPosition | undefined {
  if (total <= 1) return undefined;
  if (index === 0) return 'first';
  if (index === total - 1) return 'last';
  return 'middle';
}

function groupedCardStyle(square: boolean, position?: CardPosition) {
  if (!position) return square ? styles.cardSquare : null;
  return [
    styles.cardGrouped,
    position === 'first' && styles.cardGroupedFirst,
    position === 'last' && styles.cardGroupedLast,
  ];
}

export function Card({
  children,
  onPress,
  square = false,
  position,
}: {
  children: ReactNode;
  onPress?: () => void;
  square?: boolean;
  position?: CardPosition;
}) {
  const grouped = groupedCardStyle(square, position);
  if (!onPress) return <View style={[styles.card, grouped]}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      style={(state: InteractionState) => [
        styles.card,
        grouped,
        pointerStyle,
        hoverStyle(state.hovered),
        state.pressed && styles.pressed,
      ]}>
      {children}
    </Pressable>
  );
}

export function Section({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && onAction ? (
        <Pressable onPress={onAction} hitSlop={8} style={pointerStyle}>
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
    <Pressable
      onPress={onPress}
      style={(state: InteractionState) => [
        styles.button,
        secondary && styles.buttonSecondary,
        pointerStyle,
        hoverStyle(state.hovered) && styles.buttonHover,
        state.pressed && styles.pressed,
      ]}>
      <Text style={[styles.buttonText, secondary && styles.buttonTextSecondary]}>{label}</Text>
    </Pressable>
  );
}

export function FieldLabel({ children }: { children: string }) {
  return <Text style={styles.fieldLabel}>{children}</Text>;
}

/** Square-ish search/text field. `compact` trims the vertical padding for a toolbar row. */
export function SearchField({
  value,
  onChangeText,
  placeholder,
  style,
  compact = false,
  ...rest
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  style?: StyleProp<TextStyle>;
  compact?: boolean;
} & Omit<TextInputProps, 'value' | 'onChangeText' | 'placeholder' | 'style'>) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.mute}
      style={[styles.input, compact && styles.inputCompact, style]}
      {...rest}
    />
  );
}

export function Muted({ children }: { children: ReactNode }) {
  return <Text style={styles.muted}>{children}</Text>;
}

export function Strong({ children }: { children: ReactNode }) {
  return <Text style={styles.strong}>{children}</Text>;
}

export function InfoRow({ title, meta, detail, onPress, position, tone }: { title: string; meta?: string; detail?: string; onPress?: () => void; position?: CardPosition; tone?: 'danger' }) {
  return (
    <Card onPress={onPress} position={position}>
      <View style={styles.row}>
        <Text style={[styles.strong, styles.flex, tone === 'danger' && styles.strongDanger]}>{title}</Text>
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}
      </View>
      {detail ? <Text style={styles.muted}>{detail}</Text> : null}
    </Card>
  );
}

const styles = themedStyles((colors) => ({
  screen: { flex: 1, backgroundColor: colors.mist },
  frame: { flex: 1 },
  // Desktop uses the workspace beside the sidebar. Only reading-heavy screens
  // opt into `narrow`; list, grid, and master-detail screens stay fluid.
  frameDesktop: { width: '100%' },
  frameWide: { width: '100%' },
  // Reading-heavy screens still get a comfortable line length.
  frameNarrow: { maxWidth: 960, alignSelf: 'center' },
  stickyHeader: { flexGrow: 0, flexShrink: 0 },
  scroll: { paddingBottom: 28 },
  scrollDesktop: { paddingBottom: 48 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  body: { paddingHorizontal: 20, paddingTop: 12, gap: 14 },
  bodyDesktop: { paddingHorizontal: 32, paddingTop: 20, gap: 16 },
  bodyEmbedded: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 8, gap: 14 },
  bodyFill: { flex: 1, paddingBottom: 8 },
  bodyFlush: { paddingHorizontal: 0 },
  kicker: { color: colors.blue, fontSize: 12, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase' },
  title: { color: colors.anthracite, fontSize: 30, lineHeight: 34, fontWeight: '700', letterSpacing: -0.6 },
  titleDesktop: { fontSize: 34, lineHeight: 40, letterSpacing: -0.8 },
  subtitle: { color: colors.inkSoft, fontSize: 15, lineHeight: 21 },
  subtitleDesktop: { fontSize: 16, lineHeight: 23 },
  card: { backgroundColor: colors.paper, borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 8 },
  cardSquare: { borderRadius: 0 },
  // Grouped list rows: flat seams so touching rows share a single border line,
  // with rounded corners kept only on the first row's top and the last row's bottom.
  cardGrouped: { borderRadius: 0, borderTopWidth: 0 },
  cardGroupedFirst: { borderTopWidth: 1, borderTopLeftRadius: 18, borderTopRightRadius: 18 },
  cardGroupedLast: { borderBottomLeftRadius: 18, borderBottomRightRadius: 18 },
  pressed: { opacity: 0.72 },
  hover: { borderColor: colors.light },
  buttonHover: { opacity: 0.88 },
  section: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 },
  sectionTitle: { color: colors.blue, fontSize: 12, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase' },
  sectionAction: { color: colors.blue, fontSize: 14, fontWeight: '600' },
  pill: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontSize: 12, fontWeight: '700' },
  track: { height: 8, borderRadius: 99, backgroundColor: colors.blueSoft, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 99, backgroundColor: colors.blue },
  button: { backgroundColor: colors.brand, borderRadius: 14, minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  buttonSecondary: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  buttonTextSecondary: { color: colors.blue },
  fieldLabel: { color: colors.inkSoft, fontSize: 13, fontWeight: '600' },
  input: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.anthracite,
  },
  inputCompact: { paddingVertical: 8 },
  muted: { color: colors.inkSoft, fontSize: 14, lineHeight: 20 },
  strong: { color: colors.anthracite, fontSize: 16, fontWeight: '700' },
  strongDanger: { color: colors.danger },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' },
  flex: { flex: 1 },
  meta: { color: colors.blue, fontSize: 13, fontWeight: '700' },
}));
