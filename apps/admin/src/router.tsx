import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router';

import { AuditPage } from './routes/audit';
import { ComponentsPage } from './routes/components';
import { IliasPage } from './routes/ilias';
import { DevicesPage } from './routes/devices';
import { LogsPage } from './routes/logs';
import { NewsPage } from './routes/news';
import { OverviewPage } from './routes/overview';
import { QuizPage } from './routes/quiz';
import { PlaceholderPage } from './routes/placeholder';
import { Root } from './routes/root';
import { SystemPage } from './routes/system';
import { UsersPage } from './routes/users';
import { UserDetailPage } from './routes/user-detail';

const rootRoute = createRootRoute({ component: Root });
const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: OverviewPage });
const usersRoute = createRoute({ getParentRoute: () => rootRoute, path: 'users', component: UsersPage });
const userRoute = createRoute({ getParentRoute: () => rootRoute, path: 'users/$userId', component: UserDetailPage });
const devicesRoute = createRoute({ getParentRoute: () => rootRoute, path: 'devices', component: DevicesPage });
const newsRoute = createRoute({ getParentRoute: () => rootRoute, path: 'news', component: NewsPage });
const auditRoute = createRoute({ getParentRoute: () => rootRoute, path: 'audit', component: AuditPage });
const logsRoute = createRoute({ getParentRoute: () => rootRoute, path: 'logs', component: LogsPage });
const systemRoute = createRoute({ getParentRoute: () => rootRoute, path: 'system', component: SystemPage });
const iliasRoute = createRoute({ getParentRoute: () => rootRoute, path: 'ilias', component: IliasPage });
const componentsRoute = createRoute({ getParentRoute: () => rootRoute, path: 'components', component: ComponentsPage });
const quizRoute = createRoute({ getParentRoute: () => rootRoute, path: 'quiz', component: QuizPage });
const sectionRoute = createRoute({ getParentRoute: () => rootRoute, path: '$section', component: PlaceholderPage });
const routeTree = rootRoute.addChildren([indexRoute, usersRoute, userRoute, devicesRoute, newsRoute, auditRoute, logsRoute, systemRoute, iliasRoute, componentsRoute, quizRoute, sectionRoute]);

export const router = createRouter({ routeTree, basepath: '/admin' });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
