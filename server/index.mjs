import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';

loadEnv(new URL('../.env', import.meta.url));

const port = Number(process.env.PORT || 8787);
const model = 'grok-4.7';

function loadEnv(url) {
  try {
    const text = readFileSync(url, 'utf8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const splitAt = trimmed.indexOf('=');
      if (splitAt < 1) continue;
      const key = trimmed.slice(0, splitAt).trim();
      const value = trimmed.slice(splitAt + 1).trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // A missing .env is fine when the variables are already in the environment.
  }
}

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

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > 200_000) {
        reject(new Error('body too large'));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {});
      } catch (error) {
        reject(error);
      }
    });
    request.on('error', reject);
  });
}

function send(response, status, body) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  });
  response.end(JSON.stringify(body));
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', 'http://127.0.0.1');
  if (request.method === 'OPTIONS') {
    send(response, 204, {});
    return;
  }
  if (request.method === 'GET' && url.pathname === '/health') {
    send(response, 200, { ok: true, model, configured: Boolean(process.env.XAI_API_KEY) });
    return;
  }
  if (request.method !== 'POST' || url.pathname !== '/v1/assist') {
    send(response, 404, { error: 'not_found' });
    return;
  }
  if (!process.env.XAI_API_KEY) {
    send(response, 503, { error: 'missing_key' });
    return;
  }

  let body;
  try {
    body = await readBody(request);
  } catch {
    send(response, 400, { error: 'bad_json' });
    return;
  }

  const locale = body.locale === 'en' ? 'en' : 'de';
  const question = String(body.question ?? '').slice(0, 4000);
  const facts = String(body.facts ?? '').slice(0, 24000);
  const history = Array.isArray(body.history) ? body.history.slice(-6) : [];
  if (!question) {
    send(response, 400, { error: 'empty_question' });
    return;
  }

  const system =
    locale === 'de'
      ? 'Du bist die Studienassistenz in einem studentischen Demonstrationsprojekt für die Universität Stuttgart. Antworte auf Deutsch. Nutze nur den Faktenblock. Erfinde keine Noten, Räume, Fristen oder ECTS. Wenn etwas fehlt, sag das. Weise nicht vor, ein amtliches Universitätssystem zu sein. Antworte knapp, mit kurzen Absätzen oder Listen.'
      : 'You are the study assistant in a student demonstration project for the University of Stuttgart. Reply in English. Use only the FACTS block. Do not invent grades, rooms, deadlines, or ECTS. If something is missing, say so. Do not pretend to be an official university system. Be concise, with short paragraphs or lists.';

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
      body: JSON.stringify({ model, store: false, input }),
      signal: AbortSignal.timeout(50_000),
    });
    const payload = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      send(response, 502, { error: 'upstream', status: upstream.status });
      return;
    }
    const text = outputText(payload);
    if (!text) {
      send(response, 502, { error: 'empty_upstream' });
      return;
    }
    send(response, 200, { text, model });
  } catch {
    send(response, 502, { error: 'upstream_failed' });
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`assistant server on http://127.0.0.1:${port}`);
});
