import { HEAD_VIEW_BOX } from './geometry/regions';

/**
 * How far the model can be turned, the step screen readers use, and the angles
 * that read well as starting points. The depth model itself lives in
 * `scene3d.ts`.
 */
export const ARTICULATION_TURN = {
  minAngle: -180,
  maxAngle: 180,
  step: 15,
  defaultAngle: 28,
  /** Angles that read well: front, and both three-quarter views. */
  presets: [0, 28, -28],
} as const;

/** Padded frame for the 3D view: the turned block needs room for its side wall. */
export const ARTICULATION_3D_VIEW_BOX = '120 10 800 1060';

/**
 * Fold any angle into (−180, 180], so a drag can spin the block through a full
 * circle instead of stopping at a limit.
 */
export function wrapArticulationAngle(angle: number): number {
  const wrapped = ((angle + 180) % 360 + 360) % 360 - 180;
  return wrapped === -180 ? 180 : wrapped;
}

/** Mix a hex colour towards ink, for the extruded side walls. */
export function shadeColor(color: string, amount = 0.32): string {
  const value = color.replace('#', '');
  const full =
    value.length === 3
      ? value
          .split('')
          .map((part) => part + part)
          .join('')
      : value;
  const ink = [0x24, 0x34, 0x47];
  const mixed = [0, 2, 4].map((offset, index) => {
    const channel = Number.parseInt(full.slice(offset, offset + 2), 16);
    return Math.round(channel + (ink[index] - channel) * amount);
  });
  return `#${mixed.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}
