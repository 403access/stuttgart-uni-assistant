#!/usr/bin/env node
/** Contract for the pure parts of server/mail.mjs — fixtures, no network. */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  decodeMimeWords,
  decodeModifiedUtf7,
  decodeQuotedPrintable,
  mailAddressFor,
  normalizeMailAccount,
  parseFetchLines,
  parseHeaderBlock,
  parseImapList,
  parseListLines,
  pickTextParts,
  publicMailStatus,
  seenStoreCommand,
  stripMailHtml,
  textPreview,
} from './mail.mjs';

const FETCH_PIECES = [
  [
    { kind: 'text', text: '* 1 FETCH (UID 9001 FLAGS (\\Seen) INTERNALDATE "17-Oct-2026 08:15:00 +0200" BODY[HEADER.FIELDS (DATE FROM TO SUBJECT)]{86}' },
    { kind: 'bytes', bytes: Buffer.from('From: Pruefungsamt <pruefung@verwaltung.uni-stuttgart.de>\r\nSubject: Anmeldung\r\nDate: Sat, 17 Oct 2026 08:12:30 +0200\r\n') },
    { kind: 'text', text: ' BODY[TEXT]<0>{21}' },
    { kind: 'bytes', bytes: Buffer.from('<p>Bitte bestätigen Sie</p>') },
    { kind: 'text', text: ')' },
  ],
  [
    { kind: 'text', text: '* 2 FETCH (UID 9002 FLAGS () INTERNALDATE "17-Oct-2026 09:00:00 +0200" BODY[HEADER.FIELDS (DATE FROM TO SUBJECT)]{64}' },
    { kind: 'bytes', bytes: Buffer.from('From: =?utf-8?Q?Anna_M=C3=BCller?= <anna@uni-stuttgart.de>\r\nTo: st123456\r\n') },
    { kind: 'text', text: ' BODY[TEXT]{8}' },
    { kind: 'bytes', bytes: Buffer.from('A &amp; B') },
    { kind: 'text', text: ')' },
  ],
];

test('parseFetchLines reads uid, flags, date, headers and preview from pieces', () => {
  const messages = parseFetchLines(FETCH_PIECES);
  assert.equal(messages.length, 2);
  assert.deepEqual(
    { uid: messages[0].uid, seen: messages[0].seen, date: messages[0].date, from: messages[0].from, subject: messages[0].subject },
    { uid: 9001, seen: true, date: new Date('Sat, 17 Oct 2026 08:12:30 +0200').toISOString(), from: 'Pruefungsamt <pruefung@verwaltung.uni-stuttgart.de>', subject: 'Anmeldung' },
  );
  assert.equal(messages[0].preview, 'Bitte bestätigen Sie');
  assert.equal(messages[1].seen, false);
  assert.equal(messages[1].from, 'Anna Müller <anna@uni-stuttgart.de>');
  assert.equal(messages[1].preview, 'A & B');
});

test('parseFetchLines keeps lines without FETCH data out', () => {
  assert.deepEqual(parseFetchLines([[{ kind: 'text', text: 'A001 OK FETCH completed' }]]), []);
  assert.deepEqual(parseFetchLines([[{ kind: 'text', text: '* 3 EXISTS' }]]), []);
});

test('parseListLines reads quoted mailbox names, inline literals and selectability', () => {
  const folders = parseListLines([
    [{ kind: 'text', text: '* LIST (\\HasNoChildren) "/" "INBOX"' }],
    [
      { kind: 'text', text: '* LIST (\\HasNoChildren) "/" {8}' },
      { kind: 'bytes', bytes: Buffer.from('Entwürfe') },
      { kind: 'text', text: ')' },
    ],
    [{ kind: 'text', text: '* LIST (\\Noselect) "/" "Gel&APY-schte"' }],
    [{ kind: 'text', text: 'A003 OK LIST completed' }],
  ]);
  assert.deepEqual(folders, [
    { name: 'INBOX', display: 'INBOX', selectable: true },
    { name: 'Entwürfe', display: 'Entwürfe', selectable: true },
    { name: 'Gel&APY-schte', display: 'Gelöschte', selectable: false },
  ]);
});

