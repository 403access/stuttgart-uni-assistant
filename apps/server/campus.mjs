/** Server-only C@MPUS access token. Never sent to the Expo bundle. */

import { randomBytes } from 'node:crypto';

import { getCoursesSync, isExpanded, loadCampusSource, loadCourses, loadCoursesFetchedIds, loadStudiesSnapshot, loadStructure, logPortalCall, saveCourses, saveCampusSource, saveExportedEvents, saveStudiesSnapshot, saveStructure } from './db.mjs';
import { logService } from './service-log.mjs';

/** Refreshed bearer token for the legacy single-user path. Memory only. */
let runtimeBearerToken = null;

/** Portal session cookie captured through the legacy single-user path. Memory only. */
let runtimeSessionCookie = null;

/** Per-user portal credentials. Memory only: a server restart asks the user to sign in again. */
const userCredentials = new Map();

/** Short-lived tickets that carry a validated browser harvest from `/v1/campus/credentials` to `/v1/campus/login`. */
const pendingCredentials = new Map();
const PENDING_TTL_MS = 10 * 60 * 1000;

export function clearRuntimeToken() {
  runtimeBearerToken = null;
}

export function clearRuntimeSession() {
  runtimeSessionCookie = null;
}

function envBearerToken() {
  const raw = (process.env.CAMPUS_BEARER_TOKEN || '').trim();
  if (!raw) return '';
  return raw.replace(/^Bearer\s+/i, '');
}

function envSessionCookie() {
  const raw = (process.env.CAMPUS_SESSION_COOKIE || '').trim();
  if (!raw) return '';
  return raw.replace(/^(PSESSIONID|JSESSIONID)=/i, '');
}

function normalCredential(credential) {
  return {
    bearer: String(credential?.bearer ?? '').trim().replace(/^Bearer\s+/i, ''),
    cookie: String(credential?.cookie ?? '').trim().replace(/^(PSESSIONID|JSESSIONID)=/i, ''),
    account: typeof credential?.account === 'string' && credential.account ? credential.account : null,
    source: credential?.source === 'env' ? 'env' : 'browser',
  };
}

function envCredential() {
  const credential = normalCredential({ bearer: envBearerToken(), cookie: envSessionCookie(), source: 'env' });
  if (!credential.bearer && !credential.cookie) return null;
  return credential;
}

/** Remember the working portal credential for one signed-in account. */
export function setUserCampusCredential(userId, credential) {
  if (!userId || !credential) return;
  const normalized = normalCredential(credential);
  if (!normalized.bearer && !normalized.cookie) return;
  userCredentials.set(userId, normalized);
}

export function getUserCampusCredential(userId) {
  return userId ? userCredentials.get(userId) ?? null : null;
}

export function clearUserCampusCredential(userId) {
  if (userId) userCredentials.delete(userId);
}

export function listUserCampusCredentials() {
  return [...userCredentials.entries()].map(([userId, credential]) => ({ userId, credential }));
}

/**
 * The credential for one user: their own browser harvest when present, the
 * operator `.env` credential only for an account that signed in with it, or a
 * clear 409 telling the app to connect C@MPUS again.
 */
export function resolveCampusCredential(userId) {
  if (userId) {
    const stored = userCredentials.get(userId);
    if (stored) return stored;
    const source = loadCampusSource(userId);
    if (source?.source === 'env') {
      const env = envCredential();
      if (env) return { ...env, account: source.account };
    }
    throw httpError(409, 'campus_credentials_missing');
  }
  const env = envCredential();
  if (!env) throw httpError(503, 'token_missing');
  return env;
}

export function campusBearerToken() {
  if (runtimeBearerToken) return runtimeBearerToken;
  return envBearerToken();
}

export function campusAuthorizationHeader() {
  const token = campusBearerToken();
  return token ? `Bearer ${token}` : null;
}

export function campusSessionCookie() {
  if (runtimeSessionCookie) return runtimeSessionCookie;
  return envSessionCookie();
}

export function campusStudyTarget() {
  const studyId = Number(process.env.CAMPUS_STUDY_ID || 339485);
  const elementId = Number(process.env.CAMPUS_CURRICULUM_ID || 278343);
  return {
    studyId: Number.isInteger(studyId) ? studyId : 339485,
    elementId: Number.isInteger(elementId) ? elementId : 278343,
  };
}

export function campusRequestHeaders() {
  return credentialHeaders({ bearer: campusBearerToken(), cookie: campusSessionCookie() });
}

function credentialHeaders(credential) {
  const headers = { Accept: 'application/json' };
  const value = normalCredential(credential);
  if (value.bearer) headers.Authorization = `Bearer ${value.bearer}`;
  if (value.cookie) headers.Cookie = `PSESSIONID=${value.cookie}`;
  return headers;
}

export function publicCampusStatus(userId) {
  const { studyId, elementId } = campusStudyTarget();
  const own = userId ? getUserCampusCredential(userId) : null;
  const source = userId ? loadCampusSource(userId) : null;
  return {
    tokenConfigured: Boolean(envBearerToken()),
    tokenRefreshed: Boolean(runtimeBearerToken),
    sessionCookieConfigured: Boolean(envSessionCookie()),
    studyId,
    elementId,
    ...(userId
      ? {
          credentialActive: Boolean(own || source?.source === 'env'),
          credentialSource: own?.source ?? source?.source ?? null,
          credentialAccount: own?.account ?? source?.account ?? null,
        }
      : {}),
  };
}

function httpError(status, code, detail) {
  const error = new Error(code);
  error.status = status;
  if (detail) error.detail = detail;
  return error;
}

/** Portal error text from the observed `coErrorDto` shape, plus common fallbacks. Never includes secrets. */
export function portalMessage(payload) {
  const first = Array.isArray(payload?.resource) ? payload.resource[0]?.content : payload?.content;
  const candidates = [
    first?.coErrorDto?.message,
    first?.coErrorDto?.code,
    payload?.error?.message,
    payload?.message,
    payload?.error_description,
    payload?.error,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim().slice(0, 300);
  }
  return '';
}

function langValue(data) {
  const german = data?.translations?.translation?.find((item) => item.lang === 'de' && item.value)?.value;
  return german || data?.value || '';
}

