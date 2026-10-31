import { Pressable, Text, View } from 'react-native';

import { themedStyles } from '@ua/ui/theme';
import { pick, tx } from '@ua/core/format';
import type { Locale } from '@ua/core/domain/types';

import type { ArticulationPhaseWindow } from '../core';

/**
 * The sound's own stages. The chip that is running is highlighted, and tapping
 * any chip jumps the animation to that phase — no need to wait for the loop.
 */
export function PhaseStrip({
  locale,
  windows,
  phaseIndex,
  onSelect,
}: {
  locale: Locale;
  windows: ArticulationPhaseWindow[];
  phaseIndex: number;
  onSelect?: (index: number) => void;
}) {
  return (
    <View style={styles.strip}>
      {windows.map((window, index) => {
        const current = index === phaseIndex;
        return (
          <Pressable
            key={`${window.phase.id}-${index}`}
            accessibilityRole="button"
            accessibilityLabel={tx(locale, 'quiz.studio.jump_phase', [pick(window.phase.label, locale)])}
            accessibilityState={{ selected: current }}
            onPress={() => onSelect?.(index)}
            style={({ pressed }) => [styles.phase, current && styles.phaseActive, pressed && styles.pressed]}
          >
            <View style={[styles.dot, current && styles.dotActive]} />
            <Text style={[styles.label, current && styles.labelActive]}>
              {pick(window.phase.label, locale)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = themedStyles((colors) => ({
  strip: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  phase: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.mist,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  phaseActive: { backgroundColor: colors.blueSoft },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.mute },
  dotActive: { backgroundColor: colors.blue },
  label: { color: colors.mute, fontSize: 11, fontWeight: '700' },
  labelActive: { color: colors.blue },
  pressed: { opacity: 0.7 },
}));
