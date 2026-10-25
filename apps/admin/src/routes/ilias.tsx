import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { formatTimestamp } from '@ua/format';
import {
  Avatar,
  Badge,
  Button,
  Callout,
  DataTable,
  Dialog,
  ErrorState,
  FieldBox,
  KpiGrid,
  Muted,
  Section,
  StatCard,
  useToast,
} from '@ua/ui-react';
import { useState } from 'react';

import { api } from '../lib/api';

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

export function IliasPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [disconnect, setDisconnect] = useState<any | null>(null);
  const ilias = useQuery({ queryKey: ['ilias'], queryFn: () => api.ilias() });
  const data = (ilias.data ?? {}) as any;
  const totals = data.totals ?? {};
  const users: any[] = data.users ?? [];
  const sources: any[] = data.sources ?? [];

  const disconnectUser = useMutation({
    mutationFn: (userId: string) => api.userDisconnectIlias(userId),
    onSuccess: () => {
      setDisconnect(null);
      queryClient.invalidateQueries({ queryKey: ['ilias'] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
      toast.show('ILIAS-Sitzung getrennt.', 'ok');
    },
    onError: (error) => toast.show(error instanceof Error ? error.message : 'Trennen fehlgeschlagen.', 'error'),
  });

  if (ilias.error) {
    return <ErrorState message={ilias.error instanceof Error ? ilias.error.message : 'ILIAS-Daten konnten nicht geladen werden.'} />;
  }

  return (
    <div className="view-stack">
      <KpiGrid>
        <StatCard
          icon="key"
          tone="green"
          value={data.activeSessions ?? 0}
          label="Aktive Sitzungen"
          sub="nur bis zum Server-Neustart"
        />
        <StatCard icon="users" tone="blue" value={users.length} label="Verknüpfte Konten" sub="mit ILIAS-Quelle" />
        <StatCard
          icon="grid"
          tone="purple"
          value={totals.memberships ?? 0}
          label="Kurse & Gruppen"
          sub={`${totals.courses ?? 0} Kurse · ${totals.groups ?? 0} Gruppen`}
        />
        <StatCard icon="activity" tone="amber" value={totals.news ?? 0} label="Neuigkeiten" sub="aus dem Dashboard" />
        <StatCard
          icon="mail"
          tone="cyan"
          value={totals.mails ?? 0}
          label="Mails"
          sub={`${totals.unreadMails ?? 0} ungelesen`}
        />
        <StatCard icon="list" tone="red" value={totals.tasks ?? 0} label="To-Dos" sub="offene Aufgaben" />
      </KpiGrid>

      <Callout>
        Das Passwort wird nur für den einen Anmelde-POST verwendet und nicht gespeichert. Im Speicher bleibt
        ausschließlich die PHPSESSID; die Tabelle zeigt den zuletzt gelesenen Dashboard-Stand.
      </Callout>
      <Callout>
        Kursinhalte werden nicht gespeichert. Unter „Öffnen“ liest der Reiter ILIAS eines Kontos die Seite live über
        dessen Sitzung, zeigt Unterordner und Gruppen und lädt Dateien über den Server herunter.
      </Callout>

      {sources.length ? (
        <Section title="Quellen" subtitle="Woher die ILIAS-Sitzung stammt">
          <div className="field-grid">
            {sources.map((item) => (
              <FieldBox
                key={item.source}
                label={item.source === 'env' ? '.env-Sitzung' : 'Browser-Anmeldung'}
                value={item.count ?? 0}
              />
            ))}
          </div>
        </Section>
      ) : null}

      <Section
        title="Konten"
        subtitle={`${users.length} mit ILIAS-Daten`}
        actions={
          <Button variant="secondary" size="small" onClick={() => ilias.refetch()}>
            Aktualisieren
          </Button>
        }
      >
        <DataTable
          plain
          rows={users}
          rowKey={(user: any) => user.id}
          loading={ilias.isLoading}
          empty="Noch keine ILIAS-Verbindung"
          columns={[
            {
              key: 'account',
              header: 'Konto',
              render: (user: any) => (
                <a
                  className="who"
                  href={`/users/${user.id}`}
                  style={{ color: 'inherit' }}
                  onClick={(event) => {
                    event.preventDefault();
                    navigate({ to: '/users/$userId', params: { userId: user.id }, search: { tab: 'ilias' } });
                  }}
                >
                  <Avatar name={user.name || user.account} size="sm" />
                  <span className="who-text">
                    <strong>{user.name || user.account}</strong>
                    <span>{user.account}{user.iliasAccount ? ` · ${user.iliasAccount}` : ''}</span>
                  </span>
                </a>
              ),
            },
            {
              key: 'session',
              header: 'Sitzung',
              render: (user: any) =>
                user.active ? (
                  <Badge tone="ok">aktiv im Speicher</Badge>
                ) : user.canRead ? (
                  <Badge tone="warn">.env lesbar</Badge>
                ) : (
                  <Badge>getrennt</Badge>
                ),
            },
            { key: 'memberships', header: 'Mitgliedschaften', className: 'num', render: (user: any) => user.counts?.memberships ?? 0 },
            { key: 'courses', header: 'Kurse', className: 'num', render: (user: any) => user.counts?.courses ?? 0 },
            { key: 'news', header: 'News', className: 'num', render: (user: any) => user.counts?.news ?? 0 },
            {
              key: 'mails',
              header: 'Mails',
              className: 'num',
              render: (user: any) => `${user.counts?.mails ?? 0}${user.counts?.unreadMails ? ` · ${user.counts.unreadMails} neu` : ''}`,
            },
            {
              key: 'fetched',
              header: 'Gelesen',
              render: (user: any) => (user.fetchedAt ? <span title={formatTimestamp(user.fetchedAt, 'de')}>{relative(user.fetchedAt)}</span> : '–'),
            },
            {
              key: 'actions',
              header: '',
              render: (user: any) => (
                <div className="row tight">
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => navigate({ to: '/users/$userId', params: { userId: user.id }, search: { tab: 'ilias' } })}
                  >
                    Öffnen
                  </Button>
                  {user.active ? (
                    <Button variant="danger" size="small" onClick={() => setDisconnect(user)}>
                      Trennen
                    </Button>
                  ) : null}
                </div>
              ),
            },
          ]}
        />
      </Section>

      <Dialog
        open={Boolean(disconnect)}
        title="ILIAS-Sitzung trennen?"
        onClose={() => setDisconnect(null)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setDisconnect(null)}>Abbrechen</Button>
            <Button
              variant="danger"
              disabled={disconnectUser.isPending}
              onClick={() => disconnect && disconnectUser.mutate(disconnect.id)}
            >
              ILIAS trennen
            </Button>
          </>
        }
      >
        <p>
          Die Sitzung von „{disconnect?.name || disconnect?.account}“ wird aus dem Server-Speicher entfernt. Der
          gespeicherte Dashboard-Stand bleibt sichtbar; ein neuer Abruf braucht eine neue Anmeldung.
        </p>
        <Muted>Die Trennung betrifft nur die ILIAS-Sitzung, nicht die App-Sitzungen des Kontos.</Muted>
      </Dialog>
    </div>
  );
}
