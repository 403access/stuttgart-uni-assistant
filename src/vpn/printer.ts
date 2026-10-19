import { Platform } from 'react-native';

import type { Campus, Localized } from '@/src/types';

export interface PrinterLocation {
  id: string;
  campus: Campus;
  /** Where the device stands, e.g. `K1 · Kopierraum 1. UG`. */
  name: Localized;
}

/**
 * Every self-service device stuvus runs. The printers are reachable only from
 * the university network, so the address matters more than a device model.
 * Source: https://stuvus.uni-stuttgart.de/drucker
 */
export const printerLocations: PrinterLocation[] = [
  { id: 'k2', campus: 'stadtmitte', name: { de: 'K2 · Kopierraum 1. UG', en: 'K2 · copy room, 1st basement' } },
  { id: 'k1', campus: 'stadtmitte', name: { de: 'K1 · am linken Treppenhaus im EG', en: 'K1 · left stairwell, ground floor' } },
  { id: 'ub-stadtmitte', campus: 'stadtmitte', name: { de: 'Vortragssaal Unibibliothek', en: 'University library, lecture hall' } },
  { id: 'universum', campus: 'vaihingen', name: { de: 'Lernraum Universum', en: 'Universum study room' } },
  { id: 'v57', campus: 'vaihingen', name: { de: 'V 57 · TIK-Rechenzentrum, Zwischengeschoss', en: 'V 57 · TIK computing centre, mezzanine' } },
  { id: 'ub-vaihingen', campus: 'vaihingen', name: { de: 'Druckerraum, 3. Ebene Unibibliothek', en: 'Print room, 3rd floor, university library' } },
];

export interface PrinterPrice {
  paper: 'A4' | 'A3';
  mode: 'grayscale' | 'color';
  duplex: boolean;
  /** Price per side in cents, so the table stays exact. */
  cents: number;
}

export const printerPrices: PrinterPrice[] = [
  { paper: 'A4', mode: 'grayscale', duplex: false, cents: 5 },
  { paper: 'A4', mode: 'grayscale', duplex: true, cents: 4 },
  { paper: 'A4', mode: 'color', duplex: false, cents: 8 },
  { paper: 'A4', mode: 'color', duplex: true, cents: 7 },
  { paper: 'A3', mode: 'grayscale', duplex: false, cents: 10 },
  { paper: 'A3', mode: 'grayscale', duplex: true, cents: 8 },
  { paper: 'A3', mode: 'color', duplex: false, cents: 16 },
  { paper: 'A3', mode: 'color', duplex: true, cents: 14 },
];

export const printerLinks = {
  /** PaperCut portal: register, top up credit, release jobs. */
  portal: 'https://drucken.stuvus.uni-stuttgart.de/',
  /** Release the queued jobs from the browser instead of at the device. */
  release: 'https://drucken.stuvus.uni-stuttgart.de/app?service=page/UserReleaseJobs',
  /** Mobility Print setup wizard (port 9164). */
  mobilitySetup: 'https://drucken.stuvus.uni-stuttgart.de:9164/setup',
  /** The stuvus instructions this screen follows. */
  guide: 'https://stuvus.uni-stuttgart.de/drucker',
  /** kopier[lädle] service desk, where paper and bindings live too. */
  shop: 'https://kopierlaedle.de/',
  support: 'info@kopierlaedle.de',
} as const;

/**
 * Probe whether the PaperCut portal answers from the current network. The
 * printers are only reachable inside the university network, so a failed probe
 * is the honest signal that WLAN or VPN is missing. Returns `null` on web,
 * where a browser's CORS rules make the result meaningless.
 */
export async function checkPrinterReachable(timeoutMs = 4000): Promise<boolean | null> {
  if (Platform.OS === 'web') return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(printerLinks.portal, {
      method: 'GET',
      redirect: 'manual',
      signal: controller.signal,
    });
    // Any HTTP answer at all means the host is on this network, even a 302 to the login.
    return response.status < 500;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
