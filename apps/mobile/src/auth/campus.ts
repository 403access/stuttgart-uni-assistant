import { assistantUrl } from '@/src/assistant/remote';
import { recordCampusCall, type CampusLogEntry, type CampusOp } from '@/src/auth/campus-log';
import { asAuthSession, authHeaders, getActiveAuthToken, type AuthSession } from '@/src/auth/session';
import type { CampusCalendarEvent, CampusCourse, CampusStudy, CurriculumNode } from '@ua/core/domain/types';

export interface CampusLogin {
  account: string;
  name: string;
  studyId: number;
  elementId: number;
  nodes: CurriculumNode[];
  studies: CampusStudy[];
  activeStudyId: number | null;
  /** Server user and bearer session created by the same sign-in. Absent from older servers. */
  auth?: AuthSession;
}

export interface CurriculumLoad {
  studyId: number;
  elementId: number;
  nodes: CurriculumNode[];
}

export interface StudiesLoad {
  studies: CampusStudy[];
  activeStudyId: number | null;
}

export interface CoursesLoad {
  studyId: number;
  elementId: number;
  courses: CampusCourse[];
}

export type ServerSyncState = 'running' | 'cancelling' | 'cancelled' | 'done' | 'failed';

export interface CampusSyncJob {
  jobId: number;
  state: ServerSyncState;
  studyId: number;
  includeCourses: boolean;
  fetched: number;
  nodeCount: number;
  courseCount: number;
  retries: number;
  failedIds: number[];
  startedAt: string;
  finishedAt: string | null;
  error: string | null;
}

export interface ServerTree {
  studyId: number;
  nodes: CurriculumNode[];
  expandedIds: number[];
  sync: { nodeCount: number; finishedAt: string | null; complete: boolean } | null;
}

export interface ServerCourses {
  studyId: number;
  courses: (CampusCourse & { elementIds: number[]; elementNames: string[] })[];
  fetchedElementIds: number[];
  sync: { courseCount: number; finishedAt: string | null; complete: boolean } | null;
}

export interface CampusStatus {
  tokenConfigured: boolean;
  sessionCookieConfigured: boolean;
  studyId: number;
  elementId: number;
  /** Present when the status request carried the app bearer token. */
  credentialActive?: boolean;
  credentialSource?: 'env' | 'browser' | null;
  credentialAccount?: string | null;
}

function endpoint(path: string): string {
  return `${assistantUrl.replace(/\/$/, '')}${path}`;
}

export interface CampusFailure {
  error?: string;
  detail?: string;
  status?: number;
}

/** Server error code plus the upstream detail (`upstream 500: …`), without secrets. */
export function campusFailure(payload: unknown, fallback: string, httpStatus?: number): Error {
  const body = (payload ?? {}) as CampusFailure;
  const code = typeof body.error === 'string' && body.error ? body.error : fallback;
  const error = new Error(code);
  const detail = typeof body.detail === 'string' && body.detail ? body.detail : '';
  // An old assistant server answers `{ error }` without `detail`. Keep the HTTP
  // status so the failure is still distinguishable from a portal message.
  const resolved = detail || (typeof httpStatus === 'number' ? `http ${httpStatus} vom Assistenz-Server ohne Detail — 'npm run assistant' neu starten` : '');
  if (resolved) (error as { detail?: string }).detail = resolved.slice(0, 300);
  if (typeof body.status === 'number') (error as { status?: number }).status = body.status;
  return error;
}

export function campusDetail(caught: unknown): string {
  if (!caught || typeof caught !== 'object') return '';
  const detail = (caught as { detail?: unknown }).detail;
  return typeof detail === 'string' ? detail : '';
}

function logCall(
  op: CampusOp,
  started: number,
  ids: { studyId?: number; elementId?: number },
  outcome:
    | { ok: true; httpStatus: number; request?: string; response?: string; responseJson?: string }
    | { ok: false; httpStatus?: number; error: unknown; request?: string },
): void {
  if (outcome.ok) {
    recordCampusCall({
      op,
      studyId: ids.studyId,
      elementId: ids.elementId,
      ok: true,
      httpStatus: outcome.httpStatus,
      request: outcome.request,
      response: outcome.response,
      responseJson: outcome.responseJson,
      elapsedMs: Date.now() - started,
    });
  } else {
    recordCampusCall({
      op,
      studyId: ids.studyId,
      elementId: ids.elementId,
      ok: false,
      httpStatus: outcome.httpStatus,
      code: outcome.error instanceof Error ? outcome.error.message : 'campus_failed',
      detail: campusDetail(outcome.error) || undefined,
      request: outcome.request,
      elapsedMs: Date.now() - started,
    });
  }
}

