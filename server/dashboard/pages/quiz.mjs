/** Learning quiz: catalog management, answer analytics, and round history. */

import { api, errorText } from '../assets/api.mjs';
import { setPage } from '../assets/auth-ui.mjs';
import { $, h } from '../assets/dom.mjs';
import { date, number, relative } from '../assets/format.mjs';
import { icon } from '../assets/icons.mjs';
import { refresh, state } from '../assets/runtime.mjs';
import { badge, confirmAction, emptyState, loading, sectionHead, toast } from '../assets/ui.mjs';

const KIND_LABELS = {
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

const KIND_TEMPLATES = {
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

const PAYLOAD_HINTS = {
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

function moduleOptions(modules, selected) {
  return modules.map((module) =>
    h('option', {
      value: module.id,
      text: module.title.de + (module.studyTitle ? ' · ' + module.studyTitle.de : ''),
      selected: module.id === selected,
    }),
  );
}

function localized(value) {
  return value?.de || value?.en || '';
}

function todayLabel(value) {
  return value ? date(value) : '–';
}

function truncate(value, length) {
  const text = String(value ?? '');
  return text.length > length ? text.slice(0, length - 1) + '…' : text;
}

function paramsFromRoute(route, target) {
  const params = route.params;
  target.query = params.get('query') || '';
  target.moduleId = params.get('moduleId') || '';
  target.published = ['1', '0'].includes(params.get('published')) ? params.get('published') : '';
  target.topicId = params.get('topicId') || '';
  target.correct = ['1', '0'].includes(params.get('correct')) ? params.get('correct') : '';
  target.limit = Math.max(1, Math.min(200, Number(params.get('limit')) || 50));
  target.offset = Math.max(0, Number(params.get('offset')) || 0);
}

function catalogHash() {
  const params = new URLSearchParams();
  if (state.quiz.query) params.set('query', state.quiz.query);
  if (state.quiz.moduleId) params.set('moduleId', state.quiz.moduleId);
  if (state.quiz.published) params.set('published', state.quiz.published);
  if (state.quiz.offset) params.set('offset', String(state.quiz.offset));
  const text = params.toString();
  return '#/quiz' + (text ? '?' + text : '');
}

function attemptsHash() {
  const params = new URLSearchParams();
  const view = state.quiz.attempts;
  if (view.query) params.set('query', view.query);
  if (view.topicId) params.set('topicId', view.topicId);
  if (view.correct) params.set('correct', view.correct);
  if (view.offset) params.set('offset', String(view.offset));
  const text = params.toString();
  return '#/quiz/attempts' + (text ? '?' + text : '');
}

function sessionsHash() {
  const params = new URLSearchParams();
  const view = state.quiz.sessions;
  if (view.query) params.set('query', view.query);
  if (view.topicId) params.set('topicId', view.topicId);
  if (view.offset) params.set('offset', String(view.offset));
  const text = params.toString();
  return '#/quiz/sessions' + (text ? '?' + text : '');
}

function pager(info, total, limit, offset, onPrev, onNext) {
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

/* ------------------------------------------------------------------ router -- */

export async function renderQuizPage(route) {
  if (route.name === 'quiz-topic') return renderTopicPage(route);
  if (route.name === 'quiz-attempts') return renderAttemptsPage(route);
  if (route.name === 'quiz-sessions') return renderSessionsPage(route);
  return renderCatalogPage(route);
}

/* ----------------------------------------------------------------- catalog -- */

async function renderCatalogPage(route) {
  setPage('Lernquiz', 'Themen und Fragen verwalten, Antworten aller Nutzer einsehen');
  paramsFromRoute(route, state.quiz);
  const view = $('view');
  view.replaceChildren(loading('Lernquiz wird geladen …'));
  try {
    const [overview, topics] = await Promise.all([
      api('/v1/admin/quiz/overview'),
      api(`/v1/admin/quiz/topics?${catalogQuery()}`),
    ]);
    state.quiz.overview = overview;
    state.quiz.list = topics.items || [];
    state.quiz.total = topics.total || 0;
    renderCatalogShell(overview, topics);
  } catch (error) {
    view.replaceChildren(emptyState('alert', 'Lernquiz konnte nicht geladen werden', errorText(error)));
    throw error;
  }
}

function catalogQuery() {
  const params = new URLSearchParams();
  params.set('limit', '50');
  params.set('offset', String(state.quiz.offset));
  if (state.quiz.query) params.set('query', state.quiz.query);
  if (state.quiz.moduleId) params.set('moduleId', state.quiz.moduleId);
  if (state.quiz.published) params.set('published', state.quiz.published);
  return params.toString();
}

function kpiGrid(overview) {
  const items = [
    { symbol: 'grid', value: overview.modules, label: 'Module', sub: `${overview.studies} Studiengänge`, href: '#/quiz', tone: 'blue' },
    { symbol: 'list', value: overview.topics, label: 'Themen', sub: `${overview.publishedTopics} veröffentlicht`, href: '#/quiz', tone: 'cyan' },
    { symbol: 'info', value: overview.questions, label: 'Fragen', sub: `${overview.publishedQuestions} veröffentlicht`, href: '#/quiz', tone: 'purple' },
    { symbol: 'check-circle', value: overview.attempts, label: 'Antworten', sub: `${overview.today} heute`, href: '#/quiz/attempts', tone: 'green' },
    { symbol: 'users', value: overview.users, label: 'Nutzer mit Antworten', sub: `${overview.sessions} Runden`, href: '#/quiz/attempts', tone: 'amber' },
    { symbol: 'activity', value: overview.accuracy + '%', label: 'Trefferquote', sub: `${overview.correct} richtig`, href: '#/quiz/attempts?correct=1', tone: 'red' },
  ];
  return h('div', { className: 'kpi-grid' }, ...items.map((item) =>
    h('a', { className: 'kpi ' + item.tone, href: item.href },
      h('div', { className: 'kpi-top' }, h('span', { className: 'kpi-icon' }, icon(item.symbol, 17)), h('span', { className: 'kpi-arrow' }, icon('arrow-right', 15))),
      h('div', { className: 'value', text: typeof item.value === 'number' ? number(item.value) : item.value }),
      h('div', { className: 'label', text: item.label }),
      h('div', { className: 'sub', text: item.sub }),
    )));
}

function renderCatalogShell(overview, topics) {
  const view = $('view');
  const search = h('input', { type: 'search', value: state.quiz.query, placeholder: 'Thema, Modul oder Zusammenfassung', autocomplete: 'off' });
  const moduleSelect = h('select', { id: 'quiz-module-filter' },
    h('option', { value: '', text: 'Alle Module', selected: !state.quiz.moduleId }),
    ...moduleOptions(overview.modulesList || [], state.quiz.moduleId),
  );
  const stateSelect = h('select', { id: 'quiz-state-filter' },
    h('option', { value: '', text: 'Alle Status', selected: !state.quiz.published }),
    h('option', { value: '1', text: 'Veröffentlicht', selected: state.quiz.published === '1' }),
    h('option', { value: '0', text: 'Entwürfe', selected: state.quiz.published === '0' }),
  );
  const reload = () => {
    state.quiz.query = search.value.trim();
    state.quiz.moduleId = moduleSelect.value;
    state.quiz.published = stateSelect.value;
    state.quiz.offset = 0;
    history.replaceState(null, '', catalogHash());
    refresh.current();
  };
  let timer = null;
  search.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(reload, 280); });
  search.addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); clearTimeout(timer); reload(); } });
  moduleSelect.addEventListener('change', reload);
  stateSelect.addEventListener('change', reload);

  const createButton = h('button', { className: 'btn', type: 'button', onClick: () => openTopicEditor(null, overview.modulesList || []) }, icon('plus'), 'Thema anlegen');
  const seedButton = h('button', { className: 'btn secondary', type: 'button', onClick: () => reseedCatalog() }, icon('refresh'), 'Katalog neu importieren');

  const topicRows = topics.items?.length
    ? topics.items.map((topic) => h('tr', null,
        h('td', null,
          h('a', { href: '#/quiz/topics/' + encodeURIComponent(topic.id) }, h('strong', { text: topic.title.de })),
          h('div', { className: 'hint', text: topic.moduleTitle.de }),
        ),
        h('td', null, badge(`${topic.publishedQuestions}/${topic.questionCount} Fragen`, topic.published ? 'ok' : 'warn')),
        h('td', null, number(topic.attempts)),
        h('td', null, topic.attempts ? badge(topic.accuracy + '%', topic.accuracy >= 70 ? 'ok' : 'warn') : '–'),
        h('td', null, topic.published ? badge('veröffentlicht', 'ok') : badge('Entwurf', 'warn')),
        h('td', null, h('div', { className: 'row tight' },
          h('a', { className: 'btn secondary small', href: '#/quiz/topics/' + encodeURIComponent(topic.id) }, icon('eye'), 'Öffnen'),
          h('button', { className: 'btn secondary small', type: 'button', onClick: () => openTopicById(topic.id, overview.modulesList || []) }, icon('edit'), 'Bearbeiten'),
          h('button', { className: 'btn danger-soft small', type: 'button', onClick: () => removeTopic(topic) }, icon('trash'), 'Löschen'),
        )),
      ))
    : [h('tr', null, h('td', { colspan: '6' }, emptyState('list', 'Keine Themen', 'Lege das erste Thema an oder ändere den Filter.')))];

  const moduleRows = (overview.modulesList || []).map((module) => h('tr', null,
    h('td', null,
      h('strong', { text: module.title.de }),
      h('div', { className: 'hint', text: module.studyTitle.de + ' · ' + module.semester + '. Semester' }),
    ),
    h('td', null, number(module.topics)),
    h('td', null, number(module.questions)),
    h('td', null, number(module.attempts)),
    h('td', null, module.attempts ? badge(module.accuracy + '%', module.accuracy >= 70 ? 'ok' : 'warn') : '–'),
    h('td', null, h('div', { className: 'row tight' },
      h('button', { className: 'btn secondary small', type: 'button', onClick: () => { state.quiz.moduleId = module.id; state.quiz.offset = 0; history.replaceState(null, '', catalogHash()); refresh.current(); } }, icon('filter'), 'Themen filtern'),
      h('button', { className: 'btn secondary small', type: 'button', onClick: () => openModuleEditor(module) }, icon('edit'), 'Bearbeiten'),
    )),
  ));

  view.replaceChildren(h('div', { className: 'view-stack' },
    kpiGrid(overview),
    h('section', { className: 'card toolbar' },
      h('label', { className: 'field grow' }, 'Suche', h('div', { className: 'search-field' }, icon('search'), search)),
      h('label', { className: 'field' }, 'Modul', moduleSelect),
      h('label', { className: 'field' }, 'Status', stateSelect),
      createButton,
    ),
    h('section', { className: 'card table-card' },
      h('div', { className: 'table-wrap' }, h('table', { className: 'data' },
        h('caption', { className: 'sr-only' }, 'Quiz-Themen'),
        h('thead', null, h('tr', null,
          h('th', null, 'Thema'),
          h('th', null, 'Fragen'),
          h('th', null, 'Antworten'),
          h('th', null, 'Treffer'),
          h('th', null, 'Status'),
          h('th', null, ''),
        )),
        h('tbody', null, ...topicRows),
      )),
      pager(null, state.quiz.total, 50, state.quiz.offset,
        () => { state.quiz.offset = Math.max(0, state.quiz.offset - 50); history.replaceState(null, '', catalogHash()); refresh.current(); },
        () => { state.quiz.offset += 50; history.replaceState(null, '', catalogHash()); refresh.current(); }),
    ),
    h('section', { className: 'card' },
      sectionHead('Module', 'Module sind aus dem App-Katalog importiert und lassen sich hier bearbeiten.', seedButton),
      h('div', { className: 'table-wrap' }, h('table', { className: 'data' },
        h('thead', null, h('tr', null,
          h('th', null, 'Modul'),
          h('th', null, 'Themen'),
          h('th', null, 'Fragen'),
          h('th', null, 'Antworten'),
          h('th', null, 'Treffer'),
          h('th', null, ''),
        )),
        h('tbody', null, ...moduleRows),
      )),
    ),
    h('section', { className: 'card' },
      sectionHead('Antworten', 'Jede geprüfte Antwort mit Nutzer, Frage und Ergebnis.', h('div', { className: 'row tight' },
        h('a', { className: 'btn secondary small', href: '#/quiz/attempts' }, icon('list'), 'Alle Antworten'),
        h('a', { className: 'btn secondary small', href: '#/quiz/sessions' }, icon('activity'), 'Runden'),
      )),
      overview.lastAttemptAt ? h('p', { className: 'hint', text: `Letzte Antwort: ${relative(overview.lastAttemptAt)} · ${overview.today} heute · ${overview.users} Nutzer` }) : h('p', { className: 'hint', text: 'Noch keine Antworten synchronisiert.' }),
      overview.topTopics?.length
        ? h('div', { className: 'bar-list' }, ...overview.topTopics.map((topic) => h('div', { className: 'bar-row' },
            h('div', { className: 'bar-label' },
              h('strong', { text: topic.title.de }),
              h('span', { text: `${number(topic.attempts)} · ${topic.accuracy}%` }),
            ),
            h('div', { className: 'bar-track' }, h('div', { className: 'bar-fill', style: { width: Math.max(2, topic.accuracy) + '%' } })),
          )))
        : null,
    ),
  ));
}

