import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { formatTimestamp } from '@ua/format';
import {
  Badge,
  Button,
  Callout,
  DataTable,
  Dialog,
  ErrorState,
  Field,
  FieldBox,
  Muted,
  Pagination,
  Select,
  useToast,
} from '@ua/ui-react';
import { useState } from 'react';

import { api } from '../lib/api';

const PAGE_SIZES = [25, 50, 100, 200];
const STATE_NAMES: Record<string, string> = {
  pending: 'wartet auf Scan',
  approved: 'genehmigt',
  active: 'aktiv',
  linked: 'verknüpft',
  expired: 'abgelaufen',
  revoked: 'widerrufen',
};

function relative(iso: string | null | undefined) {
  if (!iso) return '–';
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return 'gerade eben';
  if (minutes < 60) return `vor ${minutes} Min.`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  return `vor ${Math.round(hours / 24)} Tg.`;
}

function stateTone(state: string) {
  if (state === 'active' || state === 'linked') return 'ok';
  if (state === 'revoked') return 'danger';
  if (state === 'pending' || state === 'expired') return 'warn';
  return 'blue';
}

function typeBadge(client: any) {
  const type = client?.type ?? 'unknown';
  const label = type === 'desktop' ? 'Desktop' : type === 'mobile' ? 'Mobil' : type === 'tablet' ? 'Tablet' : type === 'bot' ? 'Bot' : 'Unbekannt';
  return <Badge tone={type === 'mobile' ? 'blue' : type === 'tablet' ? 'purple' : type === 'bot' ? 'warn' : ''}>{label}</Badge>;
}

