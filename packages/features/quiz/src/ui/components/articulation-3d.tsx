import { MaterialIcons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Animated, Text, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';

import { colors, themedStyles } from '@ua/ui/theme';
import { tx } from '@ua/core/format';
import type { Locale } from '@ua/core/domain/types';

import {
  ARTICULATION_3D_VIEW_BOX,
  ARTICULATION_SLAB,
  VELUM_HINGE,
  airflowLane,
  articulationBackdrop,
  articulationFocus,
  articulationRegions,
  articulationTurn,
  clampArticulationAngle,
  cordOutlines,
  lipOutlines,
  pointPercent,
  projectArticulationPoint,
  shadeColor,
  tongueOutline,
  velumAngle,
  velumOutlines,
} from '@ua/quiz-content/figures/articulation';
import { diagramAspect, diagramTone } from './diagram';
import {
  airstreamCenter,
  useArticulationRings,
  wave,
  type useArticulationTimeline,
} from './articulation-timeline';

type Timeline = ReturnType<typeof useArticulationTimeline>;

/**
 * The same head as the flat figure, built as one solid block that turns around
 * the vertical axis. The block is extruded along the depth direction and the
 * movable articulators float just in front of it, so a turn reads as a real
 * object rather than a skewed drawing.
 *
 * Everything is plain SVG — no WebGL and no new dependency — which keeps the
 * view offline, themeable and identical on iOS, Android and the web.
 */
export function ArticulationFigure3D({
  locale,
  timeline,
  angle,
  steps = 10,
  hint,
}: {
  locale: Locale;
  timeline: Timeline;
  angle: number;
  /** Extrusion copies; dragging lowers this to keep the SVG light. */
  steps?: number;
  hint?: string;
}) {
  const { clock, fade, displayed } = timeline;
  const { focusOpacity, focusScale } = useArticulationRings(clock);
  const pose = displayed.pose;
  const turn = articulationTurn(angle);
  const clamped = clampArticulationAngle(angle);

  const lane = useMemo(() => airflowLane(pose.airflow, pose), [pose]);
  const dots = useMemo(
    () =>
      lane
        .slice(1, -1)
        .map((point, index, list) => {
          const position = projectArticulationPoint(point, clamped);
          return {
            key: `${index}`,
            ...pointPercent(position, ARTICULATION_3D_VIEW_BOX),
            ...wave(airstreamCenter(index / (list.length - 1))),
          };
        }),
    [lane, clamped],
  );

  const focus = projectArticulationPoint(articulationFocus(displayed), clamped, ARTICULATION_SLAB.lips);
  const larynx = projectArticulationPoint([652, 762], clamped, ARTICULATION_SLAB.cords);

  const tongue = tongueOutline(pose.tongue);
  const lips = lipOutlines(pose.lips);
  const cords = cordOutlines(displayed.voiced);
  const centerX = 160 + 760 / 2;

  const backdrop = articulationBackdrop.map((d) => ({ d, fill: '#FFFDF9', stroke: '#243447' }));
  const regions = articulationRegions.flatMap((region) =>
    region.path
      ? [{ d: region.path, fill: diagramTone(region.tone ?? 'rose').fill, stroke: diagramTone(region.tone ?? 'rose').stroke }]
      : [],
  );
  const headSide = shadeColor('#FFFDF9', 0.19);

  return (
    <View style={[styles.canvas, { aspectRatio: diagramAspect(ARTICULATION_3D_VIEW_BOX) }]}>
      <Svg width="100%" height="100%" viewBox={ARTICULATION_3D_VIEW_BOX}>
        <G
          transform={`translate(${centerX} 0) scale(${turn.cos.toFixed(4)} 1) skewY(${(
            (Math.atan(turn.skew) * 180) /
            Math.PI
          ).toFixed(3)}) translate(${-centerX} 0)`}
        >
          {/* Side wall: the head block, drawn behind the cut plane. */}
          {Array.from({ length: steps }, (_, index) => steps - index).map((step) => (
            <G
              key={`side-${step}`}
              transform={`translate(${(-turn.sin * ARTICULATION_SLAB.thickness * (step / steps)).toFixed(2)} 0)`}
            >
              {backdrop.map((shape, index) => (
                <Path
                  key={`side-${step}-${index}`}
                  d={shape.d}
                  fill={headSide}
                  stroke={headSide}
                  strokeWidth={1.4}
                  strokeLinejoin="round"
                />
              ))}
            </G>
          ))}

          {/* Cut plane: the anatomy, exactly as in the flat figure. */}
          {[...backdrop, ...regions].map((shape, index) => (
            <Path
              key={`face-${index}`}
              d={shape.d}
              fill={shape.fill}
              stroke={shape.stroke}
              strokeWidth={2.6}
              strokeLinejoin="round"
            />
          ))}

          {/* Movable articulators, raised towards the viewer. */}
          <G transform={`translate(${(ARTICULATION_SLAB.cords * turn.sin).toFixed(2)} 0)`}>
            {cords.map((d, index) => (
              <G key={`cords-side-${index}`}>
                {[4, 3, 2, 1].map((step) => (
                  <Path
                    key={`cords-side-${index}-${step}`}
                    d={d}
                    transform={`translate(${(-turn.sin * 6 * (step / 4)).toFixed(2)} 0)`}
                    fill={shadeColor(diagramTone('cords').fill, 0.3)}
                    stroke={shadeColor(diagramTone('cords').fill, 0.3)}
                    strokeWidth={1}
                    strokeLinejoin="round"
                  />
                ))}
                <Path d={d} fill={diagramTone('cords').fill} stroke={diagramTone('cords').stroke} strokeWidth={2} strokeLinejoin="round" />
              </G>
            ))}
          </G>

          <G transform={`translate(${(ARTICULATION_SLAB.tongue * turn.sin).toFixed(2)} 0)`}>
            {Array.from({ length: 5 }, (_, index) => 5 - index).map((step) => (
              <Path
                key={`tongue-side-${step}`}
                d={tongue}
                transform={`translate(${(-turn.sin * 14 * (step / 5)).toFixed(2)} 0)`}
                fill={shadeColor(diagramTone('tongue').fill, 0.3)}
                stroke={shadeColor(diagramTone('tongue').fill, 0.3)}
                strokeWidth={1.2}
                strokeLinejoin="round"
              />
            ))}
            <Path d={tongue} fill={diagramTone('tongue').fill} stroke={diagramTone('tongue').stroke} strokeWidth={2.6} strokeLinejoin="round" />
          </G>

          <G
            transform={`translate(${(ARTICULATION_SLAB.velum * turn.sin).toFixed(2)} 0) rotate(${velumAngle(pose.velum)} ${VELUM_HINGE.x} ${VELUM_HINGE.y})`}
          >
            {velumOutlines.map((d, index) => (
              <G key={`velum-${index}`}>
                {[4, 3, 2, 1].map((step) => (
                  <Path
                    key={`velum-${index}-${step}`}
                    d={d}
                    transform={`translate(${(-turn.sin * 8 * (step / 4)).toFixed(2)} 0)`}
                    fill={shadeColor(diagramTone('violet').fill, 0.3)}
                    stroke={shadeColor(diagramTone('violet').fill, 0.3)}
                    strokeWidth={1}
                    strokeLinejoin="round"
                  />
                ))}
                <Path
                  d={d}
                  fill={diagramTone('violet').fill}
                  stroke={diagramTone('violet').stroke}
                  strokeWidth={2.2}
                  strokeLinejoin="round"
                />
              </G>
            ))}
          </G>

          <G transform={`translate(${(ARTICULATION_SLAB.lips * turn.sin).toFixed(2)} 0)`}>
            {lips.map((d, index) => (
              <G key={`lips-${index}`}>
                {[4, 3, 2, 1].map((step) => (
                  <Path
                    key={`lips-${index}-${step}`}
                    d={d}
                    transform={`translate(${(-turn.sin * 10 * (step / 4)).toFixed(2)} 0)`}
                    fill={shadeColor(diagramTone('lip').fill, 0.3)}
                    stroke={shadeColor(diagramTone('lip').fill, 0.3)}
                    strokeWidth={1}
                    strokeLinejoin="round"
                  />
                ))}
                <Path d={d} fill={diagramTone('lip').fill} stroke={diagramTone('lip').stroke} strokeWidth={2.4} strokeLinejoin="round" />
              </G>
            ))}
          </G>
        </G>
      </Svg>

      <Animated.View style={[styles.layer, { opacity: fade }]} pointerEvents="none">
        {dots.map((dot) => (
          <Animated.View
            key={dot.key}
            style={[
              styles.puff,
              {
                left: dot.left,
                top: dot.top,
                opacity: clock.interpolate({
                  inputRange: dot.inputRange,
                  outputRange: dot.outputRange.map((value) => value * 0.85),
                }),
                transform: [
                  {
                    scale: clock.interpolate({
                      inputRange: dot.inputRange,
                      outputRange: dot.outputRange.map((value) => 0.55 + value * 0.65),
                    }),
                  },
                ],
              },
            ]}
          />
        ))}

        {displayed.voiced ? (
          <Animated.View
            style={[
              styles.ring,
              styles.voiceRing,
              pointPercent(larynx, ARTICULATION_3D_VIEW_BOX),
              {
                opacity: clock.interpolate({
                  inputRange: [0.3, 0.38, 0.58, 0.66],
                  outputRange: [0, 0.55, 0.4, 0],
                  extrapolate: 'clamp',
                }),
                transform: [
                  {
                    scale: clock.interpolate({
                      inputRange: [0.3, 0.66],
                      outputRange: [0.7, 2.1],
                      extrapolate: 'clamp',
                    }),
                  },
                ],
              },
            ]}
          />
        ) : null}

        <Animated.View
          style={[
            styles.ring,
            styles.focusRing,
            pointPercent(focus, ARTICULATION_3D_VIEW_BOX),
            { opacity: focusOpacity, transform: [{ scale: focusScale }] },
          ]}
        />
      </Animated.View>

      <View style={styles.badge} pointerEvents="none">
        <MaterialIcons name="view-in-ar" size={12} color={colors.blue} />
        <Text style={styles.badgeText}>{tx(locale, 'quiz.studio.view.3d')}</Text>
      </View>
      <Text style={styles.sideNote} pointerEvents="none">
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
  voiceRing: { borderColor: '#2F6B52' },
  focusRing: {
    borderColor: colors.blue,
    borderWidth: 3,
    marginLeft: -17,
    marginTop: -17,
    width: 34,
    height: 34,
    borderRadius: 17,
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
  sideNote: {
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
