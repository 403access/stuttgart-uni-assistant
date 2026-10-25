import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { formatTimestamp } from '@ua/format';
import {
  Avatar,
  BackLink,
  Badge,
  Button,
  Callout,
  CopyButton,
  DataTable,
  Dialog,
  ErrorState,
  Field,
  FieldBox,
  Input,
  Pagination,
  Select,
  Spinner,
  Tabs,
  Timeline,
  TimelineItem,
  useToast,
} from '@ua/ui-react';
import { useState } from 'react';

import { api } from '../lib/api';
import { IliasViewerDialog } from './ilias-viewer';

const TABS = [
  { id: 'overview', label: 'Übersicht' },
  { id: 'sessions', label: 'Sitzungen' },
  { id: 'devices', label: 'Geräte' },
  { id: 'platforms', label: 'Plattformen' },
  { id: 'campus', label: 'C@MPUS' },
  { id: 'ilias', label: 'ILIAS' },
  { id: 'data', label: 'Studiengänge' },
  { id: 'calendar', label: 'Kalender' },
  { id: 'calls', label: 'Aufrufe' },
  { id: 'quiz', label: 'Lernquiz' },
  { id: 'audit', label: 'Aktivität' },
];

const MODE_NAMES: Record<string, string> = { local: 'Lokal', campus: 'C@MPUS', oidc: 'SIAM', demo: 'Demo' };
const PLATFORM_NAMES: Record<string, string> = { campus: 'C@MPUS', ilias: 'ILIAS', sdg: 'SDG Campus', siam: 'SIAM', mail: 'UniMail' };
const AUDIT_LABELS: Record<string, string> = {
  'user.create': 'Konto angelegt',
  'user.update': 'Konto geändert',
  'user.delete': 'Konto gelöscht',
  'session.revoke': 'Sitzung widerrufen',
  'sessions.revoke': 'Sitzungen widerrufen',
  'device.revoke': 'Gerät widerrufen',
  'platform.link': 'Plattform verknüpft',
  'platform.unlink': 'Plattform entfernt',
  'campus.disconnect': 'C@MPUS getrennt',
  'ilias.disconnect': 'ILIAS getrennt',
  'portal.clear': 'Portal-Daten gelöscht',
  'portal.events.clear': 'Kalender geleert',
  'portal.calls.clear': 'Aufrufe geleert',
  'quiz.catalog.seed': 'Lernquiz eingespielt',
};
const DANGEROUS = new Set(['user.delete', 'session.revoke', 'sessions.revoke', 'device.revoke', 'platform.unlink', 'portal.clear', 'portal.events.clear', 'portal.calls.clear']);

function relative(iso: string | null | undefined) {
  if (!iso) return 'nie';
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return 'gerade eben';
  if (minutes < 60) return `vor ${minutes} Min.`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  return `vor ${Math.round(hours / 24)} Tg.`;
}

function detailText(detail: unknown) {
  if (!detail) return '';
  if (typeof detail === 'string') return detail;
  const value = detail as any;
  return value.label ?? value.title ?? value.id ?? JSON.stringify(detail);
}

function modeName(mode: string) {
  return MODE_NAMES[mode] ?? 'Lokal';
}

