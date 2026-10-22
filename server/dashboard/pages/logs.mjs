/** Persisted diagnostics for every server-side service. */

import { api, errorText } from '../assets/api.mjs';
import { setPage } from '../assets/auth-ui.mjs';
import { LOG_LEVELS, LOG_LEVEL_NAMES, LOG_LEVEL_TONES, SERVICE_NAMES } from '../assets/constants.mjs';
import { $, h } from '../assets/dom.mjs';
import { date, detailText, number, relative } from '../assets/format.mjs';
import { icon } from '../assets/icons.mjs';
import { parseHash } from '../assets/routing.mjs';
import { state } from '../assets/runtime.mjs';
import { badge, confirmAction, emptyState, loading, skeletonRows, toast } from '../assets/ui.mjs';

const PAGE_SIZE = 100;
const AUTO_REFRESH_MS = 5000;

const SERVICE_TONES = {
  assistant: 'ok',
  campus: 'blue',
  ilias: 'purple',
  mail: 'info',
  oidc: 'purple',
  sync: 'warn',
  auth: 'info',
  admin: 'blue',
};

let autoTimer = null;

function stopAutoRefresh() {
  if (!autoTimer) return;
  clearInterval(autoTimer);
  autoTimer = null;
}

export function stopLogsAutoRefresh() {
  stopAutoRefresh();
}

function startAutoRefresh() {
  stopAutoRefresh();
  autoTimer = setInterval(() => {
    if (!$('logs-body')) {
      stopAutoRefresh();
      return;
    }
    loadLogs({ silent: true });
  }, AUTO_REFRESH_MS);
}

function logsHash() {
  const params = new URLSearchParams();
  if (state.logs.query) params.set('query', state.logs.query);
  if (state.logs.service) params.set('service', state.logs.service);
  if (state.logs.level) params.set('level', state.logs.level);
  if (state.logs.offset) params.set('offset', String(state.logs.offset));
  const text = params.toString();
  return '#/logs' + (text ? '?' + text : '');
}

function logsQuery(withOffset) {
  const params = new URLSearchParams();
  params.set('limit', String(PAGE_SIZE));
  if (withOffset) params.set('offset', String(state.logs.offset));
  if (state.logs.query) params.set('query', state.logs.query);
  if (state.logs.service) params.set('service', state.logs.service);
  if (state.logs.level) params.set('level', state.logs.level);
  return params.toString();
}

export async function renderLogsPage(route) {
  stopAutoRefresh();
  setPage('Logs', 'Diagnose aller Dienste, neueste Einträge zuerst');
  const params = route.params;
  const previousAuto = state.logs?.auto ?? false;
  const service = params.get('service') || '';
  const level = params.get('level') || '';
  state.logs = {
    query: params.get('query') || '',
    service: Object.prototype.hasOwnProperty.call(SERVICE_NAMES, service) ? service : '',
    level: LOG_LEVELS.includes(level) ? level : '',
    offset: Math.max(0, Number(params.get('offset')) || 0),
    limit: PAGE_SIZE,
    list: [],
    total: 0,
    services: [],
    levels: [],
    auto: previousAuto,
  };
  const view = $('view');
  view.replaceChildren(loading('Logs werden geladen …'));
  try {
    const data = await fetchLogs();
    state.logs.list = data.entries;
    state.logs.total = data.total;
    state.logs.services = data.services || [];
    state.logs.levels = data.levels || [];
    renderLogsShell(data);
    if (state.logs.auto) startAutoRefresh();
  } catch (error) {
    if (error.code === 'unauthorized') return;
    throw error;
  }
}

async function fetchLogs() {
  return api('/v1/admin/logs?' + logsQuery(true));
}

function serviceOptions(data) {
  const known = new Set([...Object.keys(SERVICE_NAMES), ...(data.services || []).map((item) => item.service)]);
  return [...known].map((id) => ({ id, label: SERVICE_NAMES[id] || id }));
}

