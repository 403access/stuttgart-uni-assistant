/** One decoded NDEF record from a scanned card. */
export type CardRecord = {
  tnf: number;
  /** Record type as text, e.g. `T` (text) or `U` (URI). */
  type: string;
  /** Decoded text or URI payload when the record is a known well-known type. */
  text: string | null;
  /** Raw payload bytes. */
  payload: number[];
};

/** Public, read-only data of a scanned student ID card. */
export type CardReading = {
  /** Tag identifier as uppercase hex, in bytes separated by spaces. */
  uid: string | null;
  /** Same identifier as an unsigned decimal, as some card readers print it. */
  uidDecimal: string | null;
  /** iOS reports one technology name here; Android lists them in `techTypes`. */
  tech: string | null;
  techTypes: string[];
  records: CardRecord[];
  /** Unmodified tag event for the raw data section. */
  raw: unknown;
};
