import { readFile, stat } from 'node:fs/promises';

import { extractText, getDocumentProxy } from 'unpdf';

const MAX_FILE_BYTES = 50 * 1024 * 1024;
const MAX_PAGES = 400;

export interface ExtractedPdf {
  pages: number;
  text: string;
}

/**
 * Extracts plain text from one PDF.
 *
 * PDFs are untrusted input: cap the file size and page count, and let PDF.js
 * refuse oversized embedded images. The caller caps the character count before
 * sending anything to the model.
 */
export async function extractPdf(filePath: string): Promise<ExtractedPdf> {
  const info = await stat(filePath);
  if (info.size > MAX_FILE_BYTES) {
    throw new Error(`file is larger than ${Math.round(MAX_FILE_BYTES / 1024 / 1024)} MB`);
  }

  const data = new Uint8Array(await readFile(filePath));
  const pdf = await getDocumentProxy(data, { maxImageSize: 16 * 1024 * 1024 });
  try {
    if (pdf.numPages > MAX_PAGES) {
      throw new Error(`PDF has ${pdf.numPages} pages; the limit is ${MAX_PAGES}`);
    }
    const result = await extractText(pdf);
    const text = Array.isArray(result.text) ? result.text.join('\n\n') : result.text;
    return { pages: result.totalPages, text: cleanPdfText(text) };
  } finally {
    const destroyable = pdf as unknown as { destroy?: () => Promise<void> };
    await destroyable.destroy?.();
  }
}

/** Collapses PDF line noise without touching sentence punctuation. */
export function cleanPdfText(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/\u0000/g, '')
    .replace(/[ \t\u00a0]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Caps the source at a character budget. The beginning of a handout usually
 * carries the structure, so truncate from the end and tell the caller.
 */
export function capSource(text: string, maxChars: number): { text: string; truncated: boolean } {
  if (text.length <= maxChars) return { text, truncated: false };
  return {
    text: `${text.slice(0, maxChars).trimEnd()}\n\n[Text truncated at ${maxChars} characters.]`,
    truncated: true,
  };
}

export function assertUsableText(text: string): void {
  if (text.replace(/\s+/g, ' ').trim().length < 200) {
    throw new Error(
      'no usable text was extracted. Scanned PDFs need OCR first; this pipeline reads embedded text only.',
    );
  }
}
