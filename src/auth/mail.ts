import AsyncStorage from '@react-native-async-storage/async-storage';
import { createStore } from '@tanstack/store';

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

const emptySnapshot: MailSnapshot = { status: null, messages: null, folders: null, folder: null };

/** The shared snapshot is a TanStack Store, so screens subscribe through `useSelector` without a context. */
export const mailStore = createStore<MailSnapshot>(emptySnapshot);

/**
 * The snapshot is mirrored on the device so the next launch can show the last
 * inbox immediately instead of an empty skeleton. Only row metadata and the
 * IMAP folder names are stored; the password stays on the assistant server.
 */
const MAIL_CACHE_KEY = 'mail-snapshot/v1';
let hydrated = false;
let hydration: Promise<void> | null = null;
let cacheWrite: Promise<void> = Promise.resolve();
/** Sign-out blocks late responses from repopulating the cache of the old session. */
let cacheSuspended = false;

interface StoredMailSnapshot {
  status: MailStatus | null;
  messages: MailMessage[];
  folders: MailFolder[];
  folder: string;
}

function persistSnapshot() {
  const snapshot = mailStore.state;
  const payload: StoredMailSnapshot = {
    status: snapshot.status,
    messages: snapshot.messages ?? [],
    folders: snapshot.folders ?? [],
    folder: snapshot.folder ?? 'INBOX',
  };
  const raw = JSON.stringify(payload);
  // Serialize writes: a slow earlier write must not land after a newer one.
  cacheWrite = cacheWrite
    .then(() => AsyncStorage.setItem(MAIL_CACHE_KEY, raw))
    .catch(() => undefined);
}

function publish(next: Partial<MailSnapshot>) {
  if (cacheSuspended && !next.status?.configured) return;
  if (next.status?.configured) cacheSuspended = false;
  const previous = mailStore.state;
  const previousAccount = previous.status?.account ?? null;
  let nextSnapshot = { ...previous, ...next };
  // A disconnected status or a different mail account invalidates the cached
  // rows; keeping them would show one account's mail to the next session.
  const accountChanged =
    Boolean(next.status?.configured && previousAccount && next.status?.account && next.status.account !== previousAccount);
  if ((next.status && !next.status.configured) || accountChanged) {
    nextSnapshot = { ...nextSnapshot, messages: [], folders: [], folder: 'INBOX' };
  }
  mailStore.setState(() => nextSnapshot);
  persistSnapshot();
}

/**
 * Restore the last stored inbox once per app process. Fresh data always wins:
 * a field that has already been fetched or explicitly cleared is left alone,
 * so a slow disk read cannot overwrite a just-loaded list.
 */
export function hydrateMailSnapshot(): Promise<void> {
  if (hydrated) return Promise.resolve();
  if (hydration) return hydration;
  hydration = (async () => {
    try {
      const raw = await AsyncStorage.getItem(MAIL_CACHE_KEY);
      if (!raw) return;
      const stored = JSON.parse(raw) as Partial<StoredMailSnapshot>;
      const current = mailStore.state;
      const next: Partial<MailSnapshot> = {};
      const status = asMailStatus(stored.status);
      if (current.status === null && status) next.status = status;
      if (current.messages === null) next.messages = asMailMessages(stored.messages);
      if (current.folders === null) next.folders = asMailFolders(stored.folders);
      if (current.folder === null && typeof stored.folder === 'string' && stored.folder) next.folder = stored.folder;
      if (Object.keys(next).length > 0) publish(next);
    } catch {
      // A corrupt or unreadable cache is simply ignored; the server read follows.
    } finally {
      hydrated = true;
      hydration = null;
    }
  })();
  return hydration;
}

/** Drop the local copy, e.g. on sign-out. The in-memory snapshot is reset too. */
export async function clearMailCache(): Promise<void> {
  cacheSuspended = true;
  mailStore.setState(() => emptySnapshot);
  hydrated = true;
  hydration = null;
  cacheWrite = cacheWrite.then(() => AsyncStorage.removeItem(MAIL_CACHE_KEY)).catch(() => undefined);
  await cacheWrite;
}

export function subscribeMailSnapshot(listener: () => void): () => void {
  return mailStore.subscribe(listener).unsubscribe;
}

export function getMailSnapshot(): MailSnapshot {
  return mailStore.state;
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

/** Validate a server or cached status payload without trusting its shape. */
export function asMailStatus(value: unknown): MailStatus | null {
  if (!value || typeof value !== 'object') return null;
  const payload = value as Partial<MailStatus>;
  if (typeof payload.configured !== 'boolean') return null;
  return {
    configured: payload.configured,
    account: typeof payload.account === 'string' ? payload.account : null,
    address: typeof payload.address === 'string' ? payload.address : null,
    webmail: typeof payload.webmail === 'string' && payload.webmail ? payload.webmail : UNIMAIL_WEBMAIL,
    imap: typeof payload.imap === 'string' && payload.imap ? payload.imap : UNIMAIL_IMAP,
  };
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
    const status = asMailStatus(await response.json());
    if (!status) return null;
    publish({ status });
    return status;
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
