import type { Locale, MailContact, MailContactSource, MailMessage, MailRecipient, Person } from '@/src/types';

const EMAIL = /^[^\s@<>()[\],;:"]+@[^\s@<>()[\],;:"]+\.[^\s@<>()[\],;:"]+$/;

/** Fold umlauts, accents and case for tolerant search (`Müller` finds `muller`). */
export function normalizeSearch(value: string): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Split a header list on commas that are outside quotes and angle brackets. */
export function splitAddressHeader(value: string): string[] {
  const parts: string[] = [];
  let current = '';
  let quoted = false;
  let angled = false;
  for (const char of String(value ?? '')) {
    if (char === '"') quoted = !quoted;
    else if (!quoted && char === '<') angled = true;
    else if (!quoted && char === '>') angled = false;
    if (char === ',' && !quoted && !angled) {
      parts.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  if (current.trim()) parts.push(current);
  return parts;
}

/** One RFC 5322 address → recipient, or null when the value is unusable. */
export function parseRecipient(value: string): MailRecipient | null {
  const text = String(value ?? '').replace(/[\r\n]+/g, ' ').trim();
  if (!text) return null;
  const angle = /^(.*?)<([^<>]+)>$/.exec(text);
  const email = (angle ? angle[2] : text).trim();
  if (!EMAIL.test(email) || email.length > 254) return null;
  const name = (angle ? angle[1] : '')
    .trim()
    .replace(/^"(.*)"$/, '$1')
    .replace(/\s+/g, ' ')
    .slice(0, 120);
  return { name, email };
}

/** A `From`/`To`/`Cc` header with several mailboxes → recipients. */
export function parseRecipientHeader(value: string): MailRecipient[] {
  const byEmail = new Map<string, MailRecipient>();
  for (const part of splitAddressHeader(value)) {
    const recipient = parseRecipient(part);
    if (!recipient) continue;
    const key = recipient.email.toLowerCase();
    if (!byEmail.has(key)) byEmail.set(key, recipient);
  }
  return [...byEmail.values()];
}

/** `Anna Müller <a@uni-stuttgart.de>`; bare address when there is no name. */
export function formatRecipient(recipient: MailRecipient): string {
  const name = String(recipient.name ?? '').replace(/["\r\n]/g, '').trim();
  return name ? `${name} <${recipient.email}>` : recipient.email;
}

export function sameRecipient(left: MailRecipient, right: MailRecipient): boolean {
  return left.email.toLowerCase() === right.email.toLowerCase();
}

/** Add a recipient without duplicating an address that is already in the field. */
export function addRecipient(list: MailRecipient[], recipient: MailRecipient): MailRecipient[] {
  return list.some((entry) => sameRecipient(entry, recipient)) ? list : [...list, recipient];
}

const SOURCE_ORDER: MailContactSource[] = ['recent', 'lecturer', 'mailbox'];

function sourceLabelRank(sources: MailContactSource[]): number {
  const index = SOURCE_ORDER.findIndex((source) => sources.includes(source));
  return index === -1 ? SOURCE_ORDER.length : index;
}

/**
 * Merge the app's people directory, the senders and addressees of the loaded
 * mailbox rows, and the recipient history into one address book. Entries are
 * keyed by lowercase address so a lecturer met over mail keeps both badges.
 */
export function buildContactRegistry({
  people,
  messages,
  recent,
  locale,
}: {
  people: Person[];
  messages: MailMessage[];
  recent: MailRecipient[];
  locale: Locale;
}): MailContact[] {
  const byEmail = new Map<string, MailContact>();
  const add = (recipient: MailRecipient, source: MailContactSource, detail?: string) => {
    if (!recipient.email) return;
    const id = recipient.email.toLowerCase();
    const existing = byEmail.get(id);
    if (existing) {
      if (!existing.sources.includes(source)) existing.sources.push(source);
      if (!existing.name && recipient.name) existing.name = recipient.name;
      if (!existing.detail && detail) existing.detail = detail;
      return;
    }
    byEmail.set(id, { id, name: recipient.name || recipient.email, email: recipient.email, sources: [source], detail });
  };

  for (const person of people) {
    const title = person.title[locale] ?? person.title.de;
    add({ name: `${title} ${person.name}`.trim(), email: person.email }, 'lecturer', person.institute[locale] ?? person.institute.de);
  }
  for (const message of messages) {
    const subject = message.subject.trim();
    for (const recipient of parseRecipientHeader(message.from)) add(recipient, 'mailbox', subject || undefined);
    for (const recipient of parseRecipientHeader(message.to)) add(recipient, 'mailbox', subject || undefined);
    for (const recipient of parseRecipientHeader(message.cc)) add(recipient, 'mailbox', subject || undefined);
  }
  for (const recipient of recent) add(recipient, 'recent');

  return [...byEmail.values()].sort((a, b) => {
    const rank = sourceLabelRank(a.sources) - sourceLabelRank(b.sources);
    if (rank !== 0) return rank;
    return a.name.localeCompare(b.name, locale === 'de' ? 'de' : 'en', { sensitivity: 'base' });
  });
}

/**
 * Ranked search: exact/prefix address first, then name prefixes, then any
 * substring in name, address or detail. An empty query shows the default order
 * (recent, lecturers, mailbox contacts) so the field is useful before typing.
 */
export function searchContacts(contacts: MailContact[], query: string, limit = 6): MailContact[] {
  const needle = normalizeSearch(query);
  if (!needle) return contacts.slice(0, limit);
  const scored: { contact: MailContact; score: number }[] = [];
  for (const contact of contacts) {
    const email = normalizeSearch(contact.email);
    const name = normalizeSearch(contact.name);
    const detail = normalizeSearch(contact.detail ?? '');
    let score = -1;
    if (email === needle) score = 0;
    else if (email.startsWith(needle)) score = 1;
    else if (name.startsWith(needle)) score = 2;
    else if (name.split(' ').some((part) => part.startsWith(needle))) score = 3;
    else if (email.includes(needle)) score = 4;
    else if (name.includes(needle)) score = 5;
    else if (detail.includes(needle)) score = 6;
    if (score >= 0) scored.push({ contact, score });
  }
  scored.sort((a, b) => a.score - b.score || a.contact.name.localeCompare(b.contact.name));
  return scored.slice(0, limit).map((entry) => entry.contact);
}

/** Initials for the round avatar in front of a suggestion. */
export function contactInitials(contact: { name: string; email: string }): string {
  const source = contact.name === contact.email ? contact.email.split('@')[0] : contact.name;
  const words = source.split(/[\s.]+/).filter((word) => /[A-Za-zÀ-ÿ0-9]/.test(word));
  if (words.length === 0) return contact.email.slice(0, 2).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}
