import { assistantUrl } from '@/src/assistant/remote';

export interface ApiOperation {
  id: string;
  method: 'GET' | 'POST';
  path: string;
  replay: boolean;
  acceptsElementId?: boolean;
}

export interface ApiCallResult {
  status: number;
  elapsedMs: number;
  body: unknown;
}

const fallback: ApiOperation[] = [
  { id: 'health', method: 'GET', path: '/health', replay: true },
  { id: 'campus-config', method: 'GET', path: '/v1/campus/config', replay: true },
  { id: 'oidc-config', method: 'GET', path: '/v1/oidc/config', replay: true },
  { id: 'campus-login', method: 'POST', path: '/v1/campus/login', replay: true },
  { id: 'campus-structure', method: 'POST', path: '/v1/campus/structure', replay: true, acceptsElementId: true },
  { id: 'campus-studies', method: 'GET', path: '/v1/campus/studies', replay: true },
  { id: 'assist', method: 'POST', path: '/v1/assist', replay: true },
  { id: 'oidc-start', method: 'POST', path: '/v1/oidc/start', replay: false },
  { id: 'oidc-exchange', method: 'POST', path: '/v1/oidc/exchange', replay: false },
  { id: 'oidc-logout', method: 'POST', path: '/v1/oidc/logout', replay: false },
];

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

export async function sendApiOperation(operation: ApiOperation, elementId?: number, locale: 'de' | 'en' = 'de'): Promise<ApiCallResult> {
  const allowed = operation.replay && (operation.path === '/health' || operation.path.startsWith('/v1/'));
  if (!allowed || operation.path.includes('://') || operation.path.includes('..')) throw new Error('not_replayable');
  const started = Date.now();
  const headers: Record<string, string> = {};
  let body: string | undefined;
  if (operation.id === 'campus-structure') {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(elementId ? { elementId } : {});
  } else if (operation.id === 'assist') {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify({
      locale,
      question: locale === 'de' ? 'Was kann diese Studienassistenz?' : 'What can this study assistant do?',
      facts: locale === 'de' ? 'Dies ist ein studentisches Demonstrationsprojekt.' : 'This is a student demonstration project.',
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
