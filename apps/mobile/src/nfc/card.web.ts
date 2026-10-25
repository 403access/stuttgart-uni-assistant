import type { CardReading } from '@/src/nfc/types';

/** NFC is not available in the web build. */
export async function isNfcSupported(): Promise<boolean> {
  return false;
}

export async function readStudentCard(): Promise<CardReading> {
  throw new Error('unsupported');
}

export async function cancelCardScan(): Promise<void> {}
