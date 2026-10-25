import type { QuizTopic } from '@/src/quiz/types';

import { l } from '../helpers';

export const syntaxEinfuehrendes: QuizTopic = {
  id: 'syntax-einfuehrendes',
  title: l(
    'Einführendes: Syntax, Kompetenz & Adäquatheit',
    'Introduction: syntax, competence & adequacy',
  ),
  meeting: l('1. Sitzung · 15. Oktober 2026', 'Session 1 · 15 October 2026'),
  summary: l(
    'Was Syntax ist, warum sie eine kognitive Wissenschaft ist und mit welchen Kriterien wir Grammatiken bewerten – von der Beobachtungs- über die Beschreibungs- zur Erklärungsadäquatheit, dazu Universal Grammar und strukturabhängige Regeln.',
    'What syntax is, why it is a cognitive science, and which criteria we use to evaluate grammars – from observational to descriptive to explanatory adequacy, plus universal grammar and structure-dependent rules.',
  ),
  source: l(
    'Syntax I · Einführende Sitzung · Fabian Bross',
    'Syntax I · Introductory session · Fabian Bross',
  ),
  questions: [
    {
      id: 'syn-ein-syntax-gegenstand',
      kind: 'single',
      difficulty: 1,
      prompt: l(
        'Womit beschäftigt sich die Syntax?',
        'What does syntax study?',
      ),
      options: [
        { id: 'a', label: l('Mit dem Aufbau von Sätzen.', 'The structure of sentences.') },
        { id: 'b', label: l('Mit dem Lautinventar einzelner Sprachen.', 'The sound inventory of individual languages.') },
        { id: 'c', label: l('Mit der Bedeutung einzelner Wörter.', 'The meaning of individual words.') },
        { id: 'd', label: l('Mit der Geschichte der Grammatikschreibung.', 'The history of grammar writing.') },
      ],
      correctId: 'a',
      explanation: l(
        'Die Syntax ist ein Teilbereich der Grammatik und untersucht, wie Sätze aufgebaut sind.',
        'Syntax is a subfield of grammar and studies how sentences are structured.',
      ),
    },
    {
      id: 'syn-ein-syntaxbegriff-ambig',
      kind: 'single',
      difficulty: 2,
      prompt: l(
        'In welcher Hinsicht ist der Syntaxbegriff ambig?',
        'In what way is the term “syntax” ambiguous?',
      ),
      options: [
        {
          id: 'a',
          label: l(
            'Er bezeichnet sowohl das Regelsystem zur Erzeugung wohlgeformter Sätze als auch die Disziplin, die dieses Regelsystem untersucht.',
            'It refers both to the rule system that produces well-formed sentences and to the discipline that studies that rule system.',
          ),
        },
        {
          id: 'b',
          label: l(
            'Er bezeichnet sowohl gesprochene als auch geschriebene Sprache.',
            'It refers both to spoken and to written language.',
          ),
        },
        {
          id: 'c',
          label: l(
            'Er bezeichnet sowohl Wörter als auch Laute.',
            'It refers both to words and to sounds.',
          ),
        },
        {
          id: 'd',
          label: l(
            'Er bezeichnet sowohl deutsche als auch englische Sätze.',
            'It refers both to German and to English sentences.',
          ),
        },
      ],
      correctId: 'a',
      explanation: l(
        'Syntax meint zum einen das Regelsystem selbst, zum anderen die linguistische Teildisziplin, die es beschreibt und modelliert.',
        'Syntax means the rule system itself on the one hand and the linguistic subdiscipline that describes and models it on the other.',
      ),
    },
    {
      id: 'syn-ein-performanz',
      kind: 'single',
      difficulty: 1,
      prompt: l(
        'Was bezeichnet Chomsky (1965) als Performanz (E-language)?',
        'What does Chomsky (1965) call performance (E-language)?',
      ),
      options: [
        {
          id: 'a',
          label: l(
            'Den tatsächlichen Sprachgebrauch, der stark fehlerbehaftet ist.',
            'Actual language use, which is strongly prone to errors.',
          ),
        },
        {
          id: 'b',
          label: l(
            'Das Wissen eines idealisierten Sprecher-Hörers über syntaktische Regeln.',
            'An idealised speaker-hearer’s knowledge of syntactic rules.',
          ),
        },
        {
          id: 'c',
          label: l(
            'Die angeborene Sprachfähigkeit des Menschen.',
            'The human innate language faculty.',
          ),
        },
        {
          id: 'd',
          label: l(
            'Die Menge aller Sätze einer Sprache.',
            'The set of all sentences in a language.',
          ),
        },
      ],
      correctId: 'a',
      explanation: l(
        'Performanz ist der konkrete, fehleranfällige Gebrauch der Sprache. Davon unterscheidet Chomsky die Kompetenz als das zugrunde liegende Regelwissen.',
        'Performance is the concrete, error-prone use of language. Chomsky distinguishes it from competence, the underlying rule knowledge.',
      ),
    },
    {
      id: 'syn-ein-kompetenz',
      kind: 'single',
      difficulty: 2,
      prompt: l(
        'Was ist nach Chomsky (1965) die Kompetenz (I-Language)?',
        'According to Chomsky (1965), what is competence (I-language)?',
      ),
      options: [
        {
          id: 'a',
          label: l(
            'Das Wissen eines idealisierten Sprecher-Hörers über die syntaktischen Regeln.',
            'An idealised speaker-hearer’s knowledge of the syntactic rules.',
          ),
        },
        {
          id: 'b',
          label: l(
            'Die tatsächliche Äußerung in einer konkreten Situation.',
            'The actual utterance in a concrete situation.',
          ),
        },
        {
          id: 'c',
          label: l(
            'Die Gesamtheit aller Wörterbücher einer Sprache.',
            'The totality of all dictionaries of a language.',
          ),
        },
        {
          id: 'd',
          label: l(
            'Die Fähigkeit, eine Sprache fehlerfrei zu schreiben.',
            'The ability to write a language without errors.',
          ),
        },
      ],
      correctId: 'a',
      explanation: l(
        'Kompetenz ist das implizite Wissen über die Regeln einer Sprache – nicht der konkrete Gebrauch.',
        'Competence is implicit knowledge of a language’s rules – not concrete use.',
      ),
    },
    {
      id: 'syn-ein-kognitive-wissenschaft',
      kind: 'true-false',
      difficulty: 2,
      prompt: l(
        'Weil Syntax die Kompetenz untersucht und Kompetenz implizites Regelwissen ist, ist die Syntax eine kognitive Wissenschaft.',
        'Because syntax studies competence and competence is implicit rule knowledge, syntax is a cognitive science.',
      ),
      correct: true,
      explanation: l(
        'Die Syntax modelliert damit etwas Mentales: das Wissen von Sprecherinnen und Sprechern über den Satzbau.',
        'Syntax thus models something mental: speakers’ knowledge of sentence structure.',
      ),
    },
    {
      id: 'syn-ein-implizites-wissen',
      kind: 'single',
      difficulty: 2,
      prompt: l(
        'Warum greift die Syntax auf die Urteile von L1-Sprecherinnen und -Sprechern zurück?',
        'Why does syntax rely on the judgements of L1 speakers?',
      ),
      options: [
        {
          id: 'a',
          label: l(
            'Weil implizites Wissen nicht direkt zugänglich ist, aber in Grammatikalitätsurteilen sichtbar wird.',
            'Because implicit knowledge is not directly accessible but shows up in grammaticality judgements.',
          ),
        },
        {
          id: 'b',
          label: l(
            'Weil nur L1-Sprecherinnen und -Sprecher Wörterbücher auswendig gelernt haben.',
            'Because only L1 speakers have memorised dictionaries.',
          ),
        },
        {
          id: 'c',
          label: l(
            'Weil geschriebene Sprache immer grammatischer ist als gesprochene.',
            'Because written language is always more grammatical than spoken language.',
          ),
        },
        {
          id: 'd',
          label: l(
            'Weil grammatische Regeln direkt abgefragt werden können.',
            'Because grammatical rules can be queried directly.',
          ),
        },
      ],
      correctId: 'a',
      explanation: l(
        'Das Regelwissen ist implizit. Über die Frage, welche Sätze L1-Sprecherinnen und -Sprecher für grammatisch halten, können wir es indirekt erschließen.',
        'The rule knowledge is implicit. By asking which sentences L1 speakers consider grammatical, we can infer it indirectly.',
      ),
    },
    {
      id: 'syn-ein-goekce',
      kind: 'single',
      difficulty: 1,
      prompt: l(
        'Welcher der beiden Sätze ist nach den Folien grammatisch?',
        'According to the slides, which of the two sentences is grammatical?',
      ),
      options: [
        { id: 'a', label: l('Gökce hat ja ein tolles Handy!', 'Gökce has indeed a great phone!') },
        { id: 'b', label: l('*Gökce ja hat ein tolles Handy!', '*Gökce indeed has a great phone!') },
        { id: 'c', label: l('Beide Sätze sind ungrammatisch.', 'Both sentences are ungrammatical.') },
        { id: 'd', label: l('Beide Sätze sind gleichermaßen grammatisch.', 'Both sentences are equally grammatical.') },
      ],
      correctId: 'a',
      explanation: l(
        'Die Stellung der Partikel „ja“ ist nicht frei: Im deutschen Aussagesatz steht das finite Verb an zweiter Position, „Gökce ja hat“ ist daher ungrammatisch.',
        'The position of the particle “ja” is not free: in a German declarative the finite verb is in second position, so “Gökce ja hat” is ungrammatical.',
      ),
    },
    {
      id: 'syn-ein-beobachtungsadaequat',
      kind: 'single',
      difficulty: 1,
      prompt: l(
        'Wann ist eine Grammatik beobachtungsadäquat?',
        'When is a grammar observationally adequate?',
      ),
      options: [
        {
          id: 'a',
          label: l(
            'Wenn sie korrekt bestimmt, ob ein Satz grammatisch oder ungrammatisch ist – notfalls als Liste.',
            'When it correctly determines whether a sentence is grammatical or ungrammatical – if necessary as a list.',
          ),
        },
        {
          id: 'b',
          label: l(
            'Wenn sie den Satz in kleinere Einheiten zerlegt und Regeln überprüft.',
            'When it decomposes the sentence into smaller units and checks rules.',
          ),
        },
        {
          id: 'c',
          label: l(
            'Wenn sie auf Universal Grammar zurückgreift.',
            'When it relies on universal grammar.',
          ),
        },
        {
          id: 'd',
          label: l(
            'Wenn sie möglichst viele Annahmen macht.',
            'When it makes as many assumptions as possible.',
          ),
        },
      ],
      correctId: 'a',
      explanation: l(
        'Beobachtungsadäquat ist eine Grammatik schon dann, wenn sie die Grammatikalität korrekt vorhersagt. Eine bloße Auflistung aller grammatischen Sätze genügt.',
        'A grammar is already observationally adequate when it predicts grammaticality correctly. A mere list of all grammatical sentences suffices.',
      ),
    },
    {
      id: 'syn-ein-beschreibungsadaequat',
      kind: 'single',
      difficulty: 2,
      prompt: l(
        'Wann ist eine Grammatik beschreibungsadäquat?',
        'When is a grammar descriptively adequate?',
      ),
      options: [
        {
          id: 'a',
          label: l(
            'Wenn sie die Grammatikalität korrekt bestimmt, indem sie den Satz in kleinere Einheiten zerlegt und prüft, ob diese Regeln folgen.',
            'When it determines grammaticality correctly by decomposing the sentence into smaller units and checking whether they follow rules.',
          ),
        },
        {
          id: 'b',
          label: l(
            'Wenn sie lediglich alle grammatischen Sätze auflistet.',
            'When it merely lists all grammatical sentences.',
          ),
        },
        {
          id: 'c',
          label: l(
            'Wenn sie nur eine Sprache beschreibt, ohne Regeln zu nennen.',
            'When it describes only one language without stating rules.',
          ),
        },
        {
          id: 'd',
          label: l(
            'Wenn sie möglichst viele Ausnahmen zulässt.',
            'When it permits as many exceptions as possible.',
          ),
        },
      ],
      correctId: 'a',
      explanation: l(
        'Beschreibungsadäquat ist eine Grammatik, wenn sie nicht nur die richtigen Urteile liefert, sondern den Satz dazu in Einheiten zerlegt und Regelhaftigkeit zeigt.',
        'A grammar is descriptively adequate when it not only delivers the right judgements but also decomposes the sentence into units and reveals rule-governed structure.',
      ),
    },
    {
      id: 'syn-ein-tf-beschreibung-impliziert-beobachtung',
      kind: 'true-false',
      difficulty: 1,
      prompt: l(
        'Eine beschreibungsadäquate Grammatik ist auch beobachtungsadäquat.',
        'A descriptively adequate grammar is also observationally adequate.',
      ),
      correct: true,
      explanation: l(
        'Die beschreibungsadäquate Grammatik sagt die Grammatikalität ebenfalls korrekt voraus – sie erklärt nur zusätzlich, wie das Urteil zustande kommt.',
        'A descriptively adequate grammar also predicts grammaticality correctly – it additionally explains how the judgement arises.',
      ),
    },
    {
      id: 'syn-ein-ockham',
      kind: 'single',
      difficulty: 2,
      prompt: l(
        'Was verlangt Ockhams Rasiermesser für eine wissenschaftliche Theorie?',
        'What does Ockham’s razor require of a scientific theory?',
      ),
      options: [
        {
          id: 'a',
          label: l(
            'Sie sollte so wenige Annahmen wie möglich benötigen, also so einfach und elegant wie möglich sein.',
            'It should require as few assumptions as possible, that is, be as simple and elegant as possible.',
          ),
        },
        {
          id: 'b',
          label: l(
            'Sie sollte möglichst viele Sonderregeln enthalten.',
            'It should contain as many special rules as possible.',
          ),
        },
        {
          id: 'c',
          label: l(
            'Sie sollte nur eine einzige Sprache beschreiben.',
            'It should describe only a single language.',
          ),
        },
        {
          id: 'd',
          label: l(
            'Sie sollte auf Beobachtungen verzichten.',
            'It should do without observations.',
          ),
        },
      ],
      correctId: 'a',
      explanation: l(
        'Ockhams Rasiermesser ist das Prinzip der Sparsamkeit: Eine Theorie soll mit möglichst wenigen Annahmen auskommen.',
        'Ockham’s razor is the principle of parsimony: a theory should get by with as few assumptions as possible.',
      ),
    },
    {
      id: 'syn-ein-ziel-linguistik',
      kind: 'single',
      difficulty: 2,
      prompt: l(
        'Was ist das Ziel der Linguistik?',
        'What is the goal of linguistics?',
      ),
      options: [
        {
          id: 'a',
          label: l(
            'Nicht nur die Regeln einer Sprache zu beschreiben, sondern die aller Sprachen.',
            'Not just to describe the rules of one language, but those of all languages.',
          ),
        },
        {
          id: 'b',
          label: l(
            'Ausschließlich das Deutsche zu beschreiben.',
            'To describe German exclusively.',
          ),
        },
        {
          id: 'c',
          label: l(
            'Wörterbücher für einzelne Sprecherinnen und Sprecher zu erstellen.',
            'To create dictionaries for individual speakers.',
          ),
        },
        {
          id: 'd',
          label: l(
            'Die Performanzfehler von Sprecherinnen und Sprechern zu zählen.',
            'To count speakers’ performance errors.',
          ),
        },
      ],
      correctId: 'a',
      explanation: l(
        'Die Linguistik zielt auf die Regeln aller Sprachen. Die Gemeinsamkeiten heißen Universalien.',
        'Linguistics aims at the rules of all languages. Their commonalities are called universals.',
      ),
    },
    {
      id: 'syn-ein-universalien',
      kind: 'free-text',
      difficulty: 1,
      prompt: l(
        'Wie nennt man die Gemeinsamkeiten, die alle Sprachen teilen?',
        'What are the commonalities shared by all languages called?',
      ),
      accepted: ['Universalien', 'Universals', 'Sprachuniversalien', 'language universals'],
      explanation: l(
        'Sprachen haben gewisse Gemeinsamkeiten – diese Universalien sind der Gegenstand der Universalgrammatik.',
        'Languages share certain commonalities – these universals are the object of universal grammar.',
      ),
    },
    {
      id: 'syn-ein-erklaerungsadaequat',
      kind: 'single',
      difficulty: 2,
      prompt: l(
        'Wann ist eine Grammatik erklärungsadäquat?',
        'When is a grammar explanatorily adequate?',
      ),
      options: [
        {
          id: 'a',
          label: l(
            'Wenn sie eine Sprache auf Grundlage der Universalgrammatik (UG) modelliert.',
            'When it models a language on the basis of universal grammar (UG).',
          ),
        },
        {
          id: 'b',
          label: l(
            'Wenn sie alle Sätze einer Sprache auflistet.',
            'When it lists all sentences of a language.',
          ),
        },
        {
          id: 'c',
          label: l(
            'Wenn sie Sätze in Wörter zerlegt, ohne Regeln zu formulieren.',
            'When it decomposes sentences into words without formulating rules.',
          ),
        },
        {
          id: 'd',
          label: l(
            'Wenn sie nur die Performanz beschreibt.',
            'When it describes only performance.',
          ),
        },
      ],
      correctId: 'a',
      explanation: l(
        'Erklärungsadäquat ist eine beschreibungsadäquate Grammatik dann, wenn sie die Sprache auf der Grundlage universeller Gemeinsamkeiten modelliert.',
        'A descriptively adequate grammar is explanatorily adequate when it models the language on the basis of universal commonalities.',
      ),
    },
    {
      id: 'syn-ein-language-faculty',
      kind: 'free-text',
      difficulty: 2,
      prompt: l(
        'Wie nennt man das angeborene Sprachmodul des Menschen?',
        'What is the human innate language module called?',
      ),
      accepted: ['Faculty of Language', 'Language Faculty', 'Sprachfähigkeit', 'language faculty'],
      explanation: l(
        'Die Faculty of Language (Language Faculty) ist das angenommene angeborene Sprachmodul. Universal Grammar ist die Theorie, die es zu beschreiben versucht.',
        'The faculty of language (language faculty) is the hypothesised innate language module. Universal grammar is the theory that attempts to describe it.',
      ),
    },
    {
      id: 'syn-ein-faculty-diagram',
      kind: 'single',
      difficulty: 2,
      prompt: l(
        'Was entsteht nach dem Modell von Radford (1997) aus der Erfahrung mit Sprache L und der Language Faculty?',
        'According to Radford’s (1997) model, what arises from experience with language L together with the language faculty?',
      ),
      options: [
        {
          id: 'a',
          label: l('Die Grammatik von L.', 'The grammar of L.'),
        },
        { id: 'b', label: l('Die Performanz von L.', 'The performance of L.') },
        { id: 'c', label: l('Ein Wörterbuch von L.', 'A dictionary of L.') },
        { id: 'd', label: l('Die Schrift von L.', 'The writing system of L.') },
      ],
      correctId: 'a',
      explanation: l(
        'Die Language Faculty verarbeitet die Erfahrung mit einer Sprache und ergibt so die Grammatik dieser Sprache.',
        'The language faculty processes experience with a language and thereby yields that language’s grammar.',
      ),
    },
    {
      id: 'syn-ein-tf-ug-angeboren',
      kind: 'true-false',
      difficulty: 2,
      prompt: l(
        'In vielen generativen Theorien wird die allgemeine Grundstruktur der Grammatiken menschlicher Sprachen als angeboren angenommen.',
        'In many generative theories, the general structural basis of human language grammars is assumed to be innate.',
      ),
      correct: true,
      explanation: l(
        'Die Universalgrammatik wird als Beschreibung eines angeborenen Sprachmoduls verstanden, der Faculty of Language.',
        'Universal grammar is understood as a description of an innate language module, the faculty of language.',
      ),
    },
    {
      id: 'syn-ein-strukturunabhaengig',
      kind: 'single',
      difficulty: 2,
      prompt: l(
        'Warum ist die naive Regel „Nimm das zweite Wort eines Deklarativsatzes und setze es vor das erste“ falsch?',
        'Why is the naïve rule “Take the second word of a declarative and put it before the first” wrong?',
      ),
      options: [
        {
          id: 'a',
          label: l(
            'Weil sie strukturunabhängig ist und sich nur an der Oberfläche orientiert, nicht an der grammatischen Struktur.',
            'Because it is structure-independent and oriented only to the surface, not to grammatical structure.',
          ),
        },
        {
          id: 'b',
          label: l(
            'Weil sie zu viele Annahmen macht.',
            'Because it makes too many assumptions.',
          ),
        },
        {
          id: 'c',
          label: l(
            'Weil sie nur auf das Englische anwendbar ist.',
            'Because it applies only to English.',
          ),
        },
        {
          id: 'd',
          label: l(
            'Weil sie die Bedeutung der Wörter nicht berücksichtigt.',
            'Because it does not consider word meaning.',
          ),
        },
      ],
      correctId: 'a',
      explanation: l(
        'Die Regel greift auf die Wortposition zu, nicht auf Konstituenten. Grammatische Regeln müssen aber strukturabhängig sein.',
        'The rule refers to word position, not to constituents. Grammatical rules, however, must be structure-dependent.',
      ),
    },
    {
      id: 'syn-ein-alle-fragen',
      kind: 'single',
      difficulty: 2,
      prompt: l(
        'Warum ist „*Fragen alle werden so gebildet?“ ungrammatisch, obwohl die naive Zweitwort-Regel hier greifen würde?',
        'Why is “*Fragen alle werden so gebildet?” ungrammatical even though the naïve second-word rule would apply?',
      ),
      options: [
        {
          id: 'a',
          label: l(
            'Weil „alle Fragen“ eine Konstituente ist; die Regel müsste diese als Ganzes verschieben, nicht nur das zweite Wort.',
            'Because “alle Fragen” is a constituent; the rule would have to move it as a whole, not just the second word.',
          ),
        },
        {
          id: 'b',
          label: l(
            'Weil „Fragen“ kein Nomen ist.',
            'Because “Fragen” is not a noun.',
          ),
        },
        {
          id: 'c',
          label: l(
            'Weil Fragen im Deutschen nie im Vorfeld stehen können.',
            'Because questions can never occupy the prefield in German.',
          ),
        },
        {
          id: 'd',
          label: l(
            'Weil der Satz zu viele Wörter enthält.',
            'Because the sentence contains too many words.',
          ),
        },
      ],
      correctId: 'a',
      explanation: l(
        '„Alle Fragen“ bildet eine Konstituente. Eine strukturabhängige Regel verschiebt Konstituenten, keine beliebigen Wörter.',
        '“Alle Fragen” forms a constituent. A structure-dependent rule moves constituents, not arbitrary words.',
      ),
    },
    {
      id: 'syn-ein-tf-strukturabhaengig',
      kind: 'true-false',
      difficulty: 1,
      prompt: l(
        'Grammatische Regeln müssen strukturabhängig sein.',
        'Grammatical rules must be structure-dependent.',
      ),
      correct: true,
      explanation: l(
        'Die Regel darf sich nicht an der Oberfläche, sondern muss sich an der grammatischen Struktur orientieren.',
        'The rule must not be oriented to the surface but to grammatical structure.',
      ),
    },
    {
      id: 'syn-ein-cloze-struktur',
      kind: 'cloze',
      difficulty: 2,
      prompt: l(
        'Vervollständige die Schlussfolgerung aus der Kritik an der naiven Regel.',
        'Complete the conclusion drawn from criticising the naïve rule.',
      ),
      segments: [
        { type: 'text', value: l('Grammatische Regeln müssen ', 'Grammatical rules must be ') },
        { type: 'blank', accepted: ['strukturabhängig', 'structure-dependent', 'structure dependent'], width: 150 },
        {
          type: 'text',
          value: l(' sein und dürfen nicht ', ' and must not be '),
        },
        { type: 'blank', accepted: ['strukturunabhängig', 'structure-independent', 'structure independent'], width: 150 },
        { type: 'text', value: l(' nur auf die Oberfläche schauen.', ' and only look at the surface.') },
      ],
      explanation: l(
        'Die naive Zweitwort-Regel ist strukturunabhängig. Grammatische Regeln müssen dagegen auf Konstituenten und damit auf Struktur Bezug nehmen.',
        'The naïve second-word rule is structure-independent. Grammatical rules, by contrast, must refer to constituents and thus to structure.',
      ),
    },
    {
      id: 'syn-ein-matching-adaequatheit',
      kind: 'matching',
      difficulty: 2,
      prompt: l(
        'Ordne den Adäquatheitsstufen ihre Beschreibung zu.',
        'Match each level of adequacy with its description.',
      ),
      pairs: [
        {
          id: 'beobachtung',
          left: l('Beobachtungsadäquat', 'Observationally adequate'),
          right: l(
            'Bestimmt korrekt, ob ein Satz grammatisch ist – notfalls als Liste.',
            'Correctly determines whether a sentence is grammatical – if necessary as a list.',
          ),
        },
        {
          id: 'beschreibung',
          left: l('Beschreibungsadäquat', 'Descriptively adequate'),
          right: l(
            'Zerlegt den Satz in kleinere Einheiten und prüft, ob sie Regeln folgen.',
            'Decomposes the sentence into smaller units and checks whether they follow rules.',
          ),
        },
        {
          id: 'erklaerung',
          left: l('Erklärungsadäquat', 'Explanatorily adequate'),
          right: l(
            'Modelliert die Sprache auf Grundlage der Universalgrammatik.',
            'Models the language on the basis of universal grammar.',
          ),
        },
      ],
      explanation: l(
        'Die Stufen bauen aufeinander auf: Erklärungsadäquatheit setzt Beschreibungsadäquatheit voraus, diese wiederum Beobachtungsadäquatheit.',
        'The levels build on one another: explanatory adequacy presupposes descriptive adequacy, which in turn presupposes observational adequacy.',
      ),
    },
    {
      id: 'syn-ein-ordering-adaequatheit',
      kind: 'ordering',
      difficulty: 2,
      prompt: l(
        'Ordne die Adäquatheitsstufen von der schwächsten zur stärksten Anforderung.',
        'Order the levels of adequacy from the weakest to the strongest requirement.',
      ),
      items: [
        { id: 'beobachtung', label: l('Beobachtungsadäquat', 'Observational adequacy') },
        { id: 'beschreibung', label: l('Beschreibungsadäquat', 'Descriptive adequacy') },
        { id: 'erklaerung', label: l('Erklärungsadäquat', 'Explanatory adequacy') },
      ],
      explanation: l(
        'Beobachtungsadäquat ist die schwächste Stufe, beschreibungsadäquat ist stärker, erklärungsadäquat die stärkste.',
        'Observational adequacy is the weakest level, descriptive adequacy is stronger, and explanatory adequacy the strongest.',
      ),
    },
    {
      id: 'syn-ein-flashcard-kompetenz',
      kind: 'flashcard',
      difficulty: 1,
      prompt: l(
        'Was ist der Unterschied zwischen Kompetenz und Performanz?',
        'What is the difference between competence and performance?',
      ),
      back: l(
        'Kompetenz (I-Language) ist das Wissen eines idealisierten Sprecher-Hörers über die syntaktischen Regeln. Performanz (E-Language) ist der tatsächliche, stark fehlerbehaftete Sprachgebrauch. Die Syntax untersucht die Kompetenz.',
        'Competence (I-language) is an idealised speaker-hearer’s knowledge of syntactic rules. Performance (E-language) is actual language use, which is strongly prone to errors. Syntax studies competence.',
      ),
    },
  ],
};
