import { assistantUrl } from '@/src/assistant/remote';

export interface CampusLogin {
  account: string;
  name: string;
  studyId: number;
  elementId: number;
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
  return payload;
}
