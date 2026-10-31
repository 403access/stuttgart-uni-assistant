import { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Text, View } from 'react-native';

import { themedStyles } from '@ua/ui/theme';
import { pick, tx } from '@ua/core/format';
import type { Locale } from '@ua/core/domain/types';

import type { ArticulationSound } from '../core';
import { ARTICULATION_SLAB, clampArticulationAngle } from '../core';
import { AngleRow, PlayButton, ViewToggle, formatAngle } from './controls';
import { ArticulationFigure } from './figure-2d';
import { ArticulationFigure3D } from './figure-3d';
import { PhaseStrip } from './phase-strip';
import { useArticulationTimeline } from './timeline';

/**
 * Figure, phase strip and the controls. The flat and the 3D view share one
 * timeline, so switching views never restarts the story.
 */
export function ArticulationPlayer({ sound, locale }: { sound: ArticulationSound; locale: Locale }) {
  const [playing, setPlaying] = useState(true);
  const [threeD, setThreeD] = useState(false);
  const [angle, setAngle] = useState<number>(ARTICULATION_SLAB.defaultAngle);
  const [dragging, setDragging] = useState(false);
  const timeline = useArticulationTimeline(sound, playing);
  const { reduced, phaseIndex, phaseWindow, displayed } = timeline;
  const clamped = clampArticulationAngle(angle);

  // Dragging turns the block freely inside the range that still reads as a
  // cutaway. One frame per gesture move, and a coarser extrusion while the
  // finger is down, keeps the SVG light.
  const angleRef = useRef(clamped);
  angleRef.current = clamped;
  const dragStart = useRef(clamped);
  const pendingAngle = useRef(clamped);
  const frame = useRef<number | null>(null);

  const schedule = (next: number) => {
    pendingAngle.current = next;
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      setAngle(pendingAngle.current);
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
    [],
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
          angle={clamped}
          onSelect={setAngle}
          caption={`${pick(displayed.word, locale)} · ${formatAngle(clamped)}`}
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
