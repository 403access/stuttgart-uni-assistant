import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { formatTimestamp } from '@ua/format';
import { Avatar, Badge, BarList, EmptyState, FieldBox, HealthStrip, KpiGrid, Section, StatCard, Timeline, TimelineItem } from '@ua/ui-react';

import { api } from '../lib/api';

interface UserRow {
  id: string;
  account: string;
  name?: string | null;
  email?: string | null;
  mode: string;
  campusActive?: boolean;
}

interface AuditRow {
  id: string;
  action: string;
  account?: string | null;
  createdAt: string;
  detail?: { label?: string } | string | null;
}

const AUDIT_LABELS: Record<string, string> = {
  'user.create': 'Konto angelegt',
  'user.update': 'Konto geändert',
  'user.delete': 'Konto gelöscht',
  'session.revoke': 'Sitzung widerrufen',
  'sessions.revoke': 'Sitzungen widerrufen',
  'device.revoke': 'Gerät widerrufen',
  'platform.link': 'Plattform verknüpft',
  'platform.unlink': 'Plattform entfernt',
  'news.create': 'Meldung angelegt',
  'news.update': 'Meldung geändert',
  'news.delete': 'Meldung gelöscht',
  'logs.clear': 'Logs gelöscht',
  'quiz.catalog.seed': 'Lernquiz eingespielt',
};

const DANGEROUS = new Set(['user.delete', 'session.revoke', 'sessions.revoke', 'device.revoke', 'platform.unlink', 'news.delete', 'logs.clear']);

function modeName(mode: string) {
  if (mode === 'campus') return 'C@MPUS';
  if (mode === 'oidc') return 'SIAM';
  if (mode === 'demo') return 'Demo';
  return 'Lokal';
}

