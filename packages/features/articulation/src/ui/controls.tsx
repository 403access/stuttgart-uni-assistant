import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { colors, themedStyles } from '@ua/ui/theme';
import { tx } from '@ua/core/format';
import type { Locale } from '@ua/core/domain/types';

import { ARTICULATION_TURN } from '../core';

/** True minus sign, because a hyphen reads like a dash in a number. */
export function formatAngle(value: number): string {
  return `${Math.round(value)}\u00b0`.replace('-', '\u2212');
}

export function PlayButton({ locale, playing, onToggle }: { locale: Locale; playing: boolean; onToggle: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={tx(locale, playing ? 'quiz.studio.pause' : 'quiz.studio.play')}
      onPress={onToggle}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <MaterialIcons name={playing ? 'pause' : 'play-arrow'} size={20} color={colors.blue} />
      <Text style={styles.buttonLabel}>{tx(locale, playing ? 'quiz.studio.pause' : 'quiz.studio.play')}</Text>
    </Pressable>
  );
}

export function ViewToggle({
  locale,
  threeD,
  onChange,
}: {
  locale: Locale;
  threeD: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <View style={styles.toggle}>
      {[false, true].map((isThreeD) => (
        <Pressable
          key={isThreeD ? '3d' : '2d'}
          accessibilityRole="button"
          accessibilityState={{ selected: threeD === isThreeD }}
          accessibilityLabel={tx(locale, isThreeD ? 'quiz.studio.view.3d_a11y' : 'quiz.studio.view.2d_a11y')}
          onPress={() => onChange(isThreeD)}
          style={({ pressed }) => [
            styles.toggleOption,
            threeD === isThreeD && styles.toggleOptionActive,
            pressed && styles.pressed,
          ]}
        >
          <MaterialIcons
            name={isThreeD ? '3d-rotation' : 'aspect-ratio'}
            size={13}
            color={threeD === isThreeD ? colors.blue : colors.mute}
          />
          <Text style={[styles.toggleLabel, threeD === isThreeD && styles.toggleLabelActive]}>
            {tx(locale, isThreeD ? 'quiz.studio.view.3d' : 'quiz.studio.view.2d')}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

/** Preset angles next to the current one; dragging covers everything between. */
export function AngleRow({
  locale,
  angle,
  onSelect,
  caption,
}: {
  locale: Locale;
  angle: number;
  onSelect: (value: number) => void;
  caption: string;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{tx(locale, 'quiz.studio.turn')}</Text>
      {ARTICULATION_TURN.presets.map((preset) => {
        const selected = Math.round(angle) === preset;
        return (
          <Pressable
            key={preset}
            accessibilityRole="button"
            accessibilityLabel={tx(locale, 'quiz.studio.angle', [formatAngle(preset)])}
            accessibilityState={{ selected }}
            onPress={() => onSelect(preset)}
            style={({ pressed }) => [styles.preset, selected && styles.presetActive, pressed && styles.pressed]}
          >
            <Text style={[styles.presetLabel, selected && styles.presetLabelActive]}>{formatAngle(preset)}</Text>
          </Pressable>
        );
      })}
      <Text style={styles.caption}>{caption}</Text>
    </View>
  );
}

const styles = themedStyles((colors) => ({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  buttonLabel: { color: colors.blue, fontSize: 12, fontWeight: '700' },
  toggle: {
    marginLeft: 'auto',
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    padding: 2,
    gap: 2,
  },
  toggleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  toggleOptionActive: { backgroundColor: colors.blueSoft },
  toggleLabel: { color: colors.mute, fontSize: 11, fontWeight: '700' },
  toggleLabelActive: { color: colors.blue },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowLabel: {
    color: colors.mute,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  preset: {
    minWidth: 44,
    height: 30,
    paddingHorizontal: 8,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetActive: { borderColor: colors.blue, backgroundColor: colors.blueSoft },
  presetLabel: { color: colors.inkSoft, fontSize: 12, fontWeight: '700' },
  presetLabelActive: { color: colors.blue },
  caption: { marginLeft: 'auto', color: colors.inkSoft, fontSize: 11, fontWeight: '600' },
  pressed: { opacity: 0.7 },
}));

/** Playback speeds the studio offers. */
export const SPEEDS = [0.5, 1, 1.5, 2] as const;

/** German writes decimals with a comma, English with a point. */
export function formatSpeed(value: number, locale: Locale): string {
  const text = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return `${locale === 'de' ? text.replace('.', ',') : text}\u00d7`;
}

export function SpeedRow({
  locale,
  speed,
  onSelect,
}: {
  locale: Locale;
  speed: number;
  onSelect: (value: number) => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{tx(locale, 'quiz.studio.speed')}</Text>
      {SPEEDS.map((value) => {
        const selected = speed === value;
        return (
          <Pressable
            key={value}
            accessibilityRole="button"
            accessibilityLabel={tx(locale, 'quiz.studio.speed_value', [formatSpeed(value, locale)])}
            accessibilityState={{ selected }}
            onPress={() => onSelect(value)}
            style={({ pressed }) => [styles.preset, selected && styles.presetActive, pressed && styles.pressed]}
          >
            <Text style={[styles.presetLabel, selected && styles.presetLabelActive]}>
              {formatSpeed(value, locale)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
