# Admin dashboard

A server-hosted operator console for the user store, sessions, platform links,
C@MPUS and ILIAS data, portal activity, app news, and server health. Open
`http://127.0.0.1:8787/admin` while the assistant server is running. It is a
plain HTML page served by `server/routes/admin/index.mjs`; there is no separate
frontend build and no npm dependency. The browser modules are native ES modules,
also served by the same Node process.

## Access

Set a token in `.env`:

```bash
DASHBOARD_TOKEN=<a long random value>
```

Restart `npm run assistant`. Without a token the page shows setup instructions
and every `/v1/admin/*` route answers `503 admin_unconfigured`; there is no
open-by-default fallback.

The login form posts the token to `POST /v1/admin/login`. On success the server
sets `ua_admin` as an `HttpOnly`, `SameSite=Strict` cookie for 12 hours (and
`Secure` when the request arrived over HTTPS). The token is compared with a
constant-time digest, is never logged, and is not stored in the page or in
`localStorage`. `POST /v1/admin/logout` clears the cookie.

The dashboard is same-origin with its API. The page sends
`credentials: same-origin` and the HTML response carries `X-Frame-Options:
DENY`, `Referrer-Policy: no-referrer`, and a CSP that allows only same-origin
requests and the inline styles/script the page ships.

## Navigation

The client is a small hash-routed single-page app. Every view has a deep link
that survives reloads and can be shared between operators:

| Hash | View |
| --- | --- |
| `#/overview` | KPI cards, distribution bars, recent accounts, recent audit actions, configuration health |
| `#/news` | Operator-managed app news with drafts, publishing, editing, and deletion |
| `#/users` | Searchable, filterable, sortable, paginated account list with bulk actions and CSV export |
| `#/devices` | QR-linked web browsers with form factor, OS, browser, IP address, account, state, timestamps, and revoke |
| `#/devices/<id>` | One browser pairing: client details, IP addresses, account, session, timestamps, user agent, and revoke |
| `#/ilias` | ILIAS connections, session state, and parsed course/news/mail counts |
| `#/users/<id>/overview` | Profile, status, per-study summary, audit preview, delete zone |
| `#/users/<id>/sessions` | App sessions with state, timestamps, copy and revoke |
| `#/users/<id>/devices` | Web browsers approved by this account through the QR flow |
| `#/users/<id>/platforms` | C@MPUS, ILIAS, SDG Campus, SIAM, and UniMail links |
| `#/users/<id>/campus` | C@MPUS credential source, per-study data, calendar/call maintenance |
| `#/users/<id>/ilias` | ILIAS session state, parsed dashboard, live content browser, members tab, and disconnect |
| `#/users/<id>/data` | Curriculum nodes and courses per study, with search, state filter, and pagination |
| `#/users/<id>/calendar` | Imported ICS events with search and pagination |
| `#/users/<id>/calls` | Portal call log with failure filter and pagination |
| `#/users/<id>/audit` | Operator actions for this account |
| `#/audit` | Cross-account audit log with search, action filter, and pagination |
| `#/logs` | Persisted service diagnostics from C@MPUS, ILIAS, UniMail, SIAM/OIDC, sync, auth, admin, and the assistant, with search, service/level filters, and optional auto-refresh |
| `#/system` | Runtime, host, environment variables, configuration, database counts, sync jobs, maintenance |

The layout is responsive, keeps a light and a dark theme (stored in
`localStorage`), and supports `/` to focus the account search. Destructive
actions use an in-page confirmation dialog; account deletion requires typing
the account name and bulk portal deletion requires typing `LÖSCHEN`.

## What it shows

**Overview:** accounts, active sessions, live in-memory C@MPUS credentials,
QR-linked web devices and pending pairings, portal nodes (completed and in
progress), courses, calendar events, portal calls, new accounts in 7/30 days,
platform/channel distribution, sign-in modes, C@MPUS sources, the newest
accounts, the newest audit actions, and the health of the admin token,
assistant key, C@MPUS `.env`, OIDC, and UniMail.

