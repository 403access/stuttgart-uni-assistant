import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import { ApiError } from '@ua/api-client';
import { AppShell, Button, Icon, Sidebar, Spinner, Topbar, useTheme, useToast } from '@ua/ui-react';

import { api } from '../lib/api';
import { LoginScreen } from './login';

const sections = [
  { href: '/', label: 'Übersicht', icon: 'overview' },
  { href: '/news', label: 'News', icon: 'news' },
  { href: '/users', label: 'Nutzer', icon: 'users' },
  { href: '/ilias', label: 'ILIAS', icon: 'ilias' },
  { href: '/devices', label: 'Geräte', icon: 'devices' },
  { href: '/audit', label: 'Aktivität', icon: 'audit' },
  { href: '/logs', label: 'Logs', icon: 'logs' },
  { href: '/components', label: 'Komponenten', icon: 'components' },
  { href: '/system', label: 'System', icon: 'system' },
  { href: '/quiz', label: 'Quiz', icon: 'quiz' },
];

const titles: Record<string, string> = {
  '/': 'Übersicht',
  '/news': 'News',
  '/users': 'Nutzer',
  '/ilias': 'ILIAS',
  '/devices': 'Geräte',
  '/audit': 'Aktivität',
  '/logs': 'Logs',
  '/components': 'Komponenten',
  '/system': 'System',
  '/quiz': 'Quiz',
};

export function Root() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { theme, toggle } = useTheme();
  const toast = useToast();
  const overview = useQuery({ queryKey: ['overview'], queryFn: () => api.overview(), retry: false });

  if (overview.isLoading) {
    return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}><Spinner /></div>;
  }

  if (overview.error) {
    const code = overview.error instanceof ApiError ? overview.error.code : '';
    if (code === 'unauthorized' || code === 'admin_unconfigured' || code === 'network') {
      return <LoginScreen error={overview.error} onRetry={() => overview.refetch()} />;
    }
    return <LoginScreen error={overview.error} onRetry={() => overview.refetch()} />;
  }

  const section = pathname === '/' ? '/' : `/${pathname.split('/').filter(Boolean)[0]}`;
  const items = sections.map((item) => ({ ...item, active: item.href === section }));
  const stats = overview.data as Record<string, number> | undefined;

  return (
    <AppShell
      sidebar={(
        <Sidebar
          items={[
            { label: 'Betrieb' },
            ...items.slice(0, 6).map((item) => ({ ...item, badge: item.href === '/users' ? stats?.users : item.href === '/devices' ? stats?.devices : undefined })),
            { label: 'System' },
            ...items.slice(6),
          ]}
          onNavigate={(href) => navigate({ to: href })}
          footer={(
            <>
              <Button variant="secondary" size="small" onClick={toggle}>
                <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={15} />
                {theme === 'dark' ? 'Helles Design' : 'Dunkles Design'}
              </Button>
              <Button
                variant="secondary"
                size="small"
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
                <Icon name="logout" size={15} />
                Abmelden
              </Button>
            </>
          )}
        />
      )}
    >
      <Topbar title={titles[section] ?? 'Verwaltung'} subtitle="University Assistant" />
      <main style={{ padding: 24, width: '100%', maxWidth: 1400, margin: '0 auto' }}>
        <Outlet />
      </main>
    </AppShell>
  );
}
