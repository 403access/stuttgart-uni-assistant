/**
 * UniMail (Exchange of Universität Stuttgart) over the IMAP interface of the TIK.
 *
 * The TIK documents imap.uni-stuttgart.de:993 with the short user id (st… / ac…)
 * and the account password as an official interface for mail clients
 * (https://www.tik.uni-stuttgart.de/en/support/faq-frequently-asked-questions/faqs-e-mail).
 * The webmail at https://mail.uni-stuttgart.de/ stays the browser surface; this module
 * reads the inbox server-side, so the app never talks to the university directly.
 *
 * Secrets: the password arrives per request from the app, is kept only in the memory of
 * this process (like the C@MPUS credentials) and is never logged, echoed or persisted.
 */

import { connect as tlsConnect } from 'node:tls';

import { buildMailMime, prepareMail } from './mail-mime.mjs';
import { sendSmtpMail } from './smtp.mjs';

export const mailService = {
  webmail: 'https://mail.uni-stuttgart.de/',
  imap: 'imap.uni-stuttgart.de:993',
  smtp: 'smtp.uni-stuttgart.de:587',
};

const IMAP_HOST = 'imap.uni-stuttgart.de';
const IMAP_PORT = 993;
const PREVIEW_BYTES = 1024;
const BODY_BYTES = 262_144;
const MAX_RESPONSE_BYTES = 4_000_000;
const COMMAND_TIMEOUT_MS = 30_000;
const HEADER_FIELDS = 'DATE FROM TO CC SUBJECT MESSAGE-ID';

let secrets = null; // { username, password } — process memory only.
const bodyCache = new Map(); // "account␀folder␀uid" → body — bounded, process memory only.
let sends = []; // timestamps of recent submissions for the per-minute guard.

export function publicMailStatus() {
  return {
    configured: Boolean(secrets),
    account: secrets ? secrets.username : null,
    address: secrets ? mailAddressFor(secrets.username) : null,
    webmail: mailService.webmail,
    imap: mailService.imap,
    smtp: mailService.smtp,
  };
}

export function forgetMailCredentials() {
  secrets = null;
  bodyCache.clear();
  sends = [];
  return { ok: true };
}

/** `st123456@stud.uni-stuttgart.de` → `st123456`; the IMAP login takes the short id. */
export function normalizeMailAccount(value) {
  const trimmed = String(value ?? '').trim();
  const at = trimmed.indexOf('@');
  const local = at >= 0 ? trimmed.slice(0, at) : trimmed;
  return local.toLowerCase();
}

export function mailAddressFor(account) {
  const id = String(account ?? '').trim().toLowerCase();
  if (!id) return '';
  return id.startsWith('st') ? `${id}@stud.uni-stuttgart.de` : `${id}@uni-stuttgart.de`;
}

function mailFailure(code, detail) {
  const error = new Error(code);
  if (detail) error.detail = String(detail).slice(0, 300);
  return error;
}

/** Shape check without trusting the value; the quoting tames quotes, backslashes and control bytes anyway. */
function assertAccount(account) {
  if (!/^[a-z][a-z0-9._-]{1,63}$/i.test(account)) throw mailFailure('bad_account');
}

/** Validate against the TIK IMAP server (a LOGIN that really opens the INBOX) and keep the credentials. */
export async function saveMailCredentials(input) {
  const account = normalizeMailAccount(input?.account);
  const password = String(input?.password ?? '');
  assertAccount(account);
  if (!password || password.length > 128) throw mailFailure('missing_password');
  await withSession(account, password, async () => undefined);
  secrets = { username: account, password };
  return { ok: true, account, address: mailAddressFor(account) };
}

/** The mailboxes the account offers: one IMAP `LIST`, INBOX first, names kept verbatim. */
export async function loadMailFolders() {
  if (!secrets) throw mailFailure('mail_not_configured');
  return withSession(secrets.username, secrets.password, async (session) => {
    const list = await session.command('LIST "" "*"');
    if (list.status !== 'OK') throw mailFailure('imap_error', list.text);
    const folders = parseListLines(list.lines);
    const inboxFirst = folders.sort((a, b) => {
      if (a.name.toUpperCase() === 'INBOX') return -1;
      if (b.name.toUpperCase() === 'INBOX') return 1;
      return a.name.localeCompare(b.name, 'de');
    });
    console.log(`[mail] folders ok count=${inboxFirst.length}`);
    return inboxFirst;
  });
}

