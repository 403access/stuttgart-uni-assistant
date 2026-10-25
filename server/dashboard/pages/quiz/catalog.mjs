/**
 * Lernquiz overview: KPIs, the module table, and the searchable topic table.
 */

import { api, errorText } from '../../assets/api.mjs';
import { setPage } from '../../assets/auth-ui.mjs';
import { $, h } from '../../assets/dom.mjs';
import { number, relative } from '../../assets/format.mjs';
import { icon } from '../../assets/icons.mjs';
import { refresh, state } from '../../assets/runtime.mjs';
import { badge, emptyState, loading, sectionHead } from '../../assets/ui.mjs';
import { removeTopic, reseedCatalog } from './actions.mjs';
import { openModuleEditor, openTopicById, openTopicEditor } from './editors.mjs';
import { catalogHash, moduleOptions, pager, paramsFromRoute } from './shared.mjs';

export async function renderCatalogPage(route) {
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
