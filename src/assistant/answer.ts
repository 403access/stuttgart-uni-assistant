import { asBullets, summarize } from '@/src/assistant/summarize';
import { formatDate, formatGrade, hay, weekdays } from '@/src/text';
import type { Locale } from '@/src/types';

export interface AnswerModule {
  id: string;
  code: string;
  title: string;
  ects: number;
  status: 'passed' | 'enrolled' | 'open';
  grade?: number;
  area: string;
  summary: string;
  topics: string;
  lecturer: string;
  aliases: string;
  lock: string | null;
  prerequisiteText: string;
}

export interface AnswerInput {
  locale: Locale;
  question: string;
  nowIso: string;
  weekday: number;
  studentName: string;
  program: string;
  semester: number;
  earned: number;
  active: number;
  open: number;
  total: number;
  expected: number;
  average: number | null;
  areas: { title: string; earned: number; active: number; required: number }[];
  suggestion: { code: string; title: string; ects: number }[];
  today: { title: string; time: string; kind: string; room: string }[];
  deadlines: { title: string; date: string; source: string; detail: string }[];
  modules: AnswerModule[];
  places: { name: string; kind: string; campus: string; address: string; note: string; aliases: string }[];
  people: { name: string; title: string; institute: string; email: string; hours: string; research: string; room: string }[];
  news: { title: string; source: string; date: string; summary: string }[];
  exams: { module: string; term: string; topics: string; focus: string; hint: string }[];
  reviews: { module: string; rating: number; workload: number; difficulty: number; comment: string }[];
  documents: { title: string; course: string; source: string; excerpt: string }[];
  focus?: { title: string; text: string; alternate?: string };
}

export interface Answer {
  text: string;
  sources: string[];
}

type Intent =
  | 'deadlines'
  | 'schedule'
  | 'credits'
  | 'transfer'
  | 'sequence'
  | 'people'
  | 'room'
  | 'documents'
  | 'reviews'
  | 'exams'
  | 'news'
  | 'summary'
  | 'module';

const intents: { id: Intent; keys: string[] }[] = [
  { id: 'deadlines', keys: ['frist', 'deadline', 'anmeld', 'fallig', 'faellig', 'due', 'prufungstermin', 'exam date', 'klausurtermin', 'abgabe', 'when is the exam', 'wann ist die klausur'] },
  { id: 'schedule', keys: ['stundenplan', 'schedule', 'heute', 'today', 'vorlesung heute', 'was habe ich', 'what do i have'] },
  { id: 'credits', keys: ['ects', 'credit', 'anforderung', 'prufungsordnung', 'fehlen', 'remaining', 'schnitt', 'grade average', 'noten', 'bestanden', 'wie viele'] },
  { id: 'transfer', keys: ['anrechnung', 'anerkenn', 'transfer', 'ausland', 'abroad', 'previous university'] },
  { id: 'sequence', keys: ['reihenfolge', 'voraussetzung', 'prerequisite', 'sequence', 'belegen', 'naechstes semester', 'next semester', 'kann ich'] },
  { id: 'people', keys: ['dozent', 'professor', 'lecturer', 'sprechstunde', 'office hour', 'kontakt'] },
  { id: 'room', keys: ['raum', 'room', 'mensa', 'bibliothek', 'library', 'wo ist', 'where is', 'vaihingen', 'stadtmitte', 'k1', 'k2', 'campus'] },
  { id: 'documents', keys: ['ilias', 'folien', 'slides', 'dokument', 'document', 'pdf', 'ubungsblatt', 'exercise sheet'] },
  { id: 'reviews', keys: ['empfehl', 'review', 'workload', 'aufwand', 'kommiliton', 'bewertung', 'rating', 'wahlmodul'] },
  { id: 'exams', keys: ['altklausur', 'past paper', 'prufungsthema', 'klausurthema', 'schwerpunkt', 'past exam'] },
  { id: 'news', keys: ['news', 'aktuell', 'ankundigung', 'stuvus', 'meldung', 'announcement'] },
  { id: 'summary', keys: ['zusammenfass', 'summary', 'einfach', 'plain language', 'ubersetz', 'translate', 'erklar'] },
  { id: 'module', keys: ['modul', 'inhalt', 'syllabus', 'thema', 'course', 'vorlesung'] },
];

function scoreIntent(question: string, keys: string[]): number {
  return keys.reduce((sum, key) => sum + (question.includes(key) ? key.length : 0), 0);
}

