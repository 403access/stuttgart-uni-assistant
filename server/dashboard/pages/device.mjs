/** One browser device link: client details, account, session, and revoke. */

import { api, errorText } from '../assets/api.mjs';
import { setPage } from '../assets/auth-ui.mjs';
import { deviceStateBadge, deviceTypeBadge, deviceTypeLabel } from '../assets/device-ui.mjs';
import { $, h } from '../assets/dom.mjs';
import { date, relative } from '../assets/format.mjs';
import { icon } from '../assets/icons.mjs';
import { confirmAction, emptyState, fieldBox, loading, sectionHead, toast } from '../assets/ui.mjs';

function timeValue(value) {
  if (!value) return '–';
  return h('span', null, date(value), h('span', { className: 'hint', text: ' · ' + relative(value) }));
}

function osText(client) {
  if (!client.os) return '–';
  return client.os + (client.osVersion ? ' ' + client.osVersion : '');
}

function browserText(client) {
  if (!client.browser) return '–';
  return client.browser + (client.browserVersion ? ' ' + client.browserVersion : '');
}

export async function renderDevicePage(id) {
  setPage('Gerät', 'Browser-Paarung, Client und Sitzung');
  const view = $('view');
  view.replaceChildren(loading('Gerät wird geladen …'));

  let device;
  try {
    device = await api('/v1/admin/devices/' + encodeURIComponent(id));
  } catch (error) {
    if (error.code === 'unauthorized') return;
    if (error.code === 'unknown_device') {
      view.replaceChildren(
        h('div', { className: 'view-stack' },
          h('a', { className: 'back-link', href: '#/devices' }, icon('left'), 'Geräte'),
          h('div', { className: 'card section-card' },
            emptyState('smartphone', 'Gerät nicht gefunden', 'Diese Paarung existiert nicht mehr. Öffne die Geräteliste für den aktuellen Stand.'),
          ),
        ),
      );
      return;
    }
    throw error;
  }

  setPage(device.name, device.account ? (device.userName || device.account) + ' · ' + device.account : 'Noch nicht genehmigt');
  renderDevice(device);
}

function renderDevice(device) {
  const view = $('view');
  const client = device.client || {};
  const session = device.session || null;
  const account = device.account
    ? h('a', { href: '#/users/' + encodeURIComponent(device.userId) + '/devices' }, device.userName || device.account)
    : null;
  const canRevoke = device.state !== 'revoked';

  const header = h('section', { className: 'card profile-card' },
    h('span', { className: 'platform-icon', style: { width: '58px', height: '58px', borderRadius: '17px', fontSize: '25px' } }, icon('smartphone')),
    h('div', { className: 'profile-main' },
      h('h2', { text: device.name }),
      h('p', { className: 'profile-sub', text: device.userAgent || device.id }),
      h('div', { className: 'badges' },
        deviceStateBadge(device.state),
        deviceTypeBadge(client),
        client.browser ? h('span', { className: 'badge' }, client.browser) : null,
      ),
    ),
    h('div', { className: 'profile-actions' },
      account ? h('a', { className: 'btn secondary', href: '#/users/' + encodeURIComponent(device.userId) + '/devices' }, icon('users'), 'Konto') : null,
      canRevoke ? h('button', { className: 'btn danger-soft', type: 'button', onClick: () => revokeDevice(device) }, icon('trash'), 'Widerrufen') : null,
    ),
  );

  const deviceCard = h('section', { className: 'card section-card' },
    sectionHead('Gerät', 'Formfaktor, System und Browser'),
    h('div', { className: 'field-grid' },
      fieldBox('Geräte-ID', device.id, { copy: true, copyLabel: 'Geräte-ID' }),
      fieldBox('Typ', deviceTypeLabel(client)),
      fieldBox('Modell', client.device || '–'),
      fieldBox('Betriebssystem', osText(client)),
      fieldBox('Browser', browserText(client)),
      fieldBox('Engine', client.engine || '–'),
      fieldBox('Art', device.kind || 'web'),
      fieldBox('Status', deviceStateBadge(device.state)),
    ),
  );

  const timesCard = h('section', { className: 'card section-card' },
    sectionHead('Zeitstempel', 'Paarung, Freigabe und letzte Aktivität'),
    h('div', { className: 'field-grid' },
      fieldBox('Erstellt', timeValue(device.createdAt)),
      fieldBox('Läuft ab', timeValue(device.expiresAt)),
      fieldBox('Genehmigt', timeValue(device.approvedAt)),
      fieldBox('Eingelöst', timeValue(device.consumedAt)),
      fieldBox('Widerrufen', timeValue(device.revokedAt)),
      fieldBox('Zuletzt gesehen', timeValue(device.lastSeenAt)),
    ),
  );

  const accountCard = h('section', { className: 'card section-card' },
    sectionHead('Konto', device.account ? 'Diese Paarung gehört zu einem Konto' : 'Noch keinem Konto zugeordnet'),
    device.account
      ? h('div', { className: 'field-grid' },
          fieldBox('Name', device.userName || '–'),
          fieldBox('Kennung', device.account, { copy: true, copyLabel: 'Kennung' }),
          fieldBox('Konto-ID', device.userId || '–', { copy: true, copyLabel: 'Konto-ID' }),
        )
      : h('p', { className: 'hint', text: 'Der QR-Code wurde noch nicht von einer App bestätigt. Sobald das passiert, erscheint hier das Konto.' }),
  );

  const sessionCard = h('section', { className: 'card section-card' },
    sectionHead('Sitzung', session ? 'Vom Browser eingelöste Websitzung' : 'Noch keine Sitzung'),
    session
      ? h('div', { className: 'field-grid' },
          fieldBox('Sitzungs-ID', session.id, { copy: true, copyLabel: 'Sitzungs-ID' }),
          fieldBox('Läuft ab', timeValue(session.expiresAt)),
          fieldBox('Zuletzt gesehen', timeValue(session.lastSeenAt)),
          fieldBox('Widerrufen', session.revokedAt ? timeValue(session.revokedAt) : 'nein'),
        )
      : h('p', { className: 'hint', text: 'Die Sitzung entsteht erst, wenn der Browser den QR-Code einlöst.' }),
  );

  const agentCard = h('section', { className: 'card section-card' },
    sectionHead('Benutzeragent', 'Vom Browser gesendeter Header'),
    h('div', { className: 'log-message', text: device.userAgent || '–' }),
  );

  view.replaceChildren(
    h('div', { className: 'view-stack' },
      h('a', { className: 'back-link', href: '#/devices' }, icon('left'), 'Geräte'),
      header,
      h('div', { className: 'detail-stack' },
        h('div', { className: 'overview-grid' },
          h('div', { className: 'overview-col' }, deviceCard, timesCard, agentCard),
          h('div', { className: 'overview-col' }, accountCard, sessionCard),
        ),
      ),
    ),
  );
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
    await renderDevicePage(device.id);
  } catch (error) {
    if (error.code !== 'unauthorized') toast(errorText(error), 'error');
  }
}
