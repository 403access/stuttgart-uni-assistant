import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { formatTimestamp } from '@ua/format';
import { Badge, DataTable, ErrorState, Field, Input, Pagination, Select } from '@ua/ui-react';
import { useState } from 'react';

import { api } from '../lib/api';

const PAGE_SIZE = 50;

const ACTION_LABELS: Record<string, string> = {
  'admin.login': 'Operator angemeldet',
  'admin.logout': 'Operator abgemeldet',
  'user.update': 'Kontodaten geändert',
  'user.create': 'Konto angelegt',
  'user.delete': 'Konto gelöscht',
  'session.revoke': 'Sitzung widerrufen',
  'session.revoke_all': 'Alle Sitzungen widerrufen',
  'device.revoke': 'Web-Gerät widerrufen',
  'platform.link': 'Plattform verknüpft',
  'platform.unlink': 'Plattform entfernt',
  'platform.touch': 'Plattform-Sync markiert',
  'campus.disconnect': 'C@MPUS getrennt',
  'campus.source': 'C@MPUS-Quelle gesetzt',
  'ilias.disconnect': 'ILIAS getrennt',
  'portal.clear_study': 'Studiengang-Daten gelöscht',
  'portal.clear_all': 'Portal-Daten gelöscht',
  'calendar.clear': 'Kalender geleert',
  'calls.clear': 'Aufrufprotokoll geleert',
  'sync.start': 'Synchronisation gestartet',
  'sync.cancel': 'Synchronisation abgebrochen',
  'mail.disconnect': 'UniMail getrennt',
  'logs.clear': 'Logs gelöscht',
  'environment.reveal': 'Umgebung offengelegt',
  'news.create': 'Meldung angelegt',
  'news.update': 'Meldung geändert',
  'news.delete': 'Meldung gelöscht',
  'quiz.topic.create': 'Quiz-Thema angelegt',
  'quiz.topic.update': 'Quiz-Thema geändert',
  'quiz.topic.delete': 'Quiz-Thema gelöscht',
  'quiz.question.create': 'Quiz-Frage angelegt',
  'quiz.question.update': 'Quiz-Frage geändert',
  'quiz.question.delete': 'Quiz-Frage gelöscht',
  'quiz.module.update': 'Quiz-Modul geändert',
  'quiz.catalog.seed': 'Quiz-Katalog importiert',
};

const DANGEROUS = new Set([
  'user.delete',
  'portal.clear_all',
  'portal.clear_study',
  'calendar.clear',
  'calls.clear',
  'session.revoke_all',
  'device.revoke',
  'campus.disconnect',
  'ilias.disconnect',
  'mail.disconnect',
  'news.delete',
  'quiz.topic.delete',
  'quiz.question.delete',
  'quiz.catalog.seed',
  'logs.clear',
]);

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

export function AuditPage() {
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [userId, setUserId] = useState('');
  const [page, setPage] = useState(1);
  const audit = useQuery({
    queryKey: ['audit', search, action, userId, page],
    queryFn: () => api.audit({ query: search, action, userId, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
  });
  const data = (audit.data ?? {}) as any;
  const entries = data.entries ?? [];
  const actions = data.actions ?? [];

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
              placeholder="Aktion, Konto, ID oder Detail"
            />
          </div>
        </label>
        <Field label="Aktion">
          <Select value={action} onChange={(event) => { setAction(event.target.value); setPage(1); }}>
            <option value="">Alle Aktionen</option>
            {actions.map((item: any) => (
              <option key={item.action} value={item.action}>
                {ACTION_LABELS[item.action] ?? item.action} ({item.count})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Konto-ID">
          <Input value={userId} onChange={(event) => { setUserId(event.target.value); setPage(1); }} placeholder="usr_…" />
        </Field>
      </section>
      {audit.error ? <ErrorState message={audit.error instanceof Error ? audit.error.message : 'Aktivität konnte nicht geladen werden.'} /> : (
        <DataTable
          rows={entries}
          rowKey={(entry: any) => entry.id}
          loading={audit.isLoading}
          empty="Keine Aktivität"
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
              key: 'action',
              header: 'Aktion',
              render: (entry: any) => (
                <div>
                  <div className="row tight">
                    <span className={`timeline-dot ${DANGEROUS.has(entry.action) ? 'danger' : ''}`.trim()} style={{ margin: 0, width: 7, height: 7 }} />
                    <Badge tone={DANGEROUS.has(entry.action) ? 'danger' : 'blue'}>{ACTION_LABELS[entry.action] ?? entry.action}</Badge>
                  </div>
                  <div className="hint mono" style={{ marginTop: 4 }}>{entry.action}</div>
                </div>
              ),
            },
            {
              key: 'account',
              header: 'Konto',
              render: (entry: any) => entry.userId ? (
                <Link to="/users/$userId" params={{ userId: entry.userId }} style={{ color: 'inherit', textDecoration: 'none' }}>
                  <strong>{entry.account || entry.userId}</strong>
                  <div className="hint mono">{entry.userId}</div>
                </Link>
              ) : (
                <span className="muted">{entry.account || '—'}</span>
              ),
            },
            {
              key: 'detail',
              header: 'Details',
              render: (entry: any) => <span className="tiny">{detailText(entry.detail) || '—'}</span>,
            },
          ]}
          footer={<Pagination page={page} pageSize={PAGE_SIZE} total={data.total ?? 0} onPage={setPage} />}
        />
      )}
    </div>
  );
}