/** RFC 3501 modified UTF-7 → Unicode: `Gel&APY-schte` → `Gelöschte`; plain names pass through untouched. */
export function decodeModifiedUtf7(value) {
  const text = String(value ?? '');
  if (!text.includes('&')) return text;
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+,';
  return text.replace(/&[A-Za-z0-9+,/]*-/g, (token) => {
    const body = token.slice(1, -1);
    if (body === '') return '&'; // `&-` encodes the literal ampersand
    let acc = 0;
    let bits = 0;
    const units = [];
    for (const char of body) {
      const value = alphabet.indexOf(char);
      if (value < 0) return token; // not UTF-7 after all: keep the raw token verbatim
      acc = (acc << 6) | value;
      bits += 6;
      while (bits >= 16) {
        bits -= 16;
        units.push((acc >> bits) & 0xffff);
        acc &= (1 << bits) - 1;
      }
    }
    return String.fromCharCode(...units);
  });
}

/**
 * The astring tokens after the flags of a LIST line: quoted strings and bare atoms
 * (escapes resolved, NIL kept as the literal `NIL`).
 */
function listAstrings(text) {
  const tokens = [];
  let at = 0;
  while (at < text.length) {
    while (text[at] === ' ') at += 1;
    if (at >= text.length) break;
    if (text[at] === '"') {
      at += 1;
      let quoted = '';
      while (at < text.length && text[at] !== '"') {
        if (text[at] === '\\' && text[at + 1] !== undefined) {
          quoted += text[at + 1];
          at += 2;
          continue;
        }
        quoted += text[at];
        at += 1;
      }
      at += 1;
      tokens.push(quoted);
    } else {
      let atom = '';
      while (at < text.length && text[at] !== ' ') {
        atom += text[at];
        at += 1;
      }
      tokens.push(atom);
    }
  }
  return tokens;
}

/**
 * `* LIST (\HasNoChildren) "/" "INBOX"` — the line is `(flags) <delimiter> <name>`, so the
 * mailbox name is the astring *after* the delimiter, which some servers send as a bare atom
 * (`"/" INBOX`) rather than a quoted string. Names dedupe on a Map (the same box can appear
 * in two listings); the `name` keeps the raw modified-UTF-7 form for `SELECT`, `display` is
 * decoded for people; anything without a name stays out.
 */
export function parseListLines(lines) {
  const byName = new Map();
  for (const pieces of lines) {
    const head = pieces.find((piece) => piece.kind === 'text' && /^\* LIST \(/.test(piece.text));
    if (!head) continue;
    const flags = /LIST \(([^)]*)\)/.exec(head.text)?.[1] ?? '';
    const selectable = !flags.includes('\\Noselect');
    let name = '';
    const bytesPiece = pieces.find((piece) => piece.kind === 'bytes');
    if (bytesPiece) {
      // The pieces keep every text segment; the literal directly after `{n}` is the mailbox name.
      name = bytesPiece.bytes.toString('utf8');
    } else {
      const afterFlags = head.text.slice(head.text.indexOf(') ') + 2);
      // tokens[0] is the hierarchy delimiter (quoted char or NIL); the mailbox name follows.
      const tokens = listAstrings(afterFlags);
      name = tokens.length >= 2 ? tokens[1] : tokens[0] ?? '';
    }
    name = name.trim();
    if (!name) continue;
    const known = byName.get(name);
    byName.set(name, { name, display: decodeModifiedUtf7(name), selectable: (known?.selectable ?? false) || selectable });
  }
  return [...byName.values()];
}

/** `UID STORE` line that adds or removes the `\Seen` flag, e.g. `UID STORE 42 +FLAGS (\Seen)`. */
export function seenStoreCommand(uid, seen) {
  return `UID STORE ${uid} ${seen ? '+FLAGS' : '-FLAGS'} (\\Seen)`;
}

/**
 * Set or clear the read flag of one message. The flag lives on the IMAP server, so the
 * change is visible in the university webmail too; `±FLAGS` is idempotent either way.
 */
