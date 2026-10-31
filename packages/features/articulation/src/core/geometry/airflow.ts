import type { AirflowLane, ArticulationPose } from '../types';

import { tongueSurface } from './tongue';

type Point = readonly [number, number];

/** Air rises from the lungs through the trachea and larynx into the pharynx. */
const SOURCE: Point[] = [
  [668, 946],
  [668, 880],
  [664, 822],
  [660, 776],
  [654, 716],
  [650, 650],
  [640, 592],
];

const NASAL: Point[] = [
  ...SOURCE,
  [622, 536],
  [606, 494],
  [580, 440],
  [520, 396],
  [444, 372],
  [368, 374],
  [304, 398],
  [262, 430],
  [246, 446],
];

/**
 * The airstream as a polyline in figure coordinates. The oral route follows the
 * tongue surface with a little clearance and leaves between the lips.
 */
export function airflowLane(lane: AirflowLane, pose: ArticulationPose): Point[] {
  if (lane === 'nasal') return NASAL;

  const dorsum = [560, 490, 420, 360].map(
    (x) => [x, Math.min(tongueSurface(pose.tongue, x) - 20, 552)] as Point,
  );
  return [...SOURCE, [608, 556], ...dorsum, [312, 536], [268, 542], [246, 546]];
}

/**
 * Where the stricture sits along the lane (0 at the lungs, 1 at the exit). The
 * studio stops the air at a closure and lets it burst out on release.
 */
export function airflowFocusT(lane: Point[], focus: Point): number {
  let total = 0;
  let best = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let index = 1; index < lane.length; index += 1) {
    const [x0, y0] = lane[index - 1];
    const [x1, y1] = lane[index];
    const length = Math.hypot(x1 - x0, y1 - y0);
    const projection =
      length > 0
        ? Math.max(0, Math.min(1, ((focus[0] - x0) * (x1 - x0) + (focus[1] - y0) * (y1 - y0)) / (length * length)))
        : 0;
    const px = x0 + (x1 - x0) * projection;
    const py = y0 + (y1 - y0) * projection;
    const distance = Math.hypot(px - focus[0], py - focus[1]);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = total + length * projection;
    }
    total += length;
  }
  return total > 0 ? Math.max(0, Math.min(1, best / total)) : 0.6;
}