function renderLogsShell(data) {
  const view = $('view');
  const search = h('input', {
    id: 'f-query',
    type: 'search',
    value: state.logs.query,
    placeholder: 'Meldung, Detail oder Dienst',
    autocomplete: 'off',
  });
  const serviceSelect = h('select', null,
    h('option', { value: '', selected: !state.logs.service, text: 'Alle Dienste' }),
    ...serviceOptions(data).map((item) => h('option', {
      value: item.id,
      selected: state.logs.service === item.id,
      text: item.label + countFor(data.services, item.id),
    })),
  );
  const levelSelect = h('select', null,
    h('option', { value: '', selected: !state.logs.level, text: 'Alle Stufen' }),
    ...LOG_LEVELS.map((id) => h('option', {
      value: id,
      selected: state.logs.level === id,
      text: LOG_LEVEL_NAMES[id] + countFor(data.levels, id, 'level'),
    })),
  );
  const reload = () => {
    state.logs.query = search.value.trim();
    state.logs.service = serviceSelect.value;
    state.logs.level = levelSelect.value;
    state.logs.offset = 0;
    history.replaceState(null, '', logsHash());
    loadLogs();
  };
  let timer = null;
  search.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(reload, 280); });
  search.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    clearTimeout(timer);
    reload();
  });
  serviceSelect.addEventListener('change', reload);
  levelSelect.addEventListener('change', reload);

  const autoToggle = h('input', {
    type: 'checkbox',
    className: 'checkbox',
    checked: state.logs.auto,
    onChange: () => {
      state.logs.auto = autoToggle.checked;
      if (state.logs.auto) startAutoRefresh();
      else stopAutoRefresh();
    },
  });

  view.replaceChildren(
    h('div', { className: 'view-stack' },
      h('div', { className: 'page-intro' },
        h('div', null,
          h('div', { className: 'eyebrow' }, 'Diagnose'),
          h('h2', { text: 'Logs' }),
          h('p', { text: 'Servermeldungen aus C@MPUS, ILIAS, UniMail, SIAM/OIDC, Sync, Anmeldung und Assistent. Neueste zuerst, höchstens 5.000 Einträge und 30 Tage.' }),
        ),
        h('div', { className: 'row' },
          h('a', { className: 'btn secondary', href: '#/audit' }, icon('activity'), 'Aktivität'),
          h('a', { className: 'btn secondary', href: '#/system' }, icon('server'), 'Systemzustand'),
        ),
      ),
      h('section', { className: 'card toolbar' },
        h('label', { className: 'field grow' }, 'Suche', h('div', { className: 'search-field' }, icon('search'), search)),
        h('label', { className: 'field grow' }, 'Dienst', serviceSelect),
        h('label', { className: 'field grow' }, 'Stufe', levelSelect),
        h('label', { className: 'check-row', style: { margin: '0', whiteSpace: 'nowrap' } }, autoToggle, 'Auto (5 s)'),
        h('button', { className: 'btn secondary small', type: 'button', onClick: () => loadLogs() }, icon('refresh'), 'Neu laden'),
        h('button', { className: 'btn danger-soft small', type: 'button', onClick: () => clearLogs() }, icon('trash'), 'Leeren'),
      ),
      h('section', { className: 'card table-card' },
        h('div', { className: 'table-wrap' }, h('table', { className: 'data log-table', style: { minWidth: '920px' } },
          h('caption', { className: 'sr-only' }, 'Service-Logs'),
          h('thead', null, h('tr', null,
            h('th', null, 'Zeit'),
            h('th', null, 'Dienst'),
            h('th', null, 'Stufe'),
            h('th', null, 'Meldung'),
            h('th', null, 'Details'),
          )),
          h('tbody', { id: 'logs-body' }),
        )),
        h('div', { className: 'pager' },
          h('p', { id: 'logs-page-info', className: 'hint', text: 'Lade …' }),
          h('div', { className: 'row tight' },
            h('button', { className: 'btn secondary small', type: 'button', id: 'logs-prev', onClick: () => { state.logs.offset = Math.max(0, state.logs.offset - PAGE_SIZE); history.replaceState(null, '', logsHash()); loadLogs(); } }, icon('chevron-left'), 'Zurück'),
            h('button', { className: 'btn secondary small', type: 'button', id: 'logs-next', onClick: () => { state.logs.offset += PAGE_SIZE; history.replaceState(null, '', logsHash()); loadLogs(); } }, 'Weiter', icon('chevron-right')),
          ),
        ),
      ),
    ),
  );
  renderLogRows(data);
}