**News:** create, edit, publish, withdraw, and delete the messages the app's
feed shows. Every row carries a source (university, faculty, institute, stuvus,
SDG Campus), an editorial date, German title/summary/body, and optional English
translations. German title and body are required; missing English fields fall
back to German in the app. Drafts stay visible in the console but are never
returned by `GET /v1/news`. The search matches title, summary, and body; the
status filter narrows to published items or drafts. Publishing and deleting are
confirmed and recorded in the audit log.

**Web devices:** every browser pairing carries the browser label and user
agent, the parsed form factor (desktop, mobile, tablet, or bot), operating
system and version, browser and version, rendering engine, device model, and
the IP address seen at pairing plus the most recent address reported by the
browser, the account that approved it, the pairing and approval timestamps, and
the session minted when the browser redeemed the code. MAC addresses are not
available to a web server because browsers do not expose their hardware
address; the console shows the network address the server actually observes
(including `X-Forwarded-For` from a local reverse proxy). A browser whose QR
code expires without approval is shown as expired; revoking a linked device
ends its web session immediately. Opening a row shows the pairing's full
client details, IP addresses, timestamps, account, session, and raw user agent.

**ILIAS:** one row per account that has connected, with whether the
`PHPSESSID` is still in server memory, the source (browser or `.env`), the
parsed counts for courses, groups, news, mails, unread mail, and to-dos, and
the time of the last read. Opening a row shows the stored dashboard: course and
group titles with their ILIAS links, the newest news, the ILIAS mailbox, and
to-dos. From a course or group, **Inhalte** browses the live object list and
its PDF/download rows; the same view loads the object's members tab beneath
the table, with each member's role, tutor marker, and avatar. **Profil** opens
the member's public profile inline with the avatar, published sections, e-mail,
ILIAS-mail, vCard, and any course links. **Trennen** forgets the cookie and
demotes the platform link; the stored snapshot stays readable. The cookie and
password are never shown.

**User list:** search by account, name, email, or matriculation; filter by
sign-in mode, linked platform, C@MPUS source (`env` / browser / active in
memory / none), activity (active session, no session, never signed in), and
stored data (portal nodes, courses, events, calls, empty). Sort by last
activity, creation date, name, account, session count, or data volume. Each row
shows the mode, platform chips with connected state, C@MPUS state, active
sessions, node/course/event counts, and last sign-in. The selection bar can
revoke sessions or clear portal data for several accounts. **Konto anlegen**
pre-provisions an account without minting a session; the normal sign-in path
completes it later. CSV export contains the current filter, up to 4,000
accounts, with spreadsheet-safe escaping.

**User detail:**

- **Profile:** account (login), name, email, matriculation, subject, and
  sign-in mode. Account changes are normalized and checked for uniqueness.
- **Status:** account and session timestamps, C@MPUS source/account/credential
  state, `.env` availability, portal study/node/course/event/call counts.
- **Sessions:** every token record with created/expiry/last-seen time and
  `active` / `revoked` / `expired` state; copy the session id, revoke one, or
  revoke all. Token values are never displayed.
- **Platforms:** the five known platforms plus any extra row, with account,
  source, status, linked date, and last sync. Edit a link, mark a sync, unlink
  it, or link/update a platform by hand. This records metadata only and never
  validates or stores a password.
- **C@MPUS:** disconnect the portal credential (drops the in-memory credential,
  clears the `user_campus` source, and demotes the `campus` link to `linked`),
  clear one study or all portal rows, clear calendar events, or clear the call
  log. The bearer token and `PSESSIONID` are never displayed.
- **Studiengänge:** per-study snapshot metadata (name, degree, version,
  identifier), node/completed/in-progress/course counts, sync completeness,
  and timestamps. Drill into curriculum nodes (search, completed/in-progress/
  open filter) or courses (search, lecturers, room, registration, linked
  elements) with 50-row pages, or start a full sync for the study while the
  account has a live portal credential.