/** `30 nodes · Philosophie, Basismodule, …` — capped content summary, never the raw body. */
function summarize(kind: string, names: string[], maxNames = 6, maxLength = 300): string {
  const head = names.slice(0, maxNames).join(', ');
  const rest = names.length > maxNames ? ', …' : '';
  return `${names.length} ${kind} · ${head}${rest}`.slice(0, maxLength);
}

/** Mapped response data as compact JSON. Arrays are clipped to fit the cap, so the stored string always parses. */
function jsonPreview(value: unknown, maxLength = 8000): string {
  try {
    let maxItems = 200;
    let json = JSON.stringify(clipArrays(value, maxItems));
    while (json.length > maxLength && maxItems > 5) {
      maxItems = Math.floor(maxItems / 2);
      json = JSON.stringify(clipArrays(value, maxItems));
    }
    return json.length > maxLength ? json.slice(0, maxLength) : json;
  } catch {
    return '';
  }
}

function clipArrays(value: unknown, maxItems: number): unknown {
  if (Array.isArray(value)) return value.slice(0, maxItems).map((item) => clipArrays(item, maxItems));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, clipArrays(item, maxItems)]));
  }
  return value;
}

export async function fetchCampusStatus(): Promise<CampusStatus | null> {
  try {
    const response = await fetch(endpoint('/v1/campus/config'), { headers: authHeaders() });
    if (!response.ok) return null;
    return (await response.json()) as CampusStatus;
  } catch {
    return null;
  }
}

export function pickActiveStudyId(studies: CampusStudy[], current: number | null = null): number | null {
  if (!studies.length) return null;
  if (studies.length === 1) return studies[0].studyId;
  if (current !== null && studies.some((item) => item.studyId === current)) return current;
  return studies.find((item) => item.lastAccessed)?.studyId ?? studies[0].studyId;
}

export function activeStudy(studies: CampusStudy[], activeStudyId: number | null): CampusStudy | null {
  if (!studies.length) return null;
  return studies.find((item) => item.studyId === activeStudyId) ?? studies.find((item) => item.lastAccessed) ?? studies[0];
}

export async function signInWithCampusToken(ticket?: string): Promise<CampusLogin> {
  const url = endpoint('/v1/campus/login');
  const started = Date.now();
  console.info('[campus-login] POST', url);
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(ticket ? { ticket } : {}),
    });
  } catch (caught) {
    const reason = caught instanceof Error ? caught.message : 'network';
    console.info('[campus-login] unreachable', reason);
    const error = new Error('server_unreachable');
    logCall('login', started, {}, { ok: false, error });
    throw error;
  }
  const payload = (await response.json().catch(() => ({}))) as CampusLogin & CampusFailure;
  console.info('[campus-login] status', response.status, payload.error ?? payload.name ?? 'ok');
  if (!response.ok) {
    const error = campusFailure(payload, `http_${response.status}`, response.status);
    logCall('login', started, {}, { ok: false, httpStatus: response.status, error });
    throw error;
  }
  if (!payload.name || !payload.account) {
    const error = campusFailure({ error: 'campus_unexpected', detail: 'Antwort ohne Name oder Kennung' }, 'campus_unexpected', response.status);
    logCall('login', started, {}, { ok: false, httpStatus: response.status, error });
    throw error;
  }
  const nodes = asCurriculumNodes(payload.nodes);
  // The login may already carry the chooser list (new server). Otherwise fetch it:
  // the enrolled studies are production data and drive the selector at the top.
  let studies = asCampusStudies(payload.studies);
  if (!studies.length && getActiveAuthToken()) {
    const loaded = await loadCampusStudies().catch((error: unknown) => {
      // Surface the studies failure: without it the app would fall back to mockup data.
      throw error instanceof Error ? error : new Error('campus_failed');
    });
    studies = loaded.studies;
  }
  logCall('login', started, {}, { ok: true, httpStatus: response.status, response: `${summarize('Knoten', nodes.map((node) => node.name))}; ${summarize('Studiengänge', studies.map((study) => study.name))}`, responseJson: jsonPreview({ nodes, studies }) });
  return { ...payload, nodes, studies, activeStudyId: pickActiveStudyId(studies, null), auth: asAuthSession(payload) ?? undefined };
}