async function reseedCatalog() {
  const ok = await confirmAction({
    title: 'Katalog neu importieren?',
    message: 'Der gebündelte Katalog ersetzt alle Themen und Fragen. Antworten und Runden bleiben erhalten. Eigene Änderungen am Katalog gehen verloren.',
    confirmLabel: 'Neu importieren',
    requireText: 'IMPORTIEREN',
  });
  if (!ok) return;
  try {
    const result = await api('/v1/admin/quiz/seed', { method: 'POST', body: {} });
    toast(`Katalog importiert: ${result.topics} Themen, ${result.questions} Fragen.`, 'ok');
    await refresh.current();
  } catch (error) {
    toast(errorText(error), 'error');
  }
}

async function removeTopic(topic) {
  const ok = await confirmAction({
    title: 'Thema löschen?',
    message: `„${topic.title.de}“ und alle seine Fragen werden gelöscht. Antworten bleiben als Verlauf erhalten.`,
    confirmLabel: 'Löschen',
    requireText: 'LÖSCHEN',
  });
  if (!ok) return;
  try {
    await api('/v1/admin/quiz/topics/' + encodeURIComponent(topic.id), { method: 'DELETE' });
    toast('Thema gelöscht.', 'ok');
    await refresh.current();
  } catch (error) {
    toast(errorText(error), 'error');
  }
}

