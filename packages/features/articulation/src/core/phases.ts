import { l } from '@ua/quiz-content/content/helpers';

import type { ArticulationPhase, ArticulationPhaseWindow, ArticulationSound } from './types';

/**
 * How a sound is built. The sets are shared by manner (and, for stops, by
 * voicing), so a new sound inherits the right phases from its classification.
 *
 * Correction worth knowing: during the closure the lungs keep pushing air — it
 * simply cannot escape, which is what builds the pressure. The sound appears at
 * the release, and English voiceless stops add a short aspiration before the
 * voicing of the next sound starts.
 */
const APPROACH: ArticulationPhase = {
  id: 'approach',
  label: l('Annäherung', 'Approach'),
  detail: l(
    'Zunge und Lippen wandern in die Zielposition. Die Luft steigt aus der Lunge, ist aber noch nicht hörbar.',
    'Tongue and lips move into position. Air rises from the lungs but is not audible yet.',
  ),
  weight: 1.1,
  airflow: 'rising',
};

const CLOSURE: ArticulationPhase = {
  id: 'closure',
  label: l('Verschluss', 'Closure'),
  detail: l(
    'Der Verschluss ist dicht. Die Lunge drückt weiter Luft nach, sie kann aber nicht entweichen: Der Druck steigt.',
    'The seal is complete. The lungs keep pushing air, but it cannot escape, so the pressure rises.',
  ),
  weight: 1.3,
  airflow: 'blocked',
};

const NASAL_CLOSURE: ArticulationPhase = {
  id: 'closure',
  label: l('Verschluss', 'Closure'),
  detail: l(
    'Der Mund ist dicht, das Velum aber gesenkt: Die Luft entweicht durch die Nase.',
    'The mouth is sealed, but the velum is lowered: air escapes through the nose.',
  ),
  weight: 1.7,
  airflow: 'nasal',
};

const RELEASE: ArticulationPhase = {
  id: 'release',
  label: l('Lösung', 'Release'),
  detail: l(
    'Der Verschluss öffnet sich, die gestaute Luft entweicht in einem kurzen Knall.',
    'The seal opens and the compressed air escapes in a short burst.',
  ),
  weight: 0.7,
  airflow: 'burst',
};

const ASPIRATION: ArticulationPhase = {
  id: 'aspiration',
  label: l('Behauchung', 'Aspiration'),
  detail: l(
    'Die Stimmlippen sind noch offen: Ein Hauch strömt nach, bevor die Stimme des nächsten Lauts einsetzt.',
    'The vocal cords are still apart: a puff of air follows before the next sound starts voicing.',
  ),
  weight: 1,
  airflow: 'free',
};

const STRICTURE: ArticulationPhase = {
  id: 'stricture',
  label: l('Enge', 'Stricture'),
  detail: l(
    'Die Luft strömt durch eine enge Spalte und wird turbulent — das Reibegeräusch entsteht.',
    'Air passes a narrow gap and becomes turbulent — that is the friction noise.',
  ),
  weight: 1.8,
  airflow: 'turbulent',
};

const APPROXIMANT_STRICTURE: ArticulationPhase = {
  id: 'stricture',
  label: l('Enge', 'Stricture'),
  detail: l(
    'Die Zunge nähert sich, ohne zu berühren. Die Luft strömt glatt hindurch, ohne Reibegeräusch.',
    'The tongue comes close without touching. Air flows smoothly, without friction noise.',
  ),
  weight: 1.7,
  airflow: 'free',
};

const FLOW: ArticulationPhase = {
  id: 'flow',
  label: l('Strömung', 'Flow'),
  detail: l(
    'Der Mundraum ist offen, die Luft strömt frei. Nur Zungenlage und Lippenrundung formen den Klang.',
    'The mouth is open and air flows freely. Only tongue position and lip rounding shape the sound.',
  ),
  weight: 2.4,
  airflow: 'free',
};

/** The phases of one sound, in order. */
export function articulationPhases(sound: ArticulationSound): ArticulationPhase[] {
  switch (sound.manner) {
    case 'stop':
      return sound.voiced ? [APPROACH, CLOSURE, RELEASE] : [APPROACH, CLOSURE, RELEASE, ASPIRATION];
    case 'nasal':
      return [APPROACH, NASAL_CLOSURE, RELEASE];
    case 'fricative':
      return [APPROACH, STRICTURE, RELEASE];
    case 'approximant':
      return [APPROACH, APPROXIMANT_STRICTURE, RELEASE];
    case 'vowel':
      return [FLOW];
  }
}

/**
 * Runs of the cycle, normalised to 0–1. The studio keeps its clock at 0–1 and
 * looks the phase up from these windows.
 */
export function articulationPhaseWindows(sound: ArticulationSound): ArticulationPhaseWindow[] {
  const phases = articulationPhases(sound);
  const total = phases.reduce((sum, phase) => sum + phase.weight, 0);
  let cursor = 0;
  return phases.map((phase, index) => {
    const start = cursor / total;
    cursor += phase.weight;
    return { phase, index, start, end: cursor / total };
  });
}
