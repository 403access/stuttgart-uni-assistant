import { HEAD_VIEW_BOX, vocalTractFigure, vocalTractRegions } from '@ua/quiz-content/figures/vocal-tract';

import type { DiagramRegion } from '@ua/quiz-content/types';

/**
 * The studio draws the same head as the quiz's diagram questions. The static
 * parts come straight from `vocalTractRegions`, so a label, a tap target and the
 * animated figure can never drift apart.
 */
const FIXED_REGION_IDS = new Set([
  'nasal-cavity',
  'pharynx',
  'oral-cavity',
  'hard-palate',
  'alveolar-ridge',
  'teeth',
  'lower-jaw',
  'larynx',
  'trachea',
]);

export { HEAD_VIEW_BOX };

/** Everything that does not move while a sound is produced. */
export const articulationRegions: DiagramRegion[] = vocalTractRegions.filter((region) =>
  FIXED_REGION_IDS.has(region.id),
);

/** The skull outline behind the anatomy. */
export const articulationBackdrop: string[] = vocalTractFigure.backdrop;
