import {
  VOWEL_VIEW_BOX,
  ipaVowelFigure,
  ipaVowelRegions,
} from '@/src/quiz/figures/vocal-tract';
import type { QuizTopic } from '@/src/quiz/types';

import { l } from '../../helpers';

/**
 * IPA and transcription: why transcription exists, the brackets, diacritics,
 * stress marks, symbol-to-word matching and CVC notation.
 */
export const bppIpa: QuizTopic = {
  id: 'bpp-ipa',
  title: l('IPA & Transkription', 'IPA & transcription'),
  meeting: l('Sitzung 1 · 15.10.2026', 'Session 1 · 15 Oct 2026'),
  summary: l(
    'Warum eine Lautschrift nötig ist, wie das IPA aufgebaut ist, Diakritika und Betonung – und Übungen zu Symbolen, Vokalviereck und CVC-Notation.',
    'Why a phonetic alphabet is needed, how the IPA is organized, diacritics and stress – plus practice with symbols, the vowel chart and CVC notation.',
  ),
  source: l(
    'Basic Phonetics and Phonology · Dr. Yulia Zuban · Universität Stuttgart',
    'Basic Phonetics and Phonology · Dr. Yulia Zuban · University of Stuttgart',
  ),
  figure: ipaVowelFigure,
  questions: [
    {
      id: 'bpp-single-why-transcription',
      kind: 'single',
      difficulty: 1,
      prompt: l('Warum braucht man eine phonetische Transkription?', 'Why is phonetic transcription needed?'),
      options: [
        {
          id: 'a',
          label: l(
            'Weil Schriftsysteme die gesprochene Sprache nicht eindeutig wiedergeben',
            'Because writing systems do not represent spoken language unambiguously',
          ),
        },
        { id: 'b', label: l('Weil nur Englisch eine Schrift hat', 'Because only English has a writing system') },
        { id: 'c', label: l('Weil Laute in allen Sprachen gleich sind', 'Because sounds are the same in all languages') },
        { id: 'd', label: l('Weil das IPA die Orthografie ersetzen soll', 'Because the IPA is meant to replace orthography') },
      ],
      correctId: 'a',
      explanation: l(
        'Beispiel: „heart“, „hear“ und „heard“ klingen trotz ähnlicher Schreibung verschieden. Auch Dialekte nutzen dieselbe Schrift, klingen aber anders.',
        'Example: “heart”, “hear” and “heard” sound different despite similar spelling. Dialects also share a writing system but sound different.',
      ),
    },
    {
      id: 'bpp-single-ipa-goal',
      kind: 'single',
      difficulty: 1,
      prompt: l('Was ist das Ziel des Internationalen Phonetischen Alphabets (IPA)?', 'What is the goal of the International Phonetic Alphabet (IPA)?'),
      options: [
        {
          id: 'a',
          label: l(
            'Ein Schriftsystem, das alle Sprachlaute aller Sprachen beschreiben kann',
            'One writing system that can describe all speech sounds of all languages',
          ),
        },
        { id: 'b', label: l('Die englische Rechtschreibung zu vereinfachen', 'To simplify English spelling') },
        { id: 'c', label: l('Nur die Laute des Englischen zu notieren', 'To transcribe only English sounds') },
        { id: 'd', label: l('Die Grammatik aller Sprachen zu beschreiben', 'To describe the grammar of all languages') },
      ],
      correctId: 'a',
      explanation: l(
        'Das IPA ist für die Forschung gedacht und soll traditionelle Orthografien nicht ersetzen. Es macht Ähnlichkeiten und Unterschiede zwischen Lautsystemen sichtbar.',
        'The IPA is intended for research and does not aim to replace traditional orthographies. It makes similarities and differences between sound systems visible.',
      ),
    },
    {
      id: 'bpp-tf-ipa-replaces',
      kind: 'true-false',
      difficulty: 1,
      prompt: l('Das IPA soll die traditionellen Orthografien der Sprachen ersetzen.', 'The IPA is meant to replace the traditional orthographies of languages.'),
      correct: false,
      explanation: l(
        'Nein: Das IPA ist für den Forschungsgebrauch gedacht, nicht als Ersatz für die normale Schrift.',
        'No: the IPA is intended for research use, not as a replacement for normal writing.',
      ),
    },
    {
      id: 'bpp-single-brackets',
      kind: 'single',
      difficulty: 1,
      prompt: l('Wofür stehen eckige Klammern [ ]?', 'What do square brackets [ ] indicate?'),
      options: [
        { id: 'a', label: l('Eine phonetische Transkription', 'A phonetic transcription') },
        { id: 'b', label: l('Eine orthografische Schreibung', 'An orthographic spelling') },
        { id: 'c', label: l('Eine Betonung', 'A stress mark') },
        { id: 'd', label: l('Eine Silbengrenze', 'A syllable boundary') },
      ],
      correctId: 'a',
      explanation: l(
        'Phonetische Darstellung: [ ]. Die orthografische Form steht in Anführungszeichen: „dig“ [dɪg], „thing“ [θɪŋ].',
        'Phonetic representation: [ ]. The orthographic form is in quotation marks: “dig” [dɪg], “thing” [θɪŋ].',
      ),
    },
    {
      id: 'bpp-single-diacritic',
      kind: 'single',
      difficulty: 2,
      prompt: l('Was bedeutet das Diakritikum ʰ in [tʰ]?', 'What does the diacritic ʰ in [tʰ] mean?'),
      options: [
        { id: 'a', label: l('Aspiration (behaucht)', 'Aspiration (aspirated)') },
        { id: 'b', label: l('Länge', 'Length') },
        { id: 'c', label: l('Nasalierung', 'Nasalization') },
        { id: 'd', label: l('Primäre Betonung', 'Primary stress') },
      ],
      correctId: 'a',
      explanation: l(
        'ʰ markiert einen aspirierten Laut, z. B. [tʰ] im Englischen „top“.',
        'ʰ marks an aspirated sound, e.g. [tʰ] in English “top”.',
      ),
    },
    {
      id: 'bpp-single-stress',
      kind: 'single',
      difficulty: 1,
      prompt: l('Was markiert das Zeichen ˈ?', 'What does the mark ˈ indicate?'),
      options: [
        { id: 'a', label: l('Primäre Betonung', 'Primary stress') },
        { id: 'b', label: l('Vokallänge', 'Vowel length') },
        { id: 'c', label: l('Eine Lücke im Satz', 'A gap in the sentence') },
        { id: 'd', label: l('Eine alternative Aussprache', 'An alternative pronunciation') },
      ],
      correctId: 'a',
      explanation: l(
        'ˈ steht vor der betonten Silbe, z. B. [ɪˈnʌf] für „enough“.',
        'ˈ stands before the stressed syllable, e.g. [ɪˈnʌf] for “enough”.',
      ),
    },
    {
      id: 'bpp-matching-symbols',
      kind: 'matching',
      difficulty: 2,
      prompt: l('Ordne die IPA-Symbole den Beispielwörtern zu.', 'Match the IPA symbols with the example words.'),
      pairs: [
        { id: 'ih', left: l('ɪ', 'ɪ'), right: l('sit', 'sit') },
        { id: 'theta', left: l('θ', 'θ'), right: l('thing', 'thing') },
        { id: 'eng', left: l('ŋ', 'ŋ'), right: l('sing', 'sing') },
        { id: 'esh', left: l('ʃ', 'ʃ'), right: l('ship', 'ship') },
        { id: 'turned-e', left: l('ə', 'ə'), right: l('about', 'about') },
        { id: 'eth', left: l('ð', 'ð'), right: l('this', 'this') },
      ],
      explanation: l(
        'ɪ = sit, θ = thing, ŋ = sing, ʃ = ship, ə = about, ð = this.',
        'ɪ = sit, θ = thing, ŋ = sing, ʃ = ship, ə = about, ð = this.',
      ),
    },
    {
      id: 'bpp-single-think',
      kind: 'single',
      difficulty: 3,
      prompt: l('Welche Transkription von „think“ ist korrekt?', 'Which transcription of “think” is correct?'),
      options: [
        { id: 'a', label: l('θɪŋk', 'θɪŋk') },
        { id: 'b', label: l('tɪŋk', 'tɪŋk') },
        { id: 'c', label: l('θɪnk', 'θɪnk') },
        { id: 'd', label: l('ðɪŋk', 'ðɪŋk') },
      ],
      correctId: 'a',
      explanation: l(
        '„think“ [θɪŋk]: stimmloses θ, ɪ, velarer Nasal ŋ und k. [ð] wäre stimmhaft wie in „this“.',
        '“think” [θɪŋk]: voiceless θ, ɪ, velar nasal ŋ and k. [ð] would be voiced, as in “this”.',
      ),
    },
    {
      id: 'bpp-multiple-transcriptions',
      kind: 'multiple',
      difficulty: 2,
      prompt: l('Welche Transkriptionen sind korrekt?', 'Which transcriptions are correct?'),
      options: [
        { id: 'a', label: l('„dig“ [dɪg]', '“dig” [dɪg]') },
        { id: 'b', label: l('„thing“ [θɪŋ]', '“thing” [θɪŋ]') },
        { id: 'c', label: l('„thing“ [tɪŋ]', '“thing” [tɪŋ]') },
        { id: 'd', label: l('„dig“ [dɪk]', '“dig” [dɪk]') },
      ],
      correctIds: ['a', 'b'],
      explanation: l(
        'θ ist der stimmlose dental-alveolare Frikativ (nicht [t]); g ist stimmhaft (nicht [k]).',
        'θ is the voiceless dental-alveolar fricative (not [t]); g is voiced (not [k]).',
      ),
    },
    {
      id: 'bpp-diagram-see',
      kind: 'diagram',
      difficulty: 2,
      prompt: l('Tippe im Vokalviereck auf den Vokal in „see“.', 'Tap the vowel in “see” on the vowel chart.'),
      viewBox: VOWEL_VIEW_BOX,
      backdrop: ipaVowelFigure.backdrop,
      regions: ipaVowelRegions,
      correctIds: ['i-long'],
      explanation: l(
        '„see“ enthält [iː]: hoch, vorne, ungerundet.',
        '“see” contains [iː]: high, front, unrounded.',
      ),
    },
    {
      id: 'bpp-diagram-car',
      kind: 'diagram',
      difficulty: 2,
      prompt: l('Tippe im Vokalviereck auf den Vokal in „car“.', 'Tap the vowel in “car” on the vowel chart.'),
      viewBox: VOWEL_VIEW_BOX,
      backdrop: ipaVowelFigure.backdrop,
      regions: ipaVowelRegions,
      correctIds: ['car'],
      explanation: l(
        '„car“ enthält [ɑː]: tief und hinten. Die Zunge liegt unten und weit hinten.',
        '“car” contains [ɑː]: low and back. The tongue is low and far back.',
      ),
    },
    {
      id: 'bpp-diagram-soon',
      kind: 'diagram',
      difficulty: 2,
      prompt: l('Tippe im Vokalviereck auf den Vokal in „soon“.', 'Tap the vowel in “soon” on the vowel chart.'),
      viewBox: VOWEL_VIEW_BOX,
      backdrop: ipaVowelFigure.backdrop,
      regions: ipaVowelRegions,
      correctIds: ['u-long'],
      explanation: l(
        '„soon“ enthält [uː]: hoch, hinten, gerundet.',
        '“soon” contains [uː]: high, back, rounded.',
      ),
    },
    {
      id: 'bpp-single-theta',
      kind: 'single',
      difficulty: 2,
      prompt: l('Welches Symbol steht für den stimmlosen dental-alveolaren Frikativ in „think“?', 'Which symbol represents the voiceless dental-alveolar fricative in “think”?'),
      options: [
        { id: 'a', label: l('θ', 'θ') },
        { id: 'b', label: l('ð', 'ð') },
        { id: 'c', label: l('ʃ', 'ʃ') },
        { id: 'd', label: l('s', 's') },
      ],
      correctId: 'a',
      explanation: l(
        'θ = stimmlos („think“), ð = stimmhaft („this“).',
        'θ = voiceless (“think”), ð = voiced (“this”).',
      ),
    },
    {
      id: 'bpp-multiple-chart',
      kind: 'multiple',
      difficulty: 2,
      prompt: l('Wie ist die IPA-Tabelle für Konsonanten aufgebaut?', 'How is the IPA consonant table organized?'),
      options: [
        { id: 'rows', label: l('Zeilen = Artikulationsart', 'Rows = manner of articulation') },
        { id: 'cols', label: l('Spalten = Artikulationsort', 'Columns = place of articulation') },
        { id: 'voice', label: l('Stimmhaft/stimmlos wird unterschieden', 'Voiced/voiceless is distinguished') },
        { id: 'alphabet', label: l('Die Spalten folgen dem lateinischen Alphabet', 'The columns follow the Latin alphabet') },
      ],
      correctIds: ['rows', 'cols', 'voice'],
      explanation: l(
        'Jede Zeile ist eine Artikulationsart, jede Spalte ein Artikulationsort; stimmhaft und stimmlos stehen nebeneinander.',
        'Each row is a manner, each column a place; voiced and voiceless sounds sit next to each other.',
      ),
    },
    {
      id: 'bpp-cloze-play',
      kind: 'cloze',
      difficulty: 2,
      prompt: l('Transkribiere „play“ in CVC-Notation.', 'Transcribe “play” in CVC notation.'),
      segments: [
        { type: 'text', value: l('play = ', 'play = ') },
        { type: 'blank', accepted: ['CCV'], width: 90 },
      ],
      explanation: l(
        '„play“ [pleɪ] = zwei Konsonanten (p, l) + ein Vokal (eɪ) = CCV.',
        '“play” [pleɪ] = two consonants (p, l) + one vowel (eɪ) = CCV.',
      ),
    },
    {
      id: 'bpp-cloze-aches',
      kind: 'cloze',
      difficulty: 3,
      prompt: l('Transkribiere „aches“ in CVC-Notation.', 'Transcribe “aches” in CVC notation.'),
      segments: [
        { type: 'text', value: l('aches = ', 'aches = ') },
        { type: 'blank', accepted: ['VCC'], width: 90 },
      ],
      explanation: l(
        '„aches“ [eɪks] = ein Vokal (eɪ) + zwei Konsonanten (k, s) = VCC. Das stumme „e“ zählt nicht.',
        '“aches” [eɪks] = one vowel (eɪ) + two consonants (k, s) = VCC. The silent “e” does not count.',
      ),
    },
    {
      id: 'bpp-cloze-unite',
      kind: 'cloze',
      difficulty: 3,
      prompt: l('Transkribiere „unite“ in CVC-Notation.', 'Transcribe “unite” in CVC notation.'),
      segments: [
        { type: 'text', value: l('unite = ', 'unite = ') },
        { type: 'blank', accepted: ['CVCVC'], width: 110 },
      ],
      explanation: l(
        '„unite“ [juːnaɪt] = C (j) + V (uː) + C (n) + V (aɪ) + C (t) = CVCVC.',
        '“unite” [juːnaɪt] = C (j) + V (uː) + C (n) + V (aɪ) + C (t) = CVCVC.',
      ),
    },
    {
      id: 'bpp-single-rabbit',
      kind: 'single',
      difficulty: 2,
      prompt: l('Wie viele Vokale und Konsonanten hat „rabbit“?', 'How many vowels and consonants does “rabbit” have?'),
      options: [
        { id: 'a', label: l('2 Vokale, 3 Konsonanten', '2 vowels, 3 consonants') },
        { id: 'b', label: l('3 Vokale, 2 Konsonanten', '3 vowels, 2 consonants') },
        { id: 'c', label: l('2 Vokale, 4 Konsonanten', '2 vowels, 4 consonants') },
        { id: 'd', label: l('1 Vokal, 3 Konsonanten', '1 vowel, 3 consonants') },
      ],
      correctId: 'a',
      explanation: l(
        '„rabbit“ [ˈɹæbɪt] = CVCVC: 3 Konsonanten (r, b, t) und 2 Vokale (æ, ɪ).',
        '“rabbit” [ˈɹæbɪt] = CVCVC: 3 consonants (r, b, t) and 2 vowels (æ, ɪ).',
      ),
    },
    {
      id: 'bpp-single-length',
      kind: 'single',
      difficulty: 1,
      prompt: l('Was bedeutet das Zeichen ː nach einem Vokal?', 'What does the mark ː after a vowel mean?'),
      options: [
        { id: 'a', label: l('Der Vokal ist lang', 'The vowel is long') },
        { id: 'b', label: l('Der Vokal ist nasal', 'The vowel is nasal') },
        { id: 'c', label: l('Der Vokal ist betont', 'The vowel is stressed') },
        { id: 'd', label: l('Der Vokal ist stimmlos', 'The vowel is voiceless') },
      ],
      correctId: 'a',
      explanation: l(
        'ː markiert Länge, z. B. [iː] in „see“ gegenüber [ɪ] in „sit“.',
        'ː marks length, e.g. [iː] in “see” versus [ɪ] in “sit”.',
      ),
    },
    {
      id: 'bpp-card-brackets',
      kind: 'flashcard',
      difficulty: 3,
      prompt: l('Wofür stehen [ ] und / / in der Transkription?', 'What do [ ] and / / mean in transcription?'),
      back: l(
        '[ ] = phonetische Transkription (konkrete Laute), / / = phonemische Transkription (bedeutungsunterscheidende Einheiten einer Sprache). Die Sitzung führt [ ] ein.',
        '[ ] = phonetic transcription (concrete sounds), / / = phonemic transcription (meaning-distinguishing units of a language). The session introduces [ ].',
      ),
    },
    {
      id: 'bpp-card-why-ipa',
      kind: 'flashcard',
      difficulty: 2,
      prompt: l('Warum ist die englische Orthografie keine zuverlässige Aussprachehilfe?', 'Why is English orthography not a reliable pronunciation guide?'),
      back: l(
        'Ein Buchstabe kann viele Laute haben: „s“ klingt in „house“, „measure“ und „shape“ unterschiedlich. Gleiche Schreibung garantiert keine gleiche Aussprache.',
        'One letter can stand for many sounds: “s” sounds different in “house”, “measure” and “shape”. The same spelling does not guarantee the same pronunciation.',
      ),
    },
  ],
};