test('parseListLines reads bare-atom names without mistaking the delimiter for the mailbox', () => {
  const folders = parseListLines([
    [{ kind: 'text', text: '* LIST (\\HasNoChildren) "/" INBOX' }],
    [{ kind: 'text', text: '* LIST (\\HasNoChildren) NIL INBOX' }],
    [{ kind: 'text', text: '* LIST (\\Noselect \\HasChildren) "/" "/"' }],
  ]);
  assert.deepEqual(folders, [
    { name: 'INBOX', display: 'INBOX', selectable: true },
    { name: '/', display: '/', selectable: false },
  ]);
});

test('decodeModifiedUtf7 resolves German umlauts, the literal ampersand and plain names', () => {
  assert.equal(decodeModifiedUtf7('Gel&APY-schte'), 'Gelöschte');
  assert.equal(decodeModifiedUtf7('Gel&ANY-schte Objekte'), 'GelÖschte Objekte'); // Ö keeps its own 16-bit unit
  assert.equal(decodeModifiedUtf7('INBOX'), 'INBOX');
  assert.equal(decodeModifiedUtf7('Pat&- &- Zufall'), 'Pat& & Zufall');
  assert.equal(decodeModifiedUtf7('Kein&Preis'), 'Kein&Preis'); // unterminated ampersand: verbatim, not garbage
});

test('parseListLines dedupes repeated mailboxes and stays nameless-empty', () => {
  const folders = parseListLines([
    [{ kind: 'text', text: '* LIST (\\HasNoChildren) {1}' }, { kind: 'bytes', bytes: Buffer.from('/') }, { kind: 'text', text: '' }],
    [{ kind: 'text', text: '* LIST (\\HasNoChildren) "/" "INBOX"' }],
    [{ kind: 'text', text: '* LIST (\\HasNoChildren) "/" "INBOX"' }],
    [{ kind: 'text', text: '* LIST (\\Noselect) "/" "INBOX"' }],
  ]);
  assert.deepEqual(folders, [
    { name: '/', display: '/', selectable: true },
    { name: 'INBOX', display: 'INBOX', selectable: true },
  ]);
});

test('parseHeaderBlock folds continuation lines and keeps the first value', () => {
  const headers = parseHeaderBlock(Buffer.from('Subject: Erstes Wort\r\n zweites Wort\r\nSubject: zweiter Kopf\r\nX-Emp: getragen\r\n'));
  assert.equal(headers.subject, 'Erstes Wort zweites Wort');
  assert.equal(headers['x-emp'], 'getragen');
});

test('decodeMimeWords handles base64 and Q encoding', () => {
  assert.equal(decodeMimeWords('=?utf-8?B?Rm9vYmFy?='), 'Foobar');
  assert.equal(decodeMimeWords('=?utf-8?Q?Anna_M=C3=BCller?='), 'Anna Müller');
  assert.equal(decodeMimeWords('=?ISO-8859-1?B?SsO8cmdlbg==?='), 'Jürgen');
  assert.equal(decodeMimeWords('Schon klar'), 'Schon klar');
});

test('textPreview strips tags, entities and folds whitespace', () => {
  assert.equal(textPreview(Buffer.from('<!DOCTYPE html>\r\n<html><body><p>Guten&nbsp;Tag, <b>bitte</b> lesen.</p><style>x{}</style></body>')), 'Guten Tag, bitte lesen.');
  assert.equal(textPreview(Buffer.from('Räume &amp; Tod')), 'Räume & Tod');
});

test('stripMailHtml removes scripts, handler attributes and meta-refresh, keeps the rest', () => {
  const cleaned = stripMailHtml('<p onmouseover="steal()">Hallö&nbsp;du</p><script>\r\nfetch("evil")\r\n</script><a href="javascript:evil()">x</a><meta http-equiv="refresh" content="0;url=evil"><script src="evil"></script>Rest');
  assert.match(cleaned, /<p\s*>Hallö&nbsp;du<\/p>/);
  assert.doesNotMatch(cleaned, /<script/i);
  assert.doesNotMatch(cleaned, /onmouseover/i);
  assert.doesNotMatch(cleaned, /meta http-equiv/i);
  assert.match(cleaned, /Rest/);
});

