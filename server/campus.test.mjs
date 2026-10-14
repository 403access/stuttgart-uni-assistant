import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import { apiCatalog } from './catalog.mjs';
import { campusAuthorizationHeader, campusRequestHeaders, elementIdFromLink, loadCurriculumStructure, parseElementId, parseStudyId, portalMessage, profileFromCurriculum, publicCampusStatus, studiesFromChooser } from './campus.mjs';

afterEach(() => {
  delete process.env.CAMPUS_BEARER_TOKEN;
  delete process.env.CAMPUS_SESSION_COOKIE;
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

test('api catalog only names known paths', () => {
  const { operations } = apiCatalog();
  const paths = operations.map((item) => item.path);
  assert.deepEqual(paths, [
    '/health',
    '/v1/campus/config',
    '/v1/oidc/config',
    '/v1/campus/login',
    '/v1/campus/structure',
    '/v1/campus/studies',
    '/v1/assist',
    '/v1/oidc/start',
    '/v1/oidc/exchange',
    '/v1/oidc/logout',
  ]);
  assert.equal(paths.some((path) => path.includes('://') || path.includes('..')), false);
  assert.equal(operations.find((item) => item.id === 'campus-structure').acceptsElementId, true);
  assert.equal(operations.find((item) => item.id === 'oidc-exchange').replay, false);
});
