import { assistantUrl } from '@/src/assistant/remote';
import { recordCampusCall, type CampusOp } from '@/src/auth/campus-log';
import type { CampusStudy, CurriculumNode } from '@/src/types';

export interface CampusLogin {
  account: string;
  name: string;
  studyId: number;
  elementId: number;
  nodes: CurriculumNode[];
  studies: CampusStudy[];
  activeStudyId: number | null;
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

export interface CampusStatus {
  tokenConfigured: boolean;
  sessionCookieConfigured: boolean;
  studyId: number;
  elementId: number;
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
  outcome: { ok: true; httpStatus: number } | { ok: false; httpStatus?: number; error: unknown },
): void {
  if (outcome.ok) {
    recordCampusCall({ op, studyId: ids.studyId, elementId: ids.elementId, ok: true, httpStatus: outcome.httpStatus, elapsedMs: Date.now() - started });
  } else {
    recordCampusCall({
      op,
      studyId: ids.studyId,
      elementId: ids.elementId,
      ok: false,
      httpStatus: outcome.httpStatus,
      code: outcome.error instanceof Error ? outcome.error.message : 'campus_failed',
      detail: campusDetail(outcome.error) || undefined,
      elapsedMs: Date.now() - started,
    });
  }
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

export async function signInWithCampusToken(): Promise<CampusLogin> {
  const url = endpoint('/v1/campus/login');
  const started = Date.now();
  console.info('[campus-login] POST', url);
  let response: Response;
  try {
    response = await fetch(url, { method: 'POST' });
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
  if (!studies.length) {
    const loaded = await loadCampusStudies().catch((error: unknown) => {
      // Surface the studies failure: without it the app would fall back to mockup data.
      throw error instanceof Error ? error : new Error('campus_failed');
    });
    studies = loaded.studies;
  }
  logCall('login', started, {}, { ok: true, httpStatus: response.status });
  return { ...payload, nodes, studies, activeStudyId: pickActiveStudyId(studies, null) };
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
      headers: { 'Content-Type': 'application/json' },
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
    logCall('structure', started, ids, { ok: false, httpStatus: response.status, error });
    throw error;
  }
  const nodes = asCurriculumNodes(payload.nodes);
  if (!nodes.length || typeof payload.studyId !== 'number' || typeof payload.elementId !== 'number') {
    const error = campusFailure(
      { error: 'campus_unexpected', detail: `Leere Struktur study=${studyId ?? '-'} element=${elementId ?? '-'}` },
      'campus_unexpected',
      response.status,
    );
    logCall('structure', started, ids, { ok: false, httpStatus: response.status, error });
    throw error;
  }
  logCall('structure', started, ids, { ok: true, httpStatus: response.status });
  return { studyId: payload.studyId, elementId: payload.elementId, nodes };
}

export async function loadCampusStudies(): Promise<StudiesLoad> {
  const url = endpoint('/v1/campus/studies');
  const started = Date.now();
  console.info('[campus-studies] GET', url);
  let response: Response;
  try {
    response = await fetch(url);
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
  logCall('studies', started, {}, { ok: true, httpStatus: response.status });
  return { studies, activeStudyId: pickActiveStudyId(studies, requested) };
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
