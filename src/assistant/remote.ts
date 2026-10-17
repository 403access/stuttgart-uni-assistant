import type { Locale } from '@/src/types';

/**
 * Where the assistant server lives.
 *
 * `EXPO_PUBLIC_ASSISTANT_URL` is the base URL set by hand — `127.0.0.1` on a
 * simulator, the machine's LAN address on a phone. `npm run assistant:tunnel`
 * writes the public hostname to `EXPO_PUBLIC_ASSISTANT_TUNNEL_URL` while the
 * tunnel is up and blanks it again when the tunnel stops, so a phone off the
 * LAN is pointed at Cloudflare without clobbering the local value. The tunnel
 * wins while it is set, and `off` still disables the remote engine.
 *
 * Both are inlined into the bundle at build time, so Expo has to be restarted
 * after a change.
 */
const baseUrl = process.env.EXPO_PUBLIC_ASSISTANT_URL || 'http://127.0.0.1:8787';
const tunnelUrl = process.env.EXPO_PUBLIC_ASSISTANT_TUNNEL_URL || '';

export const assistantUrl = baseUrl === 'off' ? 'off' : tunnelUrl || baseUrl;

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
