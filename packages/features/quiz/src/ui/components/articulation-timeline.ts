import { useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';

import { useReducedMotion } from '@ua/ui';

import type { ArticulationSound } from '@ua/quiz-content/types';

/**
 * One shared storyboard for the 2D and 3D views: a `clock` that runs 0 → 1 every
 * cycle, the three beats (airstream, voice, articulation), and the cross-fade
 * when the learner picks another sound.
 */
export const CYCLE_MS = 5200;
export const AIR_END = 0.4;
export const VOICE_END = 0.62;

export const STAGES = ['airflow', 'voice', 'articulation'] as const;
export type Stage = (typeof STAGES)[number];

export function stageAt(value: number): number {
  if (value < AIR_END) return 0;
  if (value < VOICE_END) return 1;
  return 2;
}

/** Triangular highlight along the timeline, sampled so `interpolate` can use it. */
export function wave(center: number, width = 0.07): { inputRange: number[]; outputRange: number[] } {
  const steps = 60;
  const inputRange: number[] = [];
  const outputRange: number[] = [];
  for (let index = 0; index <= steps; index += 1) {
    const value = index / steps;
    inputRange.push(value);
    const distance = Math.abs(value - center);
    outputRange.push(distance < width ? 1 - distance / width : 0);
  }
  return { inputRange, outputRange };
}

/** Air lights up twice: on the way up, and on the way out through mouth or nose. */
export function airstreamCenter(position: number): number {
  if (position <= 0.5) return 0.04 + (position / 0.5) * 0.3;
  return 0.64 + ((position - 0.5) / 0.5) * 0.3;
}

export function useArticulationTimeline(sound: ArticulationSound, playing: boolean) {
  const reduced = useReducedMotion();
  const active = playing && !reduced;
  const clock = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const [phase, setPhase] = useState(0);
  const [displayed, setDisplayed] = useState(sound);
  const latest = useRef(sound);

  // Cross-fade the articulators when the learner picks another sound, so the
  // tongue never jumps from one position to the next.
  useEffect(() => {
    latest.current = sound;
    if (displayed.id === sound.id) return;
    fade.stopAnimation();
    Animated.timing(fade, {
      toValue: 0,
      duration: 150,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;
      setDisplayed(latest.current);
      Animated.timing(fade, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });
  }, [sound, displayed.id, fade]);

  useEffect(() => {
    if (!active) {
      clock.stopAnimation();
      clock.setValue(0);
      setPhase(0);
      return;
    }
    clock.setValue(0);
    const listener = clock.addListener(({ value }) => {
      const next = stageAt(value);
      setPhase((current) => (current === next ? current : next));
    });
    const loop = Animated.loop(
      Animated.timing(clock, {
        toValue: 1,
        duration: CYCLE_MS,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
    );
    loop.start();
    return () => {
      loop.stop();
      clock.removeListener(listener);
    };
    // Restart the story whenever the animated sound changes.
  }, [active, clock, displayed.id]);

  return { clock, fade, phase, displayed, active, reduced };
}

/** Shared focus-ring and voicing-ring interpolations. */
export function useArticulationRings(clock: Animated.Value) {
  const focusOpacity = clock.interpolate({
    inputRange: [0, VOICE_END, VOICE_END + 0.06, 0.9, 1],
    outputRange: [0, 0, 0.95, 0.75, 0],
  });
  const focusScale = clock.interpolate({
    inputRange: [0, 0.68, 1],
    outputRange: [0.75, 1.35, 1.35],
  });
  return { focusOpacity, focusScale };
}
