import assert from 'node:assert/strict';
import { test } from 'node:test';

import { isTutorialItem, tutorialFromContent, tutorialItems } from '@ua/feature-ilias';

/**
 * The onboarding tutorial preview is built from the ILIAS dashboard plus one
 * content read per tutorial. These cases pin which rows count as a tutorial and
 * how the tutor, room, and files are read off the portal markup.
 */

function item(overrides = {}) {
  return {
    id: 'grp-1',
    kind: 'grp',
    type: 'Gruppe',
    refId: 1,
    newsId: null,
    mailId: null,
    title: 'Tutorium 1: Montag, 15.45 Uhr bei Lea Heim',
    description: 'Mi. 11:30-13:00 M11.62',
    url: '',
    group: 'Einführung in die Geschichte der Philosophie',
    properties: [],
    date: '',
    ...overrides,
  };
}

function dashboard(overrides = {}) {
  return {
    pageTitle: '',
    name: null,
    account: null,
    memberships: [item()],
    courses: [],
    groups: [item()],
    news: [],
    mails: [],
    tasks: [],
    counts: { memberships: 1, courses: 0, groups: 1, news: 0, mails: 0, unreadMails: 0, tasks: 0 },
    fetchedAt: '2026-10-22T09:00:00.000Z',
    ...overrides,
  };
}

test('only tutorial memberships with a ref id become preview rows', () => {
  const list = tutorialItems(
    dashboard({
      memberships: [
        item(),
        item({ id: 'grp-1', refId: 1 }),
        item({ id: 'crs-2', kind: 'crs', refId: 2, title: 'Basic Phonetics & Phonology' }),
        item({ id: 'mail-1', kind: 'mail', refId: null, title: 'Ihre Anmeldung für Gruppe „Tutorium 5“' }),
      ],
    }),
  );
  assert.equal(list.length, 1);
  assert.equal(list[0].refId, 1);
  assert.equal(isTutorialItem(item({ refId: null })), false);
  assert.equal(isTutorialItem(item({ kind: 'crs', title: 'Einführung in die formale Logik' })), false);
  assert.equal(isTutorialItem(item({ title: 'Übungsgruppe Analysis' })), false);
});

test('the tutor, room, and schedule are read from title and description', () => {
  const named = tutorialFromContent(item(), null);
  assert.equal(named.teacher, 'Lea Heim');
  assert.equal(named.room, 'M11.62');
  assert.match(named.schedule, /11:30/);

  const bare = tutorialFromContent(item({ title: 'Tutorium Penelope Martinez Halmen', description: 'Raum: M11.71' }), null);
  assert.equal(bare.teacher, 'Penelope Martinez Halmen');
  assert.equal(bare.room, 'M11.71');
  assert.equal(bare.schedule, '');

  const property = tutorialFromContent(
    item({ title: 'Tutorium 3', description: '', properties: [{ name: 'Dozent', value: 'Dr. Farid Nazari' }] }),
    null,
  );
  assert.equal(property.teacher, 'Dr. Farid Nazari');
});

test('the tutorial page contributes the files and the full item count', () => {
  const content = {
    refId: 1,
    kind: 'grp',
    title: 'Tutorium',
    description: '',
    fetchedAt: '2026-10-22T09:00:00.000Z',
    items: [
      {
        id: 'file-9', kind: 'file', type: 'pdf', refId: 9, title: 'Folien', description: '', url: '',
        properties: [], date: 'Heute', size: '1.2 MB', pages: '3', downloadable: true,
      },
      {
        id: 'fold-10', kind: 'fold', type: 'Ordner', refId: 10, title: 'Altklausuren', description: '', url: '',
        properties: [], date: '', size: '', pages: '', downloadable: false,
      },
    ],
  };
  const tutorial = tutorialFromContent(item(), content);
  assert.equal(tutorial.itemCount, 2);
  assert.equal(tutorial.files.length, 1);
  assert.equal(tutorial.files[0].refId, 9);
  assert.equal(tutorial.files[0].size, '1.2 MB');
});
