import NfcManager, { Ndef, NfcTech, type NdefRecord, type TagEvent } from 'react-native-nfc-manager';

import type { CardReading, CardRecord } from '@/src/nfc/types';

let startAttempt: Promise<void> | null = null;

function start(): Promise<void> {
  startAttempt ??= NfcManager.start().catch((error: unknown) => {
    startAttempt = null;
    throw error;
  });
  return startAttempt;
}

/** NFC needs a physical device; simulators and the web build report no support. */
export async function isNfcSupported(): Promise<boolean> {
  try {
    await start();
    return await NfcManager.isSupported();
  } catch {
    return false;
  }
}

/**
 * Waits for a card, reads its public data, and always ends the reader session.
 * Nothing is written to the card and nothing leaves the device.
 */
export async function readStudentCard(alertMessage: string): Promise<CardReading> {
  await start();
  try {
    await NfcManager.requestTechnology([NfcTech.NfcA, NfcTech.Ndef], { alertMessage });
    const tag = await NfcManager.getTag();
    if (!tag) throw new Error('no-tag');
    return toReading(tag);
  } finally {
    await NfcManager.cancelTechnologyRequest({ throwOnError: false }).catch(() => undefined);
  }
}

/** Ends an open reader session, e.g. when the user leaves the screen mid-scan. */
export async function cancelCardScan(): Promise<void> {
  await NfcManager.cancelTechnologyRequest({ throwOnError: false }).catch(() => undefined);
}

function toReading(tag: TagEvent): CardReading {
  return {
    uid: formatUid(tag.id),
    uidDecimal: formatUidDecimal(tag.id),
    tech: tag.tech ?? null,
    techTypes: tag.techTypes ?? [],
    records: (tag.ndefMessage ?? []).map(toRecord),
    raw: tag,
  };
}

function formatUid(id?: string): string | null {
  if (!id) return null;
  const hex = id.replace(/[^0-9a-f]/gi, '').toUpperCase();
  if (!hex) return null;
  return hex.match(/.{1,2}/g)?.join(' ') ?? hex;
}

function formatUidDecimal(id?: string): string | null {
  const hex = id?.replace(/[^0-9a-f]/gi, '');
  if (!hex) return null;
  try {
    return BigInt(`0x${hex}`).toString(10);
  } catch {
    return null;
  }
}

function toRecord(record: NdefRecord): CardRecord {
  const type = typeName(record.type);
  const payload = record.payload ?? [];
  return {
    tnf: record.tnf,
    type,
    text: decodeText(record.tnf, type, payload),
    payload,
  };
}

function typeName(type: NdefRecord['type']): string {
  if (typeof type === 'string') return type;
  return String.fromCharCode(...type);
}

function decodeText(tnf: number, type: string, payload: number[]): string | null {
  if (tnf !== Ndef.TNF_WELL_KNOWN) return null;
  try {
    if (type === Ndef.RTD_TEXT) return Ndef.text.decodePayload(new Uint8Array(payload));
    if (type === Ndef.RTD_URI) return Ndef.uri.decodePayload(new Uint8Array(payload));
  } catch {
    return null;
  }
  return null;
}
