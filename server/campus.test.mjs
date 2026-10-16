import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';

process.env.CAMPUS_DB_PATH = ':memory:';

import { apiCatalog } from './catalog.mjs';
import { resetDbForTests } from './db.mjs';
import { campusAuthorizationHeader, campusRequestHeaders, clearRuntimeToken, coursesFromPayload, coursesRequestUrl, elementIdFromLink, extractRefreshedToken, loadCurriculumCourses, loadCurriculumStructure, parseElementId, parseStudyId, portalMessage, profileFromCurriculum, publicCampusStatus, refreshCampusToken, refreshRequestUrl, studiesFromChooser } from './campus.mjs';

beforeEach(() => {
  resetDbForTests();
});

afterEach(() => {
  delete process.env.CAMPUS_BEARER_TOKEN;
  delete process.env.CAMPUS_SESSION_COOKIE;
  clearRuntimeToken();
});

test('missing campus token is reported without a header', () => {
  assert.equal(campusAuthorizationHeader(), null);
  assert.equal(publicCampusStatus().tokenConfigured, false);
  assert.equal(publicCampusStatus().sessionCookieConfigured, false);
});

test('campus token stays out of the public status', () => {
  process.env.CAMPUS_BEARER_TOKEN = 'Bearer test-token';
  process.env.CAMPUS_SESSION_COOKIE = 'session-value';
  const headers = campusRequestHeaders();
  assert.equal(headers.Authorization, 'Bearer test-token');
  assert.equal(headers.Cookie, 'PSESSIONID=session-value');
  const status = JSON.stringify(publicCampusStatus());
  assert.equal(status.includes('test-token'), false);
  assert.equal(status.includes('session-value'), false);
  assert.equal(publicCampusStatus().tokenConfigured, true);
  assert.equal(publicCampusStatus().sessionCookieConfigured, true);
});

test('curriculum profile uses the German root name', () => {
  const profile = profileFromCurriculum(
    {
      resource: [
        {
          content: {
            curriculumStructureElementDto: {
              id: 10,
              designation: '84-127-14',
              elementType: 'ROOT',
              name: { value: 'Philosophie', translations: { translation: [{ lang: 'de', value: 'Philosophie' }] } },
            },
          },
        },
      ],
    },
    339485,
    10,
  );
  assert.equal(profile.name, 'Philosophie');
  assert.equal(profile.account, '84-127-14');
  assert.equal(profile.nodes[0].name, 'Philosophie');
  assert.equal(profile.nodes[0].parentId, null);
});

test('curriculum nodes keep parent, completion, and the in-progress tag', () => {
  const profile = profileFromCurriculum(
    {
      resource: [
        {
          content: {
            curriculumStructureElementDto: {
              id: 10,
              designation: '84-127-14',
              elementType: 'ROOT',
              name: { value: 'Philosophie' },
            },
          },
        },
        {
          content: {
            curriculumStructureElementDto: {
              id: 20,
              designation: '100',
              elementType: 'DEFAULT',
              parentId: 10,
              enabledInfo: { completed: false },
              tags: [{ tagType: 'IN_PROGRESS' }],
              name: { translations: { translation: [{ lang: 'de', value: 'Basismodule' }] } },
            },
          },
        },
      ],
    },
    339485,
    10,
  );
  assert.equal(profile.nodes.length, 2);
  assert.equal(profile.nodes[1].name, 'Basismodule');
  assert.equal(profile.nodes[1].parentId, 10);
  assert.equal(profile.nodes[1].completed, false);
  assert.equal(profile.nodes[1].inProgress, true);
});

test('element ids stay positive integers', () => {
  assert.equal(parseElementId(''), null);
  assert.equal(parseElementId(278343), 278343);
  assert.equal(parseElementId('287772'), 287772);
  for (const value of ['1/../x', 0, -1, 1.5, 'PSESSIONID=abc', 'https://campus.uni-stuttgart.de/']) {
    assert.throws(() => parseElementId(value), (error) => error.message === 'bad_element_id');
  }
});

