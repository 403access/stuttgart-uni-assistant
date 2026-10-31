import type { ArticulationManner, ArticulationPhase, ArticulationSound } from './types.ts';

import { l } from './content/helpers';

/**
 * The sounds the articulation studio can animate. English examples follow the
 * course material (RP/GA), the German copy mirrors it. Each entry carries the
 * pose the figure animates, so adding a sound is a data-only change.
 */
export const articulationSounds: ArticulationSound[] = [
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
 * Runs of the cycle, normalised to 0–1. The studio keeps the clock at 0–1 and
 * looks up the phase from these windows.
 */
export interface ArticulationPhaseWindow {
  phase: ArticulationPhase;
  index: number;
  start: number;
  end: number;
}

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
