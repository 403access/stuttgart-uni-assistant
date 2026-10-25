import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router';

import { OverviewPage } from './routes/overview';
import { PlaceholderPage } from './routes/placeholder';
import { Root } from './routes/root';

const rootRoute = createRootRoute({ component: Root });
const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: OverviewPage });
const sectionRoute = createRoute({ getParentRoute: () => rootRoute, path: '$section', component: PlaceholderPage });
const routeTree = rootRoute.addChildren([indexRoute, sectionRoute]);

export const router = createRouter({ routeTree, basepath: '/admin' });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
