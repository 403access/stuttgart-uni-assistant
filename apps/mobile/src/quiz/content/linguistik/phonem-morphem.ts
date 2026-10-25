import type { QuizTopic } from '@/src/quiz/types';

import { l } from '../helpers';

export const phonemMorphem: QuizTopic = {
  id: 'ling-phonem-morphem',
  title: l('Phonem, Morphem & Wiederholung', 'Phoneme, morphemes & review'),
  meeting: l('1. Sitzung', 'Session 1'),
  summary: l(
    'Die beiden prüfungsrelevanten Definitionen, ihre Abgrenzung und Karteikarten für die wichtigsten Begriffe der Sitzung.',
    'The two exam-relevant definitions, how they differ, and flashcards for the key terms of the session.',
  ),
  source: l(
    'Einführung in die Linguistik (für Linguist/inn/en) · Grundlagen der ersten Sitzung',
    'Introduction to Linguistics · basics from the first session',
  ),
  questions: [
    {
      id: 'ling-phonem-definition',
      kind: 'single',
      difficulty: 1,
      prompt: l(
        'Was ist ein Phonem?',
        'What is a phoneme?',
      ),
      options: [
        {
          id: 'a',
          label: l(
            'Die kleinste bedeutungsunterscheidende Einheit einer Sprache.',
            'The smallest meaning-distinguishing unit of a language.',
          ),
        },
        {
          id: 'b',
          label: l(
            'Die kleinste bedeutungstragende Einheit einer Sprache.',
            'The smallest meaning-bearing unit of a language.',
          ),
        },
        { id: 'c', label: l('Ein ganzer Satz.', 'A complete sentence.') },
        { id: 'd', label: l('Die kleinste Schriftzeicheneinheit.', 'The smallest unit of a writing system.') },
      ],
      correctId: 'a',
      explanation: l(
        'Definition zum Auswendiglernen: Das Phonem ist die kleinste bedeutungsunterscheidende Einheit einer Sprache.',
        'Definition to memorize: a phoneme is the smallest meaning-distinguishing unit of a language.',
      ),
    },
    {
      id: 'ling-morphem-definition',
      kind: 'single',
      difficulty: 1,
      prompt: l('Was ist ein Morphem?', 'What is a morpheme?'),
      options: [
        {
          id: 'a',
          label: l(
            'Die kleinste bedeutungstragende Einheit einer Sprache.',
            'The smallest meaning-bearing unit of a language.',
          ),
        },
        {
          id: 'b',
          label: l(
            'Die kleinste bedeutungsunterscheidende Einheit einer Sprache.',
            'The smallest meaning-distinguishing unit of a language.',
          ),
        },
        { id: 'c', label: l('Eine Lautkombination ohne Bedeutung.', 'A sound combination without meaning.') },
        { id: 'd', label: l('Ein Wort mit mindestens zwei Silben.', 'A word with at least two syllables.') },
      ],
      correctId: 'a',
      explanation: l(
        'Definition zum Auswendiglernen: Das Morphem ist die kleinste bedeutungstragende Einheit einer Sprache.',
        'Definition to memorize: a morpheme is the smallest meaning-bearing unit of a language.',
      ),
    },
    {
      id: 'ling-einheit-unterscheidet',
      kind: 'single',
      difficulty: 2,
      prompt: l(
        'Welche Einheit kann Bedeutung unterscheiden, trägt aber nicht selbst die Bedeutung?',
        'Which unit can distinguish meaning but does not carry meaning itself?',
      ),
      options: [
        { id: 'a', label: l('Das Phonem', 'The phoneme') },
        { id: 'b', label: l('Das Morphem', 'The morpheme') },
        { id: 'c', label: l('Das Lexem', 'The lexeme') },
        { id: 'd', label: l('Die Phrase', 'The phrase') },
      ],
      correctId: 'a',
      explanation: l(
        'Phoneme wie /b/ und /p/ unterscheiden Wörter (Bein/Pein oder Bett/Pett), tragen aber selbst keine Bedeutung. Morpheme tragen Bedeutung.',
        'Phonemes such as /b/ and /p/ distinguish words (bean/pean or bet/pet) but carry no meaning themselves. Morphemes carry meaning.',
      ),
    },
    {
      id: 'ling-tf-phonem-falsch',
      kind: 'true-false',
      difficulty: 1,
      prompt: l(
        'Das Phonem ist die kleinste bedeutungstragende Einheit einer Sprache.',
        'The phoneme is the smallest meaning-bearing unit of a language.',
      ),
      correct: false,
      explanation: l(
        'Das ist die Definition des Morphems. Das Phonem ist bedeutungsunterscheidend, nicht bedeutungstragend.',
        'That is the definition of a morpheme. A phoneme distinguishes meaning; it does not carry it.',
      ),
    },
    {
      id: 'ling-tf-morphem-richtig',
      kind: 'true-false',
      difficulty: 1,
      prompt: l(
        'Das Morphem ist die kleinste bedeutungstragende Einheit einer Sprache.',
        'The morpheme is the smallest meaning-bearing unit of a language.',
      ),
      correct: true,
      explanation: l(
        'Genau so lautet die zweite Definition zum Auswendiglernen.',
        'That is exactly the second definition to memorize.',
      ),
    },
    {
      id: 'ling-tf-phonem-unterscheidet',
      kind: 'true-false',
      difficulty: 2,
      prompt: l(
        'Phoneme können Wörter voneinander unterscheiden.',
        'Phonemes can distinguish words from one another.',
      ),
      correct: true,
      explanation: l(
        'Ein Phonem ist bedeutungsunterscheidend: Der Wechsel eines Phonems kann ein anderes Wort ergeben (z. B. /b/ vs. /p/).',
        'A phoneme distinguishes meaning: swapping one phoneme can produce a different word (e.g. /b/ vs. /p/).',
      ),
    },
    {
      id: 'ling-ft-phonem',
      kind: 'free-text',
      difficulty: 2,
      prompt: l(
        'Wie heißt die kleinste bedeutungsunterscheidende Einheit einer Sprache?',
        'What is the smallest meaning-distinguishing unit of a language called?',
      ),
      accepted: ['Phonem', 'das Phonem', 'Phoneme', 'phoneme'],
      hint: l('Der Begriff beginnt mit „Phon-“.', 'The term begins with “phon-”.'),
      explanation: l(
        'Das Phonem – die kleinste bedeutungsunterscheidende Einheit einer Sprache.',
        'The phoneme – the smallest meaning-distinguishing unit of a language.',
      ),
    },
    {
      id: 'ling-ft-morphem',
      kind: 'free-text',
      difficulty: 2,
      prompt: l(
        'Wie heißt die kleinste bedeutungstragende Einheit einer Sprache?',
        'What is the smallest meaning-bearing unit of a language called?',
      ),
      accepted: ['Morphem', 'das Morphem', 'Morpheme', 'morpheme'],
      hint: l('Der Begriff beginnt mit „Morph-“.', 'The term begins with “morph-”.'),
      explanation: l(
        'Das Morphem – die kleinste bedeutungstragende Einheit einer Sprache.',
        'The morpheme – the smallest meaning-bearing unit of a language.',
      ),
    },
    {
      id: 'ling-match-phonem-morphem',
      kind: 'matching',
      difficulty: 2,
      prompt: l(
        'Ordne den Begriffen ihre Definition zu.',
        'Match each term with its definition.',
      ),
      pairs: [
        {
          id: 'phoneme',
          left: l('Phonem', 'Phoneme'),
          right: l(
            'kleinste bedeutungsunterscheidende Einheit',
            'smallest meaning-distinguishing unit',
          ),
        },
        {
          id: 'morpheme',
          left: l('Morphem', 'Morpheme'),
          right: l(
            'kleinste bedeutungstragende Einheit',
            'smallest meaning-bearing unit',
          ),
        },
      ],
      explanation: l(
        'Phonem = bedeutungsunterscheidend, Morphem = bedeutungstragend.',
        'Phoneme = meaning-distinguishing, morpheme = meaning-bearing.',
      ),
    },
    {
      id: 'ling-cloze-phonem',
      kind: 'cloze',
      difficulty: 2,
      prompt: l(
        'Vervollständige die Definition zum Auswendiglernen.',
        'Complete the definition to memorize.',
      ),
      segments: [
        { type: 'text', value: l('Das Phonem ist die kleinste ', 'A phoneme is the smallest ') },
        { type: 'blank', accepted: ['bedeutungsunterscheidende', 'bedeutungsunterscheidend'], width: 210 },
        {
          type: 'text',
          value: l(' Einheit einer Sprache.', ' unit of a language.'),
        },
      ],
      explanation: l(
        'Das Phonem ist die kleinste bedeutungsunterscheidende Einheit einer Sprache.',
        'A phoneme is the smallest meaning-distinguishing unit of a language.',
      ),
    },
    {
      id: 'ling-cloze-morphem',
      kind: 'cloze',
      difficulty: 2,
      prompt: l(
        'Vervollständige die Definition zum Auswendiglernen.',
        'Complete the definition to memorize.',
      ),
      segments: [
        { type: 'text', value: l('Das Morphem ist die kleinste ', 'A morpheme is the smallest ') },
        { type: 'blank', accepted: ['bedeutungstragende', 'bedeutungstragend'], width: 190 },
        { type: 'text', value: l(' Einheit einer Sprache.', ' unit of a language.') },
      ],
      explanation: l(
        'Das Morphem ist die kleinste bedeutungstragende Einheit einer Sprache.',
        'A morpheme is the smallest meaning-bearing unit of a language.',
      ),
    },
    {
      id: 'ling-cloze-deutsch',
      kind: 'cloze',
      difficulty: 3,
      prompt: l(
        'Ergänze die genetische Stellung des Deutschen.',
        'Complete German’s genetic position.',
      ),
      segments: [
        {
          type: 'text',
          value: l(
            'Deutsch gehört genetisch zu den ',
            'German genetically belongs to the ',
          ),
        },
        {
          type: 'blank',
          accepted: ['indogermanischen', 'indogermanisch', 'indoeuropäischen', 'indoeuropean', 'indo european'],
          width: 168,
        },
        { type: 'text', value: l(' Sprachen, genauer zum ', ' languages, more precisely to the ') },
        {
          type: 'blank',
          accepted: ['germanischen', 'germanisch', 'germanic'],
          width: 130,
        },
        { type: 'text', value: l(' Zweig und dort zum ', ' branch and there to the ') },
        {
          type: 'blank',
          accepted: ['westgermanischen', 'westgermanisch', 'west germanic'],
          width: 152,
        },
        { type: 'text', value: l('.', '.') },
      ],
      explanation: l(
        'Indogermanisch → Germanisch → Westgermanisch → Deutsch.',
        'Indo-European → Germanic → West Germanic → German.',
      ),
    },
    {
      id: 'ling-card-phonem',
      kind: 'flashcard',
      difficulty: 1,
      prompt: l('Was ist ein Phonem?', 'What is a phoneme?'),
      back: l(
        'Die kleinste bedeutungsunterscheidende Einheit einer Sprache.',
        'The smallest meaning-distinguishing unit of a language.',
      ),
    },
    {
      id: 'ling-card-morphem',
      kind: 'flashcard',
      difficulty: 1,
      prompt: l('Was ist ein Morphem?', 'What is a morpheme?'),
      back: l(
        'Die kleinste bedeutungstragende Einheit einer Sprache.',
        'The smallest meaning-bearing unit of a language.',
      ),
    },
    {
      id: 'ling-card-saussure',
      kind: 'flashcard',
      difficulty: 2,
      prompt: l(
        'Wofür stehen Langage, Langue und Parole?',
        'What do langage, langue, and parole stand for?',
      ),
      back: l(
        'Sprachfähigkeit (Langage) – Sprachsystem (Langue) – Rede (Parole).',
        'Language faculty (langage) – language system (langue) – speech (parole).',
      ),
    },
    {
      id: 'ling-card-chomsky',
      kind: 'flashcard',
      difficulty: 2,
      prompt: l(
        'Wofür stehen Kompetenz und Performanz?',
        'What do competence and performance stand for?',
      ),
      back: l(
        'Kompetenz ist die internalisierte Sprachfähigkeit, Performanz der tatsächliche Sprachgebrauch.',
        'Competence is internalized language ability; performance is actual language use.',
      ),
    },
    {
      id: 'ling-card-familien',
      kind: 'flashcard',
      difficulty: 3,
      prompt: l(
        'Nenne die sechs in Europa vertretenen Sprachfamilien aus der Sitzung.',
        'Name the six language families of Europe from the session.',
      ),
      back: l(
        'Indogermanisch, Finno-Ugrisch (Uralisch), Baskisch, Kaukasische Sprachfamilien, Turksprachen (Altaisch), Afro-Asiatisch.',
        'Indo-European, Finno-Ugric (Uralic), Basque, Caucasian, Turkic (Altaic), Afro-Asiatic.',
      ),
    },
    {
      id: 'ling-card-westgermanisch',
      kind: 'flashcard',
      difficulty: 2,
      prompt: l(
        'Nenne die westgermanischen Sprachen aus der Sitzung.',
        'Name the West Germanic languages from the session.',
      ),
      back: l(
        'Englisch, Niederländisch, Flämisch, Afrikaans, Friesisch, Jiddisch – und Deutsch.',
        'English, Dutch, Flemish, Afrikaans, Frisian, Yiddish – and German.',
      ),
    },
  ],
};
