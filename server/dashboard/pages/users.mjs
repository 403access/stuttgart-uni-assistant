/** Account list, filters, selection, CSV export, and creation. */

import { api, errorText } from '../assets/api.mjs';
import { setPage } from '../assets/auth-ui.mjs';
import { PAGE_SIZES, PLATFORMS, SORTS } from '../assets/constants.mjs';
import { $, h } from '../assets/dom.mjs';
import { date, modeName, number, platformName, relative } from '../assets/format.mjs';
import { icon } from '../assets/icons.mjs';
import { filtersFromParams, replaceUsersUrl, usersHash } from '../assets/routing.mjs';
import { refresh, state } from '../assets/runtime.mjs';
import { avatar, badge, campusBadge, confirmAction, emptyState, skeletonRows, toast } from '../assets/ui.mjs';

/* -------------------------------------------------------------- users */
function userQueryParams() {
  const filters = state.users;
  const params = new URLSearchParams();
  if (filters.query) params.set('query', filters.query);
  if (filters.mode) params.set('mode', filters.mode);
  if (filters.platform) params.set('platform', filters.platform);
  if (filters.credential) params.set('credential', filters.credential);
  if (filters.activity) params.set('activity', filters.activity);
  if (filters.data) params.set('data', filters.data);
  params.set('sort', filters.sort);
  params.set('limit', String(filters.limit));
  params.set('offset', String(filters.offset));
  return params;
}

function filterSelect(id, value, options, label) {
  return h('label', { className: 'field' }, label, h('select', { id, onChange: () => applyUserFilters() },
    ...options.map(([key, text]) => h('option', { value: key, selected: String(value) === String(key), text })),
  ));
}