test('the study chooser maps the German name and the root element link', () => {
  const studies = studiesFromChooser({ resource: [
    {
      content: {
        type: 'model-slc.cm.cs.student.cmStudyInfoDto',
        CmStudyInfoDto: {
          studyId: 339484,
          curriculumVersionId: 1151,
          curriculumId: 43,
          name: { value: 'Linguistik', translations: { translation: [{ lang: 'de', value: 'Linguistik' }, { lang: 'en', value: 'Linguistics' }] } },
          intendedDegree: { value: 'Bachelor of Arts' },
          versionIdentifier: '84-152-23',
          studyStatus: 'STUDYING_ALLOWED',
          identifier: '1590 84 152 1',
          customizationDto: { color: '#e6e76d', icon: '' },
          myStudyLink: { rel: 'related', href: 'https://campus.uni-stuttgart.de/cusonline/ee/rest/slc.cm.cs/student/myStudies/339484/myCurriculumElements/2496981', name: 'curriculumElement' },
          lastAccessed: true,
        },
      },
    },
  ] });
  assert.equal(studies.length, 1);
  assert.equal(studies[0].studyId, 339484);
  assert.equal(studies[0].name, 'Linguistik');
  assert.equal(studies[0].intendedDegree, 'Bachelor of Arts');
  assert.equal(studies[0].elementId, 2496981);
  assert.equal(studies[0].lastAccessed, true);
  assert.equal(studies[0].color, '#e6e76d');
});

test('chooser rows without a studyId or a name are dropped', () => {
  const studies = studiesFromChooser({ resource: [{ content: { CmStudyInfoDto: { name: { value: 'Ohne Id' } } } }, { content: { CmStudyInfoDto: { studyId: 1 } } }] });
  assert.deepEqual(studies, []);
});

test('root element ids are read only from a myCurriculumElements link', () => {
  assert.equal(elementIdFromLink('https://campus.uni-stuttgart.de/cusonline/ee/rest/slc.cm.cs/student/myStudies/339485/myCurriculumElements/278343'), 278343);
  assert.equal(elementIdFromLink('https://campus.uni-stuttgart.de/other/1'), null);
  assert.equal(elementIdFromLink(''), null);
  assert.equal(elementIdFromLink(undefined), null);
});

test('study ids stay positive integers', () => {
  assert.equal(parseStudyId(''), null);
  assert.equal(parseStudyId(339484), 339484);
  for (const value of ['1/../x', 0, -1, 1.5, 'PSESSIONID=abc']) {
    assert.throws(() => parseStudyId(value), (error) => error.message === 'bad_study_id');
  }
});

test('portal messages are read from the coErrorDto shape and fallbacks', () => {
  assert.equal(
    portalMessage({ resource: [{ content: { coErrorDto: { message: 'invalid_token: expired' } } }] }),
    'invalid_token: expired',
  );
  assert.equal(portalMessage({ message: 'boom' }), 'boom');
  assert.equal(portalMessage({}), '');
  assert.equal(portalMessage(null), '');
});

test('a failing structure read keeps the upstream status and message as detail', async () => {
  process.env.CAMPUS_BEARER_TOKEN = 'test-token';
  process.env.CAMPUS_SESSION_COOKIE = 'test-cookie';
  const fetchImpl = async () => ({
    ok: false,
    status: 500,
    json: async () => ({ resource: [{ content: { coErrorDto: { message: 'something broke' } } }] }),
  });
  await assert.rejects(() => loadCurriculumStructure(278343, 339485, fetchImpl), (error) => {
    assert.equal(error.message, 'campus_failed');
    assert.equal(error.detail, 'upstream 500: something broke');
    return true;
  });
});

test('an empty portal error body still reports the upstream status', async () => {
  process.env.CAMPUS_BEARER_TOKEN = 'test-token';
  process.env.CAMPUS_SESSION_COOKIE = 'test-cookie';
  const fetchImpl = async () => ({
    ok: false,
    status: 403,
    json: async () => ({}),
  });
  await assert.rejects(() => loadCurriculumStructure(278343, 339485, fetchImpl), (error) => {
    assert.equal(error.message, 'campus_failed');
    assert.equal(error.detail, 'upstream 403');
    return true;
  });
});

