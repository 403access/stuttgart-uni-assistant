/**
 * ILIAS through the assistant server plus the app's hidden WebView.
 *
 * The server signs in once, parses and caches harvested pages, and serves the
 * cache. The dashboard and course pages themselves are read by the WebView with
 * the session cookie the login handed over; this module decides when the cache
 * is fresh enough and posts a freshly harvested page back to the server.
 */

import { assistantUrl } from '@/src/assistant/remote';
import { authHeaders } from '@/src/auth/session';
import {
  clearIliasCookies,
  ensureIliasCookies,
  fetchIliasPage,
  ILIAS_DASHBOARD_URL,
  iliasHeadlessReady,
  iliasRepositoryUrl,
  looksLikeIliasLoginHtml,
  seedIliasCookies,
  type IliasPageResult,
} from '@/src/ilias/headless';

import type { Locale } from '@/src/types';

import type {
  IliasContent,
  IliasContentItem,
  IliasCounts,
  IliasDashboard,
  IliasItem,
  IliasMember,
  IliasMembers,
  IliasProfile,
  IliasProfileCourse,
  IliasProfileLink,
  IliasProfileSection,
  IliasStatus,
} from './types';

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

function asContentItem(value: unknown): IliasContentItem | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Partial<IliasContentItem>;
  if (typeof item.title !== 'string' && typeof item.url !== 'string') return null;
  return {
    id: typeof item.id === 'string' ? item.id : '',
    kind: typeof item.kind === 'string' ? item.kind : 'item',
    type: typeof item.type === 'string' ? item.type : '',
    refId: typeof item.refId === 'number' ? item.refId : null,
    title: typeof item.title === 'string' ? item.title : '(ohne Titel)',
    description: typeof item.description === 'string' ? item.description : '',
    url: typeof item.url === 'string' ? item.url : '',
    properties: Array.isArray(item.properties) ? item.properties.map(asProperty) : [],
    date: typeof item.date === 'string' ? item.date : '',
    size: typeof item.size === 'string' ? item.size : '',
    pages: typeof item.pages === 'string' ? item.pages : '',
    downloadable: Boolean(item.downloadable),
  };
}

export function asIliasContent(value: unknown): IliasContent {
  const body = (value ?? {}) as Partial<IliasContent>;
  return {
    refId: typeof body.refId === 'number' ? body.refId : 0,
    kind: typeof body.kind === 'string' ? body.kind : 'crs',
    title: typeof body.title === 'string' ? body.title : '',
    description: typeof body.description === 'string' ? body.description : '',
    membersUrl: typeof body.membersUrl === 'string' ? body.membersUrl : '',
    items: Array.isArray(body.items) ? body.items.flatMap((entry) => asContentItem(entry) ?? []) : [],
    fetchedAt: typeof body.fetchedAt === 'string' ? body.fetchedAt : new Date().toISOString(),
  };
}

function asMember(value: unknown): IliasMember | null {
  if (!value || typeof value !== 'object') return null;
  const member = value as Partial<IliasMember>;
  const name = typeof member.name === 'string' ? member.name : '';
  if (!name) return null;
  return {
    id: typeof member.id === 'string' && member.id ? member.id : `member-${name}`,
    name,
    username: typeof member.username === 'string' ? member.username : '',
    role: typeof member.role === 'string' ? member.role : '',
    roleKind: member.roleKind === 'tutor' ? 'tutor' : 'participant',
    hidden: Boolean(member.hidden),
    userId: typeof member.userId === 'number' && member.userId > 0 ? member.userId : null,
    avatarUrl: typeof member.avatarUrl === 'string' ? member.avatarUrl : '',
    profileUrl: typeof member.profileUrl === 'string' ? member.profileUrl : '',
  };
}

