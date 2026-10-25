import { useQuery } from '@tanstack/react-query';
import { Badge, Button, DataTable, Dialog, ErrorState, Muted, Spinner } from '@ua/ui-react';
import { useState } from 'react';

import { api } from '../lib/api';

export function IliasViewerDialog({ view, userId, onClose }: { view: any | null; userId: string; onClose: () => void }) {
  const [mode, setMode] = useState<'json' | 'table'>('table');
  const query = useQuery({
    queryKey: ['user', userId, 'ilias', view?.mode, view?.item?.refId, view?.item?.url],
    queryFn: () => {
      if (view.mode === 'content') return api.userIliasContent(userId, { refId: view.item.refId, kind: view.item.kind });
      if (view.mode === 'members') return api.userIliasMembers(userId, { refId: view.item.refId, kind: view.item.kind, url: view.item.url });
      return api.userIliasProfile(userId, { url: view.item.url });
    },
    enabled: Boolean(view),
  });
  const data = (query.data ?? {}) as any;
  const items = data.items ?? data.members ?? data.profile?.members ?? [];
  const title = view?.item?.title ?? 'ILIAS';

  return (
    <Dialog open={Boolean(view)} title={`${title} · ${view?.mode ?? ''}`} onClose={onClose} actions={<><Button variant="secondary" onClick={() => setMode(mode === 'json' ? 'table' : 'json')}>{mode === 'json' ? 'Tabelle' : 'JSON'}</Button><Button variant="secondary" onClick={() => query.refetch()}>Neu laden</Button><Button onClick={onClose}>Schließen</Button></>}>
      {query.isLoading ? <Spinner /> : query.error ? <ErrorState message={query.error instanceof Error ? query.error.message : 'ILIAS-Daten konnten nicht geladen werden.'} /> : mode === 'json' ? (
        <pre style={{ maxHeight: '55vh', overflow: 'auto', fontSize: 12 }}>{JSON.stringify(data, null, 2)}</pre>
      ) : (
        <div style={{ maxHeight: '60vh', overflow: 'auto' }}>
          {view?.mode === 'content' ? (
            <>
              <p><strong>{data.title ?? title}</strong>{data.description ? <div><Muted>{data.description}</Muted></div> : null}</p>
              <DataTable
                rows={items}
                rowKey={(item: any) => item.refId ?? item.url ?? item.title}
                empty="Keine Einträge"
                columns={[
                  { key: 'title', header: 'Titel', render: (item: any) => <div><strong>{item.title}</strong><div><Muted>{item.kind ?? ''} {item.refId ? `· ${item.refId}` : ''}</Muted></div></div> },
                  { key: 'type', header: 'Typ', render: (item: any) => item.type ?? '—' },
                  { key: 'actions', header: '', render: (item: any) => item.url ? <a href={item.url} target="_blank" rel="noreferrer"><Button variant="secondary" size="small">Öffnen</Button></a> : null },
                ]}
              />
            </>
          ) : (
            <DataTable
              rows={Array.isArray(items) ? items : []}
              rowKey={(item: any, index?: number) => item.userId ?? item.id ?? item.name ?? String(index)}
              empty="Keine Einträge"
              columns={[
                { key: 'name', header: 'Name', render: (item: any) => <div><strong>{item.name ?? item.title ?? '—'}</strong><div><Muted>{item.account ?? item.role ?? ''}</Muted></div></div> },
                { key: 'role', header: 'Rolle', render: (item: any) => item.role ?? item.status ?? '—' },
                { key: 'actions', header: '', render: (item: any) => item.url ? <a href={item.url} target="_blank" rel="noreferrer"><Button variant="secondary" size="small">Öffnen</Button></a> : null },
              ]}
            />
          )}
          <div style={{ marginTop: 10 }}><Badge tone="blue">{view?.mode === 'content' ? `${items.length} Einträge` : 'Live gelesen'}</Badge></div>
        </div>
      )}
    </Dialog>
  );
}