export function UserDetailPage() {
  const params = useParams({ strict: false }) as { userId: string };
  const search = useSearch({ strict: false }) as { tab?: string };
  const userId = params.userId;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [tab, setTab] = useState(TABS.some((item) => item.id === search.tab) ? search.tab! : 'overview');
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState<null | { kind: 'portal' | 'events' | 'calls'; studyId?: number; label: string }>(null);
  const [form, setForm] = useState<any>({});
  const [linkForm, setLinkForm] = useState({ platform: 'campus', account: '', status: 'linked' });
  const [iliasView, setIliasView] = useState<any | null>(null);
  const [nodeStudy, setNodeStudy] = useState('');
  const [nodeState, setNodeState] = useState('');
  const [nodeQuery, setNodeQuery] = useState('');
  const [nodePage, setNodePage] = useState(1);
  const [eventPage, setEventPage] = useState(1);
  const [callPage, setCallPage] = useState(1);

  const detailQuery = useQuery({ queryKey: ['user', userId], queryFn: () => api.user(userId) });
  const detail = (detailQuery.data ?? {}) as any;
  const user = detail.user;
  const nodes = useQuery({
    queryKey: ['user', userId, 'nodes', nodeStudy, nodeState, nodeQuery, nodePage],
    queryFn: () => api.userNodes(userId, { studyId: nodeStudy, state: nodeState, query: nodeQuery, limit: 50, offset: (nodePage - 1) * 50 }),
    enabled: tab === 'data',
  });
  const events = useQuery({
    queryKey: ['user', userId, 'events', eventPage],
    queryFn: () => api.userEvents(userId, { limit: 50, offset: (eventPage - 1) * 50 }),
    enabled: tab === 'calendar',
  });
  const calls = useQuery({
    queryKey: ['user', userId, 'calls', callPage],
    queryFn: () => api.userCalls(userId, { limit: 50, offset: (callPage - 1) * 50 }),
    enabled: tab === 'calls',
  });
  const quiz = useQuery({
    queryKey: ['user', userId, 'quiz'],
    queryFn: () => api.userQuiz(userId),
    enabled: tab === 'quiz',
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['user', userId] });
    queryClient.invalidateQueries({ queryKey: ['users'] });
    queryClient.invalidateQueries({ queryKey: ['overview'] });
  };
  const update = useMutation({
    mutationFn: () => api.updateUser(userId, form),
    onSuccess: () => {
      setEditOpen(false);
      refresh();
      toast.show('Kontodaten gespeichert.', 'ok');
    },
    onError: (error) => toast.show(error instanceof Error ? error.message : 'Speichern fehlgeschlagen.', 'error'),
  });
  const remove = useMutation({
    mutationFn: () => api.deleteUser(userId),
    onSuccess: () => {
      navigate({ to: '/users' });
      toast.show('Konto gelöscht.', 'ok');
    },
    onError: (error) => toast.show(error instanceof Error ? error.message : 'Löschen fehlgeschlagen.', 'error'),
  });
  const revokeSessions = useMutation({
    mutationFn: () => api.userRevokeSessions(userId),
    onSuccess: () => {
      refresh();
      toast.show('Alle Sitzungen widerrufen.', 'ok');
    },
  });
  const revokeSession = useMutation({
    mutationFn: (sessionId: string) => api.userRevokeSession(userId, sessionId),
    onSuccess: () => {
      refresh();
      toast.show('Sitzung widerrufen.', 'ok');
    },
  });
  const revokeDevice = useMutation({
    mutationFn: (deviceId: string) => api.revokeDevice(deviceId),
    onSuccess: () => {
      refresh();
      toast.show('Gerät widerrufen.', 'ok');
    },
  });
  const linkPlatform = useMutation({
    mutationFn: () => api.userLinkPlatform(userId, linkForm),
    onSuccess: () => {
      setLinkOpen(false);
      refresh();
      toast.show('Plattform verknüpft.', 'ok');
    },
    onError: (error) => toast.show(error instanceof Error ? error.message : 'Verknüpfen fehlgeschlagen.', 'error'),
  });
  const unlinkPlatform = useMutation({
    mutationFn: (platform: string) => api.userUnlinkPlatform(userId, platform),
    onSuccess: () => {
      refresh();
      toast.show('Plattform entfernt.', 'ok');
    },
  });
  const touchPlatform = useMutation({
    mutationFn: (platform: string) => api.userTouchPlatform(userId, platform),
    onSuccess: () => {
      refresh();
      toast.show('Plattform aktualisiert.', 'ok');
    },
  });
  const disconnectCampus = useMutation({ mutationFn: () => api.userDisconnectCampus(userId), onSuccess: () => { refresh(); toast.show('C@MPUS getrennt.', 'ok'); } });
  const disconnectIlias = useMutation({ mutationFn: () => api.userDisconnectIlias(userId), onSuccess: () => { refresh(); toast.show('ILIAS getrennt.', 'ok'); } });
  const clearPortal = useMutation({
    mutationFn: (studyId?: number) => api.userClearPortal(userId, studyId),
    onSuccess: () => {
      setConfirmClear(null);
      refresh();
      queryClient.invalidateQueries({ queryKey: ['user', userId, 'nodes'] });
      toast.show('Portal-Daten gelöscht.', 'ok');
    },
    onError: (error) => toast.show(error instanceof Error ? error.message : 'Löschen fehlgeschlagen.', 'error'),
  });
  const clearCalls = useMutation({ mutationFn: () => api.userClearCalls(userId), onSuccess: () => { setConfirmClear(null); refresh(); queryClient.invalidateQueries({ queryKey: ['user', userId, 'calls'] }); toast.show('Aufrufe gelöscht.', 'ok'); } });
  const clearEvents = useMutation({ mutationFn: () => api.userClearEvents(userId), onSuccess: () => { setConfirmClear(null); refresh(); queryClient.invalidateQueries({ queryKey: ['user', userId, 'events'] }); toast.show('Kalender gelöscht.', 'ok'); } });
  const sync = useMutation({
    mutationFn: (studyId?: number) => api.userSync(userId, { studyId }),
    onSuccess: () => {
      refresh();
      toast.show('Sync gestartet.', 'ok');
    },
    onError: (error) => toast.show(error instanceof Error ? error.message : 'Sync konnte nicht starten.', 'error'),
  });

  if (detailQuery.isLoading) return <div className="loading"><Spinner /> Konto wird geladen …</div>;
  if (detailQuery.error || !user) return <ErrorState message={detailQuery.error instanceof Error ? detailQuery.error.message : 'Konto nicht gefunden.'} />;



  const counts = detail.counts ?? {};
  const studies: any[] = detail.studies ?? [];
  const sessions: any[] = detail.sessions ?? [];
  const devices: any[] = detail.devices ?? [];
  const platforms: any[] = user.platforms ?? [];
  const audit: any[] = detail.audit ?? [];
  const activeSessions = sessions.filter((session) => !session.revokedAt).length;
  const campus = detail.campus ?? {};
  const ilias = detail.ilias ?? {};

  const tabs = TABS.map((item) => {
    if (item.id === 'sessions') return { ...item, count: sessions.length };
    if (item.id === 'devices') return { ...item, count: devices.length };
    if (item.id === 'platforms') return { ...item, count: platforms.length };
    if (item.id === 'ilias') return { ...item, count: ilias.counts?.memberships };
    if (item.id === 'data') return { ...item, count: studies.length };
    if (item.id === 'calendar') return { ...item, count: counts.events };
    if (item.id === 'calls') return { ...item, count: counts.calls };
    return item;
  });

  const studyOptions = studies.map((study) => (
    <option key={study.studyId} value={study.studyId}>{study.name}</option>
  ));

  return (
    <>
      <BackLink href="/users" onNavigate={() => navigate({ to: '/users' })}>Zurück zu den Konten</BackLink>

      <section className="card profile-card">
        <Avatar name={user.name || user.account} size="lg" />
        <div className="profile-main">
          <div className="row"><h2>{user.name || user.account}</h2><span className="spacer" /></div>
          <p className="profile-sub">
            {[user.account, user.email, user.matriculation ? `Matrikel ${user.matriculation}` : null].filter(Boolean).join(' · ')}
          </p>
          <div className="badges">
            <Badge tone={user.mode === 'campus' ? 'blue' : ''}>{modeName(user.mode)}</Badge>
            {campus.active ? <Badge tone="ok">C@MPUS im Speicher</Badge> : campus.source ? <Badge tone="warn">{campus.source === 'env' ? '.env' : 'Browser'}</Badge> : <Badge>kein C@MPUS</Badge>}
            {activeSessions ? <Badge tone="ok">{activeSessions} aktive Sitzung{activeSessions === 1 ? '' : 'en'}</Badge> : <Badge>keine Sitzung</Badge>}
            <Badge tone="purple">{counts.studies ?? studies.length} Studiengänge</Badge>
          </div>
          <p className="hint">
            Konto seit {formatTimestamp(user.createdAt, 'de')} · zuletzt {user.lastLoginAt ? relative(user.lastLoginAt) : 'nie angemeldet'}
          </p>
        </div>
        <div className="profile-actions">
          <Button variant="secondary" size="small" onClick={() => { navigator.clipboard.writeText(user.id); toast.show('Konto-ID kopiert.', 'ok'); }}>ID</Button>
          <Button variant="secondary" size="small" onClick={() => detailQuery.refetch()}>Neu laden</Button>
          <Button
            variant="danger"
            size="small"
            disabled={!activeSessions || revokeSessions.isPending}
            onClick={() => revokeSessions.mutate()}
          >
            Alle abmelden
          </Button>
        </div>
      </section>

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      <section className="card section-card detail-content">
        {tab === 'overview' ? (
          <>
            <div className="detail-section">
              <h3>Kontodaten</h3>
              <div className="form-grid">
                <Field label="Kennung (Login)"><Input value={form.account ?? user.account} onChange={(event) => setForm({ ...form, account: event.target.value })} /></Field>
                <Field label="Name"><Input value={form.name ?? user.name ?? ''} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
                <Field label="E-Mail"><Input type="email" value={form.email ?? user.email ?? ''} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field>
                <Field label="Matrikelnummer"><Input value={form.matriculation ?? user.matriculation ?? ''} onChange={(event) => setForm({ ...form, matriculation: event.target.value })} /></Field>
                <Field label="Subjekt / ID"><Input value={form.subject ?? user.subject ?? ''} onChange={(event) => setForm({ ...form, subject: event.target.value })} /></Field>
                <Field label="Anmeldemodus">
                  <Select value={form.mode ?? user.mode} onChange={(event) => setForm({ ...form, mode: event.target.value })}>
                    <option value="local">Lokal</option>
                    <option value="campus">C@MPUS</option>
                    <option value="oidc">SIAM</option>
                    <option value="demo">Demo</option>
                  </Select>
                </Field>
              </div>
              <div className="form-actions">
                <Button disabled={update.isPending} onClick={() => update.mutate()}>Änderungen speichern</Button>
                <Button variant="secondary" onClick={() => setForm({ account: user.account, name: user.name ?? '', email: user.email ?? '', matriculation: user.matriculation ?? '', subject: user.subject ?? '', mode: user.mode })}>Zurücksetzen</Button>
                <span className="hint">Kennung und Modus wirken sich auf künftige Anmeldungen aus.</span>
              </div>
            </div>

            <div className="detail-section">
              <h3>Status</h3>
              <div className="field-grid">
                <FieldBox label="Konto-ID" value={<span className="row tight"><span className="mono tiny">{user.id}</span><CopyButton value={user.id} label="Konto-ID" /></span>} />
                <FieldBox label="Erstellt" value={formatTimestamp(user.createdAt, 'de')} />
                <FieldBox label="Aktualisiert" value={user.updatedAt ? formatTimestamp(user.updatedAt, 'de') : '–'} />
                <FieldBox label="Letzte Anmeldung" value={user.lastLoginAt ? `${formatTimestamp(user.lastLoginAt, 'de')} · ${relative(user.lastLoginAt)}` : 'nie'} />
                <FieldBox label="Sitzungen aktiv" value={activeSessions} />
                <FieldBox label="Web-Geräte" value={devices.length} />
                <FieldBox label="C@MPUS im Speicher" value={campus.active ? 'ja' : 'nein'} />
                <FieldBox label="C@MPUS-Quelle" value={campus.source || '–'} />
                <FieldBox label="C@MPUS-Konto" value={campus.account || '–'} />
                <FieldBox label="ENV-Zugang" value={campus.envConfigured ? 'konfiguriert' : 'nicht konfiguriert'} />
                <FieldBox label="ILIAS im Speicher" value={ilias.active ? 'ja' : 'nein'} />
                <FieldBox label="ILIAS-Konto" value={ilias.account || '–'} />
                <FieldBox label="ILIAS-Stand" value={ilias.fetchedAt ? formatTimestamp(ilias.fetchedAt, 'de') : '–'} />
                <FieldBox label="Portal-Studiengänge" value={counts.studies ?? studies.length} />
                <FieldBox label="Portal-Knoten" value={`${counts.nodes ?? 0} · ${counts.completedNodes ?? 0} abgeschlossen`} />
                <FieldBox label="In Arbeit" value={counts.inProgressNodes ?? 0} />
                <FieldBox label="Kurse" value={counts.courses ?? 0} />
                <FieldBox label="Kalendertermine" value={counts.events ?? 0} />
                <FieldBox label="Portal-Aufrufe" value={counts.calls ?? 0} />
              </div>
            </div>

            <div className="detail-section">
              <h3>Studiengänge</h3>
              <DataTable
                plain
                rows={studies}
                rowKey={(study: any) => study.studyId}
                empty="Keine Portal-Daten"
                columns={[
                  {
                    key: 'name',
                    header: 'Studiengang',
                    render: (study: any) => (
                      <div>
                        <strong>{study.name}</strong>
                        <div className="hint">{[study.intendedDegree, study.versionIdentifier, study.identifier].filter(Boolean).join(' · ') || `Studium ${study.studyId}`}</div>
                      </div>
                    ),
                  },
                  { key: 'nodes', header: 'Knoten', className: 'num', render: (study: any) => study.nodeCount ?? 0 },
                  {
                    key: 'progress',
                    header: 'Fortschritt',
                    render: (study: any) => {
                      const total = study.nodeCount || 0;
                      const done = (study.completedNodes ?? 0) + (study.inProgressNodes ?? 0);
                      const percent = total ? Math.round((done / total) * 100) : 0;
                      return <div className={`progress ${percent < 100 ? 'warn' : ''}`.trim()}><span style={{ width: `${percent}%` }} /></div>;
                    },
                  },
                  { key: 'courses', header: 'Kurse', className: 'num', render: (study: any) => study.courseCount ?? 0 },
                  {
                    key: 'state',
                    header: 'Sync',
                    render: (study: any) => study.nodesComplete ? <Badge tone="ok">vollständig</Badge> : study.nodeCount ? <Badge tone="warn">teilweise</Badge> : <Badge>leer</Badge>,
                  },
                  {
                    key: 'actions',
                    header: '',
                    render: (study: any) => (
                      <div className="row tight">
                        <Button variant="secondary" size="small" onClick={() => { setNodeStudy(String(study.studyId)); setNodePage(1); setTab('data'); }}>Öffnen</Button>
                        <Button variant="secondary" size="small" disabled={sync.isPending} onClick={() => sync.mutate(study.studyId)}>Sync</Button>
                        <Button variant="danger" size="small" onClick={() => setConfirmClear({ kind: 'portal', studyId: study.studyId, label: study.name })}>Leeren</Button>
                      </div>
                    ),
                  },
                ]}
              />
            </div>

            <div className="detail-section">
              <h3>Letzte Aktivität</h3>
              {audit.length ? (
                <Timeline>
                  {audit.map((entry) => (
                    <TimelineItem key={entry.id} dot={DANGEROUS.has(entry.action) ? 'danger' : ''} time={relative(entry.createdAt)}>
                      <strong>{AUDIT_LABELS[entry.action] || entry.action}</strong>
                      <span>{detailText(entry.detail) || '—'}</span>
                    </TimelineItem>
                  ))}
                </Timeline>
              ) : <p className="hint">Noch keine Operator-Aktionen für dieses Konto.</p>}
              <div className="row">
                <Button variant="secondary" size="small" onClick={() => navigate({ to: '/audit' })}>Vollständiges Protokoll</Button>
              </div>
            </div>

            <div className="danger-zone">
              <h3>Konto löschen</h3>
              <p className="hint">
                Löscht das Konto, alle Sitzungen, Plattformverknüpfungen, den C@MPUS-Zugang und sämtliche Portal-Daten.
                Diese Aktion lässt sich nicht rückgängig machen.
              </p>
              <div className="row">
                <Button variant="danger" size="small" onClick={() => setDeleteOpen(true)}>Konto endgültig löschen</Button>
              </div>
            </div>
          </>
        ) : null}

        {tab === 'sessions' ? (
          <div className="detail-section">
            <div className="section-head">
              <div>
                <h2>App-Sitzungen</h2>
                <p>{activeSessions} aktiv · {sessions.length} insgesamt</p>
              </div>
              <div className="actions">
                <Button variant="danger" size="small" disabled={!activeSessions || revokeSessions.isPending} onClick={() => revokeSessions.mutate()}>Alle widerrufen</Button>
              </div>
            </div>
            <DataTable
              plain
              rows={sessions}
              rowKey={(session: any) => session.id}
              empty="Keine Sitzungen"
              columns={[
                { key: 'id', header: 'Sitzung', render: (session: any) => <span className="mono tiny">{session.id.slice(0, 12)}…</span> },
                { key: 'created', header: 'Angelegt', render: (session: any) => formatTimestamp(session.createdAt, 'de') },
                { key: 'expires', header: 'Läuft ab', render: (session: any) => formatTimestamp(session.expiresAt, 'de') },
                { key: 'last', header: 'Zuletzt', render: (session: any) => session.lastSeenAt ? `${formatTimestamp(session.lastSeenAt, 'de')} · ${relative(session.lastSeenAt)}` : '–' },
                { key: 'state', header: 'Status', render: (session: any) => session.revokedAt ? <Badge tone="danger">widerrufen</Badge> : <Badge tone="ok">aktiv</Badge> },
                { key: 'device', header: 'Gerät', render: (session: any) => session.device?.name ?? '–' },
                {
                  key: 'actions',
                  header: '',
                  render: (session: any) => !session.revokedAt ? (
                    <Button variant="danger" size="small" disabled={revokeSession.isPending} onClick={() => revokeSession.mutate(session.id)}>Widerrufen</Button>
                  ) : null,
                },
              ]}
            />
          </div>
        ) : null}

        {tab === 'devices' ? (
          <div className="detail-section">
            <div className="section-head">
              <div><h2>Web-Geräte</h2><p>{devices.filter((device) => device.state === 'active').length} aktiv · {devices.length} insgesamt</p></div>
            </div>
            <DataTable
              plain
              rows={devices}
              rowKey={(device: any) => device.id}
              empty="Keine Geräte"
              columns={[
                { key: 'name', header: 'Gerät', render: (device: any) => <div><strong>{device.name}</strong><div className="hint">{device.kind ?? '–'}{device.client?.browser ? ` · ${device.client.browser}` : ''}</div></div> },
                { key: 'state', header: 'Status', render: (device: any) => <Badge tone={device.state === 'active' ? 'ok' : device.state === 'revoked' ? 'danger' : 'warn'}>{device.state}</Badge> },
                { key: 'ip', header: 'IP', render: (device: any) => device.lastIpAddress || device.ipAddress || '–' },
                { key: 'seen', header: 'Zuletzt', render: (device: any) => device.lastSeenAt ? `${formatTimestamp(device.lastSeenAt, 'de')} · ${relative(device.lastSeenAt)}` : '–' },
                { key: 'created', header: 'Angelegt', render: (device: any) => formatTimestamp(device.createdAt, 'de') },
                {
                  key: 'actions',
                  header: '',
                  render: (device: any) => device.state !== 'revoked' ? (
                    <Button variant="danger" size="small" disabled={revokeDevice.isPending} onClick={() => revokeDevice.mutate(device.id)}>Widerrufen</Button>
                  ) : null,
                },
              ]}
            />
          </div>
        ) : null}

        {tab === 'platforms' ? (
          <div className="detail-section">
            <div className="section-head">
              <div><h2>Plattformen</h2><p>Verknüpfungen des Kontos mit C@MPUS, ILIAS, SIAM, SDG und UniMail.</p></div>
              <div className="actions"><Button size="small" onClick={() => setLinkOpen(true)}>Verknüpfen</Button></div>
            </div>
            {platforms.length ? (
              <div className="field-grid">
                {platforms.map((platform: any) => (
                  <div key={platform.id} className="field-box">
                    <span className="k">{PLATFORM_NAMES[platform.id] ?? platform.id}</span>
                    <span className="v">
                      <Badge tone={platform.status === 'connected' ? 'ok' : 'blue'}>{platform.status}</Badge>
                      <span>{platform.account ?? '—'}</span>
                    </span>
                    <span className="hint">{platform.lastSyncAt ? `zuletzt ${relative(platform.lastSyncAt)}` : 'noch nicht synchronisiert'}</span>
                    <div className="row tight">
                      <Button variant="secondary" size="small" disabled={touchPlatform.isPending} onClick={() => touchPlatform.mutate(platform.id)}>Aktualisieren</Button>
                      <Button variant="danger" size="small" disabled={unlinkPlatform.isPending} onClick={() => unlinkPlatform.mutate(platform.id)}>Entfernen</Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="hint">Keine Plattformen verknüpft.</p>}
          </div>
        ) : null}

        {tab === 'campus' ? (
          <>
            <div className="detail-section">
              <h3>C@MPUS-Sitzung</h3>
              <div className="field-grid">
                <FieldBox label="Quelle" value={campus.source || '–'} />
                <FieldBox label="Konto" value={campus.account || '–'} />
                <FieldBox label="Im Speicher" value={campus.active ? 'ja' : 'nein'} />
                <FieldBox label=".env-Zugang" value={campus.envConfigured ? 'konfiguriert' : 'nicht konfiguriert'} />
                <FieldBox label="Aktualisiert" value={campus.updatedAt ? formatTimestamp(campus.updatedAt, 'de') : '–'} />
              </div>
              <div className="row">
                <Button variant="danger" size="small" disabled={!campus.active || disconnectCampus.isPending} onClick={() => disconnectCampus.mutate()}>C@MPUS trennen</Button>
                <span className="hint">Entfernt nur den gespeicherten Zugang, nicht die Portal-Daten.</span>
              </div>
            </div>
            <div className="detail-section">
              <h3>Portal-Daten pro Studiengang</h3>
              <DataTable
                plain
                rows={studies}
                rowKey={(study: any) => study.studyId}
                empty="Keine Studiengangsdaten"
                columns={[
                  { key: 'name', header: 'Studiengang', render: (study: any) => <div><strong>{study.name}</strong><div className="hint">Studium {study.studyId}</div></div> },
                  { key: 'nodes', header: 'Knoten', className: 'num', render: (study: any) => study.nodeCount ?? 0 },
                  { key: 'courses', header: 'Kurse', className: 'num', render: (study: any) => study.courseCount ?? 0 },
                  { key: 'fetched', header: 'Gelesen', render: (study: any) => study.nodesFetchedAt ? relative(study.nodesFetchedAt) : '–' },
                  {
                    key: 'actions',
                    header: '',
                    render: (study: any) => (
                      <div className="row tight">
                        <Button variant="secondary" size="small" disabled={sync.isPending} onClick={() => sync.mutate(study.studyId)}>Sync</Button>
                        <Button variant="danger" size="small" onClick={() => setConfirmClear({ kind: 'portal', studyId: study.studyId, label: study.name })}>Leeren</Button>
                      </div>
                    ),
                  },
                ]}
              />
            </div>
            <div className="danger-zone">
              <h3>Portal-Daten löschen</h3>
              <p className="hint">Entfernt Studiengänge, Knoten, Kurse, Kalender und Aufrufe dieses Kontos vollständig.</p>
              <div className="row">
                <Button variant="danger" size="small" onClick={() => setConfirmClear({ kind: 'portal', label: 'alle Portal-Daten' })}>Alles löschen</Button>
              </div>
            </div>
          </>
        ) : null}

        {tab === 'ilias' ? (
          <>
            <div className="detail-section">
              <h3>ILIAS-Sitzung</h3>
              <div className="field-grid">
                <FieldBox label="Quelle" value={ilias.source || '–'} />
                <FieldBox label="Konto" value={ilias.account || '–'} />
                <FieldBox label="Sitzung" value={ilias.active ? 'aktiv' : 'getrennt'} />
                <FieldBox label="Snapshot" value={ilias.fetchedAt ? formatTimestamp(ilias.fetchedAt, 'de') : '–'} />
                <FieldBox label="Mitgliedschaften" value={ilias.counts?.memberships ?? 0} />
                <FieldBox label="Mails" value={`${ilias.counts?.mails ?? 0} · ${ilias.counts?.unreadMails ?? 0} ungelesen`} />
              </div>
              <div className="row">
                <Button variant="danger" size="small" disabled={!ilias.active || disconnectIlias.isPending} onClick={() => disconnectIlias.mutate()}>ILIAS trennen</Button>
              </div>
            </div>
            <div className="detail-section">
              <h3>Kurse und Gruppen</h3>
              <DataTable
                plain
                rows={ilias.dashboard?.memberships ?? []}
                rowKey={(item: any) => `${item.kind}-${item.refId ?? item.id ?? item.title}`}
                empty="Keine ILIAS-Mitgliedschaften gespeichert"
                columns={[
                  { key: 'title', header: 'Mitgliedschaft', render: (item: any) => <div><strong>{item.title}</strong><div className="hint">{item.kind}{item.refId ? ` · ${item.refId}` : ''}</div></div> },
                  { key: 'type', header: 'Typ', render: (item: any) => item.type ?? '–' },
                  {
                    key: 'actions',
                    header: '',
                    render: (item: any) => (
                      <div className="row tight">
                        {item.refId ? <Button variant="secondary" size="small" onClick={() => setIliasView({ mode: 'content', item })}>Inhalte</Button> : null}
                        {item.refId ? <Button variant="secondary" size="small" onClick={() => setIliasView({ mode: 'members', item })}>Mitglieder</Button> : null}
                        <Button variant="secondary" size="small" onClick={() => setIliasView({ mode: 'profile', item })}>Profil</Button>
                      </div>
                    ),
                  },
                ]}
              />
            </div>
          </>
        ) : null}

        {tab === 'data' ? (
          <div className="detail-section">
            <div className="section-head">
              <div><h2>Studiengänge</h2><p>Knoten und Kurse aus dem gespeicherten C@MPUS-Stand.</p></div>
            </div>
            <div className="row" style={{ flexWrap: 'wrap', marginBottom: 12 }}>
              <Field label="Studiengang">
                <Select value={nodeStudy} onChange={(event) => { setNodeStudy(event.target.value); setNodePage(1); }}>
                  <option value="">Alle Studiengänge</option>
                  {studyOptions}
                </Select>
              </Field>
              <Field label="Status">
                <Select value={nodeState} onChange={(event) => { setNodeState(event.target.value); setNodePage(1); }}>
                  <option value="">Alle</option>
                  <option value="completed">Abgeschlossen</option>
                  <option value="in_progress">In Arbeit</option>
                  <option value="open">Offen</option>
                </Select>
              </Field>
              <Field label="Suche">
                <Input value={nodeQuery} onChange={(event) => { setNodeQuery(event.target.value); setNodePage(1); }} placeholder="Name, Typ oder Kennung" />
              </Field>
            </div>
            <DataTable
              plain
              rows={(nodes.data as any)?.nodes ?? []}
              rowKey={(node: any) => node.id}
              loading={nodes.isLoading}
              empty="Keine Knoten"
              footer={<Pagination page={nodePage} pageSize={50} total={(nodes.data as any)?.total ?? 0} onPage={setNodePage} />}
              columns={[
                { key: 'name', header: 'Knoten', render: (node: any) => <div><strong>{node.name}</strong><div className="hint">{node.designation || node.elementType}</div></div> },
                { key: 'type', header: 'Typ', render: (node: any) => node.elementType || '–' },
                { key: 'state', header: 'Status', render: (node: any) => node.completed ? <Badge tone="ok">abgeschlossen</Badge> : node.inProgress ? <Badge tone="warn">in Arbeit</Badge> : <Badge>offen</Badge> },
                { key: 'fetched', header: 'Gelesen', render: (node: any) => node.fetchedAt ? relative(node.fetchedAt) : '–' },
              ]}
            />
          </div>
        ) : null}

        {tab === 'calendar' ? (
          <div className="detail-section">
            <div className="section-head">
              <div><h2>Kalender</h2><p>{(events.data as any)?.total ?? 0} gespeicherte Termine</p></div>
              <div className="actions"><Button variant="danger" size="small" onClick={() => setConfirmClear({ kind: 'events', label: 'den Kalender' })}>Leeren</Button></div>
            </div>
            <DataTable
              plain
              rows={(events.data as any)?.events ?? []}
              rowKey={(event: any) => event.uid}
              loading={events.isLoading}
              empty="Keine Termine"
              footer={<Pagination page={eventPage} pageSize={50} total={(events.data as any)?.total ?? 0} onPage={setEventPage} />}
              columns={[
                { key: 'summary', header: 'Termin', render: (event: any) => <div><strong>{event.summary}</strong><div className="hint">{event.location ?? ''}</div></div> },
                { key: 'start', header: 'Start', render: (event: any) => event.dtstart ?? '–' },
                { key: 'end', header: 'Ende', render: (event: any) => event.dtend ?? '–' },
                { key: 'study', header: 'Studium', render: (event: any) => event.studyId ?? '–' },
              ]}
            />
          </div>
        ) : null}

        {tab === 'calls' ? (
          <div className="detail-section">
            <div className="section-head">
              <div><h2>Portal-Aufrufe</h2><p>{(calls.data as any)?.total ?? 0} protokollierte Aufrufe</p></div>
              <div className="actions"><Button variant="danger" size="small" onClick={() => setConfirmClear({ kind: 'calls', label: 'alle Aufrufe' })}>Leeren</Button></div>
            </div>
            <DataTable
              plain
              rows={(calls.data as any)?.calls ?? []}
              rowKey={(call: any) => call.id}
              loading={calls.isLoading}
              empty="Keine Aufrufe"
              footer={<Pagination page={callPage} pageSize={50} total={(calls.data as any)?.total ?? 0} onPage={setCallPage} />}
              columns={[
                { key: 'time', header: 'Zeit', render: (call: any) => formatTimestamp(call.createdAt, 'de') },
                { key: 'op', header: 'Operation', render: (call: any) => call.op },
                { key: 'status', header: 'Status', render: (call: any) => call.ok ? <Badge tone="ok">{call.httpStatus ?? 'ok'}</Badge> : <Badge tone="danger">{call.httpStatus ?? 'Fehler'}</Badge> },
                { key: 'message', header: 'Meldung', render: (call: any) => call.message ?? '–' },
                { key: 'ms', header: 'Dauer', className: 'num', render: (call: any) => `${call.elapsedMs ?? 0} ms` },
              ]}
            />
          </div>
        ) : null}

        {tab === 'quiz' ? (
          quiz.isLoading ? <div className="loading"><Spinner /> Quiz-Antworten werden geladen …</div> : (
            <>
              {(() => {
                const data = (quiz.data ?? {}) as any;
                const stats = data.stats ?? {};
                return (
                  <>
                    <div className="kpi-grid">
                      <div className="kpi"><div className="value">{stats.total ?? 0}</div><div className="label">Antworten</div><div className="sub">{stats.lastAt ? `zuletzt ${relative(stats.lastAt)}` : 'noch keine'}</div></div>
                      <div className="kpi green"><div className="value">{stats.accuracy ?? 0}%</div><div className="label">Trefferquote</div><div className="sub">{stats.correct ?? 0} richtig</div></div>
                      <div className="kpi amber"><div className="value">{(data.sessions ?? []).length}</div><div className="label">Runden</div><div className="sub">gespeichert</div></div>
                    </div>
                    <div className="detail-section">
                      <h3>Nach Thema</h3>
                      <DataTable
                        plain
                        rows={data.byTopic ?? []}
                        rowKey={(topic: any) => topic.topicId}
                        empty="Noch keine Themen"
                        columns={[
                          { key: 'title', header: 'Thema', render: (topic: any) => <div><strong>{topic.topicTitle?.de}</strong><div className="hint">{topic.topicId}</div></div> },
                          { key: 'total', header: 'Antworten', render: (topic: any) => topic.total },
                          { key: 'accuracy', header: 'Treffer', render: (topic: any) => <Badge tone={(topic.accuracy ?? 0) >= 70 ? 'ok' : 'warn'}>{topic.accuracy}%</Badge> },
                        ]}
                      />
                    </div>
                    <div className="detail-section">
                      <h3>Letzte Antworten</h3>
                      <DataTable
                        plain
                        rows={(data.attempts ?? []).slice(0, 20)}
                        rowKey={(attempt: any) => attempt.id}
                        empty="Noch keine Antworten"
                        columns={[
                          { key: 'time', header: 'Zeit', render: (attempt: any) => <span className="tiny">{formatTimestamp(attempt.answeredAt, 'de')}</span> },
                          { key: 'topic', header: 'Thema', render: (attempt: any) => <div>{attempt.topicTitle?.de}<div className="hint">{attempt.kind}</div></div> },
                          { key: 'prompt', header: 'Frage', render: (attempt: any) => attempt.prompt?.de },
                          { key: 'answer', header: 'Antwort', render: (attempt: any) => attempt.answerText || JSON.stringify(attempt.answer) },
                          { key: 'result', header: 'Ergebnis', render: (attempt: any) => attempt.correct ? <Badge tone="ok">richtig</Badge> : <Badge tone="danger">falsch</Badge> },
                        ]}
                      />
                    </div>
                    <div className="detail-section">
                      <h3>Runden</h3>
                      <DataTable
                        plain
                        rows={data.sessions ?? []}
                        rowKey={(session: any) => `${session.finishedAt}-${session.topicId}-${session.mode}`}
                        empty="Noch keine Runden"
                        columns={[
                          { key: 'time', header: 'Zeit', render: (session: any) => <span className="tiny">{formatTimestamp(session.finishedAt, 'de')}</span> },
                          { key: 'topic', header: 'Thema', render: (session: any) => session.topicTitle?.de },
                          { key: 'mode', header: 'Modus', render: (session: any) => <Badge tone="blue">{session.mode}</Badge> },
                          { key: 'score', header: 'Score', render: (session: any) => <span><strong>{session.correct} / {session.total}</strong><span className="hint"> · {session.accuracy}%</span></span> },
                        ]}
                      />
                    </div>
                  </>
                );
              })()}
            </>
          )
        ) : null}

        {tab === 'audit' ? (
          <div className="detail-section">
            <div className="section-head">
              <div><h2>Aktivität für dieses Konto</h2><p>Die letzten Operator-Aktionen</p></div>
              <div className="actions"><Button variant="secondary" size="small" onClick={() => navigate({ to: '/audit' })}>Vollständig</Button></div>
            </div>
            {audit.length ? (
              <Timeline>
                {audit.map((entry) => (
                  <TimelineItem key={entry.id} dot={DANGEROUS.has(entry.action) ? 'danger' : ''} time={formatTimestamp(entry.createdAt, 'de')}>
                    <strong>{AUDIT_LABELS[entry.action] || entry.action}</strong>
                    <span>{detailText(entry.detail) || '—'}</span>
                  </TimelineItem>
                ))}
              </Timeline>
            ) : <p className="hint">Noch keine Aktivität für dieses Konto.</p>}
          </div>
        ) : null}
      </section>

      <Dialog
        open={editOpen}
        title="Konto bearbeiten"
        onClose={() => setEditOpen(false)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>Abbrechen</Button>
            <Button disabled={update.isPending} onClick={() => update.mutate()}>{update.isPending ? 'Speichern …' : 'Speichern'}</Button>
          </>
        }
      >
        <div className="form-grid">
          <Field label="Konto"><Input value={form.account ?? ''} onChange={(event) => setForm({ ...form, account: event.target.value })} /></Field>
          <Field label="Name"><Input value={form.name ?? ''} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
          <Field label="E-Mail"><Input type="email" value={form.email ?? ''} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field>
          <Field label="Matrikelnummer"><Input value={form.matriculation ?? ''} onChange={(event) => setForm({ ...form, matriculation: event.target.value })} /></Field>
          <Field label="Fach"><Input value={form.subject ?? ''} onChange={(event) => setForm({ ...form, subject: event.target.value })} /></Field>
          <Field label="Anmeldemodus">
            <Select value={form.mode ?? 'local'} onChange={(event) => setForm({ ...form, mode: event.target.value })}>
              <option value="local">Lokal</option>
              <option value="campus">C@MPUS</option>
              <option value="oidc">SIAM</option>
              <option value="demo">Demo</option>
            </Select>
          </Field>
        </div>
      </Dialog>

      <Dialog
        open={linkOpen}
        title="Plattform verknüpfen"
        onClose={() => setLinkOpen(false)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setLinkOpen(false)}>Abbrechen</Button>
            <Button disabled={linkPlatform.isPending} onClick={() => linkPlatform.mutate()}>Verknüpfen</Button>
          </>
        }
      >
        <div className="form-grid">
          <Field label="Plattform">
            <Select value={linkForm.platform} onChange={(event) => setLinkForm({ ...linkForm, platform: event.target.value })}>
              <option value="campus">C@MPUS</option>
              <option value="ilias">ILIAS</option>
              <option value="sdg">SDG Campus</option>
              <option value="siam">SIAM</option>
              <option value="mail">UniMail</option>
            </Select>
          </Field>
          <Field label="Konto"><Input value={linkForm.account} onChange={(event) => setLinkForm({ ...linkForm, account: event.target.value })} /></Field>
          <Field label="Status">
            <Select value={linkForm.status} onChange={(event) => setLinkForm({ ...linkForm, status: event.target.value })}>
              <option value="linked">verknüpft</option>
              <option value="connected">verbunden</option>
            </Select>
          </Field>
        </div>
      </Dialog>

      <Dialog
        open={Boolean(confirmClear)}
        title={confirmClear?.kind === 'portal' ? 'Portal-Daten löschen?' : confirmClear?.kind === 'events' ? 'Kalender leeren?' : 'Aufrufe löschen?'}
        onClose={() => setConfirmClear(null)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setConfirmClear(null)}>Abbrechen</Button>
            <Button
              variant="danger"
              disabled={clearPortal.isPending || clearEvents.isPending || clearCalls.isPending}
              onClick={() => {
                if (!confirmClear) return;
                if (confirmClear.kind === 'portal') clearPortal.mutate(confirmClear.studyId);
                else if (confirmClear.kind === 'events') clearEvents.mutate();
                else clearCalls.mutate();
              }}
            >
              Löschen
            </Button>
          </>
        }
      >
        <p>
          {confirmClear?.kind === 'portal'
            ? `Portal-Daten von „${confirmClear.label}“ werden unwiderruflich gelöscht.`
            : confirmClear?.kind === 'events'
              ? 'Alle gespeicherten Kalendertermine dieses Kontos werden gelöscht.'
              : 'Alle protokollierten Portal-Aufrufe dieses Kontos werden gelöscht.'}
        </p>
        <Callout tone="warn">Diese Aktion lässt sich nicht rückgängig machen.</Callout>
      </Dialog>

      <IliasViewerDialog view={iliasView} userId={userId} onClose={() => setIliasView(null)} />

      <Dialog
        open={deleteOpen}
        title="Konto löschen?"
        onClose={() => setDeleteOpen(false)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>Abbrechen</Button>
            <Button variant="danger" disabled={remove.isPending} onClick={() => remove.mutate()}>Löschen</Button>
          </>
        }
      >
        <p>{user.account} und alle zugehörigen Sitzungen, Geräte und Portaldaten werden gelöscht. Die Audit-Spur bleibt.</p>
        <Callout tone="warn">Diese Aktion lässt sich nicht rückgängig machen.</Callout>
      </Dialog>
    </>
  );
}
