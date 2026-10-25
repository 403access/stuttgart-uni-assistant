import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { formatTimestamp } from '@ua/format';
import { Avatar, Badge, Button, DataTable, Dialog, ErrorState, Field, Input, Muted, PageHeader, Pagination, Row, Select, useToast } from '@ua/ui-react';
import { useState } from 'react';

import { api } from '../lib/api';

interface UserRow {
  id: string;
  account: string;
  name?: string | null;
  mode: string;
  createdAt: string;
  lastLoginAt?: string | null;
  activeSessions: number;
  platformCount: number;
  deviceCount: number;
  data: { nodes: number; courses: number; calls: number };
  campusActive?: boolean;
  iliasActive?: boolean;
}

const PAGE_SIZE = 25;

export function UsersPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState('');
  const [sort, setSort] = useState('recent');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [account, setAccount] = useState('');
  const [name, setName] = useState('');
  const [newMode, setNewMode] = useState('local');

  const users = useQuery({
    queryKey: ['users', search, mode, sort, page],
    queryFn: () => api.users({ query: search, mode, sort, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
  });
  const rows = ((users.data as { users?: UserRow[]; total?: number } | undefined)?.users ?? []);
  const total = (users.data as { total?: number } | undefined)?.total ?? 0;

  const create = useMutation({
    mutationFn: () => api.createUser({ account, name, mode: newMode }),
    onSuccess: () => {
      setCreateOpen(false);
      setAccount('');
      setName('');
      setNewMode('local');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['overview'] });
      toast.show('Konto angelegt.');
    },
    onError: (error) => toast.show(error instanceof Error ? error.message : 'Konto konnte nicht angelegt werden.', 'error'),
  });

  return (
    <>
      <PageHeader
        title="Nutzer"
        subtitle="Konten, Sitzungen, Plattformen und gespeicherte Portaldaten"
        actions={<Button onClick={() => setCreateOpen(true)}>Konto anlegen</Button>}
      />

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{ flex: '1 1 240px' }}><Field label="Suche"><Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Konto, Name, E-Mail" /></Field></div>
        <Field label="Anmeldung"><Select value={mode} onChange={(event) => { setMode(event.target.value); setPage(1); }}>
          <option value="">Alle</option><option value="campus">C@MPUS</option><option value="oidc">SIAM</option><option value="demo">Demo</option><option value="local">Lokal</option>
        </Select></Field>
        <Field label="Sortierung"><Select value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }}>
          <option value="recent">Zuletzt aktiv</option><option value="created">Neu angelegt</option><option value="name">Name</option><option value="account">Konto</option><option value="sessions">Sitzungen</option><option value="data">Portaldaten</option>
        </Select></Field>
      </div>

      {users.error ? <ErrorState message={users.error instanceof Error ? users.error.message : 'Nutzer konnten nicht geladen werden.'} /> : (
        <DataTable
          rows={rows}
          rowKey={(row) => row.id}
          loading={users.isLoading}
          empty="Keine Konten gefunden"
          columns={[
            {
              key: 'user',
              header: 'Konto',
              render: (row) => (
                <Link to="/users/$userId" params={{ userId: row.id }} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <Row><Avatar name={row.name || row.account} /><div><strong>{row.name || row.account}</strong><div><Muted>{row.account}</Muted></div></div></Row>
                </Link>
              ),
            },
            { key: 'mode', header: 'Anmeldung', render: (row) => <Badge tone="blue">{row.mode}</Badge> },
            { key: 'sessions', header: 'Sitzungen', render: (row) => row.activeSessions },
            { key: 'platforms', header: 'Plattformen', render: (row) => row.platformCount },
            { key: 'data', header: 'Portal', render: (row) => `${row.data?.nodes ?? 0} Knoten · ${row.data?.courses ?? 0} Kurse` },
            { key: 'last', header: 'Zuletzt', render: (row) => row.lastLoginAt ? formatTimestamp(row.lastLoginAt, 'de') : '—' },
            { key: 'created', header: 'Angelegt', render: (row) => formatTimestamp(row.createdAt, 'de') },
          ]}
        />
      )}
      <div style={{ marginTop: 12 }}><Pagination page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} /></div>

      <Dialog
        open={createOpen}
        title="Konto anlegen"
        onClose={() => setCreateOpen(false)}
        actions={<><Button variant="secondary" onClick={() => setCreateOpen(false)}>Abbrechen</Button><Button disabled={!account.trim() || create.isPending} onClick={() => create.mutate()}>{create.isPending ? 'Anlegen …' : 'Anlegen'}</Button></>}
      >
        <div style={{ display: 'grid', gap: 10 }}>
          <Field label="Konto"><Input value={account} onChange={(event) => setAccount(event.target.value)} placeholder="st123456" /></Field>
          <Field label="Name"><Input value={name} onChange={(event) => setName(event.target.value)} placeholder="optional" /></Field>
          <Field label="Anmeldemodus"><Select value={newMode} onChange={(event) => setNewMode(event.target.value)}><option value="local">Lokal</option><option value="campus">C@MPUS</option><option value="oidc">SIAM</option><option value="demo">Demo</option></Select></Field>
        </div>
      </Dialog>
    </>
  );
}