export async function loadCampusCurriculum(elementId?: number, studyId?: number): Promise<CurriculumLoad> {
  const url = endpoint('/v1/campus/structure');
  const started = Date.now();
  const ids = { studyId, elementId };
  console.info('[campus-structure] POST', url, elementId ?? 'root', studyId ?? '');
  const body: Record<string, number> = {};
  if (elementId) body.elementId = elementId;
  if (studyId) body.studyId = studyId;
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(body),
    });
  } catch (caught) {
    const reason = caught instanceof Error ? caught.message : 'network';
    console.info('[campus-structure] unreachable', reason);
    const error = new Error('server_unreachable');
    logCall('structure', started, ids, { ok: false, error });
    throw error;
  }
  const payload = (await response.json().catch(() => ({}))) as CurriculumLoad & CampusFailure;
  console.info('[campus-structure] status', response.status, payload.error ?? payload.nodes?.length ?? 'ok');
  if (!response.ok) {
    const error = campusFailure(payload, `http_${response.status}`, response.status);
    logCall('structure', started, ids, { ok: false, httpStatus: response.status, error, request: `element=${elementId ?? 'root'} study=${studyId ?? 'Standard'}` });
    throw error;
  }
  const nodes = asCurriculumNodes(payload.nodes);
  if (!nodes.length || typeof payload.studyId !== 'number' || typeof payload.elementId !== 'number') {
    const error = campusFailure(
      { error: 'campus_unexpected', detail: `Leere Struktur study=${studyId ?? '-'} element=${elementId ?? '-'}` },
      'campus_unexpected',
      response.status,
    );
    logCall('structure', started, ids, { ok: false, httpStatus: response.status, error, request: `element=${elementId ?? 'root'} study=${studyId ?? 'Standard'}` });
    throw error;
  }
  logCall('structure', started, ids, {
    ok: true,
    httpStatus: response.status,
    request: `element=${elementId ?? 'root'} study=${studyId ?? 'Standard'}`,
    response: summarize('Knoten', nodes.map((node) => node.name)),
    responseJson: jsonPreview(nodes),
  });
  return { studyId: payload.studyId, elementId: payload.elementId, nodes };
}

export async function loadCampusStudies(): Promise<StudiesLoad> {
  const url = endpoint('/v1/campus/studies');
  const started = Date.now();
  console.info('[campus-studies] GET', url);
  let response: Response;
  try {
    response = await fetch(url, { headers: authHeaders() });
  } catch (caught) {
    const reason = caught instanceof Error ? caught.message : 'network';
    console.info('[campus-studies] unreachable', reason);
    const error = new Error('server_unreachable');
    logCall('studies', started, {}, { ok: false, error });
    throw error;
  }
  const payload = (await response.json().catch(() => ({}))) as StudiesLoad & CampusFailure;
  console.info('[campus-studies] status', response.status, payload.error ?? payload.studies?.length ?? 'ok');
  if (!response.ok) {
    const error = campusFailure(payload, `http_${response.status}`, response.status);
    logCall('studies', started, {}, { ok: false, httpStatus: response.status, error });
    throw error;
  }
  const studies = asCampusStudies(payload.studies);
  if (!studies.length) {
    const error = campusFailure({ error: 'campus_unexpected', detail: 'Leere Chooser-Antwort' }, 'campus_unexpected', response.status);
    logCall('studies', started, {}, { ok: false, httpStatus: response.status, error });
    throw error;
  }
  const requested = typeof payload.activeStudyId === 'number' ? payload.activeStudyId : null;
  logCall('studies', started, {}, { ok: true, httpStatus: response.status, response: summarize('Studiengänge', studies.map((study) => study.name)), responseJson: jsonPreview(studies) });
  return { studies, activeStudyId: pickActiveStudyId(studies, requested) };
}

