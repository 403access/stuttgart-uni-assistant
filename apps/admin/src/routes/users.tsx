import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearch } from '@tanstack/react-router';
import { formatDate, formatTimestamp } from '@ua/format';
import { Avatar, Badge, Button, Dialog, EmptyState, Field, Input, Select, useToast } from '@ua/ui-react';
import { useState } from 'react';

import { api } from '../lib/api';

interface PlatformLink { id: string; status: string; lastSyncAt?: string | null }
interface UserRow {
  id: string;
  account: string;
  name?: string | null;
  email?: string | null;
  matriculation?: string | null;
  mode: string;
  createdAt: string;
  lastLoginAt?: string | null;
  activeSessions: number;
  campusSource?: string | null;
  campusActive?: boolean;
  platforms: PlatformLink[];
  data: { nodes: number; completedNodes: number; courses: number; events: number; calls: number };
}

const PAGE_SIZES = [10, 25, 50, 100];
const SORTS: [string, string][] = [
  ['recent', 'Zuletzt aktiv'],
  ['created', 'Neu angelegt'],
  ['name', 'Name'],
  ['account', 'Kennung'],
  ['sessions', 'Sitzungen'],
  ['data', 'Datenbestand'],
];
const PLATFORM_NAMES: Record<string, string> = { campus: 'C@MPUS', ilias: 'ILIAS', sdg: 'SDG Campus', siam: 'SIAM', mail: 'UniMail' };

function modeName(mode: string) {
  if (mode === 'campus') return 'C@MPUS';
  if (mode === 'oidc') return 'SIAM';
  if (mode === 'demo') return 'Demo';
  return 'Lokal';
}
function relative(iso: string | null | undefined) {
  if (!iso) return 'nie';
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return 'gerade eben';
  if (minutes < 60) return `vor ${minutes} Min.`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  const days = Math.round(hours / 24);
  return `vor ${days} Tg.`;
}

