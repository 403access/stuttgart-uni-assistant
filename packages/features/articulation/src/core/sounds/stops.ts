import { l } from '@ua/quiz-content/content/helpers';

import type { ArticulationSound } from '../types';

/** Stops: the air is sealed off and released in a burst. */
export const stops: ArticulationSound[] = [
  {
    id: 'p',
    glyph: 'p',
    word: l('pin', 'pin'),
    manner: 'stop',
    place: 'bilabial',
    voiced: false,
    pose: { tongue: 'rest', lips: 'closed', velum: 'raised', airflow: 'oral' },
    summary: l(
      'Die Lippen schließen sich, die Luft staut sich dahinter und entweicht danach in einem kleinen Knall. Die Stimmlippen bleiben offen.',
      'The lips close, air builds up behind them and escapes in a small burst. The vocal cords stay apart.',
    ),
  },
  {
    id: 'b',
    glyph: 'b',
    word: l('bin', 'bin'),
    manner: 'stop',
    place: 'bilabial',
    voiced: true,
    pose: { tongue: 'rest', lips: 'closed', velum: 'raised', airflow: 'oral' },
    summary: l(
      'Wie [p], aber die Stimmlippen schwingen schon während des Verschlusses. Der Knall ist deshalb weicher.',
      'Like [p], but the vocal cords vibrate during the closure, which makes the release sound softer.',
    ),
  },
  {
    id: 't',
    glyph: 't',
    word: l('top', 'top'),
    manner: 'stop',
    place: 'alveolar',
    voiced: false,
    pose: { tongue: 'alveolar', lips: 'open', velum: 'raised', airflow: 'oral' },
    summary: l(
      'Die Zungenspitze verschließt den Zahndamm. Die gestaute Luft wird plötzlich freigegeben – stimmlos, ohne Schwingung der Stimmlippen.',
      'The tongue tip closes against the alveolar ridge. The trapped air is released suddenly – voiceless, without vocal-cord vibration.',
    ),
  },
  {
    id: 'd',
    glyph: 'd',
    word: l('dog', 'dog'),
    manner: 'stop',
    place: 'alveolar',
    voiced: true,
    pose: { tongue: 'alveolar', lips: 'open', velum: 'raised', airflow: 'oral' },
    summary: l(
      'Wie [t], aber die Stimmlippen schwingen mit. Der Verschluss am Zahndamm bleibt gleich.',
      'Like [t], but the vocal cords vibrate. The closure at the alveolar ridge is the same.',
    ),
  },
  {
    id: 'k',
    glyph: 'k',
    word: l('cat', 'cat'),
    manner: 'stop',
    place: 'velar',
    voiced: false,
    pose: { tongue: 'velar', lips: 'open', velum: 'raised', airflow: 'oral' },
    summary: l(
      'Der Zungenrücken verschließt den weichen Gaumen weit hinten im Mund. Danach folgt die plötzliche Freigabe.',
      'The back of the tongue closes against the soft palate far back in the mouth, followed by a sudden release.',
    ),
  },
  {
    id: 'g',
    glyph: 'g',
    word: l('gap', 'gap'),
    manner: 'stop',
    place: 'velar',
    voiced: true,
    pose: { tongue: 'velar', lips: 'open', velum: 'raised', airflow: 'oral' },
    summary: l(
      'Wie [k], aber mit schwingenden Stimmlippen. Der Verschluss liegt hinten am Velum.',
      'Like [k], but with vibrating vocal cords. The closure sits far back at the velum.',
    ),
  },
];
