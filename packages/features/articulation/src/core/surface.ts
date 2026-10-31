import type { Localized } from '@ua/core/domain/types';

/**
 * Colours of the 3D stage. The learner picks the canvas and the grid
 * independently: a projection reads differently on paper than on a dark board,
 * and the grid has to stay visible either way.
 */
export type ArticulationCanvas = 'paper' | 'sand' | 'slate' | 'ink';

/** The colour of the reference grid lines. */
export type ArticulationGridTone = 'blue' | 'warm' | 'grey' | 'ink';

export interface ArticulationCanvasOption {
  id: ArticulationCanvas;
  /** Fill of the stage behind the model. */
  color: string;
  label: Localized;
}

export interface ArticulationGridToneOption {
  id: ArticulationGridTone;
  /** The thin grid lines. */
  line: string;
  /** The two lines through the pivot. */
  strong: string;
  label: Localized;
}

/** The stage colours, lightest first. */
export const ARTICULATION_CANVASES: ArticulationCanvasOption[] = [
  { id: 'paper', color: '#F4F7FB', label: { de: 'Papier', en: 'Paper' } },
  { id: 'sand', color: '#F8F2E7', label: { de: 'Sand', en: 'Sand' } },
  { id: 'slate', color: '#E4EBF2', label: { de: 'Schiefer', en: 'Slate' } },
  { id: 'ink', color: '#22303F', label: { de: 'Tinte', en: 'Ink' } },
];

/** Grid tones that stay readable on every canvas. */
export const ARTICULATION_GRID_TONES: ArticulationGridToneOption[] = [
  { id: 'blue', line: '#B7CCE0', strong: '#8FAECB', label: { de: 'Blau', en: 'Blue' } },
  { id: 'warm', line: '#D8C3A6', strong: '#BF9F78', label: { de: 'Warm', en: 'Warm' } },
  { id: 'grey', line: '#C2CBD3', strong: '#9FAAB5', label: { de: 'Grau', en: 'Grey' } },
  { id: 'ink', line: '#7E93A6', strong: '#5C7286', label: { de: 'Tinte', en: 'Ink' } },
];

/** The stage the studio opens with. */
export const ARTICULATION_SURFACE = { canvas: 'paper', grid: 'blue' } as const;

export interface ArticulationStage {
  background: string;
  grid: string;
  gridStrong: string;
}

/** Resolve the two chosen options into the colours the renderer draws with. */
export function articulationStage(
  canvas: ArticulationCanvas,
  grid: ArticulationGridTone,
): ArticulationStage {
  const background = ARTICULATION_CANVASES.find((option) => option.id === canvas) ?? ARTICULATION_CANVASES[0];
  const tone = ARTICULATION_GRID_TONES.find((option) => option.id === grid) ?? ARTICULATION_GRID_TONES[0];
  return { background: background.color, grid: tone.line, gridStrong: tone.strong };
}
