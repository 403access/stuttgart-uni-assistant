# Admin dashboard

A server-hosted operator console for the user store, sessions, platform links,
C@MPUS data, portal activity, and server health. Open
`http://127.0.0.1:8787/admin` while the assistant server is running. It is a
plain HTML page served by `server/routes/admin.mjs`; there is no separate
frontend build and no npm dependency.

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
| `#/users` | Searchable, filterable, sortable, paginated account list with bulk actions and CSV export |
| `#/users/<id>/overview` | Profile, status, per-study summary, audit preview, delete zone |
| `#/users/<id>/sessions` | App sessions with state, timestamps, copy and revoke |
| `#/users/<id>/platforms` | C@MPUS, ILIAS, SDG Campus, SIAM, and UniMail links |
| `#/users/<id>/campus` | C@MPUS credential source, per-study data, calendar/call maintenance |
| `#/users/<id>/data` | Curriculum nodes and courses per study, with search, state filter, and pagination |
| `#/users/<id>/calendar` | Imported ICS events with search and pagination |
| `#/users/<id>/calls` | Portal call log with failure filter and pagination |
| `#/users/<id>/audit` | Operator actions for this account |
| `#/audit` | Cross-account audit log with search, action filter, and pagination |
| `#/system` | Runtime, configuration, database counts, sync jobs, maintenance |

The layout is responsive, keeps a light and a dark theme (stored in
`localStorage`), and supports `/` to focus the account search. Destructive
actions use an in-page confirmation dialog; account deletion requires typing
the account name and bulk portal deletion requires typing `LÖSCHEN`.

## What it shows

**Overview:** accounts, active sessions, live in-memory C@MPUS credentials,
portal nodes (completed and in progress), courses, calendar events, portal
calls, new accounts in 7/30 days, platform/channel distribution, sign-in modes,
C@MPUS sources, the newest accounts, the newest audit actions, and the health
of the admin token, assistant key, C@MPUS `.env`, OIDC, and UniMail.

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
start/cancel, and mail disconnect. Rows keep the account name they had at the
time and survive a deleted account. The log supports free-text search, an action facet filter, a
per-account filter, and pagination. Details are compact JSON (changed field
names, platform, study id, counts) and never contain credentials.

**System:** Node version, pid, start time, uptime, RSS/heap, database path and
size, table counts, every configuration flag, the in-memory sync jobs (with
progress and cancel), and the UniMail disconnect action. The mail login is
process-wide, so that action disconnects every user's mail view.

## Routes

All routes below except `login`/`logout` require the admin cookie.

| Route | Behavior |
| --- | --- |
| `GET /admin` | The dashboard HTML. Safe without a cookie; it renders the login/setup state. |
| `POST /v1/admin/login` | `{ token }` → sets the cookie and records an audit entry. `503` when unconfigured, `401` when wrong. |
| `POST /v1/admin/logout` | Clears the cookie and records an audit entry. |
| `GET /v1/admin/overview` | Stats, mode/platform/source breakdowns, database counts, and configuration health. |
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
| `POST /v1/admin/users/<id>/portal/clear` | Deletes the user's portal rows; optional `{ "studyId": 123 }` clears one study. |
| `POST /v1/admin/users/<id>/portal/events/clear` | Deletes the user's imported calendar events. |
| `POST /v1/admin/users/<id>/portal/calls/clear` | Deletes the user's portal call log. |
| `POST /v1/admin/users/<id>/sync` | Starts a full study sync for the account while it has a live portal credential. Optional `{ studyId, includeCourses }`. |
| `GET /v1/admin/audit?query=&action=&userId=&limit=&offset=` | Audit log with action facets. |
| `GET /v1/admin/system` | Runtime, configuration, database, sync jobs, and stats. |
| `GET /v1/admin/sync-jobs` | In-memory sync jobs, newest first. |
| `DELETE /v1/admin/sync-jobs/<id>` | Cancels a sync job. |
| `POST /v1/admin/system/mail/logout` | Forgets the process-wide UniMail credentials. |

The admin routes are not in `server/catalog.mjs`, so the app's Schnittstelle
screen cannot replay them.

## Files

| File | Responsibility |
| --- | --- |
| `server/admin.mjs` | Token/cookie checks, audit helpers, every cross-user query and mutation, system status. |
| `server/routes/admin.mjs` | The `/admin` page and `/v1/admin/*` HTTP routing. |
| `server/dashboard.html` | The page, styles, hash router, and vanilla-JS client. |
| `server/db.mjs` | Schema, including the `admin_audit` table. |
| `server/sync.mjs` | `listSyncJobs()` and job pruning for the system view. |
| `server/admin.test.mjs` | Token matching, stats, filters, detail, editors, audit, system status, destructive actions. |
| `server/admin-route.test.mjs` | Endpoint-level cookie gate, login, readers, mutations, audit, and deletion over a throwaway HTTP listener. |

## Limits

- The dashboard is for the operator of a local or trusted deployment. Do not
  expose `/admin` on a public host without TLS and a strong `DASHBOARD_TOKEN`.
- It shows account metadata, counts, and diagnostic text, never a C@MPUS bearer
  token, `PSESSIONID`, a university password, a session token, or an app bearer
  token. The browser harvest stays in server memory as described in
  [accounts.md](accounts.md).
- The audit log records the operator as `dashboard` because the deployment has
  a single shared `DASHBOARD_TOKEN`; it is not a per-person identity system.
- Every destructive action is confirmed in the UI and recorded server-side, but
  the audit table has no automatic retention policy. Trim it with SQL if the
  deployment runs long enough for that to matter.
