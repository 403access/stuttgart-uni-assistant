import { assistantUrl } from '@/src/assistant/remote';
import { tx } from '@/src/text';
import type { MailBody, MailFolder, MailMessage, MailStatus } from '@/src/types';

/**
 * UniMail (https://mail.uni-stuttgart.de/) — Exchange of Universität Stuttgart.
 * The TIK documents imap.uni-stuttgart.de:993 as the interface for mail clients; the
 * assistant server uses it with the entered st-account so the password stays server-side
 * (process memory) and the app only sees status and message rows.
 */

export const UNIMAIL_WEBMAIL = 'https://mail.uni-stuttgart.de/';
export const UNIMAIL_IMAP = 'imap.uni-stuttgart.de:993';

const DISCONNECTED_STATUS: MailStatus = {
  configured: false,
  account: null,
  address: null,
  webmail: UNIMAIL_WEBMAIL,
  imap: UNIMAIL_IMAP,
};

/**
 * Tiny shared snapshot: the inbox tab and the pushed connection screen both mirror it,
 * so a change made on one screen (connect, disconnect, fresh inbox) is visible on the
 * other the moment this app returns to it.
 */
export interface MailSnapshot {
  status: MailStatus | null;
  messages: MailMessage[] | null;
  /** Folders as listed by the server (null until first fetched). */
  folders: MailFolder[] | null;
  /** Mailbox the current messages came from ('INBOX' by default). */
  folder: string | null;
}

let snapshot: MailSnapshot = { status: null, messages: null, folders: null, folder: null };
const listeners = new Set<() => void>();

function publish(next: Partial<MailSnapshot>) {
  snapshot = { ...snapshot, ...next };
  for (const listener of listeners) listener();
}

export function subscribeMailSnapshot(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getMailSnapshot(): MailSnapshot {
  return snapshot;
}


export interface MailCredentialsFailure {
  error?: string;
  detail?: string;
  status?: number;
}

function endpoint(path: string): string {
  return `${assistantUrl.replace(/\/$/, '')}${path}`;
}

function mailFailure(payload: unknown, fallback: string, httpStatus?: number): Error {
  const body = (payload ?? {}) as MailCredentialsFailure;
  const code = typeof body.error === 'string' && body.error ? body.error : fallback;
  const error = new Error(code);
  const detail = typeof body.detail === 'string' && body.detail ? body.detail : '';
  const resolved = detail || (typeof httpStatus === 'number' ? `http ${httpStatus} vom Assistenz-Server ohne Detail — 'npm run assistant' neu starten` : '');
  if (resolved) (error as { detail?: string }).detail = resolved.slice(0, 300);
  return error;
}

export function mailDetail(caught: unknown): string {
  if (!caught || typeof caught !== 'object') return '';
  const detail = (caught as { detail?: unknown }).detail;
  return typeof detail === 'string' ? detail : '';
}

export function asMailMessages(value: unknown): MailMessage[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const message = item as Partial<MailMessage>;
    if (typeof message.uid !== 'number') return [];
    return [
      {
        uid: message.uid,
        seen: Boolean(message.seen),
        date: typeof message.date === 'string' ? message.date : '',
        from: typeof message.from === 'string' ? message.from : '',
        to: typeof message.to === 'string' ? message.to : '',
        subject: typeof message.subject === 'string' ? message.subject : '',
        preview: typeof message.preview === 'string' ? message.preview : '',
      },
    ];
  });
}

export function asMailFolders(value: unknown): MailFolder[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const folder = item as { name?: unknown; display?: unknown; selectable?: unknown };
    if (typeof folder.name !== 'string' || !folder.name) return [];
    return [
      {
        name: folder.name,
        display: typeof folder.display === 'string' && folder.display ? folder.display : folder.name,
        selectable: Boolean(folder.selectable),
      },
    ];
  });
}

/** Server status: whether credentials are held and under which account. Secrets never leave it. */
export async function fetchMailStatus(): Promise<MailStatus | null> {
  try {
    const response = await fetch(endpoint('/v1/mail/config'));
    if (!response.ok) return null;
    const payload = (await response.json()) as MailStatus;
    if (typeof payload.configured !== 'boolean') return null;
    publish({ status: payload });
    return payload;
  } catch {
    return null;
  }
}

/**
 * Hand the st-account and password to the assistant server. The server proves the pair
 * against the TIK IMAP service before keeping it; the app doesn't store the secret.
 */
export async function submitMailCredentials(input: { account: string; password: string }, token?: string | null): Promise<{ account: string; address: string }> {
  const url = endpoint('/v1/mail/credentials');
  console.info('[mail-credentials] POST', url);
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ account: input.account.trim(), password: input.password }),
    });
  } catch {
    throw new Error('server_unreachable');
  }
  const payload = (await response.json().catch(() => ({}))) as { account?: unknown; address?: unknown } & MailCredentialsFailure;
  console.info('[mail-credentials] status', response.status, payload.error ?? payload.account ?? 'ok');
  if (!response.ok) throw mailFailure(payload, 'mail_failed', response.status);
  if (typeof payload.account !== 'string' || !payload.account) throw mailFailure({ error: 'mail_unexpected' }, 'mail_unexpected', response.status);
  const account = payload.account;
  const address = typeof payload.address === 'string' ? payload.address : '';
  await fetchMailStatus(); // publishes the fresh connected status for every screen
  return { account, address };
}

