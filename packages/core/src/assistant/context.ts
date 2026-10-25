import { deadlines, documents, exams, modules, news, people, places, program, reviews, student } from '../data/index';
import { areaTotals, lockReason, prerequisitesMet, scheduleForDay, suggestNextSemester, totals, weightedAverage } from '../domain/plan';
import type { AnswerInput, AnswerModule } from './answer';
import { pick, tx } from '../format';
import type { ImportedDocument, Locale, ModuleItem, StudyDocument } from '../domain/types';

function moduleLockText(module: ModuleItem, locale: Locale): string {
  const names = module.prerequisites.map((id) => modules.find((item) => item.id === id)).filter((item): item is ModuleItem => Boolean(item));
  if (!names.length) return '';
  return names
    .map((item) => {
      const state =
        item.status === 'passed'
          ? tx(locale, 'common.bestanden')
          : item.status === 'enrolled'
            ? tx(locale, 'assistantContext.belegt')
            : tx(locale, 'curriculumNodeDetail.offen');
      return `${pick(item.title, locale)} (${state})`;
    })
    .join(', ');
}

function toAnswerModule(module: ModuleItem, locale: Locale): AnswerModule {
  const lecturer = people.find((person) => person.id === module.lecturerId);
  const area = program.areas.find((item) => item.id === module.area);
  const prerequisiteList = moduleLockText(module, locale) || tx(locale, 'common.keine');
  return {
    id: module.id,
    code: module.code,
    title: pick(module.title, locale),
    ects: module.ects,
    status: module.status,
    grade: module.grade,
    area: area ? pick(area.title, locale) : module.area,
    summary: pick(module.summary, locale),
    topics: module.topics[locale].join(', '),
    lecturer: lecturer ? `${pick(lecturer.title, locale)} ${lecturer.name}` : '',
    aliases: module.aliases.join(' '),
    lock: module.status === 'open' ? lockReason(module, modules) : null,
    prerequisiteText: tx(locale, 'assistantContext.voraussetzungen', [prerequisiteList]),
  };
}

function pageText(document: StudyDocument, locale: Locale): string {
  return document.pages[locale].join(' ');
}

export function buildAnswerInput(options: {
  locale: Locale;
  question: string;
  now?: Date;
  focus?: { title: string; text: string; alternate?: string };
  imports?: ImportedDocument[];
}): AnswerInput {
  const now = options.now ?? new Date();
  const locale = options.locale;
  const credit = totals(modules);
  const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const suggestion = suggestNextSemester(modules, program.areas);
  const upcoming = deadlines
    .filter((item) => item.date >= iso)
    .sort((a, b) => a.date.localeCompare(b.date));
  const ownDocuments = (options.imports ?? []).map((item) => ({
    title: item.title,
    course: item.folder,
    source: item.source,
    excerpt: item.text.slice(0, 280),
  }));

  return {
    locale,
    question: options.question,
    nowIso: iso,
    weekday: now.getDay(),
    studentName: student.name,
    program: `${program.degree[locale]} ${program.title[locale]}`,
    semester: student.semester,
    earned: credit.earned,
    active: credit.active,
    open: credit.open,
    total: program.totalEcts,
    expected: (student.semester - 1) * program.standardSemesterEcts,
    average: weightedAverage(modules),
    areas: program.areas.map((area) => {
      const progress = areaTotals(modules, area.id);
      return { title: pick(area.title, locale), earned: progress.earned, active: progress.active, required: area.ects };
    }),
    suggestion: suggestion.map((item) => ({ code: item.code, title: pick(item.title, locale), ects: item.ects })),
    today: scheduleForDay(modules, now.getDay(), places).map((row) => ({
      title: pick(row.module.title, locale),
      time: `${row.session.start}–${row.session.end}`,
      kind: row.session.kind,
      room: row.place?.name ?? row.session.roomId,
    })),
    deadlines: upcoming.map((item) => ({
      title: pick(item.title, locale),
      date: item.date,
      source: item.source,
      detail: pick(item.detail, locale),
    })),
    modules: modules.map((item) => toAnswerModule(item, locale)),
    places: places.map((place) => ({
      name: place.name,
      kind: place.kind,
      campus: place.campus,
      address: place.address,
      note: pick(place.note, locale),
      aliases: place.aliases.join(' '),
    })),
    people: people.map((person) => ({
      name: person.name,
      title: pick(person.title, locale),
      institute: pick(person.institute, locale),
      email: person.email,
      hours: pick(person.hours, locale),
      research: pick(person.research, locale),
      room: places.find((place) => place.id === person.roomId)?.name ?? person.roomId,
    })),
    news: [...news]
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((item) => ({ title: pick(item.title, locale), source: item.source, date: item.date, summary: pick(item.summary, locale) })),
    exams: exams.map((exam) => {
      const module = modules.find((item) => item.id === exam.moduleId);
      return {
        module: module ? pick(module.title, locale) : exam.moduleId,
        term: exam.term,
        topics: exam.topics[locale].join(', '),
        focus: pick(exam.focus, locale),
        hint: pick(exam.hint, locale),
      };
    }),
    reviews: reviews.map((review) => {
      const module = modules.find((item) => item.id === review.moduleId);
      return {
        module: module ? pick(module.title, locale) : review.moduleId,
        rating: review.rating,
        workload: review.workload,
        difficulty: review.difficulty,
        comment: pick(review.comment, locale),
      };
    }),
    documents: [
      ...documents.map((document) => ({
        title: pick(document.title, locale),
        course: document.courseId ?? '',
        source: document.source,
        excerpt: pageText(document, locale).slice(0, 280),
      })),
      ...ownDocuments,
    ],
    focus: options.focus,
  };
}

export function bundledDocument(id: string, locale: Locale): { title: string; text: string; alternate: string } | null {
  const document = documents.find((item) => item.id === id);
  if (!document) return null;
  const other: Locale = locale === 'de' ? 'en' : 'de';
  return {
    title: pick(document.title, locale),
    text: document.pages[locale].join('\n\n'),
    alternate: document.pages[other].join('\n\n'),
  };
}

export function prerequisiteNames(moduleId: string): { met: boolean } {
  const module = modules.find((item) => item.id === moduleId);
  if (!module) return { met: false };
  return { met: prerequisitesMet(module, modules) };
}
