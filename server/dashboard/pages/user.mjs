/** Per-account header, tabs, explorers, and mutations. */

import { api, errorText } from '../assets/api.mjs';
import { setPage } from '../assets/auth-ui.mjs';
import { AUDIT_LABELS, DANGEROUS_ACTIONS, MODES, PLATFORM_ICONS, PLATFORMS } from '../assets/constants.mjs';
import { $, h } from '../assets/dom.mjs';
import { date, dateOnly, detailText, duration, icsDate, modeName, number, platformName, relative } from '../assets/format.mjs';
import { icon } from '../assets/icons.mjs';
import { state } from '../assets/runtime.mjs';
import {
  avatar, badge, callout, campusBadge, confirmAction, copyButton, copyText, emptyState, fieldBox, loading,
  platformBadge, progressBar, sectionHead, statusBadge, toast,
} from '../assets/ui.mjs';

/* --------------------------------------------------------- user detail */
function resetUserState(id) {
  state.user = { id, detail: null, tab: 'overview', cache: {}, data: null, calendar: null, calls: null, platformEdit: null };
}

function userTabLink(id, tab) {
  return '#/users/' + encodeURIComponent(id) + '/' + tab;
}

export async function renderUserPage(id, tab) {
  if (state.user.id !== id) resetUserState(id);
  state.user.tab = tab || 'overview';
  state.user.platformEdit = null;
  if (!state.user.detail) {
    setPage('Nutzerdetails', 'Konto und Daten werden geladen …');
    $('view').replaceChildren(loading('Konto wird geladen …'));
    try {
      state.user.detail = await api('/v1/admin/users/' + encodeURIComponent(id));
    } catch (error) {
      if (error.code === 'unknown_user') {
        toast('Das Konto existiert nicht mehr.', 'error');
        location.hash = state.lastUsersHash;
        return;
      }
      throw error;
    }
  }
  const detail = state.user.detail;
  const user = detail.user;
  setPage(user.name || user.account, user.account + ' · ' + modeName(user.mode));
  renderUserShell(detail);
}

function renderUserShell(detail) {
  const user = detail.user;
  const activeSessions = detail.sessions.filter((item) => item.state === 'active').length;
  const tabs = [
    ['overview', 'Übersicht'],
    ['sessions', 'Sitzungen', detail.sessions.length],
    ['devices', 'Geräte', detail.devices.length],
    ['platforms', 'Plattformen', user.platforms.length],
    ['campus', 'C@MPUS'],
    ['ilias', 'ILIAS', detail.ilias?.counts?.memberships || undefined],
    ['data', 'Studiengänge', detail.studies.length],
    ['calendar', 'Kalender', detail.counts.events],
    ['calls', 'Aufrufe', detail.counts.calls],
    ['audit', 'Aktivität'],
  ];
  const tabBar = h('nav', { className: 'tabs', role: 'tablist', 'aria-label': 'Kontobereiche' },
    ...tabs.map(([id, label, count]) => h('a', {
      className: 'tab', role: 'tab', href: userTabLink(user.id, id),
      'aria-selected': state.user.tab === id ? 'true' : 'false',
      onClick: (event) => { event.preventDefault(); location.hash = userTabLink(user.id, id); },
    }, label, count !== undefined ? h('span', { className: 'tab-count', text: number(count) }) : null)),
  );

  const hero = h('section', { className: 'card profile-card' },
    avatar(user.name, user.account, 'lg'),
    h('div', { className: 'profile-main' },
      h('div', { className: 'row' }, h('h2', { text: user.name || user.account }), h('span', { className: 'spacer' })),
      h('p', { className: 'profile-sub', text: [user.account, user.email, user.matriculation ? 'Matrikel ' + user.matriculation : null].filter(Boolean).join(' · ') }),
      h('div', { className: 'badges' },
        badge(modeName(user.mode), user.mode === 'campus' ? 'blue' : ''),
        campusBadge({ campusActive: detail.campus.active, campusSource: detail.campus.source }),
        activeSessions ? badge(activeSessions + ' aktive Sitzung' + (activeSessions === 1 ? '' : 'en'), 'ok') : badge('keine Sitzung', ''),
        badge(detail.counts.studies + ' Studiengänge', 'purple'),
      ),
      h('p', { className: 'hint', text: 'Konto seit ' + date(user.createdAt) + ' · zuletzt ' + relative(user.lastLoginAt) }),
    ),
    h('div', { className: 'profile-actions' },
      h('button', { className: 'btn secondary small', type: 'button', onClick: () => copyText(user.id, 'Konto-ID') }, icon('copy'), 'ID'),
      h('button', { className: 'btn secondary small', type: 'button', onClick: () => refreshUser(detail.user.id) }, icon('refresh'), 'Neu laden'),
      h('button', { className: 'btn danger-soft small', type: 'button', disabled: !activeSessions, onClick: () => revokeAllSessions(detail) }, icon('monitor'), 'Alle abmelden'),
    ),
  );

  const content = h('section', { className: 'card section-card detail-content', id: 'user-tab-content', role: 'tabpanel' });
  $('view').replaceChildren(
    h('a', { className: 'back-link', href: state.lastUsersHash }, icon('chevron-left'), 'Zurück zu den Konten'),
    hero,
    tabBar,
    content,
  );
  renderUserTab(detail);
}

function renderUserTab(detail) {
  const container = $('user-tab-content');
  if (!container) return;
  container.replaceChildren();
  const tab = state.user.tab;
  if (tab === 'overview') renderOverviewTab(container, detail);
  else if (tab === 'sessions') renderSessionsTab(container, detail);
  else if (tab === 'devices') renderDevicesTab(container, detail);
  else if (tab === 'platforms') renderPlatformsTab(container, detail);
  else if (tab === 'campus') renderCampusTab(container, detail);
  else if (tab === 'ilias') renderIliasTab(container, detail);
  else if (tab === 'data') renderDataTab(container, detail);
  else if (tab === 'calendar') renderCalendarTab(container, detail);
  else if (tab === 'calls') renderCallsTab(container, detail);
  else if (tab === 'audit') renderUserAuditTab(container, detail);
  else renderOverviewTab(container, detail);
}

async function refreshUser(id) {
  try {
    state.user.cache = {};
    state.user.detail = await api('/v1/admin/users/' + encodeURIComponent(id));
    renderUserShell(state.user.detail);
    toast('Konto aktualisiert.', 'ok');
  } catch (error) { if (error.code !== 'unauthorized') toast(errorText(error), 'error'); }
}

function applyUserDetail(detail) {
  if (!detail) return;
  state.overview = null;
  state.user.detail = detail;
  state.user.cache = {};
  renderUserShell(detail);
}

