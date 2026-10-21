/**
 * Pure MIME helpers for outgoing UniMail messages: address parsing, header
 * encoding, and the multipart body itself. No network and no secrets here, so
 * the whole module is covered by fixture tests.
 */

import { randomBytes } from 'node:crypto';

export const MAX_SUBJECT = 255;
export const MAX_BODY_BYTES = 100_000;
export const MAX_ATTACHMENTS = 5;
export const MAX_ATTACHMENT_BYTES = 6_000_000;
export const MAX_ATTACHMENTS_TOTAL = 8_000_000;
export const MAX_RECIPIENTS = 20;
/** JSON request cap: base64 grows by 4/3 and headers must still fit. */
export const MAIL_SEND_REQUEST_BYTES = 12_000_000;

const CRLF = '\r\n';
const EMAIL = /^[^\s@<>()[\],;:"]+@[^\s@<>()[\],;:"]+\.[^\s@<>()[\],;:"]+$/;

function mailFailure(code, detail) {
  const error = new Error(code);
  if (detail) error.detail = String(detail).slice(0, 300);
  return error;
}

/** RFC 5322 angle-address or bare address → `{ name, email }`, or null when unusable. */
export function parseAddress(value) {
  const text = String(value ?? '').replace(/[\r\n]+/g, ' ').trim();
  if (!text) return null;
  const angle = /^(.*?)<([^<>]+)>$/.exec(text);
  const email = (angle ? angle[2] : text).trim();
  if (!EMAIL.test(email) || email.length > 254) return null;
  const rawName = (angle ? angle[1] : '').trim().replace(/^"(.*)"$/, '$1').replace(/\s+/g, ' ');
  return { name: rawName.slice(0, 120), email };
}

/** Accepts strings, `{ name, email }` and arrays of both; duplicates are dropped by address. */
export function parseAddressList(values) {
  const list = Array.isArray(values) ? values : values === undefined || values === null ? [] : [values];
  const byEmail = new Map();
  for (const value of list) {
    const parsed = typeof value === 'string' ? parseAddress(value) : parseAddress(value?.email ? `${value.name ?? ''} <${value.email}>` : '');
    if (!parsed) throw mailFailure('bad_recipient', String(value ?? '').slice(0, 120));
    const key = parsed.email.toLowerCase();
    if (!byEmail.has(key)) byEmail.set(key, parsed);
  }
  return [...byEmail.values()];
}

/** Header text without line breaks; non-ASCII values become RFC 2047 encoded words. */
export function encodeHeaderText(value) {
  const text = String(value ?? '').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  if (/^[\x20-\x7e]*$/.test(text)) return text;
  const words = [];
  let chunk = '';
  let bytes = 0;
  for (const char of text) {
    const size = Buffer.byteLength(char, 'utf8');
    if (bytes + size > 45 && chunk) {
      words.push(`=?UTF-8?B?${Buffer.from(chunk, 'utf8').toString('base64')}?=`);
      chunk = '';
      bytes = 0;
    }
    chunk += char;
    bytes += size;
  }
  if (chunk) words.push(`=?UTF-8?B?${Buffer.from(chunk, 'utf8').toString('base64')}?=`);
  // RFC 2047 allows folding between adjacent encoded words; keeps every line short.
  return words.join('\r\n ');
}

/** `Name <mail@example.org>` with quoting and encoding where the header needs it. */
export function formatAddress(address) {
  const name = encodeHeaderText(address?.name ?? '');
  const email = String(address?.email ?? '').trim();
  if (!name) return email;
  return `${name.includes('=?') ? name : `"${name.replace(/["\\]/g, '\\$&')}"`} <${email}>`;
}

