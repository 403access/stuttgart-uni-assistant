import type { Locale } from '@/src/types';
import { pick, tx } from '@/src/text';

import type { ClozeSegment, QuizAnswer, QuizQuestion } from './types';

/**
 * Lower-cases, strips accents (ä → a) and punctuation, and collapses whitespace.
 * That makes "Ferdinand de Saussure", "saussure" and "SAUSSURE" equivalent.
 */
export function normalizeAnswer(value: string): string {
  const normalized = value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  // "6.000", "6 000" and "6000" should all pass for a numeric answer.
  return /^[\d\s]+$/.test(normalized) ? normalized.replace(/\s+/g, '') : normalized;
}

/** Small edit distance, capped for early exit. */
function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let row = 1; row <= a.length; row += 1) {
    const current = [row];
    for (let column = 1; column <= b.length; column += 1) {
      const cost = a[row - 1] === b[column - 1] ? 0 : 1;
      current[column] = Math.min(current[column - 1] + 1, previous[column] + 1, previous[column - 1] + cost);
    }
    previous = current;
  }
  return previous[b.length];
}

/** Accepts a one- or two-letter typo once the answer is long enough to be unambiguous. */
function isCloseMatch(value: string, accepted: string): boolean {
  if (!value || !accepted) return false;
  if (value === accepted) return true;
  // A surname is enough for a full name ("Saussure" for "Ferdinand de Saussure").
  const words = accepted.split(' ');
  if (words.length > 1) {
    const surname = words[words.length - 1];
    if (surname.length >= 4 && isCloseMatch(value, surname)) return true;
  }
  if (value.length < 4) return false;
  const tolerance = value.length > 10 ? 2 : 1;
  return editDistance(value, accepted) <= tolerance;
}

/** Exact or near-exact match against the accepted spellings. */
export function matchesAccepted(value: string, accepted: string[]): boolean {
  const normalized = normalizeAnswer(value);
  if (!normalized) return false;
  return accepted.some((entry) => isCloseMatch(normalized, normalizeAnswer(entry)));
}

/**
 * Free text: either the whole answer matches an accepted spelling, or every
 * required fact (an inner keyword array) appears in the answer.
 */
function matchesFreeText(question: Extract<QuizQuestion, { kind: 'free-text' }>, value: string): boolean {
  if (matchesAccepted(value, question.accepted)) return true;
  if (!question.keywords?.length) return false;
  const normalized = ` ${normalizeAnswer(value)} `;
  return question.keywords.every((group) =>
    group.some((keyword) => normalized.includes(` ${normalizeAnswer(keyword)} `)),
  );
}

function clozeBlanks(segments: ClozeSegment[]): Extract<ClozeSegment, { type: 'blank' }>[] {
  return segments.filter((segment): segment is Extract<ClozeSegment, { type: 'blank' }> => segment.type === 'blank');
}

/** Whether the current draft is complete enough to be checked. */
export function isAnswerComplete(question: QuizQuestion, answer: QuizAnswer | undefined): boolean {
  switch (question.kind) {
    case 'single':
    case 'free-text':
      return typeof answer === 'string' && answer.trim().length > 0;
    case 'multiple':
      return Array.isArray(answer) && answer.length > 0;
    case 'true-false':
      return typeof answer === 'boolean';
    case 'matching':
      return (
        typeof answer === 'object' &&
        !Array.isArray(answer) &&
        Object.keys(answer).length === question.pairs.length
      );
    case 'ordering':
      return Array.isArray(answer) && answer.length === question.items.length;
    case 'cloze': {
      if (!Array.isArray(answer)) return false;
      return clozeBlanks(question.segments).every((_, index) => Boolean(answer[index]?.trim()));
    }
    case 'map': {
      if (!answer || typeof answer !== 'object' || Array.isArray(answer)) return false;
      return question.regions.every((region) => Boolean((answer as Record<string, string>)[region.id]));
    }
    case 'diagram':
      return Array.isArray(answer) && answer.length > 0;
    case 'flashcard':
      return answer === 'known' || answer === 'unknown';
  }
}

export function evaluateAnswer(question: QuizQuestion, answer: QuizAnswer | undefined): boolean {
  switch (question.kind) {
    case 'single':
      return answer === question.correctId;
    case 'multiple': {
      if (!Array.isArray(answer)) return false;
      const selected = new Set(answer);
      return (
        selected.size === question.correctIds.length &&
        question.correctIds.every((id) => selected.has(id))
      );
    }
    case 'true-false':
      return answer === question.correct;
    case 'free-text':
      return typeof answer === 'string' && matchesFreeText(question, answer);
    case 'matching':
      if (!answer || typeof answer !== 'object' || Array.isArray(answer)) return false;
      return Object.entries(answer).every(([leftId, rightId]) => leftId === rightId);
    case 'ordering': {
      if (!Array.isArray(answer)) return false;
      return question.items.every((item, index) => answer[index] === item.id);
    }
    case 'cloze': {
      if (!Array.isArray(answer)) return false;
      return clozeBlanks(question.segments).every((blank, index) =>
        matchesAccepted(answer[index] ?? '', blank.accepted),
      );
    }
    case 'map': {
      if (!answer || typeof answer !== 'object' || Array.isArray(answer)) return false;
      const assigned = answer as Record<string, string>;
      return question.regions.every((region) => assigned[region.id] === question.correct[region.id]);
    }
    case 'diagram': {
      if (!Array.isArray(answer)) return false;
      const selected = new Set(answer);
      return (
        selected.size === question.correctIds.length &&
        question.correctIds.every((id) => selected.has(id))
      );
    }
    case 'flashcard':
      return answer === 'known';
  }
}

/** Human-readable solution for the feedback panel. */
export function describeCorrectAnswer(question: QuizQuestion, locale: Locale): string {
  switch (question.kind) {
    case 'single': {
      const option = question.options.find((entry) => entry.id === question.correctId);
      return option ? pick(option.label, locale) : '';
    }
    case 'multiple':
      return question.options
        .filter((option) => question.correctIds.includes(option.id))
        .map((option) => pick(option.label, locale))
        .join(', ');
    case 'true-false':
      return question.correct ? tx(locale, 'quiz.true') : tx(locale, 'quiz.false');
    case 'free-text':
      return question.accepted[0] ?? '';
    case 'matching':
      return question.pairs
        .map((pair) => `${pick(pair.left, locale)} → ${pick(pair.right, locale)}`)
        .join(' · ');
    case 'ordering':
      return question.items.map((item) => pick(item.label, locale)).join(' → ');
    case 'cloze':
      return clozeBlanks(question.segments)
        .map((blank) => blank.accepted[0] ?? '')
        .join(', ');
    case 'map':
      return question.regions
        .map((region) => {
          const zone = question.zones.find((entry) => entry.id === question.correct[region.id]);
          return `${pick(region.label, locale)} → ${zone ? pick(zone.label, locale) : ''}`;
        })
        .join(' · ');
    case 'diagram':
      return question.regions
        .filter((region) => question.correctIds.includes(region.id))
        .map((region) => pick(region.label, locale))
        .join(', ');
    case 'flashcard':
      return pick(question.back, locale);
  }
}
