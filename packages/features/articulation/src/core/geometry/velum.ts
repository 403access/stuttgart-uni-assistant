import { vocalTractRegions } from '@ua/quiz-content/figures/vocal-tract';

import type { VelumPose } from '../types';

/** Velum and uvula hang from this point and swing around it. */
export const VELUM_HINGE = { x: 492, y: 405 };

/** Rotation of the velum in degrees: the lowered velum opens the nasal cavity. */
export function velumAngle(pose: VelumPose): number {
  return pose === 'lowered' ? 16 : 0;
}

/** Velum + uvula outlines, drawn as one rotating group. */
export const velumOutlines: string[] = ['velum', 'uvula']
  .map((id) => vocalTractRegions.find((region) => region.id === id)?.path)
  .filter((path): path is string => Boolean(path));