- **Kalender:** imported ICS events with start/end, title, location,
  description, UID, and import time.
- **Aufrufe:** the complete stored portal call log (up to 2,000 hops per user)
  with operation, study/element ids, HTTP status, latency, and error text;
  filter to failures only.
- **Aktivität:** this account's operator audit trail.
- **Delete account:** removes the user, sessions, platform links, campus source,
  and every portal row in one transaction.

**Audit:** every operator action writes one row to `admin_audit` — login/logout,
account creation, profile edits, deletion, session revokes, platform
link/unlink/touch, C@MPUS disconnect, study/portal/calendar/call clears, sync
start/cancel, mail disconnect, log clears, and plaintext environment reveals. Rows keep the account name they had at the
time and survive a deleted account. The log supports free-text search, an action facet filter, a
per-account filter, and pagination. Details are compact JSON (changed field
names, platform, study id, counts) and never contain credentials.

**System:** Node version, pid, start time, uptime, RSS/heap, host name,
platform, kernel, working directory, Node path, timezone, locale, CPU count,
memory, load average, V8/OpenSSL/SQLite versions, database path and size, table
counts, every configuration flag, the `.env` file metadata, every project
environment variable (with `.env`/process source and set/empty state), the
in-memory sync jobs (with progress and cancel), and the UniMail disconnect
action. Secret values (tokens, keys, cookies, passwords) render as dots until
the operator confirms **Geheimnisse anzeigen**; that read is recorded as
`environment.reveal` in the audit log. Reloading the page hides them again. The
mail login is process-wide, so that action disconnects every user's mail view.

**Logs:** every service writes through one logger (`server/service-log.mjs`),
which mirrors the line to stdout and stores it in SQLite. The page shows the
newest 100 lines per page with the time, service, level (`info`, `warn`,
`error`, `debug`), message, optional JSON detail, and a link to the account when
the line carries a user id. Search matches the message, detail, service, level,
and user id; the service and level selects filter independently. Auto-refresh
polls every five seconds and stops when the view changes. **Leeren** deletes the
matching lines after a confirmation and records a `logs.clear` audit entry.
The store keeps the newest 5,000 rows and drops rows older than 30 days, so a
long-running server does not grow without bound. Credentials never reach a log
line: the auth, campus, ILIAS, and mail code logs outcomes and counts only.

## Routes

All routes below except `login`/`logout` require the admin cookie.

