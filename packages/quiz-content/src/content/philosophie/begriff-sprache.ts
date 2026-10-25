import type { QuizTopic } from '../../types.ts';

import { l } from '../helpers';

export const philBegriffSprache: QuizTopic = {
  id: 'phil-begriff-sprache',
  title: l(
    'Begriffsklärung, Sprache & Geschichtlichkeit',
    'Conceptual clarification, language & historicity',
  ),
  meeting: l('Erste Vorlesung · 19. Oktober 2026', 'First lecture · 19 October 2026'),
  summary: l(
    'Warum reine Begriffe trotz ihrer Unbezweifelbarkeit unklar sind, was Klarheit und Deutlichkeit unterscheidet und warum die Sprachlichkeit der tiefere Grund der Geschichtlichkeit der Philosophie ist.',
    'Why pure concepts remain unclear despite being undeniable, what distinguishes clarity from distinctness, and why linguisticity is the deeper ground of philosophy’s historicity.',
  ),
  source: l(
    'Einführung in die Geschichte der Philosophie · Die Geschichtlichkeit der Philosophie',
    'Introduction to the History of Philosophy · The historicity of philosophy',
  ),
  questions: [
    {
      id: 'phil-formale-unbezweifelbar',
      kind: 'single',
      difficulty: 2,
      prompt: l(
        'Warum sind formale Begriffe unbezweifelbar?',
        'Why are formal concepts undeniable?',
      ),
      options: [
        {
          id: 'a',
          label: l(
            'Weil sie Voraussetzungen allen Denkens und Sprechens sind.',
            'Because they are presuppositions of all thinking and speaking.',
          ),
        },
        {
          id: 'b',
          label: l('Weil sie durch Experimente bewiesen werden.', 'Because they are proved by experiments.'),
        },
        {
          id: 'c',
          label: l('Weil sie in jedem Wörterbuch stehen.', 'Because they appear in every dictionary.'),
        },
        {
          id: 'd',
          label: l('Weil sie von jeder Generation neu erfunden werden.', 'Because every generation invents them anew.'),
        },
      ],
      correctId: 'a',
      explanation: l(
        'Formale Begriffe wie Sein und Wahrheit sind Voraussetzungen allen Denkens und Sprechens; ohne sie wäre Denken und Sprechen nicht möglich.',
        'Formal concepts such as being and truth are presuppositions of all thinking and speaking; without them thinking and speaking would not be possible.',
      ),
    },
    {
      id: 'phil-formale-unklar',
      kind: 'single',
      difficulty: 3,
      prompt: l(
        'Warum sind uns formale Begriffe trotz ihrer Unbezweifelbarkeit von Haus aus unklar?',
        'Why are formal concepts unclear from the outset despite being undeniable?',
      ),
      options: [
        {
          id: 'a',
          label: l(
            'Weil sie unser Denken und Sprechen immer schon durchziehen, ohne dass wir sie bewusst gebildet haben.',
            'Because they always already pervade our thinking and speaking without our having consciously formed them.',
          ),
        },
        {
          id: 'b',
          label: l('Weil sie nur in fremden Sprachen vorkommen.', 'Because they occur only in foreign languages.'),
        },
        {
          id: 'c',
          label: l('Weil sie empirisch gemessen werden müssen.', 'Because they must be measured empirically.'),
        },
        {
          id: 'd',
          label: l('Weil sie erst im 20. Jahrhundert entstanden sind.', 'Because they arose only in the twentieth century.'),
        },
      ],
      correctId: 'a',
      explanation: l(
        'Gerade weil diese Begriffe immer schon mitlaufen, sind sie und ihre Verhältnisse zunächst unklar und verworren – wie Augustinus am Begriff der Zeit zeigt.',
        'Precisely because these concepts always already run along with us, they and their relations are initially unclear and confused – as Augustine shows with the concept of time.',
      ),
    },
    {
      id: 'phil-aufgabe-philosophie',
      kind: 'single',
      difficulty: 2,
      prompt: l(
        'Was ist nach der Vorlesung die Aufgabe der Philosophie?',
        'What is the task of philosophy according to the lecture?',
      ),
      options: [
        {
          id: 'a',
          label: l(
            'Die Klärung reiner gegebener Begriffe, die wir in uns und in unserem Sprachgebrauch vorfinden.',
            'The clarification of pure given concepts that we find in ourselves and in our use of language.',
          ),
        },
        {
          id: 'b',
          label: l('Die Vermehrung möglichst vieler Meinungen.', 'The multiplication of as many opinions as possible.'),
        },
        {
          id: 'c',
          label: l('Die Abschaffung der Sprache.', 'The abolition of language.'),
        },
        {
          id: 'd',
          label: l('Die Ersetzung der Philosophie durch Mathematik.', 'The replacement of philosophy by mathematics.'),
        },
      ],
      correctId: 'a',
      explanation: l(
        'Philosophie klärt die reinen gegebenen Begriffe, die unser Denken und Sprechen immer schon durchziehen.',
        'Philosophy clarifies the pure given concepts that always already pervade our thinking and speaking.',
      ),
    },
    {
      id: 'phil-augustinus',
      kind: 'single',
      difficulty: 2,
      prompt: l(
        'Welcher Denker dient als Beispiel für die Unklarheit eines alltäglich vertrauten Begriffs (der Zeit)?',
        'Which thinker serves as an example of the unclarity of an everyday familiar concept (time)?',
      ),
      options: [
        { id: 'a', label: l('Augustinus', 'Augustine') },
        { id: 'b', label: l('Aristoteles', 'Aristotle') },
        { id: 'c', label: l('Kant', 'Kant') },
        { id: 'd', label: l('Cavell', 'Cavell') },
      ],
      correctId: 'a',
      explanation: l(
        'Augustinus (354–430) zeigt, dass wir die Zeit alltäglich gebrauchen, aber nicht ohne Weiteres sagen können, was sie ist.',
        'Augustine (354–430) shows that we use time every day but cannot readily say what it is.',
      ),
    },
    {
      id: 'phil-klarheit',
      kind: 'single',
      difficulty: 2,
      prompt: l('Was bedeutet „Klarheit“ in der Vorlesung?', 'What does “clarity” mean in the lecture?'),
      options: [
        {
          id: 'a',
          label: l(
            'Scharfe Unterschiedenheit zwischen etwas und etwas anderem.',
            'Sharp distinguishability between something and something else.',
          ),
        },
        {
          id: 'b',
          label: l('Die Anzahl der Merkmale eines Begriffs.', 'The number of marks of a concept.'),
        },
        {
          id: 'c',
          label: l('Die emotionale Wirkung eines Satzes.', 'The emotional effect of a sentence.'),
        },
        {
          id: 'd',
          label: l('Die Länge eines Textes.', 'The length of a text.'),
        },
      ],
      correctId: 'a',
      explanation: l(
        'Klarheit ist die scharfe Unterschiedenheit zwischen etwas und etwas anderem; Unklarheit ist Dunkelheit.',
        'Clarity is the sharp distinguishability between something and something else; unclarity is darkness.',
      ),
    },
    {
      id: 'phil-deutlichkeit',
      kind: 'single',
      difficulty: 2,
      prompt: l('Was bedeutet „Deutlichkeit“ in der Vorlesung?', 'What does “distinctness” mean in the lecture?'),
      options: [
        {
          id: 'a',
          label: l(
            'Scharfe Unterschiedenheit der Bestandteile von etwas.',
            'Sharp distinguishability of the components of something.',
          ),
        },
        {
          id: 'b',
          label: l('Die Wahrheit eines Satzes.', 'The truth of a sentence.'),
        },
        {
          id: 'c',
          label: l('Die Anzahl der Wörter in einer Definition.', 'The number of words in a definition.'),
        },
        {
          id: 'd',
          label: l('Die Schönheit eines Gedankens.', 'The beauty of a thought.'),
        },
      ],
      correctId: 'a',
      explanation: l(
        'Deutlichkeit ist die scharfe Unterschiedenheit der Bestandteile von etwas; Undeutlichkeit ist Verworrenheit.',
        'Distinctness is the sharp distinguishability of the components of something; indistinctness is confusion.',
      ),
    },
    {
      id: 'phil-merkmal',
      kind: 'single',
      difficulty: 2,
      prompt: l('Was ist ein Merkmal eines Begriffs?', 'What is a mark of a concept?'),
      options: [
        { id: 'a', label: l('Ein Bedeutungsbestandteil des Begriffs.', 'A meaning component of the concept.') },
        { id: 'b', label: l('Ein Gegenstand, der unter den Begriff fällt.', 'An object that falls under the concept.') },
        { id: 'c', label: l('Ein Satz über den Begriff.', 'A sentence about the concept.') },
        { id: 'd', label: l('Ein empirisches Messergebnis.', 'An empirical measurement.') },
      ],
      correctId: 'a',
      explanation: l(
        'Merkmale sind Bedeutungsbestandteile eines Begriffs – zum Beispiel ist „Tier“ ein Merkmal von „Schwan“.',
        'Marks are meaning components of a concept – for example, “animal” is a mark of “swan”.',
      ),
    },
    {
      id: 'phil-eksplikation',
      kind: 'single',
      difficulty: 3,
      prompt: l(
        'Als was versteht die Vorlesung philosophische Begriffsklärungen?',
        'How does the lecture understand philosophical conceptual clarifications?',
      ),
      options: [
        {
          id: 'a',
          label: l(
            'Als Explikationen (Kant: Expositionen) reiner gegebener Begriffe – schrittweise Verdeutlichungen ihrer Merkmale und deren Beziehungen.',
            'As explications (Kant: expositions) of pure given concepts – stepwise clarifications of their marks and the relations among them.',
          ),
        },
        {
          id: 'b',
          label: l('Als willkürliche Festsetzungen neuer Wörter.', 'As arbitrary stipulations of new words.'),
        },
        {
          id: 'c',
          label: l('Als empirische Beobachtungen.', 'As empirical observations.'),
        },
        {
          id: 'd',
          label: l('Als Übersetzungen aus dem Griechischen.', 'As translations from Greek.'),
        },
      ],
      correctId: 'a',
      explanation: l(
        'Philosophische Begriffsklärungen sind Explikationen reiner gegebener Begriffe. Sie verdeutlichen schrittweise die Merkmale und ihre Beziehungen.',
        'Philosophical conceptual clarifications are explications of pure given concepts. They clarify the marks and their relations step by step.',
      ),
    },
    {
      id: 'phil-keine-definitionen',
      kind: 'single',
      difficulty: 3,
      prompt: l(
        'Warum kann die Philosophie – anders als Mathematik und Physik – nicht mit Definitionen beginnen?',
        'Why can philosophy – unlike mathematics and physics – not begin with definitions?',
      ),
      options: [
        {
          id: 'a',
          label: l(
            'Weil Begriffe wie Freiheit oder Zeit nicht von vornherein als minimal-vollständige Merkmalsangabe verfügbar sind.',
            'Because concepts such as freedom or time are not available from the outset as a minimal complete specification of marks.',
          ),
        },
        {
          id: 'b',
          label: l('Weil Definitionen immer falsch sind.', 'Because definitions are always false.'),
        },
        {
          id: 'c',
          label: l('Weil Philosophie keine Begriffe verwendet.', 'Because philosophy uses no concepts.'),
        },
        {
          id: 'd',
          label: l('Weil Mathematik und Physik keine Definitionen kennen.', 'Because mathematics and physics know no definitions.'),
        },
      ],
      correctId: 'a',
      explanation: l(
        'In Mathematik und Physik lassen sich Begriffe wie Kreis oder Tausendeck definieren. Bei Freiheit oder Zeit wäre eine minimal-vollständige Angabe der Merkmale vorschnell.',
        'In mathematics and physics concepts such as circle or myriagon can be defined. For freedom or time, a minimal complete specification of marks would be premature.',
      ),
    },
    {
      id: 'phil-geschichte-wesentlich',
      kind: 'single',
      difficulty: 3,
      prompt: l(
        'Warum ist der Philosophie geschichtliche Entwicklung wesentlich?',
        'Why is historical development essential to philosophy?',
      ),
      options: [
        {
          id: 'a',
          label: l(
            'Weil ihre Begriffe und Themen so geartet sind, dass sie sich nur schrittweise aufklären, verdeutlichen und miteinander in Beziehung setzen lassen.',
            'Because its concepts and topics are such that they can only be clarified, made distinct, and related to one another step by step.',
          ),
        },
        {
          id: 'b',
          label: l('Weil sie keine Wahrheit kennt.', 'Because it knows no truth.'),
        },
        {
          id: 'c',
          label: l('Weil jedes Zeitalter seine eigenen Wahrheiten erfindet.', 'Because every age invents its own truths.'),
        },
        {
          id: 'd',
          label: l('Weil sie nur aus historischen Fakten besteht.', 'Because it consists only of historical facts.'),
        },
      ],
      correctId: 'a',
      explanation: l(
        'Die Begriffe und Themen der Philosophie lassen sich nur schrittweise klären. Darum ist ihre geschichtliche Entwicklung wesentlich und nicht bloß äußerlich.',
        'The concepts and topics of philosophy can only be clarified step by step. Its historical development is therefore essential, not merely external.',
      ),
    },
    {
      id: 'phil-sprachlichkeit',
      kind: 'single',
      difficulty: 3,
      prompt: l(
        'Was ist nach der Vorlesung der tiefere Grund der Geschichtlichkeit der Philosophie?',
        'What is the deeper ground of philosophy’s historicity according to the lecture?',
      ),
      options: [
        {
          id: 'a',
          label: l(
            'Die Sprachlichkeit: Begriffe sind uns nur gekoppelt an den Gebrauch sprachlicher Ausdrücke zugänglich.',
            'Linguisticality: concepts are accessible to us only coupled to the use of linguistic expressions.',
          ),
        },
        {
          id: 'b',
          label: l('Die Biologie des Gehirns.', 'The biology of the brain.'),
        },
        {
          id: 'c',
          label: l('Die politische Geschichte Europas.', 'The political history of Europe.'),
        },
        {
          id: 'd',
          label: l('Die Mathematik.', 'Mathematics.'),
        },
      ],
      correctId: 'a',
      explanation: l(
        'Begriffe sind für uns denkende Lebewesen nur zusammen mit sprachlichen Ausdrücken zugänglich. Der Gebrauch dieser Ausdrücke und der Gehalt der Begriffe entwickeln sich mit der Zeit.',
        'For us thinking beings, concepts are accessible only together with linguistic expressions. The use of these expressions and the content of concepts develop over time.',
      ),
    },
    {
      id: 'phil-cavell',
      kind: 'single',
      difficulty: 2,
      prompt: l(
        'Wie versteht Stanley Cavell die Natur der Philosophie?',
        'How does Stanley Cavell understand the nature of philosophy?',
      ),
      options: [
        {
          id: 'a',
          label: l(
            'Philosophie ist nicht nur eine Menge von Problemen, sondern ebenso sehr eine Menge von Texten und eine Weise des Lesens (und Schreibens).',
            'Philosophy is not only a set of problems but just as much a set of texts and a mode of reading (and writing).',
          ),
        },
        {
          id: 'b',
          label: l('Philosophie ist nur Argumentieren.', 'Philosophy is only argumentation.'),
        },
        {
          id: 'c',
          label: l('Philosophie ist eine Naturwissenschaft.', 'Philosophy is a natural science.'),
        },
        {
          id: 'd',
          label: l('Philosophie besteht nur aus Meinungen.', 'Philosophy consists only of opinions.'),
        },
      ],
      correctId: 'a',
      explanation: l(
        'Cavell: Philosophie besteht ebenso sehr in einer Menge von Texten; das Philosophieren ist auch eine Weise des Lesens und Schreibens, nicht nur des Argumentierens.',
        'Cavell: philosophy consists just as much in a set of texts; philosophising is also a way of reading and writing, not only of arguing.',
      ),
    },
    {
      id: 'phil-texte-uneschoepflich',
      kind: 'single',
      difficulty: 3,
      prompt: l(
        'Warum sind klassische philosophische Texte unerschöpflich?',
        'Why are classic philosophical texts inexhaustible?',
      ),
      options: [
        {
          id: 'a',
          label: l(
            'Weil philosophische Gedanken nicht sprachfrei verfügbar sind und man immer wieder vergessene oder neue Einsichten aus ihnen gewinnen kann.',
            'Because philosophical thoughts are not available language-free, and one can always gain forgotten or new insights from them.',
          ),
        },
        {
          id: 'b',
          label: l('Weil sie besonders lang sind.', 'Because they are especially long.'),
        },
        {
          id: 'c',
          label: l('Weil sie keine Bedeutung haben.', 'Because they have no meaning.'),
        },
        {
          id: 'd',
          label: l('Weil sie nur historische Fakten enthalten.', 'Because they contain only historical facts.'),
        },
      ],
      correctId: 'a',
      explanation: l(
        'Weil philosophische Gedanken an sprachlichen Ausdruck gebunden sind und sich der Sprachgebrauch entwickelt, bleibt der Gehalt klassischer Texte unerschöpflich.',
        'Because philosophical thoughts are bound to linguistic expression and language use develops, the content of classic texts remains inexhaustible.',
      ),
    },
    {
      id: 'phil-fortschritt-generation',
      kind: 'multiple',
      difficulty: 3,
      prompt: l(
        'Welche Aussagen über Fortschritt und Geschichtlichkeit der Philosophie sind korrekt?',
        'Which statements about progress and historicity in philosophy are correct?',
      ),
      options: [
        {
          id: 'a',
          label: l(
            'Umfassendere Begriffserklärungen können auf weniger umfassende folgen.',
            'More comprehensive conceptual clarifications can follow less comprehensive ones.',
          ),
        },
        {
          id: 'b',
          label: l(
            'Jede Generation muss philosophisch neu anfangen, weil die ursprüngliche Gegebenheit der Begriffe unklar ist.',
            'Every generation must begin philosophically anew because the original givenness of the concepts is unclear.',
          ),
        },
        {
          id: 'c',
          label: l(
            'Verschiedene Positionen können sich ergänzen, weil sie unterschiedliche Merkmale fokussieren.',
            'Different positions can complement one another because they focus on different marks.',
          ),
        },
        {
          id: 'd',
          label: l('In der Philosophie ist kein Fortschritt möglich.', 'No progress is possible in philosophy.'),
        },
        {
          id: 'e',
          label: l('Die Wahrheit ist immer nur vergangen.', 'Truth is always merely past.'),
        },
      ],
      correctIds: ['a', 'b', 'c'],
      explanation: l(
        'Fortschritt ist möglich, aber jede Generation muss neu anfangen. Positionen können sich ergänzen, weil sie verschiedene Merkmale der Begriffe klären.',
        'Progress is possible, but every generation must begin anew. Positions can complement one another because they clarify different marks of concepts.',
      ),
    },
    {
      id: 'phil-tf-formale-klar',
      kind: 'true-false',
      difficulty: 3,
      prompt: l(
        'Formale Begriffe sind von Haus aus vollkommen klar und deutlich.',
        'Formal concepts are completely clear and distinct from the outset.',
      ),
      correct: false,
      explanation: l(
        'Sie sind unbezweifelbar, aber gerade deshalb nicht automatisch klar: Weil sie immer schon mitlaufen, sind sie uns zunächst unklar und verworren.',
        'They are undeniable, but precisely for that reason not automatically clear: because they always already run along with us, they are initially unclear and confused.',
      ),
    },
    {
      id: 'phil-tf-definitionen',
      kind: 'true-false',
      difficulty: 2,
      prompt: l(
        'Die Philosophie kann mit Definitionen beginnen, so wie Mathematik und Physik.',
        'Philosophy can begin with definitions, just like mathematics and physics.',
      ),
      correct: false,
      explanation: l(
        'Begriffe wie Freiheit oder Zeit lassen sich nicht von vornherein minimal-vollständig definieren. Philosophie beginnt mit Explikationen, nicht mit Definitionen.',
        'Concepts such as freedom or time cannot be defined minimal-completely from the outset. Philosophy begins with explications, not definitions.',
      ),
    },
    {
      id: 'phil-tf-merkmal',
      kind: 'true-false',
      difficulty: 2,
      prompt: l('Ein Merkmal ist ein Bedeutungsbestandteil eines Begriffs.', 'A mark is a meaning component of a concept.'),
      correct: true,
      explanation: l(
        'Merkmale machen die Bedeutung eines Begriffs aus – zum Beispiel „Tier“ für „Schwan“.',
        'Marks constitute the meaning of a concept – for example, “animal” for “swan”.',
      ),
    },
    {
      id: 'phil-tf-sprachfrei',
      kind: 'true-false',
      difficulty: 2,
      prompt: l(
        'Philosophische Gedanken sind sprachfrei verfügbar.',
        'Philosophical thoughts are available language-free.',
      ),
      correct: false,
      explanation: l(
        'Für uns denkende Lebewesen sind Begriffe nur gekoppelt an den Gebrauch sprachlicher Ausdrücke zugänglich.',
        'For us thinking beings, concepts are accessible only coupled to the use of linguistic expressions.',
      ),
    },
    {
      id: 'phil-tf-cavell-argument',
      kind: 'true-false',
      difficulty: 2,
      prompt: l(
        'Cavell versteht Philosophie ausschließlich als Argumentieren.',
        'Cavell understands philosophy exclusively as argumentation.',
      ),
      correct: false,
      explanation: l(
        'Cavell versteht Philosophie ebenso sehr als Menge von Texten und als Weise des Lesens und Schreibens.',
        'Cavell understands philosophy just as much as a set of texts and a way of reading and writing.',
      ),
    },
    {
      id: 'phil-ft-augustinus',
      kind: 'free-text',
      difficulty: 2,
      prompt: l(
        'Welcher Kirchenvater dient als Beispiel für die Unklarheit des Begriffs der Zeit?',
        'Which church father serves as an example of the unclarity of the concept of time?',
      ),
      accepted: ['Augustinus', 'Augustine', 'Aurelius Augustinus'],
      hint: l('354–430.', '354–430.'),
      explanation: l('Augustinus.', 'Augustine.'),
    },
    {
      id: 'phil-ft-cavell',
      kind: 'free-text',
      difficulty: 2,
      prompt: l(
        'Welcher Philosoph versteht Philosophie als eine Weise des Lesens statt nur als Hingabe an die Argumentation?',
        'Which philosopher understands philosophy as a mode of reading rather than just a devotion to argumentation?',
      ),
      accepted: ['Stanley Cavell', 'Cavell'],
      hint: l('1926–2018.', '1926–2018.'),
      explanation: l('Stanley Cavell.', 'Stanley Cavell.'),
    },
    {
      id: 'phil-ft-sprachlichkeit',
      kind: 'free-text',
      difficulty: 2,
      prompt: l(
        'Was ist der tiefere Grund der Geschichtlichkeit der Philosophie?',
        'What is the deeper ground of philosophy’s historicity?',
      ),
      accepted: ['Sprachlichkeit', 'linguisticality', 'language', 'Sprache'],
      keywords: [['sprachlichkeit', 'linguisticality', 'sprache', 'language']],
      explanation: l(
        'Die Sprachlichkeit: Begriffe sind an den Gebrauch sprachlicher Ausdrücke gekoppelt, und dieser Gebrauch entwickelt sich mit der Zeit.',
        'Linguisticality: concepts are coupled to the use of linguistic expressions, and this use develops over time.',
      ),
    },
    {
      id: 'phil-ft-expositionen',
      kind: 'free-text',
      difficulty: 3,
      prompt: l(
        'Wie nennt Kant die Explikationen reiner gegebener Begriffe?',
        'What does Kant call the explications of pure given concepts?',
      ),
      accepted: ['Expositionen', 'Exposition', 'expositions', 'exposition'],
      explanation: l('Kant nennt sie Expositionen.', 'Kant calls them expositions.'),
    },
    {
      id: 'phil-ft-klarheit-deutlichkeit',
      kind: 'free-text',
      difficulty: 3,
      prompt: l(
        'Nenne die beiden Dimensionen der Klärung eines Begriffs.',
        'Name the two dimensions of clarifying a concept.',
      ),
      accepted: ['Klarheit und Deutlichkeit', 'clarity and distinctness', 'Deutlichkeit und Klarheit'],
      keywords: [
        ['klarheit', 'clarity'],
        ['deutlichkeit', 'distinctness'],
      ],
      explanation: l(
        'Klarheit (Unterschiedenheit von anderem) und Deutlichkeit (Unterschiedenheit der Bestandteile).',
        'Clarity (distinguishability from something else) and distinctness (distinguishability of the components).',
      ),
    },
    {
      id: 'phil-match-klarung',
      kind: 'matching',
      difficulty: 2,
      prompt: l(
        'Ordne die Begriffe der Begriffsklärung ihren Erläuterungen zu.',
        'Match the terms of conceptual clarification with their explanations.',
      ),
      pairs: [
        {
          id: 'clarity',
          left: l('Klarheit', 'Clarity'),
          right: l('Unterschiedenheit von etwas anderem', 'Distinguishability from something else'),
        },
        {
          id: 'distinctness',
          left: l('Deutlichkeit', 'Distinctness'),
          right: l('Unterschiedenheit der Bestandteile', 'Distinguishability of the components'),
        },
        {
          id: 'mark',
          left: l('Merkmal', 'Mark'),
          right: l('Bedeutungsbestandteil eines Begriffs', 'Meaning component of a concept'),
        },
        {
          id: 'explication',
          left: l('Explikation', 'Explication'),
          right: l('schrittweise Verdeutlichung', 'stepwise clarification'),
        },
      ],
      explanation: l(
        'Klarheit unterscheidet etwas von anderem; Deutlichkeit unterscheidet seine Bestandteile; Merkmale sind Bedeutungsbestandteile; Explikationen verdeutlichen schrittweise.',
        'Clarity distinguishes something from something else; distinctness distinguishes its components; marks are meaning components; explications clarify step by step.',
      ),
    },
    {
      id: 'phil-order-klarung',
      kind: 'ordering',
      difficulty: 3,
      prompt: l(
        'Bringe die Schritte der philosophischen Begriffsklärung in die richtige Reihenfolge.',
        'Put the steps of philosophical conceptual clarification in the right order.',
      ),
      items: [
        { id: 'everyday', label: l('Unklares Alltagsverständnis', 'Unclear everyday understanding') },
        { id: 'marks', label: l('Explikation der Merkmale', 'Explication of the marks') },
        { id: 'relations', label: l('Verdeutlichung der Beziehungen', 'Clarification of the relations') },
        { id: 'comprehensive', label: l('Umfassendere Begriffserklärung', 'More comprehensive conceptual clarification') },
      ],
      explanation: l(
        'Die Klärung beginnt beim unklaren Vorverständnis, expliziert die Merkmale, verdeutlicht ihre Beziehungen und kann zu umfassenderen Erklärungen fortschreiten.',
        'Clarification begins with the unclear pre-understanding, explicates the marks, clarifies their relations, and can advance to more comprehensive explanations.',
      ),
    },
    {
      id: 'phil-cloze-klarheit',
      kind: 'cloze',
      difficulty: 2,
      prompt: l('Vervollständige die Definition der Klarheit.', 'Complete the definition of clarity.'),
      segments: [
        { type: 'text', value: l('Klarheit ist die scharfe ', 'Clarity is the sharp ') },
        { type: 'blank', accepted: ['Unterschiedenheit', 'unterschiedenheit', 'distinguishability'], width: 168 },
        { type: 'text', value: l(' zwischen etwas und etwas anderem.', ' between something and something else.') },
      ],
      explanation: l(
        'Klarheit = scharfe Unterschiedenheit zwischen etwas und etwas anderem.',
        'Clarity = sharp distinguishability between something and something else.',
      ),
    },
    {
      id: 'phil-cloze-deutlichkeit',
      kind: 'cloze',
      difficulty: 2,
      prompt: l('Vervollständige die Definition der Deutlichkeit.', 'Complete the definition of distinctness.'),
      segments: [
        {
          type: 'text',
          value: l('Deutlichkeit ist die scharfe Unterschiedenheit der ', 'Distinctness is the sharp distinguishability of the '),
        },
        { type: 'blank', accepted: ['Bestandteile', 'bestandteile', 'components'], width: 132 },
        { type: 'text', value: l(' von etwas.', ' of something.') },
      ],
      explanation: l(
        'Deutlichkeit = scharfe Unterschiedenheit der Bestandteile von etwas.',
        'Distinctness = sharp distinguishability of the components of something.',
      ),
    },
    {
      id: 'phil-cloze-sprachlichkeit',
      kind: 'cloze',
      difficulty: 3,
      prompt: l(
        'Vervollständige den Grund der Geschichtlichkeit.',
        'Complete the ground of historicity.',
      ),
      segments: [
        {
          type: 'text',
          value: l(
            'Der tiefere Grund der Geschichtlichkeit der Philosophie ist ihre ',
            'The deeper ground of philosophy’s historicity is its ',
          ),
        },
        { type: 'blank', accepted: ['Sprachlichkeit', 'sprachlichkeit', 'linguisticality'], width: 150 },
        { type: 'text', value: l('.', '.') },
      ],
      explanation: l(
        'Die Sprachlichkeit der Philosophie: Begriffe sind an sprachliche Ausdrücke gekoppelt, deren Gebrauch sich entwickelt.',
        'The linguisticity of philosophy: concepts are coupled to linguistic expressions whose use develops.',
      ),
    },
    {
      id: 'phil-card-klarheit',
      kind: 'flashcard',
      difficulty: 2,
      prompt: l(
        'Was unterscheidet Klarheit und Deutlichkeit?',
        'What distinguishes clarity and distinctness?',
      ),
      back: l(
        'Klarheit ist die scharfe Unterschiedenheit zwischen etwas und etwas anderem; Deutlichkeit ist die scharfe Unterschiedenheit der Bestandteile von etwas.',
        'Clarity is the sharp distinguishability between something and something else; distinctness is the sharp distinguishability of the components of something.',
      ),
    },
    {
      id: 'phil-card-cavell',
      kind: 'flashcard',
      difficulty: 2,
      prompt: l(
        'Was besagt Cavells Bild der Philosophie als Lesen?',
        'What does Cavell’s image of philosophy as reading claim?',
      ),
      back: l(
        'Philosophie ist nicht nur eine Menge von Problemen, sondern ebenso sehr eine Menge von Texten. Philosophieren ist nicht nur Argumentieren, sondern auch eine Weise des Lesens und Schreibens.',
        'Philosophy is not only a set of problems but just as much a set of texts. Philosophising is not only argumentation but also a way of reading and writing.',
      ),
    },
  ],
};
