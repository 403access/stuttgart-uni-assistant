import type { Locale } from '@/src/types';

export const assistantUrl = process.env.EXPO_PUBLIC_ASSISTANT_URL ?? 'http://127.0.0.1:8787';

export async function askGrok(input: {
  locale: Locale;
  question: string;
  facts: string;
  history: { role: 'user' | 'assistant'; text: string }[];
}): Promise<string | null> {
  if (!assistantUrl || assistantUrl === 'off') return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 40000);
  try {
    const response = await fetch(`${assistantUrl.replace(/\/$/, '')}/v1/assist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        locale: input.locale,
        question: input.question,
        facts: input.facts.slice(0, 24000),
        history: input.history.slice(-6),
      }),
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { text?: string };
    const text = body.text?.trim();
    return text || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
