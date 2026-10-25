import AsyncStorage from '@react-native-async-storage/async-storage';

import type { MailAttachment, MailRecipient } from '@ua/core/domain/types';

export const MAIL_DRAFT_KEY = 'mail-draft/v1';
/** Attachments ride along only below this raw size; AsyncStorage is not a blob store. */
const ATTACHMENT_BUDGET = 2_000_000;

export interface MailDraft {
  to: MailRecipient[];
  cc: MailRecipient[];
  bcc: MailRecipient[];
  subject: string;
  text: string;
  attachments: MailAttachment[];
  /** Larger attachments were left out of the stored draft. */
  attachmentsDropped: boolean;
  savedAt: string;
}

function asRecipient(value: unknown): MailRecipient | null {
  if (!value || typeof value !== 'object') return null;
  const entry = value as Partial<MailRecipient>;
  if (typeof entry.email !== 'string' || !entry.email.trim()) return null;
  return { name: typeof entry.name === 'string' ? entry.name : '', email: entry.email };
}

function asRecipients(value: unknown): MailRecipient[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const recipient = asRecipient(entry);
    return recipient ? [recipient] : [];
  });
}

function asAttachment(value: unknown): MailAttachment | null {
  if (!value || typeof value !== 'object') return null;
  const entry = value as Partial<MailAttachment>;
  if (typeof entry.name !== 'string' || typeof entry.data !== 'string' || !entry.data) return null;
  return {
    name: entry.name,
    type: typeof entry.type === 'string' && entry.type ? entry.type : 'application/octet-stream',
    size: typeof entry.size === 'number' && entry.size > 0 ? entry.size : 0,
    data: entry.data,
  };
}

/** Last draft, or null when none was stored / the record is unreadable. */
export async function loadMailDraft(): Promise<MailDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(MAIL_DRAFT_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw) as Partial<MailDraft>;
    const draft: MailDraft = {
      to: asRecipients(stored.to),
      cc: asRecipients(stored.cc),
      bcc: asRecipients(stored.bcc),
      subject: typeof stored.subject === 'string' ? stored.subject : '',
      text: typeof stored.text === 'string' ? stored.text : '',
      attachments: Array.isArray(stored.attachments)
        ? stored.attachments.flatMap((entry) => {
            const attachment = asAttachment(entry);
            return attachment ? [attachment] : [];
          })
        : [],
      attachmentsDropped: Boolean(stored.attachmentsDropped),
      savedAt: typeof stored.savedAt === 'string' ? stored.savedAt : '',
    };
    const empty =
      draft.to.length === 0 &&
      draft.cc.length === 0 &&
      draft.bcc.length === 0 &&
      !draft.subject.trim() &&
      !draft.text.trim() &&
      draft.attachments.length === 0;
    return empty ? null : draft;
  } catch {
    return null;
  }
}

/** Debounced save from the compose screen; oversized attachments are left out, never truncated. */
export async function saveMailDraft(draft: Omit<MailDraft, 'savedAt' | 'attachmentsDropped'>): Promise<void> {
  const total = draft.attachments.reduce((sum, attachment) => sum + (attachment.size || 0), 0);
  const keepAttachments = total <= ATTACHMENT_BUDGET;
  const stored: MailDraft = {
    ...draft,
    attachments: keepAttachments ? draft.attachments : [],
    attachmentsDropped: !keepAttachments && draft.attachments.length > 0,
    savedAt: new Date().toISOString(),
  };
  try {
    await AsyncStorage.setItem(MAIL_DRAFT_KEY, JSON.stringify(stored));
  } catch {
    // A full or unavailable store must never block composing.
  }
}

export async function clearMailDraft(): Promise<void> {
  try {
    await AsyncStorage.removeItem(MAIL_DRAFT_KEY);
  } catch {
    // Ignore: the draft is a convenience, not a source of truth.
  }
}
