import { asBullets, summarize } from '@/src/assistant/summarize';
import { formatDate, formatGrade, hay, tx, weekdays } from '@/src/text';
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
  return tx(locale, 'assistantAnswer.quelle');
}

function statusWord(status: AnswerModule['status'], locale: Locale): string {
  if (status === 'passed') return tx(locale, 'common.bestanden');
  if (status === 'enrolled') return tx(locale, 'common.belegt');
  return tx(locale, 'curriculumNodeDetail.offen');
}

function moduleAnswer(input: AnswerInput, module: AnswerModule): Answer {
  const locale = input.locale;
  const status = statusWord(module.status, locale);
  const source = sourceLine(locale);
  const grade =
    typeof module.grade === 'number' ? tx(locale, 'assistantAnswer.note', [formatGrade(module.grade, locale)]) : '';
  const lock =
    module.lock === null
      ? tx(locale, 'assistantAnswer.voraussetzungen')
      : module.lock.startsWith('min:')
        ? tx(locale, 'assistantAnswer.dafuer', [module.lock.slice(4), input.earned])
        : tx(locale, 'assistantAnswer.belegbar', [module.prerequisiteText]);
  const text = tx(locale, 'assistantAnswer.ects', [module.title, module.code, module.ects, module.area, status, grade, module.summary, module.topics, module.lecturer, lock, source]);
  return { text, sources: [module.code, module.lecturer] };
}

function documentAnswer(input: AnswerInput): Answer | null {
  if (!input.focus) return null;
  const locale = input.locale;
  const lines = summarize(input.focus.text, 4);
  const wantsTranslation = hay(input.question).includes('ubersetz') || hay(input.question).includes('translate');
  if (wantsTranslation && input.focus.alternate) {
    const text = tx(locale, 'assistantAnswer.uebersetzung', [input.focus.title, input.focus.alternate]);
    return { text, sources: [input.focus.title] };
  }
  if (wantsTranslation) {
    const text = tx(locale, 'assistantAnswer.liegt', [input.focus.title, asBullets(lines)]);
    return { text, sources: [input.focus.title] };
  }
  const lead = tx(locale, 'assistantAnswer.kurzfassung', [input.focus.title]);
  return { text: `${lead}\n\n${asBullets(lines)}`, sources: [input.focus.title] };
}

export function buildLocalAnswer(input: AnswerInput): Answer {
  const question = hay(input.question);
  const locale = input.locale;
  const intent = topIntent(question);
  const matched = matchModule(question, input.modules);
  const source = sourceLine(locale);

  if (input.focus && (intent.id === 'summary' || intent.score < 8)) {
    const fromDocument = documentAnswer(input);
    if (fromDocument) return fromDocument;
  }

  if (matched && (intent.id === 'module' || intent.id === 'sequence' || intent.score < 8)) {
    return moduleAnswer(input, matched);
  }

  if (intent.id === 'deadlines' || question.includes('prufung')) {
    const rows = input.deadlines.slice(0, 6).map((item) => `• ${formatDate(item.date, locale)} · ${item.title} (${item.source})`);
    const next = input.deadlines[0];
    const nextText = next
      ? tx(locale, 'assistantAnswer.am', [next.title, formatDate(next.date, locale)])
      : tx(locale, 'common.keine');
    const text = tx(locale, 'assistantAnswer.naechste', [nextText, next?.detail ?? '', rows.join('\n'), source]);
    return { text, sources: ['C@MPUS', 'ILIAS', 'SDG Campus'] };
  }

  if (intent.id === 'schedule') {
    const dayName = weekdays[input.locale][input.weekday] ?? '';
    const today = formatDate(input.nowIso, locale);
    const rows = input.today.map((item) => `• ${item.time} · ${item.title} · ${item.kind} · ${item.room}`);
    const text = rows.length
      ? `${dayName}, ${today}\n${rows.join('\n')}`
      : tx(locale, 'assistantAnswer.lehrveranstaltung_demonstrationsplan', [dayName, today]);
    return { text, sources: ['C@MPUS · Stundenplan'] };
  }

  if (intent.id === 'credits') {
    const gaps = input.areas
      .filter((area) => area.earned < area.required)
      .map((area) => `• ${area.title}: ${area.earned}/${area.required}${area.active ? tx(locale, 'assistantAnswer.dazu', [area.active]) : ''}`);
    const average = input.average === null ? '–' : formatGrade(input.average, locale);
    const pace = input.earned - input.expected;
    const paceText =
      pace >= 0
        ? tx(locale, 'assistantAnswer.damit', [pace, input.expected, input.semester - 1])
        : tx(locale, 'assistantAnswer.richtwert', [input.semester - 1, input.expected, -pace]);
    const text = tx(locale, 'assistantAnswer.hat', [input.studentName, input.earned, input.total, input.active, input.open, average, paceText, gaps.join('\n'), source]);
    return { text, sources: ['Prüfungsordnung · Demonstration'] };
  }

  if (intent.id === 'sequence') {
    const rows = input.suggestion.map((item) => `• ${item.title} · ${item.code} · ${item.ects} ECTS`);
    const sum = input.suggestion.reduce((count, item) => count + item.ects, 0);
    const text = tx(locale, 'assistantAnswer.vorschlag', [sum, rows.join('\n'), source]);
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
      const text = tx(locale, 'assistantAnswer.sprechstunde', [hit.title, hit.name, hit.institute, hit.hours, hit.room, hit.email, hit.research]);
      return { text, sources: [hit.name] };
    }
    const rows = input.people.slice(0, 4).map((person) => `• ${person.title} ${person.name}: ${person.hours}`);
    const text = tx(locale, 'assistantAnswer.sprechstunden', [rows.join('\n')]);
    return { text, sources: ['Dozierende · Demonstration'] };
  }

  if (intent.id === 'documents') {
    const rows = input.documents.map((doc) => `• ${doc.title} · ${doc.source} · ${doc.course}`);
    const text = tx(locale, 'assistantAnswer.material', [rows.join('\n')]);
    return { text, sources: ['ILIAS · Demonstration'] };
  }

  if (intent.id === 'reviews') {
    const rows = input.reviews.slice(0, 4).map((review) => `• ${review.module}: ${review.rating.toFixed(1)} · ${review.workload} h/Woche · ${review.comment}`);
    const text = tx(locale, 'assistantAnswer.einschaetzungen', [rows.join('\n')]);
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
    const text = tx(locale, 'assistantAnswer.anrechnung');
    return { text, sources: ['Anrechnung · Leitfaden'] };
  }

  if (intent.id === 'summary') {
    const fromDocument = documentAnswer(input);
    if (fromDocument) return fromDocument;
    if (matched) return moduleAnswer(input, matched);
  }

  const next = input.deadlines[0];
  const today = input.today[0];
  const todayText = today ? `${today.time} ${today.title} in ${today.room}` : tx(locale, 'assistantAnswer.lehrveranstaltung');
  const nextText = next
    ? tx(locale, 'assistantAnswer.am', [next.title, formatDate(next.date, locale)])
    : tx(locale, 'common.keine');
  const text = tx(locale, 'assistantAnswer.ich', [input.studentName, input.program, input.semester, todayText, nextText, input.earned, input.total]);
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