export function curriculumRequestUrl(studyId, elementId) {
  return `https://campus.uni-stuttgart.de/cusonline/ee/rest/slc.cm.cs/student/myStudies/${studyId}/myCurriculumElements/${elementId}/structure?$ctx=design=ca;lang=de&$filter=active-eq=true;currentlyValid-eq=true;partOfCurriculum-eq=true`;
}

export function studiesRequestUrl() {
  return 'https://campus.uni-stuttgart.de/cusonline/ee/rest/slc.cm.cs/student/myStudies/chooser?$ctx=design=ca;lang=de&$filter=';
}

export function coursesRequestUrl(studyId, elementId) {
  return `https://campus.uni-stuttgart.de/cusonline/ee/rest/slc.cm.cs/student/myStudies/${studyId}/myCurriculumElements/${elementId}/courses?$ctx=design=ca;lang=de&$filter=active-eq=true;currentlyValid-eq=true;partOfCurriculum-eq=true`;
}

export function courseGroupsRequestUrl(courseId) {
  return `https://campus.uni-stuttgart.de/cusonline/ee/rest/slc.tm.cp/student/courseGroups/firstGroups/${courseId}`;
}

export function refreshRequestUrl() {
  return 'https://campus.uni-stuttgart.de/cusonline/ee/rest/auth/token/refresh';
}

export function calendarExportUrl() {
  return 'https://campus.uni-stuttgart.de/cusonline/wbKalender.wbExport';
}

/** `TT.MM.JJJJ` as the export mask requires it. */
export function parseExportDate(value) {
  if (typeof value !== 'string' || !/^\d{2}\.\d{2}\.\d{4}$/.test(value)) throw httpError(400, 'bad_export_date');
  const day = Number(value.slice(0, 2));
  const month = Number(value.slice(3, 5));
  const year = Number(value.slice(6, 10));
  if (day < 1 || day > 31 || month < 1 || month > 12 || year < 2000 || year > 2100) throw httpError(400, 'bad_export_date');
  return value;
}

/** 1 = XML, 2 = CSV, 3 = CSV für Excel, 99 = ICS (iCalendar). */
export function parseExportFormat(value) {
  const format = typeof value === 'number' ? value : Number(value);
  if (![1, 2, 3, 99].includes(format)) throw httpError(400, 'bad_export_format');
  return format;
}

export function parseExportCharset(value) {
  if (value === 'UTF8' || value === 'WE8ISO8859P1') return value;
  throw httpError(400, 'bad_export_charset');
}

export function exportExtension(format) {
  return format === 99 ? 'ics' : format === 1 ? 'xml' : 'csv';
}

/** Filename from `attachment;filename=a.csv;filename*=utf-8''a.csv`, with a fallback. */
export function exportFilename(contentDisposition, format) {
  if (typeof contentDisposition === 'string') {
    const utf8 = contentDisposition.match(/filename\*=utf-8''([^;]+)/i);
    if (utf8?.[1]) return decodeURIComponent(utf8[1].trim().replace(/^"|"$/g, ''));
    const plain = contentDisposition.match(/filename=([^;]+)/i);
    if (plain?.[1]) return plain[1].trim().replace(/^"|"$/g, '');
  }
  return `kalender-export.${exportExtension(format)}`;
}

/** Bearer token from a refresh answer. The observed shape is not pinned; accept the common field names. */
export function extractRefreshedToken(payload) {
  const candidates = [payload, payload?.data];
  for (const obj of candidates) {
    if (!obj || typeof obj !== 'object') continue;
    for (const key of ['access_token', 'accessToken', 'token', 'bearerToken', 'bearer_token']) {
      const value = obj[key];
      if (typeof value === 'string' && value.trim()) return value.trim().replace(/^Bearer\s+/i, '');
    }
  }
  return '';
}

/**
 * Renew one credential through its portal session cookie (empty POST, no
 * Authorization header — the observed browser call sends only cookies).
 * Returns the updated credential; it does not mutate process globals.
 */
export async function refreshCredential(credential, fetchImpl = fetch) {
  const value = normalCredential(credential);
  if (!value.cookie) throw httpError(401, 'missing_session_cookie');
  let response;
  try {
    response = await fetchImpl(refreshRequestUrl(), {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', Cookie: `PSESSIONID=${value.cookie}` },
      signal: AbortSignal.timeout(20_000),
    });
  } catch (caught) {
    const reason = caught instanceof Error ? caught.message : 'network';
    logService('campus', 'warn', `refresh request failed ${reason}`);
    throw httpError(502, 'campus_failed', `refresh request failed: ${String(reason).slice(0, 200)}`);
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = portalMessage(payload);
    throw httpError(401, 'invalid_token', `refresh upstream ${response.status}${message ? `: ${message}` : ''}`);
  }
  const token = extractRefreshedToken(payload);
  if (!token) throw httpError(502, 'refresh_failed', `refresh answered ${response.status} without a token`);
  return { ...value, bearer: token };
}

/**
 * Legacy single-user refresh used by the terminal probe and the tests. The app
 * uses `refreshUserCampusCredential`, which is scoped to one account.
 */
export async function refreshCampusToken(fetchImpl = fetch) {
  const refreshed = await refreshCredential({ bearer: campusBearerToken(), cookie: campusSessionCookie(), source: 'env' }, fetchImpl);
  runtimeBearerToken = refreshed.bearer;
  logService('campus', 'info', 'bearer token refreshed (memory only — persist with npm run campus:token)');
  return true;
}

/** Refresh the credential stored for one user and keep the new bearer in memory. */
export async function refreshUserCampusCredential(userId, fetchImpl = fetch) {
  if (!userId) throw httpError(401, 'unauthorized');
  const credential = resolveCampusCredential(userId);
  const refreshed = await refreshCredential(credential, fetchImpl);
  setUserCampusCredential(userId, refreshed);
  logService('campus', 'info', `user ${userId} bearer token refreshed`, { userId });
  return refreshed;
}

/** Renewal cadence in minutes from the env, clamped to 1–1440, default 10. */
export function proactiveRefreshMinutes() {
  const raw = Number(process.env.CAMPUS_REFRESH_MINUTES);
  if (Number.isInteger(raw) && raw >= 1 && raw <= 1440) return raw;
  return 10;
}

