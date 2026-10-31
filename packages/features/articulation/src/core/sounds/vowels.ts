import { l } from '@ua/quiz-content/content/helpers';

import type { ArticulationSound } from '../types';

/** Vowels: the tract stays open and the tongue and lips shape the sound. */
export const vowels: ArticulationSound[] = [
  {
    id: 'i-long',
    glyph: 'iː',
    word: l('see', 'see'),
    manner: 'vowel',
    shape: l('hoch · vorne · ungerundet', 'high · front · unrounded'),
    voiced: true,
    pose: { tongue: 'high-front', lips: 'spread', velum: 'raised', airflow: 'oral' },
    summary: l(
      'Der Zungenrücken ist hoch und weit vorne, die Lippen sind gespreizt. Der Mundraum bleibt oben eng, der Laut ist lang.',
      'The tongue body is high and far forward, the lips are spread. The oral cavity stays narrow at the top and the vowel is long.',
    ),
  },
  {
    id: 'i-short',
    glyph: 'ɪ',
    word: l('sit', 'sit'),
    manner: 'vowel',
    shape: l('fast hoch · vorne · ungerundet', 'near-high · front · unrounded'),
    voiced: true,
    pose: { tongue: 'near-high-front', lips: 'spread', velum: 'raised', airflow: 'oral' },
    summary: l(
      'Wie [iː], aber etwas tiefer und kürzer. Vergleiche „see“ [iː] mit „sit“ [ɪ].',
      'Like [iː], but a little lower and shorter. Compare “see” [iː] with “sit” [ɪ].',
    ),
  },
  {
    id: 'ash',
    glyph: 'æ',
    word: l('cat', 'cat'),
    manner: 'vowel',
    shape: l('tief · vorne · ungerundet', 'low · front · unrounded'),
    voiced: true,
    pose: { tongue: 'low-front', lips: 'open', velum: 'raised', airflow: 'oral' },
    summary: l(
      'Die Zunge liegt tief und vorne, der Mund ist weit offen. Ein kurzer, heller Vokal.',
      'The tongue sits low and forward and the mouth is wide open. A short, bright vowel.',
    ),
  },
  {
    id: 'car',
    glyph: 'ɑː',
    word: l('car', 'car'),
    manner: 'vowel',
    shape: l('tief · hinten · ungerundet', 'low · back · unrounded'),
    voiced: true,
    pose: { tongue: 'low-back', lips: 'open', velum: 'raised', airflow: 'oral' },
    summary: l(
      'Die Zunge liegt tief und weit hinten, die Lippen bleiben ungerundet. Der Vokal ist lang.',
      'The tongue sits low and far back while the lips stay unrounded. The vowel is long.',
    ),
  },
  {
    id: 'u-long',
    glyph: 'uː',
    word: l('soon', 'soon'),
    manner: 'vowel',
    shape: l('hoch · hinten · gerundet', 'high · back · rounded'),
    voiced: true,
    pose: { tongue: 'high-back', lips: 'round', velum: 'raised', airflow: 'oral' },
    summary: l(
      'Der Zungenrücken ist hoch und hinten, die Lippen sind gerundet und vorgestreckt.',
      'The tongue body is high and back; the lips are rounded and pushed forward.',
    ),
  },
  {
    id: 'schwa',
    glyph: 'ə',
    word: l('about', 'about'),
    manner: 'vowel',
    shape: l('mittel · zentral · ungerundet', 'mid · central · unrounded'),
    voiced: true,
    pose: { tongue: 'mid-central', lips: 'open', velum: 'raised', airflow: 'oral' },
    summary: l(
      'Die Zunge steht entspannt in der Mitte, die Lippen sind neutral. Der häufigste Vokal des Englischen – immer unbetont.',
      'The tongue rests in the middle and the lips are neutral. The most common English vowel – always unstressed.',
    ),
  },
];
