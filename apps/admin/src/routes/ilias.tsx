import { useQuery } from '@tanstack/react-query';
import { formatTimestamp } from '@ua/format';
import { Badge, DataTable, ErrorState, Muted, PageHeader, Section, StatCard } from '@ua/ui-react';

import { api } from '../lib/api';

export function IliasPage() {
  const ilias = useQuery({ queryKey: ['ilias'], queryFn: () => api.ilias() });
  const data = (ilias.data ?? {}) as any;
  const totals = data.totals ?? {};
  const users = data.users ?? [];

  if (ilias.error) return <ErrorState message={ilias.error instanceof Error ? ilias.error.message : 'ILIAS-Daten konnten nicht geladen werden.'} />;

  return (
    <>
      <PageHeader title="ILIAS" subtitle="Sitzungen, Konten und gespeicherte Dashboard-Snapshots" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <StatCard value={data.configured ? 'ja' : 'nein'} label="Server konfiguriert" />
        <StatCard value={data.activeSessions ?? 0} label="Aktive Sitzungen" />
        <StatCard value={totals.courses ?? 0} label="Kurse" sub={`${totals.groups ?? 0} Gruppen`} />
        <StatCard value={totals.memberships ?? 0} label="Mitgliedschaften" sub={`${totals.tasks ?? 0} Aufgaben`} />
        <StatCard value={totals.mails ?? 0} label="Mails" sub={`${totals.unreadMails ?? 0} ungelesen`} />
        <StatCard value={totals.news ?? 0} label="News" />
      </div>

      <Section title="Konten mit ILIAS">
        <DataTable
          rows={users}
          rowKey={(user: any) => user.id}
          loading={ilias.isLoading}
          empty="Keine ILIAS-Konten"
          columns={[
            { key: 'account', header: 'Konto', render: (user: any) => <div><strong>{user.name ?? user.account}</strong><div><Muted>{user.account}{user.iliasAccount ? ` · ${user.iliasAccount}` : ''}</Muted></div></div> },
            { key: 'source', header: 'Quelle', render: (user: any) => user.source ?? '—' },
            { key: 'active', header: 'Sitzung', render: (user: any) => <Badge tone={user.active ? 'ok' : user.canRead ? 'blue' : 'warn'}>{user.active ? 'aktiv' : user.canRead ? 'lesbar' : 'nein'}</Badge> },
            { key: 'courses', header: 'Kurse', render: (user: any) => user.counts?.courses ?? 0 },
            { key: 'groups', header: 'Gruppen', render: (user: any) => user.counts?.groups ?? 0 },
            { key: 'mails', header: 'Mails', render: (user: any) => `${user.counts?.mails ?? 0} / ${user.counts?.unreadMails ?? 0}` },
            { key: 'updated', header: 'Aktualisiert', render: (user: any) => user.fetchedAt || user.updatedAt ? formatTimestamp(user.fetchedAt ?? user.updatedAt, 'de') : '—' },
          ]}
        />
      </Section>
    </>
  );
}
