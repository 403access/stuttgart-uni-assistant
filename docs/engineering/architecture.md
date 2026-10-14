# Architecture

Stuttgart Uni is a single Expo client plus an optional Node proxy. The academic record is compiled into the client. Screens and the assistant read that record. The client calls the local server for two things: the optional Grok rewrite, and the OpenID Connect start, code exchange, and logout. The browser, not the app, talks to `https://idp.uni-stuttgart.de`.

```text
app/                         Expo Router screens
  _layout.tsx                splash gate, stack
  (tabs)/                    Heute, Studium, Chat, Campus, Mehr
  <feature>.tsx              stack screens
src/data/                    bundled record (no React)
src/domain/plan.ts           totals, locks, suggestion, search
src/assistant/               local answers, fact sheet, Grok client
src/state/AppState.tsx       Async Storage
src/documents/io.ts          picker and export
src/components/ui.tsx        shared visual pieces
server/index.mjs             POST /v1/assist → api.x.ai
```

`src/data/` and `src/domain/plan.ts` do not import React, so `scripts/check-assistant.ts` can assert the catalog without starting Metro.

## Navigation

Expo Router, file-based, typed routes. A group such as `(tabs)` does not appear in the URL: `app/(tabs)/chat.tsx` is `/chat`. Dynamic screens are pushed with a pathname and params, for example `{ pathname: '/modul/[id]', params: { id } }`.

The root layout owns the session:

1. `preventAutoHideAsync` keeps the splash visible.
2. `AppStateProvider` loads Async Storage.
3. `Gate` reads `useSegments`. Signed out and not on `/login` replaces to `/login`. Signed in and on `/login` replaces to `/`. Otherwise the gate is settled.
4. The stack stays mounted at opacity 0 until then, so `router.replace` has a navigator. The splash hides only after the route matches the session.

Stack headers are off. Each screen draws its own title with the shared `Screen` component.

`ios/` and `android/` are not in the tree. Continuous Native Generation creates them from `app.json` at prebuild time. Do not add them by hand.

## Client layers

| Layer | Responsibility |
| --- | --- |
| Screens in `app/` | Render, collect input, call `useApp` and the domain helpers |
| `src/state` | Session, language, and everything the student types |
| `src/data` | The fictional catalog: program, modules, people, places, deadlines, news, documents, reviews, exams, tutorials |
| `src/domain/plan.ts` | Pure functions over that catalog |
| `src/assistant` | Turn a question into an answer, then optionally ask the server to rewrite it |
| `src/documents/io.ts` | Pick a file and export text. `expo-file-system` is imported only on the native branch |

## Data flow for a question

1. The chat screen builds an `AnswerInput` from the catalog, the language, the clock, and an optional focused document (`buildAnswerInput`).
2. `buildLocalAnswer` writes the bubble and appends it with `engine: 'campus'`.
3. The same input is flattened by `renderFacts`.
4. `askGrok` POSTs `{ locale, question, facts, history }` to `EXPO_PUBLIC_ASSISTANT_URL` or `http://127.0.0.1:8787`, with a 40 second abort.
5. A non-empty reply replaces that message and sets `engine: 'grok'`. Any failure leaves the campus bubble.

The history sent upstream is the messages already in state plus the new user turn. `setState` is asynchronous, so the hook's `messages` array does not yet include the turn that was just added. The chat screen passes that turn explicitly.

Document summary and plain language follow the same pair: extractive text first (`summarize`, `asBullets`), Grok when the server returns text. Translation of a bundled document switches the other language immediately and does not wait on the network.

## Persistence

One Async Storage key, `stuttgart-uni-assistant/v1`. The shape is `PersistedState` in `src/types.ts`. Writes happen after the first successful load, so an empty initial state does not wipe a stored record. `sanitize` drops unexpected shapes on read. Chat is capped at 40 messages. Imports are capped at 40. Reset clears notes, reviews, transfers, downloads, sync stamps, planned modules, and chat, and keeps the language and the session.

The password never enters this object.

## Assistant server

`server/index.mjs` has no npm dependencies. It reads `../.env` if present, without adding those values over variables that are already set.

| Route | Behavior |
| --- | --- |
| `GET /health` | `{ ok, model: "grok-4.7", configured, oidc, campus }` with `campus.tokenConfigured` only |
| `GET /v1/oidc/config` | Public OIDC status. No secret, no login hint |
| `POST /v1/oidc/start` | Authorize URL for a redirect this server allows |
| `POST /v1/oidc/exchange` | Code exchange and UserInfo. Returns profile claims, not tokens |
| `POST /v1/oidc/logout` | Revokes the server-side token and drops the session |
| `POST /v1/assist` | 503 `missing_key` when `XAI_API_KEY` is absent. Otherwise forwards to `https://api.x.ai/v1/responses` with `store: false` and a 50 second timeout. |
| Anything else | 404 |

The body is capped at 200 KB. The question is sliced to 4,000 characters, the fact sheet to 24,000, and history to the last six turns. CORS allows any origin so Expo web on another port can call a local server. That is acceptable for a local demo and too open for a public host. See [security and privacy](security-and-privacy.md).

## What is intentionally not a layer

There is no API client for C@MPUS, ILIAS, or SDG Campus. SIAM sign-in is the identity-provider flow in [oidc-login.md](oidc-login.md): the screen opens the browser, and `server/oidc.mjs` holds the client secret. A later connector for timetable and grades belongs behind that same server, replacing `src/data` for the signed-in student.
