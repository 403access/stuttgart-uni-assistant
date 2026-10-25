import type { QuizTopic } from '../../types.ts';

import { l } from '../helpers';

export const pragSprechakte: QuizTopic = {
  id: 'prag-sprechakte',
  title: l('Sprechakte & indirekte Sprechakte', 'Speech acts & indirect speech acts'),
  meeting: l('1. Sitzung · 12. Oktober 2026', 'Session 1 · 12 October 2026'),
  summary: l(
    'Warum Äußerungen Handlungen sind, weshalb ein Eid nicht wahr oder falsch ist, sondern gelingt oder misslingt, und wie aus der Frage „Können Sie mir das Salz geben?“ eine Bitte wird.',
    'Why utterances are actions, why an oath is neither true nor false but succeeds or fails, and how the question “Can you pass me the salt?” becomes a request.',
  ),
  source: l(
    'Pragmatik I · Was ist „Pragmatik“? · Erste Sitzung',
    'Pragmatics I · What is “pragmatics”? · First session',
  ),
  questions: [
    {
      id: 'prag-sprechakt-perspektive',
      kind: 'single',
      difficulty: 1,
      prompt: l(
        'Was besagt die sprechakttheoretische Perspektive auf Äußerungen?',
        'What does the speech-act perspective on utterances claim?',
      ),
      options: [
        {
          id: 'a',
          label: l(
            'Wir vollziehen mit Äußerungen Handlungen und fragen, ob diese gelingen oder misslingen.',
            'We perform actions with utterances and ask whether they succeed or fail.',
          ),
        },
        { id: 'b', label: l('Äußerungen beschreiben nur die Welt.', 'Utterances only describe the world.') },
        { id: 'c', label: l('Nur die Grammatik ist relevant.', 'Only grammar is relevant.') },
        { id: 'd', label: l('Sprechakte sind immer wahr oder falsch.', 'Speech acts are always true or false.') },
      ],
      correctId: 'a',
      explanation: l(
        'In der Pragmatik betrachten wir Äußerungen als Handlungen: Wir behaupten, leisten Eide, sprechen Drohungen aus, geben Ratschläge und vieles mehr.',
        'In pragmatics we regard utterances as actions: we assert, take oaths, issue threats, give advice, and much more.',
      ),
    },
    {
      id: 'prag-sprechakt-autoren',
      kind: 'single',
      difficulty: 1,
      prompt: l(
        'Welche Autoren sind mit der klassischen Sprechakttheorie verbunden?',
        'Which authors are associated with classical speech act theory?',
      ),
      options: [
        { id: 'a', label: l('John L. Austin und John R. Searle', 'John L. Austin and John R. Searle') },
        { id: 'b', label: l('Paul Grice und Ferdinand de Saussure', 'Paul Grice and Ferdinand de Saussure') },
        { id: 'c', label: l('Noam Chomsky und Leonard Bloomfield', 'Noam Chomsky and Leonard Bloomfield') },
        { id: 'd', label: l('Wilhelm von Humboldt und Leo Weisgerber', 'Wilhelm von Humboldt and Leo Weisgerber') },
      ],
      correctId: 'a',
      explanation: l(
        'Austin und Searle gehören zu den Klassikern der Sprechakttheorie. Auszüge aus ihren Werken stehen auf ILIAS zur Vertiefung bereit.',
        'Austin and Searle are among the classics of speech act theory. Excerpts from their works are available on ILIAS for further reading.',
      ),
    },
    {
      id: 'prag-tf-nur-behauptungen',
      kind: 'true-false',
      difficulty: 1,
      prompt: l(
        'Mit Äußerungen können wir nur Behauptungen aufstellen.',
        'With utterances we can only make assertions.',
      ),
      correct: false,
      explanation: l(
        'Wir leisten Eide, sprechen Drohungen aus, geben Ratschläge, stellen Fragen und vieles mehr. Behauptungen sind nur eine Form des Sprechakts.',
        'We take oaths, issue threats, give advice, ask questions, and much more. Assertions are only one kind of speech act.',
      ),
    },
    {
      id: 'prag-eid-wahrheit',
      kind: 'single',
      difficulty: 2,
      prompt: l(
        'Ist der Amtseid wahr oder falsch?',
        'Is an oath of office true or false?',
      ),
      options: [
        {
          id: 'a',
          label: l(
            'Weder noch: Es geht nicht um Wahrheit, sondern darum, ob der Sprechakt gelingt.',
            'Neither: it is not about truth but about whether the speech act succeeds.',
          ),
        },
        { id: 'b', label: l('Er ist immer wahr.', 'It is always true.') },
        { id: 'c', label: l('Er ist immer falsch.', 'It is always false.') },
        { id: 'd', label: l('Er ist eine Frage.', 'It is a question.') },
      ],
      correctId: 'a',
      explanation: l(
        'Bei Sprechakten wie einem Eid fragen wir nicht nach Wahrheitsbedingungen, sondern nach den Bedingungen des Gelingens oder Misslingens.',
        'With speech acts such as an oath we do not ask about truth conditions but about the conditions for success or failure.',
      ),
    },
    {
      id: 'prag-eid-schiefgehen',
      kind: 'multiple',
      difficulty: 2,
      prompt: l(
        'Unter welchen Umständen könnte eine Vereidigung schiefgehen?',
        'Under which circumstances could an oath-taking go wrong?',
      ),
      options: [
        { id: 'a', label: l('Die sprechende Person ist nicht befugt.', 'The speaker is not authorised.') },
        { id: 'b', label: l('Der institutionelle Rahmen oder die Form ist falsch.', 'The institutional setting or the form is wrong.') },
        { id: 'c', label: l('Die sprechende Person wird gezwungen.', 'The speaker is coerced.') },
        { id: 'd', label: l('Es wird die falsche Formel verwendet.', 'The wrong formula is used.') },
        { id: 'e', label: l('Der Eid ist grammatisch ein Aussagesatz.', 'The oath is grammatically a declarative sentence.') },
      ],
      correctIds: ['a', 'b', 'c', 'd'],
      explanation: l(
        'Ein Sprechakt gelingt nur, wenn die passenden institutionellen, sozialen und formalen Bedingungen erfüllt sind. Die grammatische Form allein entscheidet nicht über das Gelingen.',
        'A speech act succeeds only if the relevant institutional, social, and formal conditions are met. Grammatical form alone does not decide success.',
      ),
    },
    {
      id: 'prag-indirekt-salz',
      kind: 'single',
      difficulty: 1,
      prompt: l(
        'Welche Äußerung ist ein indirekter Sprechakt?',
        'Which utterance is an indirect speech act?',
      ),
      options: [
        { id: 'a', label: l('„Können Sie mir das Salz geben?“', '“Can you pass me the salt?”') },
        { id: 'b', label: l('„Reichen Sie mir das Salz!“', '“Pass me the salt!”') },
        { id: 'c', label: l('„Ich bitte Sie, mir das Salz zu reichen.“', '“I ask you to pass me the salt.”') },
        { id: 'd', label: l('„Ich behaupte, dass das Salz dort steht.“', '“I assert that the salt is over there.”') },
      ],
      correctId: 'a',
      explanation: l(
        'Die Frageform „Können Sie …?“ wird hier als Bitte verwendet. Wörtliche Form und intendierte Handlung fallen auseinander.',
        'The question form “Can you …?” is used here as a request. Literal form and intended action come apart.',
      ),
    },
    {
      id: 'prag-direkte-aufforderungen',
      kind: 'multiple',
      difficulty: 2,
      prompt: l(
        'Welche Äußerungen sind direkte Aufforderungen?',
        'Which utterances are direct requests?',
      ),
      options: [
        { id: 'a', label: l('„Reichen Sie mir das Salz!“', '“Pass me the salt!”') },
        { id: 'b', label: l('„Ich bitte Sie, mir das Salz zu reichen.“', '“I ask you to pass me the salt.”') },
        { id: 'c', label: l('„Können Sie mir das Salz geben?“', '“Can you pass me the salt?”') },
        { id: 'd', label: l('„Mann, ganz schön stickig hier drin!“', '“Man, it’s really stuffy in here!”') },
      ],
      correctIds: ['a', 'b'],
      explanation: l(
        'Der Imperativ und die explizite Bitte sind direkte Aufforderungen. Die Frage und die Feststellung über die stickige Luft können indirekt als Bitte wirken.',
        'The imperative and the explicit request are direct requests. The question and the remark about the stuffy air can function indirectly as requests.',
      ),
    },
    {
      id: 'prag-stickig',
      kind: 'single',
      difficulty: 2,
      prompt: l(
        'Was kann „Mann, ganz schön stickig hier drin!“ im Kontext bedeuten?',
        'What can “Man, it’s really stuffy in here!” mean in context?',
      ),
      options: [
        {
          id: 'a',
          label: l(
            'Eine Feststellung und/oder eine indirekte Aufforderung, ein Fenster zu öffnen.',
            'A statement and/or an indirect request to open a window.',
          ),
        },
        { id: 'b', label: l('Nur eine Frage.', 'Only a question.') },
        { id: 'c', label: l('Nur einen Eid.', 'Only an oath.') },
        { id: 'd', label: l('Nur eine Lüge.', 'Only a lie.') },
      ],
      correctId: 'a',
      explanation: l(
        'Die Äußerung kann wörtlich als Feststellung über das Raumklima verstanden werden – oder im Kontext als indirekte Bitte, für Luft zu sorgen.',
        'The utterance can be taken literally as a statement about the room’s climate – or, in context, as an indirect request to let in some air.',
      ),
    },
    {
      id: 'prag-tf-indirekt-form',
      kind: 'true-false',
      difficulty: 1,
      prompt: l(
        'Bei einem indirekten Sprechakt fallen wörtliche Form und intendierte Handlung nicht einfach zusammen.',
        'In an indirect speech act, literal form and intended action do not simply coincide.',
      ),
      correct: true,
      explanation: l(
        'Genau das macht den Sprechakt indirekt: Die Frageform kann eine Bitte sein, die Feststellung eine Aufforderung.',
        'That is exactly what makes the speech act indirect: the question form can be a request, the statement a directive.',
      ),
    },
    {
      id: 'prag-voraussetzung-unterscheidung',
      kind: 'single',
      difficulty: 3,
      prompt: l(
        'Was setzt die Unterscheidung zwischen direktem und indirektem Sprechakt voraus?',
        'What does the distinction between direct and indirect speech acts presuppose?',
      ),
      options: [
        {
          id: 'a',
          label: l(
            'Dass wir den wörtlichen Akt und den intendierten illokutionären Akt unterscheiden können.',
            'That we can distinguish the literal act from the intended illocutionary act.',
          ),
        },
        { id: 'b', label: l('Dass alle Äußerungen falsch sind.', 'That all utterances are false.') },
        { id: 'c', label: l('Dass Grammatik und Bedeutung identisch sind.', 'That grammar and meaning are identical.') },
        { id: 'd', label: l('Dass es keine Sprechakte gibt.', 'That there are no speech acts.') },
      ],
      correctId: 'a',
      explanation: l(
        'Die Unterscheidung ergibt nur Sinn, wenn eine Äußerung einen wörtlichen Gehalt hat und zugleich eine andere Handlung intendiert sein kann.',
        'The distinction only makes sense if an utterance has a literal content and can at the same time intend a different action.',
      ),
    },
    {
      id: 'prag-comey-woertlich',
      kind: 'single',
      difficulty: 2,
      prompt: l(
        'Was sagt Trump mit „I hope you can let this go“ wörtlich?',
        'What does Trump literally say with “I hope you can let this go”?',
      ),
      options: [
        { id: 'a', label: l('Er drückt eine Hoffnung aus.', 'He expresses a hope.') },
        { id: 'b', label: l('Er gibt eine ausdrückliche Anweisung.', 'He gives an explicit order.') },
        { id: 'c', label: l('Er stellt eine Frage.', 'He asks a question.') },
        { id: 'd', label: l('Er macht ein Versprechen.', 'He makes a promise.') },
      ],
      correctId: 'a',
      explanation: l(
        'Wörtlich ist es die Äußerung einer Hoffnung. Die entscheidende pragmatische Frage ist, ob damit indirekt eine Aufforderung vollzogen wird.',
        'Literally it is the expression of a hope. The crucial pragmatic question is whether it indirectly performs a directive.',
      ),
    },
    {
      id: 'prag-comey-verstaendnis',
      kind: 'single',
      difficulty: 2,
      prompt: l(
        'Als was verstand FBI-Direktor Comey die Äußerung?',
        'How did FBI director Comey understand the utterance?',
      ),
      options: [
        { id: 'a', label: l('Als Aufforderung, die Untersuchung einzustellen.', 'As a request to stop the investigation.') },
        { id: 'b', label: l('Als Witz.', 'As a joke.') },
        { id: 'c', label: l('Als Frage nach dem Wetter.', 'As a question about the weather.') },
        { id: 'd', label: l('Als Eid.', 'As an oath.') },
      ],
      correctId: 'a',
      explanation: l(
        'Comey gab zu Protokoll, die Äußerung als Aufforderung verstanden zu haben, die FBI-Untersuchungen einzustellen.',
        'Comey stated on the record that he understood the utterance as a request to stop the FBI investigations.',
      ),
    },
    {
      id: 'prag-comey-argumente',
      kind: 'multiple',
      difficulty: 3,
      prompt: l(
        'Welche Argumente stützen die Deutung von „I hope you can let this go“ als Aufforderung?',
        'Which arguments support reading “I hope you can let this go” as a directive?',
      ),
      options: [
        {
          id: 'a',
          label: l(
            'Es war ein privates Gespräch zwischen dem Präsidenten und dem FBI-Direktor.',
            'It was a private conversation between the president and the FBI director.',
          ),
        },
        { id: 'b', label: l('Es bestand ein starkes Machtgefälle.', 'There was a strong power asymmetry.') },
        { id: 'c', label: l('Die Untersuchung betraf Trump selbst.', 'The investigation concerned Trump himself.') },
        {
          id: 'd',
          label: l(
            'Ein bloßer Wunsch wäre in dieser Situation irrelevant gewesen.',
            'A mere wish would have been irrelevant in that situation.',
          ),
        },
        {
          id: 'e',
          label: l(
            'Der Satz enthält das explizite Performativ „order“.',
            'The sentence contains the explicit performative “order”.',
          ),
        },
      ],
      correctIds: ['a', 'b', 'c', 'd'],
      explanation: l(
        'Kontext, Machtverhältnis und Relevanz sprechen für eine indirekte Aufforderung. Ein explizites „I order you“ enthält der Satz gerade nicht – das ermöglicht Bestreitbarkeit.',
        'Context, power relations, and relevance support an indirect directive. The sentence does not contain an explicit “I order you” – which is what makes it deniable.',
      ),
    },
    {
      id: 'prag-tf-comey-grammatik',
      kind: 'true-false',
      difficulty: 2,
      prompt: l(
        '„I hope you can let this go“ ist grammatisch eine explizite Aufforderung.',
        '“I hope you can let this go” is grammatically an explicit directive.',
      ),
      correct: false,
      explanation: l(
        'Der Satz ist ein Aussagesatz mit dem Verb „hope“. Eine Aufforderung wäre erst die pragmatische Interpretation – ein indirekter Sprechakt.',
        'The sentence is a declarative with the verb “hope”. A directive would only be the pragmatic interpretation – an indirect speech act.',
      ),
    },
    {
      id: 'prag-sprechakt-begriff',
      kind: 'free-text',
      difficulty: 1,
      prompt: l(
        'Wie nennt man eine sprachliche Handlung, die mit einer Äußerung vollzogen wird?',
        'What is a linguistic action performed by an utterance called?',
      ),
      accepted: ['Sprechakt', 'Sprechakte', 'speech act', 'speech acts'],
      explanation: l(
        'Man spricht von einem Sprechakt (engl. speech act). Behauptungen, Bitten, Eide und Drohungen sind Beispiele.',
        'It is called a speech act. Assertions, requests, oaths, and threats are examples.',
      ),
    },
    {
      id: 'prag-match-sprechakte',
      kind: 'matching',
      difficulty: 2,
      prompt: l(
        'Ordne jeder Äußerung den passenden Sprechakt zu.',
        'Match each utterance with the appropriate speech act.',
      ),
      pairs: [
        {
          id: 'behauptung',
          left: l('„Ich behaupte, dass es regnet.“', '“I assert that it is raining.”'),
          right: l('Behauptung', 'Assertion'),
        },
        {
          id: 'versprechen',
          left: l('„Ich verspreche dir, morgen zu kommen.“', '“I promise you that I will come tomorrow.”'),
          right: l('Versprechen', 'Promise'),
        },
        {
          id: 'warnung',
          left: l('„Ich warne dich vor dem Hund.“', '“I warn you about the dog.”'),
          right: l('Warnung', 'Warning'),
        },
        {
          id: 'aufforderung',
          left: l('„Reichen Sie mir bitte das Salz!“', '“Please pass me the salt!”'),
          right: l('Aufforderung', 'Request'),
        },
      ],
      explanation: l(
        'Die expliziten Formeln machen den jeweiligen Sprechakt direkt sichtbar: Behauptung, Versprechen, Warnung, Aufforderung.',
        'The explicit formulas make the respective speech act directly visible: assertion, promise, warning, request.',
      ),
    },
    {
      id: 'prag-cloze-sprechakte',
      kind: 'cloze',
      difficulty: 1,
      prompt: l(
        'Vervollständige die sprechakttheoretische Sichtweise.',
        'Complete the speech-act perspective.',
      ),
      segments: [
        { type: 'text', value: l('In der Pragmatik betrachten wir Äußerungen als sprachliche ', 'In pragmatics we regard utterances as linguistic ') },
        { type: 'blank', accepted: ['Handlungen', 'actions'], width: 104 },
        { type: 'text', value: l(', die gelingen oder ', ', which can succeed or ') },
        { type: 'blank', accepted: ['misslingen', 'fail'], width: 88 },
        { type: 'text', value: l(' können.', '.') },
      ],
      explanation: l(
        'Sprechakte werden nicht primär auf Wahrheit, sondern auf ihr Gelingen oder Misslingen hin befragt.',
        'Speech acts are assessed primarily for success or failure, not for truth.',
      ),
    },
    {
      id: 'prag-card-indirekt',
      kind: 'flashcard',
      difficulty: 2,
      prompt: l(
        'Was ist ein indirekter Sprechakt?',
        'What is an indirect speech act?',
      ),
      back: l(
        'Ein Sprechakt, bei dem die wörtliche Form nicht der intendierten Handlung entspricht. Beispiel: „Können Sie mir das Salz geben?“ ist wörtlich eine Frage, wird aber als Bitte verstanden.',
        'A speech act in which the literal form does not match the intended action. Example: “Can you pass me the salt?” is literally a question but is understood as a request.',
      ),
    },
    {
      id: 'prag-direkt-versprechen',
      kind: 'single',
      difficulty: 1,
      prompt: l(
        'Welche Äußerung ist ein direkter Sprechakt?',
        'Which utterance is a direct speech act?',
      ),
      options: [
        { id: 'a', label: l('„Ich verspreche dir, pünktlich zu sein.“', '“I promise you that I will be on time.”') },
        { id: 'b', label: l('„Kannst du mir helfen?“', '“Can you help me?”') },
        { id: 'c', label: l('„Es zieht hier.“', '“There’s a draught in here.”') },
        { id: 'd', label: l('„Ist das Salz da?“', '“Is the salt over there?”') },
      ],
      correctId: 'a',
      explanation: l(
        'Das explizite Performativ „ich verspreche“ macht das Versprechen direkt. Die anderen Äußerungen können indirekt als Bitte oder Aufforderung wirken.',
        'The explicit performative “I promise” makes the promise direct. The other utterances can function indirectly as requests or directives.',
      ),
    },
    {
      id: 'prag-tf-institutionell',
      kind: 'true-false',
      difficulty: 2,
      prompt: l(
        'Ob ein Sprechakt gelingt, hängt auch von institutionellen und sozialen Bedingungen ab.',
        'Whether a speech act succeeds also depends on institutional and social conditions.',
      ),
      correct: true,
      explanation: l(
        'Ein Eid, eine Trauung oder eine Beförderung gelingen nur, wenn die passenden institutionellen und sozialen Voraussetzungen erfüllt sind.',
        'An oath, a wedding, or a promotion succeeds only if the relevant institutional and social conditions are met.',
      ),
    },
  ],
};
