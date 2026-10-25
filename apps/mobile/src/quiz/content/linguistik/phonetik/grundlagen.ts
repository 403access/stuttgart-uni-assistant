import type { QuizTopic } from '@/src/quiz/types';

import { l } from '../../helpers';

/**
 * Phonetics vs. phonology, the three systems of speech production, airstream
 * mechanisms and the classification of consonants and vowels. Content follows
 * the lecture slides (BPP, session 1).
 */
export const bppGrundlagen: QuizTopic = {
  id: 'bpp-grundlagen',
  title: l('Phonetik & Phonologie: Grundlagen', 'Phonetics & phonology: basics'),
  meeting: l('Sitzung 1 · 15.10.2026', 'Session 1 · 15 Oct 2026'),
  summary: l(
    'Definitionen, die drei Teilsysteme der Sprachproduktion, Luftstrommechanismen, Stimmhaftigkeit, Artikulationsart und -ort sowie Vokale und Konsonanten.',
    'Definitions, the three subsystems of speech production, airstream mechanisms, voicing, manner and place of articulation, and vowels versus consonants.',
  ),
  source: l(
    'Basic Phonetics and Phonology · Dr. Yulia Zuban · Universität Stuttgart',
    'Basic Phonetics and Phonology · Dr. Yulia Zuban · University of Stuttgart',
  ),
  questions: [
    {
      id: 'bpp-single-phonetics',
      kind: 'single',
      difficulty: 1,
      prompt: l('Was ist Phonetik?', 'What is phonetics?'),
      options: [
        {
          id: 'a',
          label: l(
            'Die wissenschaftliche Untersuchung der physikalischen Aspekte von Sprachlauten',
            'The scientific study of the physical aspects of speech sounds',
          ),
        },
        {
          id: 'b',
          label: l(
            'Die Untersuchung, wie Laute in einer Einzelsprache organisiert sind',
            'The study of how sounds are organized in an individual language',
          ),
        },
        { id: 'c', label: l('Die Lehre von der Satzstruktur', 'The study of sentence structure') },
        { id: 'd', label: l('Die Geschichte der Schriftsprache', 'The history of written language') },
      ],
      correctId: 'a',
      explanation: l(
        'Phonetik = wissenschaftliche, empirische Untersuchung der physikalischen Laute. Phonologie = Organisation der Laute im System einer Sprache.',
        'Phonetics = scientific, empirical study of physical sounds. Phonology = how sounds are organized in a language system.',
      ),
    },
    {
      id: 'bpp-single-phonology',
      kind: 'single',
      difficulty: 2,
      prompt: l('Was untersucht die Phonologie?', 'What does phonology study?'),
      options: [
        {
          id: 'a',
          label: l(
            'Wie Sprachlaute in einer Einzelsprache zu Mustern und Systemen organisiert sind',
            'How speech sounds are organized into patterns and systems in an individual language',
          ),
        },
        { id: 'b', label: l('Die Physik des Schalls', 'The physics of sound') },
        { id: 'c', label: l('Die Anatomie des Kehlkopfs', 'The anatomy of the larynx') },
        { id: 'd', label: l('Die Schreibung von Wörtern', 'The spelling of words') },
      ],
      correctId: 'a',
      explanation: l(
        'Phonologie fragt, wie Laute kombiniert werden, in welcher Beziehung sie stehen und wie sie sich gegenseitig beeinflussen.',
        'Phonology asks how sounds combine, how they relate to each other and how they affect one another.',
      ),
    },
    {
      id: 'bpp-multiple-branches',
      kind: 'multiple',
      difficulty: 1,
      prompt: l('Welche drei Teildisziplinen der Phonetik nennt die Sitzung?', 'Which three branches of phonetics does the session name?'),
      options: [
        { id: 'articulatory', label: l('Artikulatorische Phonetik', 'Articulatory phonetics') },
        { id: 'auditory', label: l('Auditive Phonetik', 'Auditory phonetics') },
        { id: 'acoustic', label: l('Akustische Phonetik', 'Acoustic phonetics') },
        { id: 'historical', label: l('Historische Phonetik', 'Historical phonetics') },
        { id: 'social', label: l('Soziale Phonetik', 'Social phonetics') },
      ],
      correctIds: ['articulatory', 'auditory', 'acoustic'],
      explanation: l(
        'Artikulatorisch = Produktion, auditiv = Wahrnehmung, akustisch = Physik des Schalls.',
        'Articulatory = production, auditory = perception, acoustic = the physics of sound.',
      ),
    },
    {
      id: 'bpp-matching-systems',
      kind: 'matching',
      difficulty: 2,
      prompt: l('Ordne die drei Systeme ihrer Aufgabe zu.', 'Match the three systems with their job.'),
      pairs: [
        {
          id: 'respiratory',
          left: l('Respiratorisches System', 'Respiratory system'),
          right: l('erzeugt den Luftstrom', 'produces the airstream'),
        },
        {
          id: 'phonatory',
          left: l('Phonatorisches System', 'Phonatory system'),
          right: l('erzeugt die Stimme', 'produces voice'),
        },
        {
          id: 'articulatory',
          left: l('Artikulatorisches System', 'Articulatory system'),
          right: l('formt die Laute', 'shapes the speech sounds'),
        },
      ],
      explanation: l(
        'Atmung → Luftstrom, Kehlkopf → Stimme, Vokaltrakt → Formung der Laute.',
        'Breathing → airstream, larynx → voice, vocal tract → shaping of sounds.',
      ),
    },
    {
      id: 'bpp-tf-segmental',
      kind: 'true-false',
      difficulty: 2,
      prompt: l(
        'Die segmentale Phonologie befasst sich mit Silben, Wörtern und Intonationsphrasen.',
        'Segmental phonology deals with syllables, words and intonation phrases.',
      ),
      correct: false,
      explanation: l(
        'Segmental = einzelne Laute. Suprasegmental = größere Einheiten wie Silben, Wörter und Intonationsphrasen.',
        'Segmental = individual sounds. Suprasegmental = larger units such as syllables, words and intonation phrases.',
      ),
    },
    {
      id: 'bpp-single-airstream',
      kind: 'single',
      difficulty: 1,
      prompt: l(
        'Wie heißt der Luftstrom, der aus der Lunge kommt und durch Mund und Nase entweicht?',
        'What is the airstream called that comes from the lungs and escapes through mouth and nose?',
      ),
      options: [
        { id: 'a', label: l('Pulmonal-egressiv', 'Egressive pulmonic') },
        { id: 'b', label: l('Glottal-egressiv', 'Egressive glottalic') },
        { id: 'c', label: l('Pulmonal-ingressiv', 'Ingressive pulmonic') },
        { id: 'd', label: l('Velar-ingressiv', 'Ingressive velaric') },
      ],
      correctId: 'a',
      explanation: l(
        'Pulmonal = aus der Lunge, egressiv = nach außen. Alle menschlichen Sprachen nutzen ihn; im Englischen ist er der einzige.',
        'Pulmonic = from the lungs, egressive = outward. All human languages use it; in English it is the only one.',
      ),
    },
    {
      id: 'bpp-tf-pulmonic',
      kind: 'true-false',
      difficulty: 2,
      prompt: l(
        'Der pulmonal-egressive Luftstrom kommt in allen menschlichen Sprachen vor und ist im Englischen der einzige.',
        'The egressive pulmonic airstream occurs in all human languages and is the only one used in English.',
      ),
      correct: true,
      explanation: l(
        'Genau so in der Sitzung: „All human languages involve this type of airstream mechanism and for many languages (English included) it is the only mechanism employed“.',
        'Exactly as in the session: “All human languages involve this type of airstream mechanism and for many languages (English included) it is the only mechanism employed”.',
      ),
    },
    {
      id: 'bpp-single-hausa',
      kind: 'single',
      difficulty: 3,
      prompt: l(
        'Welcher Luftstrommechanismus wird unter anderem im Hausa verwendet?',
        'Which airstream mechanism is used in Hausa, among others?',
      ),
      options: [
        { id: 'a', label: l('Pulmonal-egressiv', 'Egressive pulmonic') },
        { id: 'b', label: l('Glottal-egressiv', 'Egressive glottalic') },
        { id: 'c', label: l('Ingressiv', 'Ingressive') },
        { id: 'd', label: l('Pulmonal-ingressiv', 'Ingressive pulmonic') },
      ],
      correctId: 'b',
      explanation: l(
        'Im Hausa (Nigeria, Sudan, Kamerun) wird der glottal-egressive Luftstrom verwendet: Die Luft kommt nicht aus der Lunge, sondern weiter oben am Kehlkopf.',
        'Hausa (Nigeria, Sudan, Cameroon) uses the egressive glottalic airstream: air does not come from the lungs but from further up at the larynx.',
      ),
    },
    {
      id: 'bpp-single-voiced',
      kind: 'single',
      difficulty: 1,
      prompt: l('Wie entstehen stimmhafte Laute?', 'How are voiced sounds produced?'),
      options: [
        {
          id: 'a',
          label: l(
            'Die Stimmlippen liegen zusammen, die Luft bringt sie zum Schwingen',
            'The vocal cords are together and the air makes them vibrate',
          ),
        },
        {
          id: 'b',
          label: l(
            'Die Stimmlippen liegen auseinander und vibrieren nicht',
            'The vocal cords are apart and do not vibrate',
          ),
        },
        { id: 'c', label: l('Das Velum ist gesenkt', 'The velum is lowered') },
        { id: 'd', label: l('Die Zunge berührt den Zahndamm', 'The tongue touches the alveolar ridge') },
      ],
      correctId: 'a',
      explanation: l(
        'Stimmhaft = Stimmlippen zusammen, Luftdruck lässt sie vibrieren (z. B. [a], [d], [b]). Stimmlos = Stimmlippen auseinander (z. B. [p], [s], [t]).',
        'Voiced = vocal cords together, air pressure makes them vibrate (e.g. [a], [d], [b]). Voiceless = vocal cords apart (e.g. [p], [s], [t]).',
      ),
    },
    {
      id: 'bpp-tf-voiceless',
      kind: 'true-false',
      difficulty: 1,
      prompt: l(
        'Bei stimmlosen Lauten liegen die Stimmlippen auseinander und vibrieren nicht.',
        'With voiceless sounds the vocal cords are apart and do not vibrate.',
      ),
      correct: true,
      explanation: l(
        'Die Luft kann ungehindert durch die Glottis strömen, z. B. bei [p], [s] und [t].',
        'Air can pass through the glottis unhindered, as in [p], [s] and [t].',
      ),
    },
    {
      id: 'bpp-single-glottis',
      kind: 'single',
      difficulty: 2,
      prompt: l('Was ist die Glottis?', 'What is the glottis?'),
      options: [
        { id: 'a', label: l('Der Raum zwischen den Stimmlippen', 'The space between the vocal cords') },
        { id: 'b', label: l('Der weiche Gaumen', 'The soft palate') },
        { id: 'c', label: l('Der Wulst hinter den Zähnen', 'The ridge behind the teeth') },
        { id: 'd', label: l('Der oberste Knorpelring der Luftröhre', 'The top cartilage ring of the trachea') },
      ],
      correctId: 'a',
      explanation: l(
        'Wenn die Stimmlippen auseinanderliegen, öffnet sich zwischen ihnen die Glottis. Der glottale Verschlusslaut ist [ʔ].',
        'When the vocal cords are apart, the glottis opens between them. The glottal stop is [ʔ].',
      ),
    },
    {
      id: 'bpp-single-manner',
      kind: 'single',
      difficulty: 2,
      prompt: l('Was beschreibt die Artikulationsart (manner of articulation)?', 'What does manner of articulation describe?'),
      options: [
        {
          id: 'a',
          label: l(
            'Die vertikale Beziehung zwischen aktivem und passivem Artikulator (die Enge)',
            'The vertical relationship between active and passive articulators (the stricture)',
          ),
        },
        {
          id: 'b',
          label: l(
            'Die horizontale Beziehung zwischen aktivem und passivem Artikulator',
            'The horizontal relationship between active and passive articulators',
          ),
        },
        { id: 'c', label: l('Die Stellung der Stimmlippen', 'The position of the vocal cords') },
        { id: 'd', label: l('Die Form der Lippen', 'The shape of the lips') },
      ],
      correctId: 'a',
      explanation: l(
        'Manner = vertikal (Abstand/Enge), Place = horizontal (höchster Punkt des aktiven Artikulators).',
        'Manner = vertical (distance/stricture), place = horizontal (highest point of the active articulator).',
      ),
    },
    {
      id: 'bpp-single-place',
      kind: 'single',
      difficulty: 2,
      prompt: l('Was beschreibt der Artikulationsort (place of articulation)?', 'What does place of articulation describe?'),
      options: [
        {
          id: 'a',
          label: l(
            'Die horizontale Beziehung der Artikulatoren zueinander',
            'The horizontal relationship of the articulators to each other',
          ),
        },
        { id: 'b', label: l('Die Menge des Luftstroms', 'The amount of airflow') },
        { id: 'c', label: l('Die Schwingung der Stimmlippen', 'The vibration of the vocal cords') },
        { id: 'd', label: l('Die Dauer eines Lauts', 'The duration of a sound') },
      ],
      correctId: 'a',
      explanation: l(
        'Der Ort ist die Position des höchsten Punkts des aktiven Artikulators relativ zum passiven Artikulator.',
        'Place is the position of the highest point of the active articulator relative to the passive articulator.',
      ),
    },
    {
      id: 'bpp-matching-manner',
      kind: 'matching',
      difficulty: 2,
      prompt: l('Ordne die Artikulationsarten ihren Beschreibungen zu.', 'Match the manners of articulation with their descriptions.'),
      pairs: [
        {
          id: 'stop',
          left: l('Plosiv (stop)', 'Stop'),
          right: l('vollständiger Verschluss, dann plötzliche Freigabe', 'complete closure, then sudden release'),
        },
        {
          id: 'fricative',
          left: l('Frikativ', 'Fricative'),
          right: l('enge Spalte, Luft erzeugt Turbulenz', 'narrow gap, air causes turbulence'),
        },
        {
          id: 'nasal',
          left: l('Nasal', 'Nasal stop'),
          right: l('gesenktes Velum, Luft durch die Nase', 'lowered velum, air through the nose'),
        },
      ],
      explanation: l(
        'Plosiv = kompletter Verschluss, Frikativ = Enge ohne Verschluss, Nasal = gesenktes Velum.',
        'Stop = complete closure, fricative = narrow gap without closure, nasal = lowered velum.',
      ),
    },
    {
      id: 'bpp-single-pig',
      kind: 'single',
      difficulty: 2,
      prompt: l('Wie klassifiziert man den ersten Laut in „pig“?', 'How do you classify the first sound in “pig”?'),
      options: [
        { id: 'a', label: l('Stimmloser bilabialer Plosiv', 'Voiceless bilabial stop') },
        { id: 'b', label: l('Stimmhafter bilabialer Plosiv', 'Voiced bilabial stop') },
        { id: 'c', label: l('Stimmloser alveolarer Frikativ', 'Voiceless alveolar fricative') },
        { id: 'd', label: l('Stimmhafter velarer Nasal', 'Voiced velar nasal') },
      ],
      correctId: 'a',
      explanation: l(
        'Die Dreiteilung lautet: stimmlos (voicing) + bilabial (place) + Plosiv (manner).',
        'The three-term classification is: voiceless (voicing) + bilabial (place) + stop (manner).',
      ),
    },
    {
      id: 'bpp-multiple-vowels',
      kind: 'multiple',
      difficulty: 2,
      prompt: l('Welche Merkmale sind für die Beschreibung von Vokalen relevant?', 'Which features are relevant for describing vowels?'),
      options: [
        { id: 'height', label: l('Zungenhöhe (hoch – mittel – tief)', 'Tongue height (high – mid – low)') },
        { id: 'front', label: l('Zungenlage vorne – hinten', 'Tongue position front – back') },
        { id: 'round', label: l('Lippenrundung', 'Lip rounding') },
        { id: 'voice', label: l('Stimmhaftigkeit', 'Voicing') },
        { id: 'velum', label: l('Stellung des Velums', 'Position of the velum') },
      ],
      correctIds: ['height', 'front', 'round'],
      explanation: l(
        'Vokale sind normalerweise stimmhaft; Stimmhaftigkeit und Velumstellung sind für ihre Klassifikation nicht ausschlaggebend. Relevant sind Höhe, Vorne/Hinten und Lippenrundung.',
        'Vowels are usually voiced; voicing and velum position are not decisive for their classification. Height, frontness/backness and lip rounding are.',
      ),
    },
    {
      id: 'bpp-single-see-vowel',
      kind: 'single',
      difficulty: 2,
      prompt: l('Wie beschreibt man den Vokal in „see“?', 'How is the vowel in “see” described?'),
      options: [
        { id: 'a', label: l('Hoch, vorne, ungerundet', 'High, front, unrounded') },
        { id: 'b', label: l('Tief, hinten, gerundet', 'Low, back, rounded') },
        { id: 'c', label: l('Mittel, zentral, gerundet', 'Mid, central, rounded') },
        { id: 'd', label: l('Tief, vorne, ungerundet', 'Low, front, unrounded') },
      ],
      correctId: 'a',
      explanation: l(
        '„See“ ist hoch (hohe Zungenposition), vorne und ungerundet – im IPA [iː].',
        '“See” is high (high tongue position), front and unrounded – [iː] in the IPA.',
      ),
    },
    {
      id: 'bpp-tf-spelling',
      kind: 'true-false',
      difficulty: 1,
      prompt: l('Die englische Schreibung gibt die Aussprache immer eindeutig wieder.', 'English spelling always represents pronunciation unambiguously.'),
      correct: false,
      explanation: l(
        'Nein: „heart“, „hear“ und „heard“ werden unterschiedlich gesprochen, obwohl sie ähnlich geschrieben werden. Deshalb braucht man eine phonetische Transkription.',
        'No: “heart”, “hear” and “heard” are pronounced differently although they are spelled similarly. That is why phonetic transcription is needed.',
      ),
    },
    {
      id: 'bpp-single-varieties',
      kind: 'single',
      difficulty: 2,
      prompt: l('Auf welche zwei Standardvarietäten des Englischen konzentriert sich der Kurs?', 'Which two standard varieties of English does the course focus on?'),
      options: [
        {
          id: 'a',
          label: l(
            'Received Pronunciation (RP) und General American (GA)',
            'Received Pronunciation (RP) and General American (GA)',
          ),
        },
        { id: 'b', label: l('Scots und Irish English', 'Scots and Irish English') },
        { id: 'c', label: l('Australian und New Zealand English', 'Australian and New Zealand English') },
        { id: 'd', label: l('Indian und Nigerian English', 'Indian and Nigerian English') },
      ],
      correctId: 'a',
      explanation: l(
        'RP ist die britische, GA die amerikanische Standardvarietät mit dem höchsten Prestige.',
        'RP is the British standard variety, GA the American one, both with the highest prestige.',
      ),
    },
    {
      id: 'bpp-single-enough',
      kind: 'single',
      difficulty: 2,
      prompt: l('Wie viele Vokale und Konsonanten hat „enough“?', 'How many vowels and consonants does “enough” have?'),
      options: [
        { id: 'a', label: l('2 Vokale, 2 Konsonanten', '2 vowels, 2 consonants') },
        { id: 'b', label: l('3 Vokale, 2 Konsonanten', '3 vowels, 2 consonants') },
        { id: 'c', label: l('2 Vokale, 3 Konsonanten', '2 vowels, 3 consonants') },
        { id: 'd', label: l('1 Vokal, 3 Konsonanten', '1 vowel, 3 consonants') },
      ],
      correctId: 'a',
      explanation: l(
        'Schreibung ≠ Lautung: „enough“ wird [ɪˈnʌf] gesprochen, also V C V C: 2 Vokale und 2 Konsonanten.',
        'Spelling ≠ speech: “enough” is [ɪˈnʌf], i.e. V C V C: 2 vowels and 2 consonants.',
      ),
    },
    {
      id: 'bpp-cloze-through',
      kind: 'cloze',
      difficulty: 3,
      prompt: l('Transkribiere „through“ in CVC-Notation.', 'Transcribe “through” in CVC notation.'),
      segments: [
        { type: 'text', value: l('through = ', 'through = ') },
        { type: 'blank', accepted: ['CCV'], width: 90 },
      ],
      explanation: l(
        '„through“ wird [θruː] gesprochen: zwei Konsonanten ([θ], [r]) + ein Vokal ([uː]) = CCV.',
        '“through” is [θruː]: two consonants ([θ], [r]) + one vowel ([uː]) = CCV.',
      ),
    },
    {
      id: 'bpp-single-spaghetti',
      kind: 'single',
      difficulty: 2,
      prompt: l('Wie viele Vokale und Konsonanten hat „spaghetti“?', 'How many vowels and consonants does “spaghetti” have?'),
      options: [
        { id: 'a', label: l('3 Vokale, 4 Konsonanten', '3 vowels, 4 consonants') },
        { id: 'b', label: l('4 Vokale, 3 Konsonanten', '4 vowels, 3 consonants') },
        { id: 'c', label: l('3 Vokale, 5 Konsonanten', '3 vowels, 5 consonants') },
        { id: 'd', label: l('2 Vokale, 4 Konsonanten', '2 vowels, 4 consonants') },
      ],
      correctId: 'a',
      explanation: l(
        '„spaghetti“ wird [spəˈɡeti] gesprochen: 4 Konsonanten (s, p, g, t) und 3 Vokale (ə, e, i).',
        '“spaghetti” is [spəˈɡeti]: 4 consonants (s, p, g, t) and 3 vowels (ə, e, i).',
      ),
    },
    {
      id: 'bpp-tf-letter-s',
      kind: 'true-false',
      difficulty: 1,
      prompt: l(
        'Der Buchstabe „s“ wird im Englischen immer gleich ausgesprochen.',
        'The letter “s” is always pronounced the same way in English.',
      ),
      correct: false,
      explanation: l(
        'Je nach Kontext klingt „s“ verschieden: „house“ [s], „measure“ [ʒ], „shape“ [ʃ].',
        'Depending on context, “s” sounds different: “house” [s], “measure” [ʒ], “shape” [ʃ].',
      ),
    },
    {
      id: 'bpp-tf-one-pronunciation',
      kind: 'true-false',
      difficulty: 2,
      prompt: l(
        'Jedes Wort hat nur eine einzige korrekte Aussprache.',
        'Every word has only one correct pronunciation.',
      ),
      correct: false,
      explanation: l(
        'Es gibt regionale Varianten, und dieselbe Sprecherin spricht dasselbe Wort je nach Kontext unterschiedlich aus (neue vs. gegebene Information).',
        'There are regional variants, and the same speaker pronounces a word differently depending on context (new vs. given information).',
      ),
    },
    {
      id: 'bpp-tf-rhotics',
      kind: 'true-false',
      difficulty: 2,
      prompt: l(
        'Manche Laute sind objektiv schwerer zu artikulieren als andere, zum Beispiel Rhotiks.',
        'Some sounds are objectively harder to articulate than others, for example rhotics.',
      ),
      correct: true,
      explanation: l(
        'Rhotiks (R-Laute) können schwieriger sein, besonders wenn die Zunge den Gaumen nicht berührt.',
        'Rhotics (r-sounds) can be harder, especially those without contact between the tongue and the palate.',
      ),
    },
    {
      id: 'bpp-card-rhotic',
      kind: 'flashcard',
      difficulty: 3,
      prompt: l('Was ist ein Rhotik?', 'What is a rhotic?'),
      back: l(
        'Ein R-Laut, also ein Laut, der oft mit „r“ geschrieben wird. Manche Rhotiks sind schwerer zu artikulieren, besonders wenn die Zunge den Gaumen nicht berührt.',
        'An r-sound, i.e. a sound often written with “r”. Some rhotics are harder to articulate, especially those without contact between the tongue and the palate.',
      ),
    },
    {
      id: 'bpp-card-prescriptive',
      kind: 'flashcard',
      difficulty: 2,
      prompt: l('Was unterscheidet präskriptive Regeln von phonetischer Forschung?', 'What distinguishes prescriptive rules from phonetic research?'),
      back: l(
        'Präskriptive Regeln kommen aus Sprachunterricht und Schreibkonventionen. Phonetik untersucht Lautproduktion und -wahrnehmung empirisch.',
        'Prescriptive rules come from language teaching and writing conventions. Phonetics investigates sound production and perception empirically.',
      ),
    },
  ],
};