test('courses url names the study and the curriculum element', () => {
  assert.equal(
    coursesRequestUrl(339485, 287785),
    'https://campus.uni-stuttgart.de/cusonline/ee/rest/slc.cm.cs/student/myStudies/339485/myCurriculumElements/287785/courses?$ctx=design=ca;lang=de&$filter=active-eq=true;currentlyValid-eq=true;partOfCurriculum-eq=true',
  );
});

test('courses map the German title, lecturer, room, and registration state', () => {
  const courses = coursesFromPayload({ resource: [
    {
      content: {
        type: 'model-slc.cm.mystudy.CmCurriculumElementCourseGroupingsListDto',
        CmCurriculumElementCourseGroupingsListDto: {
          courseGroupings: [
            {
              courseList: [
                {
                  id: 461346,
                  courseNumber: { courseNumber: '127262002' },
                  courseTitle: { value: 'Einführung in die Geschichte der Philosophie', translations: { translation: [{ lang: 'de', value: 'Einführung in die Geschichte der Philosophie' }] } },
                  courseTypeName: { value: 'Seminar' },
                  courseTypeShortName: { value: 'SE' },
                  semester: { value: '2026 W' },
                  semesterId: 216,
                  duration: 2,
                  lectureships: [{ id: 1578891, courseId: 461346, identityLibDto: { firstName: 'Christian', lastName: 'Martin' } }],
                  roomName: 'Breitscheid 02A - M 2.00 (BS02AEGM 2.00)',
                  startTime: '2026-10-19T14:00',
                  endTime: '2026-10-19T15:30',
                  detailPageLink: { href: 'https://campus.uni-stuttgart.de/cusonline/pages/slc.tm.cp/course/461346' },
                  courseRegistrationData: {
                    action: { text: { value: 'LV-Anmeldung bearbeiten' }, url: { href: 'https://campus.uni-stuttgart.de/registration/461346' } },
                    textAbove: { textInfo: { value: 'Fixplatz zugewiesen' } },
                  },
                },
              ],
            },
          ],
        },
      },
    },
  ] });
  assert.equal(courses.length, 1);
  assert.equal(courses[0].id, 461346);
  assert.equal(courses[0].courseNumber, '127262002');
  assert.equal(courses[0].title, 'Einführung in die Geschichte der Philosophie');
  assert.deepEqual(courses[0].lecturers, ['Martin, Christian']);
  assert.equal(courses[0].roomName, 'Breitscheid 02A - M 2.00 (BS02AEGM 2.00)');
  assert.equal(courses[0].registrationStatus, 'Fixplatz zugewiesen');
  assert.equal(courses[0].registrationAction, 'LV-Anmeldung bearbeiten');
  assert.equal(courses[0].semester, '2026 W');
});

test('course rows without an id or a title are dropped', () => {
  const courses = coursesFromPayload({ resource: [
    { content: { CmCurriculumElementCourseGroupingsListDto: { courseGroupings: [{ courseList: [{ title: { value: 'Ohne Id' } }] }] } } },
    { content: { CmCurriculumElementCourseGroupingsListDto: { courseGroupings: [{ courseList: [{ id: 7 }] }] } } },
    { content: { cmCurriculumElementCourseGroupingsListDto: { courseGroupings: [{ courseList: [{ id: 8, courseTitle: { value: 'Kleinbuchstabe' } }] }] } } },
  ] });
  assert.equal(courses.length, 1);
  assert.equal(courses[0].id, 8);
});

test('courses need an element id and an empty list is a valid answer', async () => {
  process.env.CAMPUS_BEARER_TOKEN = 'test-token';
  process.env.CAMPUS_SESSION_COOKIE = 'test-cookie';
  await assert.rejects(() => loadCurriculumCourses(339485, null, async () => ({})), (error) => error.message === 'bad_element_id');
  const empty = await loadCurriculumCourses(339485, 287785, async () => ({ ok: true, status: 200, json: async () => ({ link: [], resource: [] }) }));
  assert.deepEqual(empty.courses, []);
  assert.equal(empty.studyId, 339485);
  assert.equal(empty.elementId, 287785);
});

