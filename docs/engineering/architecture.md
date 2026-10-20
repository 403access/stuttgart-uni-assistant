# Architecture

University Assistant is a single Expo client plus an optional Node proxy. The academic record is compiled into the client. Screens and the assistant read that record. The client calls the local server for two things: the optional Grok rewrite, and the OpenID Connect start, code exchange, and logout. The browser, not the app, talks to `https://idp.uni-stuttgart.de`.

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
src/i18n/                    German/English catalogs and the `tx` lookup
server/index.mjs             HTTP listener; dispatches to server/routes/
server/http.mjs              Body parsing, JSON and HTML responses, CORS
server/routes/               One module per group of paths
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
| `src/auth` | The sign-in flows, the device vault, the server session token, and the pure user parser |
| `src/data` | The fictional catalog: program, modules, people, places, deadlines, news, documents, reviews, exams, tutorials |
| `src/domain/plan.ts` | Pure functions over that catalog |
| `src/assistant` | Turn a question into an answer, then optionally ask the server to rewrite it |
| `src/i18n` | The German and English catalogs and the `tx(locale, key)` lookup every screen reads its copy from ([i18n.md](i18n.md)) |
| `src/documents/io.ts` | Pick a file and export text. `expo-file-system` is imported only on the native branch |
| `src/campus/db.ts` + `db.web.ts` | Curriculum, course, and API-call cache. SQLite (`expo-sqlite`) on native, AsyncStorage on web — the web module never imports the native one, following the same platform split |

## Data flow for a question

1. The chat screen builds an `AnswerInput` from the catalog, the language, the clock, and an optional focused document (`buildAnswerInput`).
2. `buildLocalAnswer` writes the bubble and appends it with `engine: 'campus'`.
3. The same input is flattened by `renderFacts`.
4. `askGrok` POSTs `{ locale, question, facts, history }` to `EXPO_PUBLIC_ASSISTANT_TUNNEL_URL` when a tunnel is up, otherwise `EXPO_PUBLIC_ASSISTANT_URL` or `http://127.0.0.1:8787`, with a 40 second abort.
5. A non-empty reply replaces that message and sets `engine: 'grok'`. Any failure leaves the campus bubble.

The history sent upstream is the messages already in state plus the new user turn. `setState` is asynchronous, so the hook's `messages` array does not yet include the turn that was just added. The chat screen passes that turn explicitly.

Document summary and plain language follow the same pair: extractive text first (`summarize`, `asBullets`), Grok when the server returns text. Translation of a bundled document switches the other language immediately and does not wait on the network.

## Persistence

One Async Storage key, `university-assistant/v1`. The shape is `PersistedState` in `src/types.ts`. Writes happen after the first successful load, so an empty initial state does not wipe a stored record. `sanitize` drops unexpected shapes on read. Chat is capped at 40 messages. Imports are capped at 40. Reset clears notes, reviews, transfers, downloads, sync stamps, planned modules, and chat, and keeps the language and the session.

The password never enters this object. The opt-in C@MPUS autologin credential is the only secret on the device: it lives beside the key in `expo-secure-store`, never in `PersistedState` and never in the assistant server — see [campus-browser-login.md](campus-browser-login.md). The `PersistedState` record carries a copy of the server user (`user`), but not the session token: that lives in `expo-secure-store` on native (or AsyncStorage on web) and is the only thing sent as a bearer header. See [accounts.md](accounts.md).

The curriculum, course, and API-call caches live outside that key in `campus-cache.db` (`expo-sqlite`, with the plugin in `app.json`), or in AsyncStorage on web where the native module is not bundled. The API log keeps the newest 1000 calls. Clearing a study drops its structures and courses; the call history has its own clear.

## Assistant server

`server/index.mjs` has no npm dependencies and is only the listener: it reads `../.env` if present, without adding those values over variables that are already set, and hands each request to the matching module in `server/routes/`. Its user-facing copy — the Grok system prompt — is keyed in `server/i18n/` the same way the app keys its strings ([i18n.md](i18n.md)).