/* ------------------------------------------------------------- topic detail -- */

async function renderTopicPage(route) {
  setPage('Quiz-Thema', 'Fragen bearbeiten und Antworten prüfen');
  const view = $('view');
  view.replaceChildren(loading('Thema wird geladen …'));
  try {
    const [{ topic }, attempts, overview] = await Promise.all([
      api('/v1/admin/quiz/topics/' + encodeURIComponent(route.id)),
      api('/v1/admin/quiz/attempts?limit=10&topicId=' + encodeURIComponent(route.id)),
      api('/v1/admin/quiz/overview'),
    ]);
    renderTopicShell(topic, attempts, overview);
  } catch (error) {
    view.replaceChildren(emptyState('alert', 'Thema konnte nicht geladen werden', errorText(error)));
    throw error;
  }
}

function renderTopicShell(topic, attempts, overview) {
  const view = $('view');
  const questionRows = topic.questions.length
    ? topic.questions.map((question) => h('tr', null,
        h('td', null,
          h('strong', { text: truncate(localized(question.prompt), 120) }),
          h('div', { className: 'hint', text: question.id }),
        ),
        h('td', null, badge(KIND_LABELS[question.kind] || question.kind, 'blue')),
        h('td', null, String(question.difficulty)),
        h('td', null, number(question.attempts)),
        h('td', null, question.attempts ? badge(question.accuracy + '%', question.accuracy >= 70 ? 'ok' : 'warn') : '–'),
        h('td', null, question.published ? badge('veröffentlicht', 'ok') : badge('Entwurf', 'warn')),
        h('td', null, h('div', { className: 'row tight' },
          h('button', { className: 'btn secondary small', type: 'button', onClick: () => openQuestionEditor(topic.id, question) }, icon('edit'), 'Bearbeiten'),
          h('button', { className: 'btn danger-soft small', type: 'button', onClick: () => removeQuestion(topic.id, question) }, icon('trash'), 'Löschen'),
        )),
      ))
    : [h('tr', null, h('td', { colspan: '7' }, emptyState('help', 'Noch keine Fragen', 'Lege die erste Frage für dieses Thema an.')))];

  const attemptRows = attempts.items?.length
    ? attempts.items.map((attempt) => h('tr', null,
        h('td', { style: { whiteSpace: 'nowrap' } }, h('span', { className: 'tiny', text: todayLabel(attempt.answeredAt) })),
        h('td', null,
          h('strong', { text: attempt.name || attempt.account || 'Unbekannt' }),
          h('div', { className: 'hint', text: attempt.account || attempt.userId }),
        ),
        h('td', { style: { maxWidth: '340px', whiteSpace: 'pre-wrap' } }, truncate(attempt.prompt.de, 140)),
        h('td', { style: { maxWidth: '300px', whiteSpace: 'pre-wrap' } }, attempt.answerText || JSON.stringify(attempt.answer)),
        h('td', null, attempt.correct ? badge('richtig', 'ok') : badge('falsch', 'danger')),
      ))
    : [h('tr', null, h('td', { colspan: '5' }, emptyState('inbox', 'Noch keine Antworten', 'Sobald ein Nutzer dieses Thema übt, erscheinen die Antworten hier.')))];

  view.replaceChildren(h('div', { className: 'view-stack' },
    h('div', { className: 'row tight' },
      h('a', { className: 'btn secondary small', href: '#/quiz' }, icon('chevron-left'), 'Katalog'),
    ),
    h('section', { className: 'card' },
      h('div', { className: 'card-head' },
        h('div', null,
          h('div', { className: 'row tight' },
            h('h2', { text: topic.title.de, style: { margin: 0 } }),
            topic.published ? badge('veröffentlicht', 'ok') : badge('Entwurf', 'warn'),
          ),
          h('p', { className: 'hint', text: `${topic.moduleTitle.de} · ${topic.studyTitle.de} · ${topic.questions.length} Fragen` }),
        ),
        h('div', { className: 'row tight' },
          h('button', { className: 'btn secondary small', type: 'button', onClick: () => toggleTopic(topic) }, icon(topic.published ? 'eye-off' : 'eye'), topic.published ? 'Zurückziehen' : 'Veröffentlichen'),
          h('button', { className: 'btn secondary small', type: 'button', onClick: () => openTopicEditor(topic, overview.modulesList || []) }, icon('edit'), 'Thema bearbeiten'),
          h('button', { className: 'btn danger-soft small', type: 'button', onClick: () => removeTopic(topic) }, icon('trash'), 'Löschen'),
        ),
      ),
      h('div', { className: 'detail-grid' },
        h('div', { className: 'field-box' }, h('div', { className: 'k', text: 'Antworten' }), h('div', { className: 'v', text: number(topic.attempts) })),
        h('div', { className: 'field-box' }, h('div', { className: 'k', text: 'Trefferquote' }), h('div', { className: 'v', text: topic.accuracy + '%' })),
        h('div', { className: 'field-box' }, h('div', { className: 'k', text: 'Schaubild' }), h('div', { className: 'v', text: topic.figureJson ? 'vorhanden' : '–' })),
      ),
      h('p', { className: 'hint', text: localized(topic.summary) }),
    ),
    h('section', { className: 'card' },
      sectionHead('Fragen', `${topic.questions.length} Fragen in diesem Thema`, h('button', { className: 'btn', type: 'button', onClick: () => openQuestionEditor(topic.id, null) }, icon('plus'), 'Frage anlegen')),
      h('div', { className: 'table-wrap' }, h('table', { className: 'data' },
        h('thead', null, h('tr', null,
          h('th', null, 'Frage'),
          h('th', null, 'Typ'),
          h('th', null, 'Stufe'),
          h('th', null, 'Antworten'),
          h('th', null, 'Treffer'),
          h('th', null, 'Status'),
          h('th', null, ''),
        )),
        h('tbody', null, ...questionRows),
      )),
    ),
    h('section', { className: 'card' },
      sectionHead('Letzte Antworten', 'Die jüngsten geprüften Antworten zu diesem Thema.', h('a', { className: 'btn secondary small', href: '#/quiz/attempts?topicId=' + encodeURIComponent(topic.id) }, icon('list'), 'Alle Antworten')),
      h('div', { className: 'table-wrap' }, h('table', { className: 'data' },
        h('thead', null, h('tr', null,
          h('th', null, 'Zeit'),
          h('th', null, 'Nutzer'),
          h('th', null, 'Frage'),
          h('th', null, 'Antwort'),
          h('th', null, 'Ergebnis'),
        )),
        h('tbody', null, ...attemptRows),
      )),
    ),
  ));
}

