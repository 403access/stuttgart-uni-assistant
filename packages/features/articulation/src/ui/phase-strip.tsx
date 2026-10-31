import { Text, View } from 'react-native';

import { themedStyles } from '@ua/ui/theme';
import { pick } from '@ua/core/format';
import type { Locale } from '@ua/core/domain/types';

import type { ArticulationPhaseWindow } from '../core';

/** The sound's own stages, with the one that is running highlighted. */
export function PhaseStrip({
  locale,
  windows,
  phaseIndex,
  active,
}: {
  locale: Locale;
  windows: ArticulationPhaseWindow[];
  phaseIndex: number;
  active: boolean;
}) {
  return (
    <View style={styles.strip}>
      {windows.map((window, index) => {
        const current = active && index === phaseIndex;
        return (
          <View key={`${window.phase.id}-${index}`} style={[styles.phase, current && styles.phaseActive]}>
            <View style={[styles.dot, current && styles.dotActive]} />
            <Text style={[styles.label, current && styles.labelActive]}>
              {pick(window.phase.label, locale)}
            </Text>
          </View>
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
}));
