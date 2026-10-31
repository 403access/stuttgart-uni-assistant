import { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Text, View } from 'react-native';

import { themedStyles } from '@ua/ui/theme';
import { pick, tx } from '@ua/core/format';
import type { Locale } from '@ua/core/domain/types';

import type { ArticulationCamera, ArticulationSound } from '../core';
import {
  ARTICULATION_CAMERA,
  ARTICULATION_PITCH,
  ARTICULATION_TURN,
  wrapArticulationAngle,
} from '../core';
import { AngleRow, PlayButton, ViewToggle, formatAngle } from './controls';
import { ArticulationFigure } from './figure-2d';
import { ArticulationFigure3D } from './figure-3d';
import { PhaseStrip } from './phase-strip';
import { useArticulationTimeline } from './timeline';

const clampPitch = (value: number) =>
  Math.max(ARTICULATION_PITCH.min, Math.min(ARTICULATION_PITCH.max, value));

/**
 * Figure, phase strip and the controls. The flat and the 3D view share one
 * timeline, so switching views never restarts the story.
 */
export function ArticulationPlayer({ sound, locale }: { sound: ArticulationSound; locale: Locale }) {
  const [playing, setPlaying] = useState(true);
  const [threeD, setThreeD] = useState(false);
  const [camera, setCamera] = useState<ArticulationCamera>(ARTICULATION_CAMERA);
  const [dragging, setDragging] = useState(false);
  const timeline = useArticulationTimeline(sound, playing);
  const { reduced, phaseIndex, phaseWindow, displayed } = timeline;

  // Dragging turns and tilts the model freely. One frame per gesture move, and
  // a coarser shell while the finger is down, keeps the SVG light.
  const cameraRef = useRef(camera);
  cameraRef.current = camera;
  const dragStart = useRef(camera);
  const pending = useRef(camera);
  const frame = useRef<number | null>(null);

  const schedule = (next: ArticulationCamera) => {
    pending.current = next;
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      setCamera(pending.current);
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
        // Horizontal only: a vertical drag belongs to the page scroll.
        onMoveShouldSetPanResponder: (_event, gesture) =>
          Math.abs(gesture.dx) > 4 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderGrant: () => {
          dragStart.current = cameraRef.current;
          setDragging(true);
        },
        onPanResponderMove: (_event, gesture) => {
          schedule({
            yaw: wrapArticulationAngle(dragStart.current.yaw + gesture.dx * 0.55),
            pitch: dragStart.current.pitch,
          });
        },
        onPanResponderRelease: () => setDragging(false),
        onPanResponderTerminate: () => setDragging(false),
        onPanResponderTerminationRequest: () => false,
      }),
    [],
  );

  const setYaw = (yaw: number) => setCamera((current) => ({ ...current, yaw }));
  const stepYaw = (delta: number) =>
    setCamera((current) => ({ ...current, yaw: wrapArticulationAngle(current.yaw + delta) }));
  const stepPitch = (delta: number) =>
    setCamera((current) => ({ ...current, pitch: clampPitch(current.pitch + delta) }));

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
            now: Math.round(camera.yaw),
            text: tx(locale, 'quiz.studio.angle', [`${Math.round(camera.yaw)}°`]),
          }}
          accessibilityActions={[
            { name: 'increment' },
            { name: 'decrement' },
            { name: 'tiltUp', label: tx(locale, 'quiz.studio.tilt_up') },
            { name: 'tiltDown', label: tx(locale, 'quiz.studio.tilt_down') },
          ]}
          onAccessibilityAction={(event) => {
            switch (event.nativeEvent.actionName) {
              case 'increment':
                stepYaw(ARTICULATION_TURN.step);
                break;
              case 'decrement':
                stepYaw(-ARTICULATION_TURN.step);
                break;
              case 'tiltUp':
                stepPitch(ARTICULATION_PITCH.step);
                break;
              case 'tiltDown':
                stepPitch(-ARTICULATION_PITCH.step);
                break;
            }
          }}
        >
          <ArticulationFigure3D
            locale={locale}
            timeline={timeline}
            camera={camera}
            steps={dragging ? 5 : 10}
            hint={tx(locale, 'quiz.studio.drag_hint')}
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
        <ViewToggle locale={locale} threeD={threeD} onChange={setThreeD} />
      </View>

      {threeD ? (
        <AngleRow
          locale={locale}
          angle={camera.yaw}
          pitch={camera.pitch}
          onSelect={setYaw}
          onTilt={(direction) => stepPitch(direction * ARTICULATION_PITCH.step)}
          caption={`${formatAngle(camera.yaw)} / ${formatAngle(camera.pitch)}`}
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
