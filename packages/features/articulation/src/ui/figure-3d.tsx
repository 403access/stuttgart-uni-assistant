import { MaterialIcons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Animated, Text, View } from 'react-native';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import { colors, themedStyles } from '@ua/ui/theme';
import { tx } from '@ua/core/format';
import type { Locale } from '@ua/core/domain/types';

import {
  ARTICULATION_3D_VIEW_BOX,
  ARTICULATION_BUST,
  ARTICULATION_DEPTH,
  ARTICULATION_SURFACE,
  airflowFocusT,
  airflowLane,
  articulationFocus,
  articulationGrid,
  ARTICULATION_SHELL,
  ARTICULATION_HEAD,
  ARTICULATION_SIDE,
  articulationPoseLayers,
  articulationStage,
  articulationStaticLayers,
  pointPercent,
  projectSceneDirection,
  projectScenePoint,
  shadeColor,
  type ArticulationCamera,
  type ArticulationCanvas,
  type ArticulationGridTone,
} from '../core';
import { aspectOf } from './aspect';
import {
  SCENE_SLICES,
  faceMatrix,
  faceOrder,
  layerRotation,
  sceneOrder,
  shellRim,
  volumeBandWidth,
  volumeSlices,
} from './scene';
import {
  airstreamOpacity,
  ringColor,
  ringOpacity,
  ringScale,
  sampleCurve,
  windowAt,
  type ArticulationTimeline,
} from './timeline';

/** How dark the far side of the head gets. */
const SHELL_TONE = 0.3;
/** Wide enough to bridge the gap between two shell bands at any angle. */
const SHELL_BAND_WIDTH = (ARTICULATION_SHELL.depth / ARTICULATION_SHELL.rim) * 2;
/** The shell's shading runs from the far side of the head to the cut face. */
const SHELL_SHADE = 'shell-shade';
/** The neck is cut at the bust line, so every band ends on the same edge. */
const SHELL_BUST = 'shell-bust';
/** How dark an organ's body gets. */
const SIDE_TONE = 0.3;
/** Cross-sections per organ while a drag is in progress. */
const COARSE_SLICES = 10;

/** Screen axes: X to the right, Y down, Z towards the viewer. */
const AXES = [
  { label: 'X', direction: [1, 0, 0] as const, color: '#C0392B' },
  { label: 'Y', direction: [0, 1, 0] as const, color: '#1E8449' },
  { label: 'Z', direction: [0, 0, 1] as const, color: '#1F5FA8' },
];
/**
 * Grid line weights in viewBox units. The canvas is ~360 CSS px wide for 840
 * units, so a 1-unit stroke would be half a pixel and wash out on a phone.
 */
