/**
 * Full body of one message, read with `BODY.PEEK` (never marks it read). Plain
 * text is the default; sanitized HTML is an explicit choice in the app.
 */

import { BODY_BYTES, folderName, imapQuoted, mailFailure, mailUid, state } from './config.mjs';
import { charsetDecode, decodeQuotedPrintable, parseImapList, pickTextParts, stripMailHtml, textPreview } from './parse.mjs';
import { withSession } from './session.mjs';

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
 * Full text body of one message (`BODY.PEEK`, never marks it read): plain text by
 * default; when the part is HTML the raw markup goes out sanitized but the app starts
 * with the plain flatten — rendering HTML stays an explicit user choice.
 */
export async function loadMailBody(folderRaw, uidRaw) {
  if (!state.secrets) throw mailFailure('mail_not_configured');
  const folder = folderName(folderRaw);
  const uid = mailUid(uidRaw);
  const cacheKey = `${state.secrets.username}\u0000${folder}\u0000${uid}`;
  const cached = state.bodyCache.get(cacheKey);
  if (cached) return cached;
  const body = await withSession(state.secrets.username, state.secrets.password, async (session) => {
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
  if (state.bodyCache.size >= 50) state.bodyCache.delete(state.bodyCache.keys().next().value);
  state.bodyCache.set(cacheKey, body);
  return body;
}
