import type { Localized } from '@/src/types';
import type { QuizDifficulty, QuizQuestion, QuizTopic } from '@/src/quiz/types';

import type {
  DraftLocalized,
  DraftOption,
  DraftPair,
  DraftQuestion,
  DraftSegment,
  DraftTopic,
} from './schema';

export class InvalidDraftError extends Error {}

function fail(message: string): never {
  throw new InvalidDraftError(message);
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
}

/** Stable topic id from the module and the PDF's file name. */
export function topicIdFor(moduleId: string, fileName: string): string {
  const base = fileName.replace(/\.pdf$/i, '');
  const slug = slugify(base);
  const prefixed = slug.startsWith(`${moduleId.toLowerCase()}-`)
    ? slug
    : `${moduleId.toLowerCase()}-${slug}`;
  return prefixed || `${moduleId.toLowerCase()}-pdf`;
}

function localized(value: unknown, field: string): Localized {
  if (!value || typeof value !== 'object') fail(`${field} is missing`);
  const candidate = value as Partial<DraftLocalized>;
  const de = typeof candidate.de === 'string' ? candidate.de.trim() : '';
  const en = typeof candidate.en === 'string' ? candidate.en.trim() : '';
  if (!de) fail(`${field}.de is empty`);
  if (!en) fail(`${field}.en is empty`);
  return { de, en };
}

function optionalLocalized(value: unknown, field: string): Localized | undefined {
  if (value === null || value === undefined) return undefined;
  return localized(value, field);
}

function difficulty(value: unknown): QuizDifficulty {
  if (value === null || value === undefined) return 2;
  if (value === 1 || value === 2 || value === 3) return value;
  fail(`difficulty must be 1, 2, or 3 (got ${String(value)})`);
}

function optionId(index: number): string {
  return index < 26 ? String.fromCharCode(97 + index) : `o${index + 1}`;
}

function labels(value: unknown, field: string): Localized[] {
  if (!Array.isArray(value)) fail(`${field} is missing`);
  return value.map((entry, index) => {
    if (!entry || typeof entry !== 'object') fail(`${field}[${index}] is not an object`);
    return localized((entry as DraftOption).label, `${field}[${index}].label`);
  });
}