function renderOverviewTab(container, detail) {
  const user = detail.user;
  const formInputs = {};
  function input(id, label, value, attrs) {
    const node = h('input', { id, value: value || '', ...(attrs || {}) });
    formInputs[id] = node;
    return h('label', { className: 'field', style: { display: 'grid', gap: '5px', fontSize: '11.5px', fontWeight: '700', color: 'var(--muted)' } }, label, node);
  }
  const modeSelect = h('select', { id: 'p-mode' }, ...Object.entries(MODES).map(([key, label]) => h('option', { value: key, selected: user.mode === key, text: label })));
  formInputs['p-mode'] = modeSelect;
  const form = h('form', { className: 'detail-section', onSubmit: async (event) => {
      event.preventDefault();
      const body = {
        account: formInputs['p-account'].value,
        name: formInputs['p-name'].value,
        email: formInputs['p-email'].value,
        matriculation: formInputs['p-matriculation'].value,
        subject: formInputs['p-subject'].value,
        mode: formInputs['p-mode'].value,
      };
      if (!body.account.trim()) { toast('Die Kennung darf nicht leer sein.', 'error'); return; }
      const button = event.submitter;
      if (button) button.disabled = true;
      try {
        const updated = await api('/v1/admin/users/' + encodeURIComponent(user.id), { method: 'POST', body });
        toast('Kontodaten gespeichert.', 'ok');
        applyUserDetail(updated);
      } catch (error) {
        if (error.code !== 'unauthorized') toast(errorText(error), 'error');
      } finally {
        if (button) button.disabled = false;
      }
    } },
    h('h3', null, 'Kontodaten'),
    h('div', { className: 'form-grid' },
      input('p-account', 'Kennung (Login)', user.account),
      input('p-name', 'Name', user.name),
      input('p-email', 'E-Mail', user.email, { type: 'email' }),
      input('p-matriculation', 'Matrikelnummer', user.matriculation),
      input('p-subject', 'Subjekt / ID', user.subject),
      h('label', { className: 'field', style: { display: 'grid', gap: '5px', fontSize: '11.5px', fontWeight: '700', color: 'var(--muted)' } }, 'Anmeldemodus', modeSelect),
    ),
    h('div', { className: 'form-actions' },
      h('button', { className: 'btn', type: 'submit' }, icon('check'), 'Änderungen speichern'),
      h('button', { className: 'btn secondary', type: 'button', onClick: () => renderUserTab(detail) }, 'Zurücksetzen'),
      h('span', { className: 'hint', text: 'Kennung und Modus wirken sich auf künftige Anmeldungen aus.' }),
    ),
  );

  const meta = h('section', { className: 'detail-section' },
    h('h3', null, 'Status'),
    h('div', { className: 'field-grid' },
      fieldBox('Konto-ID', user.id, { copy: true, copyLabel: 'Konto-ID' }),
      fieldBox('Erstellt', date(user.createdAt)),
      fieldBox('Aktualisiert', date(user.updatedAt)),
      fieldBox('Letzte Anmeldung', user.lastLoginAt ? date(user.lastLoginAt) + ' · ' + relative(user.lastLoginAt) : 'nie'),
      fieldBox('Sitzungen aktiv', String(detail.sessions.filter((item) => item.state === 'active').length)),
      fieldBox('Web-Geräte', String(detail.devices.length)),
      fieldBox('C@MPUS im Speicher', detail.campus.active ? 'ja' : 'nein'),
      fieldBox('C@MPUS-Quelle', detail.campus.source || '–'),
      fieldBox('C@MPUS-Konto', detail.campus.account || '–'),
      fieldBox('ENV-Zugang', detail.campus.envConfigured ? 'konfiguriert' : 'nicht konfiguriert'),
      fieldBox('ILIAS im Speicher', detail.ilias?.active ? 'ja' : 'nein'),
      fieldBox('ILIAS-Konto', detail.ilias?.account || '–'),
      fieldBox('ILIAS-Stand', detail.ilias?.fetchedAt ? date(detail.ilias.fetchedAt) : '–'),
      fieldBox('Portal-Studiengänge', String(detail.counts.studies)),
      fieldBox('Portal-Knoten', number(detail.counts.nodes) + ' · ' + detail.counts.completedNodes + ' abgeschlossen'),
      fieldBox('In Arbeit', String(detail.counts.inProgressNodes)),
      fieldBox('Kurse', number(detail.counts.courses)),
      fieldBox('Kalendertermine', number(detail.counts.events)),
      fieldBox('Portal-Aufrufe', number(detail.counts.calls)),
    ),
  );

  const studyRows = detail.studies.length
    ? detail.studies.map((study) => h('tr', null,
        h('td', null, h('strong', { text: study.name }), h('div', { className: 'hint', text: [study.intendedDegree, study.versionIdentifier, study.identifier].filter(Boolean).join(' · ') || 'Studium ' + study.studyId })),
        h('td', { className: 'num' }, number(study.nodeCount)),
        h('td', null, progressBar(study.completedNodes + study.inProgressNodes, study.nodeCount)),
        h('td', { className: 'num' }, number(study.courseCount)),
        h('td', null, study.nodesComplete ? badge('vollständig', 'ok') : study.nodeCount ? badge('teilweise', 'warn') : badge('leer', '')),
        h('td', null, h('div', { className: 'row tight' },
          h('a', { className: 'btn secondary small', href: userTabLink(user.id, 'data'), onClick: () => { state.user.data = { studyId: study.studyId, view: 'nodes', query: '', state: '', limit: 50, offset: 0 }; } }, 'Öffnen'),
          h('button', { className: 'btn secondary small', type: 'button', onClick: () => startSync(detail, study) }, icon('zap'), 'Sync'),
          h('button', { className: 'btn danger-soft small', type: 'button', onClick: () => clearStudy(user.id, study) }, 'Leeren'),
        )),
      ))
    : [h('tr', null, h('td', { colspan: '6' }, emptyState('database', 'Keine Portal-Daten', 'Für dieses Konto wurden noch keine Studiengangsdaten gespeichert.')))];

  const studies = h('section', { className: 'detail-section' },
    h('h3', null, 'Studiengänge'),
    h('div', { className: 'table-wrap' },
      h('table', { className: 'data', style: { minWidth: '760px' } },
        h('caption', { className: 'sr-only' }, 'Studiengänge und Datenbestand'),
        h('thead', null, h('tr', null, h('th', null, 'Studiengang'), h('th', { className: 'num' }, 'Knoten'), h('th', null, 'Fortschritt'), h('th', { className: 'num' }, 'Kurse'), h('th', null, 'Sync'), h('th', null, ''))),
        h('tbody', null, ...studyRows),
      ),
    ),
  );

  const auditPreview = h('section', { className: 'detail-section' },
    h('h3', null, 'Letzte Aktivität'),
    detail.audit.length
      ? h('div', { className: 'timeline' }, ...detail.audit.map((entry) => h('div', { className: 'timeline-item' },
          h('span', { className: 'timeline-dot ' + (DANGEROUS_ACTIONS.has(entry.action) ? 'danger' : '') }),
          h('div', { className: 'timeline-body' }, h('strong', { text: AUDIT_LABELS[entry.action] || entry.action }), h('span', { text: detailText(entry.detail) || '—' })),
          h('span', { className: 'timeline-time', text: relative(entry.createdAt) }),
        )))
      : h('p', { className: 'hint', text: 'Noch keine Operator-Aktionen für dieses Konto.' }),
    h('a', { className: 'btn secondary small', href: '#/audit?userId=' + encodeURIComponent(user.id) }, icon('activity'), 'Vollständiges Protokoll'),
  );

  const danger = h('section', { className: 'danger-zone' },
    h('h3', null, 'Konto löschen'),
    h('p', { className: 'hint', text: 'Löscht das Konto, alle Sitzungen, Plattformverknüpfungen, den C@MPUS-Zugang und sämtliche Portal-Daten. Diese Aktion lässt sich nicht rückgängig machen.' }),
    h('div', { className: 'row' },
      h('button', { className: 'btn danger small', type: 'button', onClick: () => deleteUser(detail) }, icon('trash'), 'Konto endgültig löschen'),
    ),
  );

  container.append(form, meta, studies, auditPreview, danger);
}

function renderSessionsTab(container, detail) {
  const user = detail.user;
  const active = detail.sessions.filter((item) => item.state === 'active');
  const list = detail.sessions.length
    ? h('div', { style: { display: 'grid', gap: '8px' } }, ...detail.sessions.map((session) => h('div', { className: 'session-card' },
        h('div', { className: 'main' },
          h('div', { className: 'row tight' }, h('strong', { className: 'mono', text: session.id }), copyButton(session.id, 'Sitzungs-ID')),
          h('span', { text: 'erstellt ' + date(session.createdAt) + ' · läuft ab ' + date(session.expiresAt) }),
          session.device ? h('span', { text: 'Gerät ' + session.device.name + (session.device.kind === 'web' ? ' · Web' : '') }) : null,
          h('span', { text: session.lastSeenAt ? 'zuletzt gesehen ' + date(session.lastSeenAt) : 'noch nicht verwendet' + (session.revokedAt ? ' · widerrufen ' + date(session.revokedAt) : '') }),
        ),
        h('div', { className: 'row actions' },
          statusBadge(session.state),
          session.state === 'active' ? h('button', { className: 'btn danger-soft small', type: 'button', onClick: () => revokeSession(user.id, session.id) }, icon('monitor'), 'Widerrufen') : null,
        ),
      )))
    : emptyState('monitor', 'Keine Sitzungen', 'Für dieses Konto wurde noch keine App-Sitzung erstellt.');

  container.append(
    callout('Sitzungs-Token werden nie angezeigt oder gespeichert — in der Datenbank liegt nur ihr SHA-256-Hash. Ein Widerruf macht ein Token sofort ungültig.', '', 'shield'),
    h('div', { className: 'detail-section' },
      sectionHead('App-Sitzungen', active.length + ' aktiv · ' + detail.sessions.length + ' insgesamt', h('button', { className: 'btn danger-soft small', type: 'button', disabled: !active.length, onClick: () => revokeAllSessions(detail) }, icon('monitor'), 'Alle widerrufen')),
      list,
    ),
  );
}

function deviceBadge(state) {
  const map = {
    pending: ['wartet auf Scan', 'warn'],
    approved: ['genehmigt', 'blue'],
    active: ['aktiv', 'ok'],
    linked: ['verknüpft', 'ok'],
    expired: ['abgelaufen', ''],
    revoked: ['widerrufen', 'danger'],
  };
  const [label, tone] = map[state] || [state, ''];
  return badge(label, tone);
}

