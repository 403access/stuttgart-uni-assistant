import Constants from 'expo-constants';

import { resolveAssistantBaseUrl } from '@ua/core/assistant/endpoints';
import type { Locale } from '@ua/core/domain/types';

/**
 * Where the assistant server lives. Resolved in `src/assistant/endpoints.ts`:
 * the tunnel URL wins while `npm run assistant:tunnel` holds one, an explicit
 * non-loopback `EXPO_PUBLIC_ASSISTANT_URL` wins next, and otherwise the Metro
 * dev-server host is reused on the assistant port. That last rule is what lets
 * the simulator and a phone on the same Wi-Fi both reach the server without
 * editing `.env`: the phone already talks to that host for its bundle.
 *
 * The env values are inlined into the bundle at build time, so Expo has to be
 * restarted after a change to them. In a release build there is no dev-server
 * host, so the explicit URL is required (or `off`, which disables the remote
 * engine).
 */
function devServerHostUri(): string | null {
  try {
    return (
      Constants.expoConfig?.hostUri ??
      Constants.expoGoConfig?.debuggerHost ??
      Constants.experienceUrl ??
      null
    );
  } catch {
    return null;
  }
}

export const assistantUrl = resolveAssistantBaseUrl({
  envUrl: process.env.EXPO_PUBLIC_ASSISTANT_URL,
  tunnelUrl: process.env.EXPO_PUBLIC_ASSISTANT_TUNNEL_URL,
  hostUri: devServerHostUri(),
});

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