export async function loadCampusCourses(elementId: number, studyId?: number): Promise<CoursesLoad> {
  const url = endpoint('/v1/campus/courses');
  const started = Date.now();
  const ids = { studyId, elementId };
  console.info('[campus-courses] POST', url, elementId, studyId ?? '');
  const body: Record<string, number> = { elementId };
  if (studyId) body.studyId = studyId;
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(body),
    });
  } catch (caught) {
    const reason = caught instanceof Error ? caught.message : 'network';
    console.info('[campus-courses] unreachable', reason);
    const error = new Error('server_unreachable');
    logCall('courses', started, ids, { ok: false, error });
    throw error;
  }
  const payload = (await response.json().catch(() => ({}))) as CoursesLoad & CampusFailure;
  console.info('[campus-courses] status', response.status, payload.error ?? payload.courses?.length ?? 'ok');
  if (!response.ok) {
    const error = campusFailure(payload, `http_${response.status}`, response.status);
    logCall('courses', started, ids, { ok: false, httpStatus: response.status, error, request: `element=${elementId} study=${studyId ?? 'Standard'}` });
    throw error;
  }
  if (typeof payload.studyId !== 'number' || typeof payload.elementId !== 'number') {
    const error = campusFailure(
      { error: 'campus_unexpected', detail: `Antwort ohne Studien- oder Element-Id (element=${elementId})` },
      'campus_unexpected',
      response.status,
    );
    logCall('courses', started, ids, { ok: false, httpStatus: response.status, error, request: `element=${elementId} study=${studyId ?? 'Standard'}` });
    throw error;
  }
  const courses = asCampusCourses(payload.courses);
  logCall('courses', started, ids, {
    ok: true,
    httpStatus: response.status,
    request: `element=${elementId} study=${studyId ?? 'Standard'}`,
    response: summarize('Kurse', courses.map((course) => course.title)),
    responseJson: jsonPreview(courses),
  });
  cacheCampusCourses(courses);
  return { studyId: payload.studyId, elementId: payload.elementId, courses };
}

/** In-memory course lookup for the detail screen. Courses are session data, not persisted. */
const courseCache = new Map<number, CampusCourse>();

export function cacheCampusCourses(courses: CampusCourse[]): void {
  for (const course of courses) courseCache.set(course.id, course);
}

export function getCachedCourse(id: number): CampusCourse | null {
  return courseCache.get(id) ?? null;
}

export function asCampusCourses(value: unknown): CampusCourse[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const course = item as Partial<CampusCourse>;
    if (typeof course.id !== 'number' || typeof course.title !== 'string' || !course.title) return [];
    return [
      {
        id: course.id,
        courseNumber: typeof course.courseNumber === 'string' ? course.courseNumber : '',
        title: course.title,
        courseType: typeof course.courseType === 'string' ? course.courseType : '',
        courseTypeShort: typeof course.courseTypeShort === 'string' ? course.courseTypeShort : '',
        semester: typeof course.semester === 'string' ? course.semester : '',
        semesterId: typeof course.semesterId === 'number' ? course.semesterId : null,
        duration: typeof course.duration === 'number' ? course.duration : null,
        lecturers: Array.isArray(course.lecturers) ? course.lecturers.filter((name): name is string => typeof name === 'string') : [],
        roomName: typeof course.roomName === 'string' ? course.roomName : '',
        startTime: typeof course.startTime === 'string' ? course.startTime : '',
        endTime: typeof course.endTime === 'string' ? course.endTime : '',
        detailUrl: typeof course.detailUrl === 'string' ? course.detailUrl : '',
        registrationStatus: typeof course.registrationStatus === 'string' ? course.registrationStatus : '',
        registrationAction: typeof course.registrationAction === 'string' ? course.registrationAction : '',
        registrationUrl: typeof course.registrationUrl === 'string' ? course.registrationUrl : '',
      },
    ];
  });
}

