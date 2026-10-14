import { assistantUrl } from '@/src/assistant/remote';
import type { CurriculumNode } from '@/src/types';

export interface CampusLogin {
  account: string;
  name: string;
  studyId: number;
  elementId: number;
  nodes: CurriculumNode[];
}

export interface CurriculumLoad {
  studyId: number;
  elementId: number;
  nodes: CurriculumNode[];
}

export interface CampusStatus {
  tokenConfigured: boolean;
  sessionCookieConfigured: boolean;
  studyId: number;
  elementId: number;
}

function endpoint(path: string): string {
  return `${assistantUrl.replace(/\/$/, '')}${path}`;
}

export async function fetchCampusStatus(): Promise<CampusStatus | null> {
  try {
    const response = await fetch(endpoint('/v1/campus/config'));
    if (!response.ok) return null;
    return (await response.json()) as CampusStatus;
  } catch {
    return null;
  }
}

export async function signInWithCampusToken(): Promise<CampusLogin> {
  const url = endpoint('/v1/campus/login');
  console.info('[campus-login] POST', url);
  let response: Response;
  try {
    response = await fetch(url, { method: 'POST' });
  } catch (caught) {
    const reason = caught instanceof Error ? caught.message : 'network';
    console.info('[campus-login] unreachable', reason);
    throw new Error('server_unreachable');
  }
  const payload = (await response.json().catch(() => ({}))) as CampusLogin & { error?: string };
  console.info('[campus-login] status', response.status, payload.error ?? payload.name ?? 'ok');
  if (!response.ok) throw new Error(payload.error || `http_${response.status}`);
  if (!payload.name || !payload.account) throw new Error('campus_unexpected');
  return { ...payload, nodes: asCurriculumNodes(payload.nodes) };
}

export async function loadCampusCurriculum(elementId?: number): Promise<CurriculumLoad> {
  const url = endpoint('/v1/campus/structure');
  console.info('[campus-structure] POST', url, elementId ?? 'root');
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(elementId ? { elementId } : {}),
    });
  } catch (caught) {
    const reason = caught instanceof Error ? caught.message : 'network';
    console.info('[campus-structure] unreachable', reason);
    throw new Error('server_unreachable');
  }
  const payload = (await response.json().catch(() => ({}))) as CurriculumLoad & { error?: string };
  console.info('[campus-structure] status', response.status, payload.error ?? payload.nodes?.length ?? 'ok');
  if (!response.ok) throw new Error(payload.error || `http_${response.status}`);
  const nodes = asCurriculumNodes(payload.nodes);
  if (!nodes.length || typeof payload.studyId !== 'number' || typeof payload.elementId !== 'number') throw new Error('campus_unexpected');
  return { studyId: payload.studyId, elementId: payload.elementId, nodes };
}

export function asCurriculumNodes(value: unknown): CurriculumNode[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const node = item as Partial<CurriculumNode>;
    if (typeof node.id !== 'number' || typeof node.name !== 'string' || !node.name) return [];
    return [
      {
        id: node.id,
        designation: typeof node.designation === 'string' ? node.designation : '',
        elementType: typeof node.elementType === 'string' ? node.elementType : '',
        name: node.name,
        parentId: typeof node.parentId === 'number' ? node.parentId : null,
        completed: Boolean(node.completed),
        inProgress: Boolean(node.inProgress),
      },
    ];
  });
}
