import { useQuery } from '@tanstack/react-query';
import { formatTimestamp } from '@ua/format';
import { Badge, DataTable, ErrorState, Field, Input, Muted, Pagination, Select } from '@ua/ui-react';
import { useState } from 'react';

import { api } from '../lib/api';

const PAGE_SIZE = 50;

export function AuditPage() {
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [userId, setUserId] = useState('');
  const [page, setPage] = useState(1);
  const audit = useQuery({
    queryKey: ['audit', search, action, userId, page],
    queryFn: () => api.audit({ query: search, action, userId, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
  });
  const data = (audit.data ?? {}) as any;
  const entries = data.entries ?? [];
  const actions = data.actions ?? [];

  return (
    <div className="view-stack">
      <section className="card toolbar">
        <div style={{ flex: '1 1 240px' }}><Field label="Suche"><Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Aktion, Konto, Detail" /></Field></div>
        <Field label="Aktion"><Select value={action} onChange={(event) => { setAction(event.target.value); setPage(1); }}><option value="">Alle</option>{actions.map((item: any) => <option key={item.action} value={item.action}>{item.action} ({item.count})</option>)}</Select></Field>
        <Field label="Konto-ID"><Input value={userId} onChange={(event) => { setUserId(event.target.value); setPage(1); }} placeholder="usr_…" /></Field>
      </section>
      {audit.error ? <ErrorState message={audit.error instanceof Error ? audit.error.message : 'Aktivität konnte nicht geladen werden.'} /> : (
        <DataTable
          rows={entries}
          rowKey={(entry: any) => entry.id}
          loading={audit.isLoading}
          empty="Keine Aktivität"
          columns={[
            { key: 'time', header: 'Zeit', render: (entry: any) => formatTimestamp(entry.createdAt, 'de') },
            { key: 'action', header: 'Aktion', render: (entry: any) => <Badge tone="blue">{entry.action}</Badge> },
            { key: 'account', header: 'Konto', render: (entry: any) => entry.account ?? '—' },
            { key: 'user', header: 'Konto-ID', render: (entry: any) => entry.userId ? <Muted>{entry.userId}</Muted> : '—' },
            { key: 'detail', header: 'Detail', render: (entry: any) => entry.detail ? <Muted>{typeof entry.detail === 'string' ? entry.detail : JSON.stringify(entry.detail)}</Muted> : '—' },
          ]}
          footer={<Pagination page={page} pageSize={PAGE_SIZE} total={data.total ?? 0} onPage={setPage} />}
        />
      )}
    </div>
  );
}