| Route | Behavior |
| --- | --- |
| `GET /health` | `{ ok, model: "grok-4.7", configured, oidc, campus, mail, admin }`. `campus` is `tokenConfigured`, `sessionCookieConfigured`, `studyId`, and `elementId`; `admin` is `{ configured }` |
| `GET /v1/api` | The operation list in `server/catalog.mjs`. No secrets |
| `GET /v1/campus/config` | Public `.env` status; with a bearer it adds the caller's `credentialActive` and `credentialSource` |
| `GET /v1/campus/studies` | **Bearer.** The study chooser, stored for the caller. Name, degree, status, and the root element id per study |
| `POST /v1/campus/credentials` | Validates a browser harvest. Signed in: stores it for that user. Signed out: returns a one-shot `ticket` |
| `POST /v1/campus/login` | Body `{ ticket }`, a signed-in user's stored credential, or `.env`. Reads the root, stores the rows for the user, and returns the profile plus the server `user`, `token`, and `expiresAt` |
| `POST /v1/campus/structure` | **Bearer.** Same read for an optional positive integer `elementId` and `studyId`; a bare `studyId` resolves the root through the chooser |
| `POST /v1/campus/courses` | **Bearer.** Courses of one curriculum element (`studyId`, required `elementId`). An empty list is valid |
| `GET /v1/oidc/config` | Public OIDC status. No secret, no login hint |
| `POST /v1/oidc/start` | Authorize URL for a redirect this server allows |
| `POST /v1/oidc/exchange` | Code exchange and UserInfo. Returns profile claims and the server `user`, `token`, and `expiresAt`; not the university tokens |
| `POST /v1/oidc/logout` | Revokes the server-side token and drops the session |
| `POST /v1/auth/session` | Creates a `demo` or `local` user and session |
| `GET /v1/auth/me` | Resolves the `Authorization: Bearer` token to the public user and its platform links |
| `POST /v1/auth/logout` | Revokes the calling session token |
| `POST /v1/auth/links` | Links or refreshes one platform on the signed-in user |
| `DELETE /v1/auth/links/<platform>` | Removes one platform link |
| `POST /v1/auth/sync` | Sets the `lastSyncAt` of one platform link |
| `GET /admin` | The operator dashboard HTML. Safe without a cookie; it renders login/setup. |
| `POST /v1/admin/login` | Compares `DASHBOARD_TOKEN`, sets the `HttpOnly` admin cookie. `503` when unconfigured. |
| `POST /v1/admin/logout` | Clears the admin cookie. |
| `GET/POST/DELETE /v1/admin/*` | Cross-user stats, list, detail, per-study curriculum/course/event/call explorers, edits, session revoke, platform link/touch/unlink, C@MPUS disconnect, portal/calendar/call clears, audit, system status, sync cancellation, mail disconnect, delete. Admin cookie required and every mutation audited. |
| `POST /v1/assist` | 503 `missing_key` when `XAI_API_KEY` is absent. Otherwise forwards to `https://api.x.ai/v1/responses` with `store: false` and a 50 second timeout. |

## Server store

The assistant server keeps its own SQLite database, `server/campus-server.db` (`node:sqlite`, requires Node 22.5 or newer, git-ignored, overridable with `CAMPUS_DB_PATH`). It is the source of truth for portal data; the app keeps its own copy for offline use. Every portal table is keyed by `user_id`: `user_curriculum_nodes` with per-element `expanded` flags, `user_curriculum_sync`, `user_courses` plus `user_course_elements` links, `user_courses_sync` with fetched element ids, a `user_studies_snapshot` row per user, `user_exported_events`, and a `user_portal_calls` log (newest 2000 hops per user). It also holds the accounts — `users`, `user_sessions` (only token hashes), `user_platforms` — and `user_campus`, which records whether a user signed in with a browser harvest or the operator `.env` credential. The `admin_audit` table keeps one row per operator mutation with an account snapshot and no credentials; rows survive account deletion. See [accounts.md](accounts.md). The operator dashboard in `server/admin.mjs` reads and edits these tables; it is gated by `DASHBOARD_TOKEN` and documented in [admin-dashboard.md](admin-dashboard.md).

Every portal read persists into the store as it arrives under the signed-in user id. Reads are live-first: on portal failure the server answers from that user's store when the requested element was expanded before, marked `cached: true`. An `invalid_token` (or any other 401) triggers one renewal through the portal refresh endpoint with that user's session cookie, then retries the failed call — the renewed bearer stays in process memory. The renewal also runs proactively, on a fixed cadence (`CAMPUS_REFRESH_MINUTES`, default 10 min) for every remembered user credential and for the `.env` credential, and once at startup. Sync jobs (`server/sync.mjs`, `POST /v1/campus/sync`, polled via `GET /v1/campus/sync/<id>`, cancelled via `DELETE`) carry the user id and walk a whole study in the background with the same 3-attempt retry as the app; a job id from another user is a 404. Jobs live in memory — a server restart drops them, the stored rows stay. Snapshots (`GET /v1/campus/tree`, `GET /v1/campus/courses/all`) and the portal history (`GET /v1/campus/calls`) serve only the caller's rows without touching the portal.
| Anything else | 404 |

The body is capped at 200 KB. The question is sliced to 4,000 characters, the fact sheet to 24,000, and history to the last six turns. CORS allows any origin so Expo web on another port can call a local server. That is acceptable for a local demo and too open for a public host. See [security and privacy](security-and-privacy.md).

## What is intentionally not a layer

ILIAS and SDG Campus still have no client. C@MPUS has two reads, the curriculum structure in [campus-curriculum.md](campus-curriculum.md) and the study chooser in [campus-studies.md](campus-studies.md). `server/campus.mjs` holds `CAMPUS_BEARER_TOKEN` and `CAMPUS_SESSION_COOKIE` and will not forward an arbitrary URL. SIAM sign-in is the identity-provider flow in [oidc-login.md](oidc-login.md): the screen opens the browser, and `server/oidc.mjs` holds the client secret. A later connector for timetable and grades belongs behind that same server, replacing `src/data` for the signed-in student. The Schnittstelle screen at `/api` only replays the routes in the table above.