export function OverviewPage() {
  const navigate = useNavigate();
  const overview = useQuery({ queryKey: ['overview'], queryFn: () => api.overview() });
  const users = useQuery({ queryKey: ['users', 'recent'], queryFn: () => api.users({ sort: 'recent', limit: 6 }) });
  const audit = useQuery({ queryKey: ['audit', 'recent'], queryFn: () => api.audit({ limit: 6 }) });
  const stats = (overview.data ?? {}) as any;
  const config = stats.config ?? {};
  const recent = ((users.data as { users?: UserRow[] } | undefined)?.users ?? []);
  const entries = ((audit.data as { entries?: AuditRow[] } | undefined)?.entries ?? []);

  const platformStats = new Map<string, { count: number; connected: number; linked: number }>();
  for (const item of stats.platforms ?? []) {
    const entry = platformStats.get(item.platform) ?? { count: 0, connected: 0, linked: 0 };
    entry.count += item.count;
    if (item.status === 'connected') entry.connected += item.count;
    else entry.linked += item.count;
    platformStats.set(item.platform, entry);
  }
  const platformItems = ['campus', 'ilias', 'sdg', 'siam', 'mail'].map((id) => ({
    label: ({ campus: 'C@MPUS', ilias: 'ILIAS', sdg: 'SDG Campus', siam: 'SIAM', mail: 'UniMail' } as Record<string, string>)[id],
    count: platformStats.get(id)?.count ?? 0,
  }));
  const modeItems = (stats.modes ?? []).map((item: any) => ({ label: modeName(item.mode), count: item.count }));
  const campusSourceItems = [
    ...(stats.campus ?? []).map((item: any) => ({ label: item.source === 'env' ? '.env-Zugang' : 'Browser-Zugang', count: item.count })),
    { label: 'Im Speicher aktiv', count: stats.credentialsActive || 0 },
  ];
  if (!campusSourceItems.some((item) => item.count)) campusSourceItems.push({ label: 'Kein Zugang', count: stats.users });

  const health: [string, boolean][] = [
    ['Admin', true],
    ['C@MPUS .env', Boolean(config.campus?.tokenConfigured || config.campus?.sessionCookieConfigured)],
    ['ILIAS .env', Boolean(config.ilias?.configured)],
    ['SIAM OIDC', Boolean(config.oidc?.configured)],
    ['UniMail', Boolean(config.mail?.configured)],
    ['Assistent', Boolean(config.assistant?.configured)],
  ];

  const kpis = [
    { symbol: 'users', value: stats.users, label: 'Konten', sub: `${stats.recentUsers ?? 0} neu in 7 Tagen`, href: '/users', tone: '' },
    { symbol: 'monitor', value: stats.activeSessions, label: 'Aktive Sitzungen', sub: `${stats.usersWithSessions ?? 0} Konten angemeldet`, href: '/users', tone: 'cyan', search: { activity: 'active' } },
    { symbol: 'smartphone', value: stats.devicesActive || 0, label: 'Web-Geräte', sub: `${stats.devicesPending || 0} warten auf Scan`, href: '/devices', tone: 'blue' },
    { symbol: 'key', value: stats.credentialsActive, label: 'C@MPUS im Speicher', sub: 'nur bis zum Server-Neustart', href: '/users', tone: 'green', search: { credential: 'active' } },
    { symbol: 'grid', value: stats.iliasActive || 0, label: 'ILIAS im Speicher', sub: `${stats.data?.iliasSources || 0} verknüpfte Konten`, href: '/ilias', tone: 'purple' },
    { symbol: 'list', value: stats.portalNodes, label: 'Portal-Knoten', sub: `${stats.completedNodes ?? 0} abgeschlossen · ${stats.inProgressNodes ?? 0} in Arbeit`, href: '/users', tone: 'purple', search: { data: 'portal' } },
    { symbol: 'grid', value: stats.portalCourses, label: 'Kurse', sub: 'aus dem C@MPUS-Export', href: '/users', tone: 'amber', search: { data: 'courses' } },
    { symbol: 'calendar', value: stats.calendarEvents, label: 'Kalendertermine', sub: 'gespeicherte ICS-Ereignisse', href: '/users', tone: 'cyan', search: { data: 'events' } },
    { symbol: 'activity', value: stats.portalCalls, label: 'Portal-Aufrufe', sub: 'protokollierte Hops', href: '/users', tone: 'red', search: { data: 'calls' } },
    { symbol: 'users', value: stats.recentUsersMonth, label: 'Neu in 30 Tagen', sub: `${stats.activeUsersWeek ?? 0} aktiv in 7 Tagen`, href: '/users', tone: 'green', search: { sort: 'created' } },
  ];

  return (
    <>
      <KpiGrid>
        {kpis.map((item) => (
          <StatCard
            key={item.label}
            icon={item.symbol}
            value={item.value ?? 0}
            label={item.label}
            sub={item.sub}
            href={item.href}
            tone={item.tone === 'cyan' ? 'cyan' : item.tone}
            onNavigate={() => navigate({ to: item.href as '/users' | '/devices' | '/ilias', ...(item.search ? { search: item.search } : {}) })}
          />
        ))}
      </KpiGrid>

      <div className="overview-grid">
        <div className="overview-col">
          <Section
            title="Zuletzt aktive Konten"
            subtitle="Neueste Anmeldungen und Konten"
            actions={<a className="btn secondary small" href="/users" onClick={(event) => { event.preventDefault(); navigate({ to: '/users' }); }}>Alle Konten</a>}
          >
            {recent.length ? (
              <Timeline>
                {recent.map((user) => (
                  <TimelineItem key={user.id}>
                    <a href={`/users/${user.id}`} onClick={(event) => { event.preventDefault(); navigate({ to: '/users/$userId', params: { userId: user.id } }); }} style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'inherit', textDecoration: 'none' }}>
                      <Avatar name={user.name || user.account} size="sm" />
                      <div className="timeline-body">
                        <strong>{user.name || user.account}</strong>
                        <span>{user.account}{user.email ? ` · ${user.email}` : ''}</span>
                      </div>
                      <div className="row tight">
                        <Badge tone={user.mode === 'campus' ? 'blue' : ''}>{modeName(user.mode)}</Badge>
                        {user.campusActive ? <Badge tone="ok">C@MPUS aktiv</Badge> : null}
                      </div>
                    </a>
                  </TimelineItem>
                ))}
              </Timeline>
            ) : <EmptyState title="Noch keine Konten" detail="Sobald sich jemand anmeldet, erscheint das Konto hier." />}
          </Section>

          <Section title="Verteilung" subtitle="Plattformverknüpfungen, Anmeldemodi und C@MPUS-Quellen">
            <div className="overview-grid" style={{ gap: 24 }}>
              <div><h3 className="card-title" style={{ marginBottom: 10 }}>Plattformen</h3><BarList items={platformItems} /></div>
              <div><h3 className="card-title" style={{ marginBottom: 10 }}>Anmeldemodus</h3><BarList items={modeItems.length ? modeItems : [{ label: 'Keine Konten', count: 0 }]} /></div>
            </div>
            <hr className="divider" />
            <div><h3 className="card-title" style={{ marginBottom: 10 }}>C@MPUS-Quelle</h3><BarList items={campusSourceItems} /></div>
          </Section>
        </div>

        <div className="overview-col">
          <Section
            title="Letzte Aktionen"
            subtitle="Audit-Protokoll des Operators"
            actions={<a className="btn secondary small" href="/audit" onClick={(event) => { event.preventDefault(); navigate({ to: '/audit' }); }}>Alle</a>}
          >
            {entries.length ? (
              <Timeline>
                {entries.map((entry) => (
                  <TimelineItem key={entry.id} dot={DANGEROUS.has(entry.action) ? 'danger' : ''} time={formatTimestamp(entry.createdAt, 'de')}>
                    <strong>{AUDIT_LABELS[entry.action] || entry.action}</strong>
                    <span>{[entry.account, typeof entry.detail === 'string' ? entry.detail : entry.detail?.label].filter(Boolean).join(' · ') || '—'}</span>
                  </TimelineItem>
                ))}
              </Timeline>
            ) : <EmptyState title="Noch keine Aktionen" detail="Jede Änderung im Dashboard wird hier protokolliert." />}
          </Section>

          <Section
            title="System"
            subtitle="Konfiguration und Laufzeit"
            actions={<a className="btn secondary small" href="/system" onClick={(event) => { event.preventDefault(); navigate({ to: '/system' }); }}>Details</a>}
          >
            <HealthStrip items={health} />
            <div className="field-grid">
              <FieldBox label="Datenbank" value={`${stats.data?.nodes ?? 0} Knoten`} />
              <FieldBox label="ILIAS" value={`${stats.data?.iliasSnapshots ?? 0} Stände`} />
              <FieldBox label="Kalender" value={`${stats.data?.events ?? 0} Termine`} />
              <FieldBox label="Audit" value={`${stats.data?.audit ?? 0} Einträge`} />
              <FieldBox label="Modell" value={config.assistant?.model || '–'} />
            </div>
          </Section>
        </div>
      </div>
    </>
  );
}