let proactiveTimer = null;
let proactiveInFlight = false;

/**
 * One proactive renewal ahead of any 401. Never throws: the reactive retry
 * in `readCampus` stays the safety net for a dead cookie or a failed call.
 */
export async function proactiveCampusRefresh(fetchImpl = fetch) {
  if (proactiveInFlight) return false;
  if (!campusSessionCookie()) return false;
  proactiveInFlight = true;
  try {
    return await refreshCampusToken(fetchImpl);
  } catch (error) {
    logService('campus', 'warn', `proactive refresh failed ${error instanceof Error ? error.message : error}`);
    return false;
  } finally {
    proactiveInFlight = false;
  }
}

/** Refresh every remembered user credential. A dead cookie is dropped from memory. */
export async function proactiveUserCampusRefresh(fetchImpl = fetch) {
  const entries = listUserCampusCredentials();
  for (const { userId } of entries) {
    try {
      await refreshUserCampusCredential(userId, fetchImpl);
    } catch (error) {
      logService('campus', 'warn', `proactive refresh for ${userId} failed ${error instanceof Error ? error.message : error}`, { userId });
    }
  }
  return entries.length;
}

/**
 * Renew the token on a fixed cadence instead of waiting for a 401, and once
 * right at startup: a restart with a valid cookie renews without `.env`.
 * The timer never keeps the process alive.
 */
export function startCampusTokenRefresh(fetchImpl = fetch) {
  if (proactiveTimer) return;
  const minutes = proactiveRefreshMinutes();
  logService('campus', 'info', `proactive token refresh every ${minutes} min (needs a session cookie)`);
  const tick = () => {
    proactiveCampusRefresh(fetchImpl);
    proactiveUserCampusRefresh(fetchImpl);
  };
  proactiveTimer = setInterval(tick, minutes * 60_000);
  proactiveTimer.unref?.();
  tick();
}

export function stopCampusTokenRefresh() {
  if (!proactiveTimer) return;
  clearInterval(proactiveTimer);
  proactiveTimer = null;
}

/** Positive integer, or null when the caller wants the configured root. Rejects paths and other text. */
export function parseElementId(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'string' && !/^[1-9]\d{0,9}$/.test(value)) throw httpError(400, 'bad_element_id');
  const id = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(id) || id <= 0 || id > 1_000_000_000) throw httpError(400, 'bad_element_id');
  return id;
}

/** Course groups belong to one course: the id is required, same shape as the element id. */
export function parseCourseId(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'string' && !/^[1-9]\d{0,9}$/.test(value)) throw httpError(400, 'bad_course_id');
  const id = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(id) || id <= 0 || id > 1_000_000_000) throw httpError(400, 'bad_course_id');
  return id;
}

/** Study id from the chooser, or null when the caller wants the configured study. */
export function parseStudyId(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'string' && !/^[1-9]\d{0,9}$/.test(value)) throw httpError(400, 'bad_study_id');
  const id = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(id) || id <= 0 || id > 1_000_000_000) throw httpError(400, 'bad_study_id');
  return id;
}

/** Single study is shown directly. Otherwise prefer lastAccessed, then the first row. */
export function pickActiveStudyId(studies, current = null) {
  if (!Array.isArray(studies) || !studies.length) return null;
  if (studies.length === 1) return studies[0].studyId;
  if (current != null && studies.some((item) => item?.studyId === current)) return current;
  return studies.find((item) => item?.lastAccessed)?.studyId ?? studies[0].studyId;
}

