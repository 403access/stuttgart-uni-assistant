import type { Localized } from '@ua/core/domain/types';

/** Tongue body positions used by the articulation studio. */
export type TonguePose =
  | 'rest'
  | 'dental'
  | 'alveolar'
  | 'postalveolar'
  | 'palatal'
  | 'velar'
  | 'high-front'
  | 'near-high-front'
  | 'low-front'
  | 'mid-central'
  | 'high-back'
  | 'low-back'
  | 'low';

/** Lip shapes: distance, protrusion and height of the two lip pads. */
export type LipPose = 'open' | 'closed' | 'round' | 'spread' | 'labiodental';

/** Raised velum closes the nasal cavity; a lowered velum opens it. */
export type VelumPose = 'raised' | 'lowered';

export type AirflowLane = 'oral' | 'nasal';

export type ArticulationManner = 'stop' | 'nasal' | 'fricative' | 'approximant' | 'vowel';

export type ArticulationPlace =
  | 'bilabial'
  | 'labiodental'
  | 'dental'
  | 'alveolar'
  | 'postalveolar'
  | 'palatal'
  | 'velar'
  | 'glottal';

/**
 * The stages a sound goes through. A stop is built in phases (approach,
 * closure, release, and — for English voiceless stops — aspiration), while
 * fricatives and vowels simply keep air flowing.
 */
export type ArticulationPhaseId =
  | 'approach'
  | 'closure'
  | 'release'
  | 'aspiration'
  | 'stricture'
  | 'flow';

/** What the airstream does during a phase. */
export type ArticulationAirflow = 'none' | 'rising' | 'blocked' | 'burst' | 'turbulent' | 'free' | 'nasal';

export interface ArticulationPhase {
  id: ArticulationPhaseId;
  label: Localized;
  /** One line on what happens in this phase. */
  detail: Localized;
  /** Relative duration; the studio normalises the weights to its cycle. */
  weight: number;
  airflow: ArticulationAirflow;
}

export interface ArticulationPose {
  tongue: TonguePose;
  lips: LipPose;
  velum: VelumPose;
  airflow: AirflowLane;
}

/**
 * One playable sound for the articulation studio. The studio animates the
 * pose: where the airstream starts, whether the vocal cords vibrate, and which
 * articulators shape the sound.
 */
export interface ArticulationSound {
  id: string;
  /** IPA symbol shown on the chip and in the figure. */
  glyph: string;
  /** Example word that contains the sound. */
  word: Localized;
  manner: ArticulationManner;
  /** Where the stricture is. Omitted for vowels, which `shape` describes. */
  place?: ArticulationPlace;
  /** Vowel description, e.g. “high · front · unrounded”. */
  shape?: Localized;
  voiced: boolean;
  pose: ArticulationPose;
  /** One sentence on how this sound is produced. */
  summary: Localized;
}

/** A run of the cycle, normalised to 0–1. */
export interface ArticulationPhaseWindow {
  phase: ArticulationPhase;
  index: number;
  start: number;
  end: number;
}
