/** Overview cards and account activity summary. */

import { api } from '../assets/api.mjs';
import { setPage } from '../assets/auth-ui.mjs';
import { AUDIT_LABELS, DANGEROUS_ACTIONS, PLATFORMS } from '../assets/constants.mjs';
import { $, h } from '../assets/dom.mjs';
import { detailText, modeName, number, platformName, relative } from '../assets/format.mjs';
import { icon } from '../assets/icons.mjs';
import { state } from '../assets/runtime.mjs';
import { avatar, badge, barList, emptyState, fieldBox, loading, sectionHead } from '../assets/ui.mjs';

export async function renderOverview() {
  setPage('Übersicht', 'Konten, Daten und Betrieb im Blick');
  const view = $('view');
  view.replaceChildren(loading('Übersicht wird geladen …'));
  const requests = [
    api('/v1/admin/users?sort=recent&limit=6'),
    api('/v1/admin/audit?limit=6'),
  ];
  if (!state.overview) requests.push(api('/v1/admin/overview'));
  const [recent, audit, fetchedStats] = await Promise.all(requests);
  const stats = state.overview || fetchedStats;
  state.overview = stats;
  state.audit.actions = audit.actions || [];
  const usersBadge = $('nav-users-count');
  usersBadge.textContent = number(stats.users);
  usersBadge.hidden = false;
  const deviceBadge = $('nav-devices-count');
  if (deviceBadge) { deviceBadge.textContent = number(stats.devices || 0); deviceBadge.hidden = false; }

  const config = stats.config || {};
  const campusReady = Boolean(config.campus?.tokenConfigured || config.campus?.sessionCookieConfigured);
  const health = [
    ['Admin', true],
    ['C@MPUS .env', campusReady],
    ['ILIAS .env', Boolean(config.ilias?.configured)],
    ['SIAM OIDC', Boolean(config.oidc?.configured)],
    ['UniMail', Boolean(config.mail?.configured)],
    ['Assistent', Boolean(config.assistant?.configured)],
  ];

  const platformStats = new Map();
  for (const item of stats.platforms || []) {
    const entry = platformStats.get(item.platform) || { count: 0, connected: 0, linked: 0 };
    entry.count += item.count;
    if (item.status === 'connected') entry.connected += item.count;
    else entry.linked += item.count;
    platformStats.set(item.platform, entry);
  }
  const platformItems = PLATFORMS.map((id) => ({
    label: platformName(id) + (platformStats.get(id)?.connected ? ' · ' + platformStats.get(id).connected + ' verbunden' : ''),
    count: platformStats.get(id)?.count || 0,
  }));

  const modeItems = (stats.modes || []).map((item) => ({ label: modeName(item.mode), count: item.count }));
  const campusSourceItems = [
    ...(stats.campus || []).map((item) => ({ label: item.source === 'env' ? '.env-Zugang' : 'Browser-Zugang', count: item.count })),
    { label: 'Im Speicher aktiv', count: stats.credentialsActive || 0 },
  ];
  if (!campusSourceItems.some((item) => item.count)) campusSourceItems.push({ label: 'Kein Zugang', count: stats.users });

  const kpis = [
    { symbol: 'users', value: stats.users, label: 'Konten', sub: stats.recentUsers + ' neu in 7 Tagen', href: '#/users', tone: '' },
    { symbol: 'monitor', value: stats.activeSessions, label: 'Aktive Sitzungen', sub: stats.usersWithSessions + ' Konten angemeldet', href: '#/users?activity=active', tone: 'cyan' },
    { symbol: 'smartphone', value: stats.devicesActive || 0, label: 'Web-Geräte', sub: (stats.devicesPending || 0) + ' warten auf Scan', href: '#/devices', tone: 'blue' },
    { symbol: 'key', value: stats.credentialsActive, label: 'C@MPUS im Speicher', sub: 'nur bis zum Server-Neustart', href: '#/users?credential=active', tone: 'green' },
    { symbol: 'grid', value: stats.iliasActive || 0, label: 'ILIAS im Speicher', sub: (stats.data?.iliasSources || 0) + ' verknüpfte Konten', href: '#/ilias', tone: 'purple' },
    { symbol: 'list', value: stats.portalNodes, label: 'Portal-Knoten', sub: stats.completedNodes + ' abgeschlossen · ' + stats.inProgressNodes + ' in Arbeit', href: '#/users?data=portal', tone: 'purple' },
    { symbol: 'grid', value: stats.portalCourses, label: 'Kurse', sub: 'aus dem C@MPUS-Export', href: '#/users?data=courses', tone: 'amber' },
    { symbol: 'calendar', value: stats.calendarEvents, label: 'Kalendertermine', sub: 'gespeicherte ICS-Ereignisse', href: '#/users?data=events', tone: 'cyan' },
    { symbol: 'activity', value: stats.portalCalls, label: 'Portal-Aufrufe', sub: 'protokollierte Hops', href: '#/users?data=calls', tone: 'red' },
    { symbol: 'users', value: stats.recentUsersMonth, label: 'Neu in 30 Tagen', sub: stats.activeUsersWeek + ' aktiv in 7 Tagen', href: '#/users?sort=created', tone: 'green' },
  ];

  const kpiGrid = h('div', { className: 'kpi-grid' }, ...kpis.map((item) => h('a', { className: 'kpi ' + item.tone, href: item.href },
    h('div', { className: 'kpi-top' }, h('span', { className: 'kpi-icon' }, icon(item.symbol, 17)), h('span', { className: 'kpi-arrow' }, icon('arrow-right', 15))),
    h('div', { className: 'value', text: number(item.value) }),
    h('div', { className: 'label', text: item.label }),
    h('div', { className: 'sub', text: item.sub }),
  )));

  const recentList = recent.users.length
    ? h('div', { className: 'timeline' }, ...recent.users.map((user) => h('a', { className: 'timeline-item', href: '#/users/' + encodeURIComponent(user.id) + '/overview', style: { textDecoration: 'none', color: 'inherit' } },
        avatar(user.name, user.account, 'sm'),
        h('div', { className: 'timeline-body' },
          h('strong', { text: user.name || user.account }),
          h('span', { text: user.account + (user.email ? ' · ' + user.email : '') }),
        ),
        h('div', { className: 'row tight' },
          badge(modeName(user.mode), user.mode === 'campus' ? 'blue' : ''),
          user.campusActive ? badge('C@MPUS aktiv', 'ok') : null,
        ),
      )))
    : emptyState('users', 'Noch keine Konten', 'Sobald sich jemand anmeldet, erscheint das Konto hier.');

  const auditList = audit.entries.length
    ? h('div', { className: 'timeline' }, ...audit.entries.map((entry) => h('div', { className: 'timeline-item' },
        h('span', { className: 'timeline-dot ' + (DANGEROUS_ACTIONS.has(entry.action) ? 'danger' : '') }),
        h('div', { className: 'timeline-body' },
          h('strong', { text: AUDIT_LABELS[entry.action] || entry.action }),
          h('span', { text: [entry.account, detailText(entry.detail)].filter(Boolean).join(' · ') || '—' }),
        ),
        h('span', { className: 'timeline-time', text: relative(entry.createdAt) }),
      )))
    : emptyState('activity', 'Noch keine Aktionen', 'Jede Änderung im Dashboard wird hier protokolliert.');

  view.replaceChildren(
    kpiGrid,
    h('div', { className: 'overview-grid' },
      h('div', { className: 'overview-col' },
        h('section', { className: 'card section-card' }, sectionHead('Zuletzt aktive Konten', 'Neueste Anmeldungen und Konten', h('a', { className: 'btn secondary small', href: '#/users' }, 'Alle Konten', icon('arrow-right'))), recentList),
        h('section', { className: 'card section-card' }, sectionHead('Verteilung', 'Plattformverknüpfungen, Anmeldemodi und C@MPUS-Quellen'),
          h('div', { className: 'overview-grid', style: { gap: '24px' } },
            h('div', null, h('h3', { className: 'card-title', style: { marginBottom: '10px' } }, 'Plattformen'), barList(platformItems)),
            h('div', null, h('h3', { className: 'card-title', style: { marginBottom: '10px' } }, 'Anmeldemodus'), barList(modeItems.length ? modeItems : [{ label: 'Keine Konten', count: 0 }])),
          ),
          h('hr', { className: 'divider' }),
          h('div', null, h('h3', { className: 'card-title', style: { marginBottom: '10px' } }, 'C@MPUS-Quelle'), barList(campusSourceItems)),
        ),
      ),
      h('div', { className: 'overview-col' },
        h('section', { className: 'card section-card' }, sectionHead('Letzte Aktionen', 'Audit-Protokoll des Operators', h('a', { className: 'btn secondary small', href: '#/audit' }, 'Alle', icon('arrow-right'))), auditList),
        h('section', { className: 'card section-card' }, sectionHead('System', 'Konfiguration und Laufzeit', h('a', { className: 'btn secondary small', href: '#/system' }, 'Details', icon('arrow-right'))),
          h('div', { className: 'health-strip' }, ...health.map(([label, ok]) => h('span', { className: 'health-chip ' + (ok ? 'ok' : 'warn') }, h('span', { className: 'dot' }), label))),
          h('div', { className: 'field-grid' },
            fieldBox('Datenbank', number(stats.data?.nodes || 0) + ' Knoten'),
            fieldBox('ILIAS', number(stats.data?.iliasSnapshots || 0) + ' Stände'),
            fieldBox('Kalender', number(stats.data?.events || 0) + ' Termine'),
            fieldBox('Audit', number(stats.data?.audit || 0) + ' Einträge'),
            fieldBox('Modell', config.assistant?.model || '–'),
          ),
        ),
      ),
    ),
  );
}

