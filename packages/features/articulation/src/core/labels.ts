import type { Localized } from '@ua/core/domain/types';

import type { ArticulationManner, ArticulationPlace } from './types';

/** Human-readable classifications, shared by the picker and the website. */
export const mannerLabels: Record<ArticulationManner, Localized> = {
  stop: { de: 'Plosiv', en: 'Stop' },
  nasal: { de: 'Nasal', en: 'Nasal' },
  fricative: { de: 'Frikativ', en: 'Fricative' },
  approximant: { de: 'Approximant', en: 'Approximant' },
  vowel: { de: 'Vokal', en: 'Vowel' },
};

export const placeLabels: Record<ArticulationPlace, Localized> = {
  bilabial: { de: 'bilabial', en: 'bilabial' },
  labiodental: { de: 'labiodental', en: 'labiodental' },
  dental: { de: 'dental', en: 'dental' },
  alveolar: { de: 'alveolar', en: 'alveolar' },
  postalveolar: { de: 'postalveolar', en: 'postalveolar' },
  palatal: { de: 'palatal', en: 'palatal' },
  velar: { de: 'velar', en: 'velar' },
  glottal: { de: 'glottal', en: 'glottal' },
};
