import type { CampusCalendarEvent } from '@/src/types';

/**
 * The onboarding calendar preview is built from the same ICS attachment the
 * export API returns. Keeping the small parser here lets the first render work
 * even when the assistant server only returns counts from its sync route.
 */

const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** UTF-8 base64 decoder (Hermes does not rely on `atob` for binary mail/calendar payloads). */
export function decodeBase64Utf8(input: string): string {
  const clean = input.replace(/[^A-Za-z0-9+/=]/g, '');
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const char of clean) {
    if (char === '=') break;
    const value = BASE64.indexOf(char);
    if (value < 0) continue;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }

  let result = '';
  for (let index = 0; index < bytes.length; ) {
    const first = bytes[index++];
    if (first < 0x80) {
      result += String.fromCharCode(first);
    } else if ((first & 0xe0) === 0xc0) {
      const second = bytes[index++] & 0x3f;
      result += String.fromCharCode(((first & 0x1f) << 6) | second);
    } else if ((first & 0xf0) === 0xe0) {
      const second = bytes[index++] & 0x3f;
      const third = bytes[index++] & 0x3f;
      result += String.fromCharCode(((first & 0x0f) << 12) | (second << 6) | third);
    } else if ((first & 0xf8) === 0xf0) {
      const second = bytes[index++] & 0x3f;
      const third = bytes[index++] & 0x3f;
      const fourth = bytes[index++] & 0x3f;
      const codePoint = ((first & 0x07) << 18) | (second << 12) | (third << 6) | fourth;
      result += String.fromCodePoint(codePoint);
    }
  }
  return result;
}

function unescapeIcs(value: string): string {
  return value
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

interface ParsedEvent {
  uid: string;
  recurrenceId: string;
  dtstart: string;
  dtend: string;
  summary: string;
  location: string;
  description: string;
}

/** Parse `VEVENT`s from an ICS attachment. Mirrors the server's dedupe key. */
export function parseIcsEvents(ics: string): CampusCalendarEvent[] {
  const unfolded = ics.replace(/\r?\n[ \t]/g, '');
  const events: CampusCalendarEvent[] = [];
  let current: Partial<ParsedEvent> | null = null;
  const fetchedAt = new Date().toISOString();

  for (const line of unfolded.split(/\r?\n/)) {
    if (line === 'BEGIN:VEVENT') {
      current = {};
      continue;
    }
    if (line === 'END:VEVENT') {
      if (current?.uid && current.dtstart) {
        events.push({
          uid: current.recurrenceId ? `${current.uid}#${current.recurrenceId}` : current.uid,
          summary: current.summary ?? '',
          location: current.location ?? '',
          description: current.description ?? '',
          dtstart: current.dtstart,
          dtend: current.dtend ?? '',
          fetchedAt,
        });
      }
      current = null;
      continue;
    }
    if (!current) continue;
    const splitAt = line.indexOf(':');
    if (splitAt < 1) continue;
    const name = line.slice(0, splitAt).split(';')[0].toUpperCase();
    const value = unescapeIcs(line.slice(splitAt + 1));
    if (name === 'UID') current.uid = value;
    else if (name === 'RECURRENCE-ID') current.recurrenceId = value;
    else if (name === 'DTSTART') current.dtstart = value;
    else if (name === 'DTEND') current.dtend = value;
    else if (name === 'SUMMARY') current.summary = value;
    else if (name === 'LOCATION') current.location = value;
    else if (name === 'DESCRIPTION') current.description = value;
  }
  return events;
}