/** One attachment name safe for a quoted header; an ASCII fallback always exists. */
export function attachmentName(value) {
  const cleaned = String(value ?? '')
    .replace(/[\r\n"\\/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
  return cleaned || 'anhang';
}

/** ASCII fallback for clients that ignore RFC 2231 (`filename*`). */
export function asciiAttachmentName(value) {
  const name = attachmentName(value);
  const dot = name.lastIndexOf('.');
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  const folded = stem
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7e]/g, '_')
    .replace(/["\\]/g, '_');
  return `${folded || 'anhang'}${/^\.[A-Za-z0-9]{1,8}$/.test(ext) ? ext : ''}`;
}

/** RFC 2231 parameter list: ASCII fallback plus UTF-8 percent encoding. */
export function attachmentParameters(name) {
  const ascii = asciiAttachmentName(name);
  const encoded = encodeURIComponent(attachmentName(name)).replace(/'/g, '%27');
  return `filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

/** Strip an optional `data:…;base64,` prefix and validate the payload. */
export function decodeAttachmentData(value) {
  const text = String(value ?? '').replace(/^data:[^,]*,/, '').replace(/\s+/g, '');
  if (!text || !/^[A-Za-z0-9+/]*={0,2}$/.test(text)) throw mailFailure('bad_attachment', 'base64');
  const bytes = Buffer.from(text, 'base64');
  if (!bytes.length) throw mailFailure('bad_attachment', 'empty');
  return bytes;
}

/** Trim, normalise and validate one outgoing message; attachment payloads stay base64. */
export function prepareMail(input) {
  const to = parseAddressList(input?.to);
  const cc = parseAddressList(input?.cc);
  const bcc = parseAddressList(input?.bcc);
  const recipients = to.length + cc.length + bcc.length;
  if (recipients === 0) throw mailFailure('missing_recipient');
  if (recipients > MAX_RECIPIENTS) throw mailFailure('too_many_recipients', String(recipients));

  const subject = String(input?.subject ?? '').replace(/[\r\n]+/g, ' ').trim();
  if (subject.length > MAX_SUBJECT) throw mailFailure('subject_too_long');
  const text = String(input?.text ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (Buffer.byteLength(text, 'utf8') > MAX_BODY_BYTES) throw mailFailure('body_too_large');

  const rawAttachments = Array.isArray(input?.attachments) ? input.attachments : [];
  if (rawAttachments.length > MAX_ATTACHMENTS) throw mailFailure('too_many_attachments', String(rawAttachments.length));
  let total = 0;
  const attachments = rawAttachments.map((attachment) => {
    const name = attachmentName(attachment?.name);
    const type = /^[-\w.+]+\/[-.\w+]+$/.test(String(attachment?.type ?? '')) ? String(attachment.type) : 'application/octet-stream';
    const bytes = decodeAttachmentData(attachment?.data ?? attachment?.base64);
    if (bytes.length > MAX_ATTACHMENT_BYTES) throw mailFailure('attachment_too_large', name);
    total += bytes.length;
    if (total > MAX_ATTACHMENTS_TOTAL) throw mailFailure('attachments_too_large');
    return { name, type, bytes };
  });

  return { to, cc, bcc, recipients: [...to, ...cc, ...bcc], subject, text, attachments, bytes: total };
}

/** Plain text → the alternative HTML part; paragraphs and line breaks survive. */
export function textToHtml(text) {
  const escaped = String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  const paragraphs = escaped
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
    .join('');
  return `<div style="font-family:-apple-system,'Segoe UI',Roboto,sans-serif;font-size:15px;line-height:21px;color:#2b3038">${paragraphs}</div>`;
}

/** Base64 wrapped at 76 columns, the line length every mail client expects. */
export function wrapBase64(bytes) {
  return Buffer.from(bytes).toString('base64').replace(/.{1,76}/g, (line) => `${line}${CRLF}`).trimEnd();
}

/** RFC 5322 date (`Wed, 21 Oct 2026 09:30:00 GMT`) that never depends on the host locale. */
export function mailDate(date = new Date()) {
  return date.toUTCString();
}

function sanitizeMessageId(value) {
  const text = String(value ?? '').trim();
  return /^<[^<>\s]+>$/.test(text) ? text : '';
}

/**
 * Complete outgoing message. The Bcc list only feeds the SMTP envelope and is
 * deliberately absent from the headers, so recipients cannot see each other.
 */
export function buildMailMime({
  from,
  to,
  cc = [],
  bcc = [],
  subject = '',
  text = '',
  attachments = [],
  date = new Date(),
  messageId,
  inReplyTo,
  references,
}) {
  const sender = typeof from === 'string' ? parseAddress(from) : from;
  if (!sender) throw mailFailure('bad_sender');
  const envelope = [...to, ...cc, ...bcc].map((entry) => entry.email);
  if (!envelope.length) throw mailFailure('missing_recipient');

  const domain = sender.email.split('@')[1] || 'uni-stuttgart.de';
  const id = messageId || `<${Date.now().toString(36)}.${randomBytes(8).toString('hex')}@${domain}>`;
  const replyTo = sanitizeMessageId(inReplyTo);
  const referenceIds = sanitizeMessageId(references) || replyTo;
  const alternative = `----=_uni_alt_${randomBytes(8).toString('hex')}`;
  const mixed = `----=_uni_mix_${randomBytes(8).toString('hex')}`;

  const headers = [
    `From: ${formatAddress(sender)}`,
    ...(to.length ? [`To: ${to.map(formatAddress).join(', ')}`] : []),
    ...(cc.length ? [`Cc: ${cc.map(formatAddress).join(', ')}`] : []),
    `Subject: ${encodeHeaderText(subject)}`,
    `Date: ${mailDate(date)}`,
    `Message-ID: ${id}`,
    ...(replyTo ? [`In-Reply-To: ${replyTo}`] : []),
    ...(referenceIds ? [`References: ${referenceIds}`] : []),
    'MIME-Version: 1.0',
  ];

  const alternativeBody = [
    `--${alternative}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    wrapBase64(Buffer.from(text, 'utf8')),
    `--${alternative}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    wrapBase64(Buffer.from(textToHtml(text), 'utf8')),
    `--${alternative}--`,
  ].join(CRLF);

  let body;
  if (attachments.length === 0) {
    headers.push(`Content-Type: multipart/alternative; boundary="${alternative}"`);
    body = alternativeBody;
  } else {
    headers.push(`Content-Type: multipart/mixed; boundary="${mixed}"`);
    const parts = [
      `--${mixed}`,
      `Content-Type: multipart/alternative; boundary="${alternative}"`,
      '',
      alternativeBody,
    ];
    for (const attachment of attachments) {
      parts.push(
        `--${mixed}`,
        `Content-Type: ${attachment.type}; ${attachmentParameters(attachment.name)}`,
        'Content-Transfer-Encoding: base64',
        `Content-Disposition: attachment; ${attachmentParameters(attachment.name)}`,
        '',
        wrapBase64(attachment.bytes),
      );
    }
    parts.push(`--${mixed}--`);
    body = parts.join(CRLF);
  }

  return {
    messageId: id,
    envelope,
    raw: `${headers.join(CRLF)}${CRLF}${CRLF}${body}${CRLF}`,
  };
}

/** Lines that begin with a dot are doubled for SMTP DATA (RFC 5321 §4.5.2). */
export function dotStuff(raw) {
  const normalized = String(raw ?? '').replace(/\r?\n/g, CRLF);
  return normalized.replace(/(^|\r\n)\./g, `$1..`);
}
