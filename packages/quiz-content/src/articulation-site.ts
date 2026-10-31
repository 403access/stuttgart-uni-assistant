import type { Localized } from '@ua/core/domain/types';

import type { ArticulationManner, ArticulationPlace, ArticulationSound } from './types';

import { articulationGroups, articulationSounds } from './articulation';
import {
  ARTICULATION_3D_VIEW_BOX,
  ARTICULATION_SLAB,
  HEAD_VIEW_BOX,
  airflowLane,
  articulationBackdrop,
  articulationFocus,
  articulationRegions,
  cordOutlines,
  lipOutlines,
  tongueOutline,
  velumAngle,
  velumOutlines,
} from './figures/articulation';
import { diagramPalette } from './figures/palette';

/**
 * Everything the static website needs to render the articulation studio, as
 * plain data: the geometry is already resolved into SVG paths, so the site can
 * ship a zero-dependency demo that stays in step with the app.
 *
 * `bun run site:articulation` writes this into `apps/site/assets/articulation.js`
 * and `bun run check:quiz` fails when the file is stale.
 */
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
  manners: { id: ArticulationManner; label: Localized }[];
  sounds: ArticulationSiteSound[];
}

const MANNER_LABELS: Record<ArticulationManner, Localized> = {
  stop: { de: 'Plosiv', en: 'Stop' },
  nasal: { de: 'Nasal', en: 'Nasal' },
  fricative: { de: 'Frikativ', en: 'Fricative' },
  approximant: { de: 'Approximant', en: 'Approximant' },
  vowel: { de: 'Vokal', en: 'Vowel' },
};

const PLACE_LABELS: Record<ArticulationPlace, Localized> = {
  bilabial: { de: 'bilabial', en: 'bilabial' },
  labiodental: { de: 'labiodental', en: 'labiodental' },
  dental: { de: 'dental', en: 'dental' },
  alveolar: { de: 'alveolar', en: 'alveolar' },
  postalveolar: { de: 'postalveolar', en: 'postalveolar' },
  palatal: { de: 'palatal', en: 'palatal' },
  velar: { de: 'velar', en: 'velar' },
  glottal: { de: 'glottal', en: 'glottal' },
};

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
    manners: articulationGroups.map((group) => ({
      id: group.manner,
      label: MANNER_LABELS[group.manner],
    })),
    sounds: articulationSounds.map((sound) => ({
      id: sound.id,
      glyph: sound.glyph,
      word: sound.word,
      manner: sound.manner,
      mannerLabel: MANNER_LABELS[sound.manner],
      ...(sound.place ? { place: sound.place, placeLabel: PLACE_LABELS[sound.place] } : {}),
      ...(sound.shape ? { shape: sound.shape } : {}),
      voiced: sound.voiced,
      airflow: sound.pose.airflow,
      summary: sound.summary,
      pose: pose(sound),
    })),
  };
}
