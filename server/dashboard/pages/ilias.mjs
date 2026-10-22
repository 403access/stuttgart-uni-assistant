/** ILIAS connections, parsed dashboard counts, and session control. */

import { api, errorText } from '../assets/api.mjs';
import { setPage } from '../assets/auth-ui.mjs';
import { $, h } from '../assets/dom.mjs';
import { number, relative } from '../assets/format.mjs';import { icon } from '../assets/icons.mjs';
import { state } from '../assets/runtime.mjs';
import { avatar, badge, callout, confirmAction, emptyState, fieldBox, loading, sectionHead, toast } from '../assets/ui.mjs';

export async function renderIliasPage() {
  setPage('ILIAS', 'Verbindungen, Kurse und ungelesene Hinweise');
  const view = $('view');
  view.replaceChildren(loading('ILIAS-Daten werden geladen …'));
  try {
    const data = await api('/v1/admin/ilias');
    state.ilias = data;
    const totals = data.totals || {};
    const kpis = [
      { label: 'Aktive Sitzungen', value: data.activeSessions || 0, sub: 'nur bis zum Server-Neustart', symbol: 'key', tone: 'green' },
      { label: 'Verknüpfte Konten', value: data.users.length, sub: 'mit ILIAS-Quelle', symbol: 'users', tone: 'blue' },
      { label: 'Kurse & Gruppen', value: totals.memberships || 0, sub: (totals.courses || 0) + ' Kurse · ' + (totals.groups || 0) + ' Gruppen', symbol: 'grid', tone: 'purple' },
      { label: 'Neuigkeiten', value: totals.news || 0, sub: 'aus dem Dashboard', symbol: 'activity', tone: 'amber' },
      { label: 'Mails', value: totals.mails || 0, sub: (totals.unreadMails || 0) + ' ungelesen', symbol: 'mail', tone: 'cyan' },
      { label: 'To-Dos', value: totals.tasks || 0, sub: 'offene Aufgaben', symbol: 'list', tone: 'red' },
    ];
    const kpiGrid = h('div', { className: 'kpi-grid' }, ...kpis.map((item) => h('div', { className: 'kpi ' + item.tone },
      h('div', { className: 'kpi-top' }, h('span', { className: 'kpi-icon' }, icon(item.symbol, 17))),
      h('div', { className: 'value', text: number(item.value) }),
      h('div', { className: 'label', text: item.label }),
      h('div', { className: 'sub', text: item.sub }),
    )));

    const rows = data.users.length
      ? data.users.map((user) => h('tr', null,
          h('td', null,
            h('a', { className: 'who', href: '#/users/' + encodeURIComponent(user.id) + '/ilias' },
              avatar(user.name, user.account, 'sm'),
              h('div', { className: 'who-text' }, h('strong', { text: user.name || user.account }), h('span', { text: user.account + (user.iliasAccount ? ' · ' + user.iliasAccount : '') })),
            ),
          ),
          h('td', null, user.active ? badge('aktiv im Speicher', 'ok') : user.canRead ? badge('.env lesbar', 'warn') : badge('getrennt', '')),
          h('td', { className: 'num' }, number(user.counts.memberships)),
          h('td', { className: 'num' }, number(user.counts.courses)),
          h('td', { className: 'num' }, number(user.counts.news)),
          h('td', { className: 'num' }, number(user.counts.mails) + (user.counts.unreadMails ? ' · ' + user.counts.unreadMails + ' neu' : '')),
          h('td', null, user.fetchedAt ? relative(user.fetchedAt) : '–'),
          h('td', null, h('div', { className: 'row tight' },
            h('a', { className: 'btn secondary small', href: '#/users/' + encodeURIComponent(user.id) + '/ilias' }, 'Öffnen'),
            user.active ? h('button', { className: 'btn danger-soft small', type: 'button', onClick: () => disconnectIlias(user) }, icon('unlink'), 'Trennen') : null,
          )),
        ))
      : [h('tr', null, h('td', { colspan: '8' }, emptyState('grid', 'Noch keine ILIAS-Verbindung', 'Sobald sich ein Konto im ILIAS-Tab verbindet, erscheinen hier Kurse, Neuigkeiten und Mails.')))];

    const sources = data.sources.length
      ? h('div', { className: 'field-grid' }, ...data.sources.map((item) => fieldBox(item.source === 'env' ? '.env-Sitzung' : 'Browser-Anmeldung', number(item.count))))
      : null;

    view.replaceChildren(
      h('div', { className: 'page-intro' },
        h('div', null,
          h('div', { className: 'eyebrow' }, 'Plattform'),
          h('h2', { text: 'ILIAS' }),
          h('p', { text: 'Standard-Anmeldung über HTTPS, Dashboard-Blöcke und live gelesene Kursinhalte pro Konto.' }),
        ),
        h('div', { className: 'health-strip' },
          h('span', { className: 'health-chip ' + (data.configured ? 'ok' : 'warn') }, h('span', { className: 'dot' }), data.configured ? 'ENV-Sitzung gesetzt' : 'keine ENV-Sitzung'),
          h('span', { className: 'health-chip ok' }, h('span', { className: 'dot' }), data.activeSessions + ' aktiv'),
        )),
      kpiGrid,
      callout('Das Passwort wird nur für den einen Anmelde-POST verwendet und nicht gespeichert. Im Speicher bleibt ausschließlich die PHPSESSID; die Tabelle zeigt den zuletzt gelesenen Dashboard-Stand.', '', 'shield'),
      callout('Kursinhalte werden nicht gespeichert. Unter „Öffnen“ liest der Reiter ILIAS eines Kontos die Seite live über dessen Sitzung, zeigt Unterordner und Gruppen und lädt Dateien über den Server herunter.', '', 'grid'),
      sources ? h('section', { className: 'card section-card' }, sectionHead('Quellen', 'Woher die ILIAS-Sitzung stammt'), sources) : null,
      h('section', { className: 'card section-card' },
        sectionHead('Konten', data.users.length + ' mit ILIAS-Daten', h('button', { className: 'btn secondary small', type: 'button', onClick: () => renderIliasPage() }, icon('refresh'), 'Aktualisieren')),
        h('div', { className: 'table-wrap' },
          h('table', { className: 'data', style: { minWidth: '980px' } },
            h('caption', { className: 'sr-only' }, 'ILIAS-Verbindungen'),
            h('thead', null, h('tr', null,
              h('th', null, 'Konto'), h('th', null, 'Sitzung'), h('th', { className: 'num' }, 'Mitgliedschaften'),
              h('th', { className: 'num' }, 'Kurse'), h('th', { className: 'num' }, 'News'), h('th', { className: 'num' }, 'Mails'),
              h('th', null, 'Gelesen'), h('th', null, ''),
            )),
            h('tbody', null, ...rows),
          ),
        ),
      ),
    );
  } catch (error) {
    if (error.code === 'unauthorized') return;
    view.replaceChildren(emptyState('alert', 'ILIAS-Daten konnten nicht geladen werden', errorText(error), h('button', { className: 'btn secondary', type: 'button', onClick: () => renderIliasPage() }, icon('refresh'), 'Erneut versuchen')));
  }
}

async function disconnectIlias(user) {
  const ok = await confirmAction({
    title: 'ILIAS-Sitzung trennen?',
    message: 'Die Sitzung von „' + (user.name || user.account) + '“ wird aus dem Server-Speicher entfernt. Der gespeicherte Dashboard-Stand bleibt sichtbar; ein neuer Abruf braucht eine neue Anmeldung.',
    confirmLabel: 'ILIAS trennen',
  });
  if (!ok) return;
  try {
    await api('/v1/admin/users/' + encodeURIComponent(user.id) + '/ilias/disconnect', { method: 'POST', body: {} });
    toast('ILIAS-Sitzung getrennt.', 'ok');
    await renderIliasPage();
  } catch (error) {
    if (error.code !== 'unauthorized') toast(errorText(error), 'error');
  }
}
