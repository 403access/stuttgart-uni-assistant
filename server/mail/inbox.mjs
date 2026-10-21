/**
 * Inbox rows: the newest messages of one mailbox with headers and a short
 * `BODY.PEEK` preview. Listing never sets a flag.
 */

import { HEADER_FIELDS, PREVIEW_BYTES, mailFailure, folderName, imapQuoted, state } from './config.mjs';
import { decodeMimeWords, parseHeaderBlock, textPreview } from './parse.mjs';
import { withSession } from './session.mjs';

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

/** Recent messages of one mailbox in IMAP sequence order (newest last). Read-only. */
export async function loadMailMessages(limitRaw, folderRaw) {
  if (!state.secrets) throw mailFailure('mail_not_configured');
  const limit = Math.max(1, Math.min(50, Number.isFinite(limitRaw) ? Number(limitRaw) : 25));
  const folder = folderName(folderRaw);
  return withSession(state.secrets.username, state.secrets.password, async (session) => {
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