export function asIliasMembers(value: unknown): IliasMembers {
  const body = (value ?? {}) as Partial<IliasMembers>;
  return {
    refId: typeof body.refId === 'number' ? body.refId : 0,
    kind: typeof body.kind === 'string' ? body.kind : 'crs',
    title: typeof body.title === 'string' ? body.title : '',
    members: Array.isArray(body.members) ? body.members.flatMap((entry) => asMember(entry) ?? []) : [],
    fetchedAt: typeof body.fetchedAt === 'string' ? body.fetchedAt : new Date().toISOString(),
  };
}

function asProfileLink(value: unknown): IliasProfileLink | null {
  if (!value || typeof value !== 'object') return null;
  const link = value as Partial<IliasProfileLink>;
  if (typeof link.url !== 'string' || !link.url) return null;
  return { label: typeof link.label === 'string' ? link.label : link.url, url: link.url };
}

function asProfileSection(value: unknown): IliasProfileSection | null {
  if (!value || typeof value !== 'object') return null;
  const section = value as Partial<IliasProfileSection>;
  const title = typeof section.title === 'string' ? section.title : '';
  const text = typeof section.text === 'string' ? section.text : '';
  const links = Array.isArray(section.links) ? section.links.flatMap((entry) => asProfileLink(entry) ?? []) : [];
  if (!title && !text && links.length === 0) return null;
  return { title, text, links };
}

function asProfileCourse(value: unknown): IliasProfileCourse | null {
  if (!value || typeof value !== 'object') return null;
  const course = value as Partial<IliasProfileCourse>;
  if (typeof course.refId !== 'number' || course.refId <= 0) return null;
  if (typeof course.kind !== 'string' || !course.kind) return null;
  return {
    refId: course.refId,
    kind: course.kind,
    title: typeof course.title === 'string' ? course.title : '',
    url: typeof course.url === 'string' ? course.url : '',
  };
}

export function asIliasProfile(value: unknown): IliasProfile {
  const body = (value ?? {}) as Partial<IliasProfile>;
  return {
    userId: typeof body.userId === 'number' && body.userId > 0 ? body.userId : null,
    name: typeof body.name === 'string' ? body.name : '',
    title: typeof body.title === 'string' ? body.title : '',
    context: typeof body.context === 'string' ? body.context : '',
    avatarUrl: typeof body.avatarUrl === 'string' ? body.avatarUrl : '',
    email: typeof body.email === 'string' ? body.email : '',
    mailUrl: typeof body.mailUrl === 'string' ? body.mailUrl : '',
    vcardUrl: typeof body.vcardUrl === 'string' ? body.vcardUrl : '',
    profileUrl: typeof body.profileUrl === 'string' ? body.profileUrl : '',
    sections: Array.isArray(body.sections) ? body.sections.flatMap((entry) => asProfileSection(entry) ?? []) : [],
    courses: Array.isArray(body.courses) ? body.courses.flatMap((entry) => asProfileCourse(entry) ?? []) : [],
    fetchedAt: typeof body.fetchedAt === 'string' ? body.fetchedAt : new Date().toISOString(),
  };
}

/** The assistant-server proxy for a profile image; the bytes need the ILIAS cookie. */
export function iliasImageUrl(imageUrl: string): string {
  const value = imageUrl?.trim();
  if (!value) return '';
  return endpoint(`/v1/ilias/image?url=${encodeURIComponent(value)}`);
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

/** `token` overrides the in-memory bearer, e.g. right after a fresh sign-in. */
function bearer(token?: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : authHeaders();
}

export async function fetchIliasStatus(token?: string | null): Promise<IliasStatus> {
  const payload = await request('/v1/ilias/config', { headers: { ...bearer(token) } });
  // The config route returns the status object itself.
  return asIliasStatus(payload);
}

export async function connectIlias(input: {
  account?: string;
  password?: string;
  cookie?: string;
  token?: string | null;
}): Promise<{ status: IliasStatus; dashboard: IliasDashboard }> {
  const payload = (await request('/v1/ilias/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...bearer(input.token) },
    body: JSON.stringify({
      account: input.account?.trim() ?? '',
      password: input.password ?? '',
      cookie: input.cookie?.trim() ?? '',
    }),
  })) as { status?: unknown; cookies?: unknown } & Record<string, unknown>;
  // The page reads happen in the app now, so the login hands the session to
  // the WebView cookie store once. The server keeps its copy in memory too.
  if (typeof payload.cookies === 'string') await seedIliasCookies(payload.cookies);
  return { status: asIliasStatus(payload.status), dashboard: asIliasDashboard(payload) };
}

