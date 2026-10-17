/** Operations this process actually implements. Replay stays on these paths. */

export function apiCatalog() {
  return {
    operations: [
      { id: 'health', method: 'GET', path: '/health', replay: true },
      { id: 'campus-config', method: 'GET', path: '/v1/campus/config', replay: true },
      { id: 'oidc-config', method: 'GET', path: '/v1/oidc/config', replay: true },
      { id: 'campus-login', method: 'POST', path: '/v1/campus/login', replay: true },
      { id: 'campus-credentials', method: 'POST', path: '/v1/campus/credentials', replay: false },
      { id: 'campus-structure', method: 'POST', path: '/v1/campus/structure', replay: true, acceptsElementId: true },
      { id: 'campus-courses', method: 'POST', path: '/v1/campus/courses', replay: true, acceptsElementId: true },
      { id: 'campus-course-groups', method: 'POST', path: '/v1/campus/course-groups', replay: true, acceptsCourseId: true },
      { id: 'campus-studies', method: 'GET', path: '/v1/campus/studies', replay: true },
      { id: 'campus-sync', method: 'POST', path: '/v1/campus/sync', replay: true },
      { id: 'campus-tree', method: 'GET', path: '/v1/campus/tree', replay: false },
      { id: 'campus-courses-all', method: 'GET', path: '/v1/campus/courses/all', replay: false },
      { id: 'campus-calls', method: 'GET', path: '/v1/campus/calls', replay: false },
      { id: 'campus-export', method: 'POST', path: '/v1/campus/calendar-export', replay: true },
      { id: 'campus-export-sync', method: 'POST', path: '/v1/campus/calendar-sync', replay: false },
      { id: 'mail-config', method: 'GET', path: '/v1/mail/config', replay: true },
      { id: 'mail-folders', method: 'GET', path: '/v1/mail/folders', replay: false },
      { id: 'mail-credentials', method: 'POST', path: '/v1/mail/credentials', replay: false },
      { id: 'mail-messages', method: 'GET', path: '/v1/mail/messages', replay: false },
      { id: 'mail-body', method: 'GET', path: '/v1/mail/body', replay: false },
      { id: 'mail-logout', method: 'POST', path: '/v1/mail/logout', replay: false },
      { id: 'assist', method: 'POST', path: '/v1/assist', replay: true },
      { id: 'oidc-start', method: 'POST', path: '/v1/oidc/start', replay: false },
      { id: 'oidc-exchange', method: 'POST', path: '/v1/oidc/exchange', replay: false },
      { id: 'oidc-logout', method: 'POST', path: '/v1/oidc/logout', replay: false },
    ],
  };
}
