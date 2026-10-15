/** Operations this process actually implements. Replay stays on these paths. */

export function apiCatalog() {
  return {
    operations: [
      { id: 'health', method: 'GET', path: '/health', replay: true },
      { id: 'campus-config', method: 'GET', path: '/v1/campus/config', replay: true },
      { id: 'oidc-config', method: 'GET', path: '/v1/oidc/config', replay: true },
      { id: 'campus-login', method: 'POST', path: '/v1/campus/login', replay: true },
      { id: 'campus-structure', method: 'POST', path: '/v1/campus/structure', replay: true, acceptsElementId: true },
      { id: 'campus-courses', method: 'POST', path: '/v1/campus/courses', replay: true, acceptsElementId: true },
      { id: 'campus-studies', method: 'GET', path: '/v1/campus/studies', replay: true },
      { id: 'assist', method: 'POST', path: '/v1/assist', replay: true },
      { id: 'oidc-start', method: 'POST', path: '/v1/oidc/start', replay: false },
      { id: 'oidc-exchange', method: 'POST', path: '/v1/oidc/exchange', replay: false },
      { id: 'oidc-logout', method: 'POST', path: '/v1/oidc/logout', replay: false },
    ],
  };
}
