import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { useReducedMotion } from '@/src/hooks/use-reduced-motion';
import { colors, themedStyles } from '@/src/theme';

/**
 * The list is never revealed faster than this, so opening the tab or a mailbox
 * reads as a load instead of rows popping in from a cache. A real network read
 * can take longer; the skeleton then simply stays up until the rows are there.
 */
const REVEAL_MIN_MS = 620;

/** One calm fade-and-rise when the skeleton hands over to the loaded rows. */
const REVEAL_MS = 300;

/** Varying bone widths keep the skeleton from reading as a solid block. */
const SKELETON_SUBJECT_WIDTHS = ['72%', '64%', '78%', '58%'] as const;

/** One shared pulse rhythm for the list and toolbar placeholders. */
function useSkeletonPulse(animate: boolean) {
  const [pulse] = useState(() => new Animated.Value(0.55));

  useEffect(() => {
    if (!animate) {
      pulse.setValue(1);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 720, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.55, duration: 720, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [animate, pulse]);

  return pulse;
}

/**
 * Placeholder in the rhythm of the real rows: spinner, subject, sender, date.
 * The pulse stops when the platform asks for reduced motion.
 */
export function MailListSkeleton({ label, animate }: { label: string; animate: boolean }) {
  const pulse = useSkeletonPulse(animate);

  return (
    <View style={styles.skeletonWrap} accessible accessibilityRole="progressbar" accessibilityLabel={label}>
      <View style={styles.loadingRow}>
        <ActivityIndicator size="small" color={colors.blue} />
        <Text style={styles.loadingText}>{label}</Text>
      </View>
      <Animated.View style={[styles.list, { opacity: pulse }]}>
        {SKELETON_SUBJECT_WIDTHS.map((width, index) => (
          <View key={width} style={[styles.skeletonRow, index < SKELETON_SUBJECT_WIDTHS.length - 1 && styles.listRowLine]}>
            <View style={styles.skeletonDot} />
            <View style={styles.skeletonLines}>
              <View style={[styles.skeletonBone, { width }]} />
              <View style={[styles.skeletonBone, styles.skeletonBoneFrom]} />
              <View style={[styles.skeletonBone, styles.skeletonBoneMeta]} />
            </View>
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

/**
 * Placeholder for the search field, sort picker and filter button. Without it
 * the sticky bar shows a lone mailbox button until the first read finishes and
 * then pops the whole control row in.
 */
export function ToolbarSkeleton({ label, animate }: { label: string; animate: boolean }) {
  const pulse = useSkeletonPulse(animate);

  return (
    <Animated.View style={[styles.toolbarContent, { opacity: pulse }]} accessible accessibilityRole="progressbar" accessibilityLabel={label}>
      <View style={styles.searchSkeleton} />
      <View style={styles.dropdownSkeleton} />
      <View style={styles.toolSkeleton} />
    </Animated.View>
  );
}

/** Fade the real controls in once they become usable, instead of swapping them in. */
export function ToolbarReveal({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const [opacity] = useState(() => new Animated.Value(reduced ? 1 : 0));

  useEffect(() => {
    if (reduced) {
      opacity.setValue(1);
      return undefined;
    }
    const reveal = Animated.timing(opacity, { toValue: 1, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    reveal.start();
    return () => reveal.stop();
  }, [opacity, reduced]);

  return <Animated.View style={[styles.toolbarContent, { opacity }]}>{children}</Animated.View>;
}

/**
 * Keeps the skeleton up for at least `REVEAL_MIN_MS` and hands over with one
 * fade-and-rise. `pending` holds it longer while the first read of an empty
 * mailbox is still running. Mounted under the mailbox as key, so a switch
 * starts a fresh cycle; a disconnect/connect already remounts this branch.
 */
export function MailReveal({ pending, label, children }: { pending: boolean; label: string; children: ReactNode }) {
  const reduced = useReducedMotion();
  const [minElapsed, setMinElapsed] = useState(false);
  const [opacity] = useState(() => new Animated.Value(0));
  const [shift] = useState(() => new Animated.Value(10));
  const skeleton = !minElapsed || pending;

  useEffect(() => {
    const timer = setTimeout(() => setMinElapsed(true), REVEAL_MIN_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (skeleton) {
      opacity.setValue(0);
      shift.setValue(10);
      return undefined;
    }
    if (reduced) {
      opacity.setValue(1);
      shift.setValue(0);
      return undefined;
    }
    const reveal = Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: REVEAL_MS, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(shift, { toValue: 0, duration: REVEAL_MS, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]);
    reveal.start();
    return () => reveal.stop();
  }, [opacity, reduced, shift, skeleton]);

  if (skeleton) return <MailListSkeleton label={label} animate={!reduced} />;
  return <Animated.View style={[styles.reveal, { opacity, transform: [{ translateY: shift }] }]}>{children}</Animated.View>;
}

const styles = themedStyles((colors) => ({
  toolbarContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchSkeleton: { flex: 1, minWidth: 64, height: 38, borderRadius: 12, backgroundColor: colors.line },
  dropdownSkeleton: { width: 74, height: 38, borderRadius: 12, backgroundColor: colors.line },
  toolSkeleton: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.line },
  list: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 0,
    backgroundColor: colors.paper,
    marginHorizontal: -20,
  },
  listRowLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  // The list enters as one calm block; the gap matches the Screen body spacing
  // so wrapping the rows does not tighten their rhythm.
  reveal: { gap: 14 },
  skeletonWrap: { gap: 14 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 2 },
  loadingText: { flex: 1, color: colors.inkSoft, fontSize: 13, lineHeight: 19 },
  skeletonRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingVertical: 14 },
  skeletonDot: { width: 10, height: 10, borderRadius: 10, marginTop: 6, backgroundColor: colors.line },
  skeletonLines: { flex: 1, gap: 7 },
  skeletonBone: { height: 10, borderRadius: 5, backgroundColor: colors.line },
  skeletonBoneFrom: { width: '45%' },
  skeletonBoneMeta: { width: '30%', height: 8 },
}));
