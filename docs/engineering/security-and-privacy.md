# Security and privacy

This build is a demonstration on one device. The rules below are what the code does now, and what a later backend must keep.

## Credentials

There is no password field. **C@MPUS öffnen** sends the student to `https://campus.uni-stuttgart.de/`, where they use the account they already have. **Mit SIAM anmelden** opens `https://idp.uni-stuttgart.de/idp/profile/oidc/authorize` once a client is registered. The app does not submit a SIAM password to either host. The password is typed there. The server exchanges the authorization code with `OIDC_CLIENT_SECRET` from `.env` and then calls UserInfo. Access tokens and refresh tokens stay in server memory. Async Storage keeps the account, name, email, subject, and a local session id used only to ask this server to revoke that memory entry.

`OIDC_LOGIN_HINT` may hold the account id so the identity provider can prefill its form. It is not accepted as a password. Environment variables named `OIDC_PASSWORD`, `PASSWORD`, `CAMPUS_PASSWORD`, `SIAM_PASSWORD`, and `UNI_PASSWORD` are ignored.

The demonstration button still opens Lena Hartmann's record without contacting the identity provider. Anyone who can open the app can reach that fictional record.

The flow, the discovery URLs, and the TIK registration step are in [oidc-login.md](oidc-login.md).

## API key

`XAI_API_KEY`, `CAMPUS_BEARER_TOKEN`, and `CAMPUS_SESSION_COOKIE` are read by `server/index.mjs` from the environment or from a git-ignored `.env`. `.gitignore` lists `.env` and `.env*.local`. `.env.example` leaves the secrets empty and must stay empty. `npm run campus:token` and `npm run campus:session` write the two campus values, set `.env` to mode `0600`, and print only a masked confirmation. The campus token and the `PSESSIONID` value are not `EXPO_PUBLIC_` variables. `/health` reports `campus.tokenConfigured` and `campus.sessionCookieConfigured`, plus the study and element ids. It does not return either secret. The Schnittstelle screen can replay only the routes in `server/catalog.mjs`, including the study chooser at `GET /v1/campus/studies`. It cannot pass a URL through to C@MPUS.

`EXPO_PUBLIC_*` variables are embedded in the client. The only one this app uses is `EXPO_PUBLIC_ASSISTANT_URL`, which is a URL, not a secret. Do not rename the key so that it starts with `EXPO_PUBLIC_`. On the LAN path it is a local address. On the tunnel path it is a `trycloudflare.com` hostname that anyone who reads the bundle can see, and every assistant route is public while that tunnel is up, so the hostname is sensitive for the length of a session — see [assistant-tunnel.md](assistant-tunnel.md).

The server sends `Authorization: Bearer` to `https://api.x.ai/v1`. The client never sees that header.

## What leaves the device

| Data | Leaves the device? |
| --- | --- |
| Password | No. It is typed at the identity provider |
| Authorization code | Sent once to this server, then exchanged. Not stored |
| Access token and refresh token | Stay in the server process. Not sent back to the app |
| Account, name, email from UserInfo | Stored on the device so the profile can show them |
| Catalog grades, rooms, deadlines | Only inside the fact sheet, and only if the student asks a question while the assistant server is reachable |
| Chat history (last six turns) | Same request, sliced |
| Focused document text | Included in that fact sheet when a document is open |
| Imported personal notes | Included only when that note is the focused document or part of the facts the client already builds |
| Reviews and recognition drafts | Stay in Async Storage unless a later feature adds them to the fact sheet |

The fact sheet is capped at 24,000 characters. The request body on the server is capped at 200 KB.

`store: false` is set on the Responses API call so the provider is asked not to retain the stored response. The request still transits xAI for the duration of the call. Do not send a real transcript until that is an accepted processing purpose.

Without a key the server answers `/v1/assist` with 503 and the client keeps the local answer. No fact sheet is forwarded in that case, because the server returns before it reads the upstream.

## What stays on the device

Async Storage key `stuttgart-uni-assistant/v1` holds language, session account, the mapped C@MPUS curriculum nodes, the mapped C@MPUS study list, sync timestamps, download ids, imports (including note text), reviews, recognition drafts, chat, and planned module ids. The nodes and the study list are names and ids from one response each, not the bearer token.

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