async function toggleTopic(topic) {
  try {
    await api('/v1/admin/quiz/topics/' + encodeURIComponent(topic.id), {
      method: 'POST',
      body: { published: !topic.published },
    });
    toast(topic.published ? 'Thema zurückgezogen.' : 'Thema veröffentlicht.', 'ok');
    await refresh.current();
  } catch (error) {
    toast(errorText(error), 'error');
  }
}

async function removeQuestion(topicId, question) {
  const ok = await confirmAction({
    title: 'Frage löschen?',
    message: 'Die Frage wird aus dem Katalog entfernt. Bereits abgegebene Antworten bleiben im Verlauf erhalten.',
    confirmLabel: 'Löschen',
    requireText: 'LÖSCHEN',
  });
  if (!ok) return;
  try {
    await api('/v1/admin/quiz/questions/' + encodeURIComponent(question.id), { method: 'DELETE' });
    toast('Frage gelöscht.', 'ok');
    await refresh.current();
  } catch (error) {
    toast(errorText(error), 'error');
  }
}

/* ---------------------------------------------------------------- editors -- */

function dialogShell(title, lead) {
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

function field(label, input, className) {
  return h('label', { className: 'field stack-field compact' + (className ? ' ' + className : '') }, label, input);
}

function closeDialog(dialog) {
  dialog.close();
}

function openTopicEditor(topic, modules) {
  const { dialog, form, error } = dialogShell(
    topic ? 'Thema bearbeiten' : 'Thema anlegen',
    topic ? 'Änderungen sind nach dem Speichern im App-Katalog sichtbar.' : 'Ein neues Thema wird erst mit veröffentlichten Fragen im App-Katalog sichtbar.',
  );
  const moduleSelect = h('select', null, ...moduleOptions(modules, topic?.moduleId));
  const titleDe = h('input', { type: 'text', required: true, value: topic?.title?.de ?? '', maxlength: '200', autocomplete: 'off' });
  const titleEn = h('input', { type: 'text', value: topic?.title?.en ?? '', maxlength: '200', autocomplete: 'off' });
  const summaryDe = h('textarea', { rows: '2', required: true, maxlength: '2000', value: topic?.summary?.de ?? '' });
  const summaryEn = h('textarea', { rows: '2', maxlength: '2000', value: topic?.summary?.en ?? '' });
  const meetingDe = h('input', { type: 'text', value: topic?.meeting?.de ?? '', maxlength: '200', autocomplete: 'off', placeholder: 'z. B. Sitzung 1 · 15.10.2026' });
  const meetingEn = h('input', { type: 'text', value: topic?.meeting?.en ?? '', maxlength: '200', autocomplete: 'off' });
  const sourceDe = h('input', { type: 'text', value: topic?.source?.de ?? '', maxlength: '300', autocomplete: 'off' });
  const sourceEn = h('input', { type: 'text', value: topic?.source?.en ?? '', maxlength: '300', autocomplete: 'off' });
  const figure = h('textarea', { rows: '6', className: 'mono', placeholder: 'optional – JSON mit viewBox und regions', value: topic?.figureJson ?? '' });
  const sortOrder = h('input', { type: 'number', value: topic?.sortOrder ?? '', placeholder: 'automatisch' });
  const published = h('input', { type: 'checkbox', class: 'checkbox' });
  published.checked = topic ? topic.published : true;
  const submit = h('button', { className: 'btn', type: 'submit' }, topic ? 'Speichern' : 'Thema anlegen');
  const cancel = h('button', { className: 'btn secondary', type: 'button', onClick: () => closeDialog(dialog) }, 'Abbrechen');

  form.append(h('div', { className: 'form-grid' },
    field('Modul', moduleSelect),
    field('Titel (Deutsch)', titleDe),
    field('Titel (Englisch)', titleEn, 'full'),
    field('Kurzbeschreibung (Deutsch)', summaryDe, 'full'),
    field('Kurzbeschreibung (Englisch)', summaryEn, 'full'),
    field('Sitzung (Deutsch)', meetingDe),
    field('Sitzung (Englisch)', meetingEn),
    field('Quelle (Deutsch)', sourceDe),
    field('Quelle (Englisch)', sourceEn),
    field('Reihenfolge', sortOrder),
    h('div', { className: 'field stack-field compact full' }, 'Schaubild (JSON, optional)', figure),
  ));
  form.append(
    h('p', { className: 'hint', text: 'Englische Felder sind optional und fallen auf Deutsch zurück. Das Schaubild nutzt dieselbe Struktur wie die mitgelieferten Diagramme.' }),
    h('label', { className: 'check-row' }, published, 'Im App-Katalog veröffentlichen'),
    error,
    h('div', { className: 'modal-actions' }, cancel, submit),
  );

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    error.textContent = '';
    let figureValue;
    const rawFigure = figure.value.trim();
    if (rawFigure) {
      try {
        figureValue = JSON.parse(rawFigure);
      } catch (parseError) {
        error.textContent = 'Schaubild-JSON ungültig: ' + parseError.message;
        return;
      }
    }
    const body = {
      moduleId: moduleSelect.value,
      titleDe: titleDe.value,
      titleEn: titleEn.value,
      summaryDe: summaryDe.value,
      summaryEn: summaryEn.value,
      meetingDe: meetingDe.value,
      meetingEn: meetingEn.value,
      sourceDe: sourceDe.value,
      sourceEn: sourceEn.value,
      figure: rawFigure ? figureValue : null,
      sortOrder: sortOrder.value === '' ? undefined : Number(sortOrder.value),
      published: published.checked,
    };
    submit.disabled = true;
    try {
      await api(topic ? '/v1/admin/quiz/topics/' + encodeURIComponent(topic.id) : '/v1/admin/quiz/topics', {
        method: 'POST',
        body,
      });
      toast(topic ? 'Thema gespeichert.' : 'Thema angelegt.', 'ok');
      closeDialog(dialog);
      await refresh.current();
    } catch (saveError) {
      error.textContent = errorText(saveError);
    } finally {
      submit.disabled = false;
    }
  });

  dialog.showModal();
  setTimeout(() => titleDe.focus(), 40);
}

