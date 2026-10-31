import { roundRect } from '@ua/quiz-content/figures/vocal-tract';

import type { LipPose } from '../types';

/**
 * Lip pads. Each pose is two rounded rectangles — the real anatomy is more
 * complex, but the pads are what the quiz figure already shows, and their
 * distance, protrusion and height carry the articulation.
 */
const SHAPES: Record<LipPose, [number, number, number, number][]> = {
  open: [
    [236, 506, 32, 42],
    [234, 556, 32, 38],
  ],
  closed: [
    [237, 512, 31, 36],
    [235, 548, 31, 36],
  ],
  round: [
    [222, 504, 26, 44],
    [220, 556, 26, 40],
  ],
  spread: [
    [246, 512, 36, 26],
    [244, 562, 36, 24],
  ],
  labiodental: [
    [237, 508, 31, 40],
    [250, 530, 26, 26],
  ],
};

export function lipOutlines(pose: LipPose): string[] {
  return SHAPES[pose].map(([x, y, width, height]) => roundRect(x, y, width, height, 12));
}
