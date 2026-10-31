import type { Localized } from '@ua/core/domain/types';

import type { ArticulationManner, ArticulationPlace, ArticulationSound } from './types';

import { articulationGroups, articulationSounds } from './sounds';
import { mannerLabels, placeLabels } from './labels';
import { articulationPhases } from './phases';
import {
  airflowLane,
  articulationFocus,
  cordOutlines,
  lipOutlines,
  tongueOutline,
  velumAngle,
  velumOutlines,
  articulationBackdrop,
  articulationRegions,
  HEAD_VIEW_BOX,
} from './geometry';
import { diagramPalette } from '@ua/quiz-content/figures/palette';
import { ARTICULATION_3D_VIEW_BOX, ARTICULATION_SLAB } from './view3d';

/**
 * Everything the static website needs to render the articulation studio, as
 * plain data: the geometry is already resolved into SVG paths, so the site can
 * ship a zero-dependency demo that stays in step with the app.
 *
 * `bun run site:articulation` writes this into `apps/site/assets/articulation.js`
 * and `tools/check-articulation.ts` fails when the file is stale.
 */
export interface ArticulationSitePhase {
  id: string;
  label: Localized;
  detail: Localized;
  airflow: string;
  weight: number;
}

export interface ArticulationSiteSound {
  id: string;
  glyph: string;
  word: Localized;
  manner: ArticulationManner;
  mannerLabel: Localized;
  place?: ArticulationPlace;
  placeLabel?: Localized;
  shape?: Localized;
  voiced: boolean;
  airflow: 'oral' | 'nasal';
  /** The phases this sound runs through, in order. */
  phases: ArticulationSitePhase[];
  summary: Localized;
  pose: {
    tongue: string;
    lips: string[];
    cords: string[];
    /** Rotation of the velum and uvula around their hinge, in degrees. */
    velum: number;
    lane: number[][];
    focus: number[];
  };
}

export interface ArticulationSiteData {
  headViewBox: string;
  view3d: string;
  slab: typeof ARTICULATION_SLAB;
  silhouette: { d: string; fill: string; stroke: string }[];
  regions: { d: string; fill: string; stroke: string }[];
  velum: string[];
  /** The neutral articulators the approach phase starts from. */
  rest: { tongue: string; lips: string[] };
  manners: { id: ArticulationManner; label: Localized }[];
  sounds: ArticulationSiteSound[];
}

function pose(sound: ArticulationSound) {
  return {
    tongue: tongueOutline(sound.pose.tongue),
    lips: lipOutlines(sound.pose.lips),
    cords: cordOutlines(sound.voiced),
    velum: velumAngle(sound.pose.velum),
    lane: airflowLane(sound.pose.airflow, sound.pose).map(([x, y]) => [x, y]),
    focus: [...articulationFocus(sound)],
  };
}

export function buildArticulationSiteData(): ArticulationSiteData {
  return {
    headViewBox: HEAD_VIEW_BOX,
    view3d: ARTICULATION_3D_VIEW_BOX,
    slab: ARTICULATION_SLAB,
    silhouette: articulationBackdrop.map((d) => ({ d, fill: '#FFFDF9', stroke: '#243447' })),
    regions: articulationRegions.flatMap((region) =>
      region.path
        ? [
            {
              d: region.path,
              ...diagramPalette[region.tone ?? 'rose'],
            },
          ]
        : [],
    ),
    velum: velumOutlines,
    rest: { tongue: tongueOutline('rest'), lips: lipOutlines('open') },
    manners: articulationGroups.map((group) => ({
      id: group.manner,
      label: mannerLabels[group.manner],
    })),
    sounds: articulationSounds.map((sound) => ({
      id: sound.id,
      glyph: sound.glyph,
      word: sound.word,
      manner: sound.manner,
      mannerLabel: mannerLabels[sound.manner],
      ...(sound.place ? { place: sound.place, placeLabel: placeLabels[sound.place] } : {}),
      ...(sound.shape ? { shape: sound.shape } : {}),
      voiced: sound.voiced,
      airflow: sound.pose.airflow,
      phases: articulationPhases(sound).map((phase) => ({
        id: phase.id,
        label: phase.label,
        detail: phase.detail,
        airflow: phase.airflow,
        weight: phase.weight,
      })),
      summary: sound.summary,
      pose: pose(sound),
    })),
  };
}