async function openTopicById(topicId, modules) {
  try {
    const { topic } = await api('/v1/admin/quiz/topics/' + encodeURIComponent(topicId));
    openTopicEditor(topic, modules);
  } catch (error) {
    toast(errorText(error), 'error');
  }
}

function openModuleEditor(module) {
  const { dialog, form, error } = dialogShell('Modul bearbeiten', 'Die Moduldaten erscheinen im Quiz-Hub und auf der Modulseite.');
  const titleDe = h('input', { type: 'text', required: true, value: module.title.de, maxlength: '200', autocomplete: 'off' });
  const titleEn = h('input', { type: 'text', value: module.title.en, maxlength: '200', autocomplete: 'off' });
  const subtitleDe = h('textarea', { rows: '2', required: true, maxlength: '2000', value: module.subtitle?.de ?? '' });
  const subtitleEn = h('textarea', { rows: '2', maxlength: '2000', value: module.subtitle?.en ?? '' });
  const semester = h('input', { type: 'number', min: '1', max: '20', value: String(module.semester || 1) });
  const lecturer = h('input', { type: 'text', value: module.lecturer ?? '', maxlength: '200', autocomplete: 'off' });
  const email = h('input', { type: 'email', value: module.email ?? '', maxlength: '200', autocomplete: 'off' });
  const published = h('input', { type: 'checkbox', class: 'checkbox' });
  published.checked = module.published;
  const submit = h('button', { className: 'btn', type: 'submit' }, 'Speichern');
  const cancel = h('button', { className: 'btn secondary', type: 'button', onClick: () => closeDialog(dialog) }, 'Abbrechen');

  form.append(
    h('div', { className: 'form-grid' },
      field('Titel (Deutsch)', titleDe),
      field('Titel (Englisch)', titleEn),
      field('Untertitel (Deutsch)', subtitleDe, 'full'),
      field('Untertitel (Englisch)', subtitleEn, 'full'),
      field('Semester', semester),
      field('Dozent', lecturer),
      field('E-Mail', email),
    ),
    h('label', { className: 'check-row' }, published, 'Im App-Katalog veröffentlichen'),
    error,
    h('div', { className: 'modal-actions' }, cancel, submit),
  );
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    error.textContent = '';
    submit.disabled = true;
    try {
      await api('/v1/admin/quiz/modules/' + encodeURIComponent(module.id), {
        method: 'POST',
        body: {
          titleDe: titleDe.value,
          titleEn: titleEn.value,
          subtitleDe: subtitleDe.value,
          subtitleEn: subtitleEn.value,
          semester: Number(semester.value) || 1,
          lecturer: lecturer.value,
          email: email.value,
          published: published.checked,
        },
      });
      toast('Modul gespeichert.', 'ok');
      closeDialog(dialog);
      await refresh.current();
    } catch (saveError) {
      error.textContent = errorText(saveError);
    } finally {
      submit.disabled = false;
    }
  });
  dialog.showModal();
}

