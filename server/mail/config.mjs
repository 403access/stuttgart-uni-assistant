/**
 * UniMail process state and shared protocol constants. Everything here is
 * process memory only: the credentials, the bounded body cache, and the send
 * timestamps for the rate guard.
 */

export const mailService = {
  webmail: 'https://mail.uni-stuttgart.de/',
  imap: 'imap.uni-stuttgart.de:993',
  smtp: 'smtp.uni-stuttgart.de:587',
};

export const IMAP_HOST = 'imap.uni-stuttgart.de';
export const IMAP_PORT = 993;
export const PREVIEW_BYTES = 1024;
export const BODY_BYTES = 262_144;
export const MAX_RESPONSE_BYTES = 4_000_000;
export const COMMAND_TIMEOUT_MS = 30_000;
export const HEADER_FIELDS = 'DATE FROM TO CC SUBJECT MESSAGE-ID';

export const state = {
  /** `{ username, password }` — process memory only. */
  secrets: null,
  /** `"account␀folder␀uid"` → body — bounded, process memory only. */
  bodyCache: new Map(),
  /** Timestamps of recent submissions for the per-minute guard. */
  sends: [],
};

export function clearMailState() {
  state.secrets = null;
  state.bodyCache.clear();
  state.sends = [];
}

export function mailFailure(code, detail) {
  const error = new Error(code);
  if (detail) error.detail = String(detail).slice(0, 300);
  return error;
}

/** Quoted IMAP astring; quotes, backslashes and control bytes are tamed here. */
export function imapQuoted(value) {
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/** One mailbox name from a query parameter: trimmed, bounded, INBOX by default. */
export function folderName(raw) {
  return String(raw ?? 'INBOX').trim().slice(0, 128) || 'INBOX';
}

/** One message uid; malformed values never reach a command. */
export function mailUid(raw) {
  const uid = Math.floor(Number(raw));
  if (!Number.isInteger(uid) || uid < 1 || uid > 999_999_999) throw mailFailure('bad_uid');
  return uid;
}
