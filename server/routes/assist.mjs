/**
 * The assistant rewrite: one question plus client facts, answered by xAI.
 *
 * The key stays in this process. Without it the route answers 503 and the app
 * keeps its local campus answer.
 */

import { t } from '../i18n/index.mjs';
import { ASSISTANT_MODEL } from '../config.mjs';
import { readJsonBody, send } from '../http.mjs';

function outputText(payload) {
  if (typeof payload.output_text === 'string' && payload.output_text.trim()) return payload.output_text.trim();
  const parts = [];
  for (const item of payload.output ?? []) {
    if (item.type !== 'message') continue;
    for (const block of item.content ?? []) {
      if (block.type === 'output_text' && block.text) parts.push(block.text);
    }
  }
  return parts.join('\n').trim();
}

export async function handleAssist(request, response, url) {
  if (request.method !== 'POST' || url.pathname !== '/v1/assist') return false;
  if (!process.env.XAI_API_KEY) {
    send(response, 503, { error: 'missing_key' });
    return true;
  }

  const parsed = await readJsonBody(request, response);
  if (!parsed) return true;
  const body = parsed.body;

  const locale = body.locale === 'en' ? 'en' : 'de';
  const question = String(body.question ?? '').slice(0, 4000);
  const facts = String(body.facts ?? '').slice(0, 24000);
  const history = Array.isArray(body.history) ? body.history.slice(-6) : [];
  if (!question) {
    send(response, 400, { error: 'empty_question' });
    return true;
  }

  const system = t(locale, 'assist.systemPrompt');

  const input = [
    { role: 'system', content: system },
    ...history
      .filter((item) => item && (item.role === 'user' || item.role === 'assistant') && typeof item.text === 'string')
      .map((item) => ({ role: item.role, content: String(item.text).slice(0, 4000) })),
    { role: 'user', content: `FACTS:\n${facts}\n\nQUESTION:\n${question}` },
  ];

  try {
    const upstream = await fetch('https://api.x.ai/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.XAI_API_KEY}`,
      },
      body: JSON.stringify({ model: ASSISTANT_MODEL, store: false, input }),
      signal: AbortSignal.timeout(50_000),
    });
    const payload = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      send(response, 502, { error: 'upstream', status: upstream.status });
      return true;
    }
    const text = outputText(payload);
    if (!text) {
      send(response, 502, { error: 'empty_upstream' });
      return true;
    }
    send(response, 200, { text, model: ASSISTANT_MODEL });
  } catch {
    send(response, 502, { error: 'upstream_failed' });
  }
  return true;
}
