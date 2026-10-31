import { HEAD_VIEW_BOX } from './geometry/regions';

/**
 * The 3D view model: the sagittal section is one solid block that turns around
 * the vertical axis, with the movable articulators raised in front of it — the
 * classic layered anatomy model. Values are in figure units.
 */
export const ARTICULATION_SLAB = {
  /** How far the head block extends behind the cut plane. */
  thickness: 54,
  /** How far the raised plates float in front of the cut plane. */
  tongue: 22,
  velum: 28,
  lips: 34,
  cords: 12,
  /** Tangent of the camera elevation; gives the block its slight tilt. */
  elevation: 0.18,
  minAngle: -180,
  maxAngle: 180,
  step: 15,
  defaultAngle: 28,
  /** Angles that read well: front, and both three-quarter views. */
  presets: [0, 28, -28],
} as const;

/** Padded frame for the 3D view: the turned block needs room for its side wall. */
export const ARTICULATION_3D_VIEW_BOX = '120 20 800 990';

/** Clip an angle to the range the model was built for. */
export function clampArticulationAngle(angle: number): number {
  return Math.max(ARTICULATION_SLAB.minAngle, Math.min(ARTICULATION_SLAB.maxAngle, angle));
}

/**
 * Fold any angle into (−180, 180], so a drag can spin the block through a full
 * circle instead of stopping at a limit.
 */
export function wrapArticulationAngle(angle: number): number {
  const wrapped = ((angle + 180) % 360 + 360) % 360 - 180;
  return wrapped === -180 ? 180 : wrapped;
}

export interface ArticulationTurn {
  /** Horizontal compression of the cut plane. */
  cos: number;
  /** Depth direction of the turned block. */
  sin: number;
  /** Vertical shear that makes the turn read as a tilt. */
  skew: number;
}

export function articulationTurn(angle: number): ArticulationTurn {
  const radians = (clampArticulationAngle(angle) * Math.PI) / 180;
  return {
    cos: Math.cos(radians),
    sin: Math.sin(radians),
    skew: Math.tan(ARTICULATION_SLAB.elevation) * Math.sin(radians),
  };
}

/**
 * SVG transform for the turned block: compress the cut plane, then shear it so
 * the turn reads as a tilt instead of a skew.
 */
export function articulationBlockTransform(angle: number): string {
  const turn = articulationTurn(angle);
  const [minX, , width] = HEAD_VIEW_BOX.split(/[\s,]+/).map(Number);
  const centerX = minX + width / 2;
  const skew = ((Math.atan(turn.skew) * 180) / Math.PI).toFixed(3);
  return `translate(${centerX} 0) scale(${turn.cos.toFixed(4)} 1) skewY(${skew}) translate(${-centerX} 0)`;
}

/**
 * Position of a point on the turned block, for overlays that live outside the
 * SVG (air puffs, rings). `lift` raises the point towards the viewer.
 */
export function projectArticulationPoint(
  point: readonly [number, number],
  angle: number,
  lift = 0,
): { x: number; y: number } {
  const turn = articulationTurn(angle);
  const [minX, , width] = HEAD_VIEW_BOX.split(/[\s,]+/).map(Number);
  const centerX = minX + width / 2;
  return {
    x: centerX + (point[0] - centerX) * turn.cos + lift * turn.sin * turn.cos,
    y: point[1] + (point[0] - centerX + lift * turn.sin) * turn.skew,
  };
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
