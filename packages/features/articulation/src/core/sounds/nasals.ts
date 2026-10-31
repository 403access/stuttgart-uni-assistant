import { l } from '@ua/quiz-content/content/helpers';

import type { ArticulationSound } from '../types';

/** Nasals: the mouth is sealed, the velum is lowered, air leaves through the nose. */
export const nasals: ArticulationSound[] = [
  {
    id: 'm',
    glyph: 'm',
    word: l('man', 'man'),
    manner: 'nasal',
    place: 'bilabial',
    voiced: true,
    pose: { tongue: 'rest', lips: 'closed', velum: 'lowered', airflow: 'nasal' },
    summary: l(
      'Die Lippen bleiben geschlossen, das Velum ist gesenkt: Die Luft entweicht durch die Nase, die Stimmlippen schwingen.',
      'The lips stay closed and the velum is lowered: air escapes through the nose while the vocal cords vibrate.',
    ),
  },
  {
    id: 'n',
    glyph: 'n',
    word: l('no', 'no'),
    manner: 'nasal',
    place: 'alveolar',
    voiced: true,
    pose: { tongue: 'alveolar', lips: 'open', velum: 'lowered', airflow: 'nasal' },
    summary: l(
      'Die Zungenspitze sitzt am Zahndamm, die Luft nimmt den Weg über die Nase, weil das Velum gesenkt ist.',
      'The tongue tip sits at the alveolar ridge; because the velum is lowered, the air takes the nasal route.',
    ),
  },
  {
    id: 'eng',
    glyph: 'ŋ',
    word: l('sing', 'sing'),
    manner: 'nasal',
    place: 'velar',
    voiced: true,
    pose: { tongue: 'velar', lips: 'open', velum: 'lowered', airflow: 'nasal' },
    summary: l(
      'Der Zungenrücken liegt am Velum, das gleichzeitig gesenkt ist. Die Luft strömt durch die Nase.',
      'The back of the tongue rests against the velum, which is lowered at the same time. Air flows through the nose.',
    ),
  },
];
