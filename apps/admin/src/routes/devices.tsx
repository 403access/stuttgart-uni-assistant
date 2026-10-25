import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatTimestamp } from '@ua/format';
import { Badge, Button, DataTable, Dialog, ErrorState, Field, Input, Muted, PageHeader, Pagination, Select, useToast } from '@ua/ui-react';
import { useState } from 'react';

import { api } from '../lib/api';

const PAGE_SIZE = 50;

export function DevicesPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [state, setState] = useState('');
  const [page, setPage] = useState(1);
  const [revoking, setRevoking] = useState<any | null>(null);
  const devices = useQuery({ queryKey: ['devices', search, state, page], queryFn: () => api.devices({ query: search, state, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }) });
  const data = (devices.data ?? {}) as any;
  const rows = data.devices ?? [];
  const revoke = useMutation({
    mutationFn: (id: string) => api.revokeDevice(id),
    onSuccess: () => { setRevoking(null); queryClient.invalidateQueries({ queryKey: ['devices'] }); queryClient.invalidateQueries({ queryKey: ['overview'] }); toast.show('Gerät widerrufen.'); },
  });

  return (
    <>
      <PageHeader title="Geräte" subtitle="Browser-Verknüpfungen und ihre Sitzungen" />
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{ flex: '1 1 240px' }}><Field label="Suche"><Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Gerät, Konto, IP, Browser" /></Field></div>
        <Field label="Status"><Select value={state} onChange={(event) => { setState(event.target.value); setPage(1); }}><option value="">Alle</option><option value="pending">Wartet</option><option value="approved">Freigegeben</option><option value="active">Aktiv</option><option value="linked">Verknüpft</option><option value="expired">Abgelaufen</option><option value="revoked">Widerrufen</option></Select></Field>
      </div>
      {devices.error ? <ErrorState message={devices.error instanceof Error ? devices.error.message : 'Geräte konnten nicht geladen werden.'} /> : (
        <DataTable
          rows={rows}
          rowKey={(device: any) => device.id}
          loading={devices.isLoading}
          empty="Keine Geräte"
          columns={[
            { key: 'device', header: 'Gerät', render: (device: any) => <div><strong>{device.name}</strong><div><Muted>{device.client?.browser} · {device.client?.os}</Muted></div></div> },
            { key: 'account', header: 'Konto', render: (device: any) => device.account ?? '—' },
            { key: 'state', header: 'Status', render: (device: any) => <Badge tone={device.state === 'active' ? 'ok' : device.state === 'revoked' ? 'danger' : device.state === 'pending' ? 'warn' : 'blue'}>{device.state}</Badge> },
            { key: 'ip', header: 'IP', render: (device: any) => device.lastIpAddress || device.ipAddress || '—' },
            { key: 'created', header: 'Angelegt', render: (device: any) => formatTimestamp(device.createdAt, 'de') },
            { key: 'last', header: 'Zuletzt', render: (device: any) => device.lastSeenAt ? formatTimestamp(device.lastSeenAt, 'de') : '—' },
            { key: 'actions', header: '', render: (device: any) => device.state !== 'revoked' ? <Button variant="danger" size="small" onClick={() => setRevoking(device)}>Widerrufen</Button> : null },
          ]}
        />
      )}
      <div style={{ marginTop: 12 }}><Pagination page={page} pageSize={PAGE_SIZE} total={data.total ?? 0} onPage={setPage} /></div>
      <Dialog open={Boolean(revoking)} title="Gerät widerrufen?" onClose={() => setRevoking(null)} actions={<><Button variant="secondary" onClick={() => setRevoking(null)}>Abbrechen</Button><Button variant="danger" disabled={revoke.isPending} onClick={() => revoking && revoke.mutate(revoking.id)}>Widerrufen</Button></>}>
        <p>{revoking?.name} · {revoking?.account ?? 'ohne Konto'}</p>
      </Dialog>
    </>
  );
}