export function asCampusStudies(value: unknown): CampusStudy[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const study = item as Partial<CampusStudy>;
    if (typeof study.studyId !== 'number' || typeof study.name !== 'string' || !study.name) return [];
    return [
      {
        studyId: study.studyId,
        name: study.name,
        intendedDegree: typeof study.intendedDegree === 'string' ? study.intendedDegree : '',
        versionIdentifier: typeof study.versionIdentifier === 'string' ? study.versionIdentifier : '',
        studyStatus: typeof study.studyStatus === 'string' ? study.studyStatus : '',
        identifier: typeof study.identifier === 'string' ? study.identifier : '',
        curriculumVersionId: typeof study.curriculumVersionId === 'number' ? study.curriculumVersionId : null,
        curriculumId: typeof study.curriculumId === 'number' ? study.curriculumId : null,
        color: typeof study.color === 'string' ? study.color : '',
        lastAccessed: Boolean(study.lastAccessed),
        elementId: typeof study.elementId === 'number' ? study.elementId : null,
      },
    ];
  });
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

/** Start a server-side full sync (structures plus, by default, courses). Poll with `getServerSync`. */
export async function startServerSync(studyId: number, options: { elementId?: number; includeCourses?: boolean } = {}): Promise<CampusSyncJob> {
  const url = endpoint('/v1/campus/sync');
  console.info('[campus-sync] POST', url, studyId);
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ studyId, elementId: options.elementId, includeCourses: options.includeCourses ?? true }),
    });
  } catch {
    throw new Error('server_unreachable');
  }
  const payload = (await response.json().catch(() => ({}))) as CampusSyncJob & CampusFailure;
  if (!response.ok || typeof payload.jobId !== 'number') throw campusFailure(payload, `http_${response.status}`, response.status);
  return payload;
}

export async function getServerSync(jobId: number): Promise<CampusSyncJob> {
  const url = endpoint(`/v1/campus/sync/${jobId}`);
  let response: Response;
  try {
    response = await fetch(url, { headers: authHeaders() });
  } catch {
    throw new Error('server_unreachable');
  }
  const payload = (await response.json().catch(() => ({}))) as CampusSyncJob & CampusFailure;
  if (!response.ok || typeof payload.jobId !== 'number') throw campusFailure(payload, `http_${response.status}`, response.status);
  return payload;
}

export async function cancelServerSync(jobId: number): Promise<CampusSyncJob> {
  const url = endpoint(`/v1/campus/sync/${jobId}`);
  let response: Response;
  try {
    response = await fetch(url, { method: 'DELETE', headers: authHeaders() });
  } catch {
    throw new Error('server_unreachable');
  }
  const payload = (await response.json().catch(() => ({}))) as CampusSyncJob & CampusFailure;
  if (!response.ok || typeof payload.jobId !== 'number') throw campusFailure(payload, `http_${response.status}`, response.status);
  return payload;
}

/** Cached structure snapshot from the server store (no portal call). */
export async function loadServerTree(studyId: number): Promise<ServerTree> {
  const url = endpoint(`/v1/campus/tree?studyId=${studyId}`);
  let response: Response;
  try {
    response = await fetch(url, { headers: authHeaders() });
  } catch {
    throw new Error('server_unreachable');
  }
  const payload = (await response.json().catch(() => ({}))) as ServerTree & CampusFailure;
  if (!response.ok) throw campusFailure(payload, `http_${response.status}`, response.status);
  return {
    studyId: typeof payload.studyId === 'number' ? payload.studyId : studyId,
    nodes: asCurriculumNodes(payload.nodes),
    expandedIds: Array.isArray(payload.expandedIds) ? payload.expandedIds.filter((id): id is number => typeof id === 'number') : [],
    sync: payload.sync ?? null,
  };
}

