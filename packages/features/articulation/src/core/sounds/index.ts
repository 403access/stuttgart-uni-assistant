import type { ArticulationManner, ArticulationSound } from '../types';

import { approximants } from './approximants';
import { fricatives } from './fricatives';
import { nasals } from './nasals';
import { stops } from './stops';
import { vowels } from './vowels';

/**
 * The sounds the articulation studio can animate. English examples follow the
 * course material (RP/GA), the German copy mirrors it. Each entry carries the
 * pose the figure animates, so adding a sound is a data-only change.
 */
export const articulationSounds: ArticulationSound[] = [
  ...stops,
  ...nasals,
  ...fricatives,
  ...approximants,
  ...vowels,
];

export const articulationMannerOrder: ArticulationManner[] = [
  'stop',
  'nasal',
  'fricative',
  'approximant',
  'vowel',
];

export const articulationGroups = articulationMannerOrder.map((manner) => ({
  manner,
  sounds: articulationSounds.filter((sound) => sound.manner === manner),
}));

export function findArticulationSound(soundId: string | undefined): ArticulationSound | undefined {
  return articulationSounds.find((sound) => sound.id === soundId);
}

/**
 * Which sound the studio opens with when it is reached from a quiz topic. Kept
 * next to the content (not on `QuizTopic`) so a server-side catalog import can
 * never remove the link.
 */
export const studioSoundForTopic: Record<string, string> = {
  'bpp-vocal-tract': 't',
  'bpp-grundlagen': 's',
  'bpp-ipa': 'i-long',
};
