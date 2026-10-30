# Security and privacy

This build is a demonstration on one device. The rules below are what the code does now, and what a later backend must keep.

## Credentials

There is no password field on the SIAM path. **C@MPUS öffnen** sends the student to `https://campus.uni-stuttgart.de/`, where they use the account they already have. **Mit SIAM anmelden** opens `https://idp.uni-stuttgart.de/idp/profile/oidc/authorize` once a client is registered. The app does not submit a SIAM password to either host. The password is typed there. The server exchanges the authorization code with `OIDC_CLIENT_SECRET` from `.env` and then calls UserInfo. Access tokens and refresh tokens stay in server memory. Each sign-in also creates or refreshes a server-side user and mints an app session token ([accounts.md](accounts.md)); the token is kept in the device keychain/Keystore on native and in AsyncStorage on web, and Async Storage keeps the public account record (account, name, email, subject, platform links).

One deliberate exception exists on the C@MPUS browser path: the opt-in `Automatisch anmelden` keeps the st-account password in the device vault (`expo-secure-store`, optional biometric gate) so the hidden WebView can fill the official form. The C@MPUS sign-in itself adopts only the harvested session: the password is never submitted to C@MPUS and never sent to the assistant server for it. Since the st-account is also the UniMail account, a successful automated sign-in reuses the same password to connect UniMail, and that proof runs on the assistant server against the TIK IMAP host — so the password does reach the server's process memory, exactly as a manual UniMail connect does (see [mail.md](mail.md)). It is never logged, echoed, or persisted. The vault is deleted on sign-out. The saved credential can be revealed on demand on the login screen or under `Sicherheit → C@MPUS-Zugangsdaten`, behind the same biometric gate and hidden again after 30 seconds. This is beta-only, it is the one place in the project that stores a university password, and it is bounded by the rules in [campus-browser-login.md](campus-browser-login.md) and [08-maintenance.md](../sdlc/08-maintenance.md).

`OIDC_LOGIN_HINT` may hold the account id so the identity provider can prefill its form. It is not accepted as a password. Environment variables named `OIDC_PASSWORD`, `PASSWORD`, `CAMPUS_PASSWORD`, `SIAM_PASSWORD`, and `UNI_PASSWORD` are ignored.

## C@MPUS portal credentials

The C@MPUS portal credential is per account. A browser harvest is validated by
`POST /v1/campus/credentials` and kept in process memory behind a one-shot
ticket (10 minutes); `/v1/campus/login` attaches it to the user id that the
profile creates. Nothing about that credential is written to SQLite. A server
restart drops it, and the account has to reconnect C@MPUS.

The operator `.env` credential is not copied into a per-user row. `user_campus`
records only that the account signed in with it, and the server reads
`CAMPUS_BEARER_TOKEN` / `CAMPUS_SESSION_COOKIE` from the environment on each
call. If that account is A, account B cannot use A's `.env` credential by
accident: `resolveCampusCredential` answers `409 campus_credentials_missing`
unless B has its own harvest or its own `user_campus` row.

Every `/v1/campus/*` route except `config`, `credentials`, and `login` requires
the app bearer token, and the store rows are keyed by that user id. A sync job id
from another account is a 404, and `/v1/campus/tree`, `/v1/campus/courses/all`,
and `/v1/campus/calls` answer only from the caller's rows.

The demonstration button still opens Lena Hartmann's record without contacting the identity provider. Anyone who can open the app can reach that fictional record.

The flow, the discovery URLs, and the TIK registration step are in [oidc-login.md](oidc-login.md).

## Admin dashboard

`DASHBOARD_TOKEN` gates the operator dashboard at `/admin`. If it is unset, the
page shows setup instructions and every `/v1/admin/*` route returns
`503 admin_unconfigured`. The login form compares the token with a
constant-time SHA-256 digest and sets `ua_admin` as an `HttpOnly`,
`SameSite=Strict` cookie for 12 hours (`Secure` when the request arrived over
HTTPS). The token is never logged, never placed in an `EXPO_PUBLIC_` variable,
and never stored in the page or `localStorage`.

The dashboard shows account metadata, sessions, platform links, portal counts,
curriculum/course data, calendar events, portal call diagnostics, and persisted
service logs. It never returns a C@MPUS bearer token, `PSESSIONID`, a password,
or an app session token. Service log lines carry outcomes, counts, and ids,
never request bodies with credentials. Destructive actions are confirmed in the
UI, and every mutation writes one row to the `admin_audit` table (account
snapshot, action, compact detail, timestamp) without credentials. Details:
[admin-dashboard.md](admin-dashboard.md).

## API key

