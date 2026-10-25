/**
 * Shared labels, URL helpers, and small presentational helpers for the quiz
 * dashboard. No page renders here; this module is imported by every view.
 */

import { h } from '../../assets/dom.mjs';
import { date, number } from '../../assets/format.mjs';
import { icon } from '../../assets/icons.mjs';
import { state } from '../../assets/runtime.mjs';

export const KIND_LABELS = {
  single: 'Einfachauswahl',
  multiple: 'Mehrfachauswahl',
  'true-false': 'Wahr/Falsch',
  'free-text': 'Freitext',
  matching: 'Zuordnen',
  ordering: 'Reihenfolge',
  cloze: 'Lückentext',
  map: 'Karte',
  diagram: 'Schaubild',
  flashcard: 'Karteikarte',
};

export const KIND_TEMPLATES = {
  single: {
    options: [
      { id: 'a', label: { de: 'Antwort A', en: 'Answer A' } },
      { id: 'b', label: { de: 'Antwort B', en: 'Answer B' } },
    ],
    correctId: 'a',
  },
  multiple: {
    options: [
      { id: 'a', label: { de: 'Antwort A', en: 'Answer A' } },
      { id: 'b', label: { de: 'Antwort B', en: 'Answer B' } },
    ],
    correctIds: ['a'],
  },
  'true-false': { correct: true },
  'free-text': { accepted: ['Antwort'], keywords: [['alternativ']] },
  matching: {
    pairs: [
      { id: 'a', left: { de: 'Begriff A', en: 'Term A' }, right: { de: 'Zuordnung A', en: 'Match A' } },
      { id: 'b', left: { de: 'Begriff B', en: 'Term B' }, right: { de: 'Zuordnung B', en: 'Match B' } },
    ],
  },
  ordering: {
    items: [
      { id: 'a', label: { de: 'Schritt 1', en: 'Step 1' } },
      { id: 'b', label: { de: 'Schritt 2', en: 'Step 2' } },
    ],
  },
  cloze: {
    segments: [
      { type: 'text', value: { de: 'Ein ', en: 'A ' } },
      { type: 'blank', accepted: ['Satz'], width: 120 },
      { type: 'text', value: { de: '.', en: '.' } },
    ],
  },
  map: {
    viewBox: '0 0 1000 839',
    backdrop: [],
    zones: [{ id: 'z1', label: { de: 'Zone 1', en: 'Zone 1' }, tone: 'blue' }],
    regions: [{ id: 'r1', label: { de: 'Region 1', en: 'Region 1' }, short: 'R1', path: 'M0 0h10v10z', labelX: 5, labelY: 5 }],
    correct: { r1: 'z1' },
  },
  diagram: {
    viewBox: '0 0 800 600',
    backdrop: ['M0 0h800v600H0z'],
    regions: [{ id: 'r1', label: { de: 'Struktur', en: 'Structure' }, path: 'M0 0h100v100H0z', labelX: 50, labelY: 50 }],
    correctIds: ['r1'],
  },
  flashcard: { back: { de: 'Rückseite', en: 'Back' } },
};

export const PAYLOAD_HINTS = {
  single: 'options[] mit id und label {de,en}, dazu correctId.',
  multiple: 'options[] mit id und label {de,en}, dazu correctIds[].',
  'true-false': 'correct: true oder false.',
  'free-text': 'accepted[] mit Schreibweisen; optional keywords[][] für Teiltreffer.',
  matching: 'pairs[] mit id, left {de,en}, right {de,en}.',
  ordering: 'items[] in korrekter Reihenfolge, je id und label {de,en}.',
  cloze: 'segments[]: {type:"text",value:{de,en}} oder {type:"blank",accepted:[],width}.',
  map: 'viewBox, backdrop[], zones[], regions[], correct {regionId: zoneId}.',
  diagram: 'viewBox, backdrop[], regions[], correctIds[]. Regionen brauchen path oder circle.',
  flashcard: 'back {de,en}.',
};