/** Root curriculum element id from a `myStudyLink` href, or null when the portal omits it. */
export function elementIdFromLink(href) {
  if (typeof href !== 'string') return null;
  const match = href.match(/\/myCurriculumElements\/(\d{1,10})(?:[/?]|$)/);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function nodesFromCurriculum(payload) {
  const resources = Array.isArray(payload?.resource) ? payload.resource : [];
  return resources.flatMap((item) => {
    const dto = item?.content?.curriculumStructureElementDto;
    if (!dto || typeof dto.id !== 'number' || !Number.isInteger(dto.id)) return [];
    const name = langValue(dto.name);
    if (!name) return [];
    const tags = Array.isArray(dto.tags) ? dto.tags : [];
    return [
      {
        id: dto.id,
        designation: typeof dto.designation === 'string' ? dto.designation : '',
        elementType: typeof dto.elementType === 'string' ? dto.elementType : '',
        name,
        parentId: typeof dto.parentId === 'number' ? dto.parentId : null,
        completed: Boolean(dto.enabledInfo?.completed),
        inProgress: tags.some((tag) => tag?.tagType === 'IN_PROGRESS'),
      },
    ];
  });
}

export function studiesFromChooser(payload) {
  const resources = Array.isArray(payload?.resource) ? payload.resource : [];
  return resources.flatMap((item) => {
    const dto = item?.content?.CmStudyInfoDto ?? item?.content?.cmStudyInfoDto;
    if (!dto || typeof dto.studyId !== 'number' || !Number.isInteger(dto.studyId)) return [];
    const name = langValue(dto.name);
    if (!name) return [];
    return [
      {
        studyId: dto.studyId,
        name,
        intendedDegree: langValue(dto.intendedDegree),
        versionIdentifier: typeof dto.versionIdentifier === 'string' ? dto.versionIdentifier : '',
        studyStatus: typeof dto.studyStatus === 'string' ? dto.studyStatus : '',
        identifier: typeof dto.identifier === 'string' ? dto.identifier : '',
        curriculumVersionId: Number.isInteger(dto.curriculumVersionId) ? dto.curriculumVersionId : null,
        curriculumId: Number.isInteger(dto.curriculumId) ? dto.curriculumId : null,
        color: typeof dto.customizationDto?.color === 'string' ? dto.customizationDto.color : '',
        lastAccessed: Boolean(dto.lastAccessed),
        elementId: elementIdFromLink(dto.myStudyLink?.href),
      },
    ];
  });
}

export function coursesFromPayload(payload) {
  const resources = Array.isArray(payload?.resource) ? payload.resource : [];
  return resources.flatMap((item) => {
    const dto = item?.content?.CmCurriculumElementCourseGroupingsListDto ?? item?.content?.cmCurriculumElementCourseGroupingsListDto;
    const groupings = Array.isArray(dto?.courseGroupings) ? dto.courseGroupings : [];
    return groupings.flatMap((grouping) => {
      const list = Array.isArray(grouping?.courseList) ? grouping.courseList : [];
      return list.flatMap((course) => {
        if (!course || typeof course.id !== 'number' || !Number.isInteger(course.id)) return [];
        const title = langValue(course.courseTitle);
        if (!title) return [];
        return [
          {
            id: course.id,
            courseNumber: typeof course.courseNumber?.courseNumber === 'string' ? course.courseNumber.courseNumber : '',
            title,
            courseType: langValue(course.courseTypeName),
            courseTypeShort: langValue(course.courseTypeShortName),
            semester: langValue(course.semester),
            semesterId: Number.isInteger(course.semesterId) ? course.semesterId : null,
            duration: typeof course.duration === 'number' ? course.duration : null,
            lecturers: lecturerNames(course.lectureships),
            roomName: typeof course.roomName === 'string' ? course.roomName : '',
            startTime: typeof course.startTime === 'string' ? course.startTime : '',
            endTime: typeof course.endTime === 'string' ? course.endTime : '',
            detailUrl: typeof course.detailPageLink?.href === 'string' ? course.detailPageLink.href : '',
            registrationStatus: langValue(course.courseRegistrationData?.textAbove?.textInfo),
            registrationAction: langValue(course.courseRegistrationData?.action?.text),
            registrationUrl: typeof course.courseRegistrationData?.action?.url?.href === 'string' ? course.courseRegistrationData.action.url.href : '',
          },
        ];
      });
    });
  });
}

/** Lecturer names as `Nachname, Vorname`, dropping empty slots — shared by courses and course groups. */
export function lecturerNames(slots) {
  return (Array.isArray(slots) ? slots : []).flatMap((slot) => {
    const first = slot?.identityLibDto?.firstName?.trim() || '';
    const last = slot?.identityLibDto?.lastName?.trim() || '';
    const name = last && first ? `${last}, ${first}` : last || first;
    return name ? [name] : [];
  });
}

/** The portal sends room links as paths like `/app/desktop/#/pl/ui/$ctx/ris.einzelRaum?raumKey=7235`; resolve them. */
export function portalUrl(href) {
  if (typeof href !== 'string' || !href.trim()) return '';
  const value = href.trim();
  if (/^https?:\/\//i.test(value)) return value;
  return `https://campus.uni-stuttgart.de${value.startsWith('/') ? '' : '/'}${value}`;
}

/** One weekly session of a group. Row without an id or a start time is invalid and returns null. */
export function appointmentFromPayload(dto) {
  if (!dto || typeof dto.id !== 'number' || !Number.isInteger(dto.id)) return null;
  const from = typeof dto.timestampFrom?.value === 'string' ? dto.timestampFrom.value : '';
  if (!from) return null;
  const to = typeof dto.timestampTo?.value === 'string' ? dto.timestampTo.value : '';
  return {
    id: dto.id,
    weekday: langValue(dto.weekday?.langDataType),
    weekdayShort: typeof dto.weekday?.key === 'string' ? dto.weekday.key : '',
    date: from.slice(0, 10),
    startTime: from.slice(11, 16),
    endTime: to.slice(11, 16),
    eventType: langValue(dto.appointmentEventTypeDto?.name),
    room: typeof dto.resourceName === 'string' ? dto.resourceName : '',
    roomUrl: portalUrl(dto.resourceUrl),
    status: typeof dto.appointmentStatusType === 'string' ? dto.appointmentStatusType : '',
    seriesId: Number.isInteger(dto.appointmentSeriesId) ? dto.appointmentSeriesId : null,
    lecturers: lecturerNames(dto.appointmentLectureshipDto),
  };
}

/**
 * Groups of one course from `courseGroupDtos` (this endpoint answers at the
 * top level, not wrapped in `resource`). A group without an id is dropped.
 */
export function groupsFromPayload(payload) {
  const dtos = Array.isArray(payload?.courseGroupDtos) ? payload.courseGroupDtos : [];
  return dtos.flatMap((dto) => {
    if (!dto || typeof dto.id !== 'number' || !Number.isInteger(dto.id)) return [];
    return [
      {
        id: dto.id,
        name: typeof dto.name === 'string' ? dto.name : '',
        courseId: Number.isInteger(dto.courseId) ? dto.courseId : null,
        standard: dto.standardgroupFlag === 'J',
        limitedParticipation: dto.limitedParticipationFlag === 'J',
        maxParticipants: typeof dto.maxNumberOfParticipants === 'number' ? dto.maxNumberOfParticipants : null,
        confirmedPlaces: typeof dto.confirmedPlaces === 'number' ? dto.confirmedPlaces : null,
        lecturers: lecturerNames(dto.lectureshipDtos),
        appointments: (Array.isArray(dto.appointmentDtos) ? dto.appointmentDtos : []).map(appointmentFromPayload).filter(Boolean),
      },
    ];
  });
}

export function profileFromCurriculum(payload, studyId, elementId) {
  const nodes = nodesFromCurriculum(payload);
  const root = nodes.find((item) => item.elementType === 'ROOT') || nodes.find((item) => item.id === elementId) || nodes[0];
  if (!root?.name) return null;
  return {
    name: root.name,
    account: root.designation || `Studium ${studyId}`,
    studyId,
    elementId,
    nodes,
  };
}

async function readCampus(credential, userId, url, label, op, fetchImpl, context = {}) {
  const headers = credentialHeaders(credential);
  if (!headers.Authorization && !headers.Cookie) throw httpError(503, 'token_missing');
  const started = Date.now();
  const signal = context.signal ? AbortSignal.any([AbortSignal.timeout(20_000), context.signal]) : AbortSignal.timeout(20_000);
  let response;
  try {
    response = await fetchImpl(url, { headers, signal });
  } catch (caught) {
    const reason = caught instanceof Error ? caught.message : 'network';
    logService('campus', 'warn', `${label} request failed ${reason} ${Date.now() - started}ms`, { userId });
    const detail = `request failed: ${String(reason).slice(0, 200)}`;
    // A user-cancelled call is not a portal failure; keep it out of the history.
    if (!context.signal?.aborted) {
      logPortalCall({ userId, op, studyId: context.studyId, elementId: context.elementId, ok: false, detail, elapsedMs: Date.now() - started });
    }
    throw httpError(502, 'campus_failed', detail);
  }
  const payload = await response.json().catch(() => ({}));
  const elapsed = Date.now() - started;
  if (!response.ok) {
    const message = portalMessage(payload);
    const detail = `upstream ${response.status}${message ? `: ${message}` : ''}`;
    logService('campus', 'warn', `${label} user=${userId ?? '-'} status=${response.status} message=${message || '-'} ${elapsed}ms`, { userId });
    logPortalCall({ userId, op, studyId: context.studyId, elementId: context.elementId, ok: false, httpStatus: response.status, message: detail, elapsedMs: elapsed });
    // Expired bearer, valid session: renew once through the refresh endpoint and retry the same call.
    const authFailed = message.includes('invalid_token') || response.status === 401;
    if (authFailed && !context.refreshed && normalCredential(credential).cookie) {
      logService('campus', 'info', `${label} token rejected, trying refresh`, { userId });
      try {
        const refreshed = await refreshCredential(credential, fetchImpl);
        // Keep the caller's credential current too: a pre-login ticket hands
        // this object to the login route after the read.
        credential.bearer = refreshed.bearer;
        if (userId) setUserCampusCredential(userId, refreshed);
        logService('campus', 'info', `${label} retrying after refresh`, { userId });
        return readCampus(credential, userId, url, label, op, fetchImpl, { ...context, refreshed: true });
      } catch (refreshError) {
        logService('campus', 'warn', `${label} refresh failed ${refreshError instanceof Error ? refreshError.message : refreshError}`, { userId });
      }
    }
    if (message.includes('missing_session_cookie')) throw httpError(401, 'missing_session_cookie', detail);
    if (message.includes('invalid_token')) throw httpError(401, 'invalid_token', detail);
    if (response.status === 401) throw httpError(401, 'campus_unauthorized', detail);
    throw httpError(502, 'campus_failed', detail);
  }
  logService('campus', 'info', `${label} user=${userId ?? '-'} status=${response.status} ${elapsed}ms`, { userId });
  logPortalCall({ userId, op, studyId: context.studyId, elementId: context.elementId, ok: true, httpStatus: response.status, elapsedMs: elapsed });
  return payload;
}

function readCurriculum(credential, userId, studyId, elementId, fetchImpl, signal) {
  return readCampus(credential, userId, curriculumRequestUrl(studyId, elementId), `structure study=${studyId} element=${elementId}`, 'structure', fetchImpl, { studyId, elementId, signal });
}

/** One-time handoff from the harvest validation to the sign-in route. */
function prunePendingCredentials() {
  const cutoff = Date.now() - PENDING_TTL_MS;
  for (const [ticket, value] of pendingCredentials) {
    if (value.created < cutoff) pendingCredentials.delete(ticket);
  }
}

export function issueCredentialTicket(credential) {
  prunePendingCredentials();
  const ticket = randomBytes(24).toString('base64url');
  pendingCredentials.set(ticket, { credential: normalCredential(credential), created: Date.now() });
  return ticket;
}

export function takeCredentialTicket(ticket) {
  prunePendingCredentials();
  if (typeof ticket !== 'string' || !ticket) throw httpError(400, 'ticket_missing');
  const value = pendingCredentials.get(ticket);
  pendingCredentials.delete(ticket);
  if (!value) throw httpError(400, 'ticket_invalid');
  return value.credential;
}

/** Resolve the credential a login should use: a validated harvest ticket, the signed-in user's, or `.env`. */
export function resolveLoginCredential({ ticket, userId } = {}) {
  if (ticket) return takeCredentialTicket(ticket);
  if (userId) return resolveCampusCredential(userId);
  const env = envCredential();
  if (!env) throw httpError(503, 'token_missing');
  return env;
}

/** Merge freshly read nodes into the user's server store. Best-effort; never breaks the call. */
function storeStructure(userId, studyId, elementId, nodes) {
  try {
    const known = loadStructure(userId, studyId);
    const map = new Map(known.nodes.map((node) => [node.id, node]));
    for (const node of nodes) map.set(node.id, node);
    const expanded = [...new Set([...known.expandedIds, elementId])];
    saveStructure(userId, studyId, known.sync?.rootElementId ?? null, [...map.values()], expanded, known.sync?.complete ?? false);
  } catch {
    // The store is best-effort; the portal answer still goes out.
  }
}

/** Cached answer when the portal cannot be reached. Null when nothing usable is stored. */
function storedStructure(userId, studyId, elementId) {
  try {
    if (!isExpanded(userId, studyId, elementId)) return null;
    const known = loadStructure(userId, studyId);
    if (!known.nodes.length) return null;
    logService('campus', 'info', `structure study=${studyId} element=${elementId} served from server store for ${userId ?? '-'}`, { userId });
    return { studyId, elementId, nodes: known.nodes, cached: true };
  } catch {
    return null;
  }
}

/** Merge freshly read courses into the user's server store. Best-effort; never breaks the call. */
function storeCourses(userId, studyId, elementId, elementName, courses) {
  try {
    const known = loadCourses(userId, studyId);
    const map = new Map(known.map((course) => [course.id, course]));
    for (const course of courses) {
      const existing = map.get(course.id);
      if (!existing) {
        map.set(course.id, { ...course, elementIds: [elementId], elementNames: [elementName] });
      } else if (!existing.elementIds.includes(elementId)) {
        existing.elementIds.push(elementId);
        if (!existing.elementNames.includes(elementName)) existing.elementNames.push(elementName);
      }
    }
    const fetched = [...new Set([...loadCoursesFetchedIds(userId, studyId), elementId])];
    const sync = getCoursesSync(userId, studyId);
    saveCourses(userId, studyId, [...map.values()], fetched, sync?.complete ?? false);
  } catch {
    // The store is best-effort; the portal answer still goes out.
  }
}

/** Cached courses when the portal cannot be reached. Null when nothing usable is stored. */
function storedCourses(userId, studyId, elementId) {
  try {
    const fetched = loadCoursesFetchedIds(userId, studyId);
    if (!fetched.includes(elementId)) return null;
    const courses = loadCourses(userId, studyId, elementId);
    logService('campus', 'info', `courses study=${studyId} element=${elementId} served from server store for ${userId ?? '-'}`, { userId });
    return { studyId, elementId, courses, cached: true };
  } catch {
    return null;
  }
}

/**
 * Read the curriculum and studies for one credential. With a `userId` the
 * answer is stored under that account and an offline read can fall back to the
 * previous one; without a user id it is a pre-login read and stores nothing.
 */
export async function readCampusLogin(credential, fetchImpl = fetch, userId = null, store = Boolean(userId)) {
  const { studyId, elementId } = campusStudyTarget();
  let payload;
  try {
    payload = await readCurriculum(credential, userId, studyId, elementId, fetchImpl);
  } catch (error) {
    if (!userId) throw error;
    const cached = storedStructure(userId, studyId, elementId);
    if (!cached) throw error;
    const root = cached.nodes.find((item) => item.elementType === 'ROOT') || cached.nodes.find((item) => item.id === elementId) || cached.nodes[0];
    if (!root?.name) throw error;
    const offline = {
      name: root.name,
      account: root.designation || `Studium ${studyId}`,
      studyId,
      elementId,
      nodes: cached.nodes,
      cached: true,
    };
    try {
      const { studies } = await loadCampusStudiesForCredential(credential, userId, fetchImpl);
      return { ...offline, studies, activeStudyId: pickActiveStudyId(studies, null), cached: true, credential };
    } catch {
      return { ...offline, studies: [], activeStudyId: null, cached: true, credential };
    }
  }
  const profile = profileFromCurriculum(payload, studyId, elementId);
  if (!profile) throw httpError(502, 'campus_unexpected');
  if (store) storeStructure(userId, studyId, elementId, profile.nodes);
  try {
    const { studies } = await loadCampusStudiesForCredential(credential, userId, fetchImpl);
    return { ...profile, studies, activeStudyId: pickActiveStudyId(studies, null), credential };
  } catch {
    return { ...profile, studies: [], activeStudyId: null, credential };
  }
}

/** Persist a login result under the account that owns the credential. */
export function storeCampusLogin(userId, profile) {
  if (!userId || !profile) return;
  storeStructure(userId, profile.studyId, profile.elementId, profile.nodes ?? []);
  if (Array.isArray(profile.studies) && profile.studies.length) {
    try {
      saveStudiesSnapshot(userId, profile.studies);
    } catch {
      // The store is best-effort; the portal answer still goes out.
    }
  }
}

/** Legacy entry point: reads with `.env` (or the given user's credential) and stores for that user. */
export async function loginWithCampusToken(fetchImpl = fetch, options = {}) {
  const userId = options.userId ?? null;
  const credential = options.credential ?? resolveCampusCredential(userId);
  const result = await readCampusLogin(credential, fetchImpl, userId, Boolean(userId));
  if (userId) {
    setUserCampusCredential(userId, result.credential);
    saveCampusSource(userId, result.credential.source, result.credential.account ?? result.account);
  }
  return result;
}

export async function loadCurriculumStructure(elementIdOverride, studyIdOverride, fetchImpl = fetch, signal, userId = null) {
  if (typeof studyIdOverride === 'function') {
    fetchImpl = studyIdOverride;
    studyIdOverride = undefined;
  }
  const credential = resolveCampusCredential(userId);
  const target = campusStudyTarget();
  const studyId = parseStudyId(studyIdOverride) ?? target.studyId;
  let elementId = parseElementId(elementIdOverride);
  if (elementId == null && studyId !== target.studyId) {
    // Resolve the root element for another enrolled study via the chooser.
    const { studies } = await loadCampusStudiesForCredential(credential, userId, fetchImpl);
    const match = studies.find((item) => item.studyId === studyId);
    if (!match?.elementId) throw httpError(400, 'bad_study_id');
    elementId = match.elementId;
  }
  elementId ??= target.elementId;
  try {
    const payload = await readCurriculum(credential, userId, studyId, elementId, fetchImpl, signal);
    const nodes = nodesFromCurriculum(payload);
    if (!nodes.length) throw httpError(502, 'campus_unexpected', `empty structure study=${studyId} element=${elementId}`);
    storeStructure(userId, studyId, elementId, nodes);
    return { studyId, elementId, nodes };
  } catch (error) {
    const cached = storedStructure(userId, studyId, elementId);
    if (!cached) throw error;
    return cached;
  }
}

export async function loadCampusStudiesForCredential(credential, userId, fetchImpl = fetch) {
  try {
    const payload = await readCampus(credential, userId, studiesRequestUrl(), 'studies', 'studies', fetchImpl);
    const studies = studiesFromChooser(payload);
    if (!studies.length) throw httpError(502, 'campus_unexpected');
    if (userId) {
      try {
        saveStudiesSnapshot(userId, studies);
      } catch {
        // The store is best-effort; the portal answer still goes out.
      }
    }
    return { studies, activeStudyId: pickActiveStudyId(studies, null) };
  } catch (error) {
    if (!userId) throw error;
    let snapshot = null;
    try {
      snapshot = loadStudiesSnapshot(userId);
    } catch {
      snapshot = null;
    }
    if (!snapshot) throw error;
    logService('campus', 'info', `studies served from server store for ${userId}`, { userId });
    return { studies: snapshot.studies, activeStudyId: pickActiveStudyId(snapshot.studies, null), cached: true };
  }
}

export async function loadCampusStudies(fetchImpl = fetch, userId = null) {
  return loadCampusStudiesForCredential(resolveCampusCredential(userId), userId, fetchImpl);
}

export async function loadCurriculumCourses(studyIdOverride, elementIdOverride, fetchImpl = fetch, signal, userId = null) {
  if (typeof elementIdOverride === 'function') {
    fetchImpl = elementIdOverride;
    elementIdOverride = undefined;
  }
  if (typeof studyIdOverride === 'function') {
    fetchImpl = studyIdOverride;
    studyIdOverride = undefined;
  }
  const credential = resolveCampusCredential(userId);
  const target = campusStudyTarget();
  const studyId = parseStudyId(studyIdOverride) ?? target.studyId;
  // Courses always belong to one curriculum element: there is no useful default.
  const elementId = parseElementId(elementIdOverride);
  if (elementId == null) throw httpError(400, 'bad_element_id');
  try {
    const payload = await readCampus(credential, userId, coursesRequestUrl(studyId, elementId), `courses study=${studyId} element=${elementId}`, 'courses', fetchImpl, { studyId, elementId, signal });
    const courses = coursesFromPayload(payload);
    // An element without courses is a valid answer, not an error.
    // The element name for the link table comes from the stored tree when known.
    let elementName = String(elementId);
    try {
      const known = loadStructure(userId, studyId).nodes.find((node) => node.id === elementId);
      if (known?.name) elementName = known.name;
    } catch {
      // Name lookup is best-effort.
    }
    storeCourses(userId, studyId, elementId, elementName, courses);
    return { studyId, elementId, courses };
  } catch (error) {
    const cached = storedCourses(userId, studyId, elementId);
    if (!cached) throw error;
    return cached;
  }
}

/**
 * Groups with their appointments for one course (`slc.tm.cp` course-pages
 * service, observed 18 October 2026). Live read: the answer stays out of
 * the store, the call itself lands in the portal history.
 */
export async function loadCourseGroups(courseIdOverride, fetchImpl = fetch, signal, userId = null) {
  if (typeof courseIdOverride === 'function') {
    fetchImpl = courseIdOverride;
    courseIdOverride = undefined;
  }
  const credential = resolveCampusCredential(userId);
  // Groups belong to one course: there is no useful default, like courses to one node.
  const courseId = parseCourseId(courseIdOverride);
  if (courseId == null) throw httpError(400, 'bad_course_id');
  const payload = await readCampus(credential, userId, courseGroupsRequestUrl(courseId), `course groups course=${courseId}`, 'course-groups', fetchImpl, { signal });
  // A course without groups is a valid answer, not an error.
  return { courseId, groups: groupsFromPayload(payload) };
}

/**
 * Download the personal calendar through the portal export mask
 * (`wbKalender.wbExport`, observed 16 October 2026): form POST with the
 * session cookie, binary attachment back (CSV/ICS/XML). No bearer token —
 * the browser sends only cookies here.
 */
export async function exportCampusCalendar({ dateFrom, dateTo, format = 99, charset = 'UTF8' } = {}, fetchImpl = fetch, userId = null) {
  const from = parseExportDate(dateFrom);
  const to = parseExportDate(dateTo);
  const outputFormat = parseExportFormat(format);
  const outputCharset = parseExportCharset(charset);
  const credential = resolveCampusCredential(userId);
  const cookie = normalCredential(credential).cookie;
  if (!cookie) throw httpError(503, 'token_missing');
  const form = new URLSearchParams({
    pMode: 'I',
    pOrgNr: '',
    pResNr: '',
    pInclPruef: 'N',
    pInclPruefGepl: 'N',
    pExportBetreff: '',
    pExportAnsprechpartner: '',
    pExportOrt: '',
    pExportTerminTyp: '',
    pExportPublikumIntern: '',
    pDateFrom: from,
    pDateTo: to,
    pOutputFormat: String(outputFormat),
    pCharset: outputCharset,
    pMaskAction: 'DOWNLOAD',
  });
  let response;
  try {
    response = await fetchImpl(calendarExportUrl(), {
      method: 'POST',
      headers: { Accept: '*/*', 'Content-Type': 'application/x-www-form-urlencoded', Cookie: `PSESSIONID=${cookie}` },
      body: form.toString(),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (caught) {
    const reason = caught instanceof Error ? caught.message : 'network';
    logService('campus', 'warn', `calendar export request failed ${reason}`);
    throw httpError(502, 'campus_failed', `export request failed: ${String(reason).slice(0, 200)}`);
  }
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    const detail = `export upstream ${response.status}${text ? `: ${text.slice(0, 200)}` : ''}`;
    logService('campus', 'warn', `calendar export failed ${detail}`);
    if (response.status === 401) throw httpError(401, 'campus_unauthorized', detail);
    throw httpError(502, 'campus_failed', detail);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers?.get?.('content-type') ?? 'application/octet-stream';
  const filename = exportFilename(response.headers?.get?.('content-disposition'), outputFormat);
  logService('campus', 'info', `calendar export ok ${filename} ${buffer.length} bytes`);
  return { filename, contentType, bytes: buffer.length, base64: buffer.toString('base64') };
}

/** Unfold ICS lines: continuations start with a space or tab. */
function unfoldIcs(text) {
  return text.replace(/\r\n/g, '\n').split('\n').reduce((lines, line) => {
    if ((line.startsWith(' ') || line.startsWith('\t')) && lines.length > 0) {
      lines[lines.length - 1] += line.slice(1);
    } else {
      lines.push(line);
    }
    return lines;
  }, []);
}

function unescapeIcs(value) {
  return value.replace(/\\n/gi, '\n').replace(/\\;/g, ';').replace(/\\,/g, ',').replace(/\\\\/g, '\\');
}

/**
 * VEVENTs of an ICS export. The dedupe key is the UID plus the recurrence id
 * when the same UID repeats for recurring instances.
 */
export function parseIcsEvents(ics) {
  const events = [];
  let current = null;
  for (const line of unfoldIcs(ics)) {
    if (line === 'BEGIN:VEVENT') {
      current = {};
      continue;
    }
    if (line === 'END:VEVENT') {
      if (current && current.uid && current.dtstart) events.push(current);
      current = null;
      continue;
    }
    if (!current) continue;
    const splitAt = line.indexOf(':');
    if (splitAt < 1) continue;
    const name = line.slice(0, splitAt).split(';')[0];
    const value = unescapeIcs(line.slice(splitAt + 1));
    if (name === 'UID') current.uid = value;
    else if (name === 'RECURRENCE-ID') current.recurrenceId = value;
    else if (name === 'DTSTART') current.dtstart = value;
    else if (name === 'DTEND') current.dtend = value;
    else if (name === 'SUMMARY') current.summary = value;
    else if (name === 'LOCATION') current.location = value;
    else if (name === 'DESCRIPTION') current.description = value;
  }
  return events.map((event) => ({
    uid: event.recurrenceId ? `${event.uid}#${event.recurrenceId}` : event.uid,
    summary: event.summary ?? '',
    location: event.location ?? '',
    description: event.description ?? '',
    dtstart: event.dtstart ?? '',
    dtend: event.dtend ?? '',
  }));
}


/**
 * Download the personal calendar as ICS and upsert its events into the
 * server store. Re-running imports only new UIDs; repeats are skipped.
 */
export async function syncExportedCalendar({ dateFrom, dateTo } = {}, fetchImpl = fetch, userId = null) {
  const downloaded = await exportCampusCalendar({ dateFrom, dateTo, format: 99, charset: 'UTF8' }, fetchImpl, userId);
  const text = Buffer.from(downloaded.base64, 'base64').toString('utf-8');
  const events = parseIcsEvents(text);
  const { imported, skipped } = saveExportedEvents(userId, events);
  logService('campus', 'info', `calendar sync ok ${downloaded.filename}: ${imported} new, ${skipped} duplicates`, { userId });
  // The sync is also the onboarding's first read: return the parsed events so
  // the overview does not depend on a second round-trip or the store read.
  return { filename: downloaded.filename, imported, skipped, total: events.length, events };
}

/** PSESSIONID value from a `document.cookie` string. Empty when absent (e.g. HttpOnly). */
export function sessionCookieFromString(cookies) {
  if (typeof cookies !== 'string') return '';
  const match = cookies.match(/(?:^|;\s*)PSESSIONID=([^;]+)/i);
  const value = (match?.[1] ?? '').trim();
  return value.replace(/^(PSESSIONID|JSESSIONID)=/i, '');
}

function looksLikeJwt(value) {
  return typeof value === 'string' && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value.trim());
}

function looksLikeOpaqueToken(value) {
  return typeof value === 'string' && value.trim().length >= 64 && /^[A-Za-z0-9_\-.~+/=]+$/.test(value.trim());
}

/**
 * Bearer candidates from harvested web storage: `{ 'local:key': value }`.
 * The known login key `cusonline_co.login.accessToken` comes first and is
 * accepted as-is (observed at 44 chars, below heuristic thresholds);
 * everything else needs JWT shape or a long opaque value.
 */
export function bearerCandidatesFromStorage(storage) {
  if (!storage || typeof storage !== 'object') return [];
  const entries = Object.entries(storage).filter(([, value]) => typeof value === 'string' && value);
  const scored = entries.map(([key, value]) => {
    const text = String(value).slice(0, 4000).trim();
    const known = /(?:^|[/:.])cusonline_co\.login\.accessToken$/.test(key);
    const tokenish = /token|jwt|bearer|access|auth/i.test(key) ? 0 : 1;
    const usable = known ? text.length >= 8 : looksLikeJwt(text) || looksLikeOpaqueToken(text);
    return { key, text, usable, rank: (known ? -10 : 0) + tokenish };
  });
  const viable = scored.filter((item) => item.usable);
  viable.sort((a, b) => a.rank - b.rank || b.text.length - a.text.length);
  return viable.map((item) => item.text);
}

export function extractBrowserCredentials(harvest) {
  const cookies = typeof harvest?.cookies === 'string' ? harvest.cookies : '';
  const session = sessionCookieFromString(cookies);
  const bearers = bearerCandidatesFromStorage(harvest?.storage);
  return { session, bearers };
}

/**
 * Validate a harvested browser login and keep the working pair behind a
 * short-lived ticket. Nothing is written to a user until `/v1/campus/login`
 * takes the ticket and creates the session.
 */
export async function validateBrowserCredentials(harvest, fetchImpl = fetch) {
  const { session, bearers } = extractBrowserCredentials(harvest);
  if (!session && bearers.length === 0) throw httpError(400, 'no_credentials_found');
  const attempts = [];
  if (session) {
    for (const bearer of bearers) attempts.push({ session, bearer });
    attempts.push({ session, bearer: null });
  }
  for (const bearer of bearers) attempts.push({ session: null, bearer });
  let lastError = null;
  for (const attempt of attempts) {
    let credential = normalCredential({ bearer: attempt.bearer, cookie: attempt.session, source: 'browser' });
    try {
      // A harvest may hold the portal session without a bearer: the SPA writes
      // the token a moment later, or never. The session alone can mint one
      // through the refresh endpoint, exactly like the signed-in browser.
      if (!credential.bearer && credential.cookie) {
        try {
          credential = await refreshCredential(credential, fetchImpl);
        } catch (refreshError) {
          logService('campus', 'warn', `credentials refresh from session failed ${refreshError instanceof Error ? refreshError.message : refreshError}`);
        }
      }
      const { studies } = await loadCampusStudiesForCredential(credential, null, fetchImpl);
      logService('campus', 'info', `browser credentials ok studies=${studies.length} session=${Boolean(attempt.session)}`);
      return {
        ok: true,
        studies: studies.length,
        activeStudyId: pickActiveStudyId(studies, null),
        credential,
        ticket: issueCredentialTicket(credential),
      };
    } catch (error) {
      lastError = error;
      logService('campus', 'warn', `credentials attempt session=${Boolean(attempt.session)} bearer=${Boolean(attempt.bearer)} failed ${error.message}${error.detail ? ` ${error.detail}` : ''}`);
    }
  }
  throw lastError ?? httpError(401, 'campus_unauthorized');
}

/** Legacy single-user wrapper used by the terminal probe and tests: it also fills the process globals. */
export async function loginWithBrowserCredentials(harvest, fetchImpl = fetch) {
  const result = await validateBrowserCredentials(harvest, fetchImpl);
  runtimeBearerToken = result.credential.bearer;
  runtimeSessionCookie = result.credential.cookie;
  return { ok: true, studies: result.studies, activeStudyId: result.activeStudyId, ticket: result.ticket };
}