export async function setMailSeen(folderRaw, uidRaw, seen) {
  if (!secrets) throw mailFailure('mail_not_configured');
  const folder = String(folderRaw ?? 'INBOX').trim().slice(0, 128) || 'INBOX';
  const uid = Math.floor(Number(uidRaw));
  if (!Number.isInteger(uid) || uid < 1 || uid > 999_999_999) throw mailFailure('bad_uid');
  const read = Boolean(seen);
  return withSession(secrets.username, secrets.password, async (session) => {
    const select = await session.command(`SELECT ${imapQuoted(folder)}`);
    if (select.status !== 'OK') throw mailFailure('imap_error', select.text);
    const store = await session.command(seenStoreCommand(uid, read));
    if (store.status !== 'OK') throw mailFailure('imap_error', store.text);
    console.log(`[mail] seen uid=${uid} seen=${read} folder=${folder}`);
    return { uid, seen: read };
  });
}

/** Copy of a sent message into the account's Sent mailbox (`APPEND`); failures never fail the send. */
export async function appendToSent(folderRaw, raw) {
  if (!secrets) throw mailFailure('mail_not_configured');
  const folder = String(folderRaw ?? '').trim().slice(0, 128);
  if (!folder) return false;
  const bytes = Buffer.from(String(raw ?? '').replace(/\r?\n/g, '\r\n'), 'utf8');
  if (!bytes.length) return false;
  return withSession(secrets.username, secrets.password, async (session) => {
    const append = await session.commandWithLiteral(`APPEND ${imapQuoted(folder)} (\\Seen)`, bytes);
    if (append.status !== 'OK') throw mailFailure('imap_error', append.text);
    return true;
  });
}

/**
 * Submit one message through SMTP (`smtp.uni-stuttgart.de:587`, STARTTLS) and
 * keep a copy in Sent when the client names that mailbox. The per-minute guard
 * keeps a stuck retry loop from becoming a mail flood.
 */
export async function sendMail(input) {
  if (!secrets) throw mailFailure('mail_not_configured');
  const now = Date.now();
  sends = sends.filter((at) => now - at < 60_000);
  if (sends.length >= 10) throw mailFailure('mail_rate_limited');
  sends.push(now);
  const prepared = prepareMail(input);
  const from = mailAddressFor(secrets.username);
  const built = buildMailMime({
    from,
    to: prepared.to,
    cc: prepared.cc,
    bcc: prepared.bcc,
    subject: prepared.subject,
    text: prepared.text,
    attachments: prepared.attachments,
    inReplyTo: input?.inReplyTo,
    references: input?.references,
  });
  const result = await sendSmtpMail({
    username: secrets.username,
    password: secrets.password,
    from,
    envelope: built.envelope,
    raw: built.raw,
  });
  let saved = false;
  if (input?.sentFolder) {
    try {
      saved = await appendToSent(input.sentFolder, built.raw);
    } catch (error) {
      console.log(`[mail] sent copy failed ${error.message}${error.detail ? ` detail=${error.detail}` : ''}`);
    }
  }
  return {
    messageId: built.messageId,
    accepted: result.accepted,
    rejected: result.rejected,
    saved,
    attachmentBytes: prepared.bytes,
  };
}

/** Recent messages of one mailbox in IMAP sequence order (newest last). Read-only. */
export async function loadMailMessages(limitRaw, folderRaw) {
  if (!secrets) throw mailFailure('mail_not_configured');
  const limit = Math.max(1, Math.min(50, Number.isFinite(limitRaw) ? Number(limitRaw) : 25));
  const folder = String(folderRaw ?? 'INBOX').trim().slice(0, 128) || 'INBOX';
  return withSession(secrets.username, secrets.password, async (session) => {
    const select = await session.command(`SELECT ${imapQuoted(folder)}`);
    if (select.status !== 'OK') throw mailFailure('imap_error', select.text);
    const exists = untaggedNumber(select.lines, 'EXISTS');
    if (!exists) return [];
    const first = Math.max(1, exists - limit + 1);
    const fetch = await session.command(
      `FETCH ${first}:${exists} (UID FLAGS INTERNALDATE BODY.PEEK[HEADER.FIELDS (${HEADER_FIELDS})] BODY.PEEK[TEXT]<0.${PREVIEW_BYTES}>)`,
    );
    if (fetch.status !== 'OK') throw mailFailure('imap_error', fetch.text);
    return parseFetchLines(fetch.lines);
  });
}

/**
 * Full text body of one message (`BODY.PEEK`, never marks it read): plain text by
 * default; when the part is HTML the raw markup goes out sanitized but the app starts
 * with the plain flatten — rendering HTML stays an explicit user choice.
 */