export interface IliasDashboardResult {
  status: IliasStatus;
  dashboard: IliasDashboard;
  cached: boolean;
  stale: boolean;
}

function dashboardResult(payload: Record<string, unknown>): IliasDashboardResult {
  return {
    status: asIliasStatus(payload.status),
    dashboard: asIliasDashboard(payload),
    cached: Boolean(payload.cached),
    stale: Boolean(payload.stale),
  };
}

function cacheMiss(caught: unknown): boolean {
  return caught instanceof IliasError && caught.message === 'ilias_cache_miss';
}

function sessionExpired(caught: unknown): boolean {
  return caught instanceof IliasError && caught.message === 'ilias_session_expired';
}

/**
 * Read a page in the app's hidden WebView. Returns null on the web build, which
 * has no injectable page and uses the server's live fallback instead.
 *
 * A page that renders the login form means the WebView cookie is missing or
 * dead. Re-seed from the server session and retry once before asking the user
 * to reconnect.
 */
async function markIliasSessionExpired(): Promise<void> {
  // Tell the server its in-memory cookie is dead, so the next status probe
  // reports an inactive session and the vault can reconnect.
  await request('/v1/ilias/session/expired', { method: 'POST', headers: { ...authHeaders() } }).catch(() => undefined);
}

function transportExpired(caught: unknown): boolean {
  const code = caught instanceof Error ? caught.message : '';
  return code === 'ilias_http_401' || code === 'ilias_http_403';
}

async function fetchPageWithSession(url: string): Promise<IliasPageResult | null> {
  if (!iliasHeadlessReady()) return null;
  await ensureIliasCookies();
  let page: IliasPageResult;
  try {
    page = await fetchIliasPage(url);
    if (looksLikeIliasLoginHtml(page.html) && (await ensureIliasCookies({ refresh: true }))) {
      page = await fetchIliasPage(url);
    }
  } catch (caught) {
    if (transportExpired(caught)) {
      await markIliasSessionExpired();
      throw new IliasError('ilias_session_expired');
    }
    throw caught;
  }
  if (looksLikeIliasLoginHtml(page.html)) await markIliasSessionExpired();
  return page;
}