export function DevicesPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const toast = useToast();
  const searchParams = useSearch({ strict: false }) as Record<string, string | undefined>;
  const [search, setSearch] = useState(searchParams.query ?? '');
  const [state, setState] = useState(searchParams.state ?? '');
  const [limit, setLimit] = useState(PAGE_SIZES.includes(Number(searchParams.limit)) ? Number(searchParams.limit) : 50);
  const [page, setPage] = useState(1);
  const [revoking, setRevoking] = useState<any | null>(null);
  const [selected, setSelected] = useState<any | null>(null);
  const devices = useQuery({
    queryKey: ['devices', search, state, limit, page],
    queryFn: () => api.devices({ query: search, state, limit, offset: (page - 1) * limit }),
  });
  const data = (devices.data ?? {}) as any;
  const rows: any[] = data.devices ?? [];
  const revoke = useMutation({
    mutationFn: (id: string) => api.revokeDevice(id),
    onSuccess: () => {
      setRevoking(null);
      setSelected(null);
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      queryClient.invalidateQueries({ queryKey: ['overview'] });
      toast.show('Gerät widerrufen.', 'ok');
    },
    onError: (error) => toast.show(error instanceof Error ? error.message : 'Widerruf fehlgeschlagen.', 'error'),
  });

  return (
    <div className="view-stack">
      <section className="card toolbar" aria-label="Gerätefilter">
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
              placeholder="Gerät, Konto, Browser, Betriebssystem, IP-Adresse oder Geräte-ID"
            />
          </div>
        </label>
        <Field label="Status">
          <Select value={state} onChange={(event) => { setState(event.target.value); setPage(1); }}>
            <option value="">Alle Status</option>
            <option value="pending">Wartet auf Scan</option>
            <option value="approved">Genehmigt</option>
            <option value="active">Aktiv</option>
            <option value="linked">Verknüpft</option>
            <option value="expired">Abgelaufen</option>
            <option value="revoked">Widerrufen</option>
          </Select>
        </Field>
        <Field label="Pro Seite">
          <Select value={limit} onChange={(event) => { setLimit(Number(event.target.value)); setPage(1); }}>
            {PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
          </Select>
        </Field>
      </section>

      {devices.error ? <ErrorState message={devices.error instanceof Error ? devices.error.message : 'Geräte konnten nicht geladen werden.'} /> : (
        <DataTable
          rows={rows}
          rowKey={(device: any) => device.id}
          loading={devices.isLoading}
          empty="Keine Geräte"
          onRowClick={(device: any) => setSelected(device)}
          footer={<Pagination page={page} pageSize={limit} total={data.total ?? 0} onPage={setPage} />}
          columns={[
            {
              key: 'device',
              header: 'Gerät',
              render: (device: any) => (
                <div className="who-text">
                  <strong>{device.name}{device.client?.browser && !device.name.includes(device.client.browser) ? ` · ${device.client.browser}` : ''}</strong>
                  <span>{device.userAgent || device.id}</span>
                </div>
              ),
            },
            { key: 'type', header: 'Typ', render: (device: any) => <div>{typeBadge(device.client)}{device.client?.device ? <div className="hint">{device.client.device}</div> : null}</div> },
            { key: 'os', header: 'Betriebssystem', render: (device: any) => <div><span>{device.client?.os || '–'}</span>{device.client?.osVersion ? <div className="hint">Version {device.client.osVersion}</div> : null}</div> },
            { key: 'browser', header: 'Browser', render: (device: any) => <div><span>{device.client?.browser || '–'}</span>{device.client?.browserVersion ? <div className="hint">Version {device.client.browserVersion}{device.client.engine ? ` · ${device.client.engine}` : ''}</div> : null}</div> },
            {
              key: 'ip',
              header: 'IP-Adresse',
              render: (device: any) => (
                <div className="who-text">
                  <strong className="mono" style={{ fontSize: 11.5 }}>{device.lastIpAddress || device.ipAddress || '–'}</strong>
                  {device.ipAddress && device.lastIpAddress && device.ipAddress !== device.lastIpAddress ? <span>ursprünglich {device.ipAddress}</span> : null}
                </div>
              ),
            },
            {
              key: 'account',
              header: 'Konto',
              render: (device: any) => device.account ? (
                <Link className="who-text" to="/users/$userId" params={{ userId: device.userId }} style={{ color: 'inherit', textDecoration: 'none' }} onClick={(event) => event.stopPropagation()}>
                  <strong>{device.userName || device.account}</strong>
                  <span>{device.account}</span>
                </Link>
              ) : <span className="hint">noch nicht genehmigt</span>,
            },
            { key: 'state', header: 'Status', render: (device: any) => <Badge tone={stateTone(device.state)}>{STATE_NAMES[device.state] ?? device.state}</Badge> },
            {
              key: 'created',
              header: 'Erstellt',
              render: (device: any) => <div className="who-text"><strong style={{ fontSize: 12.5 }}>{relative(device.createdAt)}</strong><span>{formatTimestamp(device.createdAt, 'de')}</span></div>,
            },
            { key: 'approved', header: 'Genehmigt', render: (device: any) => device.approvedAt ? formatTimestamp(device.approvedAt, 'de') : <Muted>–</Muted> },
            {
              key: 'last',
              header: 'Letzte Aktivität',
              render: (device: any) => (device.session?.lastSeenAt || device.lastSeenAt)
                ? formatTimestamp(device.session?.lastSeenAt ?? device.lastSeenAt, 'de')
                : <Muted>–</Muted>,
            },
            {
              key: 'session',
              header: 'Sitzung',
              render: (device: any) => device.session ? (
                <div className="who-text">
                  <strong className="mono" style={{ fontSize: 11 }}>{device.session.id}</strong>
                  <span>{device.session.expiresAt ? `bis ${formatTimestamp(device.session.expiresAt, 'de')}` : ''}</span>
                </div>
              ) : <Muted>keine</Muted>,
            },
            {
              key: 'actions',
              header: '',
              render: (device: any) => device.state !== 'revoked' ? (
                <Button variant="danger" size="small" onClick={(event) => { event.stopPropagation(); setRevoking(device); }}>Widerrufen</Button>
              ) : <Muted>–</Muted>,
            },
          ]}
        />
      )}

      <Callout>
        Der QR-Code ist zehn Minuten gültig und lässt sich genau einmal einlösen. Beim Widerruf wird die zugehörige
        Websitzung sofort ungültig; der Browser muss erneut einen QR-Code scannen. Pairing-Tokens werden nie im
        Klartext gespeichert.
      </Callout>

      <Dialog
        open={Boolean(selected)}
        wide
        title={selected?.name ?? 'Gerät'}
        onClose={() => setSelected(null)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setSelected(null)}>Schließen</Button>
            {selected?.userId ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setSelected(null);
                  navigate({ to: '/users/$userId', params: { userId: selected.userId } });
                }}
              >
                Konto öffnen
              </Button>
            ) : null}
            {selected && selected.state !== 'revoked' ? (
              <Button variant="danger" onClick={() => setRevoking(selected)}>Widerrufen</Button>
            ) : null}
          </>
        }
      >
        {selected ? (
          <div className="field-grid">
            <FieldBox label="Geräte-ID" value={<span className="row tight"><span className="mono tiny">{selected.id}</span></span>} />
            <FieldBox label="Status" value={<Badge tone={stateTone(selected.state)}>{STATE_NAMES[selected.state] ?? selected.state}</Badge>} />
            <FieldBox label="Typ" value={typeBadge(selected.client)} />
            <FieldBox label="Betriebssystem" value={`${selected.client?.os || '–'}${selected.client?.osVersion ? ` ${selected.client.osVersion}` : ''}`} />
            <FieldBox label="Browser" value={`${selected.client?.browser || '–'}${selected.client?.browserVersion ? ` ${selected.client.browserVersion}` : ''}`} />
            <FieldBox label="IP-Adresse" value={selected.lastIpAddress || selected.ipAddress || '–'} />
            <FieldBox label="Konto" value={selected.account ? `${selected.userName || selected.account} · ${selected.account}` : 'noch nicht genehmigt'} />
            <FieldBox label="Erstellt" value={formatTimestamp(selected.createdAt, 'de')} />
            <FieldBox label="Genehmigt" value={selected.approvedAt ? formatTimestamp(selected.approvedAt, 'de') : '–'} />
            <FieldBox label="Letzte Aktivität" value={(selected.session?.lastSeenAt || selected.lastSeenAt) ? formatTimestamp(selected.session?.lastSeenAt ?? selected.lastSeenAt, 'de') : '–'} />
            <FieldBox label="Sitzung" value={selected.session?.id ?? 'keine'} />
            <FieldBox label="Sitzung läuft ab" value={selected.session?.expiresAt ? formatTimestamp(selected.session.expiresAt, 'de') : '–'} />
            <div style={{ gridColumn: '1 / -1' }}>
              <FieldBox label="User-Agent" value={<span className="mono tiny">{selected.userAgent || '–'}</span>} />
            </div>
          </div>
        ) : null}
      </Dialog>

      <Dialog
        open={Boolean(revoking)}
        title="Gerät widerrufen?"
        onClose={() => setRevoking(null)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setRevoking(null)}>Abbrechen</Button>
            <Button variant="danger" disabled={revoke.isPending} onClick={() => revoking && revoke.mutate(revoking.id)}>
              {revoke.isPending ? 'Widerrufen …' : 'Gerät widerrufen'}
            </Button>
          </>
        }
      >
        <p>
          Die Websitzung von „{revoking?.name}“ wird sofort ungültig. Der Browser muss einen neuen QR-Code scannen.
          Das Konto und seine Daten bleiben erhalten.
        </p>
      </Dialog>
    </div>
  );
}
