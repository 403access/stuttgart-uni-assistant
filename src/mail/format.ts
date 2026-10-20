import type { MailMessage } from '@/src/types';

/** Display name of a From header without the angle-bracket address. */
export function senderName(from: string): string {
  const cleaned = String(from ?? '').replace(/"/g, '').trim();
  const at = cleaned.indexOf('<');
  const name = (at > 0 ? cleaned.slice(0, at) : cleaned).trim();
  return name || cleaned;
}

export function messageTime(message: { date: string }): number {
  return message.date && !Number.isNaN(Date.parse(message.date)) ? Date.parse(message.date) : 0;
}

/** Full-row equality: a changed read flag must still update the visible row. */
export function sameMessageRows(a: MailMessage[], b: MailMessage[]): boolean {
  return (
    a.length === b.length &&
    a.every(
      (row, index) =>
        row.uid === b[index].uid &&
        row.seen === b[index].seen &&
        row.date === b[index].date &&
        row.from === b[index].from &&
        row.to === b[index].to &&
        row.subject === b[index].subject &&
        row.preview === b[index].preview,
    )
  );
}

/** Order-only equality: only added, removed or moved rows need a layout animation. */
export function sameMessageOrder(a: MailMessage[], b: MailMessage[]): boolean {
  return a.length === b.length && a.every((row, index) => row.uid === b[index].uid);
}
