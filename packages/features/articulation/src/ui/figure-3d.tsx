import { MaterialIcons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Animated, Text, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';

import { colors, themedStyles } from '@ua/ui/theme';
import { tx } from '@ua/core/format';
import type { Locale } from '@ua/core/domain/types';
import { diagramTone } from '@ua/quiz-content/figures/palette';

import {
  ARTICULATION_3D_VIEW_BOX,
  ARTICULATION_SLAB,
  airflowFocusT,
  airflowLane,
  articulationBackdrop,
  articulationBlockTransform,
  articulationFocus,
  articulationRegions,
  articulationTurn,
  clampArticulationAngle,
  pointPercent,
  projectArticulationPoint,
  shadeColor,
} from '../core';
import { aspectOf } from './aspect';
import { APPROACH_POSE } from './poses';
import { Plates } from './plates';
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

/**
 * The same head as the flat figure, built as one solid block that turns around
 * the vertical axis. The block is extruded along the depth direction and the
 * movable articulators are separate plates in front of it, so a turn reads as a
 * real object — and they can cross-fade as the sound moves from its approach
 * pose into its target pose.
 *
 * Plain SVG: no WebGL and no new dependency, so it works offline and looks the
 * same on iOS, Android and the web.
 */
export function ArticulationFigure3D({
  locale,
  timeline,
  angle,
  steps = 10,
  hint,
}: {
  locale: Locale;
  timeline: ArticulationTimeline;
  angle: number;
  /** Extrusion copies; dragging lowers this to keep the SVG light. */
  steps?: number;
  hint?: string;
}) {
  const { clock, fade, displayed, windows, phaseWindow } = timeline;
  const pose = displayed.pose;
  const turn = articulationTurn(angle);
  const clamped = clampArticulationAngle(angle);

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
          ...pointPercent(projectArticulationPoint(point, clamped), ARTICULATION_3D_VIEW_BOX),
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
    [lane, windows, focusT, clock, clamped],
  );

  const restOpacity = clock.interpolate(sampleCurve((value) => 1 - poseProgress(windows, value)));
  const poseOpacity = clock.interpolate(sampleCurve((value) => poseProgress(windows, value)));
  const focusOpacity = clock.interpolate(sampleCurve((value) => ringOpacity(windowAt(windows, value), value)));
  const focusScale = clock.interpolate(sampleCurve((value) => ringScale(windowAt(windows, value), value)));

  const headSide = shadeColor('#FFFDF9', 0.19);
  const block = articulationBlockTransform(angle);
  // Past 90° the front of the slab faces away: show its back instead, and hide
  // the articulator plates, which sit on the front.
  const frontFacing = turn.cos > 0;
  const frontness = Math.max(0, Math.min(1, turn.cos / 0.25));
  const focusPoint = pointPercent(
    projectArticulationPoint(focus, clamped, ARTICULATION_SLAB.lips),
    ARTICULATION_3D_VIEW_BOX,
  );

  return (
    <View style={[styles.canvas, { aspectRatio: aspectOf(ARTICULATION_3D_VIEW_BOX) }]}>
      <Svg width="100%" height="100%" viewBox={ARTICULATION_3D_VIEW_BOX}>
        <G transform={block}>
          {/* Side wall: the head block, drawn behind the cut plane. */}
          {Array.from({ length: steps }, (_, index) => steps - index).map((step) => (
            <G
              key={`side-${step}`}
              transform={`translate(${(-turn.sin * ARTICULATION_SLAB.thickness * (step / steps)).toFixed(2)} 0)`}
            >
              {articulationBackdrop.map((d, index) => (
                <Path key={`side-${step}-${index}`} d={d} fill={headSide} stroke={headSide} strokeWidth={1.4} strokeLinejoin="round" />
              ))}
            </G>
          ))}

          {/* Cut plane, or the plain back of the block when it faces away. */}
          {frontFacing ? (
            <G opacity={frontness}>
              {articulationBackdrop.map((d, index) => (
                <Path key={`backdrop-${index}`} d={d} fill="#FFFDF9" stroke="#243447" strokeWidth={2.6} strokeLinejoin="round" />
              ))}
              {articulationRegions.map((region, index) =>
                region.path ? (
                  <Path
                    key={`region-${index}`}
                    d={region.path}
                    fill={diagramTone(region.tone ?? 'rose').fill}
                    stroke={diagramTone(region.tone ?? 'rose').stroke}
                    strokeWidth={2.4}
                    strokeLinejoin="round"
                  />
                ) : null,
              )}
            </G>
          ) : (
            <G transform={`translate(${(-turn.sin * ARTICULATION_SLAB.thickness).toFixed(2)} 0)`}>
              {articulationBackdrop.map((d, index) => (
                <Path
                  key={`back-${index}`}
                  d={d}
                  fill={headSide}
                  stroke="#243447"
                  strokeWidth={2.6}
                  strokeLinejoin="round"
                />
              ))}
            </G>
          )}
        </G>
      </Svg>

      <Animated.View style={[styles.layer, { opacity: fade }]} pointerEvents="none">
        <View style={[styles.layer, { opacity: frontness }]}>
        <Animated.View style={[styles.layer, { opacity: restOpacity }]}>
          <Svg width="100%" height="100%" viewBox={ARTICULATION_3D_VIEW_BOX}>
            <G transform={block}>
              <Plates pose={APPROACH_POSE} voiced={displayed.voiced} angle={clamped} />
            </G>
          </Svg>
        </Animated.View>
        <Animated.View style={[styles.layer, { opacity: poseOpacity }]}>
          <Svg width="100%" height="100%" viewBox={ARTICULATION_3D_VIEW_BOX}>
            <G transform={block}>
              <Plates pose={pose} voiced={displayed.voiced} angle={clamped} />
            </G>
          </Svg>
        </Animated.View>
        </View>
      </Animated.View>

      <View style={[styles.layer, { opacity: frontness }]} pointerEvents="none">
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
              left: focusPoint.left,
              top: focusPoint.top,
              borderColor: ringColor(phaseWindow.phase.airflow),
              opacity: focusOpacity,
              transform: [{ scale: focusScale }],
            },
          ]}
        />
      </View>

      <View style={styles.badge} pointerEvents="none">
        <MaterialIcons name="view-in-ar" size={12} color={colors.blue} />
        <Text style={styles.badgeText}>{tx(locale, 'quiz.studio.view.3d')}</Text>
      </View>
      <Text style={styles.hint} pointerEvents="none">
        {hint ?? `${Math.round(clamped)}°`}
      </Text>
    </View>
  );
}

const styles = themedStyles((colors) => ({
  canvas: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#F4F7FB',
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
  hint: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.inkSoft,
    fontSize: 10,
    fontWeight: '700',
  },
}));
