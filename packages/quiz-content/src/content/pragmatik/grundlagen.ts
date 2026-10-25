import type { QuizTopic } from '../../types.ts';

import { l } from '../helpers';

export const pragGrundlagen: QuizTopic = {
  id: 'prag-grundlagen',
  title: l('Satz, Äußerung & Kontext', 'Sentence, utterance & context'),
  meeting: l('1. Sitzung · 12. Oktober 2026', 'Session 1 · 12 October 2026'),
  summary: l(
    'Warum Sätze Abstraktionen sind, Äußerungen aber immer in einem Kontext stehen – mit Blick auf kontextabhängige Ausdrücke, gemeinsames Hintergrundwissen, Theory of Mind und den Unterschied zwischen Wahrheit und „intuitiver“ Wahrheit.',
    'Why sentences are abstractions while utterances always stand in a context – covering context-dependent expressions, shared background knowledge, theory of mind, and the difference between truth and “intuitive” truth.',
  ),
  source: l(
    'Pragmatik I · Was ist „Pragmatik“? · Erste Sitzung',
    'Pragmatics I · What is “pragmatics”? · First session',
  ),
  questions: [
    {
      id: 'prag-was-ist-pragmatik',
      kind: 'single',
      difficulty: 1,
      prompt: l(
        'Was untersucht die Pragmatik in erster Linie?',
        'What does pragmatics primarily study?',
      ),
      options: [
        {
          id: 'a',
          label: l(
            'Den Gebrauch von Sprache in Kontexten und die Bedeutung von Äußerungen.',
            'The use of language in contexts and the meaning of utterances.',
          ),
        },
        { id: 'b', label: l('Die Lautinventare einzelner Sprachen.', 'The sound inventories of individual languages.') },
        { id: 'c', label: l('Die Geschichte der Grammatikschreibung.', 'The history of grammar writing.') },
        { id: 'd', label: l('Die chemische Zusammensetzung von Sprache.', 'The chemical composition of language.') },
      ],
      correctId: 'a',
      explanation: l(
        'Die Pragmatik fragt, wie Sprecherinnen und Sprecher Sprache im Kontext verwenden und wie Hörerinnen und Hörer vom Gesagten zum Gemeinten gelangen.',
        'Pragmatics asks how speakers use language in context and how hearers get from what is said to what is meant.',
      ),
    },
    {
      id: 'prag-satz-aeusserung',
      kind: 'single',
      difficulty: 1,
      prompt: l(
        'Wie unterscheiden sich Satz und Äußerung?',
        'How do a sentence and an utterance differ?',
      ),
      options: [
        {
          id: 'a',
          label: l(
            'Ein Satz ist eine Abstraktion vom Kontext; eine Äußerung findet immer in einem konkreten Kontext statt.',
            'A sentence is an abstraction from context; an utterance always takes place in a concrete context.',
          ),
        },
        {
          id: 'b',
          label: l(
            'Ein Satz ist immer wahr, eine Äußerung immer falsch.',
            'A sentence is always true, an utterance always false.',
          ),
        },
        {
          id: 'c',
          label: l(
            'Eine Äußerung ist eine Abstraktion; ein Satz ist immer konkret.',
            'An utterance is an abstraction; a sentence is always concrete.',
          ),
        },
        { id: 'd', label: l('Es gibt keinen Unterschied.', 'There is no difference.') },
      ],
      correctId: 'a',
      explanation: l(
        'Sätze betrachten wir losgelöst von der Situation. Eine Äußerung ist dagegen immer an einen Kontext gebunden – an Situation, Ko-Text und gemeinsames Wissen.',
        'We consider sentences detached from the situation. An utterance, by contrast, is always tied to a context – situation, co-text, and shared knowledge.',
      ),
    },
    {
      id: 'prag-kontextabhaengige-ausdruecke',
      kind: 'multiple',
      difficulty: 2,
      prompt: l(
        'Welche Ausdrücke in „Gestern habe ich Dir das dort gegeben“ sind kontextabhängig?',
        'Which expressions in “Yesterday I gave you that there” are context-dependent?',
      ),
      options: [
        { id: 'a', label: l('gestern', 'yesterday') },
        { id: 'b', label: l('ich', 'I') },
        { id: 'c', label: l('Dir', 'you') },
        { id: 'd', label: l('das', 'that') },
        { id: 'e', label: l('dort', 'there') },
        { id: 'f', label: l('gegeben', 'gave') },
      ],
      correctIds: ['a', 'b', 'c', 'd', 'e'],
      explanation: l(
        '„Gestern“, „ich“, „Dir“, „das“ und „dort“ verweisen auf Zeit, Sprecher, Adressat, Gegenstand und Ort. Nur mit dem Kontext lässt sich bestimmen, worauf sie sich beziehen.',
        '“Yesterday”, “I”, “you”, “that”, and “there” refer to a time, speaker, addressee, object, and place. Only the context determines what they refer to.',
      ),
    },
    {
      id: 'prag-das-dort-buch',
      kind: 'single',
      difficulty: 2,
      prompt: l(
        'Fritz sagt am 17.10.2022 zu Paula „Gestern habe ich Dir das dort gegeben“ und zeigt auf ein Buch. Worauf bezieht sich „das dort“?',
        'Fritz says to Paula on 17 October 2022, “Yesterday I gave you that there,” and points at a book. What does “that there” refer to?',
      ),
      options: [
        { id: 'a', label: l('Auf das Buch, auf das Fritz zeigt.', 'The book Fritz is pointing at.') },
        { id: 'b', label: l('Auf Paulas MacBook.', 'Paula’s MacBook.') },
        { id: 'c', label: l('Auf Paula selbst.', 'Paula herself.') },
        { id: 'd', label: l('Auf den Vortrag vom Vortag.', 'The talk from the previous day.') },
      ],
      correctId: 'a',
      explanation: l(
        'Die Zeigegeste und die Situation legen die Referenz fest. In einem anderen Kontext – etwa mit einem MacBook – würde dieselbe Äußerung etwas anderes bedeuten.',
        'The pointing gesture and the situation fix the reference. In another context – say, with a MacBook – the same utterance would mean something else.',
      ),
    },
    {
      id: 'prag-ko-text',
      kind: 'single',
      difficulty: 2,
      prompt: l(
        'Wie nennt man den engen sprachlichen Kontext, also die vorangehenden und folgenden Äußerungen?',
        'What is the narrow linguistic context – the preceding and following utterances – called?',
      ),
      options: [
        { id: 'a', label: l('Ko-Text', 'Co-text') },
        { id: 'b', label: l('Langue', 'Langue') },
        { id: 'c', label: l('Performanz', 'Performance') },
        { id: 'd', label: l('Proposition', 'Proposition') },
      ],
      correctId: 'a',
      explanation: l(
        'Zum Kontext gehört neben der Situation und dem gemeinsamen Wissen auch der sprachliche Kontext: der Ko-Text.',
        'Besides the situation and shared knowledge, context also includes the linguistic context: the co-text.',
      ),
    },
    {
      id: 'prag-tf-satz-abstraktion',
      kind: 'true-false',
      difficulty: 1,
      prompt: l(
        'Sätze sind Abstraktionen von Kontexten; Äußerungen stehen immer in einem Kontext.',
        'Sentences are abstractions from contexts; utterances always stand in a context.',
      ),
      correct: true,
      explanation: l(
        'Das ist die grundlegende Unterscheidung der Sitzung: Der Satz ist die kontextlose Einheit, die Äußerung die konkrete, kontextgebundene Verwendung.',
        'This is the session’s basic distinction: the sentence is the context-free unit, the utterance the concrete use bound to a context.',
      ),
    },
    {
      id: 'prag-tf-hintergrundwissen',
      kind: 'true-false',
      difficulty: 1,
      prompt: l(
        'Gemeinsames Hintergrundwissen kann entscheiden, ob eine Äußerung ironisch gemeint ist.',
        'Shared background knowledge can determine whether an utterance is meant ironically.',
      ),
      correct: true,
      explanation: l(
        'Ob „Maximilian ist ein Genie“ ironisch ist, hängt davon ab, was Sprecher und Hörer gemeinsam über Maximilian wissen.',
        'Whether “Maximilian is a genius” is ironic depends on what speaker and hearer jointly know about Maximilian.',
      ),
    },
    {
      id: 'prag-maximilian-ironie',
      kind: 'single',
      difficulty: 2,
      prompt: l(
        'Unter welcher Bedingung ist „Maximilian ist ein Genie“ ironisch gemeint?',
        'Under which condition is “Maximilian is a genius” meant ironically?',
      ),
      options: [
        {
          id: 'a',
          label: l(
            'Wenn beide wissen, dass Maximilian nicht intelligent ist, und der Sprecher das Gegenteil kommunizieren will.',
            'When both know that Maximilian is not intelligent and the speaker wants to communicate the opposite.',
          ),
        },
        {
          id: 'b',
          label: l(
            'Wenn beide Maximilian tatsächlich für sehr intelligent halten.',
            'When both actually consider Maximilian very intelligent.',
          ),
        },
        {
          id: 'c',
          label: l(
            'Wenn der Sprecher Maximilian überhaupt nicht kennt.',
            'When the speaker does not know Maximilian at all.',
          ),
        },
        {
          id: 'd',
          label: l(
            'Wenn Maximilian gerade anwesend ist.',
            'When Maximilian happens to be present.',
          ),
        },
      ],
      correctId: 'a',
      explanation: l(
        'Ironie entsteht hier aus dem Kontrast zwischen dem Gesagten und dem gemeinsamen Wissen. Der Sprecher verlässt sich darauf, dass der Hörer diesen Kontrast bemerkt.',
        'Irony arises here from the contrast between what is said and shared knowledge. The speaker relies on the hearer noticing that contrast.',
      ),
    },
    {
      id: 'prag-ironie-merkmale',
      kind: 'multiple',
      difficulty: 2,
      prompt: l(
        'Was gehört zur ironischen Deutung von „Maximilian ist ein Genie“?',
        'What belongs to the ironic reading of “Maximilian is a genius”?',
      ),
      options: [
        {
          id: 'a',
          label: l(
            'Sprecher und Hörer teilen das Wissen, dass Maximilian nicht intelligent ist.',
            'Speaker and hearer share the knowledge that Maximilian is not intelligent.',
          ),
        },
        {
          id: 'b',
          label: l(
            'Der Sprecher verlässt sich darauf, dass der Hörer den Widerspruch bemerkt.',
            'The speaker relies on the hearer noticing the contradiction.',
          ),
        },
        {
          id: 'c',
          label: l(
            'Der Sprecher will das Gegenteil des Gesagten kommunizieren.',
            'The speaker wants to communicate the opposite of what is said.',
          ),
        },
        {
          id: 'd',
          label: l(
            'Der Sprecher hält Maximilian tatsächlich für ein Genie.',
            'The speaker actually considers Maximilian a genius.',
          ),
        },
        {
          id: 'e',
          label: l(
            'Die Äußerung ist nur Ironie, wenn Maximilian anwesend ist.',
            'The utterance is only ironic if Maximilian is present.',
          ),
        },
      ],
      correctIds: ['a', 'b', 'c'],
      explanation: l(
        'Ironie braucht das geteilte Wissen, die erkennbare Spannung zwischen Gesagtem und Gemeintem und die Absicht, das Gegenteil zu vermitteln. Die Anwesenheit Maximilians ist nicht nötig.',
        'Irony requires shared knowledge, the recognisable tension between what is said and what is meant, and the intention to convey the opposite. Maximilian does not need to be present.',
      ),
    },
    {
      id: 'prag-theory-of-mind',
      kind: 'free-text',
      difficulty: 2,
      prompt: l(
        'Wie heißt die Fähigkeit, anderen Menschen mentale Zustände wie Überzeugungen, Wünsche und Absichten zuzuschreiben?',
        'What is the ability to attribute mental states such as beliefs, desires, and intentions to other people called?',
      ),
      accepted: ['Theory of Mind', 'ToM', 'theory of mind'],
      hint: l('Die Abkürzung ist dreistellig.', 'The abbreviation has three letters.'),
      explanation: l(
        'Theory of Mind (ToM) ist die Fähigkeit, innere Zustände anderer zu erschließen. Sie ist wichtig, um zu verstehen, was jemand mit einer Äußerung meint.',
        'Theory of mind (ToM) is the ability to infer others’ inner states. It matters for understanding what someone means by an utterance.',
      ),
    },
    {
      id: 'prag-imbiss',
      kind: 'single',
      difficulty: 2,
      prompt: l(
        'Ein Mann betritt einen Imbiss, greift in seine Taschen, wird rot und verlässt die Warteschlange. Was ist die naheliegendste Erklärung?',
        'A man enters a snack bar, reaches into his pockets, blushes, and leaves the queue. What is the most obvious explanation?',
      ),
      options: [
        {
          id: 'a',
          label: l(
            'Er hat vermutlich sein Portemonnaie vergessen und ist peinlich berührt.',
            'He has probably forgotten his wallet and is embarrassed.',
          ),
        },
        {
          id: 'b',
          label: l('Er sucht einen Stift, um etwas aufzuschreiben.', 'He is looking for a pen to write something down.'),
        },
        {
          id: 'c',
          label: l('Er mag das Essen im Imbiss nicht.', 'He does not like the food at the snack bar.'),
        },
        {
          id: 'd',
          label: l('Er übt eine Rede für die nächste Sitzung.', 'He is rehearsing a speech for the next session.'),
        },
      ],
      correctId: 'a',
      explanation: l(
        'Wir erschließen aus dem Verhalten auf innere Zustände. Das ist eine Leistung der Theory of Mind – und sie ist fehlbar: Es gibt auch alternative Erklärungen.',
        'We infer inner states from behaviour. That is an achievement of theory of mind – and it is fallible: there are alternative explanations.',
      ),
    },
    {
      id: 'prag-tf-tom-beobachten',
      kind: 'true-false',
      difficulty: 1,
      prompt: l(
        'Theory of Mind bedeutet, dass wir die Überzeugungen und Wünsche anderer direkt beobachten können.',
        'Theory of mind means that we can directly observe other people’s beliefs and desires.',
      ),
      correct: false,
      explanation: l(
        'Innere Zustände sind nicht direkt beobachtbar. Wir erschließen sie aus Verhalten, Äußerungen und Kontext – und können uns dabei irren.',
        'Inner states are not directly observable. We infer them from behaviour, utterances, and context – and we can be wrong.',
      ),
    },
    {
      id: 'prag-bierflasche-wahrheit',
      kind: 'single',
      difficulty: 2,
      prompt: l(
        'Nach vier Flaschen Bier sagt FD zur Polizei: „Ich habe eine Flasche Bier getrunken.“ Wie ist die Antwort zu beurteilen?',
        'After four bottles of beer, FD tells the police: “I drank one bottle of beer.” How should the answer be assessed?',
      ),
      options: [
        {
          id: 'a',
          label: l(
            'Sie ist wörtlich wahr, aber pragmatisch irreführend, weil sie nicht ausreichend informativ ist.',
            'It is literally true but pragmatically misleading because it is not sufficiently informative.',
          ),
        },
        {
          id: 'b',
          label: l('Sie ist eindeutig falsch.', 'It is clearly false.'),
        },
        {
          id: 'c',
          label: l('Sie ist weder wahr noch falsch.', 'It is neither true nor false.'),
        },
        {
          id: 'd',
          label: l('Sie ist wahr und in jeder Hinsicht angemessen.', 'It is true and appropriate in every respect.'),
        },
      ],
      correctId: 'a',
      explanation: l(
        'Wer vier Flaschen getrunken hat, hat auch eine Flasche getrunken. Die Antwort verletzt aber die Erwartung, ausreichend informativ zu sein – sie implikatiert „genau eine“.',
        'Anyone who has drunk four bottles has also drunk one bottle. But the answer violates the expectation of being sufficiently informative – it implicates “exactly one”.',
      ),
    },
    {
      id: 'prag-tf-vier-flaschen',
      kind: 'true-false',
      difficulty: 1,
      prompt: l(
        'Wenn jemand vier Flaschen Bier getrunken hat, ist es logisch wahr, dass er eine Flasche Bier getrunken hat.',
        'If someone has drunk four bottles of beer, it is logically true that they have drunk one bottle of beer.',
      ),
      correct: true,
      explanation: l(
        'Vier Flaschen enthalten eine Flasche. Die logische Folgerung ist korrekt – der kommunikative Eindruck der Antwort ist trotzdem ein anderer.',
        'Four bottles contain one bottle. The logical inference is correct – the communicative impression of the answer is still different.',
      ),
    },
    {
      id: 'prag-said-meant',
      kind: 'single',
      difficulty: 2,
      prompt: l(
        'Welches Begriffspaar steht im Zentrum von Grices Erklärung, wie wir mehr kommunizieren, als wir sagen?',
        'Which pair of concepts is central to Grice’s explanation of how we communicate more than we say?',
      ),
      options: [
        { id: 'a', label: l('what is said – what is meant', 'what is said – what is meant') },
        { id: 'b', label: l('signifiant – signifié', 'signifiant – signifié') },
        { id: 'c', label: l('Kompetenz – Performanz', 'competence – performance') },
        { id: 'd', label: l('Langue – Parole', 'langue – parole') },
      ],
      correctId: 'a',
      explanation: l(
        'Grice fragt, wie wir von dem, was gesagt worden ist (what is said), zu dem gelangen, was eigentlich gemeint war (what is meant).',
        'Grice asks how we get from what is said to what is actually meant.',
      ),
    },
    {
      id: 'prag-mentale-zustaende',
      kind: 'single',
      difficulty: 2,
      prompt: l(
        'Welche Rolle spielen mentale Zustände beim Verstehen einer Äußerung?',
        'What role do mental states play in understanding an utterance?',
      ),
      options: [
        {
          id: 'a',
          label: l(
            'Wir erschließen Überzeugungen, Wünsche und Absichten des Sprechers, um zu verstehen, was er meint.',
            'We infer the speaker’s beliefs, desires, and intentions in order to understand what they mean.',
          ),
        },
        { id: 'b', label: l('Sie spielen keine Rolle.', 'They play no role.') },
        { id: 'c', label: l('Nur die Grammatik zählt.', 'Only grammar counts.') },
        { id: 'd', label: l('Nur Wahrheitstabellen zählen.', 'Only truth tables count.') },
      ],
      correctId: 'a',
      explanation: l(
        'Zum richtigen Verständnis einer Äußerung ist es wichtig, die inneren Zustände der anderen zu kennen oder über sie Vermutungen anzustellen.',
        'To understand an utterance correctly, it is important to know or make assumptions about other people’s inner states.',
      ),
    },
    {
      id: 'prag-match-kontextdimensionen',
      kind: 'matching',
      difficulty: 2,
      prompt: l(
        'Ordne den Kontextdimensionen das passende Beispiel zu.',
        'Match each dimension of context with the appropriate example.',
      ),
      pairs: [
        {
          id: 'situation',
          left: l('Situation', 'Situation'),
          right: l('Fritz zeigt beim Sprechen auf ein Buch.', 'Fritz points at a book while speaking.'),
        },
        {
          id: 'kotext',
          left: l('Enger sprachlicher Kontext', 'Narrow linguistic context'),
          right: l('Der vorherige Satz im Gespräch.', 'The previous sentence in the conversation.'),
        },
        {
          id: 'wissen',
          left: l('Gemeinsames Hintergrundwissen', 'Shared background knowledge'),
          right: l('Beide wissen, dass Maximilian kein Genie ist.', 'Both know that Maximilian is no genius.'),
        },
      ],
      explanation: l(
        'Kontext umfasst die Situation, den sprachlichen Ko-Text und das gemeinsame Wissen von Sprecher und Hörer.',
        'Context includes the situation, the linguistic co-text, and the shared knowledge of speaker and hearer.',
      ),
    },
    {
      id: 'prag-cloze-kontext',
      kind: 'cloze',
      difficulty: 1,
      prompt: l(
        'Vervollständige die Unterscheidung von Satz und Äußerung.',
        'Complete the distinction between sentence and utterance.',
      ),
      segments: [
        { type: 'text', value: l('Eine Äußerung findet immer in einem ', 'An utterance always takes place in a ') },
        { type: 'blank', accepted: ['Kontext', 'context'], width: 100 },
        { type: 'text', value: l(' statt. Ein ', '. A ') },
        { type: 'blank', accepted: ['Satz', 'sentence'], width: 74 },
        { type: 'text', value: l(' ist dagegen eine Abstraktion vom Kontext.', ' is, by contrast, an abstraction from context.') },
      ],
      explanation: l(
        'Satz = kontextlose Abstraktion; Äußerung = konkrete, kontextgebundene Verwendung.',
        'Sentence = context-free abstraction; utterance = concrete use bound to a context.',
      ),
    },
    {
      id: 'prag-card-said-meant',
      kind: 'flashcard',
      difficulty: 2,
      prompt: l(
        'Was ist der Unterschied zwischen „what is said“ und „what is meant“?',
        'What is the difference between “what is said” and “what is meant”?',
      ),
      back: l(
        '„What is said“ ist der wörtliche Gehalt einer Äußerung. „What is meant“ ist das, was der Sprecher damit eigentlich kommunizieren will. Die Pragmatik interessiert sich besonders für den Weg vom einen zum anderen.',
        '“What is said” is the literal content of an utterance. “What is meant” is what the speaker actually intends to communicate. Pragmatics is especially interested in the path from one to the other.',
      ),
    },
  ],
};
