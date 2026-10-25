/**
 * Published app news from the assistant server (`GET /v1/news`). The bundled
 * demo items stay in `src/data` as the offline fallback; this module only
 * validates the server payload (see `parse.ts`).
 */

import { assistantUrl } from '@/src/assistant/remote';
import { asNewsList } from '@ua/core/news/parse';
import type { NewsItem } from '@ua/core/domain/types';

/** Throws when the server cannot answer, so callers can tell "offline" from "no news". */
export async function fetchPublishedNews(): Promise<NewsItem[]> {
  if (!assistantUrl || assistantUrl === 'off') throw new Error('news_off');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`${assistantUrl.replace(/\/$/, '')}/v1/news`, { signal: controller.signal });
    if (!response.ok) throw new Error('news_unavailable');
    const payload = (await response.json()) as { items?: unknown };
    if (!Array.isArray(payload.items)) throw new Error('news_invalid');
    return asNewsList(payload.items);
  } finally {
    clearTimeout(timer);
  }
}
