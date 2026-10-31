import { l } from '@ua/quiz-content/content/helpers';

import type { ArticulationSound } from '../types';

/** Approximants: the articulators come close without touching. */
export const approximants: ArticulationSound[] = [
  {
    id: 'l',
    glyph: 'l',
    word: l('lip', 'lip'),
    manner: 'approximant',
    place: 'alveolar',
    voiced: true,
    pose: { tongue: 'alveolar', lips: 'open', velum: 'raised', airflow: 'oral' },
    summary: l(
      'Die Zungenspitze berührt den Zahndamm, die Luft strömt seitlich an der Zunge vorbei. Ein lateraler Approximant.',
      'The tongue tip touches the alveolar ridge and air flows around the sides of the tongue: a lateral approximant.',
    ),
  },
  {
    id: 'r',
    glyph: 'ɹ',
    word: l('red', 'red'),
    manner: 'approximant',
    place: 'postalveolar',
    voiced: true,
    pose: { tongue: 'postalveolar', lips: 'open', velum: 'raised', airflow: 'oral' },
    summary: l(
      'Die Zunge nähert sich dem hinteren Zahndamm, ohne ihn zu berühren. Die Luft strömt ohne Reibegeräusch.',
      'The tongue approaches the rear alveolar ridge without touching it. Air flows without turbulence.',
    ),
  },
];