export async function loadMailBody(folderRaw, uidRaw) {
  if (!secrets) throw mailFailure('mail_not_configured');
  const folder = String(folderRaw ?? 'INBOX').trim().slice(0, 128) || 'INBOX';
  const uid = Math.floor(Number(uidRaw));
  if (!Number.isInteger(uid) || uid < 1 || uid > 999_999_999) throw mailFailure('bad_uid');
  const cacheKey = `${secrets.username}\u0000${folder}\u0000${uid}`;
  const cached = bodyCache.get(cacheKey);
  if (cached) return cached;
  const body = await withSession(secrets.username, secrets.password, async (session) => {
    const select = await session.command(`SELECT ${imapQuoted(folder)}`);
    if (select.status !== 'OK') throw mailFailure('imap_error', select.text);

    // The body structure names the real leaf parts; fetching a specific section keeps
    // MIME part headers and boundaries out of the view (the whole TEXT section would
    // show `Content-Type: …` and boundary noise for every multipart message).
    const structure = await session.command(`UID FETCH ${uid} (BODYSTRUCTURE)`);
    if (structure.status !== 'OK') throw mailFailure('imap_error', structure.text);
    const structureText = bodyStructureText(structure.lines);
    const leaves = structureText ? pickTextParts(parseImapList(structureText)) : { plain: null, html: null };
    const wanted = [leaves.plain, leaves.html].filter(Boolean);

    if (wanted.length === 0) {
      // No usable structure: fall back to the whole TEXT section, flattened as before.
      const fetch = await session.command(`UID FETCH ${uid} (UID BODY.PEEK[TEXT])`);
      if (fetch.status !== 'OK') throw mailFailure('imap_error', fetch.text);
      const bytes = sectionContents(fetch.lines, ['TEXT']).get('TEXT');
      if (!bytes) return { text: '', html: null, truncated: false };
      const truncated = bytes.length > BODY_BYTES;
      const working = truncated ? bytes.subarray(0, BODY_BYTES) : bytes;
      const head = working.subarray(0, 1024).toString('utf8');
      const isHtml = /<(!doctype|html|body|table|div|p|span|br|img|a|td|tr|head|meta|ul|ol|li|h[1-6]|font)\b/i.test(head);
      if (isHtml) {
        const html = stripMailHtml(working.toString('utf8'));
        return { text: textPreview(Buffer.from(html), 16_000), html, truncated };
      }
      const latin = /charset=["']?(?:iso-8859-1|windows-1252|latin1)\b/i.test(head);
      return { text: working.toString(latin ? 'latin1' : 'utf8').replace(/\r\n/g, '\n').slice(0, 48_000), html: null, truncated };
    }

    const fetch = await session.command(`UID FETCH ${uid} (${wanted.map((leaf) => `BODY.PEEK[${leaf.path}]`).join(' ')})`);
    if (fetch.status !== 'OK') throw mailFailure('imap_error', fetch.text);
    const contents = sectionContents(fetch.lines, wanted.map((leaf) => leaf.path));
    const readSection = (leaf) => {
      const bytes = contents.get(leaf.path);
      if (!bytes) return null;
      return charsetDecode(decodeBodySection(bytes, leaf), leaf.charset);
    };
    const plain = leaves.plain ? readSection(leaves.plain) : null;
    let html = null;
    if (leaves.html) {
      const raw = readSection(leaves.html);
      html = raw ? stripMailHtml(raw.slice(0, BODY_BYTES)) : null;
    }
    const traded = (plain?.length ?? 0) + (html?.length ?? 0);
    let text = plain ? plain.replace(/\r\n/g, '\n').slice(0, 48_000) : '';
    if (!text && html) text = textPreview(Buffer.from(html), 16_000);
    return { text, html, truncated: traded > BODY_BYTES };
  });
  if (bodyCache.size >= 50) bodyCache.delete(bodyCache.keys().next().value);
  bodyCache.set(cacheKey, body);
  return body;
}

/** The `BODYSTRUCTURE` payload of a `UID FETCH` reply: inline text piece or byte literal. */
function bodyStructureText(lines) {
  for (const pieces of lines) {
    const head = pieces.find((piece) => piece.kind === 'text' && piece.text.includes('BODYSTRUCTURE'));
    if (!head) continue;
    if (/\{\d+\}$/.test(head.text.trim())) {
      const bytes = pieces.find((piece) => piece.kind === 'bytes');
      return bytes ? bytes.bytes.toString('latin1') : '';
    }
    const at = head.text.indexOf('BODYSTRUCTURE');
    return head.text.slice(at + 'BODYSTRUCTURE'.length).trim();
  }
  return '';
}

/** Collect literal sections (`BODY[1.1] {n}` → bytes) of one FETCH reply into a map. */
function sectionContents(lines, wanted) {
  const names = new Set(wanted.map((path) => path.toUpperCase()));
  const map = new Map();
  for (const pieces of lines) {
    let section = null;
    for (const piece of pieces) {
      if (piece.kind === 'text') {
        const match = /BODY\[([^\]]+)\](?:<\d+>)?\s*\{\d+\}$/.exec(piece.text);
        section = match && names.has(match[1].toUpperCase()) ? match[1].toUpperCase() : null;
      } else if (piece.kind === 'bytes' && section) {
        map.set(section, map.has(section) ? Buffer.concat([map.get(section), piece.bytes]) : piece.bytes);
      }
    }
  }
  return map;
}