function renderDevicesTab(container, detail) {
  const user = detail.user;
  const devices = detail.devices || [];
  const active = devices.filter((device) => device.state === 'active' || device.state === 'linked').length;
  const rows = devices.length
    ? devices.map((device) => h('tr', null,
        h('td', null, h('strong', { text: device.name }), h('div', { className: 'hint', text: device.userAgent || device.id })),
        h('td', null, deviceBadge(device.state)),
        h('td', null, date(device.createdAt)),
        h('td', null, device.approvedAt ? date(device.approvedAt) : h('span', { className: 'muted', text: '–' })),
        h('td', null, device.session ? h('div', { className: 'who-text' }, h('strong', { className: 'mono', text: device.session.id, style: { fontSize: '11px' } }), h('span', { text: device.session.expiresAt ? 'bis ' + date(device.session.expiresAt) : '' })) : h('span', { className: 'muted', text: 'keine' })),
        h('td', null, device.state !== 'revoked' ? h('button', { className: 'btn danger-soft small', type: 'button', onClick: () => revokeUserDevice(user.id, device) }, icon('trash'), 'Widerrufen') : h('span', { className: 'muted', text: '–' })),
      ))
    : [h('tr', null, h('td', { colspan: '6' }, emptyState('smartphone', 'Keine Web-Geräte', 'Dieses Konto hat noch keinen Browser per QR-Code freigegeben.')))];

  container.append(
    callout('Die Web-App kann sich nur mit einem QR-Code anmelden, den die App auf dem Telefon freigibt. Ein Widerruf beendet die zugehörige Websitzung sofort.', '', 'shield'),
    h('div', { className: 'detail-section' },
      sectionHead('Web-Geräte', active + ' aktiv · ' + devices.length + ' insgesamt'),
      h('div', { className: 'table-wrap' },
        h('table', { className: 'data', style: { minWidth: '820px' } },
          h('caption', { className: 'sr-only' }, 'Mit dem Konto verknüpfte Web-Geräte'),
          h('thead', null, h('tr', null, h('th', null, 'Gerät'), h('th', null, 'Status'), h('th', null, 'Erstellt'), h('th', null, 'Genehmigt'), h('th', null, 'Sitzung'), h('th', null, ''))),
          h('tbody', null, ...rows),
        ),
      ),
    ),
  );
}

async function revokeUserDevice(userId, device) {
  const ok = await confirmAction({
    title: 'Web-Gerät widerrufen?',
    message: 'Die Websitzung von „' + device.name + '“ wird sofort ungültig. Der Browser muss einen neuen QR-Code scannen.',
    confirmLabel: 'Gerät widerrufen',
  });
  if (!ok) return;
  try {
    await api('/v1/admin/devices/' + encodeURIComponent(device.id), { method: 'DELETE' });
    toast('Web-Gerät widerrufen.', 'ok');
    const updated = await api('/v1/admin/users/' + encodeURIComponent(userId));
    applyUserDetail(updated);
  } catch (error) {
    if (error.code !== 'unauthorized') toast(errorText(error), 'error');
  }
}

function renderPlatformsTab(container, detail) {
  const user = detail.user;
  const links = new Map((user.platforms || []).map((link) => [link.id, link]));
  const ids = [...new Set([...PLATFORMS, ...links.keys()])];
  const cards = ids.map((id) => {
    const link = links.get(id);
    const editing = state.user.platformEdit === id;
    const head = h('div', { className: 'row', style: { width: '100%', alignItems: 'flex-start', flexWrap: 'nowrap' } },
      h('span', { className: 'platform-icon' }, icon(PLATFORM_ICONS[id] || 'link', 18)),
      h('div', { className: 'main' },
        h('div', { className: 'row tight' }, h('strong', { text: platformName(id) }), platformBadge(link)),
        h('span', { text: link ? (link.account || 'kein Konto hinterlegt') : 'nicht verknüpft' }),
        link ? h('span', { text: 'Quelle ' + (link.source || '–') + ' · verknüpft ' + date(link.linkedAt) + (link.lastSyncAt ? ' · Sync ' + date(link.lastSyncAt) : ' · noch kein Sync') }) : null,
      ),
      h('div', { className: 'row actions' },
        link ? h('button', { className: 'btn secondary small', type: 'button', title: 'Sync-Zeitpunkt auf jetzt setzen', onClick: () => touchPlatform(user.id, id) }, icon('zap'), 'Sync') : null,
        h('button', { className: 'btn secondary small', type: 'button', onClick: () => { state.user.platformEdit = editing ? null : id; renderUserTab(detail); } }, icon('edit'), editing ? 'Schließen' : link ? 'Bearbeiten' : 'Verknüpfen'),
        link ? h('button', { className: 'btn danger-soft small', type: 'button', onClick: () => unlinkPlatform(user.id, id) }, icon('unlink'), 'Entfernen') : null,
      ),
    );
    if (!editing) return h('div', { className: 'platform-card' }, head);
    const account = h('input', { value: link?.account || '', placeholder: 'Konto, z. B. st123456' });
    const status = h('select', null, h('option', { value: 'linked', selected: link?.status !== 'connected', text: 'verknüpft' }), h('option', { value: 'connected', selected: link?.status === 'connected', text: 'verbunden' }));
    const source = h('input', { value: link?.source || 'dashboard', placeholder: 'Quelle' });
    return h('div', { className: 'platform-card', style: { display: 'grid' } }, head,
      h('div', { className: 'inline-form' },
        h('label', { className: 'field', style: { display: 'grid', gap: '4px', fontSize: '11px', fontWeight: '700', color: 'var(--muted)' } }, 'Konto', account),
        h('label', { className: 'field', style: { display: 'grid', gap: '4px', fontSize: '11px', fontWeight: '700', color: 'var(--muted)' } }, 'Status', status),
        h('label', { className: 'field', style: { display: 'grid', gap: '4px', fontSize: '11px', fontWeight: '700', color: 'var(--muted)' } }, 'Quelle', source),
        h('div', { className: 'form-actions' },
          h('button', { className: 'btn small', type: 'button', onClick: () => savePlatform(user.id, id, { account: account.value, status: status.value, source: source.value }) }, icon('check'), 'Speichern'),
          h('button', { className: 'btn secondary small', type: 'button', onClick: () => { state.user.platformEdit = null; renderUserTab(detail); } }, 'Abbrechen'),
        ),
      ),
    );
  });

  const newPlatform = h('select', null, ...PLATFORMS.map((id) => h('option', { value: id, text: platformName(id) })));
  const newAccount = h('input', { placeholder: 'Konto (optional)' });
  const newStatus = h('select', null, h('option', { value: 'linked', text: 'verknüpft' }), h('option', { value: 'connected', text: 'verbunden' }));
  const newSource = h('input', { value: 'dashboard', placeholder: 'Quelle' });
  const linkForm = h('form', { className: 'detail-section', onSubmit: async (event) => {
      event.preventDefault();
      await savePlatform(user.id, newPlatform.value, { account: newAccount.value, status: newStatus.value, source: newSource.value });
    } },
    h('h3', null, 'Plattform verknüpfen oder aktualisieren'),
    h('div', { className: 'form-grid' },
      h('label', { className: 'field', style: { display: 'grid', gap: '5px', fontSize: '11.5px', fontWeight: '700', color: 'var(--muted)' } }, 'Plattform', newPlatform),
      h('label', { className: 'field', style: { display: 'grid', gap: '5px', fontSize: '11.5px', fontWeight: '700', color: 'var(--muted)' } }, 'Konto', newAccount),
      h('label', { className: 'field', style: { display: 'grid', gap: '5px', fontSize: '11.5px', fontWeight: '700', color: 'var(--muted)' } }, 'Status', newStatus),
      h('label', { className: 'field', style: { display: 'grid', gap: '5px', fontSize: '11.5px', fontWeight: '700', color: 'var(--muted)' } }, 'Quelle', newSource),
    ),
    h('div', { className: 'form-actions' }, h('button', { className: 'btn', type: 'submit' }, icon('plus'), 'Verknüpfen')),
  );

  container.append(
    callout('Plattformverknüpfungen sind Metadaten. Das Dashboard prüft dabei keine Zugangsdaten und speichert keine Passwörter. C@MPUS-Zugänge werden separat im Reiter „C@MPUS“ verwaltet.', '', 'info'),
    h('div', { className: 'detail-section' }, h('h3', null, 'Verknüpfungen'), h('div', { style: { display: 'grid', gap: '8px' } }, ...cards)),
    linkForm,
  );
}

