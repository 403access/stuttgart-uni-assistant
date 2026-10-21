import type { QuizTopic } from '@/src/quiz/types';

import { l } from '../helpers';

export const philGeschichte: QuizTopic = {
  id: 'phil-geschichte',
  title: l('Philosophie und ihre Geschichte', 'Philosophy and its history'),
  meeting: l('Erste Vorlesung · 19. Oktober 2026', 'First lecture · 19 October 2026'),
  summary: l(
    'Das eigentümliche Verhältnis der Philosophie zu ihrer Geschichte und die drei Vorurteile, die den vermeintlichen Widerspruch zwischen Geschichtlichkeit und Wahrheit erzeugen.',
    'Philosophy’s peculiar relation to its history and the three prejudices behind the supposed contradiction between historicity and truth.',
  ),
  source: l(
    'Einführung in die Geschichte der Philosophie · Die Geschichtlichkeit der Philosophie',
    'Introduction to the History of Philosophy · The historicity of philosophy',
  ),
  questions: [
    {
      id: 'phil-wissenschaften-verhaeltnis',
      kind: 'single',
      difficulty: 1,
      prompt: l(
        'Wie ist das Verhältnis vieler Wissenschaften zu ihrer Geschichte nach der Vorlesung?',
        'How do many sciences relate to their history according to the lecture?',
      ),
      options: [
        {
          id: 'a',
          label: l(
            'Äußerlich: Sie lassen sich unabhängig vom Rückgang auf ihre Geschichte betreiben und lehren.',
            'External: they can be practised and taught independently of a return to their history.',
          ),
        },
        {
          id: 'b',
          label: l(
            'Wesentlich: Ohne ihre Geschichte sind sie nicht verständlich.',
            'Essential: without their history they cannot be understood.',
          ),
        },
        { id: 'c', label: l('Sie haben keine Geschichte.', 'They have no history.') },
        {
          id: 'd',
          label: l('Ihre Geschichte ist nur eine Frage des Geschmacks.', 'Their history is only a matter of taste.'),
        },
      ],
      correctId: 'a',
      explanation: l(
        'Vielen Wissenschaften ist das Verhältnis zu ihrer Geschichte äußerlich. Die Vermutung der Vorlesung ist, dass dies für die Philosophie nicht gilt.',
        'For many sciences the relation to their history is external. The lecture’s hypothesis is that this is not true of philosophy.',
      ),
    },
    {
      id: 'phil-philosophie-verhaeltnis',
      kind: 'single',
      difficulty: 2,
      prompt: l(
        'Welche Vermutung vertritt die Vorlesung zum Verhältnis der Philosophie zu ihrer Geschichte?',
        'What hypothesis does the lecture defend about philosophy’s relation to its history?',
      ),
      options: [
        {
          id: 'a',
          label: l(
            'Das Verhältnis ist nicht äußerlich, sondern wesentlich.',
            'The relation is not external but essential.',
          ),
        },
        { id: 'b', label: l('Das Verhältnis ist rein äußerlich.', 'The relation is purely external.') },
        { id: 'c', label: l('Philosophie hat keine Geschichte.', 'Philosophy has no history.') },
        {
          id: 'd',
          label: l('Geschichte ist für Philosophie nur Dekoration.', 'History is merely decoration for philosophy.'),
        },
      ],
      correctId: 'a',
      explanation: l(
        'Die Philosophie ist nach der Vorlesung wesentlich geschichtlich: Ihre Begriffe und Themen lassen sich nur in ihrer geschichtlichen Entwicklung klären.',
        'On the lecture’s account, philosophy is essentially historical: its concepts and topics can only be clarified through their historical development.',
      ),
    },
    {
      id: 'phil-nicht-geschichtlich',
      kind: 'single',
      difficulty: 2,
      prompt: l(
        'Warum ist eine nicht-geschichtliche Einführung in die Philosophie schwierig?',
        'Why is a non-historical introduction to philosophy difficult?',
      ),
      options: [
        {
          id: 'a',
          label: l(
            'Weil Weisheit kein vorliegender Gegenstand ist und das Thema der Philosophie anfangs unbestimmt bleibt.',
            'Because wisdom is not an object lying before us and the topic of philosophy initially remains indeterminate.',
          ),
        },
        {
          id: 'b',
          label: l('Weil es zu wenige philosophische Bücher gibt.', 'Because there are too few philosophical books.'),
        },
        {
          id: 'c',
          label: l('Weil Philosophie nur aus Meinungen besteht.', 'Because philosophy consists only of opinions.'),
        },
        {
          id: 'd',
          label: l('Weil Geschichte und Wahrheit dasselbe sind.', 'Because history and truth are the same thing.'),
        },
      ],
      correctId: 'a',
      explanation: l(
        'Weisheit ist kein vorliegender Gegenstand, sondern Ziel der Philosophie. Deshalb ist das Thema anfangs unbestimmt und ein Rückgang auf die Geschichte erforderlich.',
        'Wisdom is not an object at hand but the goal of philosophy. That is why the topic is initially indeterminate and a return to history is required.',
      ),
    },
    {
      id: 'phil-philosophia',
      kind: 'single',
      difficulty: 1,
      prompt: l('Was bedeutet griechisch „philosophía“?', 'What does Greek “philosophía” mean?'),
      options: [
        { id: 'a', label: l('Liebe zur Weisheit', 'Love of wisdom') },
        { id: 'b', label: l('Liebe zur Wahrheit', 'Love of truth') },
        { id: 'c', label: l('Weisheit des Lebens', 'Wisdom of life') },
        { id: 'd', label: l('Freundschaft', 'Friendship') },
      ],
      correctId: 'a',
      explanation: l(
        'philosophía = Liebe zur Weisheit (phileîn = lieben, sophía = Weisheit).',
        'philosophía = love of wisdom (phileîn = to love, sophía = wisdom).',
      ),
    },
    {
      id: 'phil-sophia',
      kind: 'single',
      difficulty: 1,
      prompt: l('Was bedeutet griechisch „sophía“?', 'What does Greek “sophía” mean?'),
      options: [
        { id: 'a', label: l('Wahrheit', 'Truth') },
        { id: 'b', label: l('Sprache', 'Language') },
        { id: 'c', label: l('Weisheit', 'Wisdom') },
        { id: 'd', label: l('Erkenntnis', 'Knowledge') },
      ],
      correctId: 'c',
      explanation: l('sophía heißt Weisheit.', 'Sophía means wisdom.'),
    },
    {
      id: 'phil-erstes-vorurteil',
      kind: 'single',
      difficulty: 2,
      prompt: l('Was behauptet das erste Vorurteil?', 'What does the first prejudice claim?'),
      options: [
        {
          id: 'a',
          label: l(
            'Die Geschichtlichkeit der Philosophie widerspricht ihrer Wahrheit.',
            'The historicity of philosophy contradicts its truth.',
          ),
        },
        {
          id: 'b',
          label: l('Die Geschichte der Philosophie ist die Wahrheit selbst.', 'The history of philosophy is truth itself.'),
        },
        {
          id: 'c',
          label: l('Wahrheit ist immer nur Meinung.', 'Truth is always merely opinion.'),
        },
        {
          id: 'd',
          label: l('Philosophie hat keine Geschichte.', 'Philosophy has no history.'),
        },
      ],
      correctId: 'a',
      explanation: l(
        'Das erste Vorurteil behauptet einen Widerspruch: Wenn Wahrheit ewig ist, hat sie keine Geschichte; wenn sie Geschichte hat, ist sie nur vergangene Gestalt.',
        'The first prejudice asserts a contradiction: if truth is eternal, it has no history; if it has a history, it is only a past shape.',
      ),
    },
    {
      id: 'phil-annahme-erstes',
      kind: 'single',
      difficulty: 3,
      prompt: l(
        'Welche Annahme liegt dem ersten Vorurteil zugrunde?',
        'Which assumption underlies the first prejudice?',
      ),
      options: [
        {
          id: 'a',
          label: l(
            'Was wahr ist, muss gänzlich unabhängig von vergangenen Weisen seines Ausdrucks darstellbar sein.',
            'What is true must be representable entirely independently of past ways of expressing it.',
          ),
        },
        {
          id: 'b',
          label: l('Wahrheit ist immer an eine bestimmte Epoche gebunden.', 'Truth is always bound to a particular epoch.'),
        },
        {
          id: 'c',
          label: l('Es gibt keinen Unterschied zwischen Wahrheit und Falschheit.', 'There is no difference between truth and falsity.'),
        },
        {
          id: 'd',
          label: l('Philosophie besteht nur aus historischen Fakten.', 'Philosophy consists only of historical facts.'),
        },
      ],
      correctId: 'a',
      explanation: l(
        'Das erste Vorurteil setzt voraus, dass etwas nur dann wahr ist, wenn es unabhängig von seinen vergangenen Ausdrucksformen dargestellt werden kann.',
        'The first prejudice assumes that something is true only if it can be presented independently of its past forms of expression.',
      ),
    },
    {
      id: 'phil-zweites-vorurteil',
      kind: 'single',
      difficulty: 2,
      prompt: l('Was behauptet das zweite Vorurteil?', 'What does the second prejudice claim?'),
      options: [
        {
          id: 'a',
          label: l(
            'Die Philosophiegeschichte ist eine Abfolge einander widerstreitender Positionen, die bloße Meinungen sind.',
            'The history of philosophy is a sequence of conflicting positions that are mere opinions.',
          ),
        },
        {
          id: 'b',
          label: l(
            'Die Philosophiegeschichte ist ein geradliniger Fortschritt zur Wahrheit.',
            'The history of philosophy is a straightforward progress toward truth.',
          ),
        },
        {
          id: 'c',
          label: l('Alle philosophischen Positionen sind wahr.', 'All philosophical positions are true.'),
        },
        {
          id: 'd',
          label: l('Philosophie braucht keine Texte.', 'Philosophy needs no texts.'),
        },
      ],
      correctId: 'a',
      explanation: l(
        'Das zweite Vorurteil deutet die Abfolge der Positionen als bloße Meinungen, deren Wahrheit oder Falschheit wir nicht erkennen könnten.',
        'The second prejudice reads the sequence of positions as mere opinions whose truth or falsity we cannot recognise.',
      ),
    },
    {
      id: 'phil-drittes-vorurteil',
      kind: 'single',
      difficulty: 2,
      prompt: l('Was behauptet das dritte Vorurteil?', 'What does the third prejudice claim?'),
      options: [
        {
          id: 'a',
          label: l(
            'Die Ansammlung von Meinungen über Philosophie sei letztlich eine Ansammlung von Unsinn.',
            'The collection of opinions about philosophy is ultimately a collection of nonsense.',
          ),
        },
        {
          id: 'b',
          label: l('Philosophie sei die strengste Wissenschaft.', 'Philosophy is the most rigorous science.'),
        },
        {
          id: 'c',
          label: l('Philosophiegeschichte sei reine Wahrheitsgeschichte.', 'The history of philosophy is pure history of truth.'),
        },
        {
          id: 'd',
          label: l('Meinungen seien immer allgemein.', 'Opinions are always universal.'),
        },
      ],
      correctId: 'a',
      explanation: l(
        'Das dritte Vorurteil folgert aus der angeblichen Beliebigkeit der Meinungen, die Philosophiegeschichte sei eine Ansammlung von Unsinn – Hegel nennt diese Ansicht eine „Galerie der Narrheiten“.',
        'The third prejudice concludes from the alleged arbitrariness of opinions that the history of philosophy is a collection of nonsense – Hegel calls this view a “gallery of follies”.',
      ),
    },
    {
      id: 'phil-loesungsansatz',
      kind: 'single',
      difficulty: 2,
      prompt: l(
        'Wie lautet der Lösungsansatz für den Widerspruch zwischen Geschichtlichkeit und Wahrheit?',
        'What is the proposed solution to the contradiction between historicity and truth?',
      ),
      options: [
        {
          id: 'a',
          label: l(
            'Philosophie als schrittweise Klärung und Entwicklung von ursprünglich unklaren Begriffen.',
            'Philosophy as the stepwise clarification and development of originally unclear concepts.',
          ),
        },
        {
          id: 'b',
          label: l(
            'Philosophie als Sammlung möglichst vieler Meinungen.',
            'Philosophy as a collection of as many opinions as possible.',
          ),
        },
        {
          id: 'c',
          label: l(
            'Philosophie als zeitlose Mathematik ohne Geschichte.',
            'Philosophy as timeless mathematics without history.',
          ),
        },
        {
          id: 'd',
          label: l('Philosophie als reine Rhetorik.', 'Philosophy as pure rhetoric.'),
        },
      ],
      correctId: 'a',
      explanation: l(
        'Die Begriffe, die unser Selbst- und Weltverständnis tragen, sind zunächst unklar. Philosophie klärt sie schrittweise – deshalb ist ihre Geschichtlichkeit wesentlich.',
        'The concepts that carry our understanding of ourselves and the world are initially unclear. Philosophy clarifies them step by step – which is why its historicity is essential.',
      ),
    },
    {
      id: 'phil-hegel-narrheiten',
      kind: 'single',
      difficulty: 2,
      prompt: l(
        'Wer berichtet die gewöhnliche Ansicht, die Philosophiegeschichte sei eine „Galerie der Narrheiten“?',
        'Who reports the ordinary view that the history of philosophy is a “gallery of follies”?',
      ),
      options: [
        { id: 'a', label: l('Hegel', 'Hegel') },
        { id: 'b', label: l('Kant', 'Kant') },
        { id: 'c', label: l('Aristoteles', 'Aristotle') },
        { id: 'd', label: l('Augustinus', 'Augustine') },
      ],
      correctId: 'a',
      explanation: l(
        'Hegel zitiert diese Ansicht in seinen Vorlesungen über die Geschichte der Philosophie – er macht sie sich nicht zu eigen, sondern kritisiert sie.',
        'Hegel quotes this view in his lectures on the history of philosophy – he does not adopt it but criticises it.',
      ),
    },
    {
      id: 'phil-wahrheit-ewig',
      kind: 'single',
      difficulty: 2,
      prompt: l(
        'Was folgt nach Hegel, wenn die Wahrheit ewig ist?',
        'According to Hegel, what follows if truth is eternal?',
      ),
      options: [
        {
          id: 'a',
          label: l(
            'Sie fällt nicht in die Sphäre des Vorübergehenden und hat keine Geschichte.',
            'It does not fall into the sphere of the transient and has no history.',
          ),
        },
        {
          id: 'b',
          label: l('Sie erscheint nur als Abfolge vergangener Meinungen.', 'It appears only as a sequence of past opinions.'),
        },
        { id: 'c', label: l('Sie ist immer falsch.', 'It is always false.') },
        { id: 'd', label: l('Sie ist eine Galerie der Narrheiten.', 'It is a gallery of follies.') },
      ],
      correctId: 'a',
      explanation: l(
        'Hegel formuliert die Konsequenz des ersten Vorurteils: Eine ewige Wahrheit ist nicht vorübergehend und hat keine Geschichte.',
        'Hegel states the consequence of the first prejudice: an eternal truth is not transient and has no history.',
      ),
    },
    {
      id: 'phil-vorurteile-alle',
      kind: 'multiple',
      difficulty: 2,
      prompt: l(
        'Welche drei Vorurteile nennt die Vorlesung?',
        'Which three prejudices does the lecture name?',
      ),
      options: [
        {
          id: 'a',
          label: l(
            'Die Geschichtlichkeit der Philosophie widerspricht ihrer Wahrheit.',
            'The historicity of philosophy contradicts its truth.',
          ),
        },
        {
          id: 'b',
          label: l(
            'Die Philosophiegeschichte ist eine Abfolge einander widerstreitender Meinungen.',
            'The history of philosophy is a sequence of conflicting opinions.',
          ),
        },
        {
          id: 'c',
          label: l(
            'Die Ansammlung dieser Meinungen ist letztlich Unsinn.',
            'The collection of these opinions is ultimately nonsense.',
          ),
        },
        { id: 'd', label: l('Philosophie hat keine Sprache.', 'Philosophy has no language.') },
        {
          id: 'e',
          label: l('Wahrheit ist immer nur subjektiv.', 'Truth is always merely subjective.'),
        },
      ],
      correctIds: ['a', 'b', 'c'],
      explanation: l(
        'Die drei Vorurteile bauen aufeinander auf: Widerspruch von Geschichte und Wahrheit, Abfolge bloßer Meinungen, Ansammlung von Unsinn.',
        'The three prejudices build on one another: contradiction of history and truth, sequence of mere opinions, collection of nonsense.',
      ),
    },
    {
      id: 'phil-erstes-vorurteil-merkmale',
      kind: 'multiple',
      difficulty: 3,
      prompt: l(
        'Welche Aussagen gehören zum ersten Vorurteil?',
        'Which statements belong to the first prejudice?',
      ),
      options: [
        {
          id: 'a',
          label: l(
            'Die Geschichtlichkeit der Philosophie widerspricht ihrer Wahrheit.',
            'The historicity of philosophy contradicts its truth.',
          ),
        },
        {
          id: 'b',
          label: l(
            'Wenn Wahrheit ewig ist, hat sie keine Geschichte.',
            'If truth is eternal, it has no history.',
          ),
        },
        {
          id: 'c',
          label: l(
            'Was wahr ist, muss unabhängig von vergangenen Ausdrucksweisen darstellbar sein.',
            'What is true must be representable independently of past forms of expression.',
          ),
        },
        {
          id: 'd',
          label: l(
            'Verschiedene philosophische Positionen können einander ergänzen.',
            'Different philosophical positions can complement one another.',
          ),
        },
      ],
      correctIds: ['a', 'b', 'c'],
      explanation: l(
        'Die Ergänzung verschiedener Positionen ist Teil der Lösung, nicht des ersten Vorurteils.',
        'The complementarity of different positions belongs to the solution, not to the first prejudice.',
      ),
    },
    {
      id: 'phil-tf-wissenschaften',
      kind: 'true-false',
      difficulty: 1,
      prompt: l(
        'Viele Wissenschaften lassen sich unabhängig von ihrer Geschichte betreiben und lehren.',
        'Many sciences can be practised and taught independently of their history.',
      ),
      correct: true,
      explanation: l(
        'Genau darin liegt für die Vorlesung der Unterschied zur Philosophie, deren Verhältnis zur Geschichte wesentlich ist.',
        'For the lecture, this is precisely the difference from philosophy, whose relation to history is essential.',
      ),
    },
    {
      id: 'phil-tf-philosophie',
      kind: 'true-false',
      difficulty: 1,
      prompt: l(
        'Die Philosophie lässt sich unabhängig von ihrer Geschichte einführen.',
        'Philosophy can be introduced independently of its history.',
      ),
      correct: false,
      explanation: l(
        'Die anfängliche Unbestimmtheit ihres Themas macht einen Rückgang auf die Geschichte erforderlich.',
        'The initial indeterminacy of its topic makes a return to history necessary.',
      ),
    },
    {
      id: 'phil-tf-weisheit',
      kind: 'true-false',
      difficulty: 2,
      prompt: l(
        'Weisheit ist ein vorliegender Gegenstand, den die Philosophie untersucht.',
        'Wisdom is an object at hand that philosophy investigates.',
      ),
      correct: false,
      explanation: l(
        'Weisheit ist kein vorliegender Gegenstand, sondern das Ziel der Philosophie.',
        'Wisdom is not an object at hand but the goal of philosophy.',
      ),
    },
    {
      id: 'phil-tf-hegel-eigen',
      kind: 'true-false',
      difficulty: 3,
      prompt: l(
        'Hegel selbst hält die Geschichte der Philosophie für eine bloße „Galerie der Narrheiten“.',
        'Hegel himself considers the history of philosophy a mere “gallery of follies”.',
      ),
      correct: false,
      explanation: l(
        'Hegel zitiert und kritisiert diese gewöhnliche Ansicht. Sie ist nicht seine eigene Position.',
        'Hegel quotes and criticises this ordinary view. It is not his own position.',
      ),
    },
    {
      id: 'phil-tf-unvereinbar',
      kind: 'true-false',
      difficulty: 2,
      prompt: l(
        'Die Vorlesung hält Geschichtlichkeit und Wahrheit der Philosophie für unvereinbar.',
        'The lecture considers the historicity and truth of philosophy incompatible.',
      ),
      correct: false,
      explanation: l(
        'Der Lösungsansatz zielt gerade auf die Vereinbarkeit von Geschichtlichkeit und Wahrheit.',
        'The proposed solution aims precisely at the compatibility of historicity and truth.',
      ),
    },
    {
      id: 'phil-ft-philosophia',
      kind: 'free-text',
      difficulty: 2,
      prompt: l(
        'Wie lautet das griechische Wort für „Liebe zur Weisheit“?',
        'What is the Greek word for “love of wisdom”?',
      ),
      accepted: ['philosophía', 'philosophia', 'philo-sophia'],
      hint: l('Es ist der Ursprung des Wortes „Philosophie“.', 'It is the origin of the word “philosophy”.'),
      explanation: l('philosophía.', 'philosophía.'),
    },
    {
      id: 'phil-ft-sophia',
      kind: 'free-text',
      difficulty: 1,
      prompt: l('Wie lautet das griechische Wort für „Weisheit“?', 'What is the Greek word for “wisdom”?'),
      accepted: ['sophía', 'sophia'],
      explanation: l('sophía.', 'sophía.'),
    },
    {
      id: 'phil-ft-hegel',
      kind: 'free-text',
      difficulty: 2,
      prompt: l(
        'Welcher Philosoph hielt die Vorlesungen über die Geschichte der Philosophie, aus denen die Zitate stammen?',
        'Which philosopher gave the lectures on the history of philosophy quoted here?',
      ),
      accepted: ['Hegel', 'Georg Wilhelm Friedrich Hegel', 'G. W. F. Hegel'],
      hint: l('Ein deutscher Idealist (1770–1831).', 'A German idealist (1770–1831).'),
      explanation: l('Georg Wilhelm Friedrich Hegel.', 'Georg Wilhelm Friedrich Hegel.'),
    },
    {
      id: 'phil-ft-erstes-vorurteil',
      kind: 'free-text',
      difficulty: 3,
      prompt: l(
        'Was behauptet das erste Vorurteil? Antworte in Stichworten.',
        'What does the first prejudice claim? Answer in keywords.',
      ),
      accepted: [
        'Die Geschichtlichkeit der Philosophie widerspricht ihrer Wahrheit',
        'Geschichtlichkeit widerspricht Wahrheit',
        'Historicity contradicts truth',
      ],
      keywords: [
        ['geschichtlichkeit', 'historicity', 'history'],
        ['wahrheit', 'truth'],
        ['widerspricht', 'widerspruch', 'contradicts', 'contradiction'],
      ],
      explanation: l(
        'Das erste Vorurteil behauptet, die Geschichtlichkeit der Philosophie widerspreche ihrer Wahrheit.',
        'The first prejudice claims that the historicity of philosophy contradicts its truth.',
      ),
    },
    {
      id: 'phil-match-vorurteile',
      kind: 'matching',
      difficulty: 2,
      prompt: l(
        'Ordne den Vorurteilen ihre Aussage zu.',
        'Match each prejudice with its claim.',
      ),
      pairs: [
        {
          id: 'first',
          left: l('Erstes Vorurteil', 'First prejudice'),
          right: l('Geschichtlichkeit widerspricht Wahrheit', 'Historicity contradicts truth'),
        },
        {
          id: 'second',
          left: l('Zweites Vorurteil', 'Second prejudice'),
          right: l(
            'Abfolge einander widerstreitender Meinungen',
            'Sequence of conflicting opinions',
          ),
        },
        {
          id: 'third',
          left: l('Drittes Vorurteil', 'Third prejudice'),
          right: l('Ansammlung von Unsinn', 'Collection of nonsense'),
        },
      ],
      explanation: l(
        'Die drei Vorurteile steigern den Zweifel: Widerspruch, beliebige Meinungen, Unsinn.',
        'The three prejudices escalate the doubt: contradiction, arbitrary opinions, nonsense.',
      ),
    },
    {
      id: 'phil-order-loesung',
      kind: 'ordering',
      difficulty: 3,
      prompt: l(
        'Bringe den Gedankengang des Lösungsansatzes in die richtige Reihenfolge.',
        'Put the steps of the proposed solution in the right order.',
      ),
      items: [
        { id: 'unclear', label: l('Ursprünglich unklare Begriffe', 'Originally unclear concepts') },
        { id: 'clarify', label: l('Schrittweise Klärung und Entwicklung', 'Stepwise clarification and development') },
        { id: 'history', label: l('Wesentliche Geschichtlichkeit', 'Essential historicity') },
        { id: 'truth', label: l('Vereinbarkeit mit Wahrheit', 'Compatibility with truth') },
      ],
      explanation: l(
        'Weil die Begriffe zunächst unklar sind, müssen sie schrittweise geklärt werden. Daraus folgt die wesentliche Geschichtlichkeit der Philosophie und die Vereinbarkeit von Geschichte und Wahrheit.',
        'Because the concepts are initially unclear, they must be clarified step by step. This yields philosophy’s essential historicity and the compatibility of history and truth.',
      ),
    },
    {
      id: 'phil-cloze-aeusserlich',
      kind: 'cloze',
      difficulty: 1,
      prompt: l(
        'Vervollständige den Satz über das Verhältnis zur Geschichte.',
        'Complete the sentence about the relation to history.',
      ),
      segments: [
        {
          type: 'text',
          value: l(
            'Vielen Wissenschaften ist das Verhältnis zu ihrer Geschichte ',
            'For many sciences the relation to their history is ',
          ),
        },
        { type: 'blank', accepted: ['äußerlich', 'ausserlich', 'external'], width: 120 },
        { type: 'text', value: l('.', '.') },
      ],
      explanation: l(
        'Bei vielen Wissenschaften ist das Verhältnis zur Geschichte äußerlich; bei der Philosophie ist es wesentlich.',
        'For many sciences the relation to history is external; for philosophy it is essential.',
      ),
    },
    {
      id: 'phil-cloze-wesentlich',
      kind: 'cloze',
      difficulty: 1,
      prompt: l(
        'Vervollständige den Satz über die Philosophie.',
        'Complete the sentence about philosophy.',
      ),
      segments: [
        {
          type: 'text',
          value: l(
            'Der Philosophie ist das Verhältnis zu ihrer Geschichte nicht äußerlich, sondern ',
            'For philosophy the relation to its history is not external but ',
          ),
        },
        { type: 'blank', accepted: ['wesentlich', 'essential'], width: 126 },
        { type: 'text', value: l('.', '.') },
      ],
      explanation: l(
        'Die Philosophie ist wesentlich geschichtlich.',
        'Philosophy is essentially historical.',
      ),
    },
    {
      id: 'phil-card-erstes-vorurteil',
      kind: 'flashcard',
      difficulty: 2,
      prompt: l('Was besagt das erste Vorurteil?', 'What does the first prejudice claim?'),
      back: l(
        'Die Geschichtlichkeit der Philosophie widerspricht ihrer Wahrheit.',
        'The historicity of philosophy contradicts its truth.',
      ),
    },
    {
      id: 'phil-card-zweites-vorurteil',
      kind: 'flashcard',
      difficulty: 2,
      prompt: l('Was besagt das zweite Vorurteil?', 'What does the second prejudice claim?'),
      back: l(
        'Die Philosophiegeschichte ist eine Abfolge einander widerstreitender Positionen, die bloße Meinungen sind.',
        'The history of philosophy is a sequence of conflicting positions that are mere opinions.',
      ),
    },
    {
      id: 'phil-card-drittes-vorurteil',
      kind: 'flashcard',
      difficulty: 2,
      prompt: l('Was besagt das dritte Vorurteil?', 'What does the third prejudice claim?'),
      back: l(
        'Die Ansammlung von Meinungen über Philosophie sei letztlich Unsinn – eine „Galerie der Narrheiten“.',
        'The collection of opinions about philosophy is ultimately nonsense – a “gallery of follies”.',
      ),
    },
    {
      id: 'phil-card-loesung',
      kind: 'flashcard',
      difficulty: 3,
      prompt: l(
        'Wie löst die Vorlesung den Widerspruch zwischen Geschichtlichkeit und Wahrheit?',
        'How does the lecture resolve the contradiction between historicity and truth?',
      ),
      back: l(
        'Philosophie ist schrittweise Klärung ursprünglich unklarer Begriffe. Deshalb ist ihre Geschichtlichkeit wesentlich und mit Wahrheit vereinbar.',
        'Philosophy is the stepwise clarification of originally unclear concepts. Its historicity is therefore essential and compatible with truth.',
      ),
    },
  ],
};
