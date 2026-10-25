/**
 * Every checked answer across all accounts, with filters, CSV, and a raw
 * detail dialog.
 */

import { api, errorText } from '../../assets/api.mjs';
import { setPage } from '../../assets/auth-ui.mjs';
import { $, h } from '../../assets/dom.mjs';
import { number, relative } from '../../assets/format.mjs';
import { icon } from '../../assets/icons.mjs';
import { refresh, state } from '../../assets/runtime.mjs';
import { badge, emptyState, loading } from '../../assets/ui.mjs';
import { attemptsHash, closeDialog, dialogShell, pager, paramsFromRoute, todayLabel, truncate } from './shared.mjs';

export async function renderAttemptsPage(route) {
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

