import type { Locale, MailBody, MailMessage, MailRecipient } from '@ua/core/domain/types';

import { parseRecipientHeader } from './recipients';

export type ComposeMode = 'new' | 'reply' | 'forward';

const REPLY_PREFIX = /^(?:aw|re)\s*:\s*/i;
const FORWARD_PREFIX = /^(?:wg|fwd?)\s*:\s*/i;

function quote(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => (line ? `> ${line}` : '>'))
    .join('\n');
}

function stamp(message: MailMessage, locale: Locale): string {
  const date = message.date ? new Date(message.date) : null;
  if (!date || Number.isNaN(date.getTime())) return locale === 'de' ? 'unbekanntem Datum' : 'an unknown date';
  return date.toLocaleString(locale === 'de' ? 'de-DE' : 'en-GB');
}

/** `Re:` on an English UI, `AW:` in German — and never `Re: Re:`. */
export function replySubject(subject: string, locale: Locale): string {
  return `${locale === 'de' ? 'AW' : 'Re'}: ${subject.replace(REPLY_PREFIX, '').trim() || (locale === 'de' ? 'Ihre Nachricht' : 'your message')}`;
}

/** `Fwd:` on an English UI, `WG:` in German — and never `Fwd: Fwd:`. */
export function forwardSubject(subject: string, locale: Locale): string {
  return `${locale === 'de' ? 'WG' : 'Fwd'}: ${subject.replace(FORWARD_PREFIX, '').trim() || (locale === 'de' ? 'Ihre Nachricht' : 'your message')}`;
}

/** Signature block with the signed-in name and address; empty when both are missing. */
export function buildSignature(name: string | null, email: string | null): string {
  const lines = [name?.trim(), email?.trim()].filter((line): line is string => Boolean(line));
  return lines.length ? `\n\n-- \n${lines.join('\n')}` : '';
}

/**
 * Prefill for reply and forward. The result starts with two line breaks so the
 * cursor sits above the signature/quote block and the user can type straight
 * away; the compose screen places the selection at the top.
 */
export function buildComposeDraft({
  mode,
  message,
  body,
  locale,
  signature,
}: {
  mode: Exclude<ComposeMode, 'new'>;
  message: MailMessage;
  body: MailBody | null;
  locale: Locale;
  signature: string;
}): { to: MailRecipient[]; subject: string; text: string } {
  const text = body?.text?.trim() ?? '';
  const sender = parseRecipientHeader(message.from)[0];
  const senderLabel = sender ? (sender.name ? `${sender.name} <${sender.email}>` : sender.email) : message.from;
  const date = stamp(message, locale);

  if (mode === 'reply') {
    const quoted = text ? `\n\n${locale === 'de' ? 'Am' : 'On'} ${date} ${locale === 'de' ? 'schrieb' : 'wrote'} ${senderLabel}:\n${quote(text)}` : '';
    return {
      to: sender ? [sender] : [],
      subject: replySubject(message.subject, locale),
      text: `\n\n${signature}${quoted}`,
    };
  }

  const header =
    locale === 'de'
      ? `---------- Weitergeleitete Nachricht ----------\nVon: ${message.from}\nDatum: ${date}\nAn: ${message.to}\nBetreff: ${message.subject || '–'}`
      : `---------- Forwarded message ----------\nFrom: ${message.from}\nDate: ${date}\nTo: ${message.to}\nSubject: ${message.subject || '–'}`;
  return {
    to: [],
    subject: forwardSubject(message.subject, locale),
    text: `\n\n${signature}\n\n${header}${text ? `\n\n${text}` : ''}`,
  };
}