export async function renderUsersPage(route) {
  setPage('Nutzer', 'Konten suchen, filtern, prüfen und verwalten');
  const parsed = filtersFromParams(route.params);
  Object.assign(state.users, parsed, { selected: new Set() });
  state.lastUsersHash = usersHash();

  const view = $('view');
  const search = h('input', { id: 'f-query', type: 'search', placeholder: 'Kennung, Name, E-Mail oder Matrikelnummer', value: state.users.query, autocomplete: 'off' });
  const toolbar = h('section', { className: 'card toolbar', 'aria-label': 'Filter' },
    h('label', { className: 'field grow' }, 'Suche', h('div', { className: 'search-field' }, icon('search'), search)),
    filterSelect('f-mode', state.users.mode, [['', 'Alle Modi'], ['campus', 'C@MPUS'], ['oidc', 'SIAM'], ['demo', 'Demo'], ['local', 'Lokal']], 'Modus'),
    filterSelect('f-platform', state.users.platform, [['', 'Alle Plattformen'], ...PLATFORMS.map((id) => [id, platformName(id)])], 'Plattform'),
    filterSelect('f-credential', state.users.credential, [['', 'Alle'], ['active', 'Im Speicher aktiv'], ['env', '.env'], ['browser', 'Browser'], ['none', 'Kein Zugang']], 'C@MPUS-Zugang'),
    filterSelect('f-activity', state.users.activity, [['', 'Alle'], ['active', 'Aktive Sitzung'], ['inactive', 'Keine Sitzung'], ['never', 'Nie angemeldet']], 'Aktivität'),
    filterSelect('f-data', state.users.data, [['', 'Alle Daten'], ['portal', 'Portal-Knoten'], ['courses', 'Kurse'], ['events', 'Kalender'], ['calls', 'Portal-Aufrufe'], ['empty', 'Ohne Daten']], 'Datenbestand'),
    filterSelect('f-sort', state.users.sort, SORTS, 'Sortierung'),
    h('label', { className: 'field', style: { flex: '0 1 130px' } }, 'Pro Seite', h('select', { id: 'f-limit', onChange: () => applyUserFilters() },
      ...PAGE_SIZES.map((size) => h('option', { value: String(size), selected: state.users.limit === size, text: String(size) })),
    )),
    h('button', { className: 'btn secondary', type: 'button', onClick: () => resetUserFilters() }, icon('rotate-ccw'), 'Zurücksetzen'),
    h('button', { className: 'btn secondary', type: 'button', onClick: () => exportUsersCsv() }, icon('download'), 'CSV'),
    h('button', { className: 'btn', type: 'button', onClick: () => openCreateUser() }, icon('plus'), 'Konto anlegen'),
  );

  const bulkBar = h('div', { id: 'bulk-bar', className: 'card', hidden: true, style: { padding: '11px 14px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' } });
  const tbody = h('tbody', { id: 'users-body' });
  const pageInfo = h('p', { id: 'users-page-info', className: 'hint', text: 'Lade …' });
  const pager = h('div', { className: 'pager' },
    pageInfo,
    h('div', { className: 'row', id: 'users-pager-buttons' },
      h('button', { className: 'btn secondary small', type: 'button', id: 'users-first', 'aria-label': 'Erste Seite', title: 'Erste Seite', onClick: () => goUsersPage(0) }, icon('chevrons-left')),
      h('button', { className: 'btn secondary small', type: 'button', id: 'users-prev', onClick: () => goUsersPage(Math.max(0, state.users.offset - state.users.limit)) }, icon('chevron-left'), 'Zurück'),
      h('button', { className: 'btn secondary small', type: 'button', id: 'users-next', onClick: () => goUsersPage(state.users.offset + state.users.limit) }, 'Weiter', icon('chevron-right')),
      h('button', { className: 'btn secondary small', type: 'button', id: 'users-last', 'aria-label': 'Letzte Seite', title: 'Letzte Seite', onClick: () => goUsersPage(lastUsersOffset()) }, icon('chevrons-right')),
    ),
  );
  const table = h('section', { className: 'card table-card' },
    h('div', { className: 'table-wrap' },
      h('table', { className: 'data' },
        h('caption', { className: 'sr-only' }, 'Kontenliste'),
        h('thead', null, h('tr', null,
          h('th', { style: { width: '38px' } }, h('input', { type: 'checkbox', className: 'checkbox', id: 'users-select-all', 'aria-label': 'Alle Konten dieser Seite auswählen', onChange: (event) => toggleAllUsers(event.target.checked) })),
          h('th', null, 'Nutzer'),
          h('th', null, 'Modus'),
          h('th', null, 'Plattformen'),
          h('th', null, 'C@MPUS'),
          h('th', { className: 'num' }, 'Sitzungen'),
          h('th', null, 'Daten'),
          h('th', null, 'Zuletzt aktiv'),
          h('th', null, ''),
        )),
        tbody,
      ),
    ),
    pager,
  );

  view.replaceChildren(
    h('div', { className: 'view-stack' },
      toolbar,
      bulkBar,
      table,
    ),
  );

  search.addEventListener('input', () => {
    clearTimeout(state.searchTimer);
    state.searchTimer = setTimeout(() => {
      state.users.query = search.value.trim();
      state.users.offset = 0;
      replaceUsersUrl();
      loadUsers();
    }, 280);
  });
  search.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      clearTimeout(state.searchTimer);
      state.users.query = search.value.trim();
      state.users.offset = 0;
      replaceUsersUrl();
      loadUsers();
    }
  });
  await loadUsers();
}

function openCreateUser() {
  const dialog = $('create-user');
  $('create-form').reset();
  $('create-error').textContent = '';
  dialog.showModal();
  setTimeout(() => $('create-account').focus(), 40);
}

export async function submitCreateUser(event) {
  event.preventDefault();
  const account = $('create-account').value.trim();
  if (!account) {
    $('create-error').textContent = 'Die Kennung darf nicht leer sein.';
    $('create-account').focus();
    return;
  }
  const button = $('create-submit');
  button.disabled = true;
  $('create-error').textContent = '';
  try {
    const detail = await api('/v1/admin/users', {
      method: 'POST',
      body: {
        account,
        name: $('create-name').value,
        email: $('create-email').value,
        matriculation: $('create-matriculation').value,
        subject: $('create-subject').value,
        mode: $('create-mode').value,
      },
    });
    $('create-user').close();
    state.overview = null;
    toast('Konto „' + detail.user.account + '“ angelegt.', 'ok');
    location.hash = '#/users/' + encodeURIComponent(detail.user.id) + '/overview';
  } catch (error) {
    if (error.code !== 'unauthorized') $('create-error').textContent = errorText(error);
  } finally {
    button.disabled = false;
  }
}