/** Body section bytes → decoded bytes: QP/base64 when still encoded (Exchange does not decode). */
function decodeBodySection(bytes, leaf) {
  const encoding = String(leaf.encoding ?? '').toUpperCase();
  const raw = bytes.toString('latin1');
  if (encoding === 'QUOTED-PRINTABLE' && /=[0-9A-Fa-f]|=\r?\n/.test(raw)) return decodeQuotedPrintable(bytes);
  if (encoding === 'BASE64' && /^[A-Za-z0-9+/=\r\n]+$/.test(raw)) return Buffer.from(raw.replace(/[\r\n]+/g, ''), 'base64');
  return bytes;
}

/**
 * Quoted-printable at byte level: soft line breaks (`=\r\n`) vanish, `=XX` octets turn
 * back into bytes; everything else passes through so the charset decode sees the truth.
 */
export function decodeQuotedPrintable(bytes) {
  const raw = bytes.toString('latin1');
  const out = [];
  for (let index = 0; index < raw.length; index++) {
    const char = raw[index];
    if (char === '=') {
      const next = raw[index + 1];
      if (next === '\r' || next === '\n') {
        index += next === '\r' && raw[index + 2] === '\n' ? 2 : 1;
        continue;
      }
      const hex = raw.slice(index + 1, index + 3);
      if (/^[0-9A-Fa-f]{2}$/.test(hex)) {
        out.push(Number.parseInt(hex, 16));
        index += 2;
        continue;
      }
    }
    out.push(char.charCodeAt(0) & 0xff);
  }
  return Buffer.from(out);
}

/** Decoded body bytes → text with the part's charset. */
function charsetDecode(buffer, charset) {
  const cs = String(charset ?? '').toLowerCase();
  if (/(8859|1252|latin1)/.test(cs)) return buffer.toString('latin1');
  if (/utf-?16/.test(cs)) return buffer.toString('utf16le');
  return buffer.toString('utf8');
}

/**
 * BODYSTRUCTURE into a JS tree: `(` lists, `"strings"` with backslash escapes, NIL and
 * bare atoms; one call consumes the leading value and stops (the rest is not needed).
 */
export function parseImapList(text) {
  const src = String(text ?? '');
  let at = 0;
  function readValue() {
    while (src[at] === ' ') at++;
    if (src[at] === '(') {
      at++;
      const list = [];
      for (;;) {
        while (src[at] === ' ') at++;
        if (src[at] === undefined) return list;
        if (src[at] === ')') {
          at++;
          return list;
        }
        list.push(readValue());
      }
    }
    if (src[at] === '"') {
      at++;
      let out = '';
      while (at < src.length && src[at] !== '"') {
        if (src[at] === '\\' && src[at + 1]) {
          out += src[at + 1];
          at += 2;
          continue;
        }
        out += src[at];
        at++;
      }
      at++;
      return out;
    }
    let atom = '';
    while (at < src.length && src[at] !== ' ' && src[at] !== ')') {
      atom += src[at];
      at++;
    }
    return /^NIL$/i.test(atom) ? null : atom;
  }
  return readValue();
}

/**
 * The text leaves of a structure with their IMAP section paths, charsets and transfer
 * encodings: `text/plain` wins for the default view, `text/html` feeds the opt-in HTML view.
 */