function topIntent(question: string): { id: Intent; score: number } {
  let best: { id: Intent; score: number } = { id: 'module', score: 0 };
  for (const intent of intents) {
    const score = scoreIntent(question, intent.keys);
    if (score > best.score) best = { id: intent.id, score };
  }
  return best;
}

function matchModule(question: string, modules: AnswerModule[]): AnswerModule | undefined {
  let best: { module: AnswerModule; score: number } | undefined;
  for (const module of modules) {
    let score = 0;
    if (question.includes(hay(module.code))) score += 12;
    const words = hay(`${module.title} ${module.aliases}`).split(/[^a-z0-9*+]+/).filter((word) => word.length > 2);
    for (const word of words) {
      if (question.includes(word)) score += Math.min(word.length, 12);
    }
    if (score > 0 && (!best || score > best.score)) best = { module, score };
  }
  return best && best.score >= 4 ? best.module : undefined;
}

function sourceLine(locale: Locale): string {
  return locale === 'de'
    ? 'Quelle: Demonstrationsstand auf diesem Gerät, nicht live aus C@MPUS.'
    : 'Source: demonstration record on this device, not a live C@MPUS extract.';
}

function statusWord(status: AnswerModule['status'], locale: Locale): string {
  if (locale === 'de') return status === 'passed' ? 'bestanden' : status === 'enrolled' ? 'belegt' : 'offen';
  return status === 'passed' ? 'passed' : status === 'enrolled' ? 'enrolled' : 'open';
}

function moduleAnswer(input: AnswerInput, module: AnswerModule): Answer {
  const grade =
    typeof module.grade === 'number'
      ? input.locale === 'de'
        ? `, Note ${formatGrade(module.grade, 'de')}`
        : `, grade ${formatGrade(module.grade, 'en')}`
      : '';
  const lock =
    module.lock === null
      ? input.locale === 'de'
        ? 'Die Voraussetzungen für eine Belegung sind erfüllt oder das Modul ist schon im Plan.'
        : 'The prerequisites for taking it are met, or it is already on the plan.'
      : module.lock.startsWith('min:')
        ? input.locale === 'de'
          ? `Dafür braucht der Demonstrationsplan mindestens ${module.lock.slice(4)} bestandene ECTS. Aktuell sind es ${input.earned}.`
          : `The demonstration plan requires at least ${module.lock.slice(4)} passed ECTS. You currently have ${input.earned}.`
        : input.locale === 'de'
          ? `Noch nicht belegbar. ${module.prerequisiteText}`
          : `Not open for enrollment yet. ${module.prerequisiteText}`;
  const text =
    input.locale === 'de'
      ? `${module.title} · ${module.code}\n${module.ects} ECTS · ${module.area} · ${statusWord(module.status, 'de')}${grade}\n\n${module.summary}\nThemen: ${module.topics}\nDozent: ${module.lecturer}\n${lock}\n\n${sourceLine('de')}`
      : `${module.title} · ${module.code}\n${module.ects} ECTS · ${module.area} · ${statusWord(module.status, 'en')}${grade}\n\n${module.summary}\nTopics: ${module.topics}\nLecturer: ${module.lecturer}\n${lock}\n\n${sourceLine('en')}`;
  return { text, sources: [module.code, module.lecturer] };
}

function documentAnswer(input: AnswerInput): Answer | null {
  if (!input.focus) return null;
  const lines = summarize(input.focus.text, 4);
  const wantsTranslation = hay(input.question).includes('ubersetz') || hay(input.question).includes('translate');
  if (wantsTranslation && input.focus.alternate) {
    const text =
      input.locale === 'de'
        ? `Übersetzung aus dem mitgelieferten Sprachpaar für „${input.focus.title}“:\n\n${input.focus.alternate}`
        : `Translation from the bundled language pair for “${input.focus.title}”:\n\n${input.focus.alternate}`;
    return { text, sources: [input.focus.title] };
  }
  if (wantsTranslation) {
    const text =
      input.locale === 'de'
        ? `Für „${input.focus.title}“ liegt keine zweite Sprachfassung vor. Eine freie Übersetzung übernimmt Grok, sobald der Assistenz-Server läuft. Bis dahin die Kurzfassung:\n\n${asBullets(lines)}`
        : `“${input.focus.title}” has no second bundled language. Grok can translate it when the assistant server is running. Until then, the short form is:\n\n${asBullets(lines)}`;
    return { text, sources: [input.focus.title] };
  }
  const lead =
    input.locale === 'de'
      ? `Kurzfassung von „${input.focus.title}“:`
      : `Short account of “${input.focus.title}”:`;
  return { text: `${lead}\n\n${asBullets(lines)}`, sources: [input.focus.title] };
}

