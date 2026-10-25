/** Admin quiz catalog management and answer analytics. */

import {
  adminQuizModules,
  adminQuizOverview,
  adminUserQuiz,
  createAdminQuizQuestion,
  createAdminQuizTopic,
  deleteAdminQuizQuestion,
  deleteAdminQuizTopic,
  getAdminQuizTopic,
  listAdminQuizAttempts,
  listAdminQuizSessions,
  listAdminQuizTopics,
  quizAttemptsCsv,
  updateAdminQuizModule,
  updateAdminQuizQuestion,
  updateAdminQuizTopic,
  recordAdminAudit,
} from '../../admin/index.mjs';
import { attachmentDisposition, readJsonBody, send, sendAsset } from '../../http.mjs';
import { seedQuizCatalog } from '../../quiz/seed.mjs';
import { decode, fail } from './shared.mjs';

const PREFIX = '/v1/admin/quiz';

function filters(url) {
  return {
    query: url.searchParams.get('query') || '',
    moduleId: url.searchParams.get('moduleId') || '',
    topicId: url.searchParams.get('topicId') || '',
    userId: url.searchParams.get('userId') || '',
    questionId: url.searchParams.get('questionId') || '',
    correct: url.searchParams.get('correct') || '',
    published: url.searchParams.get('published') || '',
    from: url.searchParams.get('from') || '',
    to: url.searchParams.get('to') || '',
    limit: url.searchParams.get('limit') || 50,
    offset: url.searchParams.get('offset') || 0,
  };
}

export async function handleAdminQuiz(request, response, url) {
  if (url.pathname !== PREFIX && !url.pathname.startsWith(`${PREFIX}/`)) return false;

  if (request.method === 'GET' && url.pathname === `${PREFIX}/overview`) {
    send(response, 200, adminQuizOverview());
    return true;
  }
  if (request.method === 'GET' && url.pathname === `${PREFIX}/modules`) {
    send(response, 200, { items: adminQuizModules() });
    return true;
  }
  if (request.method === 'GET' && url.pathname === `${PREFIX}/topics`) {
    send(response, 200, listAdminQuizTopics(filters(url)));
    return true;
  }
  if (request.method === 'POST' && url.pathname === `${PREFIX}/topics`) {
    const parsed = await readJsonBody(request, response);
    if (!parsed) return true;
    try {
      const item = createAdminQuizTopic(parsed.body);
      send(response, 200, { item });
    } catch (error) {
      fail(response, error);
    }
    return true;
  }
  if (request.method === 'POST' && url.pathname === `${PREFIX}/questions`) {
    const parsed = await readJsonBody(request, response);
    if (!parsed) return true;
    try {
      const topic = createAdminQuizQuestion(parsed.body);
      send(response, 200, { topic });
    } catch (error) {
      fail(response, error);
    }
    return true;
  }
  if (request.method === 'GET' && url.pathname === `${PREFIX}/attempts`) {
    send(response, 200, listAdminQuizAttempts(filters(url)));
    return true;
  }
  if (request.method === 'GET' && url.pathname === `${PREFIX}/attempts/export.csv`) {
    const csv = quizAttemptsCsv(filters(url));
    sendAsset(response, Buffer.from(csv, 'utf8'), 'text/csv; charset=utf-8', {
      'Content-Disposition': attachmentDisposition('quiz-answers.csv'),
    });
    return true;
  }
  if (request.method === 'GET' && url.pathname === `${PREFIX}/sessions`) {
    send(response, 200, listAdminQuizSessions(filters(url)));
    return true;
  }
  if (request.method === 'POST' && url.pathname === `${PREFIX}/seed`) {
    try {
      const result = seedQuizCatalog({ force: true });
      recordAdminAudit({ action: 'quiz.catalog.seed', detail: result });
      send(response, 200, result);
    } catch (error) {
      fail(response, error);
    }
    return true;
  }

  const match = url.pathname.match(/^\/v1\/admin\/quiz\/(topics|questions|modules|users)\/([^/]+)$/);
  if (!match) {
    send(response, 404, { error: 'not_found' });
    return true;
  }
  const kind = match[1];
  const id = decode(match[2]);
  if (!id) {
    send(response, 400, { error: 'bad_id' });
    return true;
  }

  if (kind === 'users') {
    if (request.method !== 'GET') {
      send(response, 405, { error: 'method_not_allowed' });
      return true;
    }
    send(response, 200, adminUserQuiz(id));
    return true;
  }

  if (kind === 'modules') {
    if (request.method !== 'POST') {
      send(response, 405, { error: 'method_not_allowed' });
      return true;
    }
    const parsed = await readJsonBody(request, response);
    if (!parsed) return true;
    try {
      const item = updateAdminQuizModule(id, parsed.body);
      if (!item) {
        send(response, 404, { error: 'unknown_quiz_module' });
        return true;
      }
      send(response, 200, { item });
    } catch (error) {
      fail(response, error);
    }
    return true;
  }

  if (request.method === 'GET') {
    if (kind !== 'topics') {
      send(response, 404, { error: 'not_found' });
      return true;
    }
    const topic = getAdminQuizTopic(id);
    if (!topic) {
      send(response, 404, { error: 'unknown_quiz_topic' });
      return true;
    }
    send(response, 200, { topic });
    return true;
  }

  if (request.method === 'DELETE') {
    const ok = kind === 'topics' ? deleteAdminQuizTopic(id) : deleteAdminQuizQuestion(id);
    if (!ok) {
      send(response, 404, { error: kind === 'topics' ? 'unknown_quiz_topic' : 'unknown_quiz_question' });
      return true;
    }
    send(response, 200, { ok: true });
    return true;
  }

  if (request.method === 'POST') {
    const parsed = await readJsonBody(request, response);
    if (!parsed) return true;
    try {
      if (kind === 'topics') {
        const topic = updateAdminQuizTopic(id, parsed.body);
        if (!topic) {
          send(response, 404, { error: 'unknown_quiz_topic' });
          return true;
        }
        send(response, 200, { topic });
        return true;
      }
      if (kind === 'questions') {
        const topic = updateAdminQuizQuestion(id, parsed.body);
        if (!topic) {
          send(response, 404, { error: 'unknown_quiz_question' });
          return true;
        }
        send(response, 200, { topic });
        return true;
      }
    } catch (error) {
      fail(response, error);
      return true;
    }
  }

  send(response, 405, { error: 'method_not_allowed' });
  return true;
}
