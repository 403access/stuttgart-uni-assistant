#!/usr/bin/env node
/** Pure compose helpers: address parsing, registry search, reply/forward prefill. */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { addRecipient, buildComposeDraft, buildContactRegistry, buildSignature, contactInitials, forwardSubject, parseRecipient, parseRecipientHeader, replySubject, searchContacts } from '@ua/feature-mail';

const message = {
  uid: 7,
  seen: true,
  date: '2026-10-21T09:30:00.000Z',
  from: 'Anna Müller <anna@uni-stuttgart.de>',
  to: 'st123456@stud.uni-stuttgart.de',
  cc: '',
  subject: 'Prüfungsanmeldung',
  messageId: '<abc@uni-stuttgart.de>',
  preview: '',
};

test('parseRecipient handles names, quoting and invalid input', () => {
  assert.deepEqual(parseRecipient('Anna Müller <anna@uni-stuttgart.de>'), { name: 'Anna Müller', email: 'anna@uni-stuttgart.de' });
  assert.deepEqual(parseRecipient('"Müller, Anna" <anna@uni-stuttgart.de>'), { name: 'Müller, Anna', email: 'anna@uni-stuttgart.de' });
  assert.equal(parseRecipient('nope'), null);
  assert.deepEqual(parseRecipientHeader('Anna <a@uni-stuttgart.de>, b@uni-stuttgart.de').map((entry) => entry.email), ['a@uni-stuttgart.de', 'b@uni-stuttgart.de']);
});

test('addRecipient ignores duplicate addresses in different case', () => {
  const once = addRecipient([], { name: 'Anna', email: 'a@uni-stuttgart.de' });
  assert.equal(addRecipient(once, { name: 'A.', email: 'A@uni-stuttgart.de' }), once);
});

test('registry merges people, mailbox contacts and recent recipients with badges', () => {
  const registry = buildContactRegistry({
    people: [
      {
        id: 'p1',
        name: 'Miriam Adler',
        title: { de: 'Prof. Dr.', en: 'Prof. Dr.' },
        institute: { de: 'KI', en: 'AI' },
        email: 'miriam.adler@uni-stuttgart.de',
        campus: 'vaihingen',
        roomId: 'x',
        hours: { de: '', en: '' },
        research: { de: '', en: '' },
      },
    ],
    messages: [message, { ...message, from: 'miriam.adler@uni-stuttgart.de', subject: 'Sprechstunde' }],
    recent: [{ name: 'Miriam Adler', email: 'MIRIAM.ADLER@uni-stuttgart.de' }],
    locale: 'de',
  });
  const lecturer = registry.find((entry) => entry.email === 'miriam.adler@uni-stuttgart.de');
  assert.deepEqual([...lecturer.sources].sort(), ['lecturer', 'mailbox', 'recent']);
  assert.equal(lecturer.detail, 'KI');
  assert.ok(registry.some((entry) => entry.email === 'anna@uni-stuttgart.de' && entry.sources.includes('mailbox')));
  assert.deepEqual(searchContacts(registry, 'muller').map((entry) => entry.email), ['anna@uni-stuttgart.de']);
  assert.equal(contactInitials({ name: 'Miriam Adler', email: 'x@y.de' }), 'MA');
});

test('reply and forward subjects never double the prefix', () => {
  assert.equal(replySubject('Re: Prüfung', 'en'), 'Re: Prüfung');
  assert.equal(replySubject('AW: Prüfung', 'de'), 'AW: Prüfung');
  assert.equal(forwardSubject('Fwd: Prüfung', 'en'), 'Fwd: Prüfung');
  assert.equal(forwardSubject('WG: Prüfung', 'de'), 'WG: Prüfung');
});

test('reply prefill addresses the sender, quotes the body and keeps the cursor at the top', () => {
  const draft = buildComposeDraft({
    mode: 'reply',
    message,
    body: { text: 'Erste Zeile\nZweite Zeile', html: null, truncated: false },
    locale: 'de',
    signature: buildSignature('Lena Hartmann', 'st123456@stud.uni-stuttgart.de'),
  });
  assert.deepEqual(draft.to, [{ name: 'Anna Müller', email: 'anna@uni-stuttgart.de' }]);
  assert.equal(draft.subject, 'AW: Prüfungsanmeldung');
  assert.ok(draft.text.startsWith('\n\n'));
  assert.ok(draft.text.includes('> Erste Zeile\n> Zweite Zeile'));
  assert.ok(draft.text.includes('Lena Hartmann'));
});

test('forward prefill keeps the original header block and body', () => {
  const draft = buildComposeDraft({
    mode: 'forward',
    message,
    body: { text: 'Originaltext', html: null, truncated: false },
    locale: 'en',
    signature: '',
  });
  assert.deepEqual(draft.to, []);
  assert.equal(draft.subject, 'Fwd: Prüfungsanmeldung');
  assert.ok(draft.text.includes('---------- Forwarded message ----------'));
  assert.ok(draft.text.includes('Originaltext'));
});
