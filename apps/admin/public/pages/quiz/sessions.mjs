/**
 * Completed quiz rounds with score and duration.
 */

import { api, errorText } from '../../assets/api.mjs';
import { setPage } from '../../assets/auth-ui.mjs';
import { $, h } from '../../assets/dom.mjs';
import { icon } from '../../assets/icons.mjs';
import { refresh, state } from '../../assets/runtime.mjs';
import { badge, emptyState, loading } from '../../assets/ui.mjs';
import { pager, paramsFromRoute, sessionsHash, todayLabel, truncate } from './shared.mjs';

export async function renderSessionsPage(route) {
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