export function buildLocalAnswer(input: AnswerInput): Answer {
  const question = hay(input.question);
  const intent = topIntent(question);
  const matched = matchModule(question, input.modules);
  const de = input.locale === 'de';

  if (input.focus && (intent.id === 'summary' || intent.score < 8)) {
    const fromDocument = documentAnswer(input);
    if (fromDocument) return fromDocument;
  }

  if (matched && (intent.id === 'module' || intent.id === 'sequence' || intent.score < 8)) {
    return moduleAnswer(input, matched);
  }

  if (intent.id === 'deadlines' || question.includes('prufung')) {
    const rows = input.deadlines.slice(0, 6).map((item) => `• ${formatDate(item.date, input.locale)} · ${item.title} (${item.source})`);
    const next = input.deadlines[0];
    const text = de
      ? `Nächste Frist: ${next ? `${next.title} am ${formatDate(next.date, 'de')}` : 'keine'}.\n${next?.detail ?? ''}\n\n${rows.join('\n')}\n\n${sourceLine('de')}`
      : `Next deadline: ${next ? `${next.title} on ${formatDate(next.date, 'en')}` : 'none'}.\n${next?.detail ?? ''}\n\n${rows.join('\n')}\n\n${sourceLine('en')}`;
    return { text, sources: ['C@MPUS', 'ILIAS', 'SDG Campus'] };
  }

  if (intent.id === 'schedule') {
    const dayName = weekdays[input.locale][input.weekday] ?? '';
    const rows = input.today.map((item) => `• ${item.time} · ${item.title} · ${item.kind} · ${item.room}`);
    const text = de
      ? rows.length
        ? `${dayName}, ${formatDate(input.nowIso, 'de')}\n${rows.join('\n')}`
        : `${dayName}, ${formatDate(input.nowIso, 'de')}: keine Lehrveranstaltung im Demonstrationsplan.`
      : rows.length
        ? `${dayName}, ${formatDate(input.nowIso, 'en')}\n${rows.join('\n')}`
        : `${dayName}, ${formatDate(input.nowIso, 'en')}: no class in the demonstration timetable.`;
    return { text, sources: ['C@MPUS · Stundenplan'] };
  }

  if (intent.id === 'credits') {
    const gaps = input.areas
      .filter((area) => area.earned < area.required)
      .map((area) => `• ${area.title}: ${area.earned}/${area.required}${area.active ? (de ? `, dazu ${area.active} belegt` : `, plus ${area.active} enrolled`) : ''}`);
    const average = input.average === null ? '–' : formatGrade(input.average, input.locale);
    const pace = input.earned - input.expected;
    const paceText = de
      ? pace >= 0
        ? `Damit liegst du ${pace} ECTS über dem Richtwert von ${input.expected} nach ${input.semester - 1} Semestern.`
        : `Der Richtwert nach ${input.semester - 1} Semestern liegt bei ${input.expected} ECTS. Dir fehlen dazu ${-pace}.`
      : pace >= 0
        ? `That is ${pace} ECTS above the guide value of ${input.expected} after ${input.semester - 1} semesters.`
        : `The guide value after ${input.semester - 1} semesters is ${input.expected} ECTS. You are ${-pace} short of that.`;
    const text = de
      ? `${input.studentName} hat ${input.earned} von ${input.total} ECTS bestanden. ${input.active} ECTS sind belegt, ${input.open} sind noch offen. Gewichteter Schnitt: ${average}.\n\n${paceText}\n\nOffene Bereiche:\n${gaps.join('\n')}\n\n${sourceLine('de')}`
      : `${input.studentName} has passed ${input.earned} of ${input.total} ECTS. ${input.active} ECTS are enrolled and ${input.open} are still open. Weighted average: ${average}.\n\n${paceText}\n\nOpen areas:\n${gaps.join('\n')}\n\n${sourceLine('en')}`;
    return { text, sources: ['Prüfungsordnung · Demonstration'] };
  }

  if (intent.id === 'sequence') {
    const rows = input.suggestion.map((item) => `• ${item.title} · ${item.code} · ${item.ects} ECTS`);
    const sum = input.suggestion.reduce((count, item) => count + item.ects, 0);
    const text = de
      ? `Vorschlag für das nächste Semester, ${sum} ECTS, nur aus Modulen mit erfüllten Voraussetzungen:\n${rows.join('\n')}\n\nMaschinelles Lernen wartet auf die bestandene KI-Grundlagenvorlesung. Die Bachelorarbeit wartet auf 120 bestandene ECTS.\n\n${sourceLine('de')}`
      : `Suggestion for next semester, ${sum} ECTS, using only modules whose prerequisites are met:\n${rows.join('\n')}\n\nMachine Learning waits until Foundations of Artificial Intelligence is passed. The bachelor thesis waits for 120 passed ECTS.\n\n${sourceLine('en')}`;
    return { text, sources: ['Modulplan · Demonstration'] };
  }

  if (intent.id === 'room') {
    const stop = new Set(['ist', 'die', 'der', 'das', 'und', 'the', 'where', 'ist', 'ein', 'eine', 'auf', 'dem', 'den', 'campus']);
    const tokens = question.split(/[^a-z0-9]+/).filter((word) => word.length > 2 && !stop.has(word));
    const hits = input.places
      .map((place) => {
        const name = hay(`${place.name} ${place.kind} ${place.aliases}`);
        const blob = hay(`${place.name} ${place.kind} ${place.campus} ${place.address} ${place.aliases} ${place.note}`);
        const score = tokens.reduce((sum, word) => sum + (name.includes(word) ? 5 : blob.includes(word) ? 1 : 0), 0);
        return { place, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.place);
    const rows = (hits.length ? hits : input.places.filter((place) => place.kind === 'mensa')).slice(0, 4);
    const text = rows
      .map((place) => `${place.name} · ${place.campus}\n${place.address}\n${place.note}`)
      .join('\n\n');
    return { text, sources: ['Campusplan · schematisch'] };
  }

  if (intent.id === 'people') {
    const hit = input.people.find((person) => question.includes(hay(person.name).split(' ').pop() ?? '---'));
    if (hit) {
      const text = de
        ? `${hit.title} ${hit.name}\n${hit.institute}\nSprechstunde: ${hit.hours}\nRaum: ${hit.room}\n${hit.email}\n${hit.research}`
        : `${hit.title} ${hit.name}\n${hit.institute}\nOffice hour: ${hit.hours}\nRoom: ${hit.room}\n${hit.email}\n${hit.research}`;
      return { text, sources: [hit.name] };
    }
    const rows = input.people.slice(0, 4).map((person) => `• ${person.title} ${person.name}: ${person.hours}`);
    const text = de ? `Sprechstunden im Demonstrationsplan:\n${rows.join('\n')}` : `Office hours in the demonstration plan:\n${rows.join('\n')}`;
    return { text, sources: ['Dozierende · Demonstration'] };
  }

  if (intent.id === 'documents') {
    const rows = input.documents.map((doc) => `• ${doc.title} · ${doc.source} · ${doc.course}`);
    const text = de
      ? `Material im Dokumentenstapel:\n${rows.join('\n')}\n\nILIAS-Dateien lassen sich in der Demo auf das Gerät legen. Die Texte der Vorlesungsfolien sind mitgeliefert, damit Zusammenfassung und Fragen ohne Universitätslogin funktionieren.`
      : `Material in the document stack:\n${rows.join('\n')}\n\nILIAS files can be saved onto the device in this demo. Lecture text is bundled so summaries and questions work without a university login.`;
    return { text, sources: ['ILIAS · Demonstration'] };
  }

  if (intent.id === 'reviews') {
    const rows = input.reviews.slice(0, 4).map((review) => `• ${review.module}: ${review.rating.toFixed(1)} · ${review.workload} h/Woche · ${review.comment}`);
    const text = de ? `Einschätzungen aus dem Demonstrationskreis:\n${rows.join('\n')}` : `Notes from the demonstration cohort:\n${rows.join('\n')}`;
    return { text, sources: ['Kommilitonen · Demonstration'] };
  }

  if (intent.id === 'exams') {
    const pool = matched
      ? input.exams.filter((exam) => hay(exam.module).includes(hay(matched.title).slice(0, 8)))
      : input.exams;
    const rows = (pool.length ? pool : input.exams).slice(0, 3).map((exam) => `${exam.module} · ${exam.term}\n${exam.focus}\nThemen: ${exam.topics}\nHinweis: ${exam.hint}`);
    return { text: rows.join('\n\n'), sources: ['Altklausur-Index · Themen, keine Prüfungs-PDFs'] };
  }

  if (intent.id === 'news') {
    const rows = input.news.slice(0, 4).map((item) => `• ${formatDate(item.date, input.locale)} · ${item.source} · ${item.title}`);
    return { text: rows.join('\n'), sources: ['Meldungen'] };
  }

  if (intent.id === 'transfer') {
    const text = de
      ? 'Eine Anrechnung läuft über den Prüfungsausschuss, nicht über diese App. Der Assistent sammelt Herkunft, ECTS und ein passendes Zielmodul und listet die Unterlagen: Transcript, Modulbeschreibung und bei Auslandsaufenthalt das Learning Agreement. Entwürfe bleiben auf dem Gerät.'
      : 'Credit recognition goes through the examinations board, not through this app. The assistant collects the origin, the ECTS, and a likely target module, then lists the papers: transcript, module description, and a learning agreement for study abroad. Drafts stay on the device.';
    return { text, sources: ['Anrechnung · Leitfaden'] };
  }

  if (intent.id === 'summary') {
    const fromDocument = documentAnswer(input);
    if (fromDocument) return fromDocument;
    if (matched) return moduleAnswer(input, matched);
  }

  const next = input.deadlines[0];
  const today = input.today[0];
  const text = de
    ? `Ich lese den Demonstrationsstand von ${input.studentName}, ${input.program}, ${input.semester}. Semester.\n\nHeute: ${today ? `${today.time} ${today.title} in ${today.room}` : 'keine Lehrveranstaltung'}.\nNächste Frist: ${next ? `${next.title} am ${formatDate(next.date, 'de')}` : 'keine'}.\nBestanden: ${input.earned} von ${input.total} ECTS.\n\nFrag nach Fristen, Stundenplan, ECTS, einem Modul, einem Raum, Sprechstunden, ILIAS, Empfehlungen oder Altklausur-Themen.`
    : `I am reading the demonstration record of ${input.studentName}, ${input.program}, semester ${input.semester}.\n\nToday: ${today ? `${today.time} ${today.title} in ${today.room}` : 'no class'}.\nNext deadline: ${next ? `${next.title} on ${formatDate(next.date, 'en')}` : 'none'}.\nPassed: ${input.earned} of ${input.total} ECTS.\n\nAsk about deadlines, the timetable, ECTS, a module, a room, office hours, ILIAS, recommendations, or past-exam topics.`;
  return { text, sources: ['Demonstrationsstand'] };
}

export function renderFacts(input: AnswerInput): string {
  const lines = [
    `Student: ${input.studentName}, ${input.program}, semester ${input.semester}`,
    `ECTS passed ${input.earned}, enrolled ${input.active}, open ${input.open}, total ${input.total}, expected ${input.expected}, average ${input.average ?? 'n/a'}`,
    ...input.areas.map((area) => `Area ${area.title}: ${area.earned}/${area.required}, enrolled ${area.active}`),
    `Suggestion: ${input.suggestion.map((item) => `${item.code} ${item.title} ${item.ects}`).join('; ')}`,
    `Today: ${input.today.map((item) => `${item.time} ${item.title} ${item.room}`).join('; ') || 'none'}`,
    ...input.deadlines.map((item) => `Deadline ${item.date} ${item.title}: ${item.detail}`),
    ...input.modules.map((item) => `Module ${item.code} ${item.title} ${item.ects} ${item.status} ${item.lock ?? 'open'} :: ${item.summary}`),
    ...input.places.map((item) => `Place ${item.name}, ${item.campus}, ${item.address}`),
    ...input.people.map((item) => `Person ${item.name}, ${item.hours}, ${item.room}, ${item.email}`),
    ...input.news.map((item) => `News ${item.date} ${item.source}: ${item.title}`),
    ...input.exams.map((item) => `Exam ${item.module} ${item.term}: ${item.topics}`),
    ...input.reviews.map((item) => `Review ${item.module}: ${item.rating}, ${item.workload}h, ${item.comment}`),
    ...input.documents.map((item) => `Document ${item.title}: ${item.excerpt}`),
  ];
  if (input.focus) lines.push(`Focus document ${input.focus.title}: ${input.focus.text.slice(0, 4000)}`);
  return lines.join('\n');
}
