import type { QuizTopic } from '@/src/quiz/types';

import { l } from '../helpers';

export const pragGrice: QuizTopic = {
  id: 'prag-grice',
  title: l('Grice: Maximen & Implikaturen', 'Grice: maxims & implicatures'),
  meeting: l('1. Sitzung · 12. Oktober 2026', 'Session 1 · 12 October 2026'),
  summary: l(
    'Wie das Kooperationsprinzip, die vier Maximen und ihre erkennbare Verletzung erklären, warum wir mehr meinen, als wir sagen – von der Bierflasche über Ironie bis zur Hundepfeife.',
    'How the cooperative principle, the four maxims, and their visible flouting explain why we mean more than we say – from the beer bottle to irony and dog whistles.',
  ),
  source: l(
    'Pragmatik I · Was ist „Pragmatik“? · Erste Sitzung',
    'Pragmatics I · What is “pragmatics”? · First session',
  ),
  questions: [
    {
      id: 'prag-grice-wer',
      kind: 'single',
      difficulty: 1,
      prompt: l(
        'Wer entwickelte das Kooperationsprinzip und die vier Konversationsmaximen?',
        'Who developed the cooperative principle and the four conversational maxims?',
      ),
      options: [
        { id: 'a', label: l('Paul Grice', 'Paul Grice') },
        { id: 'b', label: l('John L. Austin', 'John L. Austin') },
        { id: 'c', label: l('John R. Searle', 'John R. Searle') },
        { id: 'd', label: l('Ferdinand de Saussure', 'Ferdinand de Saussure') },
      ],
      correctId: 'a',
      explanation: l(
        'Der Philosoph Paul Grice suchte eine systematische Erklärung dafür, wie wir vom Gesagten zum Gemeinten gelangen.',
        'The philosopher Paul Grice sought a systematic explanation of how we get from what is said to what is meant.',
      ),
    },
    {
      id: 'prag-grice-maximen',
      kind: 'multiple',
      difficulty: 1,
      prompt: l(
        'Welche Maximen gehören zu Grices Modell?',
        'Which maxims belong to Grice’s model?',
      ),
      options: [
        { id: 'a', label: l('Qualität', 'Quality') },
        { id: 'b', label: l('Quantität', 'Quantity') },
        { id: 'c', label: l('Relevanz', 'Relevance') },
        { id: 'd', label: l('Art und Weise', 'Manner') },
        { id: 'e', label: l('Höflichkeit', 'Politeness') },
      ],
      correctIds: ['a', 'b', 'c', 'd'],
      explanation: l(
        'Grice unterscheidet Qualität, Quantität, Relevanz und Art und Weise. Höflichkeit ist ein späteres Thema der Pragmatik, keine Maxime bei Grice.',
        'Grice distinguishes quality, quantity, relevance, and manner. Politeness is a later topic in pragmatics, not one of Grice’s maxims.',
      ),
    },
    {
      id: 'prag-match-maximen',
      kind: 'matching',
      difficulty: 2,
      prompt: l(
        'Ordne jeder Maxime ihren Inhalt zu.',
        'Match each maxim with its content.',
      ),
      pairs: [
        {
          id: 'qualitaet',
          left: l('Qualität', 'Quality'),
          right: l('Sage nichts, was du für falsch hältst.', 'Do not say what you believe to be false.'),
        },
        {
          id: 'quantitaet',
          left: l('Quantität', 'Quantity'),
          right: l('Sage nicht mehr und nicht weniger als nötig.', 'Say neither more nor less than necessary.'),
        },
        {
          id: 'relevanz',
          left: l('Relevanz', 'Relevance'),
          right: l('Sei relevant.', 'Be relevant.'),
        },
        {
          id: 'art',
          left: l('Art und Weise', 'Manner'),
          right: l('Sei klar und kurz im Ausdruck.', 'Be clear and brief in expression.'),
        },
      ],
      explanation: l(
        'Qualität betrifft die Wahrhaftigkeit, Quantität den Informationsgehalt, Relevanz den Bezug zum Gespräch und Art und Weise die Formulierung.',
        'Quality concerns truthfulness, quantity the amount of information, relevance the connection to the conversation, and manner the formulation.',
      ),
    },
    {
      id: 'prag-maximen-normativ',
      kind: 'single',
      difficulty: 2,
      prompt: l(
        'Wie sind Grices Maximen gemeint?',
        'How are Grice’s maxims intended?',
      ),
      options: [
        {
          id: 'a',
          label: l(
            'Nicht als Regeln, die man nie brechen darf, sondern als Erwartungen, deren erkennbarer Bruch Bedeutung erzeugen kann.',
            'Not as rules that must never be broken, but as expectations whose visible flouting can generate meaning.',
          ),
        },
        {
          id: 'b',
          label: l(
            'Als Gesetze, die in jeder Kommunikation zwingend befolgt werden.',
            'As laws that must always be followed in every act of communication.',
          ),
        },
        { id: 'c', label: l('Als grammatische Regeln.', 'As grammatical rules.') },
        { id: 'd', label: l('Als Regeln der Aussprache.', 'As rules of pronunciation.') },
      ],
      correctId: 'a',
      explanation: l(
        'Grice meinte die Maximen nicht normativ. Gerade der erkennbare Bruch – etwa bei Ironie – erlaubt es, über das Gesagte hinaus etwas anderes zu meinen.',
        'Grice did not intend the maxims normatively. It is precisely visible flouting – as in irony – that allows a speaker to mean something beyond what is said.',
      ),
    },
    {
      id: 'prag-implikatur-definition',
      kind: 'single',
      difficulty: 2,
      prompt: l(
        'Was ist eine Implikatur?',
        'What is an implicature?',
      ),
      options: [
        {
          id: 'a',
          label: l(
            'Etwas, das über das Gesagte hinaus gemeint wird und aus der Annahme der Kooperation erschlossen wird.',
            'Something meant beyond what is said, inferred from the assumption of cooperation.',
          ),
        },
        { id: 'b', label: l('Ein logischer Schluss aus der Satzbedeutung.', 'A logical inference from sentence meaning.') },
        { id: 'c', label: l('Eine grammatische Kategorie.', 'A grammatical category.') },
        { id: 'd', label: l('Ein Merkmal eines Dialekts.', 'A feature of a dialect.') },
      ],
      correctId: 'a',
      explanation: l(
        'Eine Implikatur entsteht pragmatisch: Der Hörer erschließt aus dem Gesagten, dem Kontext und der Annahme, dass der Sprecher kooperiert, das Gemeinte.',
        'An implicature arises pragmatically: the hearer infers what is meant from what is said, the context, and the assumption that the speaker is cooperating.',
      ),
    },
    {
      id: 'prag-rose-implikation',
      kind: 'single',
      difficulty: 2,
      prompt: l(
        '„Marvin hat eine Rose gekauft“ ⇒ „Marvin hat eine Blume gekauft“. Um welche Beziehung handelt es sich?',
        '“Marvin bought a rose” ⇒ “Marvin bought a flower.” What kind of relation is this?',
      ),
      options: [
        { id: 'a', label: l('Eine logische Implikation.', 'A logical implication.') },
        { id: 'b', label: l('Eine Implikatur.', 'An implicature.') },
        { id: 'c', label: l('Eine Präsupposition.', 'A presupposition.') },
        { id: 'd', label: l('Einen Sprechakt.', 'A speech act.') },
      ],
      correctId: 'a',
      explanation: l(
        'Das ist eine logische Folgerung: Eine Rose ist notwendigerweise eine Blume. „Implikatur“ meint dagegen das pragmatische „über das Gesagte hinaus Meinen“.',
        'This is a logical inference: a rose is necessarily a flower. “Implicature”, by contrast, refers to the pragmatic meaning beyond what is said.',
      ),
    },
    {
      id: 'prag-umgang-maximen',
      kind: 'multiple',
      difficulty: 2,
      prompt: l(
        'Wie kann ein Sprecher mit den Maximen umgehen?',
        'How can a speaker handle the maxims?',
      ),
      options: [
        { id: 'a', label: l('Sie befolgen (observe).', 'Follow them (observe).') },
        { id: 'b', label: l('Sie verletzen (violate).', 'Violate them.') },
        { id: 'c', label: l('Ausdrücklich aussteigen (opt out).', 'Explicitly opt out.') },
        { id: 'd', label: l('Sie vollständig abschaffen.', 'Abolish them completely.') },
      ],
      correctIds: ['a', 'b', 'c'],
      explanation: l(
        'Grice unterscheidet observe, violate und opt out. Der Normalfall ist das Befolgen; der erkennbare Bruch kann Implikaturen erzeugen.',
        'Grice distinguishes observe, violate, and opt out. Following them is the normal case; visible flouting can generate implicatures.',
      ),
    },
    {
      id: 'prag-bier-quantitaet',
      kind: 'single',
      difficulty: 2,
      prompt: l(
        'Welche Maxime führt bei der Antwort „eine Flasche Bier“ zu der Implikatur „genau eine, nicht mehr“?',
        'Which maxim produces the implicature “exactly one, not more” in the answer “one bottle of beer”?',
      ),
      options: [
        { id: 'a', label: l('Qualität', 'Quality') },
        { id: 'b', label: l('Quantität', 'Quantity') },
        { id: 'c', label: l('Relevanz', 'Relevance') },
        { id: 'd', label: l('Art und Weise', 'Manner') },
      ],
      correctId: 'b',
      explanation: l(
        'Die Polizei geht davon aus, dass die Antwort ausreichend informativ ist. Wäre es mehr gewesen, hätte der Sprecher es nach der Quantitätsmaxime sagen müssen.',
        'The police assume that the answer is sufficiently informative. If it had been more, the speaker would have had to say so according to the maxim of quantity.',
      ),
    },
    {
      id: 'prag-tf-bier-informativ',
      kind: 'true-false',
      difficulty: 1,
      prompt: l(
        'Die Antwort „eine Flasche Bier“ ist nach vier Flaschen Bier wahr, aber nicht ausreichend informativ.',
        'After four bottles of beer, the answer “one bottle of beer” is true but not sufficiently informative.',
      ),
      correct: true,
      explanation: l(
        'Der wörtliche Gehalt stimmt, doch die Antwort verletzt die intuitive Erwartung an eine ausreichend informative Antwort.',
        'The literal content is correct, but the answer violates the intuitive expectation of a sufficiently informative response.',
      ),
    },
    {
      id: 'prag-ironie-grice',
      kind: 'single',
      difficulty: 2,
      prompt: l(
        'Wie erklärt Grice Ironie?',
        'How does Grice explain irony?',
      ),
      options: [
        {
          id: 'a',
          label: l(
            'Der Sprecher bricht augenfällig die Maxime der Qualität; der Hörer geht weiter von Kooperation aus und erschließt das Gegenteil.',
            'The speaker visibly flouts the maxim of quality; the hearer still assumes cooperation and infers the opposite.',
          ),
        },
        {
          id: 'b',
          label: l(
            'Der Sprecher lügt absichtlich, ohne dass der Hörer den Bruch bemerken soll.',
            'The speaker lies deliberately without the hearer being meant to notice the violation.',
          ),
        },
        {
          id: 'c',
          label: l(
            'Der Sprecher verletzt die Maxime der Quantität.',
            'The speaker violates the maxim of quantity.',
          ),
        },
        {
          id: 'd',
          label: l(
            'Der Sprecher steigt ausdrücklich aus allen Maximen aus.',
            'The speaker explicitly opts out of all maxims.',
          ),
        },
      ],
      correctId: 'a',
      explanation: l(
        'Bei Ironie ist der Bruch der Qualitätsmaxime für den Hörer offensichtlich, aber nichts spricht dafür, dass der Sprecher unkooperativ ist. Also meint er etwas anderes – hier das Gegenteil.',
        'In irony the violation of quality is obvious to the hearer, yet nothing suggests the speaker is being uncooperative. So they must mean something else – here, the opposite.',
      ),
    },
    {
      id: 'prag-tf-luege',
      kind: 'true-false',
      difficulty: 2,
      prompt: l(
        'Beim Lügen will der Sprecher, dass der Hörer den Bruch der Qualitätsmaxime bemerkt.',
        'When lying, the speaker wants the hearer to notice the violation of the maxim of quality.',
      ),
      correct: false,
      explanation: l(
        'Bei der Lüge wird die Qualitätsmaxime gebrochen, ohne dass der Hörer den Bruch erkennen soll. Bei Ironie soll er ihn gerade erkennen.',
        'In a lie the maxim of quality is violated without the hearer being meant to notice. In irony the hearer is precisely meant to notice it.',
      ),
    },
    {
      id: 'prag-opt-out',
      kind: 'single',
      difficulty: 2,
      prompt: l(
        'Welche Äußerung ist ein Beispiel für opt out?',
        'Which utterance is an example of opting out?',
      ),
      options: [
        { id: 'a', label: l('„Dazu kann ich aus Schweigepflicht nichts sagen.“', '“I cannot say anything about that due to confidentiality.”') },
        { id: 'b', label: l('„Ich habe eine Flasche Bier getrunken.“', '“I drank one bottle of beer.”') },
        { id: 'c', label: l('„Maximilian ist ein Genie.“', '“Maximilian is a genius.”') },
        { id: 'd', label: l('„Können Sie mir das Salz geben?“', '“Can you pass me the salt?”') },
      ],
      correctId: 'a',
      explanation: l(
        'Opt out heißt, ausdrücklich zu signalisieren, dass man aus bestimmten Gründen nicht kooperieren kann oder will – etwa wegen Schweigepflicht.',
        'Opting out means explicitly signalling that one cannot or will not cooperate for certain reasons – such as confidentiality.',
      ),
    },
    {
      id: 'prag-tf-ironie-schwach',
      kind: 'true-false',
      difficulty: 3,
      prompt: l(
        'Grices Ironieanalyse lässt sich ohne Einschränkung auf alle ironischen Äußerungen anwenden.',
        'Grice’s analysis of irony applies without restriction to all ironic utterances.',
      ),
      correct: false,
      explanation: l(
        'Die Analyse hat Schwächen: Ironie funktioniert auch mit wahren Aussagen, meint nicht immer exakt das Gegenteil und die ablehnende Haltung des Sprechers wird nicht eigens erklärt.',
        'The analysis has weaknesses: irony also works with true statements, does not always mean the exact opposite, and the speaker’s evaluative attitude is not specifically explained.',
      ),
    },
    {
      id: 'prag-implikatur-begriff',
      kind: 'free-text',
      difficulty: 2,
      prompt: l(
        'Wie nennt Grice das „über das Gesagte hinaus Meinen“?',
        'What does Grice call “meaning beyond what is said”?',
      ),
      accepted: ['Implikatur', 'Implikaturen', 'implicature', 'implicatures'],
      hint: l('Nicht mit „Implikation“ verwechseln.', 'Not to be confused with “implication”.'),
      explanation: l(
        'Grice nennt es Implikatur. „Implikation“ ist dagegen der logische Schluss, etwa von der Rose auf die Blume.',
        'Grice calls it implicature. “Implication”, by contrast, is the logical inference, for example from rose to flower.',
      ),
    },
    {
      id: 'prag-cloze-maximen',
      kind: 'cloze',
      difficulty: 2,
      prompt: l(
        'Vervollständige die beiden Maximen.',
        'Complete the two maxims.',
      ),
      segments: [
        { type: 'text', value: l('Die Maxime der ', 'The maxim of ') },
        { type: 'blank', accepted: ['Qualität', 'quality'], width: 96 },
        { type: 'text', value: l(' verlangt, nichts zu sagen, was man für falsch hält. Die Maxime der ', ' requires not saying what one believes to be false. The maxim of ') },
        { type: 'blank', accepted: ['Quantität', 'quantity'], width: 96 },
        { type: 'text', value: l(' verlangt, nicht mehr und nicht weniger als nötig zu sagen.', ' requires saying neither more nor less than necessary.') },
      ],
      explanation: l(
        'Qualität = Wahrhaftigkeit; Quantität = angemessene Informationsmenge.',
        'Quality = truthfulness; quantity = an appropriate amount of information.',
      ),
    },
    {
      id: 'prag-card-implikatur',
      kind: 'flashcard',
      difficulty: 2,
      prompt: l(
        'Was ist der Unterschied zwischen Implikatur und Implikation?',
        'What is the difference between implicature and implication?',
      ),
      back: l(
        'Eine Implikatur ist pragmatisch: Sie wird aus dem Gesagten, dem Kontext und der Annahme der Kooperation erschlossen. Eine Implikation ist logisch: „Rose“ impliziert „Blume“, weil eine Rose notwendigerweise eine Blume ist.',
        'An implicature is pragmatic: it is inferred from what is said, the context, and the assumption of cooperation. An implication is logical: “rose” implies “flower” because a rose is necessarily a flower.',
      ),
    },
    {
      id: 'prag-dog-whistle',
      kind: 'single',
      difficulty: 2,
      prompt: l(
        'Warum ist die Wendung „Alles für Deutschland“ ein Beispiel für Dog Whistling?',
        'Why is the phrase “Alles für Deutschland” an example of dog whistling?',
      ),
      options: [
        {
          id: 'a',
          label: l(
            'Sie ist eine Losung der NSDAP, deren verfassungsfeindliche Bedeutung erst mit dem Kontext erkennbar wird, während sie ohne Kontext harmlos erscheint.',
            'It is an NSDAP slogan whose anti-constitutional meaning becomes recognisable only with context, while it appears harmless without that context.',
          ),
        },
        {
          id: 'b',
          label: l(
            'Sie ist eine harmlose Alltagsformel ohne Geschichte.',
            'It is a harmless everyday phrase without a history.',
          ),
        },
        { id: 'c', label: l('Sie ist ein Grammatikfehler.', 'It is a grammatical error.') },
        { id: 'd', label: l('Sie ist ein ausdrückliches Gesetz.', 'It is an explicit law.') },
      ],
      correctId: 'a',
      explanation: l(
        'Dog Whistles sind Anspielungen, die für Eingeweihte klar sind, nach außen aber harmlos wirken. Die Bedeutung hängt entscheidend am Kontext – hier an der NSDAP-Losung.',
        'Dog whistles are allusions that are clear to insiders but appear harmless to outsiders. Their meaning depends crucially on context – here on the NSDAP slogan.',
      ),
    },
    {
      id: 'prag-tf-dog-whistle',
      kind: 'true-false',
      difficulty: 1,
      prompt: l(
        'Dog Whistles funktionieren, weil ihre eigentliche Bedeutung in den Worten selbst völlig offen zutage liegt.',
        'Dog whistles work because their actual meaning lies completely open in the words themselves.',
      ),
      correct: false,
      explanation: l(
        'Gerade das Gegenteil ist der Fall: Die Anspielung bleibt ohne Kontext verdeckt. Das ermöglicht Bestreitbarkeit und schützt vor rechtlicher Ahndung.',
        'The opposite is true: without context the allusion remains hidden. That enables deniability and protects against legal consequences.',
      ),
    },
    {
      id: 'prag-dog-whistle-wirkung',
      kind: 'multiple',
      difficulty: 2,
      prompt: l(
        'Warum sind Dog Whistles ein wirksames Mittel?',
        'Why are dog whistles effective?',
      ),
      options: [
        { id: 'a', label: l('Sie ermöglichen plausible Bestreitbarkeit.', 'They allow plausible deniability.') },
        { id: 'b', label: l('Die eingeweihte Gruppe erkennt die Anspielung.', 'The in-group recognises the allusion.') },
        {
          id: 'c',
          label: l(
            'Sie können zuvor inakzeptable Ansichten in den Mainstream einführen.',
            'They can introduce previously unacceptable views into the mainstream.',
          ),
        },
        { id: 'd', label: l('Sie werden immer rechtlich verfolgt.', 'They are always legally prosecuted.') },
        { id: 'e', label: l('Sie sind völlig unabhängig vom Kontext.', 'They are completely independent of context.') },
      ],
      correctIds: ['a', 'b', 'c'],
      explanation: l(
        'Dog Whistles wirken durch Kontext und Andeutung: Außenstehende können die Aussage als harmlos verstehen, Eingeweihte erkennen die Botschaft. Rechtlich sind sie oft schwer zu fassen.',
        'Dog whistles work through context and allusion: outsiders can read the statement as harmless while insiders recognise the message. They are often hard to prosecute.',
      ),
    },
    {
      id: 'prag-zitat-seminar',
      kind: 'single',
      difficulty: 3,
      prompt: l(
        'Was passiert, wenn der Ausdruck „Alles für Deutschland“ in einem Seminar zitiert und analysiert wird?',
        'What happens when the phrase “Alles für Deutschland” is quoted and analysed in a seminar?',
      ),
      options: [
        {
          id: 'a',
          label: l(
            'Der Ausdruck wird als Gegenstand der Analyse erwähnt, nicht als Losung gebraucht; seine historische Bedeutung und sein Kontext bleiben relevant.',
            'The phrase is mentioned as an object of analysis rather than used as a slogan; its historical meaning and context remain relevant.',
          ),
        },
        { id: 'b', label: l('Der Ausdruck verliert jede Bedeutung.', 'The phrase loses all meaning.') },
        {
          id: 'c',
          label: l(
            'Die zitierende Person drückt automatisch dieselbe politische Überzeugung aus.',
            'The person quoting it automatically expresses the same political conviction.',
          ),
        },
        { id: 'd', label: l('Der Ausdruck ist keine sprachliche Äußerung mehr.', 'The phrase is no longer a linguistic utterance.') },
      ],
      correctId: 'a',
      explanation: l(
        'Zwischen Erwähnen/Zitieren und Verwenden besteht ein Unterschied. Die historische Bedeutung verschwindet dadurch nicht – der Kontext der wissenschaftlichen Analyse ist aber ein anderer als der der politischen Rede.',
        'There is a difference between mentioning/quoting and using. The historical meaning does not disappear – but the context of academic analysis differs from that of a political speech.',
      ),
    },
    {
      id: 'prag-order-ironie',
      kind: 'ordering',
      difficulty: 3,
      prompt: l(
        'Ordne Grices Rekonstruktion der Ironie in die richtige Reihenfolge.',
        'Order Grice’s reconstruction of irony correctly.',
      ),
      items: [
        { id: 'aeusserung', label: l('Der Sprecher äußert etwas, das offensichtlich falsch ist.', 'The speaker says something that is obviously false.') },
        { id: 'bruch', label: l('Der Hörer bemerkt den Bruch der Qualitätsmaxime.', 'The hearer notices the violation of the maxim of quality.') },
        { id: 'kooperation', label: l('Der Hörer geht weiterhin von Kooperation aus.', 'The hearer continues to assume cooperation.') },
        { id: 'gegenteil', label: l('Der Hörer erschließt die entgegengesetzte Bedeutung.', 'The hearer infers the opposite meaning.') },
      ],
      explanation: l(
        'Der offensichtliche Bruch der Qualität wird bemerkt, die Kooperationsannahme bleibt bestehen, und daraus erschließt der Hörer das Gegenteil.',
        'The obvious violation of quality is noticed, the assumption of cooperation remains, and from this the hearer infers the opposite.',
      ),
    },
    {
      id: 'prag-match-strategien',
      kind: 'matching',
      difficulty: 2,
      prompt: l(
        'Ordne den Strategien im Umgang mit den Maximen ein Beispiel zu.',
        'Match each strategy for handling the maxims with an example.',
      ),
      pairs: [
        {
          id: 'observe',
          left: l('Befolgen (observe)', 'Following (observe)'),
          right: l('Eine ausreichend informative Antwort geben.', 'Give a sufficiently informative answer.'),
        },
        {
          id: 'violate',
          left: l('Verletzen (violate)', 'Violating'),
          right: l('Bewusst die Unwahrheit sagen, ohne dass der Hörer es merkt.', 'Deliberately say something false without the hearer noticing.'),
        },
        {
          id: 'optout',
          left: l('Aussteigen (opt out)', 'Opting out'),
          right: l('Auf die Schweigepflicht verweisen.', 'Point to confidentiality.'),
        },
      ],
      explanation: l(
        'Befolgen erzeugt den Normalfall, Verletzen kann täuschen, und opt out signalisiert offen, dass man nicht kooperieren kann oder will.',
        'Following is the normal case, violating can deceive, and opting out openly signals that one cannot or will not cooperate.',
      ),
    },
  ],
};
