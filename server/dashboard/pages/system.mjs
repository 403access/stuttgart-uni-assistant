/** Runtime, configuration, sync jobs, and mail status. */

import { api, errorText } from '../assets/api.mjs';
import { setPage } from '../assets/auth-ui.mjs';
import { $, h } from '../assets/dom.mjs';
import { bytes, date, number, relative, uptime } from '../assets/format.mjs';
import { icon } from '../assets/icons.mjs';
import { state } from '../assets/runtime.mjs';
import { badge, confirmAction, emptyState, fieldBox, loading, sectionHead, sessionBadge, toast } from '../assets/ui.mjs';

export async function renderSystemPage() {
  setPage('System', 'Konfiguration, Datenbank, Synchronisation und Wartung');
  const view = $('view');
  view.replaceChildren(loading('Systemzustand wird geladen …'));
  const data = await api('/v1/admin/system');
  state.system = data;
  renderSystem(data);
}

function configRow(label, ok, detail) {
  return h('div', { className: 'row', style: { justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--line)' } },
    h('div', { style: { display: 'grid', gap: '1px', minWidth: 0 } },
      h('strong', { text: label, style: { fontSize: '12.5px' } }),
      detail ? h('span', { className: 'hint', text: detail }) : null,
    ),
    ok ? badge('bereit', 'ok') : badge('nicht konfiguriert', 'warn'),
  );
}

function renderSystem(data) {
  const view = $('view');
  const runtime = data.runtime;
  const config = data.config;
  const db = data.database;
  const campus = config.campus || {};
  const oidc = config.oidc || {};
  const mail = config.mail || {};
  const jobs = data.syncJobs || [];

  const jobsCard = jobs.length
    ? h('div', { className: 'table-wrap' }, h('table', { className: 'data', style: { minWidth: '760px' } },
        h('caption', { className: 'sr-only' }, 'Synchronisations-Jobs'),
        h('thead', null, h('tr', null, h('th', null, 'Job'), h('th', null, 'Konto'), h('th', null, 'Studium'), h('th', null, 'Status'), h('th', { className: 'num' }, 'Fortschritt'), h('th', null, 'Zeit'), h('th', null, ''))),
        h('tbody', null, ...jobs.map((job) => h('tr', null,
          h('td', null, h('strong', { className: 'mono', text: '#' + job.jobId }), h('div', { className: 'hint', text: job.includeCourses ? 'mit Kursen' : 'nur Struktur' })),
          h('td', null, job.userId ? h('a', { href: '#/users/' + encodeURIComponent(job.userId) + '/overview', text: job.account || job.userId }) : h('span', { className: 'muted', text: 'legacy' })),
          h('td', null, String(job.studyId || '–')),
          h('td', null, sessionBadge(job.state), job.error ? h('div', { className: 'hint', text: job.error }) : null, job.retries ? h('div', { className: 'hint', text: job.retries + ' Wiederholungen' }) : null, job.failedIds.length ? h('div', { className: 'hint', text: job.failedIds.length + ' Elemente fehlgeschlagen' }) : null),
          h('td', { className: 'num' }, number(job.nodeCount) + ' Knoten' + (job.includeCourses ? ' · ' + number(job.courseCount) + ' Kurse' : '')),
          h('td', { className: 'tiny' }, date(job.startedAt), job.finishedAt ? h('div', { className: 'hint', text: 'fertig ' + relative(job.finishedAt) }) : null),
          h('td', null, job.state === 'running' || job.state === 'cancelling' ? h('button', { className: 'btn danger-soft small', type: 'button', onClick: () => cancelJob(job) }, 'Abbrechen') : null),
        ))),
      ))
    : emptyState('zap', 'Keine Synchronisationen', 'Aktive und abgeschlossene C@MPUS-Sync-Jobs erscheinen hier. Nach einem Server-Neustart ist der Verlauf leer.');

  view.replaceChildren(
    h('div', { className: 'page-intro' },
      h('div', null, h('div', { className: 'eyebrow' }, 'Betrieb'), h('h2', { text: 'Systemzustand' }), h('p', { text: 'Laufzeit, Konfiguration und Datenbank auf einen Blick.' })),
      h('div', { className: 'row' },
        h('button', { className: 'btn secondary', type: 'button', onClick: () => renderSystemPage() }, icon('refresh'), 'Neu laden'),
        h('a', { className: 'btn secondary', href: '#/audit' }, icon('activity'), 'Aktivität'),
      ),
    ),
    h('div', { className: 'kpi-grid' },
      h('article', { className: 'kpi green' }, h('div', { className: 'kpi-top' }, h('span', { className: 'kpi-icon' }, icon('clock', 17))), h('div', { className: 'value', text: uptime(runtime.uptimeSeconds) }), h('div', { className: 'label', text: 'Laufzeit' }), h('div', { className: 'sub', text: 'seit ' + date(runtime.startedAt) })),
      h('article', { className: 'kpi cyan' }, h('div', { className: 'kpi-top' }, h('span', { className: 'kpi-icon' }, icon('monitor', 17))), h('div', { className: 'value', text: bytes(runtime.memory.rss) }), h('div', { className: 'label', text: 'Arbeitsspeicher' }), h('div', { className: 'sub', text: 'Heap ' + bytes(runtime.memory.heapUsed) + ' / ' + bytes(runtime.memory.heapTotal) })),
      h('article', { className: 'kpi purple' }, h('div', { className: 'kpi-top' }, h('span', { className: 'kpi-icon' }, icon('database', 17))), h('div', { className: 'value', text: bytes(db.sizeBytes) }), h('div', { className: 'label', text: 'Datenbank' }), h('div', { className: 'sub', text: number(db.counts.audit) + ' Audit-Einträge' })),
      h('article', { className: 'kpi amber' }, h('div', { className: 'kpi-top' }, h('span', { className: 'kpi-icon' }, icon('zap', 17))), h('div', { className: 'value', text: String(jobs.length) }), h('div', { className: 'label', text: 'Sync-Jobs' }), h('div', { className: 'sub', text: jobs.filter((job) => job.state === 'running').length + ' laufen gerade' })),
    ),
    h('div', { className: 'overview-grid' },
      h('div', { className: 'overview-col' },
        h('section', { className: 'card section-card' },
          sectionHead('Konfiguration', 'Umgebungsvariablen und Prozessstatus'),
          configRow('Dashboard-Token', Boolean(config.admin?.configured), 'DASHBOARD_TOKEN'),
          configRow('Assistent', Boolean(config.assistant?.configured), 'XAI_API_KEY · Modell ' + (config.assistant?.model || '–')),
          configRow('C@MPUS .env', Boolean(campus.tokenConfigured || campus.sessionCookieConfigured), [campus.tokenConfigured ? 'Bearer-Token' : null, campus.sessionCookieConfigured ? 'Session-Cookie' : null].filter(Boolean).join(' + ') || 'kein .env-Zugang'),
          configRow('SIAM / OIDC', Boolean(oidc.configured), oidc.issuer || 'OIDC_ISSUER nicht gesetzt'),
          configRow('UniMail', Boolean(mail.configured), mail.account ? mail.account + (mail.address ? ' · ' + mail.address : '') : 'IMAP nicht verbunden'),
          h('div', { className: 'row', style: { paddingTop: '10px' } },
            h('button', { className: 'btn danger-soft small', type: 'button', onClick: () => disconnectMail() }, icon('mail'), 'UniMail trennen'),
            h('span', { className: 'hint', text: 'Trennt die prozessweite IMAP-Sitzung für alle Nutzer.' }),
          ),
        ),
        h('section', { className: 'card section-card' },
          sectionHead('Datenbank', 'SQLite-Datei und Tabellen'),
          h('div', { className: 'field-grid' },
            fieldBox('Pfad', h('span', { className: 'mono tiny', text: db.path })),
            fieldBox('Größe', bytes(db.sizeBytes)),
            fieldBox('Konten', number(db.counts.users)),
            fieldBox('Sitzungen', number(db.counts.sessions)),
            fieldBox('Geräte', number(db.counts.devices)),
            fieldBox('Plattformen', number(db.counts.platforms)),
            fieldBox('C@MPUS-Quellen', number(db.counts.campusSources)),
            fieldBox('Knoten', number(db.counts.nodes)),
            fieldBox('Kurse', number(db.counts.courses)),
            fieldBox('Termine', number(db.counts.events)),
            fieldBox('Aufrufe', number(db.counts.calls)),
            fieldBox('Audit', number(db.counts.audit)),
          ),
        ),
      ),
      h('div', { className: 'overview-col' },
        h('section', { className: 'card section-card' },
          sectionHead('Synchronisation', 'C@MPUS-Sync-Jobs im Arbeitsspeicher'),
          jobsCard,
        ),
        h('section', { className: 'card section-card' },
          sectionHead('Laufzeit', 'Prozess und Umgebung'),
          h('div', { className: 'field-grid' },
            fieldBox('Node.js', runtime.node),
            fieldBox('PID', String(runtime.pid)),
            fieldBox('Gestartet', date(runtime.startedAt)),
            fieldBox('Uptime', uptime(runtime.uptimeSeconds)),
            fieldBox('RSS', bytes(runtime.memory.rss)),
            fieldBox('Heap', bytes(runtime.memory.heapUsed) + ' / ' + bytes(runtime.memory.heapTotal)),
          ),
        ),
      ),
    ),
  );
}

async function cancelJob(job) {
  const ok = await confirmAction({
    title: 'Synchronisation abbrechen?',
    message: 'Job #' + job.jobId + ' für Studium ' + job.studyId + ' wird abgebrochen. Bereits geladene Daten bleiben erhalten.',
    confirmLabel: 'Job abbrechen',
    tone: 'warn',
  });
  if (!ok) return;
  try {
    await api('/v1/admin/sync-jobs/' + encodeURIComponent(job.jobId), { method: 'DELETE' });
    toast('Synchronisation abgebrochen.', 'ok');
    await renderSystemPage();
  } catch (error) { if (error.code !== 'unauthorized') toast(errorText(error), 'error'); }
}

async function disconnectMail() {
  const ok = await confirmAction({
    title: 'UniMail-Sitzung trennen?',
    message: 'Die prozessweite IMAP-Verbindung wird getrennt. Alle Nutzer müssen ihre Mail-Zugangsdaten erneut eingeben.',
    confirmLabel: 'UniMail trennen',
  });
  if (!ok) return;
  try {
    await api('/v1/admin/system/mail/logout', { method: 'POST', body: {} });
    toast('UniMail getrennt.', 'ok');
    await renderSystemPage();
  } catch (error) { if (error.code !== 'unauthorized') toast(errorText(error), 'error'); }
}