function normalizeQuestion(
  draft: DraftQuestion,
  topicId: string,
  index: number,
): QuizQuestion {
  const at = `question ${index + 1}`;
  if (!draft || typeof draft !== 'object') fail(`${at} is not an object`);

  const base = {
    id: `${topicId}-q${index + 1}`,
    kind: draft.kind,
    difficulty: difficulty(draft.difficulty),
    prompt: localized(draft.prompt, `${at}.prompt`),
  };
  const hint = optionalLocalized(draft.hint, `${at}.hint`);
  const explanation = optionalLocalized(draft.explanation, `${at}.explanation`);
  const withExtras = <T extends object>(value: T): T & { hint?: Localized; explanation?: Localized } => ({
    ...value,
    ...(hint ? { hint } : {}),
    ...(explanation ? { explanation } : {}),
  });

  switch (draft.kind) {
    case 'single': {
      const options = labels(draft.options, `${at}.options`);
      if (options.length < 2) fail(`${at} needs at least two options`);
      const correct = draft.correctOption;
      if (!Number.isInteger(correct) || correct === null || correct < 0 || correct >= options.length) {
        fail(`${at}.correctOption must index one of its options`);
      }
      return withExtras({
        ...base,
        kind: 'single' as const,
        options: options.map((label, optionIndex) => ({ id: optionId(optionIndex), label })),
        correctId: optionId(correct),
      });
    }
    case 'multiple': {
      const options = labels(draft.options, `${at}.options`);
      if (options.length < 3) fail(`${at} needs at least three options`);
      const raw = Array.isArray(draft.correctOptions) ? draft.correctOptions : [];
      const correct = [...new Set(raw)];
      if (correct.length === 0) fail(`${at} has no correct options`);
      if (correct.length >= options.length) fail(`${at} marks every option as correct`);
      if (correct.some((entry) => !Number.isInteger(entry) || entry < 0 || entry >= options.length)) {
        fail(`${at}.correctOptions must index its options`);
      }
      return withExtras({
        ...base,
        kind: 'multiple' as const,
        options: options.map((label, optionIndex) => ({ id: optionId(optionIndex), label })),
        correctIds: correct.map(optionId),
      });
    }
    case 'true-false': {
      if (typeof draft.correct !== 'boolean') fail(`${at}.correct must be true or false`);
      return withExtras({ ...base, kind: 'true-false' as const, correct: draft.correct });
    }
    case 'free-text': {
      const accepted = (Array.isArray(draft.accepted) ? draft.accepted : [])
        .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
        .filter(Boolean);
      if (accepted.length === 0) fail(`${at} has no accepted free-text answer`);
      const keywords = (Array.isArray(draft.keywords) ? draft.keywords : [])
        .map((group) =>
          (Array.isArray(group) ? group : [])
            .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
            .filter(Boolean),
        )
        .filter((group) => group.length > 0);
      return withExtras({
        ...base,
        kind: 'free-text' as const,
        accepted,
        ...(keywords.length ? { keywords } : {}),
      });
    }
    case 'matching': {
      if (!Array.isArray(draft.pairs) || draft.pairs.length < 2) {
        fail(`${at} needs at least two matching pairs`);
      }
      const pairs = (draft.pairs as DraftPair[]).map((pair, pairIndex) => ({
        id: `p${pairIndex + 1}`,
        left: localized(pair?.left, `${at}.pairs[${pairIndex}].left`),
        right: localized(pair?.right, `${at}.pairs[${pairIndex}].right`),
      }));
      return withExtras({ ...base, kind: 'matching' as const, pairs });
    }
    case 'ordering': {
      if (!Array.isArray(draft.items) || draft.items.length < 2) {
        fail(`${at} needs at least two ordering items`);
      }
      const items = (draft.items as DraftLocalized[]).map((item, itemIndex) => ({
        id: `i${itemIndex + 1}`,
        label: localized(item, `${at}.items[${itemIndex}]`),
      }));
      return withExtras({ ...base, kind: 'ordering' as const, items });
    }
    case 'cloze': {
      if (!Array.isArray(draft.segments) || draft.segments.length === 0) {
        fail(`${at} has no cloze segments`);
      }
      let blanks = 0;
      let texts = 0;
      const segments = (draft.segments as DraftSegment[]).map((segment, segmentIndex) => {
        if (!segment || typeof segment !== 'object') fail(`${at}.segments[${segmentIndex}] is not an object`);
        if (segment.type === 'text') {
          texts += 1;
          return { type: 'text' as const, value: localized(segment.text, `${at}.segments[${segmentIndex}].text`) };
        }
        if (segment.type !== 'blank') fail(`${at}.segments[${segmentIndex}] has an unknown type`);
        blanks += 1;
        const accepted = (Array.isArray(segment.accepted) ? segment.accepted : [])
          .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
          .filter(Boolean);
        if (accepted.length === 0) fail(`${at}.segments[${segmentIndex}] has no accepted answer`);
        const width =
          Number.isInteger(segment.width) && segment.width !== null && segment.width >= 3 && segment.width <= 32
            ? segment.width
            : undefined;
        return { type: 'blank' as const, accepted, ...(width ? { width } : {}) };
      });
      if (blanks === 0) fail(`${at} has no cloze blank`);
      if (texts === 0) fail(`${at} has no cloze text`);
      return withExtras({ ...base, kind: 'cloze' as const, segments });
    }
    case 'flashcard': {
      return withExtras({
        ...base,
        kind: 'flashcard' as const,
        back: localized(draft.back, `${at}.back`),
      });
    }
    default:
      fail(`${at} has an unsupported kind "${String((draft as { kind?: unknown }).kind)}"`);
  }
}

export interface NormalizeContext {
  topicId: string;
  source: Localized;
  /** CLI override, used for both languages. */
  meeting?: string;
  titleOverride?: string;
  /** When set, the topic may only contain these kinds. */
  allowedKinds?: string[];
}

export function normalizeTopic(draft: DraftTopic, context: NormalizeContext): QuizTopic {
  if (!draft || typeof draft !== 'object') fail('the model answer is not an object');
  if (!Array.isArray(draft.questions)) fail('questions is missing');
  if (draft.questions.length < 5) {
    fail(`only ${draft.questions.length} questions were returned; at least five are required`);
  }
  if (context.allowedKinds?.length) {
    const disallowed = [
      ...new Set(
        draft.questions
          .map((question) => question.kind)
          .filter((kind) => !context.allowedKinds?.includes(kind)),
      ),
    ];
    if (disallowed.length) {
      fail(
        `the model used ${disallowed.map((kind) => `"${kind}"`).join(', ')}; ` +
          `allowed: ${context.allowedKinds.join(', ')}`,
      );
    }
  }

  const title = context.titleOverride
    ? { de: context.titleOverride, en: context.titleOverride }
    : localized(draft.title, 'title');
  const summary = localized(draft.summary, 'summary');
  const meeting = context.meeting
    ? { de: context.meeting, en: context.meeting }
    : optionalLocalized(draft.meeting, 'meeting');

  const questions = draft.questions.map((question, index) =>
    normalizeQuestion(question, context.topicId, index),
  );

  const prompts = new Set<string>();
  for (const question of questions) {
    const key = question.prompt.de.toLowerCase().replace(/\s+/g, ' ').trim();
    if (prompts.has(key)) fail(`duplicate question prompt: "${question.prompt.de.slice(0, 80)}"`);
    prompts.add(key);
  }

  return {
    id: context.topicId,
    title,
    summary,
    ...(meeting ? { meeting } : {}),
    source: context.source,
    questions,
  };
}