function openQuestionEditor(topicId, question) {
  const { dialog, form, error } = dialogShell(
    question ? 'Frage bearbeiten' : 'Frage anlegen',
    'Der JSON-Teil enthält die antwortspezifischen Felder. Eine Vorlage hilft beim Einstieg.',
  );
  const id = h('input', { type: 'text', value: question?.id ?? '', placeholder: 'optional, sonst automatisch', maxlength: '120', autocomplete: 'off' });
  if (question) id.readOnly = true;
  const kind = h('select', null, ...Object.entries(KIND_LABELS).map(([value, label]) =>
    h('option', { value, text: label, selected: question?.kind === value })));
  const difficulty = h('select', null,
    h('option', { value: '1', text: 'Leicht', selected: (question?.difficulty ?? 2) === 1 }),
    h('option', { value: '2', text: 'Mittel', selected: (question?.difficulty ?? 2) === 2 }),
    h('option', { value: '3', text: 'Schwer', selected: (question?.difficulty ?? 2) === 3 }),
  );
  const promptDe = h('textarea', { rows: '2', required: true, maxlength: '2000', value: question?.prompt?.de ?? '' });
  const promptEn = h('textarea', { rows: '2', maxlength: '2000', value: question?.prompt?.en ?? '' });
  const hintDe = h('input', { type: 'text', value: question?.hint?.de ?? '', maxlength: '2000', autocomplete: 'off' });
  const hintEn = h('input', { type: 'text', value: question?.hint?.en ?? '', maxlength: '2000', autocomplete: 'off' });
  const explanationDe = h('textarea', { rows: '2', maxlength: '4000', value: question?.explanation?.de ?? '' });
  const explanationEn = h('textarea', { rows: '2', maxlength: '4000', value: question?.explanation?.en ?? '' });
  const payload = h('textarea', { rows: '14', className: 'mono', spellcheck: 'false', value: question?.payloadJson ?? JSON.stringify(KIND_TEMPLATES[kind.value], null, 2) });
  const sortOrder = h('input', { type: 'number', value: question?.sortOrder ?? '', placeholder: 'automatisch' });
  const hint = h('p', { className: 'hint', text: PAYLOAD_HINTS[kind.value] });
  const template = h('button', { className: 'btn secondary small', type: 'button', onClick: () => {
    payload.value = JSON.stringify(KIND_TEMPLATES[kind.value], null, 2);
    hint.textContent = PAYLOAD_HINTS[kind.value];
  } }, icon('refresh'), 'Vorlage einsetzen');
  kind.addEventListener('change', () => {
    hint.textContent = PAYLOAD_HINTS[kind.value];
    if (!question) payload.value = JSON.stringify(KIND_TEMPLATES[kind.value], null, 2);
  });
  const published = h('input', { type: 'checkbox', class: 'checkbox' });
  published.checked = question ? question.published : true;
  const submit = h('button', { className: 'btn', type: 'submit' }, question ? 'Speichern' : 'Frage anlegen');
  const cancel = h('button', { className: 'btn secondary', type: 'button', onClick: () => closeDialog(dialog) }, 'Abbrechen');

  form.append(
    h('div', { className: 'form-grid' },
      field('ID', id),
      field('Typ', kind),
      field('Schwierigkeit', difficulty),
      field('Reihenfolge', sortOrder),
      h('div', { className: 'field stack-field compact' }, 'Status', h('label', { className: 'check-row' }, published, 'veröffentlicht')),
      field('Frage (Deutsch)', promptDe, 'full'),
      field('Frage (Englisch)', promptEn, 'full'),
      field('Tipp (Deutsch)', hintDe),
      field('Tipp (Englisch)', hintEn),
      field('Erklärung (Deutsch)', explanationDe, 'full'),
      field('Erklärung (Englisch)', explanationEn, 'full'),
      h('div', { className: 'field stack-field compact full' },
        h('div', { className: 'row tight' }, h('span', { text: 'Antwort-JSON' }), template),
        payload,
      ),
    ),
    hint,
    error,
    h('div', { className: 'modal-actions' }, cancel, submit),
  );

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    error.textContent = '';
    let parsed;
    try {
      parsed = JSON.parse(payload.value);
    } catch (parseError) {
      error.textContent = 'JSON ungültig: ' + parseError.message;
      return;
    }
    submit.disabled = true;
    try {
      const body = {
        topicId,
        id: id.value.trim() || undefined,
        kind: kind.value,
        difficulty: Number(difficulty.value) || 2,
        promptDe: promptDe.value,
        promptEn: promptEn.value,
        hintDe: hintDe.value,
        hintEn: hintEn.value,
        explanationDe: explanationDe.value,
        explanationEn: explanationEn.value,
        payload: parsed,
        sortOrder: sortOrder.value === '' ? undefined : Number(sortOrder.value),
        published: published.checked,
      };
      await api(question ? '/v1/admin/quiz/questions/' + encodeURIComponent(question.id) : '/v1/admin/quiz/questions', {
        method: 'POST',
        body,
      });
      toast(question ? 'Frage gespeichert.' : 'Frage angelegt.', 'ok');
      closeDialog(dialog);
      await refresh.current();
    } catch (saveError) {
      error.textContent = errorText(saveError);
    } finally {
      submit.disabled = false;
    }
  });
  dialog.showModal();
  setTimeout(() => promptDe.focus(), 40);
}

/* --------------------------------------------------------------- attempts -- */

async function renderAttemptsPage(route) {
  setPage('Quiz-Antworten', 'Jede geprüfte Antwort aller Nutzer');
  const view = $('view');
  view.replaceChildren(loading('Antworten werden geladen …'));
  paramsFromRoute(route, state.quiz.attempts);
  try {
    const [data, topics] = await Promise.all([
      api('/v1/admin/quiz/attempts?' + attemptsQuery()),
      api('/v1/admin/quiz/topics?limit=200'),
    ]);
    renderAttemptsShell(data, topics.items || []);
  } catch (error) {
    view.replaceChildren(emptyState('alert', 'Antworten konnten nicht geladen werden', errorText(error)));
    throw error;
  }
}