`XAI_API_KEY`, `CAMPUS_BEARER_TOKEN`, and `CAMPUS_SESSION_COOKIE` are read by `apps/server/index.mjs` from the environment or from a git-ignored `.env`. `.gitignore` lists `.env` and `.env*.local`. `.env.example` leaves the secrets empty and must stay empty. `npm run campus:token` and `npm run campus:session` write the two campus values, set `.env` to mode `0600`, and print only a masked confirmation. The campus token and the `PSESSIONID` value are not `EXPO_PUBLIC_` variables. `/health` reports `campus.tokenConfigured` and `campus.sessionCookieConfigured`, plus the study and element ids. It does not return either secret. The Schnittstelle screen can replay only the routes in `apps/server/catalog.mjs`, including the study chooser at `GET /v1/campus/studies`. It cannot pass a URL through to C@MPUS.

`EXPO_PUBLIC_*` variables are embedded in the client. This app uses two, `EXPO_PUBLIC_ASSISTANT_URL` and `EXPO_PUBLIC_ASSISTANT_TUNNEL_URL`, and both are URLs, not secrets. Do not rename either key so that it starts with `EXPO_PUBLIC_`. `EXPO_PUBLIC_ASSISTANT_URL` is the base URL: a local address on the LAN path, and the computer's LAN address on a phone. `EXPO_PUBLIC_ASSISTANT_TUNNEL_URL` holds a `trycloudflare.com` hostname while a tunnel is up, so it is the more sensitive of the two: anyone who reads the bundle can see it, and every assistant route is public while that tunnel is up, so the hostname is sensitive for the length of a session. The tunnel script clears it again when the tunnel stops — see [assistant-tunnel.md](assistant-tunnel.md).

The server sends `Authorization: Bearer` to `https://api.x.ai/v1`. The client never sees that header.

## App lock

The optional App Lock uses `expo-local-authentication` and the device's own Face
ID / fingerprint prompt. The operating system performs the match; the app only
receives success or failure and never sees a biometric template. The preference
is a boolean in the AsyncStorage key `university-assistant/onboarding.v2`, not a
secret and not encrypted.

The lock is a UI gate: it covers the navigator on launch and after a return from
the background, but it does not encrypt AsyncStorage and does not replace the
`expo-secure-store` session token. It is armed whenever the saved preference is
on. If the sensor is unavailable or all enrolled biometrics are removed, the
system prompt can fall back to the device passcode; the lock screen always offers
sign-out, and Einstellungen can disable the preference at any time.
Implementation details are in [onboarding.md](onboarding.md).

## What leaves the device

| Data | Leaves the device? |
| --- | --- |
| Password (SIAM path) | No. It is typed at the identity provider |
| Password (automated C@MPUS path) | Not to C@MPUS or the identity provider: the harvested session signs the device in. The same st-password is reused to connect UniMail and is sent to the assistant server, which proves it against TIK IMAP and uses it for SMTP submission (see [mail.md](mail.md)) |
| Authorization code | Sent once to this server, then exchanged. Not stored |
| Access token and refresh token | Stay in the server process. Not sent back to the app |
| Account, name, email from UserInfo | Stored on the device so the profile can show them |
| App session token | Sent as `Authorization: Bearer` on `/v1/auth/*` calls; stored hashed on the server, in the device keychain/Keystore (AsyncStorage on web) |
| Biometric match (App Lock) | No. Face ID / fingerprint matching stays in the operating system; the app receives only success or failure |
| Catalog grades, rooms, deadlines | Only inside the fact sheet, and only if the student asks a question while the assistant server is reachable |
| Chat history (last six turns) | Same request, sliced |
| Focused document text | Included in that fact sheet when a document is open |
| Imported personal notes | Included only when that note is the focused document or part of the facts the client already builds |
| Reviews and recognition drafts | Stay in Async Storage unless a later feature adds them to the fact sheet |
| Mail rows, body text and attachments | Travel between the app and the assistant server over the configured assistant URL; the server talks IMAP/SMTP. Attachments are only held in memory during submission |
| Mail drafts and recipient history | Stay in Async Storage on the device and are cleared on sign-out; large attachments are not stored in drafts |
| Quiz answers, correctness, topic/question snapshots, and completed rounds | Sent to the assistant server when signed in (`POST /v1/quiz/sync`) and stored under the account for the operator dashboard. Prepared offline answers sit in a device queue and are cleared on sign-out |

The fact sheet is capped at 24,000 characters. The assistant request body is capped at 200 KB; the mail send route separately accepts up to 12 MB so attachments fit as base64.