/** Cached courses snapshot from the server store (no portal call). */
export async function loadServerCourses(studyId: number): Promise<ServerCourses> {
  const url = endpoint(`/v1/campus/courses/all?studyId=${studyId}`);
  let response: Response;
  try {
    response = await fetch(url, { headers: authHeaders() });
  } catch {
    throw new Error('server_unreachable');
  }
  const payload = (await response.json().catch(() => ({}))) as { courses?: unknown } & CampusFailure;
  if (!response.ok) throw campusFailure(payload, `http_${response.status}`, response.status);
  const raw = Array.isArray(payload.courses) ? payload.courses : [];
  const courses = raw.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const course = item as Partial<CampusCourse> & { elementIds?: unknown; elementNames?: unknown };
    const mapped = asCampusCourses([course]);
    if (!mapped.length) return [];
    return [
      {
        ...mapped[0],
        elementIds: Array.isArray(course.elementIds) ? course.elementIds.filter((id): id is number => typeof id === 'number') : [],
        elementNames: Array.isArray(course.elementNames) ? course.elementNames.filter((name): name is string => typeof name === 'string') : [],
      },
    ];
  });
  return {
    studyId: typeof (payload as { studyId?: unknown }).studyId === 'number' ? (payload as { studyId: number }).studyId : studyId,
    courses,
    fetchedElementIds: Array.isArray((payload as { fetchedElementIds?: unknown }).fetchedElementIds)
      ? ((payload as { fetchedElementIds: unknown[] }).fetchedElementIds.filter((id): id is number => typeof id === 'number'))
      : [],
    sync: (payload as { sync?: ServerCourses['sync'] }).sync ?? null,
  };
}

/** Portal-call history persisted by the server, newest first. */
export async function loadServerCalls(limit = 200): Promise<CampusLogEntry[]> {
  const url = endpoint(`/v1/campus/calls?limit=${limit}`);
  let response: Response;
  try {
    response = await fetch(url, { headers: authHeaders() });
  } catch {
    throw new Error('server_unreachable');
  }
  const payload = (await response.json().catch(() => ({}))) as { calls?: unknown } & CampusFailure;
  if (!response.ok) throw campusFailure(payload, `http_${response.status}`, response.status);
  if (!Array.isArray(payload.calls)) return [];
  return (payload.calls as Partial<CampusLogEntry>[]).flatMap((item, index) => {
    if (!item || typeof item !== 'object' || typeof item.uid !== 'string' || typeof item.op !== 'string') return [];
    return [
      {
        id: -(index + 1),
        uid: item.uid,
        time: typeof item.time === 'string' ? item.time : '',
        createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date(0).toISOString(),
        op: item.op as CampusLogEntry['op'],
        studyId: typeof item.studyId === 'number' ? item.studyId : undefined,
        elementId: typeof item.elementId === 'number' ? item.elementId : undefined,
        ok: item.ok !== false,
        httpStatus: typeof item.httpStatus === 'number' ? item.httpStatus : undefined,
        code: typeof item.code === 'string' ? item.code : undefined,
        detail: typeof item.detail === 'string' ? item.detail : undefined,
        elapsedMs: typeof item.elapsedMs === 'number' ? item.elapsedMs : 0,
      } satisfies CampusLogEntry,
    ];
  });
}

export interface CalendarExport {
  filename: string;
  contentType: string;
  bytes: number;
  base64: string;
}

export type CalendarExportFormat = 1 | 2 | 3 | 99;

/** Personal calendar download through the portal export mask (binary attachment as base64). */
export async function exportCampusCalendar(options: { dateFrom: string; dateTo: string; format?: CalendarExportFormat; charset?: string }): Promise<CalendarExport> {
  const url = endpoint('/v1/campus/calendar-export');
  console.info('[campus-export] POST', url, options.dateFrom, options.dateTo, options.format ?? 99);
  const started = Date.now();
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ dateFrom: options.dateFrom, dateTo: options.dateTo, format: options.format ?? 99, charset: options.charset ?? 'UTF8' }),
    });
  } catch {
    throw new Error('server_unreachable');
  }
  const payload = (await response.json().catch(() => ({}))) as CalendarExport & CampusFailure;
  console.info('[campus-export] status', response.status, payload.error ?? payload.filename ?? 'ok');
  if (!response.ok) throw campusFailure(payload, `http_${response.status}`, response.status);
  if (!payload.base64 || !payload.filename) throw campusFailure({ error: 'campus_unexpected' }, 'campus_unexpected', response.status);
  recordCampusCall({
    op: 'export',
    ok: true,
    httpStatus: response.status,
    request: `export ${options.dateFrom}–${options.dateTo} format=${options.format ?? 99}`,
    response: `${payload.filename} · ${payload.bytes ?? 0} bytes`,
    elapsedMs: Date.now() - started,
  });
  return { filename: payload.filename, contentType: payload.contentType || 'application/octet-stream', bytes: payload.bytes ?? 0, base64: payload.base64 };
}