/** Inbox read through the assistant server (IMAP `SELECT …` then `FETCH … BODY.PEEK`). */
export async function loadMailMessages(limit = 25, folder = 'INBOX'): Promise<MailMessage[]> {
  const url = endpoint(`/v1/mail/messages?limit=${limit}&folder=${encodeURIComponent(folder)}`);
  console.info('[mail-messages] GET', url);
  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    throw new Error('server_unreachable');
  }
  const payload = (await response.json().catch(() => ({}))) as { messages?: unknown } & MailCredentialsFailure;
  console.info('[mail-messages] status', response.status, payload.error ?? 'ok');
  if (!response.ok) throw mailFailure(payload, 'mail_failed', response.status);
  const messages = asMailMessages(payload.messages);
  publish({ messages, folder });
  return messages;
}

/**
 * Full body of one message, read through the assistant server (`BODY.PEEK`, so nothing is
 * marked read). The server never exposes raw active content: script blocks, event handler
 * attributes and meta-refresh are already stripped when the HTML lands here.
 */
export async function fetchMailBody(folder: string, uid: number): Promise<MailBody> {
  const url = endpoint(`/v1/mail/body?folder=${encodeURIComponent(folder)}&uid=${encodeURIComponent(String(uid))}`);
  console.info('[mail-body] GET', url);
  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    throw new Error('server_unreachable');
  }
  const payload = (await response.json().catch(() => ({}))) as Partial<MailBody> & MailCredentialsFailure;
  console.info('[mail-body] status', response.status, payload.error ?? 'ok');
  if (!response.ok) throw mailFailure(payload, 'mail_failed', response.status);
  return {
    text: typeof payload.text === 'string' ? payload.text : '',
    html: typeof payload.html === 'string' && payload.html ? payload.html : null,
    truncated: Boolean(payload.truncated),
  };
}

/** The mailboxes the account offers (INBOX, sent, drafts, …), straight from IMAP `LIST`. */export async function fetchMailFolders(): Promise<MailFolder[]> {
  const url = endpoint('/v1/mail/folders');
  console.info('[mail-folders] GET', url);
  let folders: MailFolder[] = [];
  try {
    const response = await fetch(url);
    if (response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { folders?: unknown };
      folders = asMailFolders(payload.folders);
    }
  } catch {
    folders = [];
  } finally {
    publish({ folders });
  }
  return folders;
}

/** Which well-known role a mailbox plays; anything unrecognized is a plain `other` folder. */
export type FolderKind = 'inbox' | 'sent' | 'drafts' | 'trash' | 'junk' | 'archive' | 'other';

export function folderKind(name: string): FolderKind {
  const lower = name.toLowerCase();
  if (lower.includes('inbox') || lower.includes('posteingang')) return 'inbox';
  if (lower.includes('gesendet') || lower.includes('sent')) return 'sent';
  if (lower.includes('entwurf') || lower.includes('draft')) return 'drafts';
  if (lower.includes('papierkorb') || lower.includes('trash') || lower.includes('deleted')) return 'trash';
  if (lower.includes('junk') || lower.includes('spam')) return 'junk';
  if (lower.includes('archiv') || lower.includes('archive')) return 'archive';
  return 'other';
}

/**
 * Friendly folder names for the dropdown: the well-known mailboxes get localized
 * labels, everything else shows its last path segment (Exchange uses paths like
 * "Gesendete Elemente" verbatim, so the fallback stays close to the real name).
 */
export function folderLabel(name: string, locale: 'de' | 'en'): string {
  const kind = folderKind(name);
  if (kind === 'inbox') return tx(locale, 'mail.posteingang');
  if (kind === 'sent') return tx(locale, 'mail.gesendet');
  if (kind === 'drafts') return tx(locale, 'mail.entwuerfe');
  if (kind === 'trash') return tx(locale, 'mail.papierkorb');
  if (kind === 'junk') return tx(locale, 'mail.junk');
  if (kind === 'archive') return tx(locale, 'mail.archiv');
  const segments = name.split(/[/.]/).filter(Boolean);
  return segments[segments.length - 1] ?? name;
}

/** Drop the held credentials on the server. */
export async function forgetMail(token?: string | null): Promise<void> {
  const url = endpoint('/v1/mail/logout');
  console.info('[mail-logout] POST', url);
  let response: Response;
  try {
    response = await fetch(url, { method: 'POST', ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}) });
  } catch {
    throw new Error('server_unreachable');
  }
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as MailCredentialsFailure;
    throw mailFailure(payload, 'mail_failed', response.status);
  }
  publish({ status: DISCONNECTED_STATUS, messages: [], folders: [], folder: 'INBOX' });
}

/** Locale-aware error text, mirroring the campus messages of the sign-in screen. */
export function mailMessage(locale: 'de' | 'en', code: string, detail = ''): string {
  const suffix = detail ? ` ${detail}` : '';
  if (code === 'server_unreachable') {
    return tx(locale, 'mail.assistenz');
  }
  if (code === 'missing_password' || code === 'bad_account') {
    return tx(locale, 'mail.bitte');
  }
  if (code === 'mail_not_configured') {
    return tx(locale, 'mail.anmeldedaten');
  }
  if (code === 'mail_auth_failed') {
    return tx(locale, 'mail.imap', [suffix]);
  }
  if (code === 'mail_network' || code === 'mail_disconnected' || code === 'imap_timeout') {
    return tx(locale, 'mail.verbindung', [code, suffix]);
  }
  return tx(locale, 'mail.unimail', [code, suffix]);
}
