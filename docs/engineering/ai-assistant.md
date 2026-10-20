# AI assistant

The assistant has two engines and one transcript. The campus engine always answers. Grok rewrites that answer only when the proxy is up and a key is configured. The student sees a result either way.

Provider: xAI, model `grok-4.7`, Responses API at `https://api.x.ai/v1/responses`, `store: false`. The key is `XAI_API_KEY` on the server. The client bundle does not contain it.

## Campus engine

`src/assistant/answer.ts` is a deterministic reader. It does not call a model and it does not invent grades, rooms, or dates.

`hay()` folds ä, ö, ü, and ß so "Prüfungsanmeldung" and "prufungsanmeldung" match.

Intent keys are scored by the length of each key that occurs in the question. The highest score wins. Ties keep the earlier intent in this list:

| Intent | Examples it is meant to catch |
| --- | --- |
| `deadlines` | Frist, Anmeldung, Abgabe, exam date |
| `schedule` | Stundenplan, heute, what do I have |
| `credits` | ECTS, Schnitt, fehlen, Prüfungsordnung |
| `transfer` | Anrechnung, Ausland, previous university |
| `sequence` | Voraussetzung, belegen, next semester, kann ich |
| `people` | Dozent, Sprechstunde, office hour |
| `room` | Mensa, Bibliothek, wo ist, K1, K2 |
| `documents` | ILIAS, Folien, Übungsblatt |
| `reviews` | Empfehlung, Aufwand, Bewertung |
| `exams` | Altklausur, Schwerpunkt |
| `news` | stuvus, Meldung, announcement |
| `summary` | zusammenfassen, plain language, übersetzen |
| `module` | Modul, Inhalt, syllabus (also the fallback) |

A named module scores on its code, title, and aliases. A score of at least 4 attaches that module. If a document is focused and the intent is `summary` or the intent score is weak (under 8), the answer summarizes the document. If a module matched and the intent is `module`, `sequence`, or weak, the answer is the module card, including the lock text "Noch nicht belegbar" when `lockReason` is set. That is why "Kann ich Maschinelles Lernen jetzt belegen?" returns M-INF-640 and the missing AI prerequisite instead of a generic plan.

Room matches score a name or alias higher than the campus word, so "Wo ist die Mensa in Vaihingen?" returns Pfaffenwaldring 45.

Credit and deadline answers include a line that the text is a demonstration record, not a live C@MPUS extract.

`src/assistant/context.ts` builds the input in the active language: student, totals, average, upcoming deadlines (`date >= today`), today's sessions, news, places, people, documents, reviews, exams, and the optional focused document. `renderFacts` flattens that input for the server. The client also slices facts to 24,000 characters before sending.

Summaries of bundled pages use `src/assistant/summarize.ts`: split sentences, then `summarize` and `asBullets`. Bundled documents already contain both languages, so translation does not need the model.

## Remote engine

`src/assistant/remote.ts`

- URL: resolved by `src/assistant/endpoints.ts` (documented in [assistant-tunnel.md](assistant-tunnel.md)): `EXPO_PUBLIC_ASSISTANT_TUNNEL_URL` while a tunnel is up, otherwise an explicit non-loopback `EXPO_PUBLIC_ASSISTANT_URL`, otherwise the Metro dev-server host (`Constants.expoConfig.hostUri`) on port 8787, otherwise `http://127.0.0.1:8787`. The value `off` skips the call.
- `POST /v1/assist` with `{ locale, question, facts, history }`. History is the last six turns.
- Abort after 40 seconds.
- Returns `null` on network failure, a non-OK status, or an empty `text`. The caller keeps the campus message.

`server/index.mjs` and `server/routes/assist.mjs`

- Loads `../.env` without overriding existing environment variables.
- `GET /health` → `{ ok: true, model: "grok-4.7", configured: boolean }`.
- Missing key → `503 { error: "missing_key" }`.
- System prompt, German or English: answer from the FACTS block only, invent no grades, rooms, deadlines, or ECTS, say when something is missing, do not pretend to be an official university system, stay short. The prompt is keyed in `server/i18n/` and read with `t(locale, 'assist.systemPrompt')` ([i18n.md](i18n.md)).
- User turn: `FACTS:` then the sheet, then `QUESTION:`.
- Request body: `{ model: "grok-4.7", store: false, input }`. Timeout 50 seconds.
- The reply is `output_text`, or the `output_text` blocks inside `output` messages.
- Upstream failure or an empty reply → 502. The app treats that as "keep the local answer".

`store: false` asks the provider not to retain the response. The fact sheet still contains the demonstration grades for that request. Do not point this server at a real student record until the retention story is reviewed again.

Chat replacement is per message id. Two `addMessage` calls run before the await (user, then campus assistant). `replaceMessage` swaps the assistant id when Grok returns. The bubble's engine label changes from the campus record to Grok.

## Checks

`npm run check` fixes the clock at 13 October 2026, 08:30, and asserts:

- 90 / 18 / 72 / 180 and average 1.9
- suggestion `num`, `hci`, `presentation`, `prakt`, `sec`, `ethics`
- German answers for remaining credits, the Vaihingen Mensa, exam registration, Tuesday's AI lecture, the Machine Learning lock, and the A* token in the week-3 summary

A live Grok call is not part of that script. With no key, `/health` reports `configured: false` and `/v1/assist` returns 503, which the client turns into a kept local answer.

## Limits

- Lexical intent, not embeddings. Paraphrases that share no key can fall through to the module fallback or a thin answer.
- The model can still ignore the system prompt. The local answer is the one the checks lock. Treat a Grok bubble as a wording pass over the fact sheet, and keep the campus engine.
- No streaming. The local bubble is the immediate response. The rewrite arrives in one replacement.
- No tool use on the provider side. The server does not let the model call back into the app.
