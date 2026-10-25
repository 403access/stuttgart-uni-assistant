import { API_OPERATIONS, type ApiOperation } from '@ua/contracts/api';
import { assistantUrl } from '@/src/assistant/remote';
import { authHeaders } from '@/src/auth/session';
import { tx } from '@/src/text';

export type { ApiOperation } from '@ua/contracts/api';

export interface ApiCallResult {
  status: number;
  elapsedMs: number;
  body: unknown;
}

const fallback: ApiOperation[] = API_OPERATIONS;

function endpoint(path: string): string {
  return `${assistantUrl.replace(/\/$/, '')}${path}`;
}

function isOperation(value: unknown): value is ApiOperation {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<ApiOperation>;
  return (
    typeof item.id === 'string' &&
    (item.method === 'GET' || item.method === 'POST') &&
    typeof item.path === 'string' &&
    item.path.startsWith('/') &&
    !item.path.includes('://') &&
    typeof item.replay === 'boolean'
  );
}

export async function fetchApiCatalog(): Promise<{ operations: ApiOperation[]; live: boolean }> {
  try {
    const response = await fetch(endpoint('/v1/api'));
    if (!response.ok) return { operations: fallback, live: false };
    const payload = (await response.json()) as { operations?: unknown };
    const operations = Array.isArray(payload.operations) ? payload.operations.filter(isOperation) : [];
    return operations.length ? { operations, live: true } : { operations: fallback, live: false };
  } catch {
    return { operations: fallback, live: false };
  }
}

export async function sendApiOperation(
  operation: ApiOperation,
  elementId?: number | { elementId?: number; studyId?: number },
  locale: 'de' | 'en' = 'de',
): Promise<ApiCallResult> {
  const allowed = operation.replay && (operation.path === '/health' || operation.path.startsWith('/v1/'));
  if (!allowed || operation.path.includes('://') || operation.path.includes('..')) throw new Error('not_replayable');
  const started = Date.now();
  const headers: Record<string, string> = { ...authHeaders() };
  let body: string | undefined;
  if (operation.id === 'campus-structure' || operation.id === 'campus-courses') {
    headers['Content-Type'] = 'application/json';
    const requested = typeof elementId === 'object' && elementId !== null ? elementId : { elementId: typeof elementId === 'number' ? elementId : undefined };
    const payload: Record<string, number> = {};
    if (typeof requested.elementId === 'number') payload.elementId = requested.elementId;
    if (typeof requested.studyId === 'number') payload.studyId = requested.studyId;
    body = JSON.stringify(payload);
  } else if (operation.id === 'campus-course-groups') {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(typeof elementId === 'number' ? { courseId: elementId } : {});
  } else if (operation.id === 'assist') {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify({
      locale,
      question: tx(locale, 'api.kann'),
      facts: tx(locale, 'api.dies'),
      history: [],
    });
  } else if (operation.method === 'POST') {
    headers['Content-Type'] = 'application/json';
    body = '{}';
  }
  let response: Response;
  try {
    response = await fetch(endpoint(operation.path), { method: operation.method, headers, body });
  } catch {
    throw new Error('server_unreachable');
  }
  const payload = await response.json().catch(() => ({ error: 'not_json' }));
  return { status: response.status, elapsedMs: Date.now() - started, body: payload };
}
