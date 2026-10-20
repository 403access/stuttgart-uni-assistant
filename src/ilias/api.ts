/**
 * ILIAS over the assistant server. The app never talks to ILIAS directly and
 * never sees the PHPSESSID: the server logs in, stores the cookie in memory,
 * and returns the parsed dashboard.
 */

import { assistantUrl } from '@/src/assistant/remote';
import { authHeaders } from '@/src/auth/session';

import type { IliasCounts, IliasDashboard, IliasItem, IliasStatus } from './types';

export class IliasError extends Error {
  detail: string;

  constructor(code: string, detail = '') {
    super(code);
    this.name = 'IliasError';
    this.detail = detail;
  }
}

function endpoint(path: string): string {
  return `${assistantUrl.replace(/\/$/, '')}${path}`;
}

function failure(payload: unknown, fallback: string, status?: number): IliasError {
  const body = (payload ?? {}) as { error?: unknown; detail?: unknown };
  const code = typeof body.error === 'string' && body.error ? body.error : fallback;
  const detail =
    typeof body.detail === 'string' && body.detail
      ? body.detail
      : typeof status === 'number'
        ? `HTTP ${status}`
        : '';
  return new IliasError(code, detail.slice(0, 300));
}

function asProperty(value: unknown) {
  if (!value || typeof value !== 'object') return { name: '', value: '' };
  const item = value as { name?: unknown; value?: unknown };
  return { name: typeof item.name === 'string' ? item.name : '', value: typeof item.value === 'string' ? item.value : '' };
}

function asItems(value: unknown): IliasItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const item = entry as Partial<IliasItem>;
    if (typeof item.title !== 'string' && typeof item.url !== 'string') return [];
    return [
      {
        id: typeof item.id === 'string' ? item.id : '',
        kind: typeof item.kind === 'string' ? item.kind : 'item',
        type: typeof item.type === 'string' ? item.type : '',
        refId: typeof item.refId === 'number' ? item.refId : null,
        newsId: typeof item.newsId === 'number' ? item.newsId : null,
        mailId: typeof item.mailId === 'number' ? item.mailId : null,
        title: typeof item.title === 'string' ? item.title : '(ohne Titel)',
        description: typeof item.description === 'string' ? item.description : '',
        url: typeof item.url === 'string' ? item.url : '',
        group: typeof item.group === 'string' ? item.group : '',
        properties: Array.isArray(item.properties) ? item.properties.map(asProperty) : [],
        date: typeof item.date === 'string' ? item.date : '',
      },
    ];
  });
}

function asCounts(value: unknown): IliasCounts {
  const counts = (value ?? {}) as Partial<IliasCounts>;
  const number = (candidate: unknown) => (typeof candidate === 'number' && candidate >= 0 ? candidate : 0);
  return {
    memberships: number(counts.memberships),
    courses: number(counts.courses),
    groups: number(counts.groups),
    news: number(counts.news),
    mails: number(counts.mails),
    unreadMails: number(counts.unreadMails),
    tasks: number(counts.tasks),
  };
}

export function asIliasStatus(value: unknown): IliasStatus {
  const status = (value ?? {}) as Partial<IliasStatus>;
  return {
    baseUrl: typeof status.baseUrl === 'string' ? status.baseUrl : 'https://ilias3.uni-stuttgart.de',
    configured: Boolean(status.configured),
    sessionActive: Boolean(status.sessionActive),
    account: typeof status.account === 'string' ? status.account : null,
    source: status.source === 'env' || status.source === 'browser' ? status.source : null,
    updatedAt: typeof status.updatedAt === 'string' ? status.updatedAt : null,
  };
}

export function asIliasDashboard(value: unknown): IliasDashboard {
  const body = (value ?? {}) as Partial<IliasDashboard>;
  return {
    pageTitle: typeof body.pageTitle === 'string' ? body.pageTitle : '',
    name: typeof body.name === 'string' ? body.name : null,
    account: typeof body.account === 'string' ? body.account : null,
    memberships: asItems(body.memberships),
    courses: asItems(body.courses),
    groups: asItems(body.groups),
    news: asItems(body.news),
    mails: asItems(body.mails),
    tasks: asItems(body.tasks),
    counts: asCounts(body.counts),
    fetchedAt: typeof body.fetchedAt === 'string' ? body.fetchedAt : new Date().toISOString(),
  };
}

async function request(path: string, init: RequestInit = {}): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(endpoint(path), init);
  } catch {
    throw new IliasError('server_unreachable');
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw failure(payload, 'ilias_failed', response.status);
  return payload;
}

export async function fetchIliasStatus(): Promise<IliasStatus> {
  const payload = await request('/v1/ilias/config', { headers: { ...authHeaders() } });
  // The config route returns the status object itself.
  return asIliasStatus(payload);
}

export async function connectIlias(input: { account?: string; password?: string; cookie?: string }): Promise<{ status: IliasStatus; dashboard: IliasDashboard }> {
  const payload = (await request('/v1/ilias/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({
      account: input.account?.trim() ?? '',
      password: input.password ?? '',
      cookie: input.cookie?.trim() ?? '',
    }),
  })) as { status?: unknown } & Record<string, unknown>;
  return { status: asIliasStatus(payload.status), dashboard: asIliasDashboard(payload) };
}

export async function loadIliasDashboard(): Promise<{ status: IliasStatus; dashboard: IliasDashboard }> {
  const payload = (await request('/v1/ilias/dashboard', { headers: { ...authHeaders() } })) as { status?: unknown } & Record<string, unknown>;
  return { status: asIliasStatus(payload.status), dashboard: asIliasDashboard(payload) };
}

export async function disconnectIlias(): Promise<IliasStatus> {
  const payload = (await request('/v1/ilias/session', { method: 'DELETE', headers: { ...authHeaders() } })) as { status?: unknown };
  return asIliasStatus(payload.status);
}
