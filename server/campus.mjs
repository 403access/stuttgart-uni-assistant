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

export function curriculumRequestUrl(studyId, elementId) {
  return `https://campus.uni-stuttgart.de/cusonline/ee/rest/slc.cm.cs/student/myStudies/${studyId}/myCurriculumElements/${elementId}/structure?$ctx=design=ca;lang=de&$filter=active-eq=true;currentlyValid-eq=true;partOfCurriculum-eq=true`;
}

export function studiesRequestUrl() {
  return 'https://campus.uni-stuttgart.de/cusonline/ee/rest/slc.cm.cs/student/myStudies/chooser?$ctx=design=ca;lang=de&$filter=';
}

/** Positive integer, or null when the caller wants the configured root. Rejects paths and other text. */
export function parseElementId(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'string' && !/^[1-9]\d{0,9}$/.test(value)) throw httpError(400, 'bad_element_id');
  const id = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(id) || id <= 0 || id > 1_000_000_000) throw httpError(400, 'bad_element_id');
  return id;
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

async function readCampus(url, label, fetchImpl) {
  if (!campusBearerToken()) throw httpError(503, 'token_missing');
  let response;
  try {
    response = await fetchImpl(url, { headers: campusRequestHeaders(), signal: AbortSignal.timeout(20_000) });
  } catch (caught) {
    const reason = caught instanceof Error ? caught.message : 'network';
    console.log(`[campus] ${label} request failed ${reason}`);
    throw httpError(502, 'campus_failed');
  }
  const payload = await response.json().catch(() => ({}));
  console.log(`[campus] ${label} token=${Boolean(campusBearerToken())} cookie=${Boolean(campusSessionCookie())} status=${response.status}`);
  if (!response.ok) {
    const message = payload?.resource?.[0]?.content?.coErrorDto?.message || '';
    if (message.includes('missing_session_cookie')) throw httpError(401, 'missing_session_cookie');
    if (message.includes('invalid_token')) throw httpError(401, 'invalid_token');
    if (response.status === 401) throw httpError(401, 'campus_unauthorized');
    throw httpError(502, 'campus_failed');
  }
  return payload;
}

function readCurriculum(studyId, elementId, fetchImpl) {
  return readCampus(curriculumRequestUrl(studyId, elementId), `structure study=${studyId} element=${elementId}`, fetchImpl);
}

export async function loginWithCampusToken(fetchImpl = fetch) {
  const { studyId, elementId } = campusStudyTarget();
  const payload = await readCurriculum(studyId, elementId, fetchImpl);
  const profile = profileFromCurriculum(payload, studyId, elementId);
  if (!profile) throw httpError(502, 'campus_unexpected');
  return profile;
}

export async function loadCurriculumStructure(elementIdOverride, fetchImpl = fetch) {
  const target = campusStudyTarget();
  const elementId = parseElementId(elementIdOverride) ?? target.elementId;
  const payload = await readCurriculum(target.studyId, elementId, fetchImpl);
  const nodes = nodesFromCurriculum(payload);
  if (!nodes.length) throw httpError(502, 'campus_unexpected');
  return { studyId: target.studyId, elementId, nodes };
}

export async function loadCampusStudies(fetchImpl = fetch) {
  const payload = await readCampus(studiesRequestUrl(), 'studies', fetchImpl);
  const studies = studiesFromChooser(payload);
  if (!studies.length) throw httpError(502, 'campus_unexpected');
  return { studies };
}