const GRID_WIDTH = 2.4;
const GRID_STRONG_WIDTH = 3.2;
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
  hint,
  canvas = ARTICULATION_SURFACE.canvas,
  gridTone = ARTICULATION_SURFACE.grid,
  coarse = false,
  showAxes = false,
  showGrid = false,
}: {
  locale: Locale;
  timeline: ArticulationTimeline;
  camera: ArticulationCamera;
  hint?: string;
  /** Stage colour behind the model. */
  canvas?: ArticulationCanvas;
  /** Colour of the reference grid. */
  gridTone?: ArticulationGridTone;
  /** Fewer slices while the finger is down, so a drag stays smooth. */
  coarse?: boolean;
  /** Draw the orientation gizmo in the corner. */
  showAxes?: boolean;
  /** Draw the reference grid on the cut plane. */
  showGrid?: boolean;
}) {
  const { clock, fade, displayed, windows, phaseWindow } = timeline;
  const pose = displayed.pose;
  const stage = articulationStage(canvas, gridTone);

  const layers = useMemo(
    () => sceneOrder([...articulationStaticLayers(), ...articulationPoseLayers(pose, displayed.voiced)], camera),
    [pose, displayed.voiced, camera],
  );
  const slices = coarse ? COARSE_SLICES : SCENE_SLICES;
  const rim = useMemo(() => shellRim(camera, coarse ? COARSE_SLICES : ARTICULATION_SHELL.rim), [camera, coarse]);
  const depthAxis: readonly [number, number] = [ARTICULATION_DEPTH.x, ARTICULATION_DEPTH.y];
  // The gradient is painted in scene space, so every band samples the same
  // continuous surface tone instead of carrying its own flat fill.
  const [shellFar, shellNear] = useMemo(() => {
    const anchor: readonly [number, number] = [ARTICULATION_DEPTH.x, ARTICULATION_DEPTH.y];
    return [
      projectScenePoint(anchor, -ARTICULATION_SHELL.depth, camera),
      projectScenePoint(anchor, 0, camera),
    ];
  }, [camera]);

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
  const grid = showGrid ? articulationGrid(camera) : [];
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
    <View
      style={[
        styles.canvas,
        { aspectRatio: aspectOf(ARTICULATION_3D_VIEW_BOX), backgroundColor: stage.background },
      ]}
    >
      <Animated.View style={[styles.fill, { opacity: fade }]} pointerEvents="none">
        <Svg width="100%" height="100%" viewBox={ARTICULATION_3D_VIEW_BOX}>
          {/* Cutaway head shell: the cut face, and the skull receding behind it.
              The bands share one scene-space gradient and are stroked with it,
              so they fuse into a single surface from any angle. */}
          <Defs>
            <ClipPath id={SHELL_BUST}>
              <Rect x={0} y={0} width={1000} height={ARTICULATION_BUST} />
            </ClipPath>
            <LinearGradient
              id={SHELL_SHADE}
              gradientUnits="userSpaceOnUse"
              x1={shellFar.x}
              y1={shellFar.y}
              x2={shellNear.x}
              y2={shellNear.y}
            >
              <Stop offset="0" stopColor={shadeColor('#FFFDF9', SHELL_TONE)} />
              <Stop offset="1" stopColor="#FFFDF9" />
            </LinearGradient>
          </Defs>
          {layers.map((layer) => {
            const far = projectScenePoint(depthAxis, -layer.depth, camera);
            const near = projectScenePoint(depthAxis, 0, camera);
            return (
              <LinearGradient
                key={`organ-shade-${layer.id}`}
                id={`organ-shade-${layer.id}`}
                gradientUnits="userSpaceOnUse"
                x1={far.x}
                y1={far.y}
                x2={near.x}
                y2={near.y}
              >
                <Stop offset="0" stopColor={shadeColor(layer.fill, 0.46)} />
                <Stop offset="1" stopColor={shadeColor(layer.fill, SIDE_TONE)} />
              </LinearGradient>
            );
          })}
          {/* The far half: the lateral surface of the skull, cheek and neck. */}
          <G clipPath={`url(#${SHELL_BUST})`}>
            {[...rim].reverse().map((slice) => {
              const shade = `url(#${SHELL_SHADE})`;
              return (
                <Path
                  key={`shell-${slice.back}`}
                  d={ARTICULATION_SIDE}
                  transform={slice.matrix}
                  fill={shade}
                  stroke={shade}
                  strokeWidth={SHELL_BAND_WIDTH}
                  strokeLinejoin="round"
                />
              );
            })}
          </G>

          {/* The cut face, on the midline. */}
          <Path
            d={ARTICULATION_HEAD}
            transform={rim[0].matrix}
            fill="#FFFDF9"
            stroke="#243447"
            strokeWidth={2.4}
            strokeLinejoin="round"
          />

          {/* Reference grid on the cut plane. */}
          {grid.map((line, index) => (
            <Line
              key={`grid-${index}`}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke={line.strong ? stage.gridStrong : stage.grid}
              strokeWidth={line.strong ? GRID_STRONG_WIDTH : GRID_WIDTH}
            />
          ))}

          {/* Organ bodies, far to near. Each one is a swept body: its
              cross-sections narrow as they recede into the head and share one
              gradient, so it reads as a solid lobe instead of a stack of
              copies of the 2-D outline. */}
          {layers.map((layer) => {
            const rotation = layerRotation(layer);
            const side = shadeColor(layer.fill, SIDE_TONE);
            const band = volumeBandWidth(layer, camera, slices);
            return (
              <G key={`body-${layer.id}`}>
                {volumeSlices(layer, camera, slices).map((slice, index) => {
                  // One flat body tone: re-transforming a gradient on every
                  // copy would leave a tone seam at each cross-section. Only
                  // the far shell carries the gradient.
                  const fill = index === 0 ? `url(#organ-shade-${layer.id})` : side;
                  return layer.paths.map((d, pathIndex) => (
                    <Path
                      key={`${layer.id}-slice-${index}-${pathIndex}`}
                      d={d}
                      transform={`${slice.matrix}${rotation ? ` ${rotation}` : ''}`}
                      fill={fill}
                      stroke={fill}
                      strokeWidth={band}
                      strokeLinejoin="round"
                    />
                  ));
                })}
              </G>
            );
          })}

          {/* Cut faces last: every face is the frontmost surface of its organ. */}
          {faceOrder(layers).map((layer) => {
            const rotation = layerRotation(layer);
            return (
              <G key={`face-${layer.id}`}>
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
          {/* A soft chip keeps the axis colours readable on a dark canvas. */}
          <Circle cx={36} cy={36} r={32} fill="rgba(255,255,255,0.72)" />
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