function applyUserFilters() {          state.users.query = $('f-query').value.trim();
  state.users.mode = $('f-mode').value;
  state.users.platform = $('f-platform').value;
  state.users.credential = $('f-credential').value;
  state.users.activity = $('f-activity').value;
  state.users.data = $('f-data').value;
  state.users.sort = $('f-sort').value;
  state.users.limit = Number($('f-limit').value);
  state.users.offset = 0;
  state.users.selected.clear();
  replaceUsersUrl();
  loadUsers();
}

function resetUserFilters() {
  Object.assign(state.users, filtersFromParams(new URLSearchParams()), { selected: new Set() });
  state.users.limit = 25;
  replaceUsersUrl();
  refresh.current();
}

function lastUsersOffset() {
  const total = state.users.total;
  const limit = state.users.limit;
  if (total <= limit) return 0;
  return Math.floor((total - 1) / limit) * limit;
}

function goUsersPage(offset) {
  state.users.offset = Math.max(0, offset);
  replaceUsersUrl();
  loadUsers();
}

async function loadUsers() {
  const seq = ++state.usersSeq;
  const tbody = $('users-body');
  if (!tbody) return;
  tbody.replaceChildren(...skeletonRows(9, 6));
  try {
    const data = await api('/v1/admin/users?' + userQueryParams().toString());
    if (seq !== state.usersSeq) return;
    state.users.list = data.users;
    state.users.total = data.total;
    state.users.selected.clear();
    renderUserRows(data);
    const pageBadge = $('nav-users-count');
    if (pageBadge) { pageBadge.textContent = number(data.total); pageBadge.hidden = false; }
  } catch (error) {
    if (error.code === 'unauthorized') return;
    if (seq !== state.usersSeq) return;
    tbody.replaceChildren(h('tr', null, h('td', { colspan: '9' }, emptyState('alert', 'Konten konnten nicht geladen werden', errorText(error), h('button', { className: 'btn secondary', type: 'button', onClick: () => loadUsers() }, icon('refresh'), 'Erneut versuchen')))));
    toast(errorText(error), 'error');
  }
}

