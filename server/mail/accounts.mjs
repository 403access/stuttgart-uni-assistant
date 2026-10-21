/**
 * Account lifecycle: prove the TIK credentials once, keep them in process
 * memory, and expose only the non-secret status to the app.
 */

import { clearMailState, mailFailure, mailService, state } from './config.mjs';
import { withSession } from './session.mjs';

export function publicMailStatus() {
  return {
    configured: Boolean(state.secrets),
    account: state.secrets ? state.secrets.username : null,
    address: state.secrets ? mailAddressFor(state.secrets.username) : null,
    webmail: mailService.webmail,
    imap: mailService.imap,
    smtp: mailService.smtp,
  };
}

export function forgetMailCredentials() {
  clearMailState();
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
  state.secrets = { username: account, password };
  return { ok: true, account, address: mailAddressFor(account) };
}
