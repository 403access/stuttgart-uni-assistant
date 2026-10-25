import { europeMap } from '@/src/quiz/maps/europe';
import type { QuizTopic } from '@/src/quiz/types';

import { l } from '../helpers';

export const sprachfamilien: QuizTopic = {
  id: 'ling-sprachfamilien',
  title: l('Sprachfamilien & Deutsch', 'Language families & German'),
  meeting: l('1. Sitzung', 'Session 1'),
  summary: l(
    'Die wichtigsten Sprachfamilien Europas, die genetische Stellung des Deutschen und die westgermanischen Sprachen.',
    'The major language families of Europe, German’s genetic position, and the West Germanic languages.',
  ),
  source: l(
    'Einführung in die Linguistik (für Linguist/inn/en) · Grundlagen der ersten Sitzung',
    'Introduction to Linguistics · basics from the first session',
  ),
  questions: [
    {
      id: 'ling-welt-sprachen',
      kind: 'single',
      difficulty: 1,
      prompt: l(
        'Wie viele Sprachen gibt es ungefähr auf der Welt?',
        'Roughly how many languages are there in the world?',
      ),
      options: [
        { id: 'a', label: l('600', '600') },
        { id: 'b', label: l('6.000', '6,000') },
        { id: 'c', label: l('60.000', '60,000') },
        { id: 'd', label: l('600.000', '600,000') },
      ],
      correctId: 'b',
      explanation: l(
        'Man schätzt rund 6.000 Sprachen weltweit. Die genaue Zahl ist umstritten, weil schon die Abgrenzung von Sprache und Dialekt schwierig ist.',
        'Estimates put the number at around 6,000 languages. The exact figure is disputed because even separating languages from dialects is difficult.',
      ),
    },
    {
      id: 'ling-deutsch-familie',
      kind: 'single',
      difficulty: 1,
      prompt: l(
        'Zu welcher Sprachfamilie gehört Deutsch?',
        'Which language family does German belong to?',
      ),
      options: [
        { id: 'a', label: l('Indogermanisch', 'Indo-European') },
        { id: 'b', label: l('Finno-Ugrisch', 'Finno-Ugric') },
        { id: 'c', label: l('Turksprachen', 'Turkic') },
        { id: 'd', label: l('Afro-Asiatisch', 'Afro-Asiatic') },
      ],
      correctId: 'a',
      explanation: l(
        'Deutsch ist eine indogermanische Sprache. Innerhalb dieser Familie gehört es zum germanischen Zweig.',
        'German is an Indo-European language. Within that family it belongs to the Germanic branch.',
      ),
    },
    {
      id: 'ling-deutsch-zweig',
      kind: 'single',
      difficulty: 2,
      prompt: l(
        'Zu welchem Zweig des Indogermanischen gehört Deutsch?',
        'Which branch of Indo-European does German belong to?',
      ),
      options: [
        { id: 'a', label: l('Romanisch', 'Romance') },
        { id: 'b', label: l('Slawisch', 'Slavic') },
        { id: 'c', label: l('Germanisch', 'Germanic') },
        { id: 'd', label: l('Keltisch', 'Celtic') },
      ],
      correctId: 'c',
      explanation: l(
        'Die genetische Stellung lautet: Indogermanisch → Germanisch → Westgermanisch → Deutsch.',
        'The genetic path is: Indo-European → Germanic → West Germanic → German.',
      ),
    },
    {
      id: 'ling-deutsch-stufe',
      kind: 'single',
      difficulty: 2,
      prompt: l(
        'Welche Stufe steht in der genetischen Gliederung direkt unter „Germanisch“?',
        'Which level comes directly below “Germanic” in the genetic classification?',
      ),
      options: [
        { id: 'a', label: l('Westgermanisch', 'West Germanic') },
        { id: 'b', label: l('Nordgermanisch', 'North Germanic') },
        { id: 'c', label: l('Ostgermanisch', 'East Germanic') },
        { id: 'd', label: l('Urgermanisch', 'Proto-Germanic') },
      ],
      correctId: 'a',
      explanation: l(
        'Deutsch ist westgermanisch. Nordgermanisch sind etwa Schwedisch, Dänisch und Norwegisch.',
        'German is West Germanic. Swedish, Danish, and Norwegian, for example, are North Germanic.',
      ),
    },
    {
      id: 'ling-baskisch',
      kind: 'single',
      difficulty: 2,
      prompt: l(
        'Was ist die Besonderheit des Baskischen?',
        'What is special about Basque?',
      ),
      options: [
        {
          id: 'a',
          label: l(
            'Es ist keine indogermanische Sprache und gilt als isolierte Sprache.',
            'It is not Indo-European and is considered a language isolate.',
          ),
        },
        { id: 'b', label: l('Es ist eine romanische Sprache.', 'It is a Romance language.') },
        { id: 'c', label: l('Es gehört zu den finno-ugrischen Sprachen.', 'It belongs to the Finno-Ugric languages.') },
        { id: 'd', label: l('Es ist eine kaukasische Sprache.', 'It is a Caucasian language.') },
      ],
      correctId: 'a',
      explanation: l(
        'Baskisch hat keine bekannten Verwandten und wird deshalb als isolierte Sprache geführt. Es ist keine indogermanische Sprache.',
        'Basque has no known relatives and is therefore treated as a language isolate. It is not Indo-European.',
      ),
    },
    {
      id: 'ling-westgermanisch-nicht',
      kind: 'single',
      difficulty: 2,
      prompt: l(
        'Welche Sprache gehört NICHT zu den westgermanischen Sprachen?',
        'Which language is NOT West Germanic?',
      ),
      options: [
        { id: 'a', label: l('Englisch', 'English') },
        { id: 'b', label: l('Jiddisch', 'Yiddish') },
        { id: 'c', label: l('Schwedisch', 'Swedish') },
        { id: 'd', label: l('Afrikaans', 'Afrikaans') },
      ],
      correctId: 'c',
      explanation: l(
        'Schwedisch ist nordgermanisch. Westgermanisch sind unter anderem Englisch, Niederländisch, Flämisch, Afrikaans, Friesisch und Jiddisch.',
        'Swedish is North Germanic. West Germanic includes English, Dutch, Flemish, Afrikaans, Frisian, and Yiddish.',
      ),
    },
    {
      id: 'ling-europa-nicht',
      kind: 'single',
      difficulty: 2,
      prompt: l(
        'Welche Sprachfamilie ist in Europa NICHT vertreten?',
        'Which language family is NOT represented in Europe?',
      ),
      options: [
        { id: 'a', label: l('Indogermanisch', 'Indo-European') },
        { id: 'b', label: l('Finno-Ugrisch', 'Finno-Ugric') },
        { id: 'c', label: l('Bantu', 'Bantu') },
        { id: 'd', label: l('Turksprachen', 'Turkic') },
      ],
      correctId: 'c',
      explanation: l(
        'Bantu-Sprachen sind in Afrika verbreitet. In Europa sind unter anderem indogermanische, finno-ugrische, kaukasische, turksprachige, afro-asiatische und baskische Sprachen vertreten.',
        'Bantu languages are spoken in Africa. Europe is home to Indo-European, Finno-Ugric, Caucasian, Turkic, Afro-Asiatic, and Basque languages, among others.',
      ),
    },
    {
      id: 'ling-westgermanisch-alle',
      kind: 'multiple',
      difficulty: 2,
      prompt: l(
        'Welche dieser Sprachen sind westgermanisch?',
        'Which of these languages are West Germanic?',
      ),
      options: [
        { id: 'de', label: l('Deutsch', 'German') },
        { id: 'en', label: l('Englisch', 'English') },
        { id: 'nl', label: l('Niederländisch', 'Dutch') },
        { id: 'fl', label: l('Flämisch', 'Flemish') },
        { id: 'af', label: l('Afrikaans', 'Afrikaans') },
        { id: 'fy', label: l('Friesisch', 'Frisian') },
        { id: 'yi', label: l('Jiddisch', 'Yiddish') },
        { id: 'sv', label: l('Schwedisch', 'Swedish') },
        { id: 'fr', label: l('Französisch', 'French') },
        { id: 'hu', label: l('Ungarisch', 'Hungarian') },
      ],
      correctIds: ['de', 'en', 'nl', 'fl', 'af', 'fy', 'yi'],
      explanation: l(
        'Alle sieben gehören zum westgermanischen Zweig. Schwedisch ist nordgermanisch, Französisch romanisch und Ungarisch finno-ugrisch.',
        'All seven belong to the West Germanic branch. Swedish is North Germanic, French is Romance, and Hungarian is Finno-Ugric.',
      ),
    },
    {
      id: 'ling-familien-europa',
      kind: 'multiple',
      difficulty: 2,
      prompt: l(
        'Welche Sprachfamilien kommen in Europa vor?',
        'Which language families are found in Europe?',
      ),
      options: [
        { id: 'ine', label: l('Indogermanisch', 'Indo-European') },
        { id: 'fu', label: l('Finno-Ugrisch', 'Finno-Ugric') },
        { id: 'eu', label: l('Baskisch', 'Basque') },
        { id: 'cau', label: l('Kaukasische Sprachfamilien', 'Caucasian language families') },
        { id: 'trk', label: l('Turksprachen', 'Turkic') },
        { id: 'afa', label: l('Afro-Asiatisch', 'Afro-Asiatic') },
        { id: 'sit', label: l('Sino-Tibetisch', 'Sino-Tibetan') },
        { id: 'bnt', label: l('Bantu', 'Bantu') },
      ],
      correctIds: ['ine', 'fu', 'eu', 'cau', 'trk', 'afa'],
      explanation: l(
        'Sino-Tibetisch und Bantu gehören nicht zu den in Europa vertretenen Familien. Afro-Asiatisch ist über das Maltesische in Europa präsent.',
        'Sino-Tibetan and Bantu are not represented in Europe. Afro-Asiatic is present in Europe through Maltese.',
      ),
    },
    {
      id: 'ling-finnougrisch-alle',
      kind: 'multiple',
      difficulty: 2,
      prompt: l(
        'Welche Sprachen gehören zu den größeren finno-ugrischen Sprachen Europas?',
        'Which languages are among the larger Finno-Ugric languages of Europe?',
      ),
      options: [
        { id: 'hu', label: l('Ungarisch', 'Hungarian') },
        { id: 'fi', label: l('Finnisch', 'Finnish') },
        { id: 'et', label: l('Estnisch', 'Estonian') },
        { id: 'se', label: l('Saamisch', 'Sami') },
        { id: 'tr', label: l('Türkisch', 'Turkish') },
        { id: 'eu', label: l('Baskisch', 'Basque') },
        { id: 'yi', label: l('Jiddisch', 'Yiddish') },
      ],
      correctIds: ['hu', 'fi', 'et', 'se'],
      explanation: l(
        'Ungarisch, Finnisch, Estnisch und Saamisch sind finno-ugrisch (uralisch). Türkisch ist turksprachig, Baskisch isoliert und Jiddisch westgermanisch.',
        'Hungarian, Finnish, Estonian, and Sami are Finno-Ugric (Uralic). Turkish is Turkic, Basque is a language isolate, and Yiddish is West Germanic.',
      ),
    },
    {
      id: 'ling-tf-welt-sprachen',
      kind: 'true-false',
      difficulty: 1,
      prompt: l(
        'Auf der Welt gibt es ungefähr 6.000 Sprachen.',
        'There are roughly 6,000 languages in the world.',
      ),
      correct: true,
      explanation: l(
        'Diese Zahl ist die übliche Schätzung. Sie schwankt je nach Zählweise und der schwierigen Grenze zwischen Sprache und Dialekt.',
        'This is the usual estimate. It varies with the counting method and the difficult line between language and dialect.',
      ),
    },
    {
      id: 'ling-tf-englisch',
      kind: 'true-false',
      difficulty: 1,
      prompt: l('Englisch ist eine westgermanische Sprache.', 'English is a West Germanic language.'),
      correct: true,
      explanation: l(
        'Englisch gehört wie Deutsch, Niederländisch, Friesisch und Jiddisch zum westgermanischen Zweig.',
        'Like German, Dutch, Frisian, and Yiddish, English belongs to the West Germanic branch.',
      ),
    },
    {
      id: 'ling-tf-baskisch',
      kind: 'true-false',
      difficulty: 2,
      prompt: l('Baskisch ist eine indogermanische Sprache.', 'Basque is an Indo-European language.'),
      correct: false,
      explanation: l(
        'Baskisch ist keine indogermanische Sprache, sondern gilt als isolierte Sprache.',
        'Basque is not Indo-European; it is considered a language isolate.',
      ),
    },
    {
      id: 'ling-tf-ungarisch',
      kind: 'true-false',
      difficulty: 2,
      prompt: l('Ungarisch gehört zu den finno-ugrischen Sprachen.', 'Hungarian belongs to the Finno-Ugric languages.'),
      correct: true,
      explanation: l(
        'Ungarisch ist die größte finno-ugrische Sprache Europas, gefolgt von Finnisch und Estnisch.',
        'Hungarian is the largest Finno-Ugric language in Europe, followed by Finnish and Estonian.',
      ),
    },
    {
      id: 'ling-ft-welt-sprachen',
      kind: 'free-text',
      difficulty: 1,
      prompt: l(
        'Wie viele Sprachen gibt es ungefähr auf der Welt? Schreibe die Zahl.',
        'Roughly how many languages are there in the world? Write the number.',
      ),
      accepted: [
        '6000',
        '6.000',
        '6 000',
        '6000 Sprachen',
        'ca. 6000',
        'etwa 6000',
        'rund 6000',
        '6,000',
        'sechstausend',
        'six thousand',
        '6k',
      ],
      hint: l('Eine vierstellige Zahl.', 'A four-digit number.'),
      explanation: l('Die übliche Schätzung liegt bei rund 6.000 Sprachen.', 'The usual estimate is around 6,000 languages.'),
    },
    {
      id: 'ling-ft-stufen',
      kind: 'free-text',
      difficulty: 3,
      prompt: l(
        'Nenne die drei Stufen der genetischen Stellung des Deutschen von der größten zur kleinsten Einheit.',
        'Name the three levels of German’s genetic position, from the broadest to the narrowest.',
      ),
      accepted: [
        'Indogermanisch Germanisch Westgermanisch',
        'Indoeuropean Germanic West Germanic',
        'Indo-European Germanic West Germanic',
      ],
      keywords: [
        ['indogermanisch', 'indoeuropean', 'indo european', 'indo-european'],
        ['germanisch', 'germanic'],
        ['westgermanisch', 'west germanic'],
      ],
      hint: l('Beginne bei „Indogermanisch“.', 'Start at “Indo-European”.'),
      explanation: l(
        'Indogermanisch → Germanisch → Westgermanisch → Deutsch.',
        'Indo-European → Germanic → West Germanic → German.',
      ),
    },
    {
      id: 'ling-match-familien',
      kind: 'matching',
      difficulty: 2,
      prompt: l(
        'Ordne jeder Sprachfamilie ein Beispiel zu.',
        'Match each language family with an example.',
      ),
      pairs: [
        {
          id: 'ine',
          left: l('Indogermanisch', 'Indo-European'),
          right: l('Deutsch', 'German'),
        },
        {
          id: 'fu',
          left: l('Finno-Ugrisch', 'Finno-Ugric'),
          right: l('Ungarisch', 'Hungarian'),
        },
        {
          id: 'trk',
          left: l('Turksprachen', 'Turkic'),
          right: l('Türkisch', 'Turkish'),
        },
        {
          id: 'cau',
          left: l('Kaukasisch', 'Caucasian'),
          right: l('Georgisch', 'Georgian'),
        },
        {
          id: 'afa',
          left: l('Afro-Asiatisch', 'Afro-Asiatic'),
          right: l('Maltesisch', 'Maltese'),
        },
      ],
      explanation: l(
        'Deutsch ist indogermanisch, Ungarisch finno-ugrisch, Türkisch turksprachig, Georgisch kaukasisch und Maltesisch afro-asiatisch.',
        'German is Indo-European, Hungarian Finno-Ugric, Turkish Turkic, Georgian Caucasian, and Maltese Afro-Asiatic.',
      ),
    },
    {
      id: 'ling-order-stufen',
      kind: 'ordering',
      difficulty: 2,
      prompt: l(
        'Bringe die genetische Gliederung des Deutschen in die richtige Reihenfolge – von der größten zur kleinsten Einheit.',
        'Put German’s genetic classification in the correct order, from broadest to narrowest.',
      ),
      items: [
        { id: 'ine', label: l('Indogermanisch', 'Indo-European') },
        { id: 'gmc', label: l('Germanisch', 'Germanic') },
        { id: 'wgmc', label: l('Westgermanisch', 'West Germanic') },
        { id: 'de', label: l('Deutsch', 'German') },
      ],
      explanation: l(
        'Deutsch ist eine westgermanische Sprache innerhalb des Germanischen, das wiederum zum Indogermanischen gehört.',
        'German is a West Germanic language within Germanic, which in turn belongs to Indo-European.',
      ),
    },
    {
      id: 'ling-map-familien',
      kind: 'map',
      difficulty: 3,
      prompt: l(
        'Wähle eine Sprachfamilie und tippe dann auf die beschrifteten Länder.',
        'Pick a language family, then tap the labelled countries.',
      ),
      hint: l(
        'Die Karte zeigt Europa. Malta ist der südlichste Punkt und gehört zu den afro-asiatischen Sprachen.',
        'The map shows Europe. Malta is the southernmost point and belongs to the Afro-Asiatic languages.',
      ),
      viewBox: europeMap.viewBox,
      backdrop: europeMap.backdrop,
      zones: [
        { id: 'ine', label: l('Indogermanisch', 'Indo-European'), tone: 'blue' },
        { id: 'fu', label: l('Finno-Ugrisch', 'Finno-Ugric'), tone: 'ok' },
        { id: 'eu', label: l('Baskisch', 'Basque'), tone: 'wait' },
        { id: 'trk', label: l('Turksprachen', 'Turkic'), tone: 'stop' },
        { id: 'cau', label: l('Kaukasisch', 'Caucasian'), tone: 'neutral' },
        { id: 'afa', label: l('Afro-Asiatisch', 'Afro-Asiatic'), tone: 'light' },
      ],
      regions: [
        {
          id: 'de',
          short: 'DE',
          label: l('Deutschland', 'Germany'),
          ...europeMap.countries.de,
        },
        {
          id: 'hu',
          short: 'HU',
          label: l('Ungarn', 'Hungary'),
          ...europeMap.countries.hu,
        },
        {
          id: 'fi',
          short: 'FI',
          label: l('Finnland', 'Finland'),
          ...europeMap.countries.fi,
        },
        {
          id: 'ee',
          short: 'EE',
          label: l('Estland', 'Estonia'),
          ...europeMap.countries.ee,
        },
        {
          id: 'pv',
          short: 'PV',
          label: l('Baskenland (Spanien)', 'Basque Country (Spain)'),
          ...europeMap.countries.pv,
          marker: true,
          hitRadius: 16,
          labelDx: -34,
          labelDy: -10,
        },
        {
          id: 'tr',
          short: 'TR',
          label: l('Türkei', 'Türkiye'),
          ...europeMap.countries.tr,
        },
        {
          id: 'ge',
          short: 'GE',
          label: l('Georgien', 'Georgia'),
          ...europeMap.countries.ge,
        },
        {
          id: 'mt',
          short: 'MT',
          label: l('Malta', 'Malta'),
          ...europeMap.countries.mt,
          marker: true,
          hitRadius: 18,
          labelDx: -36,
          labelDy: -4,
        },
      ],
      correct: {
        de: 'ine',
        hu: 'fu',
        fi: 'fu',
        ee: 'fu',
        pv: 'eu',
        tr: 'trk',
        ge: 'cau',
        mt: 'afa',
      },
      explanation: l(
        'Deutschland ist indogermanisch, Ungarn/Finnland/Estland finno-ugrisch, das Baskenland baskisch, die Türkei turksprachig, Georgien kaukasisch und Malta afro-asiatisch (Maltesisch).',
        'Germany is Indo-European; Hungary, Finland, and Estonia are Finno-Ugric; the Basque Country is Basque; Türkiye is Turkic; Georgia is Caucasian; and Malta is Afro-Asiatic (Maltese).',
      ),
    },
  ],
};
