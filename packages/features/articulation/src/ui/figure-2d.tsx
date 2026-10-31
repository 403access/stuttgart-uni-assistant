import { MaterialIcons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Animated, Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { colors, themedStyles } from '@ua/ui/theme';
import { tx } from '@ua/core/format';
import type { Locale } from '@ua/core/domain/types';
import { diagramTone } from '@ua/quiz-content/figures/palette';

import {
  HEAD_VIEW_BOX,
  airflowFocusT,
  airflowLane,
  articulationBackdrop,
  articulationFocus,
  articulationRegions,
  pointPercent,
} from '../core';
import { APPROACH_POSE } from './poses';
import { PoseArt } from './pose-art';
import { aspectOf } from './aspect';
import {
  airstreamOpacity,
  poseProgress,
  ringColor,
  ringOpacity,
  ringScale,
  sampleCurve,
  windowAt,
  type ArticulationTimeline,
} from './timeline';

const CANVAS = '#F4F7FB';
const INK = '#243447';
const PAPER = '#FFFDF9';

/** The static head, drawn exactly like the quiz diagram but without badges. */
function StaticAnatomy() {
  return (
    <Svg width="100%" height="100%" viewBox={HEAD_VIEW_BOX}>
      <Rect x="160" y="40" width="760" height="950" fill={CANVAS} />
      {articulationBackdrop.map((d, index) => (
        <Path key={`backdrop-${index}`} d={d} fill={PAPER} stroke={INK} strokeWidth={5} strokeLinejoin="round" />
      ))}
      {articulationRegions.map((region, index) =>
        region.path ? (
          <Path
            key={`region-${index}`}
            d={region.path}
            fill={diagramTone(region.tone ?? 'rose').fill}
            stroke={diagramTone(region.tone ?? 'rose').stroke}
            strokeWidth={3}
            strokeLinejoin="round"
          />
        ) : null,
      )}
    </Svg>
  );
}

/**
 * The flat cutaway: static anatomy, the two pose layers (neutral and target,
 * cross-fading through the approach), the airstream and the focus ring.
 */
export function ArticulationFigure({ locale, timeline }: { locale: Locale; timeline: ArticulationTimeline }) {
  const { clock, fade, displayed, windows, phaseWindow } = timeline;
  const pose = displayed.pose;

  const lane = useMemo(() => airflowLane(pose.airflow, pose), [pose]);
  const focus = useMemo(() => articulationFocus(displayed), [displayed]);
  const focusT = useMemo(() => airflowFocusT(lane, focus), [lane, focus]);

  const dots = useMemo(
    () =>
      lane.slice(1, -1).map((point, index, list) => {
        const position = index / (list.length - 1);
        const strength = sampleCurve((value) => airstreamOpacity(windows, focusT, position, value));
        return {
          key: `${index}`,
          ...pointPercent(point, HEAD_VIEW_BOX),
          opacity: clock.interpolate({
            inputRange: strength.inputRange,
            outputRange: strength.outputRange.map((value) => value * 0.85),
          }),
          scale: clock.interpolate({
            inputRange: strength.inputRange,
            outputRange: strength.outputRange.map((value) => 0.55 + value * 0.65),
          }),
        };
      }),
    [lane, windows, focusT, clock],
  );

  const restOpacity = clock.interpolate(sampleCurve((value) => 1 - poseProgress(windows, value)));
  const poseOpacity = clock.interpolate(sampleCurve((value) => poseProgress(windows, value)));
  const focusOpacity = clock.interpolate(sampleCurve((value) => ringOpacity(windowAt(windows, value), value)));
  const focusScale = clock.interpolate(sampleCurve((value) => ringScale(windowAt(windows, value), value)));

  return (
    <View style={[styles.canvas, { aspectRatio: aspectOf(HEAD_VIEW_BOX) }]}>
      <StaticAnatomy />

      <Animated.View style={[styles.layer, { opacity: fade }]} pointerEvents="none">
        <Animated.View style={[styles.layer, { opacity: restOpacity }]}>
          <PoseArt pose={APPROACH_POSE} voiced={displayed.voiced} />
        </Animated.View>
        <Animated.View style={[styles.layer, { opacity: poseOpacity }]}>
          <PoseArt pose={pose} voiced={displayed.voiced} />
        </Animated.View>
      </Animated.View>

      <View style={styles.layer} pointerEvents="none">
        {dots.map((dot) => (
          <Animated.View
            key={dot.key}
            style={[
              styles.puff,
              { left: dot.left, top: dot.top, opacity: dot.opacity, transform: [{ scale: dot.scale }] },
            ]}
          />
        ))}

        <Animated.View
          style={[
            styles.ring,
            {
              left: pointPercent(focus, HEAD_VIEW_BOX).left,
              top: pointPercent(focus, HEAD_VIEW_BOX).top,
              borderColor: ringColor(phaseWindow.phase.airflow),
              opacity: focusOpacity,
              transform: [{ scale: focusScale }],
            },
          ]}
        />
      </View>

      <View style={styles.badge} pointerEvents="none">
        <MaterialIcons name={pose.airflow === 'nasal' ? 'south' : 'east'} size={12} color={colors.blue} />
        <Text style={styles.badgeText}>
          {tx(locale, pose.airflow === 'nasal' ? 'quiz.studio.via_nose' : 'quiz.studio.via_mouth')}
        </Text>
      </View>
    </View>
  );
}

const styles = themedStyles((colors) => ({
  canvas: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: CANVAS,
    overflow: 'hidden',
  },
  layer: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  puff: {
    position: 'absolute',
    width: 9,
    height: 9,
    marginLeft: -4.5,
    marginTop: -4.5,
    borderRadius: 5,
    backgroundColor: '#7FA8CC',
  },
  ring: {
    position: 'absolute',
    borderWidth: 2.5,
    marginLeft: -13,
    marginTop: -13,
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  badge: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.86)',
    borderRadius: 9,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  badgeText: { color: colors.blue, fontSize: 10, fontWeight: '700' },
}));