function renderUserRows(data) {
  const tbody = $('users-body');
  if (!tbody) return;
  tbody.replaceChildren();
  if (!data.users.length) {
    tbody.append(h('tr', null, h('td', { colspan: '9' }, emptyState('search', 'Keine Konten gefunden', 'Passe Suche oder Filter an, um wieder Ergebnisse zu sehen.', h('button', { className: 'btn secondary', type: 'button', onClick: () => resetUserFilters() }, icon('rotate-ccw'), 'Filter zurücksetzen')))));
  }
  for (const user of data.users) {
    const selected = state.users.selected.has(user.id);
    const checkbox = h('input', {
      type: 'checkbox', className: 'checkbox', checked: selected, 'aria-label': 'Konto ' + user.account + ' auswählen',
      onChange: (event) => {
        if (event.target.checked) state.users.selected.add(user.id);
        else state.users.selected.delete(user.id);
        event.target.closest('tr').classList.toggle('selected', event.target.checked);
        syncSelectionUi();
      },
    });
    const links = user.platforms || [];
    const chips = links.length
      ? h('div', { className: 'stack' }, ...links.slice(0, 5).map((link) => h('span', { className: 'chip', title: (link.status === 'connected' ? 'verbunden' : 'verknüpft') + (link.lastSyncAt ? ' · zuletzt ' + date(link.lastSyncAt) : '') },
          h('span', { className: 'dot', style: { width: '6px', height: '6px', borderRadius: '50%', background: link.status === 'connected' ? 'var(--ok)' : 'var(--muted-2)' } }),
          platformName(link.id),
        )))
      : h('span', { className: 'hint', text: 'keine' });
    const dataLine = h('div', { className: 'who-text', style: { gap: '2px' } },
      h('strong', { text: number(user.data.nodes) + ' Knoten' }),
      h('span', { text: number(user.data.courses) + ' Kurse · ' + number(user.data.events) + ' Termine' }),
    );
    tbody.append(h('tr', { className: selected ? 'selected' : '' },
      h('td', null, checkbox),
      h('td', null, h('a', { className: 'who', href: '#/users/' + encodeURIComponent(user.id) + '/overview', style: { color: 'inherit' } },
        avatar(user.name, user.account),
        h('span', { className: 'who-text' },
          h('strong', { text: user.name || user.account }),
          h('span', { text: user.account + (user.email ? ' · ' + user.email : '') }),
        ),
      )),
      h('td', null, badge(modeName(user.mode), user.mode === 'campus' ? 'blue' : '')),
      h('td', null, chips),
      h('td', null, campusBadge(user)),
      h('td', { className: 'num' }, user.activeSessions ? h('strong', { text: String(user.activeSessions) }) : h('span', { className: 'muted', text: '0' })),
      h('td', null, dataLine),
      h('td', null, h('div', { className: 'who-text' }, h('strong', { text: relative(user.lastLoginAt), style: { fontSize: '12.5px' } }), h('span', { text: user.lastLoginAt ? date(user.lastLoginAt) : 'nie angemeldet' }))),
      h('td', null, h('a', { className: 'btn secondary small', href: '#/users/' + encodeURIComponent(user.id) + '/overview' }, 'Details', icon('chevron-right'))),
    ));
  }
  const from = data.total === 0 ? 0 : data.offset + 1;
  const to = Math.min(data.offset + data.limit, data.total);
  const info = $('users-page-info');
  if (info) info.textContent = from + '–' + to + ' von ' + number(data.total);
  const page = data.limit ? Math.floor(data.offset / data.limit) + 1 : 1;
  const pages = Math.max(1, Math.ceil(data.total / data.limit));
  const pagerButtons = $('users-pager-buttons');
  if (pagerButtons) {
    const old = $('users-page-num');
    if (old) old.remove();
    pagerButtons.insertBefore(h('span', { className: 'page-num current', id: 'users-page-num', text: page + ' / ' + pages }), pagerButtons.children[2] || null);
  }
  const first = $('users-first'); const prev = $('users-prev'); const next = $('users-next'); const last = $('users-last');
  if (first) first.disabled = data.offset <= 0;
  if (prev) prev.disabled = data.offset <= 0;
  if (next) next.disabled = data.offset + data.limit >= data.total;
  if (last) last.disabled = data.offset + data.limit >= data.total;
  const selectAll = $('users-select-all');
  if (selectAll) {
    selectAll.checked = data.users.length > 0 && data.users.every((user) => state.users.selected.has(user.id));
    selectAll.indeterminate = state.users.selected.size > 0 && !selectAll.checked;
  }
  updateBulkBar();
}

function toggleAllUsers(checked) {
  if (checked) for (const user of state.users.list) state.users.selected.add(user.id);
  else state.users.selected.clear();
  for (const box of document.querySelectorAll('#users-body input[type="checkbox"]')) {
    box.checked = checked;
    box.closest('tr').classList.toggle('selected', checked);
  }
  syncSelectionUi();
}

function syncSelectionUi() {
  const selectAll = $('users-select-all');
  const list = state.users.list;
  if (selectAll) {
    selectAll.checked = list.length > 0 && list.every((user) => state.users.selected.has(user.id));
    selectAll.indeterminate = state.users.selected.size > 0 && !selectAll.checked;
  }
  updateBulkBar();
}

function clearUserSelection() {
  state.users.selected.clear();
  for (const box of document.querySelectorAll('#users-body input[type="checkbox"]')) {
    box.checked = false;
    box.closest('tr').classList.remove('selected');
  }
  syncSelectionUi();
}

function updateBulkBar() {
  const bar = $('bulk-bar');
  if (!bar) return;
  const count = state.users.selected.size;
  bar.hidden = count === 0;
  if (!count) { bar.replaceChildren(); return; }
  bar.replaceChildren(
    h('span', { className: 'badge blue', text: count + ' ausgewählt' }),
    h('span', { className: 'spacer' }),
    h('button', { className: 'btn secondary small', type: 'button', onClick: () => clearUserSelection() }, 'Auswahl aufheben'),
    h('button', { className: 'btn danger-soft small', type: 'button', onClick: () => bulkSessions() }, icon('monitor'), 'Sitzungen widerrufen'),
    h('button', { className: 'btn danger-soft small', type: 'button', onClick: () => bulkClearPortal() }, icon('database'), 'Portal-Daten löschen'),
  );
}