export function UsersPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const searchParams = useSearch({ strict: false }) as Record<string, string | undefined>;
  const [query, setQuery] = useState(searchParams.query ?? '');
  const [mode, setMode] = useState(searchParams.mode ?? '');
  const [platform, setPlatform] = useState(searchParams.platform ?? '');
  const [credential, setCredential] = useState(searchParams.credential ?? '');
  const [activity, setActivity] = useState(searchParams.activity ?? '');
  const [data, setData] = useState(searchParams.data ?? '');
  const [sort, setSort] = useState(searchParams.sort ?? 'recent');
  const [limit, setLimit] = useState(25);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ account: '', name: '', email: '', matriculation: '', subject: '', mode: 'local' });
  const [confirm, setConfirm] = useState<null | { kind: 'sessions' | 'portal'; count: number }>(null);
  const [confirmText, setConfirmText] = useState('');

  const filters = { query, mode, platform, credential, activity, data, sort, limit, offset: (page - 1) * limit };
  const users = useQuery({ queryKey: ['users', filters], queryFn: () => api.users(filters) });
  const payload = (users.data ?? {}) as { users?: UserRow[]; total?: number };
  const rows = payload.users ?? [];
  const total = payload.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / limit));

  const reset = () => {
    setQuery(''); setMode(''); setPlatform(''); setCredential(''); setActivity(''); setData(''); setSort('recent'); setLimit(25); setPage(1); setSelected(new Set());
  };
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['users'] });
    queryClient.invalidateQueries({ queryKey: ['overview'] });
  };
  const toggle = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const allSelected = rows.length > 0 && rows.every((row) => selected.has(row.id));

  const create = useMutation({
    mutationFn: () => api.createUser(form),
    onSuccess: () => {
      setCreateOpen(false);
      setForm({ account: '', name: '', email: '', matriculation: '', subject: '', mode: 'local' });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['overview'] });
      toast.show('Konto angelegt.', 'ok');
    },
    onError: (error) => toast.show(error instanceof Error ? error.message : 'Konto konnte nicht angelegt werden.', 'error'),
  });

  const bulk = useMutation({
    mutationFn: async (kind: 'sessions' | 'portal') => {
      let done = 0; let failed = 0;
      for (const id of selected) {
        try {
          if (kind === 'sessions') await api.userRevokeSessions(id);
          else await api.userClearPortal(id, undefined);
          done += 1;
        } catch { failed += 1; }
      }
      return { done, failed };
    },
    onSuccess: ({ done, failed }, kind) => {
      setConfirm(null); setConfirmText(''); setSelected(new Set());
      refresh();
      toast.show(`${done} Konten ${kind === 'sessions' ? 'abgemeldet' : 'bereinigt'}${failed ? `, ${failed} fehlgeschlagen` : ''}.`, failed ? 'error' : 'ok');
    },
  });

  async function exportCsv() {
    const all: UserRow[] = [];
    let offset = 0;
    let totalRows = Infinity;
    while (offset < totalRows && offset < 4000) {
      const result = await api.users({ ...filters, limit: 200, offset }) as { users?: UserRow[]; total?: number };
      totalRows = result.total ?? 0;
      all.push(...(result.users ?? []));
      offset += result.users?.length ?? 0;
      if (!result.users?.length) break;
    }
    const header = ['Kennung', 'Name', 'E-Mail', 'Matrikelnummer', 'Modus', 'Plattformen', 'C@MPUS-Quelle', 'C@MPUS aktiv', 'Sitzungen', 'Portal-Knoten', 'Abgeschlossene Knoten', 'Kurse', 'Kalendertermine', 'Portal-Aufrufe', 'Erstellt', 'Letzte Anmeldung', 'Konto-ID'];
    const cell = (value: unknown) => {
      let text = String(value ?? '');
      if (/^[=+\-@]/.test(text)) text = `'${text}`;
      return `"${text.replace(/"/g, '""')}"`;
    };
    const lines = [header.map(cell).join(';'), ...all.map((user) => [
      user.account, user.name ?? '', user.email ?? '', user.matriculation ?? '', modeName(user.mode),
      user.platforms.map((link) => `${PLATFORM_NAMES[link.id] ?? link.id}:${link.status}`).join(', '),
      user.campusSource ?? '', user.campusActive ? 'ja' : 'nein', user.activeSessions,
      user.data.nodes, user.data.completedNodes, user.data.courses, user.data.events, user.data.calls,
      formatDate(user.createdAt.slice(0, 10), 'de'), user.lastLoginAt ? formatDate(user.lastLoginAt.slice(0, 10), 'de') : '', user.id,
    ].map(cell).join(';'))];
    const blob = new Blob([`\uFEFF${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `konten-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast.show(`${all.length} Konten exportiert${all.length < totalRows ? ' (Limit 4.000)' : ''}.`, 'ok');
  }

  return (
    <div className="view-stack">
      <section className="card toolbar" aria-label="Filter">
        <label className="field grow">Suche
          <div className="search-field"><span className="icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></svg></span>
            <input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Kennung, Name, E-Mail oder Matrikelnummer" />
          </div>
        </label>
        <label className="field">Modus<select value={mode} onChange={(event) => { setMode(event.target.value); setPage(1); }}><option value="">Alle Modi</option><option value="campus">C@MPUS</option><option value="oidc">SIAM</option><option value="demo">Demo</option><option value="local">Lokal</option></select></label>
        <label className="field">Plattform<select value={platform} onChange={(event) => { setPlatform(event.target.value); setPage(1); }}><option value="">Alle Plattformen</option>{Object.entries(PLATFORM_NAMES).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
        <label className="field">C@MPUS-Zugang<select value={credential} onChange={(event) => { setCredential(event.target.value); setPage(1); }}><option value="">Alle</option><option value="active">Im Speicher aktiv</option><option value="env">.env</option><option value="browser">Browser</option><option value="none">Kein Zugang</option></select></label>
        <label className="field">Aktivität<select value={activity} onChange={(event) => { setActivity(event.target.value); setPage(1); }}><option value="">Alle</option><option value="active">Aktive Sitzung</option><option value="inactive">Keine Sitzung</option><option value="never">Nie angemeldet</option></select></label>
        <label className="field">Datenbestand<select value={data} onChange={(event) => { setData(event.target.value); setPage(1); }}><option value="">Alle Daten</option><option value="portal">Portal-Knoten</option><option value="courses">Kurse</option><option value="events">Kalender</option><option value="calls">Portal-Aufrufe</option><option value="empty">Ohne Daten</option></select></label>
        <label className="field">Sortierung<select value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }}>{SORTS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        <label className="field" style={{ flex: '0 1 130px' }}>Pro Seite<select value={limit} onChange={(event) => { setLimit(Number(event.target.value)); setPage(1); }}>{PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}</select></label>
        <button className="btn secondary" type="button" onClick={reset}>Zurücksetzen</button>
        <button className="btn secondary" type="button" onClick={exportCsv}>CSV</button>
        <button className="btn" type="button" onClick={() => setCreateOpen(true)}>Konto anlegen</button>
      </section>

      {selected.size ? (
        <div className="card" style={{ padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Badge tone="blue">{selected.size} ausgewählt</Badge>
          <span style={{ flex: 1 }} />
          <Button variant="secondary" size="small" onClick={() => setSelected(new Set())}>Auswahl aufheben</Button>
          <Button variant="danger" size="small" onClick={() => setConfirm({ kind: 'sessions', count: selected.size })}>Sitzungen widerrufen</Button>
          <Button variant="danger" size="small" onClick={() => setConfirm({ kind: 'portal', count: selected.size })}>Portal-Daten löschen</Button>
        </div>
      ) : null}

      <section className="card table-card">
        <div className="table-wrap">
          <table className="data">
            <caption className="sr-only">Kontenliste</caption>
            <thead>
              <tr>
                <th style={{ width: 38 }}><input type="checkbox" className="checkbox" aria-label="Alle Konten dieser Seite auswählen" checked={allSelected} onChange={(event) => {
                  if (event.target.checked) setSelected(new Set(rows.map((row) => row.id)));
                  else setSelected(new Set());
                }} /></th>
                <th>Nutzer</th><th>Modus</th><th>Plattformen</th><th>C@MPUS</th><th className="num">Sitzungen</th><th>Daten</th><th>Zuletzt aktiv</th><th />
              </tr>
            </thead>
            <tbody>
              {users.isLoading ? <tr><td colSpan={9}><div className="loading">Konten werden geladen …</div></td></tr> : rows.length ? rows.map((user) => (
                <tr key={user.id} className={selected.has(user.id) ? 'selected' : ''}>
                  <td><input type="checkbox" className="checkbox" aria-label={`Konto ${user.account} auswählen`} checked={selected.has(user.id)} onChange={() => toggle(user.id)} /></td>
                  <td>
                    <Link className="who" to="/users/$userId" params={{ userId: user.id }} style={{ color: 'inherit' }}>
                      <Avatar name={user.name || user.account} />
                      <span className="who-text"><strong>{user.name || user.account}</strong><span>{user.account}{user.email ? ` · ${user.email}` : ''}</span></span>
                    </Link>
                  </td>
                  <td><Badge tone={user.mode === 'campus' ? 'blue' : ''}>{modeName(user.mode)}</Badge></td>
                  <td>{user.platforms.length ? <div className="stack">{user.platforms.slice(0, 5).map((link) => <span className="chip" key={link.id}><span className="dot" style={{ width: 6, height: 6, borderRadius: '50%', background: link.status === 'connected' ? 'var(--ok)' : 'var(--muted-2)' }} />{PLATFORM_NAMES[link.id] ?? link.id}</span>)}</div> : <span className="hint">keine</span>}</td>
                  <td>{user.campusActive ? <Badge tone="ok">aktiv im Speicher</Badge> : user.campusSource ? <Badge tone="warn">{user.campusSource === 'env' ? '.env' : 'Browser'}</Badge> : <Badge>kein Zugang</Badge>}</td>
                  <td className="num">{user.activeSessions ? <strong>{user.activeSessions}</strong> : <span className="muted">0</span>}</td>
                  <td><div className="who-text" style={{ gap: 2 }}><strong>{user.data.nodes} Knoten</strong><span>{user.data.courses} Kurse · {user.data.events} Termine</span></div></td>
                  <td><div className="who-text"><strong style={{ fontSize: 12.5 }}>{relative(user.lastLoginAt)}</strong><span>{user.lastLoginAt ? formatTimestamp(user.lastLoginAt, 'de') : 'nie angemeldet'}</span></div></td>
                  <td><Link className="btn secondary small" to="/users/$userId" params={{ userId: user.id }}>Details</Link></td>
                </tr>
              )) : <tr><td colSpan={9}><EmptyState title="Keine Konten gefunden" detail="Passe Suche oder Filter an, um wieder Ergebnisse zu sehen." /></td></tr>}
            </tbody>
          </table>
        </div>
        <div className="pager">
          <span className="hint">{total === 0 ? '0' : `${(page - 1) * limit + 1}–${Math.min(page * limit, total)} von ${total}`}</span>
          <div className="row">
            <Button variant="secondary" size="small" disabled={page <= 1} onClick={() => setPage(1)}>Erste</Button>
            <Button variant="secondary" size="small" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Zurück</Button>
            <span className="page-num current">{page} / {pages}</span>
            <Button variant="secondary" size="small" disabled={page >= pages} onClick={() => setPage((value) => Math.min(pages, value + 1))}>Weiter</Button>
            <Button variant="secondary" size="small" disabled={page >= pages} onClick={() => setPage(pages)}>Letzte</Button>
          </div>
        </div>
      </section>

      <Dialog open={createOpen} title="Konto anlegen" wide onClose={() => setCreateOpen(false)} actions={<><button className="btn secondary" type="button" onClick={() => setCreateOpen(false)}>Abbrechen</button><button className="btn" type="button" disabled={!form.account.trim() || create.isPending} onClick={() => create.mutate()}>{create.isPending ? 'Anlegen …' : 'Konto anlegen'}</button></>}>
        <p className="hint" style={{ marginTop: -8 }}>Legt ein Konto ohne Sitzung an. Die Anmeldung erfolgt weiterhin über den gewählten Weg.</p>
        <div className="form-grid">
          <Field label="Kennung (Login)"><Input value={form.account} onChange={(event) => setForm({ ...form, account: event.target.value })} placeholder="z. B. st123456" /></Field>
          <Field label="Name"><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Vor- und Nachname" /></Field>
          <Field label="E-Mail"><Input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="name@example.de" /></Field>
          <Field label="Matrikelnummer"><Input value={form.matriculation} onChange={(event) => setForm({ ...form, matriculation: event.target.value })} placeholder="1234567" /></Field>
          <Field label="Subjekt / ID"><Input value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} placeholder="optional" /></Field>
          <Field label="Anmeldemodus"><Select value={form.mode} onChange={(event) => setForm({ ...form, mode: event.target.value })}><option value="local">Lokal</option><option value="demo">Demo</option><option value="campus">C@MPUS</option><option value="oidc">SIAM</option></Select></Field>
        </div>
      </Dialog>

      <Dialog open={Boolean(confirm)} title={confirm?.kind === 'sessions' ? `Sitzungen für ${confirm?.count} Konten widerrufen?` : `Portal-Daten für ${confirm?.count} Konten löschen?`} onClose={() => { setConfirm(null); setConfirmText(''); }} actions={<><button className="btn secondary" type="button" onClick={() => { setConfirm(null); setConfirmText(''); }}>Abbrechen</button><button className="btn danger" type="button" disabled={bulk.isPending || (confirm?.kind === 'portal' && confirmText !== 'LÖSCHEN')} onClick={() => confirm && bulk.mutate(confirm.kind)}>{bulk.isPending ? 'Ausführen …' : 'Bestätigen'}</button></>}>
        <p>{confirm?.kind === 'sessions' ? 'Alle aktiven App-Sitzungen dieser Konten werden sofort ungültig. Die Konten und Daten bleiben erhalten.' : 'Portal-Knoten, Kurse, Studiengangs-Snapshots, Kalendertermine und Aufrufprotokolle dieser Konten werden unwiderruflich gelöscht.'}</p>
        {confirm?.kind === 'portal' ? <Field label="Zum Bestätigen LÖSCHEN eingeben"><Input value={confirmText} onChange={(event) => setConfirmText(event.target.value)} /></Field> : null}
      </Dialog>
    </div>
  );
}