export function moduleOptions(modules, selected) {
  return modules.map((module) =>
    h('option', {
      value: module.id,
      text: module.title.de + (module.studyTitle ? ' · ' + module.studyTitle.de : ''),
      selected: module.id === selected,
    }),
  );
}

export function localized(value) {
  return value?.de || value?.en || '';
}

export function todayLabel(value) {
  return value ? date(value) : '–';
}

export function truncate(value, length) {
  const text = String(value ?? '');
  return text.length > length ? text.slice(0, length - 1) + '…' : text;
}

export function paramsFromRoute(route, target) {
  const params = route.params;
  target.query = params.get('query') || '';
  target.moduleId = params.get('moduleId') || '';
  target.published = ['1', '0'].includes(params.get('published')) ? params.get('published') : '';
  target.topicId = params.get('topicId') || '';
  target.correct = ['1', '0'].includes(params.get('correct')) ? params.get('correct') : '';
  target.limit = Math.max(1, Math.min(200, Number(params.get('limit')) || 50));
  target.offset = Math.max(0, Number(params.get('offset')) || 0);
}

export function catalogHash() {
  const params = new URLSearchParams();
  if (state.quiz.query) params.set('query', state.quiz.query);
  if (state.quiz.moduleId) params.set('moduleId', state.quiz.moduleId);
  if (state.quiz.published) params.set('published', state.quiz.published);
  if (state.quiz.offset) params.set('offset', String(state.quiz.offset));
  const text = params.toString();
  return '#/quiz' + (text ? '?' + text : '');
}

export function attemptsHash() {
  const params = new URLSearchParams();
  const view = state.quiz.attempts;
  if (view.query) params.set('query', view.query);
  if (view.topicId) params.set('topicId', view.topicId);
  if (view.correct) params.set('correct', view.correct);
  if (view.offset) params.set('offset', String(view.offset));
  const text = params.toString();
  return '#/quiz/attempts' + (text ? '?' + text : '');
}

export function sessionsHash() {
  const params = new URLSearchParams();
  const view = state.quiz.sessions;
  if (view.query) params.set('query', view.query);
  if (view.topicId) params.set('topicId', view.topicId);
  if (view.offset) params.set('offset', String(view.offset));
  const text = params.toString();
  return '#/quiz/sessions' + (text ? '?' + text : '');
}

export function pager(info, total, limit, offset, onPrev, onNext) {
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + limit, total);
  return h('div', { className: 'pager' },
    h('p', { className: 'hint', text: `${from}–${to} von ${number(total)}` }),
    h('div', { className: 'row tight' },
      h('button', { className: 'btn secondary small', type: 'button', disabled: offset <= 0, onClick: onPrev }, icon('chevron-left'), 'Zurück'),
      h('button', { className: 'btn secondary small', type: 'button', disabled: offset + limit >= total, onClick: onNext }, 'Weiter', icon('chevron-right')),
    ),
  );
}

/** Generic modal shell shared by the topic, module, question, and answer dialogs. */
export function dialogShell(title, lead) {
  const existing = document.getElementById('quiz-dialog');
  if (existing) existing.remove();
  const error = h('div', { className: 'auth-error', role: 'alert' });
  const form = h('form', { className: 'modal-body' });
  const dialog = h('dialog', { className: 'modal modal-wide', id: 'quiz-dialog' }, form);
  document.body.append(dialog);
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => dialog.remove());
  form.append(
    h('div', { className: 'modal-head' },
      h('div', { className: 'modal-icon warn' }, icon('edit')),
      h('div', null, h('h2', { text: title }), h('p', { text: lead })),
    ),
  );
  return { dialog, form, error };
}

export function field(label, input, className) {
  return h('label', { className: 'field stack-field compact' + (className ? ' ' + className : '') }, label, input);
}

export function closeDialog(dialog) {
  dialog.close();
}

