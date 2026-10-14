import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';

import { loadCampusStudies, loadCurriculumStructure, loginWithCampusToken, publicCampusStatus } from './campus.mjs';
import { apiCatalog } from './catalog.mjs';
import { endRemoteSession, exchangeCode, publicOidcStatus, startLogin, warnIfPasswordPresent } from './oidc.mjs';

loadEnv(new URL('../.env', import.meta.url));
warnIfPasswordPresent();

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

function campusFailure(error) {
  const body = { error: error.message || 'campus_failed' };
  if (error.detail) body.detail = String(error.detail).slice(0, 300);
  if (typeof error.status === 'number') body.status = error.status;
  return body;
}

let campusReqSeq = 0;

function campusReq(route, extra) {
  const id = ++campusReqSeq;
  const stamp = new Date().toISOString();
  console.log(`[campus #${id} ${stamp}] ${route}${extra ? ` ${extra}` : ''}`);
  return id;
}

function previewBody(body) {
  try {
    return JSON.stringify(body ?? {}).slice(0, 200);
  } catch {
    return '?';
  }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', 'http://127.0.0.1');
  if (request.method === 'OPTIONS') {
    send(response, 204, {});
    return;
  }
  if (request.method === 'GET' && url.pathname === '/health') {
    send(response, 200, {
      ok: true,
      model,
      configured: Boolean(process.env.XAI_API_KEY),
      oidc: publicOidcStatus(),
      campus: publicCampusStatus(),
    });
    return;
  }
  if (request.method === 'GET' && url.pathname === '/v1/api') {
    send(response, 200, apiCatalog());
    return;
  }
  if (request.method === 'GET' && url.pathname === '/v1/campus/config') {
    send(response, 200, publicCampusStatus());
    return;
  }
  if (request.method === 'POST' && url.pathname === '/v1/campus/login') {
    const reqId = campusReq('POST /v1/campus/login');
    try {
      const profile = await loginWithCampusToken();
      console.log(`[campus #${reqId}] login ok name=${profile.name} account=${profile.account} nodes=${profile.nodes.length} studies=${profile.studies?.length ?? 0}`);
      send(response, 200, profile);
    } catch (error) {
      const code = error.message || 'campus_failed';
      console.log(`[campus #${reqId}] login failed ${code}${error.detail ? ` detail=${error.detail}` : ''}`);
      send(response, Number(error.status) || 500, campusFailure(error));
    }
    return;
  }
  if (request.method === 'POST' && url.pathname === '/v1/campus/structure') {
    let body = {};
    try {
      body = await readBody(request);
    } catch {
      send(response, 400, { error: 'bad_json' });
      return;
    }
    const reqId = campusReq('POST /v1/campus/structure', `body=${previewBody(body)}`);
    try {
      const result = await loadCurriculumStructure(body?.elementId, body?.studyId);
      console.log(`[campus #${reqId}] structure ok study=${result.studyId} element=${result.elementId} nodes=${result.nodes.length}`);
      send(response, 200, result);
    } catch (error) {
      const code = error.message || 'campus_failed';
      console.log(`[campus #${reqId}] structure failed ${code}${error.detail ? ` detail=${error.detail}` : ''}`);
      send(response, Number(error.status) || 500, campusFailure(error));
    }
    return;
  }
  if (request.method === 'GET' && url.pathname === '/v1/campus/studies') {
    const reqId = campusReq('GET /v1/campus/studies');
    try {
      const result = await loadCampusStudies();
      console.log(`[campus #${reqId}] studies ok count=${result.studies.length}`);
      send(response, 200, result);
    } catch (error) {
      const code = error.message || 'campus_failed';
      console.log(`[campus #${reqId}] studies failed ${code}${error.detail ? ` detail=${error.detail}` : ''}`);
      send(response, Number(error.status) || 500, campusFailure(error));
    }
    return;
  }
  if (request.method === 'GET' && url.pathname === '/v1/oidc/config') {
    send(response, 200, publicOidcStatus());
    return;
  }
  if (url.pathname === '/v1/oidc/start' || url.pathname === '/v1/oidc/exchange' || url.pathname === '/v1/oidc/logout') {
    if (request.method !== 'POST') {
      send(response, 405, { error: 'method' });
      return;
    }
    let oidcBody;
    try {
      oidcBody = await readBody(request);
    } catch {
      send(response, 400, { error: 'bad_json' });
      return;
    }
    try {
      if (url.pathname === '/v1/oidc/start') {
        send(response, 200, await startLogin(String(oidcBody.redirectUri ?? '')));
        return;
      }
      if (url.pathname === '/v1/oidc/exchange') {
        send(response, 200, await exchangeCode({ code: oidcBody.code, state: oidcBody.state, redirectUri: String(oidcBody.redirectUri ?? '') }));
        return;
      }
      send(response, 200, await endRemoteSession(oidcBody.sessionId));
    } catch (error) {
      const status = Number(error.status) || 500;
      send(response, status, { error: error.message || 'oidc_failed', detail: error.detail });
    }
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
