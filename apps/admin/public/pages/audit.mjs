/** Operator audit log. */

import { api, errorText } from '../assets/api.mjs';
import { setPage } from '../assets/auth-ui.mjs';
import { AUDIT_LABELS, DANGEROUS_ACTIONS } from '../assets/constants.mjs';
import { $, h } from '../assets/dom.mjs';
import { date, detailText, number, relative } from '../assets/format.mjs';
import { icon } from '../assets/icons.mjs';
import { state } from '../assets/runtime.mjs';
import { badge, emptyState, loading, skeletonRows, toast } from '../assets/ui.mjs';

function auditHash() {
  const params = new URLSearchParams();
  if (state.audit.query) params.set('query', state.audit.query);
  if (state.audit.action) params.set('action', state.audit.action);
  if (state.audit.userId) params.set('userId', state.audit.userId);
  if (state.audit.offset) params.set('offset', String(state.audit.offset));
  const text = params.toString();
  return '#/audit' + (text ? '?' + text : '');
}

export async function renderAuditPage(route) {
  setPage('Aktivität', 'Jede Operator-Aktion, nachvollziehbar protokolliert');
  const params = route.params;
  state.audit.query = params.get('query') || '';
  state.audit.action = params.get('action') || '';
  state.audit.userId = params.get('userId') || '';
  state.audit.offset = Math.max(0, Number(params.get('offset')) || 0);
  const view = $('view');
  view.replaceChildren(loading('Aktivitätsprotokoll wird geladen …'));
  const data = await api('/v1/admin/audit?limit=50&offset=' + state.audit.offset + '&query=' + encodeURIComponent(state.audit.query) + '&action=' + encodeURIComponent(state.audit.action) + '&userId=' + encodeURIComponent(state.audit.userId));
  state.audit.list = data.entries;
  state.audit.total = data.total;
  state.audit.actions = data.actions || [];
  renderAuditShell(data);
}

function renderAuditShell(data) {
  const view = $('view');
  const search = h('input', { type: 'search', value: state.audit.query, placeholder: 'Aktion, Konto, ID oder Detail', autocomplete: 'off' });
  const actionSelect = h('select', null,
    h('option', { value: '', selected: !state.audit.action, text: 'Alle Aktionen' }),
    ...state.audit.actions.map((item) => h('option', { value: item.action, selected: state.audit.action === item.action, text: (AUDIT_LABELS[item.action] || item.action) + ' (' + item.count + ')' })),
  );
  const reload = () => {
    state.audit.query = search.value.trim();
    state.audit.action = actionSelect.value;
    state.audit.offset = 0;
    history.replaceState(null, '', auditHash());
    loadAudit();
  };
  let timer = null;
  search.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(reload, 280); });
  search.addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); clearTimeout(timer); reload(); } });
  actionSelect.addEventListener('change', reload);
  const userChip = state.audit.userId
    ? h('span', { className: 'row tight' },
        h('span', { className: 'badge blue', text: 'Gefiltert nach Konto' }),
        h('a', { className: 'btn ghost small', href: '#/audit' }, 'Filter entfernen'),
      )
    : null;
  const tbody = h('tbody', { id: 'audit-body' });
  const pageInfo = h('p', { id: 'audit-page-info', className: 'hint', text: 'Lade …' });
  const pager = h('div', { className: 'pager' },
    pageInfo,
    h('div', { className: 'row tight' },
      h('button', { className: 'btn secondary small', type: 'button', id: 'audit-prev', onClick: () => { state.audit.offset = Math.max(0, state.audit.offset - 50); history.replaceState(null, '', auditHash()); loadAudit(); } }, icon('chevron-left'), 'Zurück'),
      h('button', { className: 'btn secondary small', type: 'button', id: 'audit-next', onClick: () => { state.audit.offset += 50; history.replaceState(null, '', auditHash()); loadAudit(); } }, 'Weiter', icon('chevron-right')),
    ),
  );
  view.replaceChildren(
    h('div', { className: 'view-stack' },
      h('section', { className: 'card toolbar' },
        h('label', { className: 'field grow' }, 'Suche', h('div', { className: 'search-field' }, icon('search'), search)),
        h('label', { className: 'field grow' }, 'Aktion', actionSelect),
        userChip,
      ),
      h('section', { className: 'card table-card' },
        h('div', { className: 'table-wrap' }, h('table', { className: 'data' },
          h('caption', { className: 'sr-only' }, 'Audit-Protokoll'),
          h('thead', null, h('tr', null, h('th', null, 'Zeit'), h('th', null, 'Aktion'), h('th', null, 'Konto'), h('th', null, 'Details'))),
          tbody,
        )),
        pager,
      ),
    ),
  );
  renderAuditRows(data);
}

function renderAuditRows(data) {
  const tbody = $('audit-body');
  if (!tbody) return;
  tbody.replaceChildren();
  if (!data.entries.length) {
    tbody.append(h('tr', null, h('td', { colspan: '4' }, emptyState('activity', 'Keine Einträge', 'Für diesen Filter wurden keine Operator-Aktionen gefunden.'))));
  }
  for (const entry of data.entries) {
    const target = entry.userId
      ? h('a', { href: '#/users/' + encodeURIComponent(entry.userId) + '/overview' }, h('strong', { text: entry.account || entry.userId }), h('div', { className: 'hint mono', text: entry.userId }))
      : h('span', { className: 'muted', text: entry.account || '—' });
    tbody.append(h('tr', null,
      h('td', { style: { whiteSpace: 'nowrap' } }, h('strong', { text: date(entry.createdAt) }), h('div', { className: 'hint', text: relative(entry.createdAt) })),
      h('td', null, h('div', { className: 'row tight' },
        h('span', { className: 'timeline-dot ' + (DANGEROUS_ACTIONS.has(entry.action) ? 'danger' : ''), style: { margin: '0', width: '7px', height: '7px' } }),
        badge(AUDIT_LABELS[entry.action] || entry.action, DANGEROUS_ACTIONS.has(entry.action) ? 'danger' : 'blue'),
      ), h('div', { className: 'hint mono', text: entry.action, style: { marginTop: '4px' } })),
      h('td', null, target),
      h('td', { style: { maxWidth: '420px' } }, h('span', { className: 'tiny', text: detailText(entry.detail) || '—' })),
    ));
  }
  const from = data.total === 0 ? 0 : data.offset + 1;
  const to = Math.min(data.offset + 50, data.total);
  const info = $('audit-page-info');
  if (info) info.textContent = from + '–' + to + ' von ' + number(data.total);
  const prev = $('audit-prev');
  const next = $('audit-next');
  if (prev) prev.disabled = data.offset <= 0;
  if (next) next.disabled = data.offset + 50 >= data.total;
}

async function loadAudit() {
  const tbody = $('audit-body');
  if (!tbody) return;
  tbody.replaceChildren(...skeletonRows(4, 6));
  try {
    const data = await api('/v1/admin/audit?limit=50&offset=' + state.audit.offset + '&query=' + encodeURIComponent(state.audit.query) + '&action=' + encodeURIComponent(state.audit.action) + '&userId=' + encodeURIComponent(state.audit.userId));
    state.audit.list = data.entries;
    state.audit.total = data.total;
    state.audit.actions = data.actions || [];
    renderAuditRows(data);
  } catch (error) { if (error.code !== 'unauthorized') toast(errorText(error), 'error'); }
}

