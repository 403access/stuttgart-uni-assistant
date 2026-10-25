import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatTimestamp } from '@ua/format';
import { Badge, Button, DataTable, Dialog, ErrorState, Field, Input, Muted, PageHeader, Pagination, Select, useToast } from '@ua/ui-react';
import { useState } from 'react';

import { api } from '../lib/api';

const PAGE_SIZE = 100;

export function LogsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [service, setService] = useState('');
  const [level, setLevel] = useState('');
  const [page, setPage] = useState(1);
  const [auto, setAuto] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const logs = useQuery({
    queryKey: ['logs', search, service, level, page],
    queryFn: () => api.logs({ query: search, service, level, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    refetchInterval: auto ? 5_000 : false,
  });
  const data = (logs.data ?? {}) as any;
  const entries = data.entries ?? [];
  const services = data.services ?? [];
  const levels = data.levels ?? [];

  const clear = useMutation({
    mutationFn: () => api.clearLogs({ service, level }),
    onSuccess: (result: any) => {
      setConfirmClear(false);
      queryClient.invalidateQueries({ queryKey: ['logs'] });
      toast.show(`${result?.removed ?? 0} Zeilen gelöscht.`);
    },
  });

  return (
    <>
      <PageHeader
        title="Logs"
        subtitle="Persistierte Service-Logs mit Filter und Aufbewahrung"
        actions={<><Button variant="secondary" onClick={() => setAuto((value) => !value)}>{auto ? 'Auto aus' : 'Auto an'}</Button><Button variant="danger" onClick={() => setConfirmClear(true)}>Gefilterte löschen</Button></>}
      />
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{ flex: '1 1 240px' }}><Field label="Suche"><Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Nachricht, Detail, Service" /></Field></div>
        <Field label="Service"><Select value={service} onChange={(event) => { setService(event.target.value); setPage(1); }}><option value="">Alle</option>{services.map((item: any) => <option key={item.service} value={item.service}>{item.service} ({item.count})</option>)}</Select></Field>
        <Field label="Level"><Select value={level} onChange={(event) => { setLevel(event.target.value); setPage(1); }}><option value="">Alle</option>{levels.map((item: any) => <option key={item.level} value={item.level}>{item.level} ({item.count})</option>)}</Select></Field>
      </div>
      {logs.error ? <ErrorState message={logs.error instanceof Error ? logs.error.message : 'Logs konnten nicht geladen werden.'} /> : (
        <DataTable
          rows={entries}
          rowKey={(entry: any) => entry.id}
          loading={logs.isLoading}
          empty="Keine Log-Zeilen"
          columns={[
            { key: 'time', header: 'Zeit', render: (entry: any) => formatTimestamp(entry.createdAt, 'de') },
            { key: 'level', header: 'Level', render: (entry: any) => <Badge tone={entry.level === 'error' ? 'danger' : entry.level === 'warn' ? 'warn' : 'blue'}>{entry.level}</Badge> },
            { key: 'service', header: 'Service', render: (entry: any) => entry.service },
            { key: 'message', header: 'Nachricht', render: (entry: any) => entry.message },
            { key: 'user', header: 'Konto', render: (entry: any) => entry.userId ? <Muted>{entry.userId}</Muted> : '—' },
            { key: 'detail', header: 'Detail', render: (entry: any) => entry.detail ? <Muted>{typeof entry.detail === 'string' ? entry.detail : JSON.stringify(entry.detail)}</Muted> : '—' },
          ]}
        />
      )}
      <div style={{ marginTop: 12 }}><Pagination page={page} pageSize={PAGE_SIZE} total={data.total ?? 0} onPage={setPage} /></div>
      <Dialog
        open={confirmClear}
        title="Gefilterte Logs löschen?"
        onClose={() => setConfirmClear(false)}
        actions={<><Button variant="secondary" onClick={() => setConfirmClear(false)}>Abbrechen</Button><Button variant="danger" disabled={clear.isPending} onClick={() => clear.mutate()}>{clear.isPending ? 'Löschen …' : 'Löschen'}</Button></>}
      >
        <p>Es werden alle Zeilen mit den aktuellen Filtern gelöscht. Die Aktion wird auditiert.</p>
      </Dialog>
    </>
  );
}
