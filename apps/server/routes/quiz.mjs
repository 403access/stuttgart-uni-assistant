/** Public quiz catalog plus the authenticated answer/session sync. */

import { requireAuth } from '../auth.mjs';
import { readJsonBody, send } from '../http.mjs';
import { readQuizCatalog, recordQuizSync } from '../quiz/catalog.mjs';

export async function handleQuiz(request, response, url) {
  if (request.method === 'GET' && url.pathname === '/v1/quiz/catalog') {
    send(response, 200, readQuizCatalog());
    return true;
  }
  if (request.method === 'POST' && url.pathname === '/v1/quiz/sync') {
    const parsed = await readJsonBody(request, response, 600_000);
    if (!parsed) return true;
    try {
      const auth = requireAuth(request);
      const result = recordQuizSync(auth.user.id, parsed.body);
      send(response, 200, result);
    } catch (error) {
      send(response, Number(error.status) || 500, { error: error.message || 'quiz_sync_failed', detail: error.detail });
    }
    return true;
  }
  return false;
}
