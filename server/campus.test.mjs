import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import { apiCatalog } from './catalog.mjs';
import { campusAuthorizationHeader, campusRequestHeaders, parseElementId, profileFromCurriculum, publicCampusStatus } from './campus.mjs';

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

test('api catalog only names known paths', () => {
  const { operations } = apiCatalog();
  const paths = operations.map((item) => item.path);
  assert.deepEqual(paths, [
    '/health',
    '/v1/campus/config',
    '/v1/oidc/config',
    '/v1/campus/login',
    '/v1/campus/structure',
    '/v1/assist',
    '/v1/oidc/start',
    '/v1/oidc/exchange',
    '/v1/oidc/logout',
  ]);
  assert.equal(paths.some((path) => path.includes('://') || path.includes('..')), false);
  assert.equal(operations.find((item) => item.id === 'campus-structure').acceptsElementId, true);
  assert.equal(operations.find((item) => item.id === 'oidc-exchange').replay, false);
});