function attemptsQuery() {
  const view = state.quiz.attempts;
  const params = new URLSearchParams();
  params.set('limit', '50');
  params.set('offset', String(view.offset));
  if (view.query) params.set('query', view.query);
  if (view.topicId) params.set('topicId', view.topicId);
  if (view.correct) params.set('correct', view.correct);
  return params.toString();
}

function renderAttemptsShell(data, topics) {
  const view = $('view');
  const search = h('input', { type: 'search', value: state.quiz.attempts.query, placeholder: 'Nutzer, Konto, Frage oder Antwort', autocomplete: 'off' });
  const topicSelect = h('select', null,
    h('option', { value: '', text: 'Alle Themen', selected: !state.quiz.attempts.topicId }),
    ...topics.map((topic) => h('option', { value: topic.id, text: topic.title.de, selected: topic.id === state.quiz.attempts.topicId })),
  );
  const resultSelect = h('select', null,
    h('option', { value: '', text: 'Alle Ergebnisse', selected: !state.quiz.attempts.correct }),
    h('option', { value: '1', text: 'Nur richtig', selected: state.quiz.attempts.correct === '1' }),
    h('option', { value: '0', text: 'Nur falsch', selected: state.quiz.attempts.correct === '0' }),
  );
  const reload = () => {
    state.quiz.attempts.query = search.value.trim();
    state.quiz.attempts.topicId = topicSelect.value;
    state.quiz.attempts.correct = resultSelect.value;
    state.quiz.attempts.offset = 0;
    history.replaceState(null, '', attemptsHash());
    refresh.current();
  };
  let timer = null;
  search.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(reload, 280); });
  search.addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); clearTimeout(timer); reload(); } });
  topicSelect.addEventListener('change', reload);
  resultSelect.addEventListener('change', reload);

  const csvHref = '/v1/admin/quiz/attempts/export.csv?' + attemptsQuery();
  const rows = data.items?.length
    ? data.items.map((attempt) => h('tr', null,
        h('td', { style: { whiteSpace: 'nowrap' } }, h('span', { className: 'tiny', text: todayLabel(attempt.answeredAt) })),
        h('td', null,
          h('strong', { text: attempt.name || attempt.account || 'Unbekannt' }),
          h('div', { className: 'hint', text: attempt.account || attempt.userId || '–' }),
        ),
        h('td', null,
          h('div', { text: truncate(attempt.topicTitle.de, 40) }),
          h('div', { className: 'hint', text: attempt.kind }),
        ),
        h('td', { style: { maxWidth: '360px', whiteSpace: 'pre-wrap' } }, truncate(attempt.prompt.de, 160)),
        h('td', { style: { maxWidth: '300px', whiteSpace: 'pre-wrap' } }, attempt.answerText || JSON.stringify(attempt.answer)),
        h('td', null, attempt.correct ? badge('richtig', 'ok') : badge('falsch', 'danger')),
        h('td', null, h('button', { className: 'btn secondary small', type: 'button', onClick: () => openAttempt(attempt) }, icon('eye'), 'Details')),
      ))
    : [h('tr', null, h('td', { colspan: '7' }, emptyState('inbox', 'Keine Antworten gefunden', 'Ändere den Filter oder warte auf die nächste Synchronisierung.')))];

  view.replaceChildren(h('div', { className: 'view-stack' },
    h('div', { className: 'row tight' },
      h('a', { className: 'btn secondary small', href: '#/quiz' }, icon('chevron-left'), 'Katalog'),
      h('a', { className: 'btn secondary small', href: '#/quiz/sessions' }, icon('activity'), 'Runden'),
    ),
    h('div', { className: 'kpi-grid' },
      h('div', { className: 'kpi' }, h('div', { className: 'value', text: number(data.stats?.total || 0) }), h('div', { className: 'label', text: 'Antworten' }), h('div', { className: 'sub', text: 'im Filter' })),
      h('div', { className: 'kpi green' }, h('div', { className: 'value', text: (data.stats?.accuracy || 0) + '%' }), h('div', { className: 'label', text: 'Trefferquote' }), h('div', { className: 'sub', text: `${number(data.stats?.correct || 0)} richtig` })),
      h('div', { className: 'kpi amber' }, h('div', { className: 'value', text: number(data.stats?.users || 0) }), h('div', { className: 'label', text: 'Nutzer' }), h('div', { className: 'sub', text: 'mit Antworten' })),
      h('div', { className: 'kpi cyan' }, h('div', { className: 'value', text: data.stats?.lastAt ? relative(data.stats.lastAt) : '–' }), h('div', { className: 'label', text: 'Zuletzt' }), h('div', { className: 'sub', text: 'geprüfte Antwort' })),
    ),
    h('section', { className: 'card toolbar' },
      h('label', { className: 'field grow' }, 'Suche', h('div', { className: 'search-field' }, icon('search'), search)),
      h('label', { className: 'field' }, 'Thema', topicSelect),
      h('label', { className: 'field' }, 'Ergebnis', resultSelect),
      h('a', { className: 'btn secondary', href: csvHref }, icon('download'), 'CSV'),
    ),
    h('section', { className: 'card table-card' },
      h('div', { className: 'table-wrap' }, h('table', { className: 'data' },
        h('caption', { className: 'sr-only' }, 'Quiz-Antworten'),
        h('thead', null, h('tr', null,
          h('th', null, 'Zeit'),
          h('th', null, 'Nutzer'),
          h('th', null, 'Thema'),
          h('th', null, 'Frage'),
          h('th', null, 'Antwort'),
          h('th', null, 'Ergebnis'),
          h('th', null, ''),
        )),
        h('tbody', null, ...rows),
      )),
      pager(null, data.total, 50, state.quiz.attempts.offset,
        () => { state.quiz.attempts.offset = Math.max(0, state.quiz.attempts.offset - 50); history.replaceState(null, '', attemptsHash()); refresh.current(); },
        () => { state.quiz.attempts.offset += 50; history.replaceState(null, '', attemptsHash()); refresh.current(); }),
    ),
  ));
}

