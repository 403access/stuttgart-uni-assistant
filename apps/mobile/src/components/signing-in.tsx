import { useEffect, useState } from 'react';
import { Animated, Easing, Text, View } from 'react-native';

import { CAMPUS_LOGIN_PHASES, isPhaseDone, type CampusLoginPhase } from '@/src/auth/campus-progress';
import { useReducedMotion } from '@ua/ui';
import { colors, themedStyles } from '@ua/ui/theme';
import { tx } from '@ua/core/format';

/**
 * Waiting state for a sign-in. The mark orbits while the phases below fill in,
 * so the user sees which part of the flow is running instead of a dead spinner:
 * a hidden WebView signing in against C@MPUS takes ten to thirty seconds, and a
 * frozen screen reads as a broken app.
 *
 * The animation is the app's own mark, not a generic spinner. Motion is dropped
 * when the platform asks for reduced motion.
 */

type Locale = 'de' | 'en';

function phaseLabel(phase: CampusLoginPhase, locale: Locale): string {
  if (phase === 'connect') return tx(locale, 'signingIn.verbindung');
  if (phase === 'identify') return tx(locale, 'signingIn.anmeldung');
  if (phase === 'adopt') return tx(locale, 'signingIn.sitzung');
  return tx(locale, 'signingIn.studiengaenge');
}

/** The mark, with the small circle orbiting the large one. */
function OrbitingMark({ size, animate }: { size: number; animate: boolean }) {
  const [spin] = useState(() => new Animated.Value(0));
  const [halo] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!animate) return undefined;
    const orbit = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 2600, easing: Easing.linear, useNativeDriver: true }),
    );
    const pulse = Animated.loop(
      Animated.timing(halo, { toValue: 1, duration: 2600, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    );
    orbit.start();
    pulse.start();
    return () => {
      orbit.stop();
      pulse.stop();
      spin.setValue(0);
      halo.setValue(0);
    };
  }, [animate, halo, spin]);

  const radius = size * 0.3;
  const rotation = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const haloScale = halo.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.35] });
  const haloOpacity = halo.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.35, 0.12, 0] });

  const big = size * 0.62;
  const small = size * 0.4;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {animate ? (
        <Animated.View
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size,
            borderWidth: 1,
            borderColor: colors.light,
            opacity: haloOpacity,
            transform: [{ scale: haloScale }],
          }}
        />
      ) : null}
      <View
        style={{
          position: 'absolute',
          width: big,
          height: big,
          borderRadius: big,
          backgroundColor: colors.brand,
          left: (size - big) / 2,
          top: (size - big) / 2,
        }}
      />
      <Animated.View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          transform: [{ rotate: animate ? rotation : '0deg' }],
        }}>
        <View
          style={{
            position: 'absolute',
            width: small,
            height: small,
            borderRadius: small,
            backgroundColor: colors.light,
            left: size / 2 + radius - small / 2,
            top: size / 2 - small / 2,
          }}
        />
      </Animated.View>
    </View>
  );
}

function PhaseRow({ label, done, active, animate }: { label: string; done: boolean; active: boolean; animate: boolean }) {
  const [pulse] = useState(() => new Animated.Value(0.4));
  useEffect(() => {
    if (!active || !animate) {
      pulse.setValue(active ? 1 : 0.4);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, animate, pulse]);

  return (
    <View style={[styles.row, active && styles.rowActive]}>
      {done ? (
        <Text style={styles.check}>✓</Text>
      ) : (
        <Animated.View style={[styles.dot, active && styles.dotActive, { opacity: active ? pulse : 0.35 }]} />
      )}
      <Text style={[styles.rowLabel, done && styles.rowLabelDone, active && styles.rowLabelActive]}>{label}</Text>
    </View>
  );
}

export function SigningIn({
  locale,
  phase,
  detail,
  compact = false,
}: {
  locale: Locale;
  phase: CampusLoginPhase;
  detail?: string;
  compact?: boolean;
}) {
  const reduced = useReducedMotion();
  const animate = !reduced;
  const label = phaseLabel(phase, locale);

  if (compact) {
    return (
      <View style={styles.compact} accessible accessibilityRole="progressbar" accessibilityLabel={label}>
        <OrbitingMark size={22} animate={animate} />
        <View style={{ flex: 1 }}>
          <Text style={styles.compactLabel}>{label}</Text>
          {detail ? <Text style={styles.detail}>{detail}</Text> : null}
        </View>
      </View>
    );
  }

  // Keep the detail line in place from the first frame. It starts as
  // "Initializing …" and later becomes the host or phase detail; rendering it
  // conditionally made the block jump when the first value arrived.
  const detailText = detail || tx(locale, 'signingIn.initialisierung');

  return (
    <View style={styles.shell} accessible accessibilityRole="progressbar" accessibilityLabel={label}>
      <OrbitingMark size={84} animate={animate} />
      <View style={styles.heading}>
        <Text style={styles.label} accessibilityLiveRegion="polite">
          {label}
        </Text>
        <Text style={styles.detail}>{detailText}</Text>
      </View>
      <View style={styles.phases}>
        {CAMPUS_LOGIN_PHASES.map((item) => (
          <PhaseRow
            key={item}
            label={phaseLabel(item, locale)}
            done={isPhaseDone(item, phase)}
            active={item === phase}
            animate={animate}
          />
        ))}
      </View>
    </View>
  );
}

const styles = themedStyles((colors) => ({
  // The full-screen wait spreads the mark, the current phase and the step list
  // across the available sheet, so the surface reads as progress rather than as
  // a block parked in the middle.
  shell: { flex: 1, alignItems: 'center', justifyContent: 'space-evenly', gap: 14, paddingVertical: 12 },
  compact: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  compactLabel: { color: colors.anthracite, fontWeight: '700', fontSize: 14 },
  // The phase label and its detail are one unit, so the detail sits directly
  // under the label instead of being spread away from it.
  heading: { alignItems: 'center', gap: 4 },
  label: { color: colors.anthracite, fontWeight: '700', fontSize: 19, textAlign: 'center' },
  detail: { color: colors.inkSoft, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  phases: { alignSelf: 'stretch', gap: 6, paddingTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14 },
  rowActive: { backgroundColor: colors.blueSoft },
  check: { color: colors.success, fontWeight: '700', width: 18, textAlign: 'center' },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    marginHorizontal: 4,
  },
  dotActive: { borderColor: colors.blue, backgroundColor: colors.blueSoft },
  rowLabel: { color: colors.mute, fontSize: 14 },
  rowLabelActive: { color: colors.anthracite, fontWeight: '700' },
  rowLabelDone: { color: colors.inkSoft },
}));
