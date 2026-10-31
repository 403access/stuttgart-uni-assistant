import type { ArticulationPlace, ArticulationSound, TonguePose } from '../types';

type Point = readonly [number, number];

/** Where the airstream is shaped, in figure coordinates (focus ring centre). */
const PLACE_FOCUS: Record<ArticulationPlace, Point> = {
  bilabial: [250, 545],
  labiodental: [264, 522],
  dental: [304, 500],
  alveolar: [322, 486],
  postalveolar: [356, 492],
  palatal: [520, 486],
  velar: [578, 482],
  glottal: [654, 760],
};

const VOWEL_FOCUS: Record<TonguePose, Point> = {
  rest: [430, 540],
  dental: [430, 540],
  alveolar: [430, 540],
  postalveolar: [430, 540],
  palatal: [514, 486],
  velar: [540, 500],
  'high-front': [440, 478],
  'near-high-front': [446, 506],
  'low-front': [440, 552],
  'mid-central': [470, 534],
  'high-back': [566, 496],
  'low-back': [500, 558],
  low: [460, 562],
};

/** The point the studio marks as the stricture for a sound. */
export function articulationFocus(sound: ArticulationSound): Point {
  if (sound.place) return PLACE_FOCUS[sound.place];
  return VOWEL_FOCUS[sound.pose.tongue];
}
