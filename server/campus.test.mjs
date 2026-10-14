import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import { campusAuthorizationHeader, campusRequestHeaders, profileFromCurriculum, publicCampusStatus } from './campus.mjs';

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
});