test('pickTextParts finds the plain and HTML leaves with section paths and charsets', () => {
  // multipart/alternative, one of the most common shapes
  const alternative = parseImapList(
    '(("TEXT" "PLAIN" ("CHARSET" "iso-8859-1") NIL NIL "QUOTED-PRINTABLE" 200 5) ("TEXT" "HTML" ("CHARSET" "utf-8") NIL NIL "7BIT" 610 20) "ALTERNATIVE" ("BOUNDARY" "abc") NIL NIL NIL)',
  );
  assert.deepEqual(pickTextParts(alternative), {
    plain: { path: '1', charset: 'iso-8859-1', encoding: 'QUOTED-PRINTABLE' },
    html: { path: '2', charset: 'utf-8', encoding: '7BIT' },
  });
  // multipart/related wrapping an alternative: sub-paths nest
  const nested = parseImapList(
    '((("TEXT" "HTML" ("CHARSET" "utf-8") NIL NIL "7BIT" 300 10))("TEXT" "PLAIN" ("CHARSET" "us-ascii") NIL NIL "7BIT" 90 3) "MIXED" ("BOUNDARY" "abc") NIL NIL)',
  );
  const picked = pickTextParts(nested);
  assert.equal(picked.plain.path, '2');
  assert.equal(picked.html.path, '1.1');
  // simple message: the descriptor itself, part 1
  const simple = parseImapList('("TEXT" "PLAIN" ("CHARSET" "US-ASCII") NIL NIL "7BIT" 40 2)');
  assert.deepEqual(pickTextParts(simple), { plain: { path: '1', charset: 'US-ASCII', encoding: '7BIT' }, html: null });
  // attachments and images leave no text leaf
  const attachment = parseImapList('("APPLICATION" "PDF" ("NAME" "a.pdf") NIL NIL "BASE64" 900 NIL)');
  assert.deepEqual(pickTextParts(attachment), { plain: null, html: null });
});

test('decodeQuotedPrintable resolves octets, soft breaks and passes the rest through', () => {
  assert.equal(decodeQuotedPrintable(Buffer.from('=C3=BCber das=20Jahr')).toString('utf8'), 'über das Jahr');
  assert.equal(decodeQuotedPrintable(Buffer.from('erste Zeile=\r\n zweite')).toString('utf8'), 'erste Zeile zweite');
  assert.equal(decodeQuotedPrintable(Buffer.from('Alles klar')).toString('utf8'), 'Alles klar');
});

test('normalizeMailAccount and mailAddressFor use the TIK long/short forms', () => {
  assert.equal(normalizeMailAccount(' St123456@STUD.uni-stuttgart.de '), 'st123456');
  assert.equal(normalizeMailAccount('AC987654'), 'ac987654');
  assert.equal(mailAddressFor('st123456'), 'st123456@stud.uni-stuttgart.de');
  assert.equal(mailAddressFor('ac987654'), 'ac987654@uni-stuttgart.de');
});

test('seenStoreCommand adds and removes the read flag', () => {
  assert.equal(seenStoreCommand(9001, true), 'UID STORE 9001 +FLAGS (\\Seen)');
  assert.equal(seenStoreCommand(9001, false), 'UID STORE 9001 -FLAGS (\\Seen)');
});

test('publicMailStatus starts unconfigured and never leaks secrets', () => {
  // The module holds no credentials at import time (tests keep processes isolated).
  const status = publicMailStatus();
  assert.equal(status.webmail, 'https://mail.uni-stuttgart.de/');
  assert.equal(status.imap, 'imap.uni-stuttgart.de:993');
  if (!status.configured) {
    assert.equal(status.account, null);
    assert.equal(status.address, null);
  }
});