function renderCampusTab(container, detail) {
  const user = detail.user;
  const studyRows = detail.studies.length
    ? detail.studies.map((study) => h('tr', null,
        h('td', null, h('strong', { text: study.name }), h('div', { className: 'hint', text: 'Studium ' + study.studyId })),
        h('td', { className: 'num' }, number(study.nodeCount)),
        h('td', { className: 'num' }, number(study.courseCount)),
        h('td', null, study.nodesComplete ? badge('vollständig', 'ok') : badge('unvollständig', 'warn')),
        h('td', null, h('div', { className: 'row tight' },
          h('button', { className: 'btn secondary small', type: 'button', onClick: () => startSync(detail, study) }, icon('zap'), 'Sync'),
          h('button', { className: 'btn danger-soft small', type: 'button', onClick: () => clearStudy(user.id, study) }, 'Daten löschen'),
        )),
      ))
    : [h('tr', null, h('td', { colspan: '5' }, h('p', { className: 'hint', text: 'Keine Studiengangsdaten gespeichert.' })))];

  container.append(
    callout('Der C@MPUS-Zugang selbst — Bearer-Token oder PSESSIONID — wird niemals angezeigt. „Trennen“ entfernt nur die gespeicherte Sitzung im Server-Speicher und die Quellmarkierung; die Portalzeilen bleiben erhalten, bis du sie löschst.', '', 'shield'),
    h('div', { className: 'field-grid' },
      fieldBox('Zugang aktiv', detail.campus.active ? 'ja, im Speicher' : 'nein'),
      fieldBox('Quelle', detail.campus.source || '–'),
      fieldBox('C@MPUS-Konto', detail.campus.account || '–'),
      fieldBox('ENV-Zugang', detail.campus.envConfigured ? 'konfiguriert' : 'nicht konfiguriert'),
      fieldBox('Studiengänge', number(detail.counts.studies)),
      fieldBox('Knoten', number(detail.counts.nodes)),
      fieldBox('Kurse', number(detail.counts.courses)),
      fieldBox('Kalendertermine', number(detail.counts.events)),
    ),
    h('div', { className: 'detail-section' },
      h('h3', null, 'C@MPUS-Sitzung'),
      h('div', { className: 'row' },
        h('button', { className: 'btn danger-soft', type: 'button', onClick: () => disconnectCampus(detail) }, icon('unlink'), 'C@MPUS trennen'),
        h('span', { className: 'hint', text: detail.campus.updatedAt ? 'Quelle zuletzt gesetzt ' + date(detail.campus.updatedAt) : 'Noch keine C@MPUS-Quelle gesetzt.' }),
      ),
    ),
    h('div', { className: 'detail-section' },
      sectionHead('Portal-Daten pro Studiengang', 'Einzelne Studiengänge gezielt bereinigen'),
      h('div', { className: 'table-wrap' },
        h('table', { className: 'data', style: { minWidth: '640px' } },
          h('caption', { className: 'sr-only' }, 'Portal-Daten pro Studiengang'),
          h('thead', null, h('tr', null, h('th', null, 'Studiengang'), h('th', { className: 'num' }, 'Knoten'), h('th', { className: 'num' }, 'Kurse'), h('th', null, 'Sync'), h('th', null, ''))),
          h('tbody', null, ...studyRows),
        ),
      ),
    ),
    h('section', { className: 'danger-zone' },
      h('h3', null, 'Portal-Daten löschen'),
      h('p', { className: 'hint', text: 'Diese Aktionen löschen ausschließlich gespeicherte Portal-Daten. Konto, Sitzungen und Plattformverknüpfungen bleiben erhalten.' }),
      h('div', { className: 'row' },
        h('button', { className: 'btn danger small', type: 'button', onClick: () => clearPortal(detail, null) }, icon('database'), 'Alle Portal-Daten löschen'),
        h('button', { className: 'btn secondary small', type: 'button', onClick: () => clearEvents(detail) }, icon('calendar'), 'Kalender leeren'),
        h('button', { className: 'btn secondary small', type: 'button', onClick: () => clearCalls(detail) }, icon('activity'), 'Aufrufe leeren'),
      ),
    ),
  );
}

