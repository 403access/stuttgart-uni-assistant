import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatBytes, formatTimestamp } from '@ua/format';
import { Badge, Button, Card, DataTable, ErrorState, Muted, PageHeader, Row, Section, StatCard, useToast } from '@ua/ui-react';

import { api } from '../lib/api';

export function SystemPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const system = useQuery({ queryKey: ['system'], queryFn: () => api.system(), refetchInterval: 15_000 });
  const data = (system.data ?? {}) as any;
  const runtime = data.runtime ?? {};
  const config = data.config ?? {};
  const database = data.database ?? {};
  const jobs = data.syncJobs ?? [];
  const environment = data.environment ?? {};
  const cancel = useMutation({
    mutationFn: (jobId: number) => api.cancelSync(jobId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['system'] }); toast.show('Sync wird abgebrochen.'); },
  });
  const mailLogout = useMutation({
    mutationFn: () => api.mailLogout(),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['system'] }); toast.show('UniMail getrennt.'); },
  });

  if (system.error) return <ErrorState message={system.error instanceof Error ? system.error.message : 'Systemstatus konnte nicht geladen werden.'} />;

  return (
    <>
      <PageHeader title="System" subtitle="Prozess, Konfiguration, Datenbank und Sync-Jobs" actions={<Button variant="secondary" onClick={() => system.refetch()}>Aktualisieren</Button>} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <StatCard value={runtime.node ?? '—'} label="Node" sub={`PID ${runtime.pid ?? '—'}`} />
        <StatCard value={Math.round((runtime.uptimeSeconds ?? 0) / 60)} label="Laufzeit (Min.)" sub={runtime.startedAt ? formatTimestamp(runtime.startedAt, 'de') : '—'} />
        <StatCard value={formatBytes(runtime.memory?.heapUsed ?? 0, 'de')} label="Heap" sub={`RSS ${formatBytes(runtime.memory?.rss ?? 0, 'de')}`} />
        <StatCard value={formatBytes(database.sizeBytes ?? 0, 'de')} label="Datenbank" sub={database.path ?? '—'} />
      </div>

      <Section title="Konfiguration">
        <Card>
          <div style={{ display: 'grid', gap: 8 }}>
            {(Object.entries(config) as Array<[string, any]>).map(([key, value]) => (
              <Row key={key}><strong style={{ minWidth: 100 }}>{key}</strong><Badge tone={value?.configured || value?.tokenConfigured || value?.sessionCookieConfigured ? 'ok' : 'warn'}>{value?.configured || value?.tokenConfigured || value?.sessionCookieConfigured ? 'konfiguriert' : 'nicht konfiguriert'}</Badge><Muted>{value?.model ?? value?.account ?? ''}</Muted></Row>
            ))}
          </div>
        </Card>
      </Section>

      <Section title="Sync-Jobs" actions={jobs.length ? <Button variant="secondary" size="small" onClick={() => queryClient.invalidateQueries({ queryKey: ['system'] })}>Neu laden</Button> : undefined}>
        <DataTable
          rows={jobs}
          rowKey={(job: any) => job.id}
          loading={system.isLoading}
          empty="Keine laufenden oder letzten Sync-Jobs"
          columns={[
            { key: 'id', header: 'Job', render: (job: any) => `#${job.id}` },
            { key: 'account', header: 'Konto', render: (job: any) => job.account ?? job.userId ?? '—' },
            { key: 'state', header: 'Status', render: (job: any) => <Badge tone={job.state === 'failed' ? 'danger' : job.state === 'done' ? 'ok' : 'blue'}>{job.state}</Badge> },
            { key: 'progress', header: 'Fortschritt', render: (job: any) => `${job.processed ?? 0}/${job.total ?? 0}` },
            { key: 'started', header: 'Start', render: (job: any) => job.startedAt ? formatTimestamp(job.startedAt, 'de') : '—' },
            { key: 'actions', header: '', render: (job: any) => job.state === 'running' || job.state === 'cancelling' ? <Button variant="danger" size="small" onClick={() => cancel.mutate(job.id)}>Abbrechen</Button> : null },
          ]}
        />
      </Section>

      <Section title="UniMail">
        <Card>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <Badge tone={config.mail?.configured ? 'ok' : 'warn'}>{config.mail?.configured ? 'verbunden' : 'nicht verbunden'}</Badge>
            <Muted>{config.mail?.account ?? 'Kein Prozesskonto'}</Muted>
            <Button variant="danger" size="small" disabled={!config.mail?.configured || mailLogout.isPending} onClick={() => mailLogout.mutate()}>Verbindung trennen</Button>
          </div>
        </Card>
      </Section>

      <Section title="Umgebung">
        <Card>
          <Row><strong>{environment.totals?.set ?? 0}</strong><Muted>gesetzte Variablen von {environment.totals?.total ?? 0}</Muted><Badge tone="blue">{environment.totals?.secrets ?? 0} Secrets</Badge></Row>
          <p><Muted>{environment.envFile?.path ?? '.env'}</Muted></p>
        </Card>
      </Section>
    </>
  );
}