| Route | Behavior |
| --- | --- |
| `GET /admin` | The dashboard HTML. Safe without a cookie; it renders the login/setup state. |
| `POST /v1/admin/login` | `{ token }` → sets the cookie and records an audit entry. `503` when unconfigured, `401` when wrong. |
| `POST /v1/admin/logout` | Clears the cookie and records an audit entry. |
| `GET /v1/admin/overview` | Stats, mode/platform/source breakdowns, device counts, database counts, and configuration health. |
| `GET /v1/admin/news?query=&state=&limit=&offset=` | News list with drafts; `state` is `published` or `draft`. |
| `POST /v1/admin/news` | Creates a news item; German title and body are required. |
| `GET /v1/admin/news/<id>` | One news item, including drafts. |
| `POST /v1/admin/news/<id>` | Updates supplied fields, including `published`. |
| `DELETE /v1/admin/news/<id>` | Deletes one news item. |
| `GET /v1/news?limit=` | Public published news for the app, newest editorial date first. No cookie. |
| `GET /v1/news/<id>` | One published item, or `404`. No cookie. |
| `GET /v1/admin/ilias` | ILIAS connections, active sessions, and aggregated course/news/mail counts. |
| `GET /v1/admin/users/<id>/ilias/content?refId=&kind=` | Live-read one course, group, or folder page for the account. |
| `GET /v1/admin/users/<id>/ilias/members?refId=&kind=&url=` | Live-read the members tab; `url` is the members link from the content page. |
| `GET /v1/admin/users/<id>/ilias/profile?userId=&url=` | Live-read one member's public profile. |
| `GET /v1/admin/users/<id>/ilias/image?url=` | Stream a profile image with the account's ILIAS session. |
| `GET /v1/admin/users/<id>/ilias/file?refId=` | Stream one repository file with the account's ILIAS session. |
| `GET /v1/admin/devices?query=&state=&limit=&offset=` | QR-linked browsers with parsed client details and IP addresses, newest pairing first. |
| `GET /v1/admin/devices/<deviceId>` | One browser pairing with parsed client details, IP addresses, account, session, and timestamps. |
| `DELETE /v1/admin/devices/<deviceId>` | Revokes the browser link and its minted session. |
| `GET /v1/admin/users?query=&mode=&platform=&credential=&activity=&data=&sort=&limit=&offset=` | Paginated user list with stored-data counts and platform chips. |
| `POST /v1/admin/users` | Pre-provisions an account (`account`, `name`, `email`, `matriculation`, `subject`, `mode`) without a session. |
| `GET /v1/admin/users/<id>` | Full detail: user, sessions, campus, counts, per-study summaries, recent calls, recent audit. |
| `POST /v1/admin/users/<id>` | Updates `account`, `name`, `email`, `matriculation`, `subject`, and `mode`. |
| `DELETE /v1/admin/users/<id>` | Deletes the account and its rows. |
| `GET /v1/admin/users/<id>/studies` | Per-study summaries from the snapshot and stored rows. |
| `GET /v1/admin/users/<id>/courses?studyId=&query=&limit=&offset=` | Paginated stored courses. |
| `GET /v1/admin/users/<id>/nodes?studyId=&query=&state=&limit=&offset=` | Paginated curriculum nodes; `state` is `completed`, `in_progress`, or `open`. |
| `GET /v1/admin/users/<id>/events?query=&limit=&offset=` | Paginated imported calendar events. |
| `GET /v1/admin/users/<id>/calls?query=&failed=1&limit=&offset=` | Paginated portal call log. |
| `POST /v1/admin/users/<id>/sessions/revoke` | Revokes every session token. |
| `DELETE /v1/admin/users/<id>/sessions/<sessionId>` | Revokes one token. |
| `POST /v1/admin/users/<id>/platforms` | Links, updates, or promotes one platform. |
| `POST /v1/admin/users/<id>/platforms/<platform>/touch` | Marks the link connected and sets `lastSyncAt` to now. |
| `DELETE /v1/admin/users/<id>/platforms/<platform>` | Removes one link. |
| `POST /v1/admin/users/<id>/campus/disconnect` | Drops the portal credential and source marker. |
| `POST /v1/admin/users/<id>/ilias/disconnect` | Drops the in-memory ILIAS cookie and demotes the platform link. |
| `POST /v1/admin/users/<id>/portal/clear` | Deletes the user's portal rows; optional `{ "studyId": 123 }` clears one study. |
| `POST /v1/admin/users/<id>/portal/events/clear` | Deletes the user's imported calendar events. |
| `POST /v1/admin/users/<id>/portal/calls/clear` | Deletes the user's portal call log. |
| `POST /v1/admin/users/<id>/sync` | Starts a full study sync for the account while it has a live portal credential. Optional `{ studyId, includeCourses }`. |
| `GET /v1/admin/audit?query=&action=&userId=&limit=&offset=` | Audit log with action facets. |
| `GET /v1/admin/logs?query=&service=&level=&limit=&offset=` | Service diagnostics, newest first, with service and level facets. |
| `DELETE /v1/admin/logs?service=&level=` | Deletes the matching service logs and records a `logs.clear` audit entry. |
| `GET /v1/admin/system` | Runtime, host, masked environment variables, configuration, database, sync jobs, and stats. |
| `GET /v1/admin/environment?reveal=1` | Masked project environment variables; `reveal=1` returns plaintext secrets after an audited `environment.reveal` entry. |
| `GET /v1/admin/sync-jobs` | In-memory sync jobs, newest first. |
| `DELETE /v1/admin/sync-jobs/<id>` | Cancels a sync job. |
| `POST /v1/admin/system/mail/logout` | Forgets the process-wide UniMail credentials. |

