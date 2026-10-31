import { MaterialIcons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Animated, Text, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';

import { colors, themedStyles } from '@ua/ui/theme';
import { tx } from '@ua/core/format';
import type { Locale } from '@ua/core/domain/types';

import {
  ARTICULATION_3D_VIEW_BOX,
  ARTICULATION_SHELL,
  airflowFocusT,
  airflowLane,
  articulationBackdrop,
  articulationFocus,
  articulationPoseLayers,
  articulationStaticLayers,
  pointPercent,
  projectSceneDirection,
  projectScenePoint,
  shadeColor,
  type ArticulationCamera,
} from '../core';
import { aspectOf } from './aspect';
import { faceMatrix, layerRotation, sceneOrder, shellRim, volumeSlices } from './scene';
import {
  airstreamOpacity,
  ringColor,
  ringOpacity,
  ringScale,
  sampleCurve,
  windowAt,
  type ArticulationTimeline,
} from './timeline';

const HEAD_SIDE = shadeColor('#FFFDF9', 0.22);

/** Screen axes: X to the right, Y down, Z towards the viewer. */
const AXES = [
  { label: 'X', direction: [1, 0, 0] as const, color: '#C0392B' },
  { label: 'Y', direction: [0, 1, 0] as const, color: '#1E8449' },
  { label: 'Z', direction: [0, 0, 1] as const, color: '#1F5FA8' },
];
/** Where the airstream and the focus marker sit inside the volumes. */
const AIR_Z = 10;
const FOCUS_Z = 20;

/**
 * The cutaway head as a volume: the skull is an open shell, and every organ
 * inside it is a rounded, shaded slab at its own depth. Turning and tilting the
 * camera therefore shows real depth instead of a tilted drawing.
 *
 * Plain SVG: no WebGL and no new dependency, so it works offline and looks the
 * same on iOS, Android and the web.
 */
export function ArticulationFigure3D({
  locale,
  timeline,
  camera,
  steps = 10,
  hint,
  showAxes = false,
}: {
  locale: Locale;
  timeline: ArticulationTimeline;
  camera: ArticulationCamera;
  /** Rim slices of the shell; dragging lowers this to keep the SVG light. */
  steps?: number;
  hint?: string;
  /** Draw the orientation gizmo in the corner. */
  showAxes?: boolean;
}) {
  const { clock, fade, displayed, windows, phaseWindow } = timeline;
  const pose = displayed.pose;

  const layers = useMemo(
    () => sceneOrder([...articulationStaticLayers(), ...articulationPoseLayers(pose, displayed.voiced)], camera),
    [pose, displayed.voiced, camera],
  );
  const rim = useMemo(() => shellRim(camera, steps, ARTICULATION_SHELL.z), [camera, steps]);
  const backMatrix = rim[0];

  const lane = useMemo(() => airflowLane(pose.airflow, pose), [pose]);
  const focus = useMemo(() => articulationFocus(displayed), [displayed]);
  const focusT = useMemo(() => airflowFocusT(lane, focus), [lane, focus]);

  const dots = useMemo(
    () =>
      lane.slice(1, -1).map((point, index, list) => {
        const position = index / (list.length - 1);
        const strength = sampleCurve((value) => airstreamOpacity(windows, focusT, position, value));
        const projected = projectScenePoint(point, AIR_Z, camera);
        return {
          key: `${index}`,
          ...pointPercent(projected, ARTICULATION_3D_VIEW_BOX),
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
    [lane, windows, focusT, clock, camera],
  );

  const ringPoint = pointPercent(projectScenePoint(focus, FOCUS_Z, camera), ARTICULATION_3D_VIEW_BOX);
  const axes = showAxes
    ? AXES.map((axis) => {
        const direction = projectSceneDirection(axis.direction, camera);
        const yaw = (camera.yaw * Math.PI) / 180;
        const pitch = (camera.pitch * Math.PI) / 180;
        const depth =
          Math.sin(pitch) * axis.direction[1] +
          Math.cos(pitch) * (-Math.sin(yaw) * axis.direction[0] + Math.cos(yaw) * axis.direction[2]);
        return { ...axis, direction, depth };
      })
    : [];
  const ringOpacityCurve = clock.interpolate(
    sampleCurve((value) => ringOpacity(windowAt(windows, value), value)),
  );
  const ringScaleCurve = clock.interpolate(sampleCurve((value) => ringScale(windowAt(windows, value), value)));

  return (
    <View style={[styles.canvas, { aspectRatio: aspectOf(ARTICULATION_3D_VIEW_BOX) }]}>
      <Animated.View style={[styles.fill, { opacity: fade }]} pointerEvents="none">
        <Svg width="100%" height="100%" viewBox={ARTICULATION_3D_VIEW_BOX}>
          {/* Open head shell: back plate plus the swept rim. */}
          {articulationBackdrop.map((d, index) => (
            <Path
              key={`shell-back-${index}`}
              d={d}
              transform={backMatrix}
              fill="#FFFDF9"
              stroke="#243447"
              strokeWidth={2.4}
              strokeLinejoin="round"
            />
          ))}
          {rim.slice(1).map((matrix, index) =>
            articulationBackdrop.map((d, pathIndex) => (
              <Path
                key={`shell-rim-${index}-${pathIndex}`}
                d={d}
                transform={matrix}
                fill="none"
                stroke={HEAD_SIDE}
                strokeWidth={ARTICULATION_SHELL.rimWidth}
                strokeLinejoin="round"
              />
            )),
          )}

          {/* Organs, far to near. */}
          {layers.map((layer) => {
            const rotation = layerRotation(layer);
            return (
              <G key={layer.id}>
                {volumeSlices(layer, camera).map((slice, index) =>
                  layer.paths.map((d, pathIndex) => (
                    <Path
                      key={`${layer.id}-slice-${index}-${pathIndex}`}
                      d={d}
                      transform={`${slice.matrix}${rotation ? ` ${rotation}` : ''}`}
                      fill={slice.fill}
                      stroke={slice.fill}
                      strokeWidth={0.8}
                      strokeLinejoin="round"
                    />
                  )),
                )}
                {layer.paths.map((d, pathIndex) => (
                  <Path
                    key={`${layer.id}-face-${pathIndex}`}
                    d={d}
                    transform={`${faceMatrix(layer, camera)}${rotation ? ` ${rotation}` : ''}`}
                    fill={layer.fill}
                    stroke={layer.stroke}
                    strokeWidth={2.4}
                    strokeLinejoin="round"
                  />
                ))}
              </G>
            );
          })}
        </Svg>
      </Animated.View>

      <View style={styles.fill} pointerEvents="none">
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
              left: ringPoint.left,
              top: ringPoint.top,
              borderColor: ringColor(phaseWindow.phase.airflow),
              opacity: ringOpacityCurve,
              transform: [{ scale: ringScaleCurve }],
            },
          ]}
        />
      </View>

      {showAxes ? (
        <Svg width={72} height={72} viewBox="0 0 72 72" style={styles.gizmo} pointerEvents="none">
          <Circle cx={36} cy={36} r={2.4} fill="#5E666E" />
          {axes.map((axis) => {
            const x = 36 + axis.direction.x * 24;
            const y = 36 + axis.direction.y * 24;
            return (
              <G key={axis.label} opacity={axis.depth > 0 ? 1 : 0.5}>
                <Line x1={36} y1={36} x2={x} y2={y} stroke={axis.color} strokeWidth={2.4} strokeLinecap="round" />
                <SvgText
                  x={36 + axis.direction.x * 31}
                  y={36 + axis.direction.y * 31 + 3}
                  fontSize={9}
                  fontWeight="700"
                  textAnchor="middle"
                  fill={axis.color}
                >
                  {axis.label}
                </SvgText>
              </G>
            );
          })}
        </Svg>
      ) : null}

      <View style={styles.badge} pointerEvents="none">
        <MaterialIcons name="view-in-ar" size={12} color={colors.blue} />
        <Text style={styles.badgeText}>{tx(locale, 'quiz.studio.view.3d')}</Text>
      </View>
      <Text style={styles.hint} pointerEvents="none">
        {hint ?? `${Math.round(camera.yaw)}°`}
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
  fill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
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
  gizmo: { position: 'absolute', top: 6, right: 6 },
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
