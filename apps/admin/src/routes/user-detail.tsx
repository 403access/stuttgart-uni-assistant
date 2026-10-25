import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import { formatTimestamp } from '@ua/format';
import { Avatar, Badge, Button, Card, DataTable, Dialog, ErrorState, Field, Input, Muted, PageHeader, Row, Section, Select, Spinner, StatCard, Tabs, TextArea, useToast } from '@ua/ui-react';
import { IliasViewerDialog } from './ilias-viewer';
import { useState } from 'react';

import { api } from '../lib/api';

const TABS = [
  { id: 'overview', label: 'Übersicht' },
  { id: 'sessions', label: 'Sitzungen' },
  { id: 'devices', label: 'Geräte' },
  { id: 'platforms', label: 'Plattformen' },
  { id: 'campus', label: 'C@MPUS' },
  { id: 'ilias', label: 'ILIAS' },
  { id: 'courses', label: 'Kurse' },
  { id: 'calendar', label: 'Kalender' },
  { id: 'calls', label: 'Aufrufe' },
  { id: 'audit', label: 'Aktivität' },
];

export function UserDetailPage() {
  const params = useParams({ strict: false }) as { userId: string };
  const userId = params.userId;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [tab, setTab] = useState('overview');
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [form, setForm] = useState<any>({});
  const [linkForm, setLinkForm] = useState({ platform: 'campus', account: '', status: 'linked' });
  const [iliasView, setIliasView] = useState<any | null>(null);

  const detailQuery = useQuery({ queryKey: ['user', userId], queryFn: () => api.user(userId) });
  const detail = (detailQuery.data ?? {}) as any;
  const user = detail.user;
  const courses = useQuery({ queryKey: ['user', userId, 'courses'], queryFn: () => api.userCourses(userId, { limit: 50 }), enabled: tab === 'courses' });
  const events = useQuery({ queryKey: ['user', userId, 'events'], queryFn: () => api.userEvents(userId, { limit: 50 }), enabled: tab === 'calendar' });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['user', userId] });
    queryClient.invalidateQueries({ queryKey: ['users'] });
    queryClient.invalidateQueries({ queryKey: ['overview'] });
  };
  const update = useMutation({
    mutationFn: () => api.updateUser(userId, form),
    onSuccess: () => { setEditOpen(false); refresh(); toast.show('Konto gespeichert.'); },
    onError: (error) => toast.show(error instanceof Error ? error.message : 'Speichern fehlgeschlagen.', 'error'),
  });
  const remove = useMutation({
    mutationFn: () => api.deleteUser(userId),
    onSuccess: () => { navigate({ to: '/users' }); toast.show('Konto gelöscht.'); },
  });
  const revokeSessions = useMutation({
    mutationFn: () => api.userRevokeSessions(userId),
    onSuccess: () => { refresh(); toast.show('Alle Sitzungen widerrufen.'); },
  });
  const revokeSession = useMutation({
    mutationFn: (sessionId: string) => api.userRevokeSession(userId, sessionId),
    onSuccess: () => { refresh(); toast.show('Sitzung widerrufen.'); },
  });
  const revokeDevice = useMutation({
    mutationFn: (deviceId: string) => api.revokeDevice(deviceId),
    onSuccess: () => { refresh(); toast.show('Gerät widerrufen.'); },
  });
  const linkPlatform = useMutation({
    mutationFn: () => api.userLinkPlatform(userId, linkForm),
    onSuccess: () => { setLinkOpen(false); refresh(); toast.show('Plattform verknüpft.'); },
    onError: (error) => toast.show(error instanceof Error ? error.message : 'Verknüpfen fehlgeschlagen.', 'error'),
  });
  const unlinkPlatform = useMutation({
    mutationFn: (platform: string) => api.userUnlinkPlatform(userId, platform),
    onSuccess: () => { refresh(); toast.show('Plattform entfernt.'); },
  });
  const disconnectCampus = useMutation({ mutationFn: () => api.userDisconnectCampus(userId), onSuccess: () => { refresh(); toast.show('C@MPUS getrennt.'); } });
  const disconnectIlias = useMutation({ mutationFn: () => api.userDisconnectIlias(userId), onSuccess: () => { refresh(); toast.show('ILIAS getrennt.'); } });
  const clearCalls = useMutation({ mutationFn: () => api.userClearCalls(userId), onSuccess: () => { refresh(); toast.show('Aufrufe gelöscht.'); } });
  const clearEvents = useMutation({ mutationFn: () => api.userClearEvents(userId), onSuccess: () => { refresh(); toast.show('Kalender gelöscht.'); } });
  const sync = useMutation({
    mutationFn: () => api.userSync(userId, { studyId: detail.studies?.[0]?.studyId }),
    onSuccess: () => { refresh(); toast.show('Sync gestartet.'); },
    onError: (error) => toast.show(error instanceof Error ? error.message : 'Sync konnte nicht starten.', 'error'),
  });

  if (detailQuery.isLoading) return <Spinner />;
  if (detailQuery.error || !user) return <ErrorState message={detailQuery.error instanceof Error ? detailQuery.error.message : 'Konto nicht gefunden.'} />;

  function openEdit() {
    setForm({ account: user.account, name: user.name ?? '', email: user.email ?? '', matriculation: user.matriculation ?? '', subject: user.subject ?? '', mode: user.mode });
    setEditOpen(true);
  }

  const counts = detail.counts ?? {};
  const studies = detail.studies ?? [];
  const sessions = detail.sessions ?? [];
  const devices = detail.devices ?? [];
  const platforms = user.platforms ?? [];
  const calls = detail.calls ?? [];
  const audit = detail.audit ?? [];

  return (
    <>
      <PageHeader
        title={user.name || user.account}
        subtitle={`${user.account} · ${user.mode} · seit ${formatTimestamp(user.createdAt, 'de')}`}
        actions={<><Button variant="secondary" onClick={openEdit}>Bearbeiten</Button><Button variant="secondary" onClick={() => sync.mutate()} disabled={sync.isPending}>Sync</Button><Button variant="danger" onClick={() => setDeleteOpen(true)}>Löschen</Button></>}
      />

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'overview' ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <StatCard value={counts.sessions ?? sessions.length} label="Sitzungen" sub={`${counts.devices ?? devices.length} Geräte`} />
            <StatCard value={counts.portalNodes ?? 0} label="Portal-Knoten" sub={`${counts.completedNodes ?? 0} abgeschlossen`} />
            <StatCard value={counts.courses ?? 0} label="Kurse" sub={`${counts.events ?? 0} Termine`} />
            <StatCard value={counts.calls ?? 0} label="Portal-Aufrufe" />
          </div>
          <Section title="Profil">
            <Card>
              <Row><Avatar name={user.name || user.account} /><div><strong>{user.name || user.account}</strong><div><Muted>{user.email ?? 'keine E-Mail'} · {user.matriculation ?? 'keine Matrikelnummer'}</Muted></div></div></Row>
              <p><Muted>{user.subject ?? 'Kein Fach'}</Muted></p>
            </Card>
          </Section>
          <Section title="Studiengänge">
            <DataTable
              rows={studies}
              rowKey={(study: any) => study.studyId}
              empty="Keine Studiengänge gespeichert"
              columns={[
                { key: 'name', header: 'Studiengang', render: (study: any) => study.name || study.title || study.studyId },
                { key: 'nodes', header: 'Knoten', render: (study: any) => `${study.completed ?? 0}/${study.nodes ?? study.nodeCount ?? 0}` },
                { key: 'courses', header: 'Kurse', render: (study: any) => study.courses ?? 0 },
                { key: 'synced', header: 'Zuletzt', render: (study: any) => study.fetchedAt ? formatTimestamp(study.fetchedAt, 'de') : '—' },
              ]}
            />
          </Section>
        </>
      ) : null}

      {tab === 'sessions' ? (
        <Section title="Sitzungen" actions={<Button variant="danger" size="small" onClick={() => revokeSessions.mutate()}>Alle widerrufen</Button>}>
          <DataTable
            rows={sessions}
            rowKey={(session: any) => session.id}
            empty="Keine Sitzungen"
            columns={[
              { key: 'created', header: 'Angelegt', render: (session: any) => formatTimestamp(session.createdAt, 'de') },
              { key: 'expires', header: 'Läuft ab', render: (session: any) => formatTimestamp(session.expiresAt, 'de') },
              { key: 'seen', header: 'Zuletzt', render: (session: any) => session.lastSeenAt ? formatTimestamp(session.lastSeenAt, 'de') : '—' },
              { key: 'state', header: 'Status', render: (session: any) => <Badge tone={session.revokedAt ? 'danger' : 'ok'}>{session.revokedAt ? 'widerrufen' : 'aktiv'}</Badge> },
              { key: 'device', header: 'Gerät', render: (session: any) => session.device?.name ?? '—' },
              { key: 'actions', header: '', render: (session: any) => !session.revokedAt ? <Button variant="danger" size="small" onClick={() => revokeSession.mutate(session.id)}>Widerrufen</Button> : null },
            ]}
          />
        </Section>
      ) : null}

      {tab === 'devices' ? (
        <Section title="Geräte">
          <DataTable
            rows={devices}
            rowKey={(device: any) => device.id}
            empty="Keine Geräte"
            columns={[
              { key: 'name', header: 'Gerät', render: (device: any) => device.name },
              { key: 'state', header: 'Status', render: (device: any) => <Badge tone={device.state === 'active' ? 'ok' : device.state === 'revoked' ? 'danger' : 'warn'}>{device.state}</Badge> },
              { key: 'ip', header: 'IP', render: (device: any) => device.lastIpAddress || device.ipAddress || '—' },
              { key: 'created', header: 'Angelegt', render: (device: any) => formatTimestamp(device.createdAt, 'de') },
              { key: 'actions', header: '', render: (device: any) => device.state !== 'revoked' ? <Button variant="danger" size="small" onClick={() => revokeDevice.mutate(device.id)}>Widerrufen</Button> : null },
            ]}
          />
        </Section>
      ) : null}

      {tab === 'platforms' ? (
        <Section title="Plattformen" actions={<Button size="small" onClick={() => setLinkOpen(true)}>Verknüpfen</Button>}>
          <DataTable
            rows={platforms}
            rowKey={(platform: any) => platform.id}
            empty="Keine Plattformen"
            columns={[
              { key: 'id', header: 'Plattform', render: (platform: any) => platform.id },
              { key: 'account', header: 'Konto', render: (platform: any) => platform.account ?? '—' },
              { key: 'status', header: 'Status', render: (platform: any) => <Badge tone={platform.status === 'connected' ? 'ok' : 'blue'}>{platform.status}</Badge> },
              { key: 'sync', header: 'Zuletzt', render: (platform: any) => platform.lastSyncAt ? formatTimestamp(platform.lastSyncAt, 'de') : '—' },
              { key: 'actions', header: '', render: (platform: any) => <Button variant="danger" size="small" onClick={() => unlinkPlatform.mutate(platform.id)}>Entfernen</Button> },
            ]}
          />
        </Section>
      ) : null}

      {tab === 'campus' ? (
        <Section title="C@MPUS">
          <Card>
            <div style={{ display: 'grid', gap: 8 }}>
              <Row><strong>Quelle</strong><Badge tone={detail.campus?.source ? 'blue' : 'warn'}>{detail.campus?.source ?? 'keine'}</Badge></Row>
              <Row><strong>Konto</strong><Muted>{detail.campus?.account ?? '—'}</Muted></Row>
              <Row><strong>Im Speicher</strong><Badge tone={detail.campus?.active ? 'ok' : 'warn'}>{detail.campus?.active ? 'aktiv' : 'nein'}</Badge></Row>
              <Row><strong>.env</strong><Badge tone={detail.campus?.envConfigured ? 'ok' : 'warn'}>{detail.campus?.envConfigured ? 'konfiguriert' : 'nein'}</Badge></Row>
            </div>
            <div style={{ marginTop: 14 }}><Button variant="danger" onClick={() => disconnectCampus.mutate()}>C@MPUS trennen</Button></div>
          </Card>
        </Section>
      ) : null}

      {tab === 'ilias' ? (
        <Section title="ILIAS">
          <Card>
            <div style={{ display: 'grid', gap: 8, marginBottom: 14 }}>
              <Row><strong>Quelle</strong><Badge tone={detail.ilias?.source ? 'blue' : 'warn'}>{detail.ilias?.source ?? 'keine'}</Badge></Row>
              <Row><strong>Konto</strong><Muted>{detail.ilias?.account ?? '—'}</Muted></Row>
              <Row><strong>Sitzung</strong><Badge tone={detail.ilias?.active ? 'ok' : 'warn'}>{detail.ilias?.active ? 'aktiv' : 'nein'}</Badge></Row>
              <Row><strong>Letzter Snapshot</strong><Muted>{detail.ilias?.fetchedAt ? formatTimestamp(detail.ilias.fetchedAt, 'de') : '—'}</Muted></Row>
            </div>
            <DataTable
              rows={detail.ilias?.dashboard?.memberships ?? []}
              rowKey={(item: any) => `${item.kind}-${item.refId ?? item.id}`}
              empty="Keine ILIAS-Mitgliedschaften gespeichert"
              columns={[
                { key: 'title', header: 'Mitgliedschaft', render: (item: any) => <div><strong>{item.title}</strong><div><Muted>{item.kind} {item.refId ? `· ${item.refId}` : ''}</Muted></div></div> },
                { key: 'type', header: 'Typ', render: (item: any) => item.type ?? '—' },
                {
                  key: 'actions',
                  header: '',
                  render: (item: any) => (
                    <div style={{ display: 'flex', gap: 6 }}>
                      {item.refId ? <Button variant="secondary" size="small" onClick={() => setIliasView({ mode: 'content', item })}>Inhalte</Button> : null}
                      {item.refId ? <Button variant="secondary" size="small" onClick={() => setIliasView({ mode: 'members', item })}>Mitglieder</Button> : null}
                      <Button variant="secondary" size="small" onClick={() => setIliasView({ mode: 'profile', item })}>Profil</Button>
                    </div>
                  ),
                },
              ]}
            />
            <div style={{ marginTop: 14 }}><Button variant="danger" onClick={() => disconnectIlias.mutate()}>ILIAS trennen</Button></div>
          </Card>
        </Section>
      ) : null}

      {tab === 'courses' ? (
        <Section title="Kurse">
          <DataTable
            rows={(courses.data as any)?.courses ?? []}
            rowKey={(course: any) => course.id}
            loading={courses.isLoading}
            empty="Keine Kurse gespeichert"
            columns={[
              { key: 'title', header: 'Kurs', render: (course: any) => <div><strong>{course.title}</strong><div><Muted>{course.courseNumber ?? ''} · {course.semester ?? ''}</Muted></div></div> },
              { key: 'type', header: 'Typ', render: (course: any) => course.courseType ?? '—' },
              { key: 'room', header: 'Raum', render: (course: any) => course.roomName ?? '—' },
              { key: 'lecturers', header: 'Dozenten', render: (course: any) => course.lecturers ?? '—' },
            ]}
          />
        </Section>
      ) : null}

      {tab === 'calendar' ? (
        <Section title="Kalender" actions={<Button variant="danger" size="small" onClick={() => clearEvents.mutate()}>Leeren</Button>}>
          <DataTable
            rows={(events.data as any)?.events ?? []}
            rowKey={(event: any) => event.uid}
            loading={events.isLoading}
            empty="Keine Termine gespeichert"
            columns={[
              { key: 'summary', header: 'Termin', render: (event: any) => event.summary },
              { key: 'start', header: 'Start', render: (event: any) => event.dtstart ?? '—' },
              { key: 'end', header: 'Ende', render: (event: any) => event.dtend ?? '—' },
              { key: 'location', header: 'Ort', render: (event: any) => event.location ?? '—' },
            ]}
          />
        </Section>
      ) : null}

      {tab === 'calls' ? (
        <Section title="Portal-Aufrufe" actions={<Button variant="danger" size="small" onClick={() => clearCalls.mutate()}>Leeren</Button>}>
          <DataTable
            rows={calls}
            rowKey={(call: any) => call.id}
            empty="Keine Aufrufe"
            columns={[
              { key: 'time', header: 'Zeit', render: (call: any) => formatTimestamp(call.createdAt, 'de') },
              { key: 'op', header: 'Operation', render: (call: any) => call.op },
              { key: 'status', header: 'Status', render: (call: any) => <Badge tone={call.ok ? 'ok' : 'danger'}>{call.httpStatus ?? (call.ok ? 'ok' : 'Fehler')}</Badge> },
              { key: 'message', header: 'Meldung', render: (call: any) => call.message ?? '—' },
              { key: 'ms', header: 'Dauer', render: (call: any) => `${call.elapsedMs ?? 0} ms` },
            ]}
          />
        </Section>
      ) : null}

      {tab === 'audit' ? (
        <Section title="Aktivität">
          <DataTable
            rows={audit}
            rowKey={(entry: any) => entry.id}
            empty="Keine Aktivität"
            columns={[
              { key: 'time', header: 'Zeit', render: (entry: any) => formatTimestamp(entry.createdAt, 'de') },
              { key: 'action', header: 'Aktion', render: (entry: any) => <Badge tone="blue">{entry.action}</Badge> },
              { key: 'detail', header: 'Detail', render: (entry: any) => entry.detail ? <Muted>{typeof entry.detail === 'string' ? entry.detail : JSON.stringify(entry.detail)}</Muted> : '—' },
            ]}
          />
        </Section>
      ) : null}

      <Dialog open={editOpen} title="Konto bearbeiten" onClose={() => setEditOpen(false)} actions={<><Button variant="secondary" onClick={() => setEditOpen(false)}>Abbrechen</Button><Button disabled={update.isPending} onClick={() => update.mutate()}>{update.isPending ? 'Speichern …' : 'Speichern'}</Button></>}>
        <div style={{ display: 'grid', gap: 10 }}>
          <Field label="Konto"><Input value={form.account ?? ''} onChange={(event) => setForm({ ...form, account: event.target.value })} /></Field>
          <Field label="Name"><Input value={form.name ?? ''} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
          <Field label="E-Mail"><Input value={form.email ?? ''} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field>
          <Field label="Matrikelnummer"><Input value={form.matriculation ?? ''} onChange={(event) => setForm({ ...form, matriculation: event.target.value })} /></Field>
          <Field label="Fach"><Input value={form.subject ?? ''} onChange={(event) => setForm({ ...form, subject: event.target.value })} /></Field>
          <Field label="Anmeldemodus"><Select value={form.mode ?? 'local'} onChange={(event) => setForm({ ...form, mode: event.target.value })}><option value="local">Lokal</option><option value="campus">C@MPUS</option><option value="oidc">SIAM</option><option value="demo">Demo</option></Select></Field>
        </div>
      </Dialog>

      <Dialog open={linkOpen} title="Plattform verknüpfen" onClose={() => setLinkOpen(false)} actions={<><Button variant="secondary" onClick={() => setLinkOpen(false)}>Abbrechen</Button><Button disabled={linkPlatform.isPending} onClick={() => linkPlatform.mutate()}>Verknüpfen</Button></>}>
        <div style={{ display: 'grid', gap: 10 }}>
          <Field label="Plattform"><Select value={linkForm.platform} onChange={(event) => setLinkForm({ ...linkForm, platform: event.target.value })}><option value="campus">C@MPUS</option><option value="ilias">ILIAS</option><option value="sdg">SDG Campus</option><option value="siam">SIAM</option><option value="mail">UniMail</option></Select></Field>
          <Field label="Konto"><Input value={linkForm.account} onChange={(event) => setLinkForm({ ...linkForm, account: event.target.value })} /></Field>
          <Field label="Status"><Select value={linkForm.status} onChange={(event) => setLinkForm({ ...linkForm, status: event.target.value })}><option value="linked">verknüpft</option><option value="connected">verbunden</option></Select></Field>
        </div>
      </Dialog>

      <IliasViewerDialog view={iliasView} userId={userId} onClose={() => setIliasView(null)} />

      <Dialog open={deleteOpen} title="Konto löschen?" onClose={() => setDeleteOpen(false)} actions={<><Button variant="secondary" onClick={() => setDeleteOpen(false)}>Abbrechen</Button><Button variant="danger" disabled={remove.isPending} onClick={() => remove.mutate()}>Löschen</Button></>}>
        <p>{user.account} und alle zugehörigen Sitzungen, Geräte und Portaldaten werden gelöscht. Die Audit-Spur bleibt.</p>
      </Dialog>
    </>
  );
}