The admin routes are not in `server/catalog.mjs`, so the app's Schnittstelle
screen cannot replay them.

## Files

| File | Responsibility |
| --- | --- |
| `server/admin/index.mjs` | Public data-layer API and re-exports. |
| `server/admin/session.mjs` | Token, cookie, and request authorization. |
| `server/admin/audit.mjs` | Audit writes, filters, and facets. |
| `server/admin/overview.mjs` | Cross-account counts and statistics. |
| `server/admin/users.mjs` | Account list and detail reads. |
| `server/admin/devices.mjs` | QR-linked browser list, detail read, parsed client details, stats, and revoke. |
| `server/admin/user-agent.mjs` | User-Agent parsing for form factor, OS, browser, model, and engine. |
| `server/admin/ilias.mjs` | ILIAS connections, snapshot counts, live content, member, profile and image reads, file download, and disconnect. |
| `server/admin/news.mjs` | News list, create, update, publish, and delete. |
| `server/admin/explorers.mjs` | Curriculum, course, event, and call explorers. |
| `server/admin/mutations.mjs` | Account, session, platform, campus, and portal mutations. |
| `server/admin/sync.mjs` | Manual sync start/cancel. |
| `server/admin/system.mjs` | Runtime, configuration, database, and mail status. |
| `server/admin/environment.mjs` | Project environment variables, `.env` metadata, and host details with masked secrets. |
| `server/admin/logs.mjs` | Service log list, filters, and audited clear. |
| `server/admin/util.mjs` | Shared validation and pagination helpers. |
| `server/service-log.mjs` | The single logger: stdout plus the bounded `service_logs` table. |
| `server/news.mjs` | Published news read model and admin input validation. |
| `server/routes/news.mjs` | Public `/v1/news` routes. |
| `server/routes/admin/index.mjs` | `/admin` shell, asset serving, and `/v1/admin/*` dispatch. |
| `server/routes/admin/*.mjs` | Guards, session, users, user detail/actions, audit, logs, and system routes. |
| `server/dashboard/index.html` | The page shell. |
| `server/dashboard/assets/*.mjs` | DOM, format, UI, API, routing, state, and app shell modules. |
| `server/dashboard/pages/*.mjs` | Overview, news, users, user detail, device detail, ILIAS, audit, logs, and system views. |
| `server/dashboard/assets/styles.css` | The dashboard styles. |
| `server/db.mjs` | Schema, including the `admin_audit` and `service_logs` tables. |
| `server/sync.mjs` | `listSyncJobs()` and job pruning for the system view. |
| `server/admin.test.mjs` | Token matching, stats, filters, detail, editors, audit, system status, destructive actions. |
| `server/service-log.test.mjs` | Service log persistence, filters, facets, clearing, and the audited admin clear. |
| `server/admin-route.test.mjs` | Endpoint-level cookie gate, login, readers, mutations, audit, and deletion over a throwaway HTTP listener. |
| `server/news.test.mjs` | News CRUD, draft visibility, public filtering, ordering, and validation. |

## Limits

- The dashboard is for the operator of a local or trusted deployment. Do not
  expose `/admin` on a public host without TLS and a strong `DASHBOARD_TOKEN`.
- Published news is public by design: `GET /v1/news` needs no session or admin
  cookie. Never put credentials, personal data, or internal-only details in a
  news item.
- It shows account metadata, counts, and diagnostic text, never a C@MPUS bearer
  token, `PSESSIONID`, an ILIAS `PHPSESSID`, a university password, a session
  token, or an app bearer token. The browser harvest stays in server memory as
  described in [accounts.md](accounts.md).
- The audit log records the operator as `dashboard` because the deployment has
  a single shared `DASHBOARD_TOKEN`; it is not a per-person identity system.
- Every destructive action is confirmed in the UI and recorded server-side, but
  the audit table has no automatic retention policy. Trim it with SQL if the
  deployment runs long enough for that to matter.
