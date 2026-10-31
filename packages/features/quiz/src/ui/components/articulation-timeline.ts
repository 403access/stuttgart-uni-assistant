import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';

import { useReducedMotion } from '@ua/ui';

import type { ArticulationSound } from '@ua/quiz-content/types';
import {
  articulationPhaseWindows,
  type ArticulationPhaseWindow,
} from '@ua/quiz-content/articulation';

/**
 * One shared storyboard for the 2D and 3D views: a `clock` that runs 0 → 1 over
 * the sound's phases, the phase that is active, and the cross-fade when the
 * learner picks another sound.
 *
 * Everything that moves — airstream, pressure ring, pose — is derived from the
 * clock through the phase windows, so the views stay in step.
 */
export const CYCLE_MS = 6400;
const CURVE_STEPS = 120;

export function windowAt(windows: ArticulationPhaseWindow[], value: number): ArticulationPhaseWindow {
  const clamped = Math.max(0, Math.min(0.999999, value));
  for (let index = windows.length - 1; index >= 0; index -= 1) {
    if (clamped >= windows[index].start) return windows[index];
  }
  return windows[0];
}

export function windowProgress(window: ArticulationPhaseWindow, value: number): number {
  const span = Math.max(0.0001, window.end - window.start);
  return Math.max(0, Math.min(1, (value - window.start) / span));
}

/**
 * The stretch of the airway the air may travel in a phase. A closure stops the
 * stream at the stricture; the release only shows the air leaving.
 */
export function airflowSegment(
  window: ArticulationPhaseWindow,
  focusT: number,
): [number, number] | null {
  switch (window.phase.airflow) {
    case 'none':
      return null;
    case 'rising':
    case 'blocked':
      return [0, Math.max(0.04, focusT)];
    case 'burst':
      return [focusT, 1];
    default:
      return [0, 1];
  }
}

/** How often the airstream travels its segment within one phase. */
function passes(window: ArticulationPhaseWindow): number {
  return window.phase.airflow === 'burst' ? 1 : 2;
}

/** Opacity of one air puff at time `t`, by its position on the lane (0–1). */
export function airstreamOpacity(
  windows: ArticulationPhaseWindow[],
  focusT: number,
  position: number,
  value: number,
): number {
  const window = windowAt(windows, value);
  const segment = airflowSegment(window, focusT);
  if (!segment) return 0;
  const [from, to] = segment;
  if (position < from || position > to) return 0;

  const span = Math.max(0.0001, to - from);
  const along = (position - from) / span;
  const progress = windowProgress(window, value);
  const phase = (progress * passes(window)) % 1;
  const distance = Math.abs(phase - along);
  const wrapped = Math.min(distance, 1 - distance);
  return Math.max(0, 1 - wrapped / 0.15);
}

/** The focus ring doubles as a pressure marker during a closure and a burst on release. */
export function ringOpacity(window: ArticulationPhaseWindow, value: number): number {
  const progress = windowProgress(window, value);
  switch (window.phase.airflow) {
    case 'rising':
      return 0;
    case 'blocked':
      return 0.45 + 0.4 * Math.abs(Math.sin(progress * Math.PI * 3));
    case 'burst':
      return Math.max(0, 1 - progress * 1.25);
    case 'turbulent':
      return 0.8;
    case 'free':
      return window.phase.id === 'flow' ? 0.3 : 0.5;
    case 'nasal':
      return 0.35;
    default:
      return 0;
  }
}

export function ringScale(window: ArticulationPhaseWindow, value: number): number {
  const progress = windowProgress(window, value);
  switch (window.phase.airflow) {
    case 'rising':
      return 1;
    case 'blocked':
      return 1 + 0.12 * Math.abs(Math.sin(progress * Math.PI * 3));
    case 'burst':
      return 0.7 + progress * 1.6;
    default:
      return 1;
  }
}

/** 0 = the articulators are still at rest, 1 = they hold the sound's pose. */
export function poseProgress(windows: ArticulationPhaseWindow[], value: number): number {
  const approach = windows.find((window) => window.phase.id === 'approach');
  if (!approach) return 1;
  const fade = (approach.end - approach.start) * 0.45;
  if (value < approach.end - fade) return 0;
  if (value < approach.end) return (value - (approach.end - fade)) / fade;
  return 1;
}

/**
 * Sample a function of the clock into the input/output arrays `Animated` needs,
 * so a complicated rule becomes a single interpolation per element.
 */
export function sampleCurve(fn: (value: number) => number, steps = CURVE_STEPS) {
  const inputRange: number[] = [];
  const outputRange: number[] = [];
  for (let index = 0; index <= steps; index += 1) {
    const value = index / steps;
    inputRange.push(value);
    outputRange.push(fn(value));
  }
  return { inputRange, outputRange };
}

export function useArticulationTimeline(sound: ArticulationSound, playing: boolean) {
  const reduced = useReducedMotion();
  const active = playing && !reduced;
  const clock = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [displayed, setDisplayed] = useState(sound);
  const latest = useRef(sound);
  const windows = useMemo(() => articulationPhaseWindows(displayed), [displayed]);

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
      clock.setValue(0);
      setPhaseIndex(0);
      return;
    }

    // The clock is advanced from our own frame loop instead of Animated.loop:
    // the loop stops silently on react-native-web when the 3D subtree mounts,
    // and a plain requestAnimationFrame cannot be stopped behind our back.
    let frame = 0;
    let started = 0;
    const tick = () => {
      if (!started) started = Date.now();
      const value = ((Date.now() - started) % CYCLE_MS) / CYCLE_MS;
      clock.setValue(value);
      const next = windowAt(windows, value).index;
      setPhaseIndex((current) => (current === next ? current : next));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
    };
    // Restart the story whenever the animated sound changes.
  }, [active, clock, displayed.id, windows]);

  return {
    clock,
    fade,
    displayed,
    windows,
    phaseIndex,
    phaseWindow: windows[Math.min(phaseIndex, windows.length - 1)],
    active,
    reduced,
  };
}

export type ArticulationTimeline = ReturnType<typeof useArticulationTimeline>;
