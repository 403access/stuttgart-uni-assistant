import type { QuizTopic } from '@/src/quiz/types';

import { l } from '../helpers';

export const spracheDialekt: QuizTopic = {
  id: 'ling-sprache-dialekt',
  title: l('Sprache, Dialekt & Grammatik', 'Language, dialect & grammar'),
  meeting: l('1. Sitzung', 'Session 1'),
  summary: l(
    'Warum die Grenze zwischen Sprache und Dialekt unscharf ist, was präskriptive und deskriptive Grammatik unterscheidet und welche Begriffspaare Saussure und Chomsky geprägt haben.',
    'Why the line between language and dialect is blurry, how prescriptive and descriptive grammar differ, and which conceptual pairs Saussure and Chomsky introduced.',
  ),
  source: l(
    'Einführung in die Linguistik (für Linguist/inn/en) · Grundlagen der ersten Sitzung',
    'Introduction to Linguistics · basics from the first session',
  ),
  questions: [
    {
      id: 'ling-praeskriptiv',
      kind: 'single',
      difficulty: 1,
      prompt: l(
        'Was macht eine präskriptive (normative) Grammatik?',
        'What does a prescriptive (normative) grammar do?',
      ),
      options: [
        {
          id: 'a',
          label: l(
            'Sie schreibt vor, wie Sprache „richtig“ gebraucht werden soll.',
            'It prescribes how language “should” be used correctly.',
          ),
        },
        {
          id: 'b',
          label: l(
            'Sie beschreibt, wie Sprache tatsächlich gebraucht wird.',
            'It describes how language is actually used.',
          ),
        },
        { id: 'c', label: l('Sie übersetzt zwischen Dialekten.', 'It translates between dialects.') },
        { id: 'd', label: l('Sie zählt nur die Wörter einer Sprache.', 'It only counts the words of a language.') },
      ],
      correctId: 'a',
      explanation: l(
        'Präskriptiv heißt vorschreibend: Die Grammatik setzt Normen. Deskriptiv heißt beschreibend: Sie beobachtet den tatsächlichen Sprachgebrauch.',
        'Prescriptive means laying down rules. Descriptive means observing how language is actually used.',
      ),
    },
    {
      id: 'ling-deskriptiv',
      kind: 'single',
      difficulty: 1,
      prompt: l(
        'Was macht eine deskriptive Grammatik?',
        'What does a descriptive grammar do?',
      ),
      options: [
        {
          id: 'a',
          label: l(
            'Sie beschreibt den tatsächlichen Sprachgebrauch, ohne ihn zu bewerten.',
            'It describes actual language use without judging it.',
          ),
        },
        { id: 'b', label: l('Sie verbietet umgangssprachliche Formen.', 'It forbids colloquial forms.') },
        { id: 'c', label: l('Sie legt die Schulnorm fest.', 'It sets the school standard.') },
        { id: 'd', label: l('Sie ersetzt die Rechtschreibung.', 'It replaces orthography.') },
      ],
      correctId: 'a',
      explanation: l(
        'Deskriptive Grammatik dokumentiert, wie Sprecherinnen und Sprecher eine Sprache verwenden. Sie sagt nicht, was „richtig“ ist.',
        'Descriptive grammar documents how speakers use a language. It does not say what is “correct”.',
      ),
    },
    {
      id: 'ling-abgrenzung-grund',
      kind: 'single',
      difficulty: 2,
      prompt: l(
        'Warum ist die Grenze zwischen Sprache und Dialekt schwer zu ziehen?',
        'Why is the boundary between language and dialect difficult to draw?',
      ),
      options: [
        {
          id: 'a',
          label: l(
            'Weil der Sprachbegriff multiaspektuell definiert wird und kein einzelnes Kriterium immer entscheidet.',
            'Because the concept of language is defined across multiple aspects, and no single criterion always decides.',
          ),
        },
        {
          id: 'b',
          label: l('Weil Dialekte keine Grammatik haben.', 'Because dialects have no grammar.'),
        },
        {
          id: 'c',
          label: l('Weil es zu wenige Sprachen gibt.', 'Because there are too few languages.'),
        },
        {
          id: 'd',
          label: l('Weil nur Schriftsprachen zählen.', 'Because only written languages count.'),
        },
      ],
      correctId: 'a',
      explanation: l(
        'Verständlichkeit, politische Grenzen, Geschichte, Prestige und Identität spielen zusammen. Deshalb gibt es keine einfache, allgemeingültige Trennlinie.',
        'Intelligibility, political borders, history, prestige, and identity all play a role. That is why there is no simple, universally valid dividing line.',
      ),
    },
    {
      id: 'ling-saussure-wer',
      kind: 'single',
      difficulty: 2,
      prompt: l(
        'Wer prägte die Unterscheidung Langage – Langue – Parole?',
        'Who introduced the distinction Langage – Langue – Parole?',
      ),
      options: [
        { id: 'a', label: l('Ferdinand de Saussure', 'Ferdinand de Saussure') },
        { id: 'b', label: l('Noam Chomsky', 'Noam Chomsky') },
        { id: 'c', label: l('Leonard Bloomfield', 'Leonard Bloomfield') },
        { id: 'd', label: l('Wilhelm von Humboldt', 'Wilhelm von Humboldt') },
      ],
      correctId: 'a',
      explanation: l(
        'Der Schweizer Linguist Ferdinand de Saussure (1857–1913) prägte das Begriffspaar aus Langage, Langue und Parole.',
        'The Swiss linguist Ferdinand de Saussure (1857–1913) introduced Langage, Langue, and Parole.',
      ),
    },
    {
      id: 'ling-chomsky-wer',
      kind: 'single',
      difficulty: 2,
      prompt: l(
        'Wer prägte die Unterscheidung Kompetenz – Performanz?',
        'Who introduced the distinction competence – performance?',
      ),
      options: [
        { id: 'a', label: l('Noam Chomsky', 'Noam Chomsky') },
        { id: 'b', label: l('Ferdinand de Saussure', 'Ferdinand de Saussure') },
        { id: 'c', label: l('Roman Jakobson', 'Roman Jakobson') },
        { id: 'd', label: l('Karl Bühler', 'Karl Bühler') },
      ],
      correctId: 'a',
      explanation: l(
        'Noam Chomsky stellte Kompetenz (die internalisierte Sprachfähigkeit) der Performanz (dem tatsächlichen Gebrauch) gegenüber.',
        'Noam Chomsky contrasted competence (internalized language ability) with performance (actual use).',
      ),
    },
    {
      id: 'ling-langue',
      kind: 'single',
      difficulty: 2,
      prompt: l(
        'Welcher Begriff bezeichnet bei Saussure das überindividuelle Sprachsystem?',
        'Which term denotes the supra-individual language system in Saussure’s work?',
      ),
      options: [
        { id: 'a', label: l('Langue', 'Langue') },
        { id: 'b', label: l('Langage', 'Langage') },
        { id: 'c', label: l('Parole', 'Parole') },
        { id: 'd', label: l('Performanz', 'Performance') },
      ],
      correctId: 'a',
      explanation: l(
        'Langage ist die Sprachfähigkeit, Langue das gemeinsame Sprachsystem, Parole die konkrete individuelle Rede.',
        'Langage is the language faculty, langue the shared language system, and parole the concrete individual speech act.',
      ),
    },
    {
      id: 'ling-begriffe-zuordnung',
      kind: 'multiple',
      difficulty: 2,
      prompt: l('Welche Zuordnungen sind korrekt?', 'Which pairings are correct?'),
      options: [
        {
          id: 'a',
          label: l(
            'Saussure → Langage – Langue – Parole',
            'Saussure → Langage – Langue – Parole',
          ),
        },
        {
          id: 'b',
          label: l(
            'Chomsky → Kompetenz – Performanz',
            'Chomsky → competence – performance',
          ),
        },
        {
          id: 'c',
          label: l(
            'Deskriptive Grammatik → beschreibt den tatsächlichen Gebrauch',
            'Descriptive grammar → describes actual use',
          ),
        },
        {
          id: 'd',
          label: l(
            'Präskriptive Grammatik → schreibt Normen vor',
            'Prescriptive grammar → prescribes norms',
          ),
        },
        {
          id: 'e',
          label: l(
            'Saussure → Kompetenz – Performanz',
            'Saussure → competence – performance',
          ),
        },
      ],
      correctIds: ['a', 'b', 'c', 'd'],
      explanation: l(
        'Saussure prägte Langage – Langue – Parole, Chomsky Kompetenz – Performanz. Präskriptive Grammatik schreibt vor, deskriptive beschreibt.',
        'Saussure introduced Langage – Langue – Parole; Chomsky introduced competence – performance. Prescriptive grammar prescribes, descriptive grammar describes.',
      ),
    },
    {
      id: 'ling-tf-dialekt',
      kind: 'true-false',
      difficulty: 2,
      prompt: l(
        'Die Grenze zwischen Sprache und Dialekt lässt sich mit einem einzigen Kriterium eindeutig bestimmen.',
        'The boundary between language and dialect can be determined clearly with a single criterion.',
      ),
      correct: false,
      explanation: l(
        'Der Sprachbegriff wird multiaspektuell definiert. Verständlichkeit allein reicht nicht, weil auch Politik, Geschichte, Prestige und Identität eine Rolle spielen.',
        'The concept of language is defined across multiple aspects. Intelligibility alone is not enough because politics, history, prestige, and identity also matter.',
      ),
    },
    {
      id: 'ling-tf-praeskriptiv',
      kind: 'true-false',
      difficulty: 1,
      prompt: l(
        'Eine präskriptive Grammatik beschreibt, wie Sprache tatsächlich verwendet wird.',
        'A prescriptive grammar describes how language is actually used.',
      ),
      correct: false,
      explanation: l(
        'Präskriptive Grammatik schreibt vor. Die beschreibende Perspektive ist die deskriptive Grammatik.',
        'Prescriptive grammar prescribes. The describing perspective is descriptive grammar.',
      ),
    },
    {
      id: 'ling-tf-langue',
      kind: 'true-false',
      difficulty: 2,
      prompt: l(
        'Bei Saussure entspricht die Langue dem Sprachsystem.',
        'In Saussure’s framework, langue corresponds to the language system.',
      ),
      correct: true,
      explanation: l(
        'Die deutsche Trias lautet Sprachfähigkeit (Langage) – Sprachsystem (Langue) – Rede (Parole).',
        'The German triad is language faculty (langage) – language system (langue) – speech (parole).',
      ),
    },
    {
      id: 'ling-tf-kompetenz',
      kind: 'true-false',
      difficulty: 2,
      prompt: l(
        'Kompetenz und Performanz gehen auf Ferdinand de Saussure zurück.',
        'Competence and performance go back to Ferdinand de Saussure.',
      ),
      correct: false,
      explanation: l(
        'Kompetenz – Performanz stammt von Noam Chomsky. Saussure prägte Langage – Langue – Parole.',
        'Competence – performance comes from Noam Chomsky. Saussure introduced Langage – Langue – Parole.',
      ),
    },
    {
      id: 'ling-ft-saussure',
      kind: 'free-text',
      difficulty: 2,
      prompt: l(
        'Welcher Linguist prägte die Unterscheidung Langage – Langue – Parole?',
        'Which linguist introduced the distinction Langage – Langue – Parole?',
      ),
      accepted: ['Saussure', 'Ferdinand de Saussure', 'de Saussure', 'Ferdinand Saussure'],
      hint: l('Ein Schweizer Linguist.', 'A Swiss linguist.'),
      explanation: l(
        'Ferdinand de Saussure (1857–1913).',
        'Ferdinand de Saussure (1857–1913).',
      ),
    },
    {
      id: 'ling-ft-chomsky',
      kind: 'free-text',
      difficulty: 2,
      prompt: l(
        'Welcher Linguist prägte die Unterscheidung Kompetenz – Performanz?',
        'Which linguist introduced the distinction competence – performance?',
      ),
      accepted: ['Chomsky', 'Noam Chomsky'],
      hint: l('Ein US-amerikanischer Linguist.', 'An American linguist.'),
      explanation: l('Noam Chomsky.', 'Noam Chomsky.'),
    },
    {
      id: 'ling-ft-multiaspektuell',
      kind: 'free-text',
      difficulty: 3,
      prompt: l(
        'Wie nennt man die mehrdimensionale Definition des Sprachbegriffs, die bei der Abgrenzung von Sprache und Dialekt hilft?',
        'What is the term for the multi-dimensional definition of “language” that helps distinguish languages from dialects?',
      ),
      accepted: [
        'multiaspektuell',
        'multiaspektuelle Definition',
        'multiaspektuelle Definition des Sprachbegriffs',
        'multi-aspectual',
        'multi-aspectual definition',
      ],
      keywords: [['multiaspektuell', 'multi aspectual', 'multi-aspectual']],
      hint: l('Das Adjektiv beginnt mit „multi-“.', 'The adjective begins with “multi-”.'),
      explanation: l(
        'Der Sprachbegriff wird multiaspektuell definiert: Mehrere Kriterien zusammen bestimmen, was als Sprache oder Dialekt gilt.',
        'The concept of language is defined multi-aspectually: several criteria together determine what counts as a language or a dialect.',
      ),
    },
    {
      id: 'ling-ft-parole',
      kind: 'free-text',
      difficulty: 2,
      prompt: l(
        'Welcher Begriff bei Saussure bezeichnet die konkrete individuelle Rede?',
        'Which Saussurean term denotes concrete individual speech?',
      ),
      accepted: ['Parole', 'die Parole'],
      explanation: l(
        'Parole ist die individuelle, konkrete Rede – im Deutschen oft mit „Rede“ wiedergegeben.',
        'Parole is individual, concrete speech – often rendered as “Rede” in German.',
      ),
    },
    {
      id: 'ling-match-saussure',
      kind: 'matching',
      difficulty: 2,
      prompt: l(
        'Ordne die deutschen Begriffe den Begriffen von Saussure zu.',
        'Match the German terms with Saussure’s terms.',
      ),
      pairs: [
        {
          id: 'langage',
          left: l('Sprachfähigkeit', 'Language faculty'),
          right: l('Langage', 'Langage'),
        },
        {
          id: 'langue',
          left: l('Sprachsystem', 'Language system'),
          right: l('Langue', 'Langue'),
        },
        {
          id: 'parole',
          left: l('Rede', 'Speech'),
          right: l('Parole', 'Parole'),
        },
      ],
      explanation: l(
        'Sprachfähigkeit = Langage, Sprachsystem = Langue, Rede = Parole.',
        'Language faculty = langage, language system = langue, speech = parole.',
      ),
    },
    {
      id: 'ling-match-grammatik',
      kind: 'matching',
      difficulty: 2,
      prompt: l(
        'Ordne die Grammatiktypen ihrer Aufgabe zu.',
        'Match each type of grammar with its task.',
      ),
      pairs: [
        {
          id: 'prescriptive',
          left: l('Präskriptive Grammatik', 'Prescriptive grammar'),
          right: l('schreibt Normen vor', 'prescribes norms'),
        },
        {
          id: 'descriptive',
          left: l('Deskriptive Grammatik', 'Descriptive grammar'),
          right: l('beschreibt den tatsächlichen Gebrauch', 'describes actual use'),
        },
      ],
      explanation: l(
        'Präskriptiv = vorschreibend, deskriptiv = beschreibend.',
        'Prescriptive = prescribing, descriptive = describing.',
      ),
    },
    {
      id: 'ling-order-trias',
      kind: 'ordering',
      difficulty: 2,
      prompt: l(
        'Ordne die Trias vom Allgemeinen zum Konkreten: Sprachfähigkeit, Sprachsystem, Rede.',
        'Order the triad from the general to the concrete: language faculty, language system, speech.',
      ),
      items: [
        { id: 'faculty', label: l('Sprachfähigkeit', 'Language faculty') },
        { id: 'system', label: l('Sprachsystem', 'Language system') },
        { id: 'speech', label: l('Rede', 'Speech') },
      ],
      explanation: l(
        'Sprachfähigkeit (Langage) → Sprachsystem (Langue) → Rede (Parole).',
        'Language faculty (langage) → language system (langue) → speech (parole).',
      ),
    },
    {
      id: 'ling-cloze-saussure',
      kind: 'cloze',
      difficulty: 2,
      prompt: l(
        'Vervollständige die Trias von Saussure.',
        'Complete Saussure’s triad.',
      ),
      segments: [
        { type: 'text', value: l('Bei Saussure steht ', 'In Saussure’s work, ') },
        { type: 'blank', accepted: ['Langage'], width: 92 },
        { type: 'text', value: l(' für die Sprachfähigkeit, ', ' stands for the language faculty, ') },
        { type: 'blank', accepted: ['Langue'], width: 78 },
        { type: 'text', value: l(' für das Sprachsystem und ', ' for the language system, and ') },
        { type: 'blank', accepted: ['Parole'], width: 74 },
        { type: 'text', value: l(' für die konkrete Rede.', ' for concrete speech.') },
      ],
      explanation: l(
        'Langage – Langue – Parole entsprechen Sprachfähigkeit – Sprachsystem – Rede.',
        'Langage – langue – parole correspond to language faculty – language system – speech.',
      ),
    },
  ],
};