function renderIliasTab(container, detail) {
  const ilias = detail.ilias || {};
  const dashboard = ilias.dashboard;
  const counts = ilias.counts || {};
  const hasData = Boolean(dashboard || ilias.source);

  const fields = h('div', { className: 'field-grid' },
    fieldBox('Sitzung aktiv', ilias.active ? 'ja, im Speicher' : 'nein'),
    fieldBox('Quelle', ilias.source || '–'),
    fieldBox('ILIAS-Konto', ilias.account || '–'),
    fieldBox('ENV-Sitzung', ilias.envConfigured ? 'konfiguriert' : 'nicht konfiguriert'),
    fieldBox('Gelesen', ilias.fetchedAt ? relative(ilias.fetchedAt) : '–'),
    fieldBox('Mitgliedschaften', number(counts.memberships)),
    fieldBox('Kurse', number(counts.courses)),
    fieldBox('Gruppen', number(counts.groups)),
    fieldBox('Neuigkeiten', number(counts.news)),
    fieldBox('Mails', number(counts.mails) + (counts.unreadMails ? ' · ' + counts.unreadMails + ' ungelesen' : '')),
    fieldBox('To-Dos', number(counts.tasks)),
  );

  const canRead = Boolean(ilias.canRead ?? ilias.active);
  const contentHost = h('div', { className: 'detail-section', hidden: true });
  const browsable = new Set(['crs', 'grp', 'fold', 'cat']);

  const loadContent = async (entry, trail = []) => {
    contentHost.hidden = false;
    contentHost.replaceChildren(loading('ILIAS-Inhalte werden geladen …'));
    try {
      const params = new URLSearchParams({ refId: String(entry.refId), kind: String(entry.kind || 'crs') });
      const data = await api('/v1/admin/users/' + encodeURIComponent(detail.user.id) + '/ilias/content?' + params.toString());
      renderContent(data, trail);
    } catch (error) {
      if (error.code === 'unauthorized') return;
      contentHost.replaceChildren(emptyState('alert', 'Inhalte konnten nicht geladen werden', errorText(error),
        h('button', { className: 'btn secondary', type: 'button', onClick: () => loadContent(entry, trail) }, icon('refresh'), 'Erneut versuchen'),
      ));
    }
  };

  const renderContent = (data, trail = []) => {
    const items = Array.isArray(data.items) ? data.items : [];
    const fileHref = (item) => '/v1/admin/users/' + encodeURIComponent(detail.user.id) + '/ilias/file?refId=' + encodeURIComponent(item.refId);
    const back = () => {
      if (!trail.length) {
        contentHost.hidden = true;
        contentHost.replaceChildren();
        return;
      }
      const parent = trail[trail.length - 1];
      loadContent({ refId: parent.refId, kind: parent.kind }, trail.slice(0, -1));
    };
    const rows = items.length
      ? items.map((item) => h('tr', null,
          h('td', null,
            h('strong', { text: item.title }),
            item.description ? h('div', { className: 'hint', text: item.description }) : null,
          ),
          h('td', null, h('span', { className: 'chip', text: item.type || item.kind || '–' })),
          h('td', null, [item.size, item.pages ? item.pages + ' Seiten' : '', item.date].filter(Boolean).join(' · ') || '–'),
          h('td', { className: 'num' }, item.refId ?? '–'),
          h('td', null, h('div', { className: 'row tight' },
            item.kind === 'file' && item.refId && canRead
              ? h('a', { className: 'btn secondary small', href: fileHref(item) }, icon('download'), 'Datei')
              : null,
            item.refId && browsable.has(item.kind) && canRead
              ? h('button', { className: 'btn secondary small', type: 'button', onClick: () => loadContent({ refId: item.refId, kind: item.kind }, [...trail, data]) }, icon('grid'), 'Öffnen')
              : null,
            item.url && item.kind !== 'file' && !browsable.has(item.kind)
              ? h('a', { className: 'btn secondary small', href: item.url, target: '_blank', rel: 'noreferrer' }, icon('external'), 'ILIAS')
              : null,
          )),
        ))
      : [h('tr', null, h('td', { colspan: '5' }, h('p', { className: 'hint', text: 'Diese Seite enthält keine sichtbaren Objekte.' })))];

    contentHost.replaceChildren(
      sectionHead(data.title || 'ILIAS-Inhalte', [data.description, data.fetchedAt ? 'gelesen ' + relative(data.fetchedAt) : ''].filter(Boolean).join(' · ')),
      h('div', { className: 'row', style: { marginBottom: '10px' } },
        h('button', { className: 'btn secondary small', type: 'button', onClick: back }, icon('chevron-left'), trail.length ? 'Zurück' : 'Schließen'),
        h('a', {
          className: 'btn secondary small',
          href: 'https://ilias3.uni-stuttgart.de/go/' + encodeURIComponent(data.kind || 'crs') + '/' + encodeURIComponent(data.refId),
          target: '_blank',
          rel: 'noreferrer',
        }, icon('external'), 'In ILIAS öffnen'),
        h('span', { className: 'hint', text: items.length + ' Objekte' }),
      ),
      h('div', { className: 'table-wrap' },
        h('table', { className: 'data', style: { minWidth: '880px' } },
          h('caption', { className: 'sr-only' }, 'ILIAS-Inhalte'),
          h('thead', null, h('tr', null,
            h('th', null, 'Titel'), h('th', null, 'Typ'), h('th', null, 'Details'), h('th', { className: 'num' }, 'Ref-ID'), h('th', null, ''),
          )),
          h('tbody', null, ...rows),
        ),
      ),
    );
  };

  const membershipRows = (dashboard?.memberships || []).length
    ? dashboard.memberships.map((item) => h('tr', null,
        h('td', null, item.url ? h('a', { href: item.url, target: '_blank', rel: 'noreferrer', text: item.title }) : h('strong', { text: item.title }), h('div', { className: 'hint', text: item.description || item.group || '–' })),
        h('td', null, h('span', { className: 'chip', text: item.type || item.kind || '–' })),
        h('td', { className: 'num' }, item.refId ?? '–'),
        h('td', null, item.refId && (item.kind === 'crs' || item.kind === 'grp')
          ? h('button', {
              className: 'btn secondary small',
              type: 'button',
              disabled: !canRead,
              onClick: () => loadContent({ refId: item.refId, kind: item.kind }, []),
            }, icon('grid'), 'Inhalte')
          : h('span', { className: 'hint', text: '–' })),
      ))
    : [h('tr', null, h('td', { colspan: '4' }, h('p', { className: 'hint', text: 'Kein Dashboard-Stand gespeichert.' })))];

  const newsList = (dashboard?.news || []).length
    ? h('div', { className: 'timeline' }, ...dashboard.news.map((item) => h('div', { className: 'timeline-item' },
        h('span', { className: 'timeline-dot' }),
        h('div', { className: 'timeline-body' },
          h('strong', null, item.url ? h('a', { href: item.url, target: '_blank', rel: 'noreferrer', text: item.title }) : item.title),
          h('span', { text: item.description || '–' }),
        ),
        h('span', { className: 'timeline-time', text: item.date || '' }),
      )))
    : h('p', { className: 'hint', text: 'Keine Neuigkeiten im gespeicherten Stand.' });

  const mailList = (dashboard?.mails || []).length
    ? h('div', { className: 'timeline' }, ...dashboard.mails.map((item) => h('div', { className: 'timeline-item' },
        h('span', { className: 'timeline-dot' }),
        h('div', { className: 'timeline-body' },
          h('strong', null, item.url ? h('a', { href: item.url, target: '_blank', rel: 'noreferrer', text: item.title }) : item.title),
          h('span', { text: item.properties?.map((entry) => entry.name + ': ' + entry.value).filter(Boolean).join(' · ') || '–' }),
        ),
        h('span', { className: 'timeline-time', text: item.date || '' }),
      )))
    : h('p', { className: 'hint', text: 'Keine Mails im gespeicherten Stand.' });

  const taskList = (dashboard?.tasks || []).length
    ? h('div', { className: 'timeline' }, ...dashboard.tasks.map((item) => h('div', { className: 'timeline-item' },
        h('span', { className: 'timeline-dot' }),
        h('div', { className: 'timeline-body' }, h('strong', { text: item.title }), h('span', { text: item.description || '–' })),
      )))
    : h('p', { className: 'hint', text: 'Keine To-Dos im gespeicherten Stand.' });

  const action = hasData
    ? h('div', { className: 'detail-section' },
        h('h3', null, 'ILIAS-Sitzung'),
        h('div', { className: 'row' },
          ilias.active ? h('button', { className: 'btn danger-soft', type: 'button', onClick: () => disconnectUserIlias(detail) }, icon('unlink'), 'ILIAS trennen') : null,
          h('span', { className: 'hint', text: ilias.fetchedAt ? 'Dashboard zuletzt gelesen ' + date(ilias.fetchedAt) : 'Noch kein Dashboard gelesen.' }),
        ),
      )
    : emptyState('grid', 'Keine ILIAS-Verbindung', 'Dieses Konto hat sich noch nicht im ILIAS-Tab angemeldet.');

  container.append(
    callout('ILIAS liefert kein JSON für Studierende. Der Server meldet sich einmal mit dem Standardformular an und liest danach Dashboard und Kursseiten. Gespeichert werden nur die Sitzung im Speicher und der zuletzt gelesene Dashboard-Stand; Kursinhalte werden live gelesen.', '', 'shield'),
    fields,
    action,
    contentHost,
    h('div', { className: 'detail-section' },
      sectionHead('Kurse und Gruppen', number(counts.memberships) + ' Mitgliedschaften' + (canRead ? ' · Inhalte live lesbar' : ' · keine aktive Sitzung')),
      ...(canRead ? [] : [h('p', { className: 'hint', text: 'Für Kursinhalte und Datei-Downloads ist eine aktive ILIAS-Sitzung nötig. Nach einem Server-Neustart meldet sich das Konto im ILIAS-Tab der App erneut an.' })]),
      h('div', { className: 'table-wrap' },
        h('table', { className: 'data', style: { minWidth: '760px' } },
          h('caption', { className: 'sr-only' }, 'ILIAS-Mitgliedschaften'),
          h('thead', null, h('tr', null, h('th', null, 'Titel'), h('th', null, 'Typ'), h('th', { className: 'num' }, 'Ref-ID'), h('th', null, 'Inhalt'))),
          h('tbody', null, ...membershipRows),
        ),
      ),
    ),
    h('div', { className: 'detail-section' }, h('h3', null, 'Neuigkeiten'), newsList),
    h('div', { className: 'detail-section' }, h('h3', null, 'ILIAS-Postfach'), mailList),
    h('div', { className: 'detail-section' }, h('h3', null, 'To-Dos'), taskList),
  );
}

function renderDataTab(container, detail) {
  if (!detail.studies.length) {
    container.append(emptyState('database', 'Keine Studiengangsdaten', 'Sobald das Konto C@MPUS synchronisiert, erscheinen hier Struktur und Kurse pro Studiengang.'));
    return;
  }
  if (!state.user.data) {
    state.user.data = { studyId: detail.studies[0].studyId, view: 'nodes', query: '', state: '', limit: 50, offset: 0 };
  }
  const control = state.user.data;
  if (!detail.studies.some((study) => study.studyId === control.studyId)) control.studyId = detail.studies[0].studyId;
  const study = detail.studies.find((item) => item.studyId === control.studyId);

  const chips = h('div', { className: 'study-chips' }, ...detail.studies.map((item) => h('button', {
    className: 'study-chip' + (item.studyId === control.studyId ? ' active' : ''), type: 'button',
    onClick: () => { control.studyId = item.studyId; control.offset = 0; renderUserTab(detail); },
  }, item.name)));

  const summary = h('div', { className: 'summary-strip' },
    fieldBox('Knoten', number(study.nodeCount)),
    fieldBox('Abgeschlossen', number(study.completedNodes)),
    fieldBox('In Arbeit', number(study.inProgressNodes)),
    fieldBox('Kurse', number(study.courseCount)),
    fieldBox('Sync-Status', study.nodesComplete ? 'vollständig' : study.nodeCount ? 'teilweise' : 'leer'),
    fieldBox('Zuletzt geladen', study.nodesFetchedAt ? relative(study.nodesFetchedAt) : '–'),
  );

  const search = h('input', { type: 'search', value: control.query, placeholder: control.view === 'nodes' ? 'Knoten durchsuchen …' : 'Kurse durchsuchen …', autocomplete: 'off' });
  const stateSelect = h('select', null,
    h('option', { value: '', selected: !control.state, text: 'Alle Zustände' }),
    h('option', { value: 'completed', selected: control.state === 'completed', text: 'Abgeschlossen' }),
    h('option', { value: 'in_progress', selected: control.state === 'in_progress', text: 'In Arbeit' }),
    h('option', { value: 'open', selected: control.state === 'open', text: 'Offen' }),
  );
  stateSelect.hidden = control.view !== 'nodes';
  const toolbar = h('div', { className: 'row', style: { gap: '8px' } },
    h('div', { className: 'search-field', style: { flex: '1 1 240px' } }, icon('search'), search),
    control.view === 'nodes' ? stateSelect : null,
    h('div', { className: 'segmented' },
      h('button', { className: control.view === 'nodes' ? 'active' : '', type: 'button', onClick: () => { control.view = 'nodes'; control.offset = 0; renderUserTab(detail); } }, 'Struktur'),
      h('button', { className: control.view === 'courses' ? 'active' : '', type: 'button', onClick: () => { control.view = 'courses'; control.offset = 0; renderUserTab(detail); } }, 'Kurse'),
    ),
    h('button', { className: 'btn secondary small', type: 'button', onClick: () => startSync(detail, study) }, icon('zap'), 'Sync starten'),
  );
  const results = h('div', { id: 'data-results' });
  let timer = null;
  search.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => { control.query = search.value.trim(); control.offset = 0; loadUserData(detail); }, 280);
  });
  search.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') { event.preventDefault(); clearTimeout(timer); control.query = search.value.trim(); control.offset = 0; loadUserData(detail); }
  });
  stateSelect.addEventListener('change', () => { control.state = stateSelect.value; control.offset = 0; loadUserData(detail); });

  container.append(chips, summary, toolbar, results);
  loadUserData(detail);
}

