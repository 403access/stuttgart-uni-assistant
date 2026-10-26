import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { formatTimestamp } from '@ua/format';
import { Badge, Button, Checkbox, DataTable, Dialog, ErrorState, Field, Pagination, Select, useToast, type Tone } from '@ua/ui-react';
import { useState } from 'react';

import { api } from '../lib/api';

const PAGE_SIZE = 100;

const SERVICE_NAMES: Record<string, string> = {
  assistant: 'Assistent',
  campus: 'C@MPUS',
  ilias: 'ILIAS',
  mail: 'UniMail',
  oidc: 'SIAM / OIDC',
  sync: 'Synchronisation',
  auth: 'Anmeldung',
  admin: 'Verwaltung',
  http: 'HTTP',
  server: 'Server',
  quiz: 'Lernquiz',
};
const SERVICE_TONES: Record<string, Tone> = {
  assistant: 'ok',
  campus: 'blue',
  ilias: 'purple',
  mail: 'info',
  oidc: 'purple',
  sync: 'warn',
  auth: 'info',
  admin: 'blue',
};
const LEVEL_NAMES: Record<string, string> = { debug: 'Debug', info: 'Info', warn: 'Warnung', error: 'Fehler' };
const LEVEL_TONES: Record<string, Tone> = { debug: '', info: 'blue', warn: 'warn', error: 'danger' };

function relative(iso: string | null | undefined) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return 'gerade eben';
  if (minutes < 60) return `vor ${minutes} Min.`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  return `vor ${Math.round(hours / 24)} Tg.`;
}

function detailText(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(detailText).filter(Boolean).join(', ');
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== null && item !== undefined && item !== '')
      .map(([key, item]) => `${key}: ${detailText(item)}`)
      .join(' · ');
  }
  return String(value);
}

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
    <div className="view-stack">
      <section className="card toolbar">
        <label className="field grow">
          Suche
          <div className="search-field">
            <span className="icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></svg>
            </span>
            <input
              type="search"
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(1); }}
              placeholder="Nachricht, Detail oder Dienst"
            />
          </div>
        </label>
        <Field label="Dienst">
          <Select value={service} onChange={(event) => { setService(event.target.value); setPage(1); }}>
            <option value="">Alle Dienste</option>
            {services.map((item: any) => (
              <option key={item.service} value={item.service}>{SERVICE_NAMES[item.service] ?? item.service} ({item.count})</option>
            ))}
          </Select>
        </Field>
        <Field label="Stufe">
          <Select value={level} onChange={(event) => { setLevel(event.target.value); setPage(1); }}>
            <option value="">Alle Stufen</option>
            {levels.map((item: any) => (
              <option key={item.level} value={item.level}>{LEVEL_NAMES[item.level] ?? item.level} ({item.count})</option>
            ))}
          </Select>
        </Field>
        <Checkbox label="Auto (5 s)" checked={auto} onChange={(event) => setAuto(event.target.checked)} />
        <Button variant="secondary" size="small" onClick={() => logs.refetch()}>Neu laden</Button>
        <Button variant="danger" size="small" onClick={() => setConfirmClear(true)}>Leeren</Button>
      </section>
      {logs.error ? <ErrorState message={logs.error instanceof Error ? logs.error.message : 'Logs konnten nicht geladen werden.'} /> : (
        <DataTable
          rows={entries}
          rowKey={(entry: any) => entry.id}
          loading={logs.isLoading}
          empty="Keine Log-Zeilen"
          tableClassName="data log-table"
          footer={<Pagination page={page} pageSize={PAGE_SIZE} total={data.total ?? 0} onPage={setPage} />}
          columns={[
            {
              key: 'time',
              header: 'Zeit',
              render: (entry: any) => (
                <div className="who-text">
                  <strong style={{ fontSize: 12.5 }}>{formatTimestamp(entry.createdAt, 'de')}</strong>
                  <span>{relative(entry.createdAt)}</span>
                </div>
              ),
            },
            {
              key: 'service',
              header: 'Dienst',
              render: (entry: any) => (
                <div>
                  <Badge tone={SERVICE_TONES[entry.service] ?? ''}>{SERVICE_NAMES[entry.service] ?? entry.service}</Badge>
                  <div className="hint mono">{entry.service}</div>
                </div>
              ),
            },
            {
              key: 'level',
              header: 'Stufe',
              render: (entry: any) => <Badge tone={LEVEL_TONES[entry.level] ?? ''}>{LEVEL_NAMES[entry.level] ?? entry.level}</Badge>,
            },
            {
              key: 'message',
              header: 'Meldung',
              className: 'log-message-cell',
              render: (entry: any) => <div className="log-message">{entry.message}</div>,
            },
            {
              key: 'detail',
              header: 'Details',
              className: 'log-detail-cell',
              render: (entry: any) => (
                <>
                  {entry.userId ? (
                    <Link className="tiny mono" to="/users/$userId" params={{ userId: entry.userId }}>{entry.userId}</Link>
                  ) : null}
                  {entry.detail ? <div className="log-detail">{detailText(entry.detail)}</div> : null}
                </>
              ),
            },
          ]}
        />
      )}
      <Dialog
        open={confirmClear}
        title="Gefilterte Logs löschen?"
        onClose={() => setConfirmClear(false)}
        actions={<><Button variant="secondary" onClick={() => setConfirmClear(false)}>Abbrechen</Button><Button variant="danger" disabled={clear.isPending} onClick={() => clear.mutate()}>{clear.isPending ? 'Löschen …' : 'Löschen'}</Button></>}
      >
        <p>Es werden alle Zeilen mit den aktuellen Filtern gelöscht. Die Aktion wird auditiert.</p>
      </Dialog>
    </div>
  );
}
