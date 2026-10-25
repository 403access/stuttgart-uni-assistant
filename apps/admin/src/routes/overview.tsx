import { useQuery } from '@tanstack/react-query';
import { formatTimestamp } from '@ua/format';
import { Avatar, Badge, DataTable, Muted, PageHeader, Row, Section, StatCard } from '@ua/ui-react';

import { api } from '../lib/api';

interface UserRow {
  id: string;
  account: string;
  name?: string | null;
  primaryMode?: string;
  mode?: string;
  createdAt: string;
  lastLoginAt?: string | null;
}

interface AuditRow {
  id: string;
  action: string;
  account?: string | null;
  createdAt: string;
  detail?: { label?: string } | string | null;
}

export function OverviewPage() {
  const overview = useQuery({ queryKey: ['overview'], queryFn: () => api.overview() });
  const users = useQuery({ queryKey: ['users', 'recent'], queryFn: () => api.users({ sort: 'recent', limit: 6 }) });
  const audit = useQuery({ queryKey: ['audit', 'recent'], queryFn: () => api.audit({ limit: 6 }) });
  const stats = (overview.data ?? {}) as Record<string, number>;
  const userRows = ((users.data as { users?: UserRow[] } | undefined)?.users ?? []);
  const auditRows = ((audit.data as { entries?: AuditRow[] } | undefined)?.entries ?? []);

  return (
    <>
      <PageHeader title="Übersicht" subtitle="Konten, Daten und Betrieb im Blick" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <StatCard value={stats.users ?? 0} label="Konten" sub={`${stats.recentUsers ?? 0} neu in 7 Tagen`} />
        <StatCard value={stats.activeSessions ?? 0} label="Aktive Sitzungen" sub={`${stats.usersWithSessions ?? 0} Konten angemeldet`} />
        <StatCard value={stats.devices ?? 0} label="Web-Geräte" sub={`${stats.devicesPending ?? 0} warten auf Scan`} />
        <StatCard value={stats.credentialsActive ?? 0} label="C@MPUS im Speicher" sub="nur bis zum Server-Neustart" />
        <StatCard value={stats.iliasActive ?? 0} label="ILIAS im Speicher" sub={`${stats.portalCourses ?? 0} Kurse`} />
        <StatCard value={stats.portalNodes ?? 0} label="Portal-Knoten" sub={`${stats.completedNodes ?? 0} abgeschlossen`} />
        <StatCard value={stats.calendarEvents ?? 0} label="Kalendertermine" sub="gespeicherte ICS-Ereignisse" />
        <StatCard value={stats.portalCalls ?? 0} label="Portal-Aufrufe" sub="protokollierte Hops" />
      </div>

      <Section title="Zuletzt aktiv">
        <DataTable
          rows={userRows}
          rowKey={(row) => row.id}
          loading={users.isLoading}
          empty="Noch keine Konten"
          columns={[
            {
              key: 'user',
              header: 'Konto',
              render: (row) => (
                <Row>
                  <Avatar name={row.name || row.account} />
                  <div>
                    <strong>{row.name || row.account}</strong>
                    <div><Muted>{row.account}</Muted></div>
                  </div>
                </Row>
              ),
            },
            { key: 'mode', header: 'Anmeldung', render: (row) => <Badge tone="blue">{row.mode ?? row.primaryMode ?? 'lokal'}</Badge> },
            { key: 'last', header: 'Zuletzt', render: (row) => row.lastLoginAt ? formatTimestamp(row.lastLoginAt, 'de') : '—' },
            { key: 'created', header: 'Angelegt', render: (row) => formatTimestamp(row.createdAt, 'de') },
          ]}
        />
      </Section>

      <Section title="Letzte Aktivität">
        <DataTable
          rows={auditRows}
          rowKey={(row) => row.id}
          loading={audit.isLoading}
          empty="Noch keine Aktivität"
          columns={[
            { key: 'action', header: 'Aktion', render: (row) => <Badge>{row.action}</Badge> },
            { key: 'account', header: 'Konto', render: (row) => row.account ?? '—' },
            { key: 'detail', header: 'Detail', render: (row) => typeof row.detail === 'string' ? row.detail : row.detail?.label ?? '—' },
            { key: 'created', header: 'Zeit', render: (row) => formatTimestamp(row.createdAt, 'de') },
          ]}
        />
      </Section>
    </>
  );
}
