import { l } from '@ua/quiz-content/content/helpers';

import type { ArticulationSound } from '../types';

/** Fricatives: air is forced through a narrow gap and becomes turbulent. */
export const fricatives: ArticulationSound[] = [
  {
    id: 'f',
    glyph: 'f',
    word: l('fan', 'fan'),
    manner: 'fricative',
    place: 'labiodental',
    voiced: false,
    pose: { tongue: 'rest', lips: 'labiodental', velum: 'raised', airflow: 'oral' },
    summary: l(
      'Die Unterlippe liegt an den oberen Schneidezähnen. Durch die enge Spalte strömt Luft und erzeugt ein Reibegeräusch.',
      'The lower lip rests against the upper front teeth. Air hisses through the narrow gap, creating turbulence.',
    ),
  },
  {
    id: 'v',
    glyph: 'v',
    word: l('van', 'van'),
    manner: 'fricative',
    place: 'labiodental',
    voiced: true,
    pose: { tongue: 'rest', lips: 'labiodental', velum: 'raised', airflow: 'oral' },
    summary: l(
      'Wie [f], aber die Stimmlippen schwingen mit. Die Enge zwischen Lippe und Zähnen bleibt bestehen.',
      'Like [f], but the vocal cords vibrate. The stricture between lip and teeth stays the same.',
    ),
  },
  {
    id: 'theta',
    glyph: 'θ',
    word: l('think', 'think'),
    manner: 'fricative',
    place: 'dental',
    voiced: false,
    pose: { tongue: 'dental', lips: 'open', velum: 'raised', airflow: 'oral' },
    summary: l(
      'Die Zungenspitze liegt an den oberen Zähnen. Die Luft reibt zwischen Zunge und Zahnfläche – stimmlos, wie in „think“.',
      'The tongue tip touches the upper teeth. Air rubs between tongue and teeth – voiceless, as in “think”.',
    ),
  },
  {
    id: 'eth',
    glyph: 'ð',
    word: l('this', 'this'),
    manner: 'fricative',
    place: 'dental',
    voiced: true,
    pose: { tongue: 'dental', lips: 'open', velum: 'raised', airflow: 'oral' },
    summary: l(
      'Wie [θ], aber stimmhaft. Vergleiche „think“ [θ] mit „this“ [ð].',
      'Like [θ], but voiced. Compare “think” [θ] with “this” [ð].',
    ),
  },
  {
    id: 's',
    glyph: 's',
    word: l('see', 'see'),
    manner: 'fricative',
    place: 'alveolar',
    voiced: false,
    pose: { tongue: 'alveolar', lips: 'spread', velum: 'raised', airflow: 'oral' },
    summary: l(
      'Die Zungenspitze bildet eine schmale Rinne kurz hinter dem Zahndamm. Die Luft zischt durch die Enge.',
      'The tongue tip forms a narrow groove just behind the alveolar ridge. Air hisses through the gap.',
    ),
  },
  {
    id: 'z',
    glyph: 'z',
    word: l('zoo', 'zoo'),
    manner: 'fricative',
    place: 'alveolar',
    voiced: true,
    pose: { tongue: 'alveolar', lips: 'spread', velum: 'raised', airflow: 'oral' },
    summary: l(
      'Wie [s], aber mit schwingenden Stimmlippen. Die Enge bleibt, der Klang wird weicher.',
      'Like [s], but with vibrating vocal cords. The stricture is the same, the sound grows softer.',
    ),
  },
  {
    id: 'esh',
    glyph: 'ʃ',
    word: l('ship', 'ship'),
    manner: 'fricative',
    place: 'postalveolar',
    voiced: false,
    pose: { tongue: 'postalveolar', lips: 'round', velum: 'raised', airflow: 'oral' },
    summary: l(
      'Zunge und Lippen arbeiten zusammen: Der Zungenrücken liegt weiter hinten, die Lippen sind gerundet.',
      'Tongue and lips work together: the tongue body sits further back and the lips are rounded.',
    ),
  },
];
