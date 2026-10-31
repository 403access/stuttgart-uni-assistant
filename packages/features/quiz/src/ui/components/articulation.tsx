import { MaterialIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import { Animated, PanResponder, Pressable, Text, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';

import { colors, themedStyles } from '@ua/ui/theme';
import { pick, tx } from '@ua/core/format';
import type { Locale } from '@ua/core/domain/types';

import type { ArticulationSound } from '@ua/quiz-content/types';
import {
  ARTICULATION_SLAB,
  HEAD_VIEW_BOX,
  VELUM_HINGE,
  airflowLane,
  articulationBackdrop,
  articulationFocus,
  articulationRegions,
  clampArticulationAngle,
  cordOutlines,
  lipOutlines,
  pointPercent,
  tongueOutline,
  velumAngle,
  velumOutlines,
} from '@ua/quiz-content/figures/articulation';
import { DiagramCanvas, diagramAspect, diagramTone } from './diagram';
import { ArticulationFigure3D } from './articulation-3d';
import {
  STAGES,
  airstreamCenter,
  useArticulationRings,
  useArticulationTimeline,
  wave,
  type Stage,
} from './articulation-timeline';

/**
 * How a sound is produced, animated on the same sagittal head the diagram
 * questions use. `ArticulationFigure` is the flat cutaway; `ArticulationFigure3D`
 * turns the same model into a block. Both share one timeline, so the stage
 * strip, the airstream and the voicing stay in sync when the learner switches.
 */
const STAGE_ICONS: Record<Stage, ComponentProps<typeof MaterialIcons>['name']> = {
  airflow: 'air',
  voice: 'graphic-eq',
  articulation: 'my-location',
};

type Timeline = ReturnType<typeof useArticulationTimeline>;

/** Turn angles read better with a true minus sign than with a hyphen. */
function formatAngle(value: number): string {
  return `${Math.round(value)}°`.replace('-', '−');
}

export function ArticulationFigure({
  locale,
  timeline,
}: {
  locale: Locale;
  timeline: Timeline;
}) {
  const { clock, fade, displayed } = timeline;
  const { focusOpacity, focusScale } = useArticulationRings(clock);
  const pose = displayed.pose;

  const lane = airflowLane(pose.airflow, pose);
  const dots = lane
    .slice(1, -1)
    .map((point, index, list) => ({
      key: `${index}`,
      ...pointPercent(point, HEAD_VIEW_BOX),
      ...wave(airstreamCenter(index / (list.length - 1))),
    }));

  const focus = pointPercent(articulationFocus(displayed), HEAD_VIEW_BOX);
  const larynx = pointPercent([652, 762], HEAD_VIEW_BOX);

  return (
    <View style={[styles.canvas, { aspectRatio: diagramAspect(HEAD_VIEW_BOX) }]}>
      <DiagramCanvas
        mode="plain"
        viewBox={HEAD_VIEW_BOX}
        backdrop={articulationBackdrop}
        regions={articulationRegions}
        locale={locale}
      />

      <Animated.View style={[styles.layer, { opacity: fade }]} pointerEvents="none">
        <Svg width="100%" height="100%" viewBox={HEAD_VIEW_BOX}>
          <G transform={`rotate(${velumAngle(pose.velum)} ${VELUM_HINGE.x} ${VELUM_HINGE.y})`}>
            {velumOutlines.map((path, index) => (
              <Path
                key={`velum-${index}`}
                d={path}
                fill={diagramTone('violet').fill}
                stroke={diagramTone('violet').stroke}
                strokeWidth={3}
                strokeLinejoin="round"
              />
            ))}
          </G>
          <Path
            d={tongueOutline(pose.tongue)}
            fill={diagramTone('tongue').fill}
            stroke={diagramTone('tongue').stroke}
            strokeWidth={3}
            strokeLinejoin="round"
          />
          {lipOutlines(pose.lips).map((path, index) => (
            <Path
              key={`lips-${index}`}
              d={path}
              fill={diagramTone('lip').fill}
              stroke={diagramTone('lip').stroke}
              strokeWidth={3}
              strokeLinejoin="round"
            />
          ))}
          {cordOutlines(displayed.voiced).map((path, index) => (
            <Path
              key={`cords-${index}`}
              d={path}
              fill={diagramTone('cords').fill}
              stroke={diagramTone('cords').stroke}
              strokeWidth={2}
              strokeLinejoin="round"
            />
          ))}
        </Svg>
      </Animated.View>

      <View style={styles.layer} pointerEvents="none">
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

        {displayed.voiced
          ? [0, 0.07].map((offset) => (
              <Animated.View
                key={`voice-${offset}`}
                style={[
                  styles.ring,
                  styles.voiceRing,
                  larynx,
                  {
                    opacity: clock.interpolate({
                      inputRange: [0.3 + offset, 0.38 + offset, 0.58 + offset, 0.66 + offset],
                      outputRange: [0, 0.55, 0.4, 0],
                      extrapolate: 'clamp',
                    }),
                    transform: [
                      {
                        scale: clock.interpolate({
                          inputRange: [0.3 + offset, 0.66 + offset],
                          outputRange: [0.7, 2.1],
                          extrapolate: 'clamp',
                        }),
                      },
                    ],
                  },
                ]}
              />
            ))
          : null}

        <Animated.View
          style={[
            styles.ring,
            styles.focusRing,
            focus,
            { opacity: focusOpacity, transform: [{ scale: focusScale }] },
          ]}
        />
      </View>

      <View style={styles.airBadge} pointerEvents="none">
        <MaterialIcons
          name={pose.airflow === 'nasal' ? 'south' : 'east'}
          size={12}
          color={colors.blue}
        />
        <Text style={styles.airBadgeText}>
          {tx(locale, pose.airflow === 'nasal' ? 'quiz.studio.via_nose' : 'quiz.studio.via_mouth')}
        </Text>
      </View>
    </View>
  );
}

function StageStrip({ locale, phase, active }: { locale: Locale; phase: number; active: boolean }) {
  return (
    <View style={styles.stages}>
      {STAGES.map((stage, index) => {
        const current = active && phase === index;
        return (
          <View key={stage} style={[styles.stage, current && styles.stageActive]}>
            <MaterialIcons name={STAGE_ICONS[stage]} size={13} color={current ? colors.blue : colors.mute} />
            <Text style={[styles.stageLabel, current && styles.stageLabelActive]}>
              {tx(locale, `quiz.studio.stage.${stage}`)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/** Figure, view switch and a play/pause control. */
export function ArticulationPlayer({ sound, locale }: { sound: ArticulationSound; locale: Locale }) {
  const [playing, setPlaying] = useState(true);
  const [threeD, setThreeD] = useState(false);
  const [angle, setAngle] = useState<number>(ARTICULATION_SLAB.defaultAngle);
  const [dragging, setDragging] = useState(false);
  const timeline = useArticulationTimeline(sound, playing);
  const { reduced, active, phase, displayed } = timeline;
  const clamped = clampArticulationAngle(angle);

  // Dragging turns the block freely inside the range that still reads as a
  // cutaway. A frame is scheduled per gesture move, and the block drops to a
  // coarser extrusion while dragging so the SVG stays light.
  const angleRef = useRef(clamped);
  angleRef.current = clamped;
  const dragStart = useRef(clamped);
  const pendingAngle = useRef(clamped);
  const frame = useRef<number | null>(null);

  const schedule = useCallback((next: number) => {
    pendingAngle.current = next;
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      setAngle(pendingAngle.current);
    });
  }, []);

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_event, gesture) =>
          Math.abs(gesture.dx) > 4 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderGrant: () => {
          dragStart.current = angleRef.current;
          setDragging(true);
        },
        onPanResponderMove: (_event, gesture) => {
          schedule(clampArticulationAngle(dragStart.current + gesture.dx * 0.32));
        },
        onPanResponderRelease: () => setDragging(false),
        onPanResponderTerminate: () => setDragging(false),
        onPanResponderTerminationRequest: () => false,
      }),
    [schedule],
  );

  const stepAngle = (delta: number) => setAngle((value) => clampArticulationAngle(value + delta));

  return (
    <View style={styles.player}>
      {threeD ? (
        <View
          {...responder.panHandlers}
          accessibilityRole="adjustable"
          accessibilityLabel={tx(locale, 'quiz.studio.turn')}
          accessibilityValue={{
            min: ARTICULATION_SLAB.minAngle,
            max: ARTICULATION_SLAB.maxAngle,
            now: Math.round(clamped),
            text: tx(locale, 'quiz.studio.angle', [`${Math.round(clamped)}°`]),
          }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(event) =>
            stepAngle(event.nativeEvent.actionName === 'increment' ? ARTICULATION_SLAB.step : -ARTICULATION_SLAB.step)
          }
        >
          <ArticulationFigure3D
            locale={locale}
            timeline={timeline}
            angle={clamped}
            steps={dragging ? 5 : 10}
            hint={tx(locale, 'quiz.studio.drag_hint')}
          />
        </View>
      ) : (
        <ArticulationFigure locale={locale} timeline={timeline} />
      )}

      <StageStrip locale={locale} phase={phase} active={active} />

      <View style={styles.controls}>
        {reduced ? (
          <Text style={styles.playerNote}>{tx(locale, 'quiz.studio.reduced_motion')}</Text>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tx(locale, playing ? 'quiz.studio.pause' : 'quiz.studio.play')}
            onPress={() => setPlaying((value) => !value)}
            style={({ pressed }) => [styles.playButton, pressed && styles.pressed]}
          >
            <MaterialIcons name={playing ? 'pause' : 'play-arrow'} size={20} color={colors.blue} />
            <Text style={styles.playLabel}>
              {tx(locale, playing ? 'quiz.studio.pause' : 'quiz.studio.play')}
            </Text>
          </Pressable>
        )}

        <View style={styles.viewToggle}>
          {[false, true].map((isThreeD) => (
            <Pressable
              key={isThreeD ? '3d' : '2d'}
              accessibilityRole="button"
              accessibilityState={{ selected: threeD === isThreeD }}
              accessibilityLabel={tx(locale, isThreeD ? 'quiz.studio.view.3d_a11y' : 'quiz.studio.view.2d_a11y')}
              onPress={() => setThreeD(isThreeD)}
              style={({ pressed }) => [
                styles.viewOption,
                threeD === isThreeD && styles.viewOptionActive,
                pressed && styles.pressed,
              ]}
            >
              <MaterialIcons
                name={isThreeD ? '3d-rotation' : 'aspect-ratio'}
                size={13}
                color={threeD === isThreeD ? colors.blue : colors.mute}
              />
              <Text style={[styles.viewLabel, threeD === isThreeD && styles.viewLabelActive]}>
                {tx(locale, isThreeD ? 'quiz.studio.view.3d' : 'quiz.studio.view.2d')}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {threeD ? (
        <View style={styles.turnRow}>
          <Text style={styles.turnLabel}>{tx(locale, 'quiz.studio.turn')}</Text>
          {ARTICULATION_SLAB.presets.map((preset) => {
            const selected = Math.round(clamped) === preset;
            return (
              <Pressable
                key={preset}
                accessibilityRole="button"
                accessibilityLabel={tx(locale, 'quiz.studio.angle', [formatAngle(preset)])}
                accessibilityState={{ selected }}
                onPress={() => setAngle(preset)}
                style={({ pressed }) => [
                  styles.presetChip,
                  selected && styles.presetChipActive,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.presetLabel, selected && styles.presetLabelActive]}>
                  {formatAngle(preset)}
                </Text>
              </Pressable>
            );
          })}
          <Text style={styles.turnValue}>
            {pick(displayed.word, locale)} · {formatAngle(clamped)}
          </Text>
        </View>
      ) : null}
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
  airBadge: {
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
  airBadgeText: { color: colors.blue, fontSize: 10, fontWeight: '700' },
  player: { gap: 10 },
  stages: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.mist,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  stageActive: { backgroundColor: colors.blueSoft },
  stageLabel: { color: colors.mute, fontSize: 10, fontWeight: '700' },
  stageLabelActive: { color: colors.blue },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  playButton: {
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
  playLabel: { color: colors.blue, fontSize: 12, fontWeight: '700' },
  playerNote: { flex: 1, color: colors.inkSoft, fontSize: 12 },
  viewToggle: {
    marginLeft: 'auto',
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    padding: 2,
    gap: 2,
  },
  viewOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  viewOptionActive: { backgroundColor: colors.blueSoft },
  viewLabel: { color: colors.mute, fontSize: 11, fontWeight: '700' },
  viewLabelActive: { color: colors.blue },
  turnRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  turnLabel: {
    color: colors.mute,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  presetChip: {
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
  presetChipActive: { borderColor: colors.blue, backgroundColor: colors.blueSoft },
  presetLabel: { color: colors.inkSoft, fontSize: 12, fontWeight: '700' },
  presetLabelActive: { color: colors.blue },
  turnValue: { marginLeft: 'auto', color: colors.inkSoft, fontSize: 11, fontWeight: '600' },
  disabled: { opacity: 0.35 },
  pressed: { opacity: 0.7 },
}));
