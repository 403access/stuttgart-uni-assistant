import { createClient } from './client.js';

/** Operator endpoints. Authentication is the HttpOnly admin cookie. */
export function createAdminClient({ baseUrl = '', ...options } = {}) {
  const client = createClient({ baseUrl, credentials: 'same-origin', ...options });
  const id = (value) => encodeURIComponent(String(value));
  return {
    ...client,
    login: (token) => client.post('/v1/admin/login', { token }),
    logout: () => client.post('/v1/admin/logout', {}),
    overview: () => client.get('/v1/admin/overview'),
    ilias: () => client.get('/v1/admin/ilias'),
    users: (query) => client.get('/v1/admin/users', { query }),
    createUser: (body) => client.post('/v1/admin/users', body),
    user: (userId, query) => client.get(`/v1/admin/users/${id(userId)}`, { query }),
    updateUser: (userId, body) => client.post(`/v1/admin/users/${id(userId)}`, body),
    deleteUser: (userId) => client.del(`/v1/admin/users/${id(userId)}`),
    devices: (query) => client.get('/v1/admin/devices', { query }),
    device: (deviceId) => client.get(`/v1/admin/devices/${id(deviceId)}`),
    revokeDevice: (deviceId) => client.del(`/v1/admin/devices/${id(deviceId)}`),
    audit: (query) => client.get('/v1/admin/audit', { query }),
    logs: (query) => client.get('/v1/admin/logs', { query }),
    clearLogs: (query) => client.del('/v1/admin/logs', { query }),
    news: (query) => client.get('/v1/admin/news', { query }),
    createNews: (body) => client.post('/v1/admin/news', body),
    updateNews: (newsId, body) => client.post(`/v1/admin/news/${id(newsId)}`, body),
    deleteNews: (newsId) => client.del(`/v1/admin/news/${id(newsId)}`),
    system: () => client.get('/v1/admin/system'),
    environment: (reveal = false) => client.get('/v1/admin/environment', { query: reveal ? { reveal: 1 } : undefined }),
    mailLogout: () => client.post('/v1/admin/system/mail/logout', {}),
    syncJobs: () => client.get('/v1/admin/sync-jobs'),
    cancelSync: (jobId) => client.del(`/v1/admin/sync-jobs/${id(jobId)}`),
    quizOverview: () => client.get('/v1/admin/quiz/overview'),
    quizModules: () => client.get('/v1/admin/quiz/modules'),
    quizTopics: (query) => client.get('/v1/admin/quiz/topics', { query }),
    quizAttempts: (query) => client.get('/v1/admin/quiz/attempts', { query }),
    quizSessions: (query) => client.get('/v1/admin/quiz/sessions', { query }),
  };
}