function openAttempt(attempt) {
  const { dialog, form } = dialogShell('Antwort im Detail', `${attempt.name || attempt.account || 'Unbekannt'} · ${todayLabel(attempt.answeredAt)}`);
  const raw = JSON.stringify(attempt, null, 2);
  form.append(
    h('div', { className: 'detail-grid' },
      h('div', { className: 'field-box' }, h('div', { className: 'k', text: 'Thema' }), h('div', { className: 'v', text: attempt.topicTitle.de })),
      h('div', { className: 'field-box' }, h('div', { className: 'k', text: 'Frage' }), h('div', { className: 'v', text: attempt.questionId })),
      h('div', { className: 'field-box' }, h('div', { className: 'k', text: 'Ergebnis' }), h('div', { className: 'v', text: attempt.correct ? 'richtig' : 'falsch' })),
    ),
    h('p', { className: 'hint', text: attempt.prompt.de }),
    h('p', { className: 'hint', text: 'Antwort: ' + (attempt.answerText || JSON.stringify(attempt.answer)) }),
    h('pre', { className: 'auth-code', style: { maxHeight: '42vh', overflow: 'auto' }, text: raw }),
    h('div', { className: 'modal-actions' },
      h('button', { className: 'btn secondary', type: 'button', onClick: () => closeDialog(dialog) }, 'Schließen'),
    ),
  );
  dialog.showModal();
}

/* --------------------------------------------------------------- sessions -- */

async function renderSessionsPage(route) {
  setPage('Quiz-Runden', 'Abgeschlossene Runden mit Score und Dauer');
  const view = $('view');
  view.replaceChildren(loading('Runden werden geladen …'));
  paramsFromRoute(route, state.quiz.sessions);
  try {
    const [data, topics] = await Promise.all([
      api('/v1/admin/quiz/sessions?' + sessionsQuery()),
      api('/v1/admin/quiz/topics?limit=200'),
    ]);
    renderSessionsShell(data, topics.items || []);
  } catch (error) {
    view.replaceChildren(emptyState('alert', 'Runden konnten nicht geladen werden', errorText(error)));
    throw error;
  }
}

function sessionsQuery() {
  const view = state.quiz.sessions;
  const params = new URLSearchParams();
  params.set('limit', '50');
  params.set('offset', String(view.offset));
  if (view.query) params.set('query', view.query);
  if (view.topicId) params.set('topicId', view.topicId);
  return params.toString();
}

function renderSessionsShell(data, topics) {
  const view = $('view');
  const search = h('input', { type: 'search', value: state.quiz.sessions.query, placeholder: 'Nutzer, Konto oder Thema', autocomplete: 'off' });
  const topicSelect = h('select', null,
    h('option', { value: '', text: 'Alle Themen', selected: !state.quiz.sessions.topicId }),
    ...topics.map((topic) => h('option', { value: topic.id, text: topic.title.de, selected: topic.id === state.quiz.sessions.topicId })),
  );
  const reload = () => {
    state.quiz.sessions.query = search.value.trim();
    state.quiz.sessions.topicId = topicSelect.value;
    state.quiz.sessions.offset = 0;
    history.replaceState(null, '', sessionsHash());
    refresh.current();
  };
  let timer = null;
  search.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(reload, 280); });
  search.addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); clearTimeout(timer); reload(); } });
  topicSelect.addEventListener('change', reload);

  const rows = data.items?.length
    ? data.items.map((session) => h('tr', null,
        h('td', { style: { whiteSpace: 'nowrap' } }, h('span', { className: 'tiny', text: todayLabel(session.finishedAt) })),
        h('td', null,
          h('strong', { text: session.name || session.account || 'Unbekannt' }),
          h('div', { className: 'hint', text: session.account || session.userId || '–' }),
        ),
        h('td', null, truncate(session.topicTitle.de, 60)),
        h('td', null, badge(session.mode, 'blue')),
        h('td', null, h('strong', { text: session.correct + ' / ' + session.total }), h('span', { className: 'hint', text: ` · ${session.accuracy}%` })),
        h('td', null, session.durationSeconds ? Math.floor(session.durationSeconds / 60) + ':' + String(session.durationSeconds % 60).padStart(2, '0') : '–'),
      ))
    : [h('tr', null, h('td', { colspan: '6' }, emptyState('activity', 'Keine Runden gefunden', 'Abgeschlossene Runden erscheinen nach der nächsten Synchronisierung.')))];

  view.replaceChildren(h('div', { className: 'view-stack' },
    h('div', { className: 'row tight' },
      h('a', { className: 'btn secondary small', href: '#/quiz' }, icon('chevron-left'), 'Katalog'),
      h('a', { className: 'btn secondary small', href: '#/quiz/attempts' }, icon('list'), 'Antworten'),
    ),
    h('section', { className: 'card toolbar' },
      h('label', { className: 'field grow' }, 'Suche', h('div', { className: 'search-field' }, icon('search'), search)),
      h('label', { className: 'field' }, 'Thema', topicSelect),
    ),
    h('section', { className: 'card table-card' },
      h('div', { className: 'table-wrap' }, h('table', { className: 'data' },
        h('thead', null, h('tr', null,
          h('th', null, 'Zeit'),
          h('th', null, 'Nutzer'),
          h('th', null, 'Thema'),
          h('th', null, 'Modus'),
          h('th', null, 'Score'),
          h('th', null, 'Dauer'),
        )),
        h('tbody', null, ...rows),
      )),
      pager(null, data.total, 50, state.quiz.sessions.offset,
        () => { state.quiz.sessions.offset = Math.max(0, state.quiz.sessions.offset - 50); history.replaceState(null, '', sessionsHash()); refresh.current(); },
        () => { state.quiz.sessions.offset += 50; history.replaceState(null, '', sessionsHash()); refresh.current(); }),
    ),
  ));
}
