import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatBytes, formatTimestamp } from '@ua/format';
import {
  Badge,
  Button,
  Callout,
  CopyButton,
  DataTable,
  Dialog,
  ErrorState,
  FieldBox,
  KpiGrid,
  Muted,
  Section,
  StatCard,
  useToast,
} from '@ua/ui-react';
import { useState } from 'react';

import { api } from '../lib/api';

function configRow(label: string, ok: boolean, detail?: string) {
  return (
    <div
      key={label}
      className="row"
      style={{ justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--line)', gap: 12 }}
    >
      <div style={{ display: 'grid', gap: 1, minWidth: 0 }}>
        <strong style={{ fontSize: 12.5 }}>{label}</strong>
        {detail ? <span className="hint">{detail}</span> : null}
      </div>
      <Badge tone={ok ? 'ok' : 'warn'}>{ok ? 'bereit' : 'nicht konfiguriert'}</Badge>
    </div>
  );
}

function envSourceBadge(source: string) {
  if (source === 'env') return <Badge tone="info">.env</Badge>;
  if (source === 'process') return <Badge tone="blue">Prozess</Badge>;
  return <Badge>nicht gesetzt</Badge>;
}

export function SystemPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [revealOpen, setRevealOpen] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [confirm, setConfirm] = useState<null | { kind: 'cancel'; job: any } | { kind: 'mail' }>(null);
  const system = useQuery({ queryKey: ['system'], queryFn: () => api.system(), refetchInterval: 15_000 });
  const environmentQuery = useQuery({
    queryKey: ['environment', 'revealed'],
    queryFn: () => api.environment(true),
    enabled: revealed,
  });
  const data = (system.data ?? {}) as any;
  const runtime = data.runtime ?? {};
  const config = data.config ?? {};
  const database = data.database ?? {};
  const jobs = data.syncJobs ?? [];
  const host = data.host ?? {};
  const revealedData = (environmentQuery.data ?? null) as any;
  const environment = revealedData ?? data.environment ?? {};
  const variables: any[] = environment.variables ?? [];
  const envFile = environment.envFile ?? {};
  const totals = environment.totals ?? {};

  const cancel = useMutation({
    mutationFn: (jobId: number) => api.cancelSync(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system'] });
      toast.show('Synchronisation abgebrochen.', 'ok');
    },
    onError: (error) => toast.show(error instanceof Error ? error.message : 'Abbruch fehlgeschlagen.', 'error'),
  });
  const mailLogout = useMutation({
    mutationFn: () => api.mailLogout(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system'] });
      toast.show('UniMail getrennt.', 'ok');
    },
    onError: (error) => toast.show(error instanceof Error ? error.message : 'Trennen fehlgeschlagen.', 'error'),
  });

  if (system.error) {
    return <ErrorState message={system.error instanceof Error ? system.error.message : 'Systemstatus konnte nicht geladen werden.'} />;
  }

  const runningJobs = jobs.filter((job: any) => job.state === 'running' || job.state === 'cancelling').length;
  const configEntries = [
    ['Dashboard-Token', Boolean(config.admin?.configured), 'DASHBOARD_TOKEN'],
    ['Assistent', Boolean(config.assistant?.configured), `XAI_API_KEY · Modell ${config.assistant?.model || '–'}`],
    [
      'C@MPUS .env',
      Boolean(config.campus?.tokenConfigured || config.campus?.sessionCookieConfigured),
      [config.campus?.tokenConfigured ? 'Bearer-Token' : null, config.campus?.sessionCookieConfigured ? 'Session-Cookie' : null]
        .filter(Boolean)
        .join(' + ') || 'kein .env-Zugang',
    ],
    ['ILIAS .env', Boolean(config.ilias?.configured), config.ilias?.configured ? 'ILIAS_SESSION_COOKIE' : 'kein .env-Zugang'],
    ['SIAM / OIDC', Boolean(config.oidc?.configured), config.oidc?.issuer || 'OIDC_ISSUER nicht gesetzt'],
    [
      'UniMail',
      Boolean(config.mail?.configured),
      config.mail?.account ? `${config.mail.account}${config.mail.address ? ` · ${config.mail.address}` : ''}` : 'IMAP nicht verbunden',
    ],
  ] as [string, boolean, string][];

  const databaseFields = [
    ['Pfad', <span key="db-path" className="mono tiny">{database.path ?? '–'}</span>],
    ['Größe', formatBytes(database.sizeBytes ?? 0, 'de')],
    ['Konten', database.counts?.users ?? 0],
    ['Sitzungen', database.counts?.sessions ?? 0],
    ['Geräte', database.counts?.devices ?? 0],
    ['Plattformen', database.counts?.platforms ?? 0],
    ['C@MPUS-Quellen', database.counts?.campusSources ?? 0],
    ['ILIAS-Stände', database.counts?.iliasSnapshots ?? 0],
    ['Knoten', database.counts?.nodes ?? 0],
    ['Kurse', database.counts?.courses ?? 0],
    ['Termine', database.counts?.events ?? 0],
    ['Aufrufe', database.counts?.calls ?? 0],
    ['News', database.counts?.news ?? 0],
    ['Audit', database.counts?.audit ?? 0],
    ['Logs', database.counts?.logs ?? 0],
  ] as [string, any][];

  const runtimeFields = [
    ['Node.js', runtime.node ?? '–'],
    ['PID', runtime.pid ?? '–'],
    ['Gestartet', runtime.startedAt ? formatTimestamp(runtime.startedAt, 'de') : '–'],
    ['Uptime', runtime.uptimeSeconds ? `${Math.round(runtime.uptimeSeconds / 60)} Min.` : '–'],
    ['RSS', formatBytes(runtime.memory?.rss ?? 0, 'de')],
    ['Heap', `${formatBytes(runtime.memory?.heapUsed ?? 0, 'de')} / ${formatBytes(runtime.memory?.heapTotal ?? 0, 'de')}`],
    ['Hostname', host.hostname ?? '–'],
    ['Plattform', host.platform ? `${host.platform} · ${host.arch}` : '–'],
    ['Kernel', host.release ?? '–'],
    ['Arbeitsverzeichnis', <span key="cwd" className="mono tiny">{host.cwd ?? '–'}</span>],
    ['Node-Pfad', <span key="exec-path" className="mono tiny">{host.execPath ?? '–'}</span>],
    ['Zeitzone', host.timezone ?? '–'],
    ['Locale', host.locale ?? '–'],
    ['CPUs', host.cpus ?? '–'],
    ['Arbeitsspeicher', host.totalMemory ? `${formatBytes(host.totalMemory, 'de')} gesamt · ${formatBytes(host.freeMemory, 'de')} frei` : '–'],
    ['Load', host.loadAverage?.length ? host.loadAverage.join(' · ') : '–'],
    ['V8', host.versions?.v8 ?? '–'],
    ['OpenSSL', host.versions?.openssl ?? '–'],
    ['SQLite', host.versions?.sqlite ?? '–'],
  ] as [string, any][];

  return (
    <div className="view-stack">
      <KpiGrid>
        <StatCard
          icon="clock"
          tone="green"
          value={runtime.uptimeSeconds ? `${Math.round(runtime.uptimeSeconds / 60)} Min.` : '—'}
          label="Laufzeit"
          sub={runtime.startedAt ? `seit ${formatTimestamp(runtime.startedAt, 'de')}` : '—'}
        />
        <StatCard
          icon="monitor"
          tone="cyan"
          value={formatBytes(runtime.memory?.rss ?? 0, 'de')}
          label="Arbeitsspeicher"
          sub={`Heap ${formatBytes(runtime.memory?.heapUsed ?? 0, 'de')} / ${formatBytes(runtime.memory?.heapTotal ?? 0, 'de')}`}
        />
        <StatCard
          icon="database"
          tone="purple"
          value={formatBytes(database.sizeBytes ?? 0, 'de')}
          label="Datenbank"
          sub={`${database.counts?.audit ?? 0} Audit-Einträge`}
        />
        <StatCard icon="zap" tone="amber" value={jobs.length} label="Sync-Jobs" sub={`${runningJobs} laufen gerade`} />
      </KpiGrid>

      <div className="overview-grid">
        <div className="overview-col">
          <Section title="Konfiguration" subtitle="Umgebungsvariablen und Prozessstatus">
            {configEntries.map(([label, ok, detail]) => configRow(label, ok, detail))}
            <div className="row" style={{ paddingTop: 10 }}>
              <Button variant="danger" size="small" disabled={!config.mail?.configured} onClick={() => setConfirm({ kind: 'mail' })}>
                UniMail trennen
              </Button>
              <span className="hint">Trennt die prozessweite IMAP-Sitzung für alle Nutzer.</span>
            </div>
          </Section>

          <Section title="Datenbank" subtitle="SQLite-Datei und Tabellen">
            <div className="field-grid">
              {databaseFields.map(([label, value]) => <FieldBox key={label} label={label} value={value} />)}
            </div>
          </Section>
        </div>

        <div className="overview-col">
          <Section title="Synchronisation" subtitle="C@MPUS-Sync-Jobs im Arbeitsspeicher">
            <DataTable
              rows={jobs}
              rowKey={(job: any) => job.jobId ?? job.id}
              loading={system.isLoading}
              empty="Keine Synchronisationen"
              plain
              columns={[
                {
                  key: 'job',
                  header: 'Job',
                  render: (job: any) => (
                    <div>
                      <strong className="mono">#{job.jobId ?? job.id}</strong>
                      <div className="hint">{job.includeCourses ? 'mit Kursen' : 'nur Struktur'}</div>
                    </div>
                  ),
                },
                {
                  key: 'account',
                  header: 'Konto',
                  render: (job: any) => (job.userId ? <span>{job.account || job.userId}</span> : <Muted>legacy</Muted>),
                },
                { key: 'study', header: 'Studium', render: (job: any) => job.studyId ?? '–' },
                {
                  key: 'state',
                  header: 'Status',
                  render: (job: any) => (
                    <div>
                      <Badge tone={job.state === 'failed' ? 'danger' : job.state === 'done' || job.state === 'completed' ? 'ok' : 'blue'}>{job.state}</Badge>
                      {job.error ? <div className="hint">{job.error}</div> : null}
                      {job.retries ? <div className="hint">{job.retries} Wiederholungen</div> : null}
                    </div>
                  ),
                },
                {
                  key: 'progress',
                  header: 'Fortschritt',
                  className: 'num',
                  render: (job: any) =>
                    `${job.nodeCount ?? job.processed ?? 0} Knoten${job.includeCourses ? ` · ${job.courseCount ?? 0} Kurse` : ''}`,
                },
                {
                  key: 'time',
                  header: 'Zeit',
                  render: (job: any) => (
                    <div className="tiny">
                      {job.startedAt ? formatTimestamp(job.startedAt, 'de') : '–'}
                      {job.finishedAt ? <div className="hint">fertig {formatTimestamp(job.finishedAt, 'de')}</div> : null}
                    </div>
                  ),
                },
                {
                  key: 'actions',
                  header: '',
                  render: (job: any) =>
                    job.state === 'running' || job.state === 'cancelling' ? (
                      <Button variant="danger" size="small" onClick={() => setConfirm({ kind: 'cancel', job })}>
                        Abbrechen
                      </Button>
                    ) : null,
                },
              ]}
            />
          </Section>

          <Section title="Laufzeit" subtitle="Prozess, Host und Laufzeitumgebung">
            <div className="field-grid">
              {runtimeFields.map(([label, value]) => <FieldBox key={label} label={label} value={value} />)}
            </div>
          </Section>
        </div>
      </div>

      <Section
        title="Umgebung"
        subtitle="Variablen aus .env und der Prozessumgebung"
        actions={
          revealed ? (
            <Button variant="secondary" size="small" onClick={() => setRevealed(false)}>Geheimnisse verbergen</Button>
          ) : (
            <Button variant="secondary" size="small" onClick={() => setRevealOpen(true)}>Geheimnisse anzeigen</Button>
          )
        }
      >
        <div className="field-grid">
          <FieldBox label=".env-Datei" value={<span className="mono tiny">{envFile.path ?? '–'}</span>} />
          <FieldBox label="Vorhanden" value={envFile.exists ? 'ja' : 'nein'} />
          <FieldBox label="Geändert" value={envFile.modifiedAt ? formatTimestamp(envFile.modifiedAt, 'de') : '–'} />
          <FieldBox label="Größe" value={envFile.exists ? formatBytes(envFile.sizeBytes ?? 0, 'de') : '–'} />
          <FieldBox
            label="Variablen"
            value={`${totals.total ?? 0} · ${totals.set ?? 0} gesetzt · ${totals.secrets ?? 0} geheim`}
          />
        </div>
        <Callout>
          Die .env-Datei wird beim Serverstart in die Prozessumgebung geladen; systemd- oder Shell-Werte haben Vorrang.
          Geheime Werte bleiben ausgeblendet, bis du sie ausdrücklich anzeigst.
        </Callout>
        <div className="table-wrap">
          <table className="data env-table" style={{ minWidth: 860 }}>
            <caption className="sr-only">Umgebungsvariablen</caption>
            <thead>
              <tr>
                <th>Variable</th>
                <th>Wert</th>
                <th>Quelle</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {variables.length ? (
                variables.map((variable) => (
                  <tr key={variable.key}>
                    <td>
                      <div className="row tight">
                        <code className="mono">{variable.key}</code>
                        {variable.secret ? <Badge tone="purple">geheim</Badge> : null}
                      </div>
                    </td>
                    <td className="env-value-cell">
                      {!variable.set ? (
                        <span className="hint">nicht gesetzt</span>
                      ) : variable.secret && !revealed ? (
                        <span className="row tight">
                          <span className="env-secret mono" aria-label="Geheimer Wert ausgeblendet">••••••••</span>
                          <span className="hint">{variable.length} Zeichen</span>
                        </span>
                      ) : (
                        <span className="row tight">
                          <span className="env-value mono">{variable.value || '(leer)'}</span>
                          <CopyButton value={variable.value} label={variable.key} />
                        </span>
                      )}
                    </td>
                    <td>{envSourceBadge(variable.source)}</td>
                    <td>{variable.set ? <Badge tone="ok">gesetzt</Badge> : <Badge tone="warn">leer</Badge>}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4}>
                    <div className="empty">
                      <strong>Keine Variablen</strong>
                      <p>Weder .env.example noch die Prozessumgebung liefern Variablen.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Section>

      <Dialog
        open={Boolean(confirm)}
        title={confirm?.kind === 'cancel' ? 'Synchronisation abbrechen?' : 'UniMail-Sitzung trennen?'}
        onClose={() => setConfirm(null)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setConfirm(null)}>Abbrechen</Button>
            <Button
              variant="danger"
              disabled={cancel.isPending || mailLogout.isPending}
              onClick={() => {
                if (!confirm) return;
                if (confirm.kind === 'cancel') {
                  cancel.mutate(confirm.job.jobId ?? confirm.job.id);
                } else {
                  mailLogout.mutate();
                }
                setConfirm(null);
              }}
            >
              {confirm?.kind === 'cancel' ? 'Job abbrechen' : 'UniMail trennen'}
            </Button>
          </>
        }
      >
        <p>
          {confirm?.kind === 'cancel'
            ? `Job #${confirm.job.jobId ?? confirm.job.id} für Studium ${confirm.job.studyId ?? '–'} wird abgebrochen. Bereits geladene Daten bleiben erhalten.`
            : 'Die prozessweite IMAP-Verbindung wird getrennt. Alle Nutzer müssen ihre Mail-Zugangsdaten erneut eingeben.'}
        </p>
      </Dialog>

      <Dialog
        open={revealOpen}
        title="Geheime Werte anzeigen?"
        onClose={() => setRevealOpen(false)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setRevealOpen(false)}>Abbrechen</Button>
            <Button
              onClick={() => {
                setRevealOpen(false);
                setRevealed(true);
                toast.show('Geheime Werte sind sichtbar. Beim Neuladen werden sie wieder ausgeblendet.', 'info');
              }}
            >
              Anzeigen
            </Button>
          </>
        }
      >
        <p>
          Tokens, Schlüssel und Cookies werden im Klartext angezeigt. Der Zugriff wird im Audit-Protokoll vermerkt.
          Beim Neuladen der Seite werden sie wieder ausgeblendet.
        </p>
      </Dialog>
    </div>
  );
}
