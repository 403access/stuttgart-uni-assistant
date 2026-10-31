import { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Text, View } from 'react-native';

import { themedStyles } from '@ua/ui/theme';
import { pick, tx } from '@ua/core/format';
import type { Locale } from '@ua/core/domain/types';

import type {
  ArticulationAxis,
  ArticulationCamera,
  ArticulationCanvas,
  ArticulationGridTone,
  ArticulationSound,
} from '../core';
import {
  ARTICULATION_CAMERA,
  ARTICULATION_SURFACE,
  ARTICULATION_TURN,
  articulationAxisAngle,
  withArticulationAxis,
  wrapArticulationAngle,
} from '../core';
import {
  AngleRow,
  OverlayToggle,
  PlayButton,
  SpeedRow,
  StageColors,
  ViewToggle,
  formatAngle,
} from './controls';
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
  const [showGrid, setShowGrid] = useState(false);
  const [camera, setCamera] = useState<ArticulationCamera>(ARTICULATION_CAMERA);
  const [axis, setAxis] = useState<ArticulationAxis>('y');
  const [canvas, setCanvas] = useState<ArticulationCanvas>(ARTICULATION_SURFACE.canvas);
  const [gridTone, setGridTone] = useState<ArticulationGridTone>(ARTICULATION_SURFACE.grid);
  const timeline = useArticulationTimeline(sound, playing, speed);
  const { reduced, phaseIndex, phaseWindow } = timeline;
  const angle = articulationAxisAngle(camera, axis);

  // Dragging turns the model around the selected axis. One frame per gesture
  // move keeps the SVG light.
  const angleRef = useRef(angle);
  angleRef.current = angle;
  const dragStart = useRef(angle);
  const pending = useRef(angle);
  const frame = useRef<number | null>(null);

  const schedule = (next: number) => {
    pending.current = next;
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      setCamera((current) => withArticulationAxis(current, axisRef.current, pending.current));
    });
  };

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );

  const axisRef = useRef(axis);
  axisRef.current = axis;

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_event, gesture) =>
          Math.abs(gesture.dx) > 4 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderGrant: () => {
          dragStart.current = angleRef.current;
        },
        onPanResponderMove: (_event, gesture) => {
          schedule(wrapArticulationAngle(dragStart.current + gesture.dx * 0.55));
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [],
  );

  const stepAxis = (delta: number) =>
    setCamera((current) =>
      withArticulationAxis(current, axis, wrapArticulationAngle(articulationAxisAngle(current, axis) + delta)),
    );

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
            now: Math.round(angle),
            text: tx(locale, 'quiz.studio.angle', [`${Math.round(angle)}°`]),
          }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(event) =>
            stepAxis(
              event.nativeEvent.actionName === 'increment' ? ARTICULATION_TURN.step : -ARTICULATION_TURN.step,
            )
          }
        >
          <ArticulationFigure3D
            locale={locale}
            timeline={timeline}
            camera={camera}
            hint={tx(locale, 'quiz.studio.drag_hint')}
            canvas={canvas}
            gridTone={gridTone}
            showAxes={showAxes}
            showGrid={showGrid}
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
          <>
            <OverlayToggle
              icon="open-with"
              label={tx(locale, 'quiz.studio.axes_a11y')}
              active={showAxes}
              onToggle={() => setShowAxes((value) => !value)}
            />
            <OverlayToggle
              icon="grid-on"
              label={tx(locale, 'quiz.studio.grid_a11y')}
              active={showGrid}
              onToggle={() => setShowGrid((value) => !value)}
            />
          </>
        ) : null}
        <ViewToggle locale={locale} threeD={threeD} onChange={setThreeD} />
      </View>

      <SpeedRow locale={locale} speed={speed} onSelect={setSpeed} />

      {threeD ? (
        <AngleRow
          locale={locale}
          axis={axis}
          onAxis={setAxis}
          angle={angle}
          onSelect={(value) => setCamera((current) => withArticulationAxis(current, axis, value))}
          caption={`${axis.toUpperCase()} ${formatAngle(angle)}`}
        />
      ) : null}

      {threeD ? (
        <StageColors
          locale={locale}
          canvas={canvas}
          gridTone={gridTone}
          onCanvas={setCanvas}
          onGridTone={setGridTone}
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