async function loadUserData(detail) {
  const holder = $('data-results');
  if (!holder) return;
  const control = state.user.data;
  const seq = (state.user.cache.dataSeq = (state.user.cache.dataSeq || 0) + 1);
  holder.replaceChildren(loading(control.view === 'nodes' ? 'Struktur wird geladen …' : 'Kurse werden geladen …'));
  const params = new URLSearchParams({
    studyId: String(control.studyId),
    limit: String(control.limit),
    offset: String(control.offset),
  });
  if (control.query) params.set('query', control.query);
  if (control.view === 'nodes' && control.state) params.set('state', control.state);
  try {
    const data = await api('/v1/admin/users/' + encodeURIComponent(detail.user.id) + '/' + (control.view === 'nodes' ? 'nodes' : 'courses') + '?' + params.toString());
    if (seq !== state.user.cache.dataSeq || state.user.tab !== 'data' || !$('data-results')) return;
    renderUserDataResults(holder, data, detail);
  } catch (error) {
    if (error.code === 'unauthorized' || seq !== state.user.cache.dataSeq) return;
    holder.replaceChildren(emptyState('alert', 'Daten konnten nicht geladen werden', errorText(error), h('button', { className: 'btn secondary', type: 'button', onClick: () => loadUserData(detail) }, icon('refresh'), 'Erneut versuchen')));
  }
}

function renderUserDataResults(holder, data, detail) {
  const control = state.user.data;
  const view = control.view;
  holder.replaceChildren();
  if (view === 'nodes') {
    const rows = data.nodes.length
      ? data.nodes.map((node) => h('tr', null,
          h('td', null, h('strong', { text: node.name }), h('div', { className: 'hint', text: node.designation || '—' })),
          h('td', null, h('span', { className: 'chip', text: node.elementType || '–' })),
          h('td', null, node.completed ? badge('abgeschlossen', 'ok') : node.inProgress ? badge('in Arbeit', 'warn') : badge('offen', '')),
          h('td', { className: 'num' }, node.id),
          h('td', { className: 'num' }, node.parentId || '–'),
        ))
      : [h('tr', null, h('td', { colspan: '5' }, emptyState('search', 'Keine Knoten gefunden', 'Passe Suche oder Zustand an.')))];
    holder.append(h('div', { className: 'table-wrap' },
      h('table', { className: 'data', style: { minWidth: '760px' } },
        h('caption', { className: 'sr-only' }, 'Curriculums-Knoten'),
        h('thead', null, h('tr', null, h('th', null, 'Element'), h('th', null, 'Typ'), h('th', null, 'Status'), h('th', { className: 'num' }, 'ID'), h('th', { className: 'num' }, 'Eltern-ID'))),
        h('tbody', null, ...rows),
      ),
    ));
  } else {
    const rows = data.courses.length
      ? data.courses.map((course) => h('tr', null,
          h('td', null,
            course.detailUrl ? h('a', { href: course.detailUrl, target: '_blank', rel: 'noreferrer', text: course.title }) : h('strong', { text: course.title }),
            h('div', { className: 'hint', text: course.courseNumber || '—' }),
          ),
          h('td', null, h('span', { className: 'chip', text: course.courseTypeShort || course.courseType || '–' })),
          h('td', null, course.semester || '–'),
          h('td', { style: { maxWidth: '190px' } }, h('span', { className: 'tiny', text: course.lecturers.length ? course.lecturers.join(', ') : '–' })),
          h('td', { className: 'tiny' }, course.roomName || '–'),
          h('td', null, course.registrationStatus ? badge(course.registrationStatus, 'blue') : h('span', { className: 'hint', text: '–' })),
          h('td', null, course.elements.length ? h('div', { className: 'stack' }, ...course.elements.slice(0, 3).map((element) => h('span', { className: 'chip', title: element.elementName, text: String(element.elementId) }))) : h('span', { className: 'hint', text: '–' })),
        ))
      : [h('tr', null, h('td', { colspan: '7' }, emptyState('search', 'Keine Kurse gefunden', 'Passe die Suche an.')))];
    holder.append(h('div', { className: 'table-wrap' },
      h('table', { className: 'data', style: { minWidth: '980px' } },
        h('caption', { className: 'sr-only' }, 'Kurse des Studiengangs'),
        h('thead', null, h('tr', null, h('th', null, 'Kurs'), h('th', null, 'Typ'), h('th', null, 'Semester'), h('th', null, 'Lehrende'), h('th', null, 'Raum'), h('th', null, 'Anmeldung'), h('th', null, 'Elemente'))),
        h('tbody', null, ...rows),
      ),
    ));
  }
  const from = data.total === 0 ? 0 : data.offset + 1;
  const to = Math.min(data.offset + data.limit, data.total);
  const pages = Math.max(1, Math.ceil(data.total / data.limit));
  const page = Math.floor(data.offset / data.limit) + 1;
  holder.append(h('div', { className: 'pager' },
    h('p', { className: 'hint', text: from + '–' + to + ' von ' + number(data.total) + ' · Seite ' + page + ' von ' + pages }),
    h('div', { className: 'row tight' },
      h('button', { className: 'btn secondary small', type: 'button', disabled: data.offset <= 0, 'aria-label': 'Erste Seite', title: 'Erste Seite', onClick: () => { control.offset = 0; loadUserData(detail); } }, icon('chevrons-left')),
      h('button', { className: 'btn secondary small', type: 'button', disabled: data.offset <= 0, onClick: () => { control.offset = Math.max(0, control.offset - control.limit); loadUserData(detail); } }, icon('chevron-left'), 'Zurück'),
      h('button', { className: 'btn secondary small', type: 'button', disabled: data.offset + data.limit >= data.total, onClick: () => { control.offset += control.limit; loadUserData(detail); } }, 'Weiter', icon('chevron-right')),
    ),
  ));
}

function renderCalendarTab(container, detail) {
  if (!state.user.calendar) state.user.calendar = { query: '', limit: 50, offset: 0 };
  const control = state.user.calendar;
  const search = h('input', { type: 'search', value: control.query, placeholder: 'Titel, Ort, Beschreibung oder UID', autocomplete: 'off' });
  const results = h('div', { id: 'calendar-results' });
  let timer = null;
  search.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => { control.query = search.value.trim(); control.offset = 0; loadUserEvents(detail); }, 280);
  });
  search.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') { event.preventDefault(); clearTimeout(timer); control.query = search.value.trim(); control.offset = 0; loadUserEvents(detail); }
  });
  container.append(
    h('div', { className: 'row' },
      h('div', { className: 'search-field', style: { flex: '1 1 260px' } }, icon('search'), search),
      h('button', { className: 'btn secondary', type: 'button', onClick: () => clearEvents(detail) }, icon('calendar'), 'Kalender leeren'),
    ),
    callout('Importierte ICS-Ereignisse aus dem C@MPUS-Kalenderexport. Zeiten werden in Europe/Berlin angezeigt.', '', 'calendar'),
    results,
  );
  loadUserEvents(detail);
}

