/** Browser device links created by the QR sign-in flow. */

import { api, errorText } from '../assets/api.mjs';
import { setPage } from '../assets/auth-ui.mjs';
import { PAGE_SIZES } from '../assets/constants.mjs';
import { deviceClientCell, deviceStateBadge, deviceTypeBadge } from '../assets/device-ui.mjs';
import { $, h } from '../assets/dom.mjs';
import { date, number, relative } from '../assets/format.mjs';
import { icon } from '../assets/icons.mjs';
import { state } from '../assets/runtime.mjs';
import { callout, confirmAction, emptyState, skeletonRows, toast } from '../assets/ui.mjs';

const STATES = [
  ['', 'Alle Status'],
  ['pending', 'Wartet auf Scan'],
  ['approved', 'Genehmigt'],
  ['active', 'Aktiv'],
  ['linked', 'Verknüpft'],
  ['expired', 'Abgelaufen'],
  ['revoked', 'Widerrufen'],
];

export async function renderDevicesPage(route) {
  setPage('Geräte', 'Web-Browser, die per QR-Code von der App freigegeben wurden');
  state.devices.query = route.params.get('query') || '';
  state.devices.state = STATES.some(([key]) => key === route.params.get('state')) ? route.params.get('state') : '';
  state.devices.limit = PAGE_SIZES.includes(Number(route.params.get('limit'))) ? Number(route.params.get('limit')) : 50;
  state.devices.offset = Math.max(0, Number(route.params.get('offset')) || 0);

  const search = h('input', {
    id: 'device-query', type: 'search', value: state.devices.query, autocomplete: 'off',
    placeholder: 'Gerät, Konto, Browser, Betriebssystem oder Geräte-ID',
  });
  const stateSelect = h('select', { id: 'device-state', onChange: () => applyDeviceFilters() },
    ...STATES.map(([key, label]) => h('option', { value: key, selected: state.devices.state === key, text: label })),
  );
  const limitSelect = h('select', { id: 'device-limit', onChange: () => applyDeviceFilters() },
    ...PAGE_SIZES.map((size) => h('option', { value: String(size), selected: state.devices.limit === size, text: String(size) })),
  );
  const tbody = h('tbody', { id: 'devices-body' });
  const summary = h('p', { id: 'devices-summary', className: 'hint', text: 'Lade Geräte …' });
  const pager = h('div', { className: 'pager' },
    summary,
    h('div', { className: 'row', id: 'devices-pager-buttons' },
      h('button', { className: 'btn secondary small', type: 'button', id: 'devices-prev', onClick: () => goDevicesPage(Math.max(0, state.devices.offset - state.devices.limit)) }, icon('chevron-left'), 'Zurück'),
      h('button', { className: 'btn secondary small', type: 'button', id: 'devices-next', onClick: () => goDevicesPage(state.devices.offset + state.devices.limit) }, 'Weiter', icon('chevron-right')),
    ),
  );

  $('view').replaceChildren(
    h('div', { className: 'view-stack' },
      h('section', { className: 'card toolbar', 'aria-label': 'Gerätefilter' },
        h('label', { className: 'field grow' }, 'Suche', h('div', { className: 'search-field' }, icon('search'), search)),
        h('label', { className: 'field' }, 'Status', stateSelect),
        h('label', { className: 'field', style: { flex: '0 1 130px' } }, 'Pro Seite', limitSelect),
      ),
      h('section', { className: 'card table-card' },
        h('div', { className: 'table-wrap' },
          h('table', { className: 'data', style: { minWidth: '1500px' } },
            h('caption', { className: 'sr-only' }, 'Verknüpfte Web-Geräte'),
            h('thead', null, h('tr', null,
              h('th', null, 'Gerät'),
              h('th', null, 'Typ'),
              h('th', null, 'Betriebssystem'),
              h('th', null, 'Browser'),
              h('th', null, 'Konto'),
              h('th', null, 'Status'),
              h('th', null, 'Erstellt'),
              h('th', null, 'Genehmigt'),
              h('th', null, 'Letzte Aktivität'),
              h('th', null, 'Sitzung'),
              h('th', null, ''),
            )),
            tbody,
          ),
        ),
        pager,
      ),
      callout('Der QR-Code ist zehn Minuten gültig und lässt sich genau einmal einlösen. Beim Widerruf wird die zugehörige Websitzung sofort ungültig; der Browser muss erneut einen QR-Code scannen. Pairing-Tokens werden nie im Klartext gespeichert.', '', 'shield'),
    ),
  );

  search.addEventListener('input', () => {
    clearTimeout(state.searchTimer);
    state.searchTimer = setTimeout(() => {
      state.devices.query = search.value.trim();
      state.devices.offset = 0;
      syncDeviceUrl();
      loadDevices();
    }, 280);
  });
  search.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    clearTimeout(state.searchTimer);
    state.devices.query = search.value.trim();
    state.devices.offset = 0;
    syncDeviceUrl();
    loadDevices();
  });

  await loadDevices();
}

function applyDeviceFilters() {
  state.devices.query = $('device-query').value.trim();
  state.devices.state = $('device-state').value;
  state.devices.limit = Number($('device-limit').value);
  state.devices.offset = 0;
  syncDeviceUrl();
  loadDevices();
}

function syncDeviceUrl() {
  const params = new URLSearchParams();
  if (state.devices.query) params.set('query', state.devices.query);
  if (state.devices.state) params.set('state', state.devices.state);
  if (state.devices.limit !== 50) params.set('limit', String(state.devices.limit));
  if (state.devices.offset) params.set('offset', String(state.devices.offset));
  const text = params.toString();
  history.replaceState(null, '', '#/devices' + (text ? '?' + text : ''));
}