function countFor(facets, value, key = 'service') {
  const match = (facets || []).find((item) => item[key] === value);
  return match ? ' (' + number(match.count) + ')' : '';
}

function renderLogRows(data) {
  const tbody = $('logs-body');
  if (!tbody) return;
  tbody.replaceChildren();
  if (!data.entries.length) {
    tbody.append(h('tr', null, h('td', { colspan: '5' }, emptyState('terminal', 'Keine Log-Einträge', 'Für diesen Filter wurden keine Servermeldungen gefunden.'))));
  }
  for (const entry of data.entries) {
    const userId = entry.userId
      ? h('a', { className: 'tiny mono', href: '#/users/' + encodeURIComponent(entry.userId) + '/overview', text: entry.userId })
      : null;
    const detail = entry.detail ? detailText(entry.detail) : '';
    tbody.append(h('tr', null,
      h('td', { style: { whiteSpace: 'nowrap', verticalAlign: 'top' } },
        h('strong', { text: date(entry.createdAt) }),
        h('div', { className: 'hint', text: relative(entry.createdAt) }),
      ),
      h('td', { style: { verticalAlign: 'top' } },
        badge(SERVICE_NAMES[entry.service] || entry.service, SERVICE_TONES[entry.service] || ''),
        h('div', { className: 'hint mono', text: entry.service }),
      ),
      h('td', { style: { verticalAlign: 'top' } }, badge(LOG_LEVEL_NAMES[entry.level] || entry.level, LOG_LEVEL_TONES[entry.level] || '')),
      h('td', { className: 'log-message-cell' }, h('div', { className: 'log-message', text: entry.message })),
      h('td', { className: 'log-detail-cell' }, userId, detail ? h('div', { className: 'log-detail', text: detail }) : null),
    ));
  }
  const from = data.total === 0 ? 0 : data.offset + 1;
  const to = Math.min(data.offset + PAGE_SIZE, data.total);
  const info = $('logs-page-info');
  if (info) {
    const warnings = data.levels.find((item) => item.level === 'warn')?.count ?? 0;
    const errors = data.levels.find((item) => item.level === 'error')?.count ?? 0;
    info.textContent = from + '–' + to + ' von ' + number(data.total) + ' · ' + number(warnings) + ' Warnungen · ' + number(errors) + ' Fehler';
  }
  const prev = $('logs-prev');
  const next = $('logs-next');
  if (prev) prev.disabled = data.offset <= 0;
  if (next) next.disabled = data.offset + PAGE_SIZE >= data.total;
}

async function loadLogs(options) {
  const opts = options || {};
  const tbody = $('logs-body');
  if (!tbody) return;
  if (!opts.silent) tbody.replaceChildren(...skeletonRows(5, 6));
  try {
    const data = await fetchLogs();
    if (!$('logs-body')) return;
    state.logs.list = data.entries;
    state.logs.total = data.total;
    state.logs.services = data.services || [];
    state.logs.levels = data.levels || [];
    renderLogRows(data);
  } catch (error) {
    if (error.code !== 'unauthorized') toast(errorText(error), 'error');
  }
}

async function clearLogs() {
  const scope = state.logs.service ? (SERVICE_NAMES[state.logs.service] || state.logs.service) : 'alle Dienste';
  const ok = await confirmAction({
    title: 'Logs löschen?',
    message: 'Alle gespeicherten Einträge für ' + scope + (state.logs.level ? ' auf Stufe ' + LOG_LEVEL_NAMES[state.logs.level] : '') + ' werden dauerhaft entfernt.',
    confirmLabel: 'Logs löschen',
  });
  if (!ok) return;
  try {
    const result = await api('/v1/admin/logs?' + logsQuery(false), { method: 'DELETE' });
    toast(number(result.removed) + ' Log-Einträge gelöscht.', 'ok');
    state.logs.offset = 0;
    history.replaceState(null, '', logsHash());
    await renderLogsPage(parseHash());
  } catch (error) {
    if (error.code !== 'unauthorized') toast(errorText(error), 'error');
  }
}
