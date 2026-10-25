import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import { AppShell, Icon, Sidebar, Spinner, Topbar, useTheme, useToast } from '@ua/ui-react';

import { api } from '../lib/api';
import { LoginScreen } from './login';

const sections = [
  { href: '/', label: 'Übersicht', icon: 'overview' },
  { href: '/news', label: 'News', icon: 'inbox' },
  { href: '/quiz', label: 'Lernquiz', icon: 'list' },
  { href: '/users', label: 'Nutzer', icon: 'users' },
  { href: '/ilias', label: 'ILIAS', icon: 'grid' },
  { href: '/devices', label: 'Geräte', icon: 'smartphone' },
  { href: '/audit', label: 'Aktivität', icon: 'activity' },
];

const systemSections = [
  { href: '/logs', label: 'Logs', icon: 'terminal' },
  { href: '/components', label: 'Komponenten', icon: 'grid' },
  { href: '/system', label: 'System', icon: 'server' },
];

const pages: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Übersicht', subtitle: 'Konten, Daten und Betrieb im Blick' },
  '/news': { title: 'News', subtitle: 'Meldungen für den Feed der App veröffentlichen' },
  '/quiz': { title: 'Lernquiz', subtitle: 'Themen und Fragen verwalten, Antworten aller Nutzer einsehen' },
  '/users': { title: 'Nutzer', subtitle: 'Konten suchen, filtern, prüfen und verwalten' },
  '/ilias': { title: 'ILIAS', subtitle: 'Verbindungen, Kurse und ungelesene Hinweise' },
  '/devices': { title: 'Geräte', subtitle: 'Web-Browser, die per QR-Code von der App freigegeben wurden' },
  '/audit': { title: 'Aktivität', subtitle: 'Jede Operator-Aktion, nachvollziehbar protokolliert' },
  '/logs': { title: 'Logs', subtitle: 'Diagnose aller Dienste, neueste Einträge zuerst' },
  '/components': { title: 'Komponenten', subtitle: 'Katalog, Plattformdateien und Fundstellen aus dem TypeScript-AST' },
  '/system': { title: 'System', subtitle: 'Umgebung, Konfiguration, Datenbank und Wartung' },
};

export function Root() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const search = useRouterState({ select: (state) => state.location.search }) as { view?: string };
  const { theme, toggle } = useTheme();
  const toast = useToast();
  const overview = useQuery({ queryKey: ['overview'], queryFn: () => api.overview(), retry: false });
  const userMatch = pathname.match(/^\/users\/([^/]+)$/);
  const userDetail = useQuery({
    queryKey: ['user', userMatch?.[1]],
    queryFn: () => api.user(userMatch![1]),
    enabled: Boolean(userMatch) && !overview.error,
  });
  const detailUser = (userDetail.data as { user?: { name?: string | null; account?: string; mode?: string } } | undefined)?.user;

  if (overview.isLoading) {
    return <div className="auth-screen"><div className="loading"><Spinner /> Verwaltung wird geladen …</div></div>;
  }

  if (overview.error) {
    return <LoginScreen error={overview.error} onRetry={() => overview.refetch()} />;
  }

  const section = pathname === '/' ? '/' : `/${pathname.split('/').filter(Boolean)[0]}`;
  const modeNames: Record<string, string> = { local: 'Lokal', campus: 'C@MPUS', oidc: 'SIAM', demo: 'Demo' };
  const page = userMatch
    ? {
        title: detailUser?.name || detailUser?.account || 'Nutzerdetails',
        subtitle: detailUser ? `${detailUser.account} · ${modeNames[detailUser.mode ?? ''] ?? detailUser.mode}` : 'Konto und Daten werden geladen …',
      }
    : section === '/quiz' && search.view === 'attempts'
      ? { title: 'Quiz-Antworten', subtitle: 'Jede geprüfte Antwort aller Nutzer' }
      : section === '/quiz' && search.view === 'sessions'
        ? { title: 'Quiz-Runden', subtitle: 'Abgeschlossene Runden mit Score und Dauer' }
        : pages[section] ?? pages['/'];
  const stats = overview.data as Record<string, number> | undefined;
  const isActive = (href: string) => href === section || (href !== '/' && section.startsWith(href));

  const refresh = () => {
    queryClient.invalidateQueries();
    toast.show('Ansicht aktualisiert.', 'ok');
  };

  return (
    <AppShell
      sidebar={(
        <Sidebar
          items={[
            { label: 'Betrieb' },
            ...sections.map((item) => ({
              ...item,
              active: isActive(item.href),
              badge: item.href === '/users' ? stats?.users : item.href === '/devices' ? stats?.devices : undefined,
            })),
            { label: 'System' },
            ...systemSections.map((item) => ({ ...item, active: isActive(item.href) })),
          ]}
          onNavigate={(href) => navigate({ to: href })}
          footer={(
            <>
              <button className="nav-item" type="button" onClick={toggle}>
                <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
                <span>{theme === 'dark' ? 'Helles Design' : 'Dunkles Design'}</span>
              </button>
              <div className="operator-card">
                <span className="avatar a1">OP</span>
                <div><strong>Operator</strong><span>Token-Sitzung · 12 h</span></div>
              </div>
              <button
                className="nav-item"
                type="button"
                onClick={async () => {
                  try {
                    await api.logout();
                  } catch {
                    toast.show('Abmeldung fehlgeschlagen.', 'error');
                  }
                  queryClient.clear();
                  overview.refetch();
                }}
              >
                <Icon name="logout" />
                <span>Abmelden</span>
              </button>
            </>
          )}
        />
      )}
    >
      <Topbar title={page.title} subtitle={page.subtitle} onRefresh={refresh} />
      <main className="main" tabIndex={-1}>
        <Outlet />
      </main>
    </AppShell>
  );
}