export function pickTextParts(node) {
  const found = { plain: null, html: null };
  function charsetOf(part) {
    const params = Array.isArray(part[2]) ? part[2] : [];
    for (let index = 0; index + 1 < params.length; index += 2) {
      if (String(params[index]).toUpperCase() === 'CHARSET') return String(params[index + 1]);
    }
    return null;
  }
  function walk(current, prefix) {
    if (!Array.isArray(current)) return;
    if (Array.isArray(current[0])) {
      // A multipart part: the children get the numbered sub-paths.
      let index = 0;
      for (const child of current) {
        if (!Array.isArray(child)) continue; // the trailing subtype string and the extension list
        index += 1;
        walk(child, prefix ? `${prefix}.${index}` : String(index));
      }
      return;
    }
    const type = String(current[0] ?? '').toUpperCase();
    if (type === 'MESSAGE' && String(current[1] ?? '').toUpperCase() === 'RFC822') {
      // A forwarded message rides inside its own structure (… envelope, body …).
      const inner = current[8];
      if (Array.isArray(inner)) walk(inner, prefix);
      return;
    }
    if (type !== 'TEXT') return;
    const subtype = String(current[1] ?? '').toUpperCase();
    const leaf = { path: prefix || '1', charset: charsetOf(current), encoding: String(current[5] ?? '').toUpperCase() };
    if (subtype === 'PLAIN' && !found.plain) found.plain = leaf;
    else if ((subtype === 'HTML' || subtype === 'ENRICHED') && !found.html) found.html = leaf;
  }
  walk(node, '');
  return found;
}

/**
 * Defense in depth before any HTML leaves the server: script blocks (even unterminated)
 * out, event handler attributes out, meta-refresh redirects out. The WebView adds its own
 * no-JavaScript and no-navigation rules on top.
 */