async function bulkSessions() {
  const ids = [...state.users.selected];
  if (!ids.length) return;
  const ok = await confirmAction({
    title: 'Sitzungen für ' + ids.length + ' Konten widerrufen?',
    message: 'Alle aktiven App-Sitzungen dieser Konten werden sofort ungültig. Die Konten und Daten bleiben erhalten.',
    confirmLabel: 'Sitzungen widerrufen',
  });
  if (!ok) return;
  let done = 0; let failed = 0;
  for (const id of ids) {
    try { await api('/v1/admin/users/' + encodeURIComponent(id) + '/sessions/revoke', { method: 'POST', body: {} }); done += 1; }
    catch { failed += 1; }
  }
  toast(done + ' Konten abgemeldet' + (failed ? ', ' + failed + ' fehlgeschlagen' : '') + '.', failed ? 'error' : 'ok');
  state.overview = null;
  await loadUsers();
}

async function bulkClearPortal() {
  const ids = [...state.users.selected];
  if (!ids.length) return;
  const ok = await confirmAction({
    title: 'Portal-Daten für ' + ids.length + ' Konten löschen?',
    message: 'Portal-Knoten, Kurse, Studiengangs-Snapshots, Kalendertermine und Aufrufprotokolle dieser Konten werden unwiderruflich gelöscht. Konten, Sitzungen und Plattformverknüpfungen bleiben erhalten.',
    confirmLabel: 'Portal-Daten löschen',
    requireText: 'LÖSCHEN',
  });
  if (!ok) return;
  let done = 0; let failed = 0;
  for (const id of ids) {
    try { await api('/v1/admin/users/' + encodeURIComponent(id) + '/portal/clear', { method: 'POST', body: {} }); done += 1; }
    catch { failed += 1; }
  }
  toast(done + ' Konten bereinigt' + (failed ? ', ' + failed + ' fehlgeschlagen' : '') + '.', failed ? 'error' : 'ok');
  state.overview = null;
  await loadUsers();
}

function csvCell(value) {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}

async function exportUsersCsv() {
  try {
    toast('CSV-Export wird erstellt …', 'info');
    const rows = [];
    let offset = 0;
    let total = Infinity;
    while (offset < total && offset < 4000) {
      const params = userQueryParams();
      params.set('limit', '200');
      params.set('offset', String(offset));
      const data = await api('/v1/admin/users?' + params.toString());
      total = data.total;
      rows.push(...data.users);
      offset += data.users.length;
      if (!data.users.length) break;
    }
    const header = ['Kennung', 'Name', 'E-Mail', 'Matrikelnummer', 'Modus', 'Plattformen', 'C@MPUS-Quelle', 'C@MPUS aktiv', 'Sitzungen', 'Portal-Knoten', 'Abgeschlossene Knoten', 'Kurse', 'Kalendertermine', 'Portal-Aufrufe', 'Erstellt', 'Letzte Anmeldung', 'Konto-ID'];
    const lines = [header.map(csvCell).join(';')];
    for (const user of rows) {
      lines.push([
        user.account, user.name || '', user.email || '', user.matriculation || '', modeName(user.mode),
        user.platforms.map((link) => platformName(link.id) + ':' + link.status).join(', '),
        user.campusSource || '', user.campusActive ? 'ja' : 'nein', user.activeSessions,
        user.data.nodes, user.data.completedNodes, user.data.courses, user.data.events, user.data.calls,
        date(user.createdAt), user.lastLoginAt ? date(user.lastLoginAt) : '', user.id,
      ].map(csvCell).join(';'));
    }
    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = h('a', { href: url, download: 'konten-' + new Date().toISOString().slice(0, 10) + '.csv' });
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast(rows.length + ' Konten exportiert' + (rows.length < total ? ' (Limit 4.000)' : '') + '.', 'ok');
  } catch (error) {
    if (error.code !== 'unauthorized') toast(errorText(error), 'error');
  }
}

