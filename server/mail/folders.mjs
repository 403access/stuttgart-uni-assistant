/**
 * Mailbox listing: IMAP `LIST` lines in modified UTF-7, decoded for the app but
 * kept verbatim for the next `SELECT`.
 */

import { mailFailure, state } from './config.mjs';
import { withSession } from './session.mjs';

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

/** The mailboxes the account offers: one IMAP `LIST`, INBOX first, names kept verbatim. */
export async function loadMailFolders() {
  if (!state.secrets) throw mailFailure('mail_not_configured');
  return withSession(state.secrets.username, state.secrets.password, async (session) => {
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