export function stripMailHtml(html) {
  return String(html)
    .replace(/<script\b[^>]*>[\s\S]*?(?:<\/script>|$)/gi, ' ')
    .replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, ' ')
    .replace(/<meta\b[^>]*http-equiv=["']?refresh[^>]*>/gi, ' ');
}

function imapQuoted(value) {
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/** `* 42 EXISTS` and friends: the number of the matching untagged line, else 0. */
function untaggedNumber(lines, marker) {
  for (const pieces of lines) {
    const joined = pieces
      .filter((piece) => piece.kind === 'text')
      .map((piece) => piece.text)
      .join('');
    const match = new RegExp(`^\\* (\\d+) ${marker}$`).exec(joined.trim());
    if (match) return Number(match[1]);
  }
  return 0;
}

/**
 * Minimal IMAP session over TLS. The reader keeps the pieces of each response line
 * apart: text chunks plus inline `{n}` literal byte blocks, so mail bytes never
 * shift the byte-accurate literal counting.
 */
class ImapSession {
  constructor() {
    this.closed = false;
    this.tagSeq = 0;
    this.buffer = Buffer.alloc(0);
    this.literalRemain = null; // bytes still expected for the inline literal
    this.pieces = []; // { kind: 'text', text } | { kind: 'bytes', bytes }
    this.pending = null; // { tag, lines, resolve, reject, timer }
    this.queue = Promise.resolve();
    this.socket = tlsConnect({ host: IMAP_HOST, port: IMAP_PORT, servername: IMAP_HOST });
    this.socket.setTimeout(COMMAND_TIMEOUT_MS, () => this.fail(mailFailure('imap_timeout')));
    this.socket.on('data', (chunk) => this.consume(chunk));
    this.socket.on('error', (error) => {
      if (this.closed) return;
      this.fail(mailFailure('mail_network', error.message));
    });
    this.socket.on('close', () => {
      if (this.closed) return;
      this.fail(mailFailure('mail_disconnected'));
    });
  }

  /** Resolves once the TLS handshake is done; the greeting itself needs no handling. */
  ready() {
    return new Promise((resolve, reject) => {
      if (this.socket.readyState === 'open') {
        resolve();
        return;
      }
      const onSecure = () => {
        cleanup();
        resolve();
      };
      const onError = (error) => {
        cleanup();
        reject(mailFailure('mail_network', error.message));
      };
      const cleanup = () => {
        this.socket.off('secureConnect', onSecure);
        this.socket.removeListener('error', onError);
      };
      this.socket.on('secureConnect', onSecure);
      this.socket.on('error', onError);
    });
  }

  command(text) {
    return this.enqueue(text);
  }

  /** Command with a trailing `{n}` literal, e.g. `APPEND "Sent" (\\Seen)`. */
  commandWithLiteral(text, bytes) {
    return this.enqueue(text, Buffer.from(bytes));
  }

  enqueue(text, literal = null) {
    const run = () =>
      new Promise((resolve, reject) => {
        if (this.pending) {
          reject(mailFailure('imap_busy'));
          return;
        }
        if (this.closed) {
          reject(mailFailure('mail_disconnected'));
          return;
        }
        const tag = `A${++this.tagSeq}`;
        const timer = setTimeout(() => this.fail(mailFailure('imap_timeout')), COMMAND_TIMEOUT_MS);
        this.pending = { tag, lines: [], resolve, reject, timer, literal };
        this.socket.write(literal ? `${tag} ${text} {${literal.length}}\r\n` : `${tag} ${text}\r\n`);
      });
    const result = this.queue.then(run, run);
    this.queue = result.catch(() => undefined);
    return result;
  }

  consume(chunk) {
    if (this.closed) return;
    this.buffer = Buffer.concat([this.buffer, chunk]);
    let guard = 0;
    while (guard++ < 100000) {
      if (this.literalRemain !== null) {
        if (this.buffer.length < this.literalRemain) return;
        const bytes = this.buffer.subarray(0, this.literalRemain);
        this.buffer = this.buffer.subarray(this.literalRemain);
        this.pieces.push({ kind: 'bytes', bytes });
        this.literalRemain = null;
        continue;
      }
      const eol = this.buffer.indexOf('\r\n');
      if (eol === -1) {
        if (this.buffer.length > MAX_RESPONSE_BYTES) this.fail(mailFailure('imap_too_large'));
        return;
      }
      const text = this.buffer.subarray(0, eol).toString('latin1');
      this.buffer = this.buffer.subarray(eol + 2);
      const literal = /\{(\d+)\}$/.exec(text);
      this.pieces.push({ kind: 'text', text });
      if (literal) {
        this.literalRemain = Number(literal[1]);
        if (this.literalRemain > MAX_RESPONSE_BYTES) {
          this.fail(mailFailure('imap_too_large'));
          return;
        }
        continue;
      }
      this.finishLine();
    }
  }

  finishLine() {
    const joined = this.pieces
      .filter((piece) => piece.kind === 'text')
      .map((piece) => piece.text)
      .join('');
    const line = this.pieces;
    this.pieces = [];
    if (!this.pending) return; // greeting or a server update without a pending command
    this.pending.lines.push(line);
    // A `+` continuation asks for the literal of an APPEND command.
    if (this.pending.literal && joined.startsWith('+')) {
      const bytes = this.pending.literal;
      this.pending.literal = null;
      this.socket.write(bytes);
      this.socket.write('\r\n');
      return;
    }
    if (joined.startsWith(`${this.pending.tag} `)) {
      const rest = joined.slice(this.pending.tag.length + 1);
      const status = rest.split(' ', 1)[0]?.toUpperCase() ?? '';
      const finished = this.pending;
      this.pending = null;
      clearTimeout(finished.timer);
      finished.resolve({ status, text: rest.slice(status.length).trim(), lines: finished.lines });
    }
  }

  fail(error) {
    if (this.closed) return;
    this.closed = true;
    if (this.pending) {
      clearTimeout(this.pending.timer);
      this.pending.reject(error);
      this.pending = null;
    }
    this.socket.destroy();
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.socket.destroy();
  }
}

async function withSession(username, password, work) {
  const session = new ImapSession();
  try {
    await session.ready();
    const login = await session.command(`LOGIN ${imapQuoted(username)} ${imapQuoted(password)}`);
    if (login.status !== 'OK') throw mailFailure('mail_auth_failed', login.text);
    return await work(session);
  } finally {
    if (!session.closed) session.command('LOGOUT').catch(() => undefined);
    session.close();
  }
}

/** Turn one FETCH response into a message row; header and preview byte blocks are matched positionally. */
export function parseFetchLines(lines) {
  return lines.flatMap((pieces) => {
    const headText = pieces.find((piece) => piece.kind === 'text')?.text ?? '';
    if (!/^\* \d+ FETCH \(/.test(headText)) return [];
    // Text pieces only: FLAGS/UID/INTERNALDATE and the markers of the byte blocks live there.
    const combined = pieces
      .filter((piece) => piece.kind === 'text')
      .map((piece) => piece.text)
      .join('\u240a0');
    const uidMatch = /\bUID (\d+)/.exec(combined);
    if (!uidMatch) return [];
    const flags = /FLAGS \(([^)]*)\)/.exec(combined)?.[1] ?? '';
    const internalDate = /INTERNALDATE "([^"]+)"/.exec(combined)?.[1] ?? '';
    const seen = flags.includes('\\Seen');
    let headerBytes = null;
    let previewBytes = null;
    for (let index = 0; index < pieces.length; index++) {
      const piece = pieces[index];
      if (piece.kind !== 'bytes') continue;
      const before = pieces[index - 1];
      if (headerBytes === null && before?.kind === 'text' && /BODY\[HEADER\.FIELDS[^\]]*\]\s*\{\d+\}$/.test(before.text)) headerBytes = piece.bytes;
      if (previewBytes === null && before?.kind === 'text' && /BODY\[TEXT\](?:<0\>)?\s*\{\d+\}$/.test(before.text)) previewBytes = piece.bytes;
    }
    const headers = headerBytes ? parseHeaderBlock(headerBytes) : {};
    const dateSource = headers.date && !Number.isNaN(Date.parse(headers.date)) ? headers.date : internalDate;
    const date = dateSource && !Number.isNaN(Date.parse(dateSource)) ? new Date(dateSource).toISOString() : '';
    return [
      {
        uid: Number(uidMatch[1]),
        seen,
        date,
        from: decodeMimeWords(headers.from ?? ''),
        to: decodeMimeWords(headers.to ?? ''),
        cc: decodeMimeWords(headers.cc ?? ''),
        subject: decodeMimeWords(headers.subject ?? ''),
        messageId: String(headers['message-id'] ?? '').trim(),
        preview: previewBytes ? textPreview(previewBytes) : '',
      },
    ];
  });
}

