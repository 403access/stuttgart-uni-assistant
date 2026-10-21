/** Shared page state and the route-refresh hook. */

export const state = {
  route: { name: 'overview' },
  overview: null,
  users: {
    query: '', mode: '', platform: '', credential: '', activity: '', data: '', sort: 'recent',
    limit: 25, offset: 0, list: [], total: 0, seq: 0, selected: new Set(),
  },
  user: {
    id: null, detail: null, tab: 'overview', cache: {}, data: null, calendar: null, calls: null, platformEdit: null,
  },
  devices: { query: '', state: '', limit: 50, offset: 0, list: [], total: 0, stats: null, seq: 0 },
  news: { query: '', state: '', limit: 50, offset: 0, list: [], total: 0 },
  ilias: null,
  audit: { query: '', action: '', userId: '', limit: 50, offset: 0, list: [], total: 0, actions: [], seq: 0 },
  system: null,
  lastUsersHash: '#/users',
  searchTimer: null,
  usersSeq: 0,
};


/** Filled by the app shell so pages can reload the active route. */
export const refresh = { current: () => {} };
