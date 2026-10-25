import AsyncStorage from '@react-native-async-storage/async-storage';

import type { MailRecipient } from '@ua/core/domain/types';

export const MAIL_RECIPIENTS_KEY = 'mail-recipients/v1';
const MAX_RECENT = 12;

function asRecipient(value: unknown): MailRecipient | null {
  if (!value || typeof value !== 'object') return null;
  const entry = value as Partial<MailRecipient>;
  if (typeof entry.email !== 'string' || !entry.email.trim()) return null;
  return { name: typeof entry.name === 'string' ? entry.name : '', email: entry.email };
}

/** Recipient history, newest first, without duplicates. */
export async function loadRecentRecipients(): Promise<MailRecipient[]> {
  try {
    const raw = await AsyncStorage.getItem(MAIL_RECIPIENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    const result: MailRecipient[] = [];
    for (const entry of parsed) {
      const recipient = asRecipient(entry);
      if (!recipient) continue;
      const key = recipient.email.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(recipient);
      if (result.length >= MAX_RECENT) break;
    }
    return result;
  } catch {
    return [];
  }
}

/** Remember everyone a message was sent to, newest first, capped at 12 entries. */
export async function rememberRecipients(recipients: MailRecipient[]): Promise<void> {
  if (recipients.length === 0) return;
  const previous = await loadRecentRecipients();
  const seen = new Set<string>();
  const merged: MailRecipient[] = [];
  for (const recipient of [...recipients, ...previous]) {
    const key = recipient.email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(recipient);
    if (merged.length >= MAX_RECENT) break;
  }
  try {
    await AsyncStorage.setItem(MAIL_RECIPIENTS_KEY, JSON.stringify(merged));
  } catch {
    // History is best-effort.
  }
}

export async function clearRecentRecipients(): Promise<void> {
  try {
    await AsyncStorage.removeItem(MAIL_RECIPIENTS_KEY);
  } catch {
    // Ignore.
  }
}
