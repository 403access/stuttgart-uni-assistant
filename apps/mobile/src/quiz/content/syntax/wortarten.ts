import type { QuizTopic } from '@/src/quiz/types';

import { l } from '../helpers';

export const syntaxWortarten: QuizTopic = {
  id: 'syntax-wortarten',
  title: l(
    'Wortarten, Konstituenten & Phrasen',
    'Word classes, constituents & phrases',
  ),
  meeting: l('1. Sitzung · 15. Oktober 2026', 'Session 1 · 15 October 2026'),
  summary: l(
    'Von den Wortarten über die Konstituententests bis zur Phrase: Nomen, Verben, Adjektive, Determinierer und Co., der Unterschied zwischen Konstituente und Phrase, das Kopfprinzip sowie Komplemente und Adjunkte.',
    'From word classes through constituent tests to the phrase: nouns, verbs, adjectives, determiners, and co., the difference between constituent and phrase, the head principle, and complements versus adjuncts.',
  ),
  source: l(
    'Syntax I · Von den Wortarten zur Phrasenstruktur · Fabian Bross',
    'Syntax I · From word classes to phrase structure · Fabian Bross',
  ),
  questions: [
    {
      id: 'syn-wort-nomen',
      kind: 'single',
      difficulty: 1,
      prompt: l(
        'Welche Aussage über Nomen stimmt?',
        'Which statement about nouns is correct?',
      ),
      options: [
        {
          id: 'a',
          label: l(
            'Nomen sind eine offene, flektierte Wortart mit inhärentem Genus sowie Kasus- und Numerusflexion.',
            'Nouns are an open, inflected word class with inherent gender and case and number inflection.',
          ),
        },
        {
          id: 'b',
          label: l(
            'Nomen sind eine geschlossene, unflektierte Wortart ohne Genus.',
            'Nouns are a closed, uninflected word class without gender.',
          ),
        },
        {
          id: 'c',
          label: l(
            'Nomen flektieren nur nach Tempus und Modus.',
            'Nouns inflect only for tense and mood.',
          ),
        },
        {
          id: 'd',
          label: l(
            'Nomen können nicht im Nominativ stehen.',
            'Nouns cannot stand in the nominative.',
          ),
        },
      ],
      correctId: 'a',
      explanation: l(
        'Nomen bilden eine offene Wortart. Im Deutschen haben sie ein inhärentes Genus und flektieren nach Kasus und Numerus.',
        'Nouns form an open word class. In German they have inherent gender and inflect for case and number.',
      ),
    },
    {
      id: 'syn-wort-adjektive',
      kind: 'multiple',
      difficulty: 2,
      prompt: l(
        'Welche Eigenschaften werden im Kurs den Adjektiven zugeschrieben?',
        'Which properties does the course attribute to adjectives?',
      ),
      options: [
        { id: 'a', label: l('Sie modifizieren Nomen.', 'They modify nouns.') },
        { id: 'b', label: l('Sie flektieren nach Kasus, Genus und Numerus.', 'They inflect for case, gender, and number.') },
        { id: 'c', label: l('Sie sind steigerbar.', 'They are gradable.') },
        { id: 'd', label: l('Sie können attributiv oder prädikativ gebraucht werden.', 'They can be used attributively or predicatively.') },
        { id: 'e', label: l('Sie sind immer unflektiert.', 'They are always uninflected.') },
      ],
      correctIds: ['a', 'b', 'c', 'd'],
      explanation: l(
        'Adjektive modifizieren Nomen, flektieren nach Kasus, Genus und Numerus, sind steigerbar und können attributiv (die hübsche Bierflasche) oder prädikativ (die Bierflasche ist hübsch) stehen.',
        'Adjectives modify nouns, inflect for case, gender, and number, are gradable, and can be used attributively (the pretty beer bottle) or predicatively (the beer bottle is pretty).',
      ),
    },
    {
      id: 'syn-wort-pronomen',
      kind: 'single',
      difficulty: 1,
      prompt: l(
        'Um welche Art von Pronomen handelt es sich bei „dieser“?',
        'What kind of pronoun is “dieser” (“this one”)?',
      ),
      options: [
        { id: 'a', label: l('Demonstrativpronomen', 'Demonstrative pronoun') },
        { id: 'b', label: l('Possessivpronomen', 'Possessive pronoun') },
        { id: 'c', label: l('Personalpronomen', 'Personal pronoun') },
        { id: 'd', label: l('Interrogativpronomen', 'Interrogative pronoun') },
      ],
      correctId: 'a',
      explanation: l(
        '„Dieser“ ist ein Demonstrativpronomen. Weitere Pronomentypen sind Possessiv-, Personal- und Interrogativpronomina.',
        '“Dieser” is a demonstrative pronoun. Further types include possessive, personal, and interrogative pronouns.',
      ),
    },
    {
      id: 'syn-wort-determinierer',
      kind: 'single',
      difficulty: 2,
      prompt: l(
        'Was ist ein Determinierer?',
        'What is a determiner?',
      ),
      options: [
        {
          id: 'a',
          label: l(
            'Ein Wort, das einem Nomen vorangeht und dessen Referenz festlegt, z. B. ein Artikel oder ein Quantor.',
            'A word that precedes a noun and fixes its reference, e.g. an article or a quantifier.',
          ),
        },
        {
          id: 'b',
          label: l(
            'Ein Wort, das den Kasus eines Nomens regiert, z. B. eine Präposition.',
            'A word that governs a noun’s case, e.g. a preposition.',
          ),
        },
        {
          id: 'c',
          label: l(
            'Ein Verb, das ein Objekt fordert.',
            'A verb that requires an object.',
          ),
        },
        {
          id: 'd',
          label: l(
            'Ein Adverb, das einen Sachverhalt modifiziert.',
            'An adverb that modifies a state of affairs.',
          ),
        },
      ],
      correctId: 'a',
      explanation: l(
        'Determinierer legen die Referenz eines Nomens fest. Dazu zählen definite und indefinite Artikel, Quantoren sowie Demonstrativ- und Possessivpronomina.',
        'Determiners fix a noun’s reference. They include definite and indefinite articles, quantifiers, and demonstrative and possessive pronouns.',
      ),
    },
    {
      id: 'syn-wort-verb-flektion',
      kind: 'multiple',
      difficulty: 1,
      prompt: l(
        'Nach welchen Kategorien flektieren Verben (Konjugation)?',
        'Which categories do verbs inflect for (conjugation)?',
      ),
      options: [
        { id: 'a', label: l('Person', 'Person') },
        { id: 'b', label: l('Numerus', 'Number') },
        { id: 'c', label: l('Tempus', 'Tense') },
        { id: 'd', label: l('Modus', 'Mood') },
        { id: 'e', label: l('Genus Verbi', 'Voice') },
        { id: 'f', label: l('Kasus', 'Case') },
      ],
      correctIds: ['a', 'b', 'c', 'd', 'e'],
      explanation: l(
        'Verben werden nach Person, Numerus, Tempus, Modus und Genus Verbi konjugiert. Kasus ist dagegen eine nominale Kategorie.',
        'Verbs are conjugated for person, number, tense, mood, and voice. Case, by contrast, is a nominal category.',
      ),
    },
    {
      id: 'syn-wort-transitiv',
      kind: 'single',
      difficulty: 1,
      prompt: l(
        'Wodurch ist ein transitives Verb gekennzeichnet?',
        'What characterises a transitive verb?',
      ),
      options: [
        { id: 'a', label: l('Es hat mindestens ein Objekt.', 'It has at least one object.') },
        { id: 'b', label: l('Es hat nur ein Subjekt.', 'It has only a subject.') },
        { id: 'c', label: l('Es kann nicht flektiert werden.', 'It cannot be inflected.') },
        { id: 'd', label: l('Es bildet immer das Präteritum.', 'It always forms the preterite.') },
      ],
      correctId: 'a',
      explanation: l(
        'Transitive Verben haben mindestens ein Objekt, intransitive Verben haben nur ein Subjekt.',
        'Transitive verbs have at least one object; intransitive verbs have only a subject.',
      ),
    },
    {
      id: 'syn-wort-stellig',
      kind: 'single',
      difficulty: 2,
      prompt: l(
        'Wie viele Stellen hat das Verb in „Sie schenkt mir ein Bier“?',
        'How many places does the verb have in “She gives me a beer”?',
      ),
      options: [
        { id: 'a', label: l('Eine Stelle (einstellig).', 'One place (one-place).') },
        { id: 'b', label: l('Zwei Stellen (zweistellig).', 'Two places (two-place).') },
        { id: 'c', label: l('Drei Stellen (dreistellig).', 'Three places (three-place).') },
        { id: 'd', label: l('Vier Stellen (vierstellig).', 'Four places (four-place).') },
      ],
      correctId: 'c',
      explanation: l(
        '„Schenken“ verlangt Subjekt, Dativobjekt und Akkusativobjekt – das Verb ist dreistellig.',
        '“Schenken” requires a subject, a dative object, and an accusative object – the verb is three-place.',
      ),
    },
    {
      id: 'syn-wort-verbtypen',
      kind: 'matching',
      difficulty: 2,
      prompt: l(
        'Ordne den Verbtypen das passende Beispiel zu.',
        'Match each verb type with the appropriate example.',
      ),
      pairs: [
        {
          id: 'vollverb',
          left: l('Vollverb', 'Full verb'),
          right: l('Paul duscht.', 'Paul showers.'),
        },
        {
          id: 'hilfsverb',
          left: l('Hilfsverb', 'Auxiliary'),
          right: l('Paul hat geduscht.', 'Paul has showered.'),
        },
        {
          id: 'modalverb',
          left: l('Modalverb', 'Modal verb'),
          right: l('Paul muss duschen.', 'Paul must shower.'),
        },
        {
          id: 'kopula',
          left: l('Kopulaverb', 'Copula'),
          right: l('Charlotte ist eine Studentin.', 'Charlotte is a student.'),
        },
      ],
      explanation: l(
        'Vollverben bilden den Verbalkomplex allein, Hilfsverben bilden Tempus- und Passivformen, Modalverben modifizieren ein Vollverb, und Kopulaverben verbinden Subjekt und Prädikativum.',
        'Full verbs form the verb complex alone, auxiliaries form tense and passive forms, modal verbs modify a full verb, and copulas connect subject and predicative.',
      ),
    },
    {
      id: 'syn-wort-aux',
      kind: 'single',
      difficulty: 1,
      prompt: l(
        'In welcher Kategorie werden die Hilfsverben in vielen generativen Traditionen zusammengefasst?',
        'In which category are auxiliaries grouped in many generative traditions?',
      ),
      options: [
        { id: 'a', label: l('AUX', 'AUX') },
        { id: 'b', label: l('C', 'C') },
        { id: 'c', label: l('DP', 'DP') },
        { id: 'd', label: l('PP', 'PP') },
      ],
      correctId: 'a',
      explanation: l(
        'Hilfsverben bilden in vielen generativen Traditionen eine eigene Kategorie AUX.',
        'Auxiliaries form their own category AUX in many generative traditions.',
      ),
    },
    {
      id: 'syn-wort-praeposition',
      kind: 'single',
      difficulty: 1,
      prompt: l(
        'Was ist eine Präposition?',
        'What is a preposition?',
      ),
      options: [
        {
          id: 'a',
          label: l(
            'Eine unflektierte Wortart, die den Kasus einer Nominalgruppe regiert.',
            'An uninflected word class that governs the case of a nominal group.',
          ),
        },
        {
          id: 'b',
          label: l(
            'Eine flektierte Wortart, die ein Objekt fordert.',
            'An inflected word class that requires an object.',
          ),
        },
        {
          id: 'c',
          label: l(
            'Eine Wortart, die Sätze einander unterordnet.',
            'A word class that subordinates one sentence to another.',
          ),
        },
        {
          id: 'd',
          label: l(
            'Eine Wortart, die ein Nomen modifiziert und steigerbar ist.',
            'A word class that modifies a noun and is gradable.',
          ),
        },
      ],
      correctId: 'a',
      explanation: l(
        'Präpositionen wie „in“, „auf“ oder „bei“ sind unflektiert und regieren den Kasus der Nominalgruppe.',
        'Prepositions such as “in”, “on”, or “at” are uninflected and govern the case of the nominal group.',
      ),
    },
    {
      id: 'syn-wort-adverb',
      kind: 'single',
      difficulty: 2,
      prompt: l(
        'Woran erkennt man Adverbien laut Kurs?',
        'How are adverbs recognised according to the course?',
      ),
      options: [
        {
          id: 'a',
          label: l(
            'Sie sind phrasal und können daher alleine im Vorfeld stehen.',
            'They are phrasal and can therefore stand alone in the prefield.',
          ),
        },
        {
          id: 'b',
          label: l(
            'Sie flektieren nach Kasus und Genus.',
            'They inflect for case and gender.',
          ),
        },
        {
          id: 'c',
          label: l(
            'Sie fordern immer einen Artikel.',
            'They always require an article.',
          ),
        },
        {
          id: 'd',
          label: l(
            'Sie können nur Verben modifizieren und nie alleine stehen.',
            'They can only modify verbs and never stand alone.',
          ),
        },
      ],
      correctId: 'a',
      explanation: l(
        'Adverbien sind unflektiert, modifizieren einen Sachverhalt semantisch und sind phrasal – sie können alleine im Vorfeld stehen.',
        'Adverbs are uninflected, modify a state of affairs semantically, and are phrasal – they can stand alone in the prefield.',
      ),
    },
    {
      id: 'syn-wort-konjunktion-c',
      kind: 'single',
      difficulty: 1,
      prompt: l(
        'Welche Kategorie bilden subordinierende Konjunktionen wie „weil“ und „ob“ in generativen Ansätzen?',
        'Which category do subordinating conjunctions such as “because” and “whether” form in generative approaches?',
      ),
      options: [
        { id: 'a', label: l('C (Complementizer)', 'C (complementiser)') },
        { id: 'b', label: l('AUX', 'AUX') },
        { id: 'c', label: l('DP', 'DP') },
        { id: 'd', label: l('AdvP', 'AdvP') },
      ],
      correctId: 'a',
      explanation: l(
        'Subordinierende Konjunktionen ordnen einen Satz einem anderen unter und bilden die eigene Klasse C („Complementizer“).',
        'Subordinating conjunctions subordinate one sentence to another and form their own class C (“complementiser”).',
      ),
    },
    {
      id: 'syn-wort-partikeln',
      kind: 'single',
      difficulty: 2,
      prompt: l(
        'Wie bezeichnet Musan (2013) die Partikeln?',
        'How does Musan (2013) describe particles?',
      ),
      options: [
        { id: 'a', label: l('Als „Papierkorb der Wortarten“.', 'As the “wastebasket of word classes”.') },
        { id: 'b', label: l('Als „Königsklasse der Wortarten“.', 'As the “royal class of word classes”.') },
        { id: 'c', label: l('Als „Kopf der DP“.', 'As the “head of the DP”.') },
        { id: 'd', label: l('Als „Träger des Tempus“.', 'As the “carrier of tense”.') },
      ],
      correctId: 'a',
      explanation: l(
        'Partikeln sind unflektiert, können meist nicht im Vorfeld stehen und nicht alleine als Antwort dienen – Musan nennt sie den „Papierkorb der Wortarten“.',
        'Particles are uninflected, mostly cannot stand in the prefield, and cannot serve as an answer on their own – Musan calls them the “wastebasket of word classes”.',
      ),
    },
    {
      id: 'syn-wort-abkuerzungen',
      kind: 'matching',
      difficulty: 1,
      prompt: l(
        'Ordne den Abkürzungen die passende Wortart zu.',
        'Match each abbreviation with the appropriate word class.',
      ),
      pairs: [
        { id: 'v', left: l('V', 'V'), right: l('Verb', 'Verb') },
        { id: 'n', left: l('N', 'N'), right: l('Nomen', 'Noun') },
        { id: 'adj', left: l('Adj', 'Adj'), right: l('Adjektiv', 'Adjective') },
        { id: 'adv', left: l('Adv', 'Adv'), right: l('Adverb', 'Adverb') },
        { id: 'c', left: l('C/Comp', 'C/Comp'), right: l('Komplementierer', 'Complementiser') },
        { id: 'aux', left: l('Aux', 'Aux'), right: l('Hilfsverb', 'Auxiliary') },
        { id: 'p', left: l('P', 'P'), right: l('Präposition', 'Preposition') },
      ],
      explanation: l(
        'Im Kurs stehen V für Verb, N für Nomen, Adj für Adjektiv, Adv für Adverb, C/Comp für Komplementierer, Aux für Hilfsverb und P für Präposition.',
        'In the course, V stands for verb, N for noun, Adj for adjective, Adv for adverb, C/Comp for complementiser, Aux for auxiliary, and P for preposition.',
      ),
    },
    {
      id: 'syn-wort-konstituententests',
      kind: 'multiple',
      difficulty: 1,
      prompt: l(
        'Welche Tests werden im Kurs zur Ermittlung von Konstituenten genannt?',
        'Which tests for identifying constituents are mentioned in the course?',
      ),
      options: [
        { id: 'a', label: l('Substitutionstest', 'Substitution test') },
        { id: 'b', label: l('Proformen-Test', 'Proform test') },
        { id: 'c', label: l('Fragetest', 'Question test') },
        { id: 'd', label: l('Topikalisierungstest', 'Topicalisation test') },
        { id: 'e', label: l('Koordinationstest', 'Coordination test') },
        { id: 'f', label: l('Reimtest', 'Rhyme test') },
        { id: 'g', label: l('Übersetzungstest', 'Translation test') },
      ],
      correctIds: ['a', 'b', 'c', 'd', 'e'],
      explanation: l(
        'Konstituenten ermittelt man über Substitution, Proformen, Fragen, Topikalisierung und Koordination. Ein einzelner Test reicht nicht aus.',
        'Constituents are identified through substitution, proforms, questions, topicalisation, and coordination. A single test is not enough.',
      ),
    },
    {
      id: 'syn-wort-proform',
      kind: 'single',
      difficulty: 1,
      prompt: l(
        'Welcher Konstituententest steckt in „Sie trinkt es“?',
        'Which constituent test is at work in “She drinks it”?',
      ),
      options: [
        { id: 'a', label: l('Proformen-Test', 'Proform test') },
        { id: 'b', label: l('Koordinationstest', 'Coordination test') },
        { id: 'c', label: l('Topikalisierungstest', 'Topicalisation test') },
        { id: 'd', label: l('Fragetest', 'Question test') },
      ],
      correctId: 'a',
      explanation: l(
        '„Es“ ersetzt „kalten Kakao“ als Proform. Wortketten, die sich gemeinsam durch eine Proform ersetzen lassen, bilden eine Konstituente.',
        '“It” replaces “cold cocoa” as a proform. Word sequences that can be replaced together by a proform form a constituent.',
      ),
    },
    {
      id: 'syn-wort-v2',
      kind: 'single',
      difficulty: 2,
      prompt: l(
        'Warum bezeichnet man das Deutsche als V2-Sprache?',
        'Why is German called a V2 language?',
      ),
      options: [
        {
          id: 'a',
          label: l(
            'Weil im Aussagesatz das finite Verb an zweiter Position steht.',
            'Because in a declarative the finite verb stands in second position.',
          ),
        },
        {
          id: 'b',
          label: l(
            'Weil das Verb immer am Satzende steht.',
            'Because the verb always stands at the end of the sentence.',
          ),
        },
        {
          id: 'c',
          label: l(
            'Weil es im Deutschen kein finites Verb gibt.',
            'Because German has no finite verb.',
          ),
        },
        {
          id: 'd',
          label: l(
            'Weil das Subjekt immer an erster Position stehen muss.',
            'Because the subject must always stand in first position.',
          ),
        },
      ],
      correctId: 'a',
      explanation: l(
        'Im deutschen Aussagesatz besetzt das finite Verb die zweite Position – daher V2. Das Vorfeld kann dabei unterschiedlich gefüllt sein.',
        'In a German declarative the finite verb occupies the second position – hence V2. The prefield can be filled in different ways.',
      ),
    },
    {
      id: 'syn-wort-ics',
      kind: 'single',
      difficulty: 1,
      prompt: l(
        'Wie nennt man die größten Konstituenten eines Satzes?',
        'What are the largest constituents of a sentence called?',
      ),
      options: [
        { id: 'a', label: l('Unmittelbare Konstituenten (ICs)', 'Immediate constituents (ICs)') },
        { id: 'b', label: l('Köpfe', 'Heads') },
        { id: 'c', label: l('Adjunkte', 'Adjuncts') },
        { id: 'd', label: l('Komplemente', 'Complements') },
      ],
      correctId: 'a',
      explanation: l(
        'Die größten Konstituenten eines Satzes heißen unmittelbare Konstituenten (immediate constituents, ICs).',
        'The largest constituents of a sentence are called immediate constituents (ICs).',
      ),
    },
    {
      id: 'syn-wort-tf-jedes-wort-konstituente',
      kind: 'true-false',
      difficulty: 1,
      prompt: l(
        'Jedes Wort eines Satzes ist für sich genommen eine Konstituente.',
        'Every word of a sentence is a constituent in its own right.',
      ),
      correct: false,
      explanation: l(
        'Nicht jedes Wort ist eine Konstituente, aber jedes Wort ist der Kopf einer Konstituente.',
        'Not every word is a constituent, but every word is the head of a constituent.',
      ),
    },
    {
      id: 'syn-wort-tf-mehrere-tests',
      kind: 'true-false',
      difficulty: 1,
      prompt: l(
        'Ein einzelner Konstituententest reicht zur sicheren Bestimmung einer Konstituente aus.',
        'A single constituent test is enough to reliably identify a constituent.',
      ),
      correct: false,
      explanation: l(
        'Es müssen immer mehrere Tests durchgeführt werden: Manche Tests eignen sich nur für bestimmte Konstituenten, und unterschiedliche Tests können unterschiedliche Ergebnisse liefern.',
        'Several tests must always be carried out: some suit only certain constituents, and different tests can yield different results.',
      ),
    },
    {
      id: 'syn-wort-phrase',
      kind: 'single',
      difficulty: 1,
      prompt: l(
        'Was ist der Unterschied zwischen einer Konstituente und einer Phrase?',
        'What is the difference between a constituent and a phrase?',
      ),
      options: [
        {
          id: 'a',
          label: l(
            'Eine Phrase ist eine Konstituente, deren Kopf wir bestimmt haben.',
            'A phrase is a constituent whose head we have determined.',
          ),
        },
        {
          id: 'b',
          label: l(
            'Eine Phrase ist immer kleiner als eine Konstituente.',
            'A phrase is always smaller than a constituent.',
          ),
        },
        {
          id: 'c',
          label: l(
            'Eine Konstituente hat immer einen Kopf, eine Phrase nie.',
            'A constituent always has a head, a phrase never does.',
          ),
        },
        {
          id: 'd',
          label: l(
            'Es gibt keinen Unterschied.',
            'There is no difference.',
          ),
        },
      ],
      correctId: 'a',
      explanation: l(
        'Der einzige Unterschied ist terminologisch: Eine Phrase ist eine Konstituente, deren Kopf bestimmt wurde und nach dem sie klassifiziert wird.',
        'The only difference is terminological: a phrase is a constituent whose head has been determined and after which it is classified.',
      ),
    },
    {
      id: 'syn-wort-kopfprinzip',
      kind: 'single',
      difficulty: 1,
      prompt: l(
        'Was besagt das Kopfprinzip?',
        'What does the head principle state?',
      ),
      options: [
        {
          id: 'a',
          label: l(
            'Jede Phrase hat einen Kopf, der seine Eigenschaften auf die ganze Phrase projiziert.',
            'Every phrase has a head that projects its properties onto the whole phrase.',
          ),
        },
        {
          id: 'b',
          label: l(
            'Jede Phrase hat mehrere gleichrangige Köpfe.',
            'Every phrase has several coequal heads.',
          ),
        },
        {
          id: 'c',
          label: l(
            'Der Kopf steht immer am Satzanfang.',
            'The head always stands at the beginning of the sentence.',
          ),
        },
        {
          id: 'd',
          label: l(
            'Nur Verben können Köpfe sein.',
            'Only verbs can be heads.',
          ),
        },
      ],
      correctId: 'a',
      explanation: l(
        'Der Kopf überträgt seine Eigenschaften auf die gesamte Phrase. Deshalb ist „das frische leckere Bier“ ebenso Neutrum wie „Bier“.',
        'The head transfers its properties to the whole phrase. That is why “the fresh tasty beer” is neuter just like “beer”.',
      ),
    },
    {
      id: 'syn-wort-kopf-bier',
      kind: 'single',
      difficulty: 1,
      prompt: l(
        'Was ist der Kopf in „das frische leckere Bier“?',
        'What is the head in “the fresh tasty beer”?',
      ),
      options: [
        { id: 'a', label: l('das', 'the') },
        { id: 'b', label: l('frische', 'fresh') },
        { id: 'c', label: l('leckere', 'tasty') },
        { id: 'd', label: l('Bier', 'beer') },
      ],
      correctId: 'd',
      explanation: l(
        '„Bier“ trägt das Genus Neutrum und bestimmt damit die Eigenschaften der ganzen Phrase. Artikel und Adjektive modifizieren den Kopf, sind aber nicht selbst der Kopf.',
        '“Bier” carries neuter gender and thus determines the properties of the whole phrase. The article and adjectives modify the head but are not the head themselves.',
      ),
    },
    {
      id: 'syn-wort-dp',
      kind: 'true-false',
      difficulty: 2,
      prompt: l(
        'Im Verlauf des Kurses wird klar, dass es sich bei der sogenannten Nominalphrase eigentlich um eine Determinatorphrase (DP) handelt.',
        'Over the course it becomes clear that the so-called noun phrase is actually a determiner phrase (DP).',
      ),
      correct: true,
      explanation: l(
        'Die Folien weisen bereits darauf hin: Was zunächst als NP bezeichnet wird, erweist sich im Kursverlauf als DP.',
        'The slides already point this out: what is initially called an NP turns out to be a DP over the course.',
      ),
    },
    {
      id: 'syn-wort-werden',
      kind: 'single',
      difficulty: 2,
      prompt: l(
        'Was fordert das Hilfsverb „werden“ in „Paul wird arbeiten“?',
        'What does the auxiliary “werden” require in “Paul wird arbeiten”?',
      ),
      options: [
        {
          id: 'a',
          label: l(
            'Eine infinite verbale Ergänzung, also eine VP.',
            'An infinitival verbal complement, that is, a VP.',
          ),
        },
        {
          id: 'b',
          label: l(
            'Ein finites Verb als Ergänzung.',
            'A finite verb as its complement.',
          ),
        },
        {
          id: 'c',
          label: l(
            'Eine Präpositionalphrase.',
            'A prepositional phrase.',
          ),
        },
        {
          id: 'd',
          label: l(
            'Überhaupt keine Ergänzung.',
            'No complement at all.',
          ),
        },
      ],
      correctId: 'a',
      explanation: l(
        'Im Lexikon von „werden“ ist gespeichert, dass es eine infinite Ergänzung braucht. „arbeiten“ ist infinit, „wird“ finit.',
        'The lexicon entry for “werden” specifies that it needs an infinitival complement. “arbeiten” is infinitival, “wird” is finite.',
      ),
    },
    {
      id: 'syn-wort-tf-ein-finit',
      kind: 'true-false',
      difficulty: 1,
      prompt: l(
        'In einem Satz kann es nur ein finites Verb geben.',
        'A sentence can contain only one finite verb.',
      ),
      correct: true,
      explanation: l(
        'Diese Beobachtung wird in der Sitzung ausdrücklich festgehalten: Es gibt nur ein finites Verb pro Satz.',
        'The session explicitly notes this observation: there is only one finite verb per sentence.',
      ),
    },
    {
      id: 'syn-wort-should',
      kind: 'single',
      difficulty: 2,
      prompt: l(
        'Warum ist „come home“ in „You should come home“ eine VP?',
        'Why is “come home” in “You should come home” a VP?',
      ),
      options: [
        {
          id: 'a',
          label: l(
            'Weil es sich durch ein einzelnes Vollverb mit gleicher Distribution ersetzen lässt.',
            'Because it can be replaced by a single full verb with the same distribution.',
          ),
        },
        {
          id: 'b',
          label: l(
            'Weil es im to-Infinitiv steht.',
            'Because it stands in the to-infinitive.',
          ),
        },
        {
          id: 'c',
          label: l(
            'Weil „should“ ein Nomen ist.',
            'Because “should” is a noun.',
          ),
        },
        {
          id: 'd',
          label: l(
            'Weil es ein finites Verb enthält.',
            'Because it contains a finite verb.',
          ),
        },
      ],
      correctId: 'a',
      explanation: l(
        '„come home“ lässt sich durch das einzelne Vollverb „come“ ersetzen. Da dieses eine VP ist und beide dieselbe Distribution haben, ist auch „come home“ eine VP.',
        '“Come home” can be replaced by the single full verb “come”. Since that is a VP and both have the same distribution, “come home” is also a VP.',
      ),
    },
    {
      id: 'syn-wort-tf-to-come-home',
      kind: 'true-false',
      difficulty: 2,
      prompt: l(
        '„come home“ und „to come home“ haben dieselbe Distribution und gehören zur gleichen Phrasenkategorie.',
        '“Come home” and “to come home” have the same distribution and belong to the same phrase category.',
      ),
      correct: false,
      explanation: l(
        '„*You should to come home“ ist ungrammatisch. „come home“ ist eine VP, „to come home“ dagegen eine IP/TP.',
        '“*You should to come home” is ungrammatical. “Come home” is a VP, whereas “to come home” is an IP/TP.',
      ),
    },
    {
      id: 'syn-wort-ip',
      kind: 'single',
      difficulty: 2,
      prompt: l(
        'Zu welcher Kategorie gehört „to come home“?',
        'Which category does “to come home” belong to?',
      ),
      options: [
        { id: 'a', label: l('VP', 'VP') },
        { id: 'b', label: l('IP (bzw. TP)', 'IP (or TP)') },
        { id: 'c', label: l('DP', 'DP') },
        { id: 'd', label: l('PP', 'PP') },
      ],
      correctId: 'b',
      explanation: l(
        '„to come home“ ist eine IP (inflectional phrase) bzw. TP (tense phrase). Dort wird unter anderem das Tempus festgelegt.',
        '“To come home” is an IP (inflectional phrase) or TP (tense phrase). Tense, among other things, is determined there.',
      ),
    },
    {
      id: 'syn-wort-matching-should-ought',
      kind: 'matching',
      difficulty: 2,
      prompt: l(
        'Ordne den Verben die Ergänzung zu, die sie subkategorisieren.',
        'Match each verb with the complement it subcategorises for.',
      ),
      pairs: [
        {
          id: 'should',
          left: l('should', 'should'),
          right: l('come home (VP)', 'come home (VP)'),
        },
        {
          id: 'ought',
          left: l('ought', 'ought'),
          right: l('to come home (IP)', 'to come home (IP)'),
        },
      ],
      explanation: l(
        '„should“ fordert eine VP, „ought“ dagegen eine IP. Das zeigt, dass unterschiedliche Wörter unterschiedliche Subkategorisierungseigenschaften haben.',
        '“Should” requires a VP, whereas “ought” requires an IP. This shows that different words have different subcategorisation properties.',
      ),
    },
    {
      id: 'syn-wort-komplement-adjunkt',
      kind: 'single',
      difficulty: 2,
      prompt: l(
        'Wie unterscheidet man Komplemente und Adjunkte?',
        'How are complements and adjuncts distinguished?',
      ),
      options: [
        {
          id: 'a',
          label: l(
            'Komplemente sind obligatorische phrasale Ergänzungen, Adjunkte sind optionale phrasale Ergänzungen.',
            'Complements are obligatory phrasal complements, adjuncts are optional phrasal additions.',
          ),
        },
        {
          id: 'b',
          label: l(
            'Komplemente sind immer optional, Adjunkte immer obligatorisch.',
            'Complements are always optional, adjuncts always obligatory.',
          ),
        },
        {
          id: 'c',
          label: l(
            'Komplemente sind Wörter, Adjunkte sind Sätze.',
            'Complements are words, adjuncts are sentences.',
          ),
        },
        {
          id: 'd',
          label: l(
            'Beides sind Bezeichnungen für das Subjekt.',
            'Both are terms for the subject.',
          ),
        },
      ],
      correctId: 'a',
      explanation: l(
        'Obligatorische phrasale Ergänzungen heißen Komplemente (traditionell Ergänzungen), optionale heißen Adjunkte (traditionell Angaben).',
        'Obligatory phrasal complements are called complements, optional ones are called adjuncts.',
      ),
    },
    {
      id: 'syn-wort-montag',
      kind: 'single',
      difficulty: 2,
      prompt: l(
        'Warum ist „am Montag“ in „Markus liest am Montag ein Buch“ ein Adjunkt?',
        'Why is “on Monday” an adjunct in “Markus reads a book on Monday”?',
      ),
      options: [
        {
          id: 'a',
          label: l(
            'Weil es weggelassen werden kann, ohne dass der Satz ungrammatisch wird.',
            'Because it can be omitted without making the sentence ungrammatical.',
          ),
        },
        {
          id: 'b',
          label: l(
            'Weil es vom Verb zwingend gefordert wird.',
            'Because it is obligatorily required by the verb.',
          ),
        },
        {
          id: 'c',
          label: l(
            'Weil es das Subjekt ersetzt.',
            'Because it replaces the subject.',
          ),
        },
        {
          id: 'd',
          label: l(
            'Weil es kein phrasales Element ist.',
            'Because it is not a phrasal element.',
          ),
        },
      ],
      correctId: 'a',
      explanation: l(
        '„Markus liest ein Buch“ ist ebenfalls grammatisch. Die Zeitangabe ist daher optional und damit ein Adjunkt.',
        '“Markus liest ein Buch” is grammatical as well. The time expression is therefore optional and thus an adjunct.',
      ),
    },
    {
      id: 'syn-wort-tf-schenken',
      kind: 'true-false',
      difficulty: 1,
      prompt: l(
        'Der Satz „Markus schenkt Maria“ ist grammatisch, weil man das Akkusativobjekt weglassen kann.',
        'The sentence “Markus gives Maria” is grammatical because the accusative object can be omitted.',
      ),
      correct: false,
      explanation: l(
        '„Schenken“ fordert zwei Objekte. Ohne das Akkusativobjekt ist der Satz ungrammatisch – das Objekt ist ein Komplement, kein Adjunkt.',
        '“Schenken” requires two objects. Without the accusative object the sentence is ungrammatical – the object is a complement, not an adjunct.',
      ),
    },
    {
      id: 'syn-wort-free-adjunkt',
      kind: 'free-text',
      difficulty: 1,
      prompt: l(
        'Wie nennt man optionale phrasale Ergänzungen?',
        'What are optional phrasal additions called?',
      ),
      accepted: ['Adjunkte', 'Adjunkt', 'adjuncts', 'adjunct'],
      explanation: l(
        'Optionale phrasale Ergänzungen heißen Adjunkte (traditionell: Angaben).',
        'Optional phrasal additions are called adjuncts.',
      ),
    },
    {
      id: 'syn-wort-free-subkategorisierung',
      kind: 'free-text',
      difficulty: 2,
      prompt: l(
        'Wie nennt man die lexikalische Eigenschaft eines Wortes, die festlegt, welche Ergänzungen es fordert?',
        'What is the lexical property of a word that specifies which complements it requires called?',
      ),
      accepted: ['Subkategorisierung', 'subcategorization', 'subcategorisation'],
      explanation: l(
        'Subkategorisierungseigenschaften stehen im Lexikon. Sie legen fest, welche Ergänzungen ein Wort – etwa ein Verb – verlangt.',
        'Subcategorisation properties are stored in the lexicon. They determine which complements a word – for example a verb – requires.',
      ),
    },
    {
      id: 'syn-wort-cloze-komplemente',
      kind: 'cloze',
      difficulty: 2,
      prompt: l(
        'Vervollständige die Unterscheidung der phrasalen Ergänzungen.',
        'Complete the distinction between the phrasal complements.',
      ),
      segments: [
        { type: 'text', value: l('Obligatorische phrasale Ergänzungen nennt man ', 'Obligatory phrasal complements are called ') },
        { type: 'blank', accepted: ['Komplemente', 'Komplement', 'complements', 'complement'], width: 130 },
        { type: 'text', value: l(', optionale phrasale Ergänzungen dagegen ', ', whereas optional phrasal additions are called ') },
        { type: 'blank', accepted: ['Adjunkte', 'Adjunkt', 'adjuncts', 'adjunct'], width: 110 },
        { type: 'text', value: l('.', '.') },
      ],
      explanation: l(
        'Komplemente sind obligatorisch (traditionell Ergänzungen), Adjunkte optional (traditionell Angaben).',
        'Complements are obligatory, adjuncts optional.',
      ),
    },
    {
      id: 'syn-wort-flashcard-kopf',
      kind: 'flashcard',
      difficulty: 2,
      prompt: l(
        'Was besagt das Kopfprinzip und wie hängt es mit dem Unterschied zwischen Konstituente und Phrase zusammen?',
        'What does the head principle state, and how does it relate to the difference between a constituent and a phrase?',
      ),
      back: l(
        'Jede Phrase hat einen Kopf, der seine Eigenschaften auf die ganze Phrase projiziert. Eine Konstituente wird zur Phrase, sobald wir ihren Kopf bestimmt und sie nach ihm klassifiziert haben – z. B. Bier → Nominalphrase.',
        'Every phrase has a head that projects its properties onto the whole phrase. A constituent becomes a phrase once we have determined its head and classified it accordingly – e.g. beer → noun phrase.',
      ),
    },
  ],
};
