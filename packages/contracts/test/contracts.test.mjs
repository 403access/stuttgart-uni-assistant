import assert from 'node:assert/strict';
import { test } from 'node:test';

import { API_OPERATIONS, apiCatalog } from '../api.js';
import { campusCoursesUrl, campusStructureUrl, campusStudiesUrl, elementIdFromLink, pickActiveStudyId } from '../campus.js';

test('the catalog has unique ids and paths', () => {
  assert.equal(apiCatalog().operations.length, API_OPERATIONS.length);
  assert.equal(new Set(API_OPERATIONS.map((item) => item.id)).size, API_OPERATIONS.length);
  for (const operation of API_OPERATIONS) assert.match(operation.path, /^\//);
});

test('C@MPUS URL builders keep the portal filter and locale', () => {
  assert.match(campusStructureUrl({ studyId: 1, elementId: 2 }), /myStudies\/1\/myCurriculumElements\/2\/structure\?\$ctx=design=ca;lang=de/);
  assert.match(campusStructureUrl({ studyId: 1, elementId: 2, lang: 'en', active: false }), /lang=en&\$filter=active-eq=false/);
  assert.match(campusCoursesUrl(1, 2, 'en'), /courses\?\$ctx=design=ca;lang=en/);
  assert.match(campusStudiesUrl('de'), /myStudies\/chooser\?\$ctx=design=ca;lang=de/);
});

test('portal ids and the active study are read defensively', () => {
  assert.equal(elementIdFromLink('/myCurriculumElements/12345'), 12345);
  assert.equal(elementIdFromLink('/myCurriculumElements/0'), null);
  assert.equal(elementIdFromLink(undefined), null);
  assert.equal(pickActiveStudyId([{ studyId: 1 }, { studyId: 2, lastAccessed: true }]), 2);
  assert.equal(pickActiveStudyId([{ studyId: 1 }, { studyId: 2, lastAccessed: true }], 1), 1);
  assert.equal(pickActiveStudyId([]), null);
});
