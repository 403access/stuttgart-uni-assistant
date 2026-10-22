/**
 * Mailbox mutations: read flag handling and outgoing SMTP submission with a
 * copy in Sent. The SMTP/MIME building itself lives in `../mail-mime.mjs` and
 * `../smtp.mjs`.
 */

import { buildMailMime, prepareMail } from '../mail-mime.mjs';
import { sendSmtpMail } from '../smtp.mjs';
import { mailAddressFor } from './accounts.mjs';
import { folderName, imapQuoted, mailFailure, mailUid, state } from './config.mjs';
import { withSession } from './session.mjs';
import { logService } from '../service-log.mjs';

/** `UID STORE` line that adds or removes the `\Seen` flag, e.g. `UID STORE 42 +FLAGS (\Seen)`. */
export function seenStoreCommand(uid, seen) {
  return `UID STORE ${uid} ${seen ? '+FLAGS' : '-FLAGS'} (\\Seen)`;
}

/**
 * Set or clear the read flag of one message. The flag lives on the IMAP server, so the
 * change is visible in the university webmail too; `±FLAGS` is idempotent either way.
 */
export async function setMailSeen(folderRaw, uidRaw, seen) {
  if (!state.secrets) throw mailFailure('mail_not_configured');
  const folder = folderName(folderRaw);
  const uid = mailUid(uidRaw);
  const read = Boolean(seen);
  return withSession(state.secrets.username, state.secrets.password, async (session) => {
    const select = await session.command(`SELECT ${imapQuoted(folder)}`);
    if (select.status !== 'OK') throw mailFailure('imap_error', select.text);
    const store = await session.command(seenStoreCommand(uid, read));
    if (store.status !== 'OK') throw mailFailure('imap_error', store.text);
    logService('mail', 'info', `seen uid=${uid} seen=${read} folder=${folder}`);
    return { uid, seen: read };
  });
}

/** Copy of a sent message into the account's Sent mailbox (`APPEND`); failures never fail the send. */
export async function appendToSent(folderRaw, raw) {
  if (!state.secrets) throw mailFailure('mail_not_configured');
  const folder = String(folderRaw ?? '').trim().slice(0, 128);
  if (!folder) return false;
  const bytes = Buffer.from(String(raw ?? '').replace(/\r?\n/g, '\r\n'), 'utf8');
  if (!bytes.length) return false;
  return withSession(state.secrets.username, state.secrets.password, async (session) => {
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
  if (!state.secrets) throw mailFailure('mail_not_configured');
  const now = Date.now();
  state.sends = state.sends.filter((at) => now - at < 60_000);
  if (state.sends.length >= 10) throw mailFailure('mail_rate_limited');
  state.sends.push(now);
  const prepared = prepareMail(input);
  const from = mailAddressFor(state.secrets.username);
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
    username: state.secrets.username,
    password: state.secrets.password,
    from,
    envelope: built.envelope,
    raw: built.raw,
  });
  let saved = false;
  if (input?.sentFolder) {
    try {
      saved = await appendToSent(input.sentFolder, built.raw);
    } catch (error) {
      logService('mail', 'warn', `sent copy failed ${error.message}${error.detail ? ` detail=${error.detail}` : ''}`);
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