test('refresh uses the portal endpoint without an Authorization header', async () => {
  process.env.CAMPUS_BEARER_TOKEN = 'old-token';
  process.env.CAMPUS_SESSION_COOKIE = 'session-value';
  let seenHeaders = null;
  const fetchImpl = async (url, options = {}) => {
    seenHeaders = options.headers;
    assert.equal(url, refreshRequestUrl());
    return { ok: true, status: 201, json: async () => ({ access_token: 'new-token' }) };
  };
  assert.equal(await refreshCampusToken(fetchImpl), true);
  assert.equal(campusAuthorizationHeader(), 'Bearer new-token');
  assert.equal(seenHeaders.Authorization, undefined);
  assert.equal(seenHeaders.Cookie, 'PSESSIONID=session-value');
  assert.equal(publicCampusStatus().tokenRefreshed, true);
});

test('refresh reads common token field spellings', () => {
  assert.equal(extractRefreshedToken({ accessToken: 'a' }), 'a');
  assert.equal(extractRefreshedToken({ data: { token: 'Bearer b' } }), 'b');
  assert.equal(extractRefreshedToken({}), '');
  assert.equal(extractRefreshedToken(null), '');
});

test('an expired token is refreshed once and the call retried', async () => {
  process.env.CAMPUS_BEARER_TOKEN = 'old-token';
  process.env.CAMPUS_SESSION_COOKIE = 'session-value';
  const calls = [];
  const structure = {
    resource: [{ content: { curriculumStructureElementDto: { id: 10, designation: 'R', elementType: 'ROOT', name: { value: 'N' } } } }],
  };
  const fetchImpl = async (url, options = {}) => {
    calls.push(url);
    if (url.includes('/auth/token/refresh')) return { ok: true, status: 201, json: async () => ({ access_token: 'new-token' }) };
    if ((options.headers?.Authorization ?? '').includes('new-token')) {
      return { ok: true, status: 200, json: async () => structure };
    }
    return { ok: false, status: 401, json: async () => ({ resource: [{ content: { coErrorDto: { message: 'invalid_token: expired' } } }] }) };
  };
  const result = await loadCurriculumStructure(10, 99, fetchImpl);
  assert.equal(result.nodes[0].name, 'N');
  assert.equal(calls.filter((url) => url.includes('/auth/token/refresh')).length, 1);
  assert.equal(calls.length, 3);
});

test('a failed refresh surfaces the original rejection', async () => {
  process.env.CAMPUS_BEARER_TOKEN = 'old-token';
  process.env.CAMPUS_SESSION_COOKIE = 'session-value';
  const fetchImpl = async (url) => {
    if (url.includes('/auth/token/refresh')) return { ok: false, status: 401, json: async () => ({}) };
    return { ok: false, status: 401, json: async () => ({ resource: [{ content: { coErrorDto: { message: 'invalid_token' } } }] }) };
  };
  await assert.rejects(() => loadCurriculumStructure(10, 99, fetchImpl), (error) => error.message === 'invalid_token');
  assert.equal(campusAuthorizationHeader(), 'Bearer old-token');
});

test('without a session cookie no refresh is attempted', async () => {
  process.env.CAMPUS_BEARER_TOKEN = 'old-token';
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return { ok: false, status: 401, json: async () => ({ resource: [{ content: { coErrorDto: { message: 'invalid_token' } } }] }) };
  };
  await assert.rejects(() => loadCurriculumStructure(10, 99, fetchImpl), (error) => error.message === 'invalid_token');
  assert.equal(calls, 1);
});

test('api catalog only names known paths', () => {
  const { operations } = apiCatalog();
  const paths = operations.map((item) => item.path);
  assert.deepEqual(paths, [
    '/health',
    '/v1/campus/config',
    '/v1/oidc/config',
    '/v1/campus/login',
    '/v1/campus/structure',
    '/v1/campus/courses',
    '/v1/campus/studies',
    '/v1/campus/sync',
    '/v1/campus/tree',
    '/v1/campus/courses/all',
    '/v1/campus/calls',
    '/v1/campus/calendar-export',
    '/v1/campus/calendar-sync',
    '/v1/assist',
    '/v1/oidc/start',
    '/v1/oidc/exchange',
    '/v1/oidc/logout',
  ]);
  assert.equal(paths.some((path) => path.includes('://') || path.includes('..')), false);
  assert.equal(operations.find((item) => item.id === 'campus-structure').acceptsElementId, true);
  assert.equal(operations.find((item) => item.id === 'oidc-exchange').replay, false);
});