export interface CalendarSync {
  filename: string;
  imported: number;
  skipped: number;
  total: number;
  /** Parsed events of the same run. Empty from an older assistant server. */
  events: CampusCalendarEvent[];
}

function asCalendarEvents(value: unknown): CampusCalendarEvent[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const event = item as Partial<CampusCalendarEvent>;
    if (typeof event.uid !== 'string' || !event.uid) return [];
    return [
      {
        uid: event.uid,
        summary: typeof event.summary === 'string' ? event.summary : '',
        location: typeof event.location === 'string' ? event.location : '',
        description: typeof event.description === 'string' ? event.description : '',
        dtstart: typeof event.dtstart === 'string' ? event.dtstart : '',
        dtend: typeof event.dtend === 'string' ? event.dtend : '',
        fetchedAt: typeof event.fetchedAt === 'string' ? event.fetchedAt : '',
      },
    ];
  });
}

/** Persisted calendar events of the signed-in user (server store, newest range first). */
export async function loadCalendarEvents(limit = 1000): Promise<CampusCalendarEvent[]> {
  const url = endpoint(`/v1/campus/calendar-events?limit=${limit}`);
  let response: Response;
  try {
    response = await fetch(url, { headers: authHeaders() });
  } catch {
    throw new Error('server_unreachable');
  }
  const payload = (await response.json().catch(() => ({}))) as { events?: unknown } & CampusFailure;
  if (!response.ok) throw campusFailure(payload, `http_${response.status}`, response.status);
  return asCalendarEvents(payload.events);
}

/** Import the official ICS export into the server store (dedupe by UID). */
export async function syncExportedCalendar(options: { dateFrom: string; dateTo: string }): Promise<CalendarSync> {
  const url = endpoint('/v1/campus/calendar-sync');
  console.info('[campus-sync] POST', url, options.dateFrom, options.dateTo);
  const started = Date.now();
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ dateFrom: options.dateFrom, dateTo: options.dateTo }),
    });
  } catch {
    throw new Error('server_unreachable');
  }
  const payload = (await response.json().catch(() => ({}))) as Partial<CalendarSync> & CampusFailure;
  console.info('[campus-sync] status', response.status, payload.error ?? `${payload.imported ?? 0} new`);
  if (!response.ok) throw campusFailure(payload, `http_${response.status}`, response.status);
  recordCampusCall({
    op: 'export',
    ok: true,
    httpStatus: response.status,
    request: `sync ${options.dateFrom}–${options.dateTo}`,
    response: `${payload.imported ?? 0} neu · ${payload.skipped ?? 0} Duplikate`,
    elapsedMs: Date.now() - started,
  });
  return {
    filename: payload.filename ?? '',
    imported: payload.imported ?? 0,
    skipped: payload.skipped ?? 0,
    total: payload.total ?? 0,
    events: asCalendarEvents(payload.events),
  };
}

export interface BrowserHarvest {
  cookies: string;
  storage: Record<string, string>;
}

/** Beta sign-in: hand the in-app browser harvest to the server for validation. Secrets never touch the app bundle. */
export async function submitBrowserCredentials(harvest: BrowserHarvest): Promise<{ ok: boolean; studies: number; ticket?: string }> {
  const url = endpoint('/v1/campus/credentials');
  console.info('[campus-credentials] POST', url);
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ cookies: harvest.cookies.slice(0, 8000), storage: harvest.storage }),
    });
  } catch {
    throw new Error('server_unreachable');
  }
  const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; studies?: number; ticket?: unknown } & CampusFailure;
  if (!response.ok || payload.ok !== true) throw campusFailure(payload, 'campus_failed', response.status);
  return {
    ok: true,
    studies: typeof payload.studies === 'number' ? payload.studies : 0,
    ticket: typeof payload.ticket === 'string' ? payload.ticket : undefined,
  };
}
