import { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Text, View } from 'react-native';

import { themedStyles } from '@ua/ui/theme';
import { pick, tx } from '@ua/core/format';
import type { Locale } from '@ua/core/domain/types';

import type { ArticulationCamera, ArticulationSound } from '../core';
import { ARTICULATION_CAMERA, ARTICULATION_TURN, wrapArticulationAngle } from '../core';
import { AngleRow, AxesToggle, PlayButton, SpeedRow, ViewToggle, formatAngle } from './controls';
import { ArticulationFigure } from './figure-2d';
import { ArticulationFigure3D } from './figure-3d';
import { PhaseStrip } from './phase-strip';
import { useArticulationTimeline } from './timeline';

/**
 * Figure, phase strip and the controls. The flat and the 3D view share one
 * timeline, so switching views never restarts the story.
 *
 * The 3D model turns on one axis. Its tilt is a fixed camera elevation, which
 * is what gives a turned view depth; it is deliberately not a control.
 */
export function ArticulationPlayer({ sound, locale }: { sound: ArticulationSound; locale: Locale }) {
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [threeD, setThreeD] = useState(false);
  const [showAxes, setShowAxes] = useState(false);
  const [yaw, setYaw] = useState<number>(ARTICULATION_CAMERA.yaw);
  const [dragging, setDragging] = useState(false);
  const timeline = useArticulationTimeline(sound, playing, speed);
  const { reduced, phaseIndex, phaseWindow } = timeline;
  const camera = useMemo<ArticulationCamera>(
    () => ({ yaw, pitch: ARTICULATION_CAMERA.pitch }),
    [yaw],
  );

  // Dragging turns the model freely. One frame per gesture move, and a coarser
  // shell while the finger is down, keeps the SVG light.
  const yawRef = useRef(yaw);
  yawRef.current = yaw;
  const dragStart = useRef(yaw);
  const pending = useRef(yaw);
  const frame = useRef<number | null>(null);

  const schedule = (next: number) => {
    pending.current = next;
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      setYaw(pending.current);
    });
  };

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
          dragStart.current = yawRef.current;
          setDragging(true);
        },
        onPanResponderMove: (_event, gesture) => {
          schedule(wrapArticulationAngle(dragStart.current + gesture.dx * 0.55));
        },
        onPanResponderRelease: () => setDragging(false),
        onPanResponderTerminate: () => setDragging(false),
        onPanResponderTerminationRequest: () => false,
      }),
    [],
  );

  const stepYaw = (delta: number) => setYaw((current) => wrapArticulationAngle(current + delta));

  return (
    <View style={styles.player}>
      {threeD ? (
        <View
          {...responder.panHandlers}
          accessibilityRole="adjustable"
          accessibilityLabel={tx(locale, 'quiz.studio.turn')}
          accessibilityValue={{
            min: ARTICULATION_TURN.minAngle,
            max: ARTICULATION_TURN.maxAngle,
            now: Math.round(yaw),
            text: tx(locale, 'quiz.studio.angle', [`${Math.round(yaw)}°`]),
          }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(event) =>
            stepYaw(
              event.nativeEvent.actionName === 'increment' ? ARTICULATION_TURN.step : -ARTICULATION_TURN.step,
            )
          }
        >
          <ArticulationFigure3D
            locale={locale}
            timeline={timeline}
            camera={camera}
            steps={dragging ? 5 : 10}
            hint={tx(locale, 'quiz.studio.drag_hint')}
            showAxes={showAxes}
          />
        </View>
      ) : (
        <ArticulationFigure locale={locale} timeline={timeline} />
      )}

      <PhaseStrip
        locale={locale}
        windows={timeline.windows}
        phaseIndex={phaseIndex}
        onSelect={timeline.seekPhase}
      />
      <Text style={styles.detail} numberOfLines={3}>
        {pick(phaseWindow.phase.detail, locale)}
      </Text>

      <View style={styles.controls}>
        {reduced ? (
          <Text style={styles.note}>{tx(locale, 'quiz.studio.reduced_motion')}</Text>
        ) : (
          <PlayButton locale={locale} playing={playing} onToggle={() => setPlaying((value) => !value)} />
        )}
        {threeD ? (
          <AxesToggle locale={locale} active={showAxes} onToggle={() => setShowAxes((value) => !value)} />
        ) : null}
        <ViewToggle locale={locale} threeD={threeD} onChange={setThreeD} />
      </View>

      <SpeedRow locale={locale} speed={speed} onSelect={setSpeed} />

      {threeD ? (
        <AngleRow
          locale={locale}
          angle={yaw}
          onSelect={setYaw}
          caption={formatAngle(yaw)}
        />
      ) : null}
    </View>
  );
}

const styles = themedStyles((colors) => ({
  player: { gap: 10 },
  detail: { color: colors.inkSoft, fontSize: 12, lineHeight: 17, minHeight: 51 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  note: { flex: 1, color: colors.inkSoft, fontSize: 12 },
}));