function goDevicesPage(offset) {
  state.devices.offset = Math.max(0, offset);
  syncDeviceUrl();
  loadDevices();
}

async function loadDevices() {
  const seq = ++state.devices.seq;
  const tbody = $('devices-body');
  if (!tbody) return;
  tbody.replaceChildren(...skeletonRows(11, 6));
  const summary = $('devices-summary');
  if (summary) summary.textContent = 'Lade Geräte …';
  try {
    const params = new URLSearchParams();
    if (state.devices.query) params.set('query', state.devices.query);
    if (state.devices.state) params.set('state', state.devices.state);
    params.set('limit', String(state.devices.limit));
    params.set('offset', String(state.devices.offset));
    const data = await api('/v1/admin/devices?' + params.toString());
    if (seq !== state.devices.seq) return;
    state.devices.list = data.devices;
    state.devices.total = data.total;
    renderDeviceRows(data);
    const badgeNode = $('nav-devices-count');
    if (badgeNode) { badgeNode.textContent = number(data.total); badgeNode.hidden = false; }
  } catch (error) {
    if (error.code === 'unauthorized' || seq !== state.devices.seq) return;
    tbody.replaceChildren(h('tr', null, h('td', { colspan: '11' }, emptyState('alert', 'Geräte konnten nicht geladen werden', errorText(error), h('button', { className: 'btn secondary', type: 'button', onClick: () => loadDevices() }, icon('refresh'), 'Erneut versuchen')))));
    if (summary) summary.textContent = 'Fehler beim Laden.';
    toast(errorText(error), 'error');
  }
}

function renderDeviceRows(data) {
  const tbody = $('devices-body');
  if (!tbody) return;
  tbody.replaceChildren();
  const summary = $('devices-summary');
  if (summary) {
    summary.textContent = data.total === 1 ? '1 Gerät entspricht den Filtern.' : number(data.total) + ' Geräte entsprechen den Filtern.';
  }
  if (!data.devices.length) {
    tbody.append(h('tr', null, h('td', { colspan: '11' }, emptyState('qr', 'Keine Geräte', 'Sobald sich die Web-App per QR-Code anmeldet, erscheint die Paarung hier.'))));
    return;
  }
  for (const device of data.devices) {
    const client = device.client || {};
    const browser = client.browser || '';
    const userCell = device.account
      ? h('a', { className: 'who-text', href: '#/users/' + encodeURIComponent(device.userId) + '/devices', style: { color: 'inherit', textDecoration: 'none' }, onClick: (event) => event.stopPropagation() },
          h('strong', { text: device.userName || device.account }),
          h('span', { text: device.account }),
        )
      : h('span', { className: 'hint', text: 'noch nicht genehmigt' });
    const canRevoke = device.state !== 'revoked';
    tbody.append(h('tr', { style: { cursor: 'pointer' }, onClick: () => { location.hash = '#/devices/' + encodeURIComponent(device.id); } },
      h('td', null, h('a', { className: 'who-text', href: '#/devices/' + encodeURIComponent(device.id), style: { color: 'inherit', textDecoration: 'none' } },
        h('strong', { text: device.name + (browser && !device.name.includes(browser) ? ' · ' + browser : '') }),
        h('span', { text: device.userAgent || device.id }),
      )),
      h('td', null, deviceTypeBadge(client), client.device ? h('div', { className: 'hint', text: client.device }) : null),
      h('td', null, deviceClientCell(client.os, client.osVersion ? 'Version ' + client.osVersion : '')),
      h('td', null, deviceClientCell(client.browser, [client.browserVersion ? 'Version ' + client.browserVersion : null, client.engine].filter(Boolean).join(' · '))),
      h('td', null, userCell),
      h('td', null, deviceStateBadge(device.state)),
      h('td', null, h('div', { className: 'who-text' }, h('strong', { text: relative(device.createdAt), style: { fontSize: '12.5px' } }), h('span', { text: date(device.createdAt) }))),
      h('td', null, device.approvedAt ? date(device.approvedAt) : h('span', { className: 'muted', text: '–' })),
      h('td', null, device.session?.lastSeenAt ? date(device.session.lastSeenAt) : device.lastSeenAt ? date(device.lastSeenAt) : h('span', { className: 'muted', text: '–' })),
      h('td', null, device.session ? h('div', { className: 'who-text' }, h('strong', { className: 'mono', text: device.session.id, style: { fontSize: '11px' } }), h('span', { text: device.session.expiresAt ? 'bis ' + date(device.session.expiresAt) : '' })) : h('span', { className: 'muted', text: 'keine' })),
      h('td', null, canRevoke ? h('button', { className: 'btn danger-soft small', type: 'button', onClick: (event) => { event.stopPropagation(); revokeDevice(device); } }, icon('trash'), 'Widerrufen') : h('span', { className: 'muted', text: '–' })),
    ));
  }
  const prev = $('devices-prev');
  const next = $('devices-next');
  if (prev) prev.disabled = data.offset <= 0;
  if (next) next.disabled = data.offset + data.limit >= data.total;
}

async function revokeDevice(device) {
  const ok = await confirmAction({
    title: 'Gerät widerrufen?',
    message: 'Die Websitzung von „' + device.name + '“ wird sofort ungültig. Der Browser muss einen neuen QR-Code scannen. Das Konto und seine Daten bleiben erhalten.',
    confirmLabel: 'Gerät widerrufen',
  });
  if (!ok) return;
  try {
    await api('/v1/admin/devices/' + encodeURIComponent(device.id), { method: 'DELETE' });
    toast('Gerät widerrufen.', 'ok');
    state.overview = null;
    await loadDevices();
  } catch (error) {
    if (error.code !== 'unauthorized') toast(errorText(error), 'error');
  }
}