`store: false` is set on the Responses API call so the provider is asked not to retain the stored response. The request still transits xAI for the duration of the call. Do not send a real transcript until that is an accepted processing purpose.

Without a key the server answers `/v1/assist` with 503 and the client keeps the local answer. No fact sheet is forwarded in that case, because the server returns before it reads the upstream.

## What stays on the device

Async Storage key `university-assistant/v1` holds language, session account, the server user record and its platform links, the mapped C@MPUS curriculum nodes, the mapped C@MPUS study list, sync timestamps, download ids, imports (including note text), reviews, recognition drafts, chat, and planned module ids. The nodes and the study list are names and ids from one response each, not the bearer token.

Quiz data uses separate keys: `university-assistant/quiz/v1` for local progress, active rounds, and session history; `university-assistant/quiz-catalog/v1` for the cached server catalog; and `university-assistant/quiz-sync/v1` for answers waiting to be uploaded. The catalog cache is public content. The sync queue is cleared on sign-out so a previous account's free-text answers cannot be attributed to the next sign-in.

Async Storage key `university-assistant/onboarding.v2` holds the one-time onboarding timestamp and the App Lock boolean. It is device-level rather than account-level, survives sign-out and a local reset, and contains no biometric data.

The app session token is separate from that payload: `expo-secure-store` (iOS keychain, Android Keystore-encrypted `SharedPreferences`) on native, AsyncStorage on web where no secure store exists. The server stores only the SHA-256 hash of the token, so the database cannot be replayed as a login. Sign-out revokes the server session and deletes the device token.

Async Storage is not an encrypted vault. On a shared phone, the notes are readable to someone who can open the app sandbox. The single exception is the opt-in C@MPUS autologin credential: it lives in `expo-secure-store` (iOS keychain, Android Keystore-encrypted `SharedPreferences`), optionally behind biometrics, deleted on sign-out, and the account id alone is mirrored to Async Storage as a non-secret hint. Reset in Einstellungen deletes the Async Storage payload except language and session. Uninstalling the app drops it with the sandbox, except the iOS keychain, which survives a reinstall with the same bundle id — so sign-out, not uninstall, is what removes the vault.

Imports of binary PDFs store a name and a short explanation, not a promise of encrypted storage.

## People and grades

Staff names, consultation hours, and emails are invented. Emails end in `@demo.uni-stuttgart.test`, which is not a deliverable university domain. There are no phone numbers. Grades belong to Lena Hartmann and are part of the fixture. They must not be replaced with a real student's transcript in the bundle or in a committed `.env`.

## Past papers and lecture files

Past-exam screens list topics, a focus, and a hint. They do not link to an exam PDF. Redistributing official exams or lecture decks is outside this project even when a student already has a copy.

Peer sharing sets `shared: true` on the local import. It does not upload. A future upload service needs a rule that solution guides and third-party texts are not republished as if the university hosted them.

## Network surface of the proxy

The server listens on `0.0.0.0` so a phone on the same LAN can connect. CORS allows any origin. That matches Expo web on a different port during development. A public host should restrict the origin, terminate TLS, and not leave the process open on a raw port without authentication. The demo server has no auth on `/v1/assist`. It also has no auth on `POST /v1/auth/session`, which creates a `demo` or `local` user; campus and OIDC users are only created by their verified routes. `GET /v1/quiz/catalog` is a public read-only quiz catalog; `POST /v1/quiz/sync` requires the app bearer token and writes only that user's answers. Every other campus route requires the app bearer token and reads only that user's rows. Anyone who can reach the server and who has placed a key in the environment can spend that key. The operator dashboard is gated by `DASHBOARD_TOKEN`; leave it unset to keep the dashboard disabled, and do not expose `/admin` or `/v1/admin/*` on a public host without TLS. Run it on localhost unless you intend the LAN demo.

## Identity of the binary

`app.json` uses the display name "University Assistant" and the bundle id `dev.demo.universityassistant` on iOS and Android. The id is deliberately not a `uni-stuttgart.de` identifier. The mark in `apps/mobile/src/components/ui.tsx` is two original circles. The university signet is not in the asset catalog. Univers is not embedded.

The web shell (`apps/mobile/app/+html.tsx`) sets `lang="de"` and a light page background. It does not present itself as an official university host.

## Threats this build does not claim to handle

- A modified client can still show the fictional record. There is no integrity check against a server.
- The local assistant can be wrong on paraphrases it does not score. It is not a source of examination-law advice. The copy says the record is a demonstration.
- `npm audit` reports vulnerabilities in the Expo dependency tree. Do not run `npm audit fix --force`. It rewrites the SDK. Upgrade Expo on purpose, with `npx expo install --fix` and a typecheck.