async function loadUserEvents(detail) {
  const holder = $('calendar-results');
  if (!holder) return;
  const control = state.user.calendar;
  const seq = (state.user.cache.eventSeq = (state.user.cache.eventSeq || 0) + 1);
  holder.replaceChildren(loading('Kalender wird geladen …'));
  const params = new URLSearchParams({ limit: String(control.limit), offset: String(control.offset) });
  if (control.query) params.set('query', control.query);
  try {
    const data = await api('/v1/admin/users/' + encodeURIComponent(detail.user.id) + '/events?' + params.toString());
    if (seq !== state.user.cache.eventSeq || state.user.tab !== 'calendar') return;
    const rows = data.events.length
      ? data.events.map((event) => h('tr', null,
          h('td', { style: { whiteSpace: 'nowrap' } }, h('strong', { text: icsDate(event.dtstart) }), event.dtend ? h('div', { className: 'hint', text: 'bis ' + icsDate(event.dtend) }) : null),
          h('td', null, h('strong', { text: event.summary || '(ohne Titel)' }), h('div', { className: 'hint mono', text: event.uid })),
          h('td', null, event.location || '–'),
          h('td', { style: { maxWidth: '300px' } }, h('span', { className: 'tiny', text: event.description ? event.description.slice(0, 220) + (event.description.length > 220 ? '…' : '') : '–' })),
          h('td', { className: 'tiny' }, relative(event.fetchedAt)),
        ))
      : [h('tr', null, h('td', { colspan: '5' }, emptyState('calendar', 'Keine Termine', 'Für dieses Konto wurden noch keine Kalenderereignisse importiert.')))];
    holder.replaceChildren(h('div', { className: 'table-wrap' },
      h('table', { className: 'data', style: { minWidth: '860px' } },
        h('caption', { className: 'sr-only' }, 'Kalendertermine'),
        h('thead', null, h('tr', null, h('th', null, 'Zeit'), h('th', null, 'Termin'), h('th', null, 'Ort'), h('th', null, 'Beschreibung'), h('th', null, 'Importiert'))),
        h('tbody', null, ...rows),
      ),
    ), userEventsPager(data, detail));
  } catch (error) {
    if (error.code === 'unauthorized' || seq !== state.user.cache.eventSeq) return;
    holder.replaceChildren(emptyState('alert', 'Kalender konnte nicht geladen werden', errorText(error)));
  }
}

function userEventsPager(data, detail) {
  const control = state.user.calendar;
  const from = data.total === 0 ? 0 : data.offset + 1;
  const to = Math.min(data.offset + data.limit, data.total);
  return h('div', { className: 'pager' },
    h('p', { className: 'hint', text: from + '–' + to + ' von ' + number(data.total) }),
    h('div', { className: 'row tight' },
      h('button', { className: 'btn secondary small', type: 'button', disabled: data.offset <= 0, onClick: () => { control.offset = Math.max(0, control.offset - control.limit); loadUserEvents(detail); } }, icon('chevron-left'), 'Zurück'),
      h('button', { className: 'btn secondary small', type: 'button', disabled: data.offset + data.limit >= data.total, onClick: () => { control.offset += control.limit; loadUserEvents(detail); } }, 'Weiter', icon('chevron-right')),
    ),
  );
}

function renderCallsTab(container, detail) {
  if (!state.user.calls) state.user.calls = { query: '', failed: '', limit: 50, offset: 0 };
  const control = state.user.calls;
  const search = h('input', { type: 'search', value: control.query, placeholder: 'Operation oder Meldung', autocomplete: 'off' });
  const failed = h('input', { type: 'checkbox', className: 'checkbox', checked: control.failed === '1' });
  const results = h('div', { id: 'calls-results' });
  let timer = null;
  search.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => { control.query = search.value.trim(); control.offset = 0; loadUserCalls(detail); }, 280);
  });
  failed.addEventListener('change', () => { control.failed = failed.checked ? '1' : ''; control.offset = 0; loadUserCalls(detail); });
  container.append(
    h('div', { className: 'row' },
      h('div', { className: 'search-field', style: { flex: '1 1 260px' } }, icon('search'), search),
      h('label', { className: 'row', style: { fontSize: '12px', fontWeight: '600', color: 'var(--muted)' } }, failed, 'Nur Fehler'),
      h('button', { className: 'btn secondary', type: 'button', onClick: () => clearCalls(detail) }, icon('activity'), 'Protokoll leeren'),
    ),
    callout('Das Aufrufprotokoll enthält nur Operation, Status, Dauer und Fehlermeldung. Zugangsdaten und Antwortinhalte werden nicht gespeichert.', '', 'shield'),
    results,
  );
  loadUserCalls(detail);
}

async function loadUserCalls(detail) {
  const holder = $('calls-results');
  if (!holder) return;
  const control = state.user.calls;
  const seq = (state.user.cache.callSeq = (state.user.cache.callSeq || 0) + 1);
  holder.replaceChildren(loading('Aufrufe werden geladen …'));
  const params = new URLSearchParams({ limit: String(control.limit), offset: String(control.offset) });
  if (control.query) params.set('query', control.query);
  if (control.failed) params.set('failed', control.failed);
  try {
    const data = await api('/v1/admin/users/' + encodeURIComponent(detail.user.id) + '/calls?' + params.toString());
    if (seq !== state.user.cache.callSeq || state.user.tab !== 'calls') return;
    const rows = data.calls.length
      ? data.calls.map((call) => h('tr', { className: call.ok ? '' : 'failed' },
          h('td', { style: { whiteSpace: 'nowrap' } }, h('strong', { text: new Date(call.createdAt).toLocaleTimeString('de-DE') }), h('div', { className: 'hint', text: dateOnly(call.createdAt) })),
          h('td', null, h('span', { className: 'chip mono', text: call.op }), call.studyId ? h('div', { className: 'hint', text: 'Studium ' + call.studyId + (call.elementId ? ' · Element ' + call.elementId : '') }) : null),
          h('td', null, call.ok ? badge('ok', 'ok') : badge('HTTP ' + (call.httpStatus || 'Fehler'), 'danger')),
          h('td', { className: 'num' }, duration(call.elapsedMs)),
          h('td', { style: { maxWidth: '340px' } }, h('span', { className: 'tiny', text: call.message || '–' })),
        ))
      : [h('tr', null, h('td', { colspan: '5' }, emptyState('activity', 'Keine Aufrufe', 'Für dieses Konto wurde noch kein Portal-Aufruf protokolliert.')))];
    holder.replaceChildren(h('div', { className: 'table-wrap' },
      h('table', { className: 'data', style: { minWidth: '760px' } },
        h('caption', { className: 'sr-only' }, 'Portal-Aufrufe'),
        h('thead', null, h('tr', null, h('th', null, 'Zeit'), h('th', null, 'Operation'), h('th', null, 'Status'), h('th', { className: 'num' }, 'Dauer'), h('th', null, 'Meldung'))),
        h('tbody', null, ...rows),
      ),
    ), callsPager(data, detail));
  } catch (error) {
    if (error.code === 'unauthorized' || seq !== state.user.cache.callSeq) return;
    holder.replaceChildren(emptyState('alert', 'Aufrufe konnten nicht geladen werden', errorText(error)));
  }
}

function callsPager(data, detail) {
  const control = state.user.calls;
  const from = data.total === 0 ? 0 : data.offset + 1;
  const to = Math.min(data.offset + data.limit, data.total);
  return h('div', { className: 'pager' },
    h('p', { className: 'hint', text: from + '–' + to + ' von ' + number(data.total) }),
    h('div', { className: 'row tight' },
      h('button', { className: 'btn secondary small', type: 'button', disabled: data.offset <= 0, onClick: () => { control.offset = Math.max(0, control.offset - control.limit); loadUserCalls(detail); } }, icon('chevron-left'), 'Zurück'),
      h('button', { className: 'btn secondary small', type: 'button', disabled: data.offset + data.limit >= data.total, onClick: () => { control.offset += control.limit; loadUserCalls(detail); } }, 'Weiter', icon('chevron-right')),
    ),
  );
}

function renderUserAuditTab(container, detail) {
  container.append(
    h('div', { className: 'detail-section' },
      sectionHead('Aktivität für dieses Konto', 'Die letzten Operator-Aktionen', h('a', { className: 'btn secondary small', href: '#/audit?userId=' + encodeURIComponent(detail.user.id) }, icon('activity'), 'Vollständig')),
      detail.audit.length
        ? h('div', { className: 'timeline' }, ...detail.audit.map((entry) => h('div', { className: 'timeline-item' },
            h('span', { className: 'timeline-dot ' + (DANGEROUS_ACTIONS.has(entry.action) ? 'danger' : '') }),
            h('div', { className: 'timeline-body' },
              h('strong', { text: AUDIT_LABELS[entry.action] || entry.action }),
              h('span', { text: detailText(entry.detail) || '—' }),
            ),
            h('span', { className: 'timeline-time', text: date(entry.createdAt) }),
          )))
        : emptyState('activity', 'Noch keine Aktivität', 'Für dieses Konto wurden noch keine Operator-Aktionen protokolliert.'),
    ),
  );
}

