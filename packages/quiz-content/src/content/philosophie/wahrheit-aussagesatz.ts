import type { QuizTopic } from '../../types.ts';

import { l } from '../helpers';

export const philWahrheit: QuizTopic = {
  id: 'phil-wahrheit-aussagesatz',
  title: l('Wahrheit, Aussagesatz & reine Begriffe', 'Truth, declarative sentences & pure concepts'),
  meeting: l('Erste Vorlesung · 19. Oktober 2026', 'First lecture · 19 October 2026'),
  summary: l(
    'Warum Wahrheit und Erkenntnis immer schon vorausgesetzt sind, was einen Aussagesatz ausmacht und warum Sein und Wahrheit reine gegebene Begriffe sind.',
    'Why truth and knowledge are always already presupposed, what makes a declarative sentence, and why being and truth are pure given concepts.',
  ),
  source: l(
    'Einführung in die Geschichte der Philosophie · Die Geschichtlichkeit der Philosophie',
    'Introduction to the History of Philosophy · The historicity of philosophy',
  ),
  questions: [
    {
      id: 'phil-voraussetzung-philosophieren',
      kind: 'single',
      difficulty: 2,
      prompt: l(
        'Was setzt voraus, wer sich für Philosophie interessiert?',
        'What does someone interested in philosophy presuppose?',
      ),
      options: [
        {
          id: 'a',
          label: l(
            'Dass philosophische Erkenntnis immerhin möglich ist.',
            'That philosophical knowledge is at least possible.',
          ),
        },
        {
          id: 'b',
          label: l('Dass alle philosophischen Fragen bereits beantwortet sind.', 'That all philosophical questions are already answered.'),
        },
        {
          id: 'c',
          label: l('Dass es keinen Unterschied zwischen Wahrheit und Falschheit gibt.', 'That there is no difference between truth and falsity.'),
        },
        {
          id: 'd',
          label: l('Dass Philosophie nur aus Meinungen besteht.', 'That philosophy consists only of opinions.'),
        },
      ],
      correctId: 'a',
      explanation: l(
        'Wer an Philosophie interessiert ist, hält philosophische Erkenntnis immerhin für möglich. Das ist die Ausgangsvoraussetzung des Philosophierens.',
        'Anyone interested in philosophy considers philosophical knowledge at least possible. That is the starting presupposition of philosophising.',
      ),
    },
    {
      id: 'phil-meinung-gedanke',
      kind: 'single',
      difficulty: 2,
      prompt: l(
        'Worin unterscheiden sich bloße Meinungen von philosophischen Gedanken?',
        'How do mere opinions differ from philosophical thoughts?',
      ),
      options: [
        {
          id: 'a',
          label: l(
            'Meinungen sind subjektiv und nicht verallgemeinerbar; philosophische Gedanken sind allgemein und wahrheitsfähig.',
            'Opinions are subjective and not universalisable; philosophical thoughts are general and capable of truth.',
          ),
        },
        {
          id: 'b',
          label: l('Meinungen sind immer wahr; philosophische Gedanken sind immer falsch.', 'Opinions are always true; philosophical thoughts are always false.'),
        },
        {
          id: 'c',
          label: l('Meinungen sind allgemein; philosophische Gedanken sind privat.', 'Opinions are general; philosophical thoughts are private.'),
        },
        {
          id: 'd',
          label: l('Es gibt keinen Unterschied.', 'There is no difference.'),
        },
      ],
      correctId: 'a',
      explanation: l(
        'Eine Meinung ist eine subjektive Vorstellung, die ich so oder anders haben kann. Philosophische Gedanken sind allgemein und damit zumindest wahrheitsfähig.',
        'An opinion is a subjective representation that I can have this way or otherwise. Philosophical thoughts are general and therefore at least capable of truth.',
      ),
    },
    {
      id: 'phil-skeptiker',
      kind: 'single',
      difficulty: 2,
      prompt: l('Was bezweifelt der Skeptiker?', 'What does the sceptic doubt?'),
      options: [
        {
          id: 'a',
          label: l(
            'Dass wir wissen können, welche Gedanken wahr und welche falsch sind.',
            'That we can know which thoughts are true and which are false.',
          ),
        },
        {
          id: 'b',
          label: l('Dass es überhaupt einen Unterschied zwischen Wahrheit und Falschheit gibt.', 'That there is any difference between truth and falsity at all.'),
        },
        {
          id: 'c',
          label: l('Dass Sätze eine Bedeutung haben.', 'That sentences have meaning.'),
        },
        {
          id: 'd',
          label: l('Dass es Sprache gibt.', 'That language exists.'),
        },
      ],
      correctId: 'a',
      explanation: l(
        'Der Skeptiker bezweifelt, dass wir wissen können, welche Gedanken wahr und welche falsch sind. Den Unterschied von Wahrheit und Falschheit selbst muss er dabei voraussetzen.',
        'The sceptic doubts that we can know which thoughts are true and which are false. In doing so, he must still presuppose the distinction between truth and falsity.',
      ),
    },
    {
      id: 'phil-skeptiker-voraussetzung',
      kind: 'single',
      difficulty: 3,
      prompt: l(
        'Was setzt selbst der Skeptiker voraus, wenn er seine Zweifel formuliert?',
        'What does even the sceptic presuppose when formulating his doubts?',
      ),
      options: [
        {
          id: 'a',
          label: l('Den Unterschied von Wahrheit und Falschheit.', 'The distinction between truth and falsity.'),
        },
        {
          id: 'b',
          label: l('Dass alle Gedanken wahr sind.', 'That all thoughts are true.'),
        },
        {
          id: 'c',
          label: l('Dass es keine formalen Eigenschaften von Gedanken gibt.', 'That there are no formal properties of thoughts.'),
        },
        {
          id: 'd',
          label: l('Dass Philosophie überflüssig ist.', 'That philosophy is superfluous.'),
        },
      ],
      correctId: 'a',
      explanation: l(
        'Sonst könnte der Skeptiker nicht einmal bezweifeln, dass wir wissen können, welche Gedanken wahr sind. Der Unterschied von Wahrheit und Falschheit ist unbezweifelbar.',
        'Otherwise the sceptic could not even doubt that we can know which thoughts are true. The distinction between truth and falsity is undeniable.',
      ),
    },
    {
      id: 'phil-formale-eigenschaften',
      kind: 'single',
      difficulty: 3,
      prompt: l(
        'Was lässt sich nicht bezweifeln, ohne die Möglichkeit des Denkens und Sprechens aufzuheben?',
        'What cannot be doubted without abolishing the possibility of thinking and speaking?',
      ),
      options: [
        {
          id: 'a',
          label: l(
            'Die formalen Eigenschaften, die wahre und falsche Gedanken unabhängig vom Inhalt gemeinsam haben.',
            'The formal properties that true and false thoughts share independently of their content.',
          ),
        },
        {
          id: 'b',
          label: l('Die Inhalte aller einzelnen Wissenschaften.', 'The contents of all individual sciences.'),
        },
        {
          id: 'c',
          label: l('Die Meinungen einzelner Personen.', 'The opinions of individual persons.'),
        },
        {
          id: 'd',
          label: l('Die Geschichte der Philosophie.', 'The history of philosophy.'),
        },
      ],
      correctId: 'a',
      explanation: l(
        'Die formalen Eigenschaften wahrer und falscher Gedanken und Sätze sind inhaltsunabhängig. Wer sie bezweifelt, hebt die Möglichkeit des Denkens und Sprechens auf.',
        'The formal properties of true and false thoughts and sentences are independent of content. Doubting them abolishes the possibility of thinking and speaking.',
      ),
    },
    {
      id: 'phil-nicht-gegenstaendlich',
      kind: 'single',
      difficulty: 3,
      prompt: l(
        'Wie charakterisiert die Vorlesung die Philosophie, insofern sie bei der Form von Gedanken und Sätzen ansetzt?',
        'How does the lecture characterise philosophy insofar as it starts from the form of thoughts and sentences?',
      ),
      options: [
        {
          id: 'a',
          label: l(
            'Als nicht-gegenständliches, nicht-dogmatisches Wissen von unbezweifelbaren Voraussetzungen des Denkens und Sprechens.',
            'As non-objectual, non-dogmatic knowledge of undeniable presuppositions of thinking and speaking.',
          ),
        },
        {
          id: 'b',
          label: l('Als empirische Naturwissenschaft.', 'As an empirical natural science.'),
        },
        {
          id: 'c',
          label: l('Als Sammlung subjektiver Meinungen.', 'As a collection of subjective opinions.'),
        },
        {
          id: 'd',
          label: l('Als bloße Sprachgeschichte.', 'As mere history of language.'),
        },
      ],
      correctId: 'a',
      explanation: l(
        'Philosophie ist in dieser Hinsicht nicht gegenständliches, nicht-dogmatisches Wissen von den unbezweifelbaren Voraussetzungen des Denkens und Sprechens.',
        'In this respect philosophy is non-objectual, non-dogmatic knowledge of the undeniable presuppositions of thinking and speaking.',
      ),
    },
    {
      id: 'phil-logos-apophantikos',
      kind: 'single',
      difficulty: 2,
      prompt: l('Was bedeutet griechisch „lógos apophantikós“?', 'What does Greek “lógos apophantikós” mean?'),
      options: [
        {
          id: 'a',
          label: l('Satz, der etwas sehen lässt – der Aussagesatz.', 'A sentence that lets something be seen – the declarative sentence.'),
        },
        { id: 'b', label: l('Bitte oder Aufforderung.', 'Request or command.') },
        { id: 'c', label: l('Gedicht.', 'Poem.') },
        { id: 'd', label: l('Definition.', 'Definition.') },
      ],
      correctId: 'a',
      explanation: l(
        'lógos apophantikós heißt wörtlich „Satz, der etwas sehen lässt“. Gemeint ist der Aussagesatz, dem Wahr- oder Falschsein zukommt.',
        'Lógos apophantikós literally means “sentence that lets something be seen”. It refers to the declarative sentence, to which being true or false applies.',
      ),
    },
    {
      id: 'phil-aussagesatz-wahr',
      kind: 'single',
      difficulty: 1,
      prompt: l(
        'Welche Sätze lassen nach Aristoteles etwas sehen?',
        'Which sentences, according to Aristotle, let something be seen?',
      ),
      options: [
        {
          id: 'a',
          label: l(
            'Nur solche Sätze, denen das Wahr- oder Falschsein zukommt.',
            'Only sentences to which being true or false applies.',
          ),
        },
        { id: 'b', label: l('Alle Sätze, auch Bitten und Fragen.', 'All sentences, including requests and questions.') },
        { id: 'c', label: l('Nur Gedichte.', 'Only poems.') },
        { id: 'd', label: l('Nur Sätze mit mehreren Wörtern.', 'Only sentences with several words.') },
      ],
      correctId: 'a',
      explanation: l(
        'Aristoteles: Jeder Satz hat Bedeutung, aber nur die Sätze lassen etwas sehen, denen Wahr- oder Falschsein zukommt. Eine Bitte ist ein Satz, aber weder wahr noch falsch.',
        'Aristotle: every sentence has meaning, but only sentences to which being true or false applies let something be seen. A request is a sentence but neither true nor false.',
      ),
    },
    {
      id: 'phil-schema-aussagesatz',
      kind: 'single',
      difficulty: 1,
      prompt: l(
        'Wie lautet das Schema der allgemeinen Form des Aussagesatzes?',
        'What is the schema of the general form of the declarative sentence?',
      ),
      options: [
        { id: 'a', label: l('X ist Y – Etwas ist so und so.', 'X is Y – something is thus and so.') },
        { id: 'b', label: l('X soll Y.', 'X ought to Y.') },
        { id: 'c', label: l('X, bitte Y!', 'X, please Y!') },
        { id: 'd', label: l('X oder Y?', 'X or Y?') },
      ],
      correctId: 'a',
      explanation: l(
        'Der Aussagesatz hat die Form „X ist Y“ bzw. „Etwas ist so und so“. Darin liegen die Begriffe Sein und Wahrheit.',
        'The declarative sentence has the form “X is Y” or “something is thus and so”. The concepts of being and truth lie within it.',
      ),
    },
    {
      id: 'phil-begriff-gegenstand',
      kind: 'single',
      difficulty: 2,
      prompt: l(
        'Worin unterscheiden sich Begriff und Einzelding?',
        'How do a concept and an individual thing differ?',
      ),
      options: [
        {
          id: 'a',
          label: l(
            'Bei Begriffen kann man sinnvoll fragen, was oder wie viel darunter fällt; bei Einzeldingen nicht.',
            'With concepts one can sensibly ask what or how many fall under them; with individual things one cannot.',
          ),
        },
        {
          id: 'b',
          label: l('Begriffe sind immer empirisch, Einzeldinge immer rein.', 'Concepts are always empirical, individual things always pure.'),
        },
        {
          id: 'c',
          label: l('Einzeldinge sind allgemeiner als Begriffe.', 'Individual things are more general than concepts.'),
        },
        {
          id: 'd',
          label: l('Es gibt keinen Unterschied.', 'There is no difference.'),
        },
      ],
      correctId: 'a',
      explanation: l(
        'Unter „Stadt“ oder „Bundeskanzler“ fällt etwas; bei „Stuttgart“ kann man nicht sinnvoll fragen, was darunterfällt.',
        'Things fall under “city” or “chancellor”; with “Stuttgart” one cannot sensibly ask what falls under it.',
      ),
    },
    {
      id: 'phil-reine-begriffe',
      kind: 'single',
      difficulty: 2,
      prompt: l(
        'Woher gewinnen wir reine (apriorische) Begriffe?',
        'Where do we get pure (a priori) concepts from?',
      ),
      options: [
        { id: 'a', label: l('Aus unserem Denken allein.', 'From our thinking alone.') },
        { id: 'b', label: l('Aus Wahrnehmungen und Beobachtungen.', 'From perceptions and observations.') },
        { id: 'c', label: l('Aus statistischen Erhebungen.', 'From statistical surveys.') },
        { id: 'd', label: l('Aus politischen Entscheidungen.', 'From political decisions.') },
      ],
      correctId: 'a',
      explanation: l(
        'Empirische Begriffe gewinnen wir auf der Grundlage von Wahrnehmungen; reine Begriffe entspringen unserem Denken allein.',
        'We gain empirical concepts on the basis of perceptions; pure concepts arise from our thinking alone.',
      ),
    },
    {
      id: 'phil-gegeben-gemacht',
      kind: 'single',
      difficulty: 3,
      prompt: l(
        'Was sind reine gegebene Begriffe?',
        'What are pure given concepts?',
      ),
      options: [
        {
          id: 'a',
          label: l(
            'Begriffe, die unser Denken und Sprechen immer schon durchziehen, ohne dass wir sie bewusst gebildet hätten.',
            'Concepts that always already pervade our thinking and speaking without our having consciously formed them.',
          ),
        },
        {
          id: 'b',
          label: l('Begriffe, die wir bewusst durch Definitionen erzeugen.', 'Concepts that we consciously produce through definitions.'),
        },
        {
          id: 'c',
          label: l('Begriffe, die nur in einer einzelnen Sprache vorkommen.', 'Concepts that occur in only one language.'),
        },
        {
          id: 'd',
          label: l('Begriffe, die durch Experimente entstehen.', 'Concepts that arise through experiments.'),
        },
      ],
      correctId: 'a',
      explanation: l(
        'Reine gegebene Begriffe wie Sein, Wahrheit, Eines und Vieles oder Raum und Zeit liegen all unserem Denken und Sprechen zugrunde.',
        'Pure given concepts such as being, truth, one and many, or space and time underlie all our thinking and speaking.',
      ),
    },
    {
      id: 'phil-reine-gegebene-beispiele',
      kind: 'multiple',
      difficulty: 2,
      prompt: l(
        'Welche Begriffe sind reine gegebene Begriffe?',
        'Which concepts are pure given concepts?',
      ),
      options: [
        { id: 'sein', label: l('Sein', 'Being') },
        { id: 'wahrheit', label: l('Wahrheit', 'Truth') },
        { id: 'eines', label: l('Eines und Vieles', 'One and many') },
        { id: 'raum', label: l('Raum und Zeit', 'Space and time') },
        { id: 'tausendeck', label: l('Tausendeck', 'Myriagon') },
        { id: 'corona', label: l('Coronavirus', 'Coronavirus') },
        { id: 'ki', label: l('Künstliche Intelligenz', 'Artificial intelligence') },
      ],
      correctIds: ['sein', 'wahrheit', 'eines', 'raum'],
      explanation: l(
        'Sein, Wahrheit, Eines und Vieles sowie Raum und Zeit sind reine gegebene Begriffe. Tausendeck, Coronavirus und KI sind gemachte Begriffe.',
        'Being, truth, one and many, and space and time are pure given concepts. Myriagon, coronavirus, and AI are made concepts.',
      ),
    },
    {
      id: 'phil-gemachte-beispiele',
      kind: 'multiple',
      difficulty: 2,
      prompt: l(
        'Welche Begriffe sind gemachte Begriffe?',
        'Which concepts are made concepts?',
      ),
      options: [
        { id: 'tausendeck', label: l('Tausendeck', 'Myriagon') },
        { id: 'corona', label: l('Coronavirus', 'Coronavirus') },
        { id: 'ki', label: l('Künstliche Intelligenz', 'Artificial intelligence') },
        { id: 'sein', label: l('Sein', 'Being') },
        { id: 'wahrheit', label: l('Wahrheit', 'Truth') },
        { id: 'eines', label: l('Eines und Vieles', 'One and many') },
      ],
      correctIds: ['tausendeck', 'corona', 'ki'],
      explanation: l(
        'Gemachte Begriffe sind bewusst gebildet. Sein, Wahrheit und Eines und Vieles sind dagegen reine gegebene Begriffe.',
        'Made concepts are consciously formed. Being, truth, and one and many, by contrast, are pure given concepts.',
      ),
    },
    {
      id: 'phil-aussagesaetze-beispiele',
      kind: 'multiple',
      difficulty: 1,
      prompt: l(
        'Welche der folgenden Sätze sind Aussagesätze?',
        'Which of the following sentences are declarative sentences?',
      ),
      options: [
        { id: 'fenster', label: l('Das Fenster ist offen.', 'The window is open.') },
        { id: 'stuttgart', label: l('Stuttgart ist eine Stadt.', 'Stuttgart is a city.') },
        { id: 'wasser', label: l('Wasser ist H2O.', 'Water is H2O.') },
        { id: 'gott', label: l('Gott ist tot.', 'God is dead.') },
        { id: 'bitte', label: l('Bitte öffne das Fenster!', 'Please open the window!') },
      ],
      correctIds: ['fenster', 'stuttgart', 'wasser', 'gott'],
      explanation: l(
        'Aussagesätze sind wahr oder falsch. Eine Bitte ist ein Satz, aber weder wahr noch falsch.',
        'Declarative sentences are true or false. A request is a sentence but neither true nor false.',
      ),
    },
    {
      id: 'phil-form-begriffe',
      kind: 'multiple',
      difficulty: 3,
      prompt: l(
        'Welche Begriffe sind in der Form des Aussagesatzes „X ist Y“ enthalten?',
        'Which concepts are contained in the form of the declarative sentence “X is Y”?',
      ),
      options: [
        { id: 'sein', label: l('Sein', 'Being') },
        { id: 'wahrheit', label: l('Wahrheit', 'Truth') },
        { id: 'ursache', label: l('Kausalität', 'Causality') },
        { id: 'substanz', label: l('Substanz', 'Substance') },
      ],
      correctIds: ['sein', 'wahrheit'],
      explanation: l(
        '„X ist Y“ enthält den Begriff des Seins; die Umformung „Es ist wahr, dass X Y ist“ enthält den Begriff der Wahrheit.',
        '“X is Y” contains the concept of being; the transformation “it is true that X is Y” contains the concept of truth.',
      ),
    },
    {
      id: 'phil-tf-meinungen-allgemein',
      kind: 'true-false',
      difficulty: 2,
      prompt: l(
        'Bloße Meinungen sind allgemein und verallgemeinerbar.',
        'Mere opinions are general and universalisable.',
      ),
      correct: false,
      explanation: l(
        'Meinungen sind subjektiv: Ich kann sie so oder anders haben, ein anderer anders. Philosophische Gedanken sind allgemein.',
        'Opinions are subjective: I can have them this way or otherwise, and someone else differently. Philosophical thoughts are general.',
      ),
    },
    {
      id: 'phil-tf-skeptiker-differenz',
      kind: 'true-false',
      difficulty: 2,
      prompt: l(
        'Der Skeptiker kann bezweifeln, dass es überhaupt einen Unterschied zwischen Wahrheit und Falschheit gibt.',
        'The sceptic can doubt that there is any difference between truth and falsity at all.',
      ),
      correct: false,
      explanation: l(
        'Der Skeptiker kann nur bezweifeln, welche Gedanken wahr sind. Den Unterschied von Wahrheit und Falschheit muss er voraussetzen.',
        'The sceptic can only doubt which thoughts are true. He must presuppose the distinction between truth and falsity.',
      ),
    },
    {
      id: 'phil-tf-bitte',
      kind: 'true-false',
      difficulty: 1,
      prompt: l('Eine Bitte ist ein Aussagesatz.', 'A request is a declarative sentence.'),
      correct: false,
      explanation: l(
        'Eine Bitte ist ein Satz, aber weder wahr noch falsch. Aussagesätze sind dadurch bestimmt, dass ihnen Wahr- oder Falschsein zukommt.',
        'A request is a sentence but neither true nor false. Declarative sentences are defined by being true or false.',
      ),
    },
    {
      id: 'phil-tf-stuttgart-begriff',
      kind: 'true-false',
      difficulty: 2,
      prompt: l('„Stuttgart“ ist ein Begriff, kein Einzelding.', '“Stuttgart” is a concept, not an individual thing.'),
      correct: false,
      explanation: l(
        'Stuttgart ist ein Einzelding. Bei ihm kann man nicht sinnvoll fragen, was darunterfällt.',
        'Stuttgart is an individual thing. One cannot sensibly ask what falls under it.',
      ),
    },
    {
      id: 'phil-tf-coronavirus',
      kind: 'true-false',
      difficulty: 1,
      prompt: l('„Coronavirus“ ist ein gemachter Begriff.', '“Coronavirus” is a made concept.'),
      correct: true,
      explanation: l(
        'Coronavirus ist ein bewusst gebildeter Begriff und damit ein gemachter Begriff.',
        'Coronavirus is a consciously formed concept and therefore a made concept.',
      ),
    },
    {
      id: 'phil-ft-logos',
      kind: 'free-text',
      difficulty: 2,
      prompt: l(
        'Wie lautet der griechische Ausdruck für den Aussagesatz?',
        'What is the Greek term for the declarative sentence?',
      ),
      accepted: ['lógos apophantikós', 'logos apophantikos', 'lógos apophantikos', 'logos apophantikós'],
      hint: l('Wörtlich: Satz, der etwas sehen lässt.', 'Literally: a sentence that lets something be seen.'),
      explanation: l('lógos apophantikós.', 'lógos apophantikós.'),
    },
    {
      id: 'phil-ft-aristoteles',
      kind: 'free-text',
      difficulty: 2,
      prompt: l(
        'Wer schrieb „Über den Satz“ (Perí hermeneías)?',
        'Who wrote “On Interpretation” (Perí hermeneías)?',
      ),
      accepted: ['Aristoteles', 'Aristotle'],
      hint: l('384–322 v. Chr.', '384–322 BC.'),
      explanation: l('Aristoteles.', 'Aristotle.'),
    },
    {
      id: 'phil-ft-kant',
      kind: 'free-text',
      difficulty: 2,
      prompt: l(
        'Welcher Philosoph unterscheidet reine gegebene und gemachte Begriffe?',
        'Which philosopher distinguishes pure given and made concepts?',
      ),
      accepted: ['Kant', 'Immanuel Kant'],
      hint: l('Kritik der reinen Vernunft, A728/B756.', 'Critique of Pure Reason, A728/B756.'),
      explanation: l('Immanuel Kant.', 'Immanuel Kant.'),
    },
    {
      id: 'phil-ft-sein-wahrheit',
      kind: 'free-text',
      difficulty: 3,
      prompt: l(
        'Nenne die zwei allgemeinsten Begriffe, die in der Form des Aussagesatzes enthalten sind.',
        'Name the two most general concepts contained in the form of the declarative sentence.',
      ),
      accepted: ['Sein und Wahrheit', 'Being and truth', 'Wahrheit und Sein', 'Truth and being'],
      keywords: [
        ['sein', 'being'],
        ['wahrheit', 'truth'],
      ],
      explanation: l(
        'Sein und Wahrheit sind die beiden Begriffe, die in „X ist Y“ bzw. „Es ist wahr, dass X Y ist“ enthalten sind.',
        'Being and truth are the two concepts contained in “X is Y” and “it is true that X is Y” respectively.',
      ),
    },
    {
      id: 'phil-match-theoretiker',
      kind: 'matching',
      difficulty: 3,
      prompt: l(
        'Ordne den Denkern ihren Beitrag zu.',
        'Match each thinker with their contribution.',
      ),
      pairs: [
        {
          id: 'aristotle',
          left: l('Aristoteles', 'Aristotle'),
          right: l('lógos apophantikós', 'lógos apophantikós'),
        },
        {
          id: 'kant',
          left: l('Kant', 'Kant'),
          right: l('reine gegebene vs. gemachte Begriffe', 'pure given vs. made concepts'),
        },
        {
          id: 'wittgenstein',
          left: l('Wittgenstein', 'Wittgenstein'),
          right: l('formale Begriffe', 'formal concepts'),
        },
        {
          id: 'middleages',
          left: l('Mittelalter', 'Middle Ages'),
          right: l('Transzendentalien', 'transcendentals'),
        },
      ],
      explanation: l(
        'Aristoteles bestimmt den Aussagesatz; Kant unterscheidet gegebene und gemachte Begriffe; Wittgenstein spricht von formalen Begriffen; das Mittelalter von Transzendentalien.',
        'Aristotle defines the declarative sentence; Kant distinguishes given and made concepts; Wittgenstein speaks of formal concepts; the Middle Ages of transcendentals.',
      ),
    },
    {
      id: 'phil-cloze-wahr',
      kind: 'cloze',
      difficulty: 2,
      prompt: l(
        'Vervollständige die Umformung des Aussagesatzes.',
        'Complete the transformation of the declarative sentence.',
      ),
      segments: [
        { type: 'text', value: l('X ist Y ⇔ Es ist ', 'X is Y ⇔ it is ') },
        { type: 'blank', accepted: ['wahr', 'true'], width: 90 },
        { type: 'text', value: l(', dass X Y ist.', ', that X is Y.') },
      ],
      explanation: l(
        'Jeder Aussagesatz enthält einen Bezug auf den Wahrheitsbegriff: „Es ist wahr, dass X Y ist.“',
        'Every declarative sentence contains a reference to the concept of truth: “It is true that X is Y.”',
      ),
    },
    {
      id: 'phil-cloze-begriffen',
      kind: 'cloze',
      difficulty: 2,
      prompt: l(
        'Vervollständige den Unterschied zwischen Begriff und Einzelding.',
        'Complete the distinction between concept and individual thing.',
      ),
      segments: [
        { type: 'text', value: l('Bei ', 'With ') },
        { type: 'blank', accepted: ['Begriffen', 'begriffen', 'concepts'], width: 120 },
        {
          type: 'text',
          value: l(
            ' kann man sinnvoll fragen, was darunter fällt; bei Einzeldingen nicht.',
            ' one can sensibly ask what falls under them; with individual things one cannot.',
          ),
        },
      ],
      explanation: l(
        'Begriffe wie „Stadt“ haben einen Umfang; Einzeldinge wie „Stuttgart“ nicht.',
        'Concepts such as “city” have an extension; individual things such as “Stuttgart” do not.',
      ),
    },
    {
      id: 'phil-cloze-reine',
      kind: 'cloze',
      difficulty: 2,
      prompt: l(
        'Vervollständige die Unterscheidung der Begriffe.',
        'Complete the distinction between concepts.',
      ),
      segments: [
        { type: 'blank', accepted: ['Reine', 'reine', 'Pure', 'pure'], width: 96 },
        {
          type: 'text',
          value: l(
            ' Begriffe entspringen unserem Denken allein.',
            ' concepts arise from our thinking alone.',
          ),
        },
      ],
      explanation: l(
        'Reine (apriorische) Begriffe entspringen dem Denken; empirische Begriffe beruhen auf Wahrnehmung und Beobachtung.',
        'Pure (a priori) concepts arise from thought; empirical concepts rest on perception and observation.',
      ),
    },
    {
      id: 'phil-card-aussagesatz',
      kind: 'flashcard',
      difficulty: 2,
      prompt: l('Was ist ein Aussagesatz?', 'What is a declarative sentence?'),
      back: l(
        'Ein Satz, dem Wahr- oder Falschsein zukommt – nach Aristoteles ein lógos apophantikós, ein Satz, der etwas sehen lässt.',
        'A sentence to which being true or false applies – for Aristotle a lógos apophantikós, a sentence that lets something be seen.',
      ),
    },
    {
      id: 'phil-card-gegeben-gemacht',
      kind: 'flashcard',
      difficulty: 3,
      prompt: l(
        'Was unterscheidet reine gegebene von gemachten Begriffen?',
        'What distinguishes pure given concepts from made concepts?',
      ),
      back: l(
        'Reine gegebene Begriffe durchziehen unser Denken und Sprechen immer schon, ohne dass wir sie bewusst gebildet haben. Gemachte Begriffe sind bewusst gebildet.',
        'Pure given concepts always already pervade our thinking and speaking without our having consciously formed them. Made concepts are consciously formed.',
      ),
    },
  ],
};
