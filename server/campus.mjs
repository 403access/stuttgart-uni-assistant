/** Server-only C@MPUS access token. Never sent to the Expo bundle. */

export function campusBearerToken() {
  const raw = (process.env.CAMPUS_BEARER_TOKEN || '').trim();
  if (!raw) return '';
  return raw.replace(/^Bearer\s+/i, '');
}

export function campusAuthorizationHeader() {
  const token = campusBearerToken();
  return token ? `Bearer ${token}` : null;
}

export function campusSessionCookie() {
  const raw = (process.env.CAMPUS_SESSION_COOKIE || '').trim();
  if (!raw) return '';
  return raw.replace(/^(PSESSIONID|JSESSIONID)=/i, '');
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
  const headers = { Accept: 'application/json' };
  const authorization = campusAuthorizationHeader();
  if (authorization) headers.Authorization = authorization;
  const cookie = campusSessionCookie();
  if (cookie) headers.Cookie = `PSESSIONID=${cookie}`;
  return headers;
}

export function publicCampusStatus() {
  const { studyId, elementId } = campusStudyTarget();
  return {
    tokenConfigured: Boolean(campusBearerToken()),
    sessionCookieConfigured: Boolean(campusSessionCookie()),
    studyId,
    elementId,
  };
}

function httpError(status, code) {
  const error = new Error(code);
  error.status = status;
  return error;
}

function langValue(data) {
  const german = data?.translations?.translation?.find((item) => item.lang === 'de' && item.value)?.value;
  return german || data?.value || '';
}

export function profileFromCurriculum(payload, studyId, elementId) {
  const resources = Array.isArray(payload?.resource) ? payload.resource : [];
  const nodes = resources
    .map((item) => item?.content?.curriculumStructureElementDto)
    .filter((item) => item && typeof item.id === 'number')
    .map((item) => ({
      id: item.id,
      designation: typeof item.designation === 'string' ? item.designation : '',
      elementType: typeof item.elementType === 'string' ? item.elementType : '',
      name: langValue(item.name),
    }));
  const root = nodes.find((item) => item.elementType === 'ROOT') || nodes.find((item) => item.id === elementId) || nodes[0];
  if (!root?.name) return null;
  return {
    name: root.name,
    account: root.designation || `Studium ${studyId}`,
    studyId,
    elementId,
  };
}

export async function loginWithCampusToken(fetchImpl = fetch) {
  if (!campusBearerToken()) throw httpError(503, 'token_missing');
  const { studyId, elementId } = campusStudyTarget();
  const url = `https://campus.uni-stuttgart.de/cusonline/ee/rest/slc.cm.cs/student/myStudies/${studyId}/myCurriculumElements/${elementId}/structure?$ctx=design=ca;lang=de&$filter=active-eq=true;currentlyValid-eq=true;partOfCurriculum-eq=true`;
  let response;
  try {
    response = await fetchImpl(url, { headers: campusRequestHeaders(), signal: AbortSignal.timeout(20_000) });
  } catch (caught) {
    const reason = caught instanceof Error ? caught.message : 'network';
    console.log(`[campus] structure request failed ${reason}`);
    throw httpError(502, 'campus_failed');
  }
  const payload = await response.json().catch(() => ({}));
  console.log(
    `[campus] structure study=${studyId} element=${elementId} token=${Boolean(campusBearerToken())} cookie=${Boolean(campusSessionCookie())} status=${response.status}`,
  );
  if (!response.ok) {
    const message = payload?.resource?.[0]?.content?.coErrorDto?.message || '';
    if (message.includes('missing_session_cookie')) throw httpError(401, 'missing_session_cookie');
    if (response.status === 401) throw httpError(401, 'campus_unauthorized');
    throw httpError(502, 'campus_failed');
  }
  const profile = profileFromCurriculum(payload, studyId, elementId);
  if (!profile) throw httpError(502, 'campus_unexpected');
  return profile;
}
