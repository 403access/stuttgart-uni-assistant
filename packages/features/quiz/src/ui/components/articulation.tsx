import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';

import { useReducedMotion } from '@ua/ui';
import { colors, themedStyles } from '@ua/ui/theme';
import { pick, tx } from '@ua/core/format';
import type { Locale } from '@ua/core/domain/types';

import type { ArticulationSound } from '@ua/quiz-content/types';
import {
  HEAD_VIEW_BOX,
  VELUM_HINGE,
  airflowLane,
  articulationBackdrop,
  articulationFocus,
  articulationRegions,
  cordOutlines,
  lipOutlines,
  pointPercent,
  tongueOutline,
  velumAngle,
  velumOutlines,
} from '@ua/quiz-content/figures/articulation';
import { DiagramCanvas, diagramAspect, diagramTone } from './diagram';

/**
 * How a sound is produced, animated on the same sagittal head the diagram
 * questions use. The static anatomy comes from the quiz figure; the movable
 * articulators, the airstream and the voicing pulses are layered on top.
 *
 * The timeline tells the story in three beats: air rises from the lungs, the
 * vocal cords join in (or stay apart), then the articulators shape the stream.
 */
const CYCLE_MS = 5200;
const AIR_END = 0.4;
const VOICE_END = 0.62;

const STAGES = ['airflow', 'voice', 'articulation'] as const;
type Stage = (typeof STAGES)[number];

const STAGE_ICONS: Record<Stage, ComponentProps<typeof MaterialIcons>['name']> = {
  airflow: 'air',
  voice: 'graphic-eq',
  articulation: 'my-location',
};

function stageAt(value: number): number {
  if (value < AIR_END) return 0;
  if (value < VOICE_END) return 1;
  return 2;
}

/** Triangular highlight along the timeline, sampled so `interpolate` can use it. */
function wave(center: number, width = 0.07): { inputRange: number[]; outputRange: number[] } {
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
function airstreamCenter(position: number): number {
  if (position <= 0.5) return 0.04 + (position / 0.5) * 0.3;
  return 0.64 + ((position - 0.5) / 0.5) * 0.3;
}

export function ArticulationFigure({
  sound,
  locale,
  playing = true,
}: {
  sound: ArticulationSound;
  locale: Locale;
  playing?: boolean;
}) {
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

  const pose = displayed.pose;
  const lane = useMemo(() => airflowLane(pose.airflow, pose), [pose]);
  const dots = useMemo(
    () =>
      lane
        .map((point, index) => ({
          key: `${index}`,
          ...pointPercent(point),
          ...wave(airstreamCenter(index / (lane.length - 1))),
        }))
        .filter((dot, index) => index > 0 && index < lane.length - 2),
    [lane],
  );

  const focus = pointPercent(articulationFocus(displayed));
  const larynx = pointPercent([652, 762]);
  const tongue = tongueOutline(pose.tongue);
  const lips = lipOutlines(pose.lips);
  const cords = cordOutlines(displayed.voiced);
  const focusOpacity = clock.interpolate({
    inputRange: [0, VOICE_END, VOICE_END + 0.06, 0.9, 1],
    outputRange: [0, 0, 0.95, 0.75, 0],
  });
  const focusScale = clock.interpolate({
    inputRange: [0, 0.68, 1],
    outputRange: [0.75, 1.35, 1.35],
  });

  return (
    <View style={styles.figure}>
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
              d={tongue}
              fill={diagramTone('tongue').fill}
              stroke={diagramTone('tongue').stroke}
              strokeWidth={3}
              strokeLinejoin="round"
            />
            {lips.map((path, index) => (
              <Path
                key={`lips-${index}`}
                d={path}
                fill={diagramTone('lip').fill}
                stroke={diagramTone('lip').stroke}
                strokeWidth={3}
                strokeLinejoin="round"
              />
            ))}
            {cords.map((path, index) => (
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

          {displayed.voiced ? (
            <>
              {[0, 0.07].map((offset) => (
                <Animated.View
                  key={`voice-${offset}`}
                  style={[
                    styles.ring,
                    styles.voiceRing,
                    {
                      left: larynx.left,
                      top: larynx.top,
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
              ))}
            </>
          ) : null}

          <Animated.View
            style={[
              styles.ring,
              styles.focusRing,
              focus,
              {
                opacity: focusOpacity,
                transform: [{ scale: focusScale }],
              },
            ]}
          />
        </View>

        <View style={styles.airBadge} pointerEvents="none">
          <MaterialIcons
            name={displayed.pose.airflow === 'nasal' ? 'south' : 'east'}
            size={12}
            color={colors.blue}
          />
          <Text style={styles.airBadgeText}>
            {tx(locale, displayed.pose.airflow === 'nasal' ? 'quiz.studio.via_nose' : 'quiz.studio.via_mouth')}
          </Text>
        </View>
      </View>

      <StageStrip locale={locale} phase={phase} active={active} />
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
            <MaterialIcons
              name={STAGE_ICONS[stage]}
              size={13}
              color={current ? colors.blue : colors.mute}
            />
            <Text style={[styles.stageLabel, current && styles.stageLabelActive]}>
              {tx(locale, `quiz.studio.stage.${stage}`)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/** Figure plus a play/pause control and the three-step story. */
export function ArticulationPlayer({
  sound,
  locale,
}: {
  sound: ArticulationSound;
  locale: Locale;
}) {
  const reduced = useReducedMotion();
  const [playing, setPlaying] = useState(true);

  return (
    <View style={styles.player}>
      <ArticulationFigure sound={sound} locale={locale} playing={playing && !reduced} />
      <View style={styles.controls}>
        {reduced ? (
          <Text style={styles.playerNote}>{tx(locale, 'quiz.studio.reduced_motion')}</Text>
        ) : (
          <>
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
            <Text style={styles.playerNote}>
              {pick(sound.word, locale)} ·{' '}
              {tx(locale, sound.voiced ? 'quiz.studio.voiced' : 'quiz.studio.voiceless')}
            </Text>
          </>
        )}
      </View>
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
  figure: { gap: 8 },
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
  player: { gap: 10 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
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
  playerNote: { flex: 1, color: colors.inkSoft, fontSize: 12, textAlign: 'right' },
  pressed: { opacity: 0.7 },
}));
