#!/usr/bin/env node
/** Contract for the pure MIME helpers used by UniMail send — fixtures, no network. */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  asciiAttachmentName,
  attachmentParameters,
  buildMailMime,
  dotStuff,
  encodeHeaderText,
  parseAddress,
  parseAddressList,
  prepareMail,
  textToHtml,
} from './mail-mime.mjs';

const sender = { name: 'Lena Hartmann', email: 'st123456@stud.uni-stuttgart.de' };

test('parseAddress reads plain, quoted and angled forms and rejects injection', () => {
  assert.deepEqual(parseAddress('anna@uni-stuttgart.de'), { name: '', email: 'anna@uni-stuttgart.de' });
  assert.deepEqual(parseAddress('Anna Müller <anna@uni-stuttgart.de>'), { name: 'Anna Müller', email: 'anna@uni-stuttgart.de' });
  assert.deepEqual(parseAddress('"Müller, Anna" <anna@uni-stuttgart.de>'), { name: 'Müller, Anna', email: 'anna@uni-stuttgart.de' });
  assert.equal(parseAddress('anna@uni-stuttgart.de\r\nBcc: evil@example.org'), null);
  assert.equal(parseAddress('not an address'), null);
});

test('parseAddressList dedupes by address and keeps the first display name', () => {
  const list = parseAddressList(['Anna <a@uni-stuttgart.de>', { name: 'A. Müller', email: 'A@uni-stuttgart.de' }, 'b@uni-stuttgart.de']);
  assert.deepEqual(list, [
    { name: 'Anna', email: 'a@uni-stuttgart.de' },
    { name: '', email: 'b@uni-stuttgart.de' },
  ]);
});

test('encodeHeaderText keeps ASCII and encodes umlauts and line breaks', () => {
  assert.equal(encodeHeaderText('Prüfungsamt'), '=?UTF-8?B?UHLDvGZ1bmdzYW10?=');
  assert.equal(encodeHeaderText('Anmeldung\r\nBcc: evil@example.org'), 'Anmeldung Bcc: evil@example.org');
  assert.equal(encodeHeaderText('Anmeldung'), 'Anmeldung');
});

test('attachment names survive RFC 2231 and fall back to ASCII', () => {
  assert.equal(asciiAttachmentName('Übung 1 – Lösung.pdf'), 'Ubung 1 _ Losung.pdf');
  assert.equal(attachmentParameters('Übung 1.pdf'), 'filename="Ubung 1.pdf"; filename*=UTF-8\'\'%C3%9Cbung%201.pdf');
});

test('prepareMail trims fields, validates recipients and decodes attachments', () => {
  const prepared = prepareMail({
    to: ['anna@uni-stuttgart.de'],
    cc: [],
    subject: '  Anfrage\r\nBcc: evil@example.org  ',
    text: 'Hallo\r\nWelt',
    attachments: [{ name: 'notiz.txt', type: 'text/plain', data: Buffer.from('hi').toString('base64') }],
  });
  assert.equal(prepared.subject, 'Anfrage Bcc: evil@example.org');
  assert.equal(prepared.text, 'Hallo\nWelt');
  assert.equal(prepared.bytes, 2);
  assert.throws(() => prepareMail({ to: [] }), (error) => error.message === 'missing_recipient');
  assert.throws(() => prepareMail({ to: ['evil@example.org'], attachments: [{ name: 'x', data: '!!!' }] }), (error) => error.message === 'bad_attachment');
});

test('buildMailMime writes headers, hides Bcc and encodes both body parts', () => {
  const message = buildMailMime({
    from: sender,
    to: [{ name: 'Anna Müller', email: 'anna@uni-stuttgart.de' }],
    cc: [{ name: '', email: 'cc@uni-stuttgart.de' }],
    bcc: [{ name: '', email: 'secret@uni-stuttgart.de' }],
    subject: 'Prüfungsanmeldung',
    text: 'Hallo Anna,\n\nbitte prüfen.',
    attachments: [{ name: 'Übung 1.pdf', type: 'application/pdf', bytes: Buffer.from('%PDF-1.4') }],
    date: new Date('2026-10-21T09:30:00Z'),
    messageId: '<fixed@uni-stuttgart.de>',
    inReplyTo: '<parent@uni-stuttgart.de>',
  });
  assert.match(message.raw, /^From: "Lena Hartmann" <st123456@stud\.uni-stuttgart\.de>\r\n/);
  assert.match(message.raw, /To: =\?UTF-8\?B\?[^?]+\?= <anna@uni-stuttgart\.de>/);
  assert.match(message.raw, /Cc: cc@uni-stuttgart\.de/);
  assert.ok(!message.raw.includes('secret@uni-stuttgart.de'));
  assert.match(message.raw, /Subject: =\?UTF-8\?B\?/);
  assert.match(message.raw, /Message-ID: <fixed@uni-stuttgart\.de>/);
  assert.match(message.raw, /In-Reply-To: <parent@uni-stuttgart\.de>/);
  assert.match(message.raw, /References: <parent@uni-stuttgart\.de>/);
  assert.match(message.raw, /Date: Wed, 21 Oct 2026 09:30:00 GMT/);
  assert.match(message.raw, /Content-Type: multipart\/mixed; boundary="/);
  assert.match(message.raw, /Content-Disposition: attachment; filename="Ubung 1.pdf"; filename\*=UTF-8''%C3%9Cbung%201.pdf/);
  assert.deepEqual(message.envelope, ['anna@uni-stuttgart.de', 'cc@uni-stuttgart.de', 'secret@uni-stuttgart.de']);
  assert.equal(message.messageId, '<fixed@uni-stuttgart.de>');
});

test('textToHtml escapes markup and keeps paragraphs', () => {
  assert.equal(
    textToHtml('Hallo <Anna>\n\nZeile 2\n& mehr'),
    '<div style="font-family:-apple-system,\'Segoe UI\',Roboto,sans-serif;font-size:15px;line-height:21px;color:#2b3038"><p>Hallo &lt;Anna&gt;</p><p>Zeile 2<br>&amp; mehr</p></div>',
  );
});

test('dotStuff doubles leading dots on every line', () => {
  assert.equal(dotStuff('.first\r\nnormal\r\n..dots'), '..first\r\nnormal\r\n...dots');
});
