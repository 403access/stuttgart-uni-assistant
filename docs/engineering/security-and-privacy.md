# Security and privacy

This build is a demonstration on one device. The rules below are what the code does now, and what a later backend must keep.

## Credentials

The login form has a password field so the SIAM moment is visible. The handler does not put the password in state, Async Storage, logs, or a request. `signIn` stores the trimmed account string, or `st123456` when the field is blank. Sign-out clears `sessionAccount` and leaves the rest of the device record.

There is no account database. Anyone who can open the app can reach the fictional record. That is acceptable only because the record is fictional.

A real deployment uses server-side OpenID Connect. The university password stays on the identity provider. See [integrations](integrations.md).

## API key

`XAI_API_KEY` is read by `server/index.mjs` from the environment or from a git-ignored `.env`. `.gitignore` lists `.env` and `.env*.local`. `.env.example` has an empty key and must stay empty.

`EXPO_PUBLIC_*` variables are embedded in the client. The only one this app uses is `EXPO_PUBLIC_ASSISTANT_URL`, which is a URL, not a secret. Do not rename the key so that it starts with `EXPO_PUBLIC_`.

The server sends `Authorization: Bearer` to `https://api.x.ai/v1`. The client never sees that header.

## What leaves the device

| Data | Leaves the device? |
| --- | --- |
| Password | No |
| Catalog grades, rooms, deadlines | Only inside the fact sheet, and only if the student asks a question while the assistant server is reachable |
| Chat history (last six turns) | Same request, sliced |
| Focused document text | Included in that fact sheet when a document is open |
| Imported personal notes | Included only when that note is the focused document or part of the facts the client already builds |
| Reviews and recognition drafts | Stay in Async Storage unless a later feature adds them to the fact sheet |

The fact sheet is capped at 24,000 characters. The request body on the server is capped at 200 KB.

`store: false` is set on the Responses API call so the provider is asked not to retain the stored response. The request still transits xAI for the duration of the call. Do not send a real transcript until that is an accepted processing purpose.

Without a key the server answers `/v1/assist` with 503 and the client keeps the local answer. No fact sheet is forwarded in that case, because the server returns before it reads the upstream.

## What stays on the device

Async Storage key `stuttgart-uni-assistant/v1` holds language, session account, sync timestamps, download ids, imports (including note text), reviews, recognition drafts, chat, and planned module ids.

Async Storage is not an encrypted vault. On a shared phone, the notes are readable to someone who can open the app sandbox. Reset in Einstellungen deletes that payload except language and session. Uninstalling the app drops it with the sandbox.

Imports of binary PDFs store a name and a short explanation, not a promise of encrypted storage.

## People and grades

Staff names, consultation hours, and emails are invented. Emails end in `@demo.uni-stuttgart.test`, which is not a deliverable university domain. There are no phone numbers. Grades belong to Lena Hartmann and are part of the fixture. They must not be replaced with a real student's transcript in the bundle or in a committed `.env`.

## Past papers and lecture files

Past-exam screens list topics, a focus, and a hint. They do not link to an exam PDF. Redistributing official exams or lecture decks is outside this project even when a student already has a copy.

Peer sharing sets `shared: true` on the local import. It does not upload. A future upload service needs a rule that solution guides and third-party texts are not republished as if the university hosted them.

## Network surface of the proxy

The server listens on `0.0.0.0` so a phone on the same LAN can connect. CORS allows any origin. That matches Expo web on a different port during development. A public host should restrict the origin, terminate TLS, and not leave the process open on a raw port without authentication. The demo server has no auth on `/v1/assist`. Anyone who can reach it and who has placed a key in the environment can spend that key. Run it on localhost unless you intend the LAN demo.

## Identity of the binary

`app.json` uses the display name "Stuttgart Uni" and the bundle id `dev.demo.stuttgartuniassistant` on iOS and Android. The id is deliberately not a `uni-stuttgart.de` identifier. The mark in `src/components/ui.tsx` is two original circles. The university signet is not in the asset catalog. Univers is not embedded.

The web shell (`app/+html.tsx`) sets `lang="de"` and a light page background. It does not present itself as an official university host.

## Threats this build does not claim to handle

- A modified client can still show the fictional record. There is no integrity check against a server.
- The local assistant can be wrong on paraphrases it does not score. It is not a source of examination-law advice. The copy says the record is a demonstration.
- `npm audit` reports vulnerabilities in the Expo dependency tree. Do not run `npm audit fix --force`. It rewrites the SDK. Upgrade Expo on purpose, with `npx expo install --fix` and a typecheck.