/** RFC 822 header block with folded continuation lines folded back onto their name. */
export function parseHeaderBlock(buffer) {
  const raw = Buffer.isBuffer(buffer) ? buffer.toString('utf8') : String(buffer);
  const folded = [];
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) continue;
    if ((line.startsWith(' ') || line.startsWith('\t')) && folded.length) folded[folded.length - 1] += ` ${line.trim()}`;
    else folded.push(line);
  }
  const headers = {};
  for (const line of folded) {
    const at = line.indexOf(':');
    if (at < 1) continue;
    const name = line.slice(0, at).trim().toLowerCase();
    if (!(name in headers)) headers[name] = line.slice(at + 1).trim();
  }
  return headers;
}

/** RFC 2047 encoded words (=?utf-8?B?…?= / =?utf-8?Q?…?=) into readable text. */
export function decodeMimeWords(value) {
  return String(value ?? '')
    .replace(/=\?([^?]+)\?([bBqQ])\?([^?]*)\?=/g, (match, _charset, encoding, data) => {
      try {
        if (encoding.toLowerCase() === 'b') return Buffer.from(data, 'base64').toString('utf8');
        const bytes = [];
        for (const char of data.replace(/_/g, ' ').replace(/=([0-9A-Fa-f]{2})/g, (_all, hex) => String.fromCharCode(parseInt(hex, 16)))) {
          bytes.push(char.charCodeAt(0) & 0xff);
        }
        return Buffer.from(bytes).toString('utf8');
      } catch {
        return match;
      }
    })
    .replace(/\s+/g, ' ')
    .trim();
}

/** Body excerpt as flat text: charset fallback, tags out, entities read back, whitespace folded. */
export function textPreview(buffer, max = 400) {
  const head = buffer.subarray(0, 512).toString('utf8');
  const latin = /charset=["']?(?:iso-8859-1|windows-1252|latin1)\b/i.test(head);
  let text = (latin ? buffer.toString('latin1') : buffer.toString('utf8')).replace(/<!--[\s\S]*?-->/g, ' ');
  text = text
    .replace(/\s*<style[\s\S]*?<\/style>\s*/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_all, code) => String.fromCodePoint(Number(code) || 65));
  return text.replace(/\s+/g, ' ').trim().slice(0, max);
}