/* -------------------------------------------------------- user actions */
async function savePlatform(userId, platform, body) {
  try {
    const updated = await api('/v1/admin/users/' + encodeURIComponent(userId) + '/platforms', { method: 'POST', body: { platform, ...body } });
    toast(platformName(platform) + ' gespeichert.', 'ok');
    state.user.platformEdit = null;
    applyUserDetail(updated);
  } catch (error) { if (error.code !== 'unauthorized') toast(errorText(error), 'error'); }
}

async function startSync(detail, study) {
  try {
    const job = await api('/v1/admin/users/' + encodeURIComponent(detail.user.id) + '/sync', {
      method: 'POST',
      body: { studyId: study.studyId, includeCourses: true },
    });
    toast('Sync für „' + study.name + '“ gestartet · Job #' + job.jobId + '. Fortschritt unter System.', 'ok');
  } catch (error) { if (error.code !== 'unauthorized') toast(errorText(error), 'error'); }
}

async function touchPlatform(userId, platform) {
  try {
    const updated = await api('/v1/admin/users/' + encodeURIComponent(userId) + '/platforms/' + encodeURIComponent(platform) + '/touch', { method: 'POST', body: {} });
    toast(platformName(platform) + '-Sync markiert.', 'ok');
    applyUserDetail(updated);
  } catch (error) { if (error.code !== 'unauthorized') toast(errorText(error), 'error'); }
}

async function unlinkPlatform(userId, platform) {
  const ok = await confirmAction({
    title: platformName(platform) + ' entfernen?',
    message: 'Die Verknüpfung wird aus dem Konto entfernt. Portal-Daten und Sitzungen bleiben unverändert.',
    confirmLabel: 'Entfernen',
  });
  if (!ok) return;
  try {
    const updated = await api('/v1/admin/users/' + encodeURIComponent(userId) + '/platforms/' + encodeURIComponent(platform), { method: 'DELETE' });
    toast(platformName(platform) + ' entfernt.', 'ok');
    applyUserDetail(updated);
  } catch (error) { if (error.code !== 'unauthorized') toast(errorText(error), 'error'); }
}

async function revokeSession(userId, sessionId) {
  const ok = await confirmAction({ title: 'Sitzung widerrufen?', message: 'Das Token dieser Sitzung wird sofort ungültig. Andere Sitzungen bleiben aktiv.', confirmLabel: 'Widerrufen' });
  if (!ok) return;
  try {
    const updated = await api('/v1/admin/users/' + encodeURIComponent(userId) + '/sessions/' + encodeURIComponent(sessionId), { method: 'DELETE' });
    toast('Sitzung widerrufen.', 'ok');
    applyUserDetail(updated);
  } catch (error) { if (error.code !== 'unauthorized') toast(errorText(error), 'error'); }
}

async function revokeAllSessions(detail) {
  const active = detail.sessions.filter((session) => session.state === 'active').length;
  if (!active) return;
  const ok = await confirmAction({
    title: 'Alle Sitzungen widerrufen?',
    message: 'Alle ' + active + ' aktiven App-Sitzungen dieses Kontos werden sofort ungültig. Das Konto muss sich neu anmelden.',
    confirmLabel: 'Alle widerrufen',
  });
  if (!ok) return;
  try {
    const updated = await api('/v1/admin/users/' + encodeURIComponent(detail.user.id) + '/sessions/revoke', { method: 'POST', body: {} });
    toast('Alle Sitzungen widerrufen.', 'ok');
    applyUserDetail(updated);
  } catch (error) { if (error.code !== 'unauthorized') toast(errorText(error), 'error'); }
}

async function disconnectCampus(detail) {
  const ok = await confirmAction({
    title: 'C@MPUS-Zugang trennen?',
    message: 'Der gespeicherte C@MPUS-Zugang wird aus dem Server-Speicher entfernt. Die Portal-Daten bleiben erhalten; für neue Portal-Aufrufe muss sich das Konto neu verbinden.',
    confirmLabel: 'C@MPUS trennen',
  });
  if (!ok) return;
  try {
    const updated = await api('/v1/admin/users/' + encodeURIComponent(detail.user.id) + '/campus/disconnect', { method: 'POST', body: {} });
    toast('C@MPUS getrennt.', 'ok');
    applyUserDetail(updated);
  } catch (error) { if (error.code !== 'unauthorized') toast(errorText(error), 'error'); }
}

async function disconnectUserIlias(detail) {
  const ok = await confirmAction({
    title: 'ILIAS-Sitzung trennen?',
    message: 'Die PHPSESSID dieses Kontos wird aus dem Server-Speicher entfernt. Der gespeicherte Dashboard-Stand bleibt erhalten; ein neuer Abruf braucht eine neue Anmeldung.',
    confirmLabel: 'ILIAS trennen',
  });
  if (!ok) return;
  try {
    const updated = await api('/v1/admin/users/' + encodeURIComponent(detail.user.id) + '/ilias/disconnect', { method: 'POST', body: {} });
    toast('ILIAS getrennt.', 'ok');
    applyUserDetail(updated);
  } catch (error) { if (error.code !== 'unauthorized') toast(errorText(error), 'error'); }
}

async function clearPortal(detail, studyId) {
  const ok = await confirmAction({
    title: studyId ? 'Daten dieses Studiengangs löschen?' : 'Alle Portal-Daten löschen?',
    message: studyId
      ? 'Knoten, Kurse und Sync-Zustand dieses Studiengangs werden unwiderruflich gelöscht. Andere Studiengänge bleiben erhalten.'
      : 'Knoten, Kurse, Studiengangs-Snapshots, Kalendertermine und Aufrufprotokolle dieses Kontos werden unwiderruflich gelöscht. Konto, Sitzungen und Plattformen bleiben erhalten.',
    confirmLabel: 'Daten löschen',
    requireText: studyId ? null : 'LÖSCHEN',
  });
  if (!ok) return;
  try {
    const updated = await api('/v1/admin/users/' + encodeURIComponent(detail.user.id) + '/portal/clear', { method: 'POST', body: studyId ? { studyId } : {} });
    toast(studyId ? 'Studiengangsdaten gelöscht.' : 'Portal-Daten gelöscht.', 'ok');
    applyUserDetail(updated);
  } catch (error) { if (error.code !== 'unauthorized') toast(errorText(error), 'error'); }
}

async function clearStudy(userId, study) {
  const detail = state.user.detail;
  if (!detail || detail.user.id !== userId) return;
  await clearPortal(detail, study.studyId);
}

async function clearEvents(detail) {
  const ok = await confirmAction({
    title: 'Kalenderdaten löschen?',
    message: 'Alle ' + number(detail.counts.events) + ' importierten Kalendertermine dieses Kontos werden gelöscht.',
    confirmLabel: 'Kalender leeren',
  });
  if (!ok) return;
  try {
    const updated = await api('/v1/admin/users/' + encodeURIComponent(detail.user.id) + '/portal/events/clear', { method: 'POST', body: {} });
    toast('Kalender geleert.', 'ok');
    applyUserDetail(updated);
  } catch (error) { if (error.code !== 'unauthorized') toast(errorText(error), 'error'); }
}

async function clearCalls(detail) {
  const ok = await confirmAction({
    title: 'Aufrufprotokoll löschen?',
    message: 'Alle ' + number(detail.counts.calls) + ' protokollierten Portal-Aufrufe dieses Kontos werden gelöscht. Der Datenbestand bleibt erhalten.',
    confirmLabel: 'Protokoll leeren',
  });
  if (!ok) return;
  try {
    const updated = await api('/v1/admin/users/' + encodeURIComponent(detail.user.id) + '/portal/calls/clear', { method: 'POST', body: {} });
    toast('Aufrufprotokoll geleert.', 'ok');
    applyUserDetail(updated);
  } catch (error) { if (error.code !== 'unauthorized') toast(errorText(error), 'error'); }
}

async function deleteUser(detail) {
  const user = detail.user;
  const ok = await confirmAction({
    title: 'Konto endgültig löschen?',
    message: 'Konto, Sitzungen, Plattformen, C@MPUS-Zugang und alle Portal-Daten von „' + user.account + '“ werden unwiderruflich gelöscht.',
    confirmLabel: 'Konto löschen',
    requireText: user.account,
  });
  if (!ok) return;
  try {
    await api('/v1/admin/users/' + encodeURIComponent(user.id), { method: 'DELETE' });
    toast('Konto gelöscht.', 'ok');
    state.user = { id: null, detail: null, tab: 'overview', cache: {}, data: null, calendar: null, calls: null, platformEdit: null };
    location.hash = state.lastUsersHash;
  } catch (error) { if (error.code !== 'unauthorized') toast(errorText(error), 'error'); }
}