async function ingestPage(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  return (await request('/v1/ilias/ingest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  })) as Record<string, unknown>;
}

/**
 * The stored dashboard, refreshed from the app's WebView when it is missing or
 * older than the server TTL. The server never fetches for a normal app read.
 */
export async function loadIliasDashboard(options: { refresh?: boolean } = {}): Promise<IliasDashboardResult> {
  let cached: IliasDashboardResult | null = null;
  try {
    cached = dashboardResult((await request('/v1/ilias/dashboard', { headers: { ...authHeaders() } })) as Record<string, unknown>);
  } catch (caught) {
    if (!cacheMiss(caught)) throw caught;
  }
  if (cached && !options.refresh && !cached.stale) return cached;

  try {
    const page = await fetchPageWithSession(ILIAS_DASHBOARD_URL);
    if (page) {
      if (looksLikeIliasLoginHtml(page.html)) throw new IliasError('ilias_session_expired');
      return dashboardResult(await ingestPage({ page: 'dashboard', html: page.html, url: page.url }));
    }
  } catch (caught) {
    // A stale copy still beats an empty tab; a dead session has to surface.
    if (cached && !sessionExpired(caught)) return cached;
    throw caught;
  }

  try {
    return dashboardResult((await request('/v1/ilias/dashboard?live=1', { headers: { ...authHeaders() } })) as Record<string, unknown>);
  } catch (caught) {
    if (cached) return cached;
    throw caught;
  }
}

/**
 * One course, group, or folder page. Served from the server cache while fresh;
 * otherwise the app fetches the page in its WebView and posts the HTML back.
 */
export async function loadIliasContent(input: { refId: number; kind?: string; refresh?: boolean }): Promise<IliasContent> {
  const kind = input.kind?.trim() || 'crs';
  const query = `refId=${encodeURIComponent(String(input.refId))}&kind=${encodeURIComponent(kind)}`;
  let cached: IliasContent | null = null;
  try {
    const payload = (await request(`/v1/ilias/content?${query}`, { headers: { ...authHeaders() } })) as Record<string, unknown>;
    cached = asIliasContent(payload);
    if (!input.refresh && !payload.stale) return cached;
  } catch (caught) {
    if (!cacheMiss(caught)) throw caught;
  }

  try {
    const page = await fetchPageWithSession(iliasRepositoryUrl(kind, input.refId));
    if (page) {
      if (looksLikeIliasLoginHtml(page.html)) throw new IliasError('ilias_session_expired');
      const payload = await ingestPage({
        page: 'content',
        refId: input.refId,
        kind,
        html: page.html,
        url: page.url,
      });
      return asIliasContent(payload);
    }
  } catch (caught) {
    if (cached && !sessionExpired(caught)) return cached;
    throw caught;
  }

  try {
    return asIliasContent(await request(`/v1/ilias/content?${query}&live=1`, { headers: { ...authHeaders() } }));
  } catch (caught) {
    if (cached) return cached;
    throw caught;
  }
}

/**
 * The members tab of a course or group. Same cache/fetch flow as the content
 * page: the stored rows first, then the app's WebView harvest, then the
 * server's browser fallback for the web build.
 */
export async function loadIliasMembers(input: {
  refId: number;
  kind?: string;
  membersUrl?: string;
  refresh?: boolean;
}): Promise<IliasMembers> {
  const kind = input.kind?.trim() || 'crs';
  const membersUrl = input.membersUrl?.trim() || '';
  const base = `refId=${encodeURIComponent(String(input.refId))}&kind=${encodeURIComponent(kind)}`;
  const live = `${base}${membersUrl ? `&url=${encodeURIComponent(membersUrl)}` : ''}`;
  let cached: IliasMembers | null = null;
  try {
    const payload = (await request(`/v1/ilias/members?${base}`, { headers: { ...authHeaders() } })) as Record<string, unknown>;
    cached = asIliasMembers(payload);
    if (!input.refresh && !payload.stale) return cached;
  } catch (caught) {
    if (!cacheMiss(caught)) throw caught;
  }

  try {
    // Without the object-specific members link there is no page to inject; the
    // server fallback discovers it from the content page.
    if (iliasHeadlessReady() && membersUrl) {
      const page = await fetchPageWithSession(membersUrl);
      if (page) {
        if (looksLikeIliasLoginHtml(page.html)) throw new IliasError('ilias_session_expired');
        const payload = await ingestPage({
          page: 'members',
          refId: input.refId,
          kind,
          html: page.html,
          url: page.url,
        });
        return asIliasMembers(payload);
      }
    }
  } catch (caught) {
    if (cached && !sessionExpired(caught)) return cached;
    throw caught;
  }

  try {
    return asIliasMembers(await request(`/v1/ilias/members?${live}&live=1`, { headers: { ...authHeaders() } }));
  } catch (caught) {
    if (cached) return cached;
    throw caught;
  }
}

/**
 * A public member profile. Cached by the target user id; on a miss the app
 * harvests the profile link it got from the members tab in its WebView.
 */
export async function loadIliasProfile(input: {
  userId: number | null;
  url: string;
  refresh?: boolean;
}): Promise<IliasProfile> {
  const userId = input.userId && input.userId > 0 ? input.userId : 0;
  const profileUrl = input.url?.trim() || '';
  const query = new URLSearchParams();
  if (userId) query.set('userId', String(userId));
  if (profileUrl) query.set('url', profileUrl);
  let cached: IliasProfile | null = null;
  try {
    if (userId) {
      const payload = (await request(`/v1/ilias/profile?userId=${userId}`, { headers: { ...authHeaders() } })) as Record<string, unknown>;
      cached = asIliasProfile(payload);
      if (!input.refresh && !payload.stale) return cached;
    }
  } catch (caught) {
    if (!cacheMiss(caught)) throw caught;
  }

  try {
    if (iliasHeadlessReady() && profileUrl) {
      const page = await fetchPageWithSession(profileUrl);
      if (page) {
        if (looksLikeIliasLoginHtml(page.html)) throw new IliasError('ilias_session_expired');
        const payload = await ingestPage({
          page: 'profile',
          userId,
          html: page.html,
          url: page.url,
        });
        return asIliasProfile(payload);
      }
    }
  } catch (caught) {
    if (cached && !sessionExpired(caught)) return cached;
    throw caught;
  }

  try {
    return asIliasProfile(
      await request(`/v1/ilias/profile?${query.toString()}&live=1`, { headers: { ...authHeaders() } }),
    );
  } catch (caught) {
    if (cached) return cached;
    throw caught;
  }
}

export interface IliasFile {
  data: ArrayBuffer;
  contentType: string;
  filename: string;
}
function filenameFromDisposition(value: string): string {
  const encoded = value.match(/filename\*\s*=\s*UTF-8''([^;]+)/i)?.[1];
  if (encoded) {
    try {
      return decodeURIComponent(encoded.trim().replace(/^"|"$/g, ''));
    } catch {
      return encoded.trim().replace(/^"|"$/g, '');
    }
  }
  return value.match(/filename\s*=\s*"([^"]*)"/i)?.[1] ?? value.match(/filename\s*=\s*([^;]+)/i)?.[1]?.trim() ?? '';
}

/** Fetch the bytes of a file through the assistant server. */
export async function fetchIliasFile(refId: number): Promise<IliasFile> {
  let response: Response;
  try {
    response = await fetch(endpoint(`/v1/ilias/file?refId=${encodeURIComponent(String(refId))}`), {
      headers: { ...authHeaders() },
    });
  } catch {
    throw new IliasError('server_unreachable');
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw failure(payload, 'ilias_failed', response.status);
  }
  return {
    data: await response.arrayBuffer(),
    contentType: response.headers.get('content-type')?.split(';')[0] || 'application/octet-stream',
    filename: filenameFromDisposition(response.headers.get('content-disposition') ?? ''),
  };
}

/**
 * The server-rendered office viewer (PPTX or DOCX). The page embeds the file
 * bytes and the renderer, so the WebView needs no further network access.
 */
export function iliasOfficeViewerUrl(refId: number, locale: Locale): string {
  const query = new URLSearchParams({ refId: String(refId), locale });
  return endpoint(`/v1/ilias/viewer?${query.toString()}`);
}

/** The same viewer page as text, for the web build's iframe. */
export async function fetchIliasOfficeViewer(refId: number, locale: Locale): Promise<string> {
  let response: Response;
  try {
    response = await fetch(iliasOfficeViewerUrl(refId, locale), { headers: { ...authHeaders() } });
  } catch {
    throw new IliasError('server_unreachable');
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw failure(payload, 'ilias_failed', response.status);
  }
  return response.text();
}

export async function disconnectIlias(): Promise<IliasStatus> {
  const payload = (await request('/v1/ilias/session', { method: 'DELETE', headers: { ...authHeaders() } })) as { status?: unknown };
  await clearIliasCookies();
  return asIliasStatus(payload.status);
}
