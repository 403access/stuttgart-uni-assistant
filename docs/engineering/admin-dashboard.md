# Admin dashboard

A server-hosted operator view of the user store, sessions, platform links, and
C@MPUS data. Open `http://127.0.0.1:8787/admin` while the assistant server is
running. It is a plain HTML page served by `server/index.mjs`; there is no
separate frontend build and no npm dependency.

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

The dashboard is same-origin with its API. The page sends `credentials:
same-origin` and the HTML response carries `X-Frame-Options: DENY`,
`Referrer-Policy: no-referrer`, and a CSP that allows only same-origin requests
and the inline styles/script the page ships.

## What it shows

**Overview cards:** users, active sessions, users with a live C@MPUS credential
in server memory, portal nodes, and users created in the last seven days.

**User list:** search by account, name, or email; filter by sign-in mode, linked
platform, or C@MPUS credential source (`env` / browser / active in memory). Each
row shows the mode, number of platform links, C@MPUS state, active sessions, and
last sign-in. The list is paginated.

**User detail:**

- **Profile:** name, email, matriculation, and subject, editable and saved back
  to the `users` row.
- **Status:** active sessions, C@MPUS source and account, portal study/node/
  course/calendar/call counts.
- **Sessions:** every token record with created/expiry/last-seen time and
  `active` / `revoked` / `expired` state; revoke one or all.
- **Platforms:** C@MPUS, ILIAS, SDG Campus, SIAM, and UniMail with account,
  source, status, and last sync; unlink one or link another by hand.
- **C@MPUS data:** disconnect the portal session (drops the in-memory credential,
  clears the `user_campus` source, and demotes the `campus` link to `linked`) or
  delete all portal rows for the user. The access token and cookie are never
  displayed.
- **Recent portal calls:** the newest 12 hops with status and latency.
- **Delete account:** removes the user, sessions, platform links, campus source,
  and every portal row in one transaction.

## Routes

All routes below except `login`/`logout` require the admin cookie.

| Route | Behavior |
| --- | --- |
| `GET /admin` | The dashboard HTML. Safe without a cookie; it renders the login/setup state. |
| `POST /v1/admin/login` | `{ token }` → sets the cookie. `503` when unconfigured, `401` when wrong. |
| `POST /v1/admin/logout` | Clears the cookie. |
| `GET /v1/admin/overview` | The stat cards. |
| `GET /v1/admin/users?query=&mode=&platform=&credential=&limit=&offset=` | Paginated user list. |
| `GET /v1/admin/users/<id>` | Full detail. |
| `POST /v1/admin/users/<id>` | Updates `name`, `email`, `matriculation`, `subject`. |
| `DELETE /v1/admin/users/<id>` | Deletes the account and its rows. |
| `POST /v1/admin/users/<id>/sessions/revoke` | Revokes every session token. |
| `DELETE /v1/admin/users/<id>/sessions/<sessionId>` | Revokes one token. |
| `POST /v1/admin/users/<id>/platforms` | Links or refreshes one platform. |
| `DELETE /v1/admin/users/<id>/platforms/<platform>` | Removes one link. |
| `POST /v1/admin/users/<id>/campus/disconnect` | Drops the portal credential and source marker. |
| `POST /v1/admin/users/<id>/portal/clear` | Deletes the user's portal rows; optional `{ "studyId": 123 }` clears one study. |

The admin routes are not in `server/catalog.mjs`, so the app's Schnittstelle
screen cannot replay them.

## Files

| File | Responsibility |
| --- | --- |
| `server/admin.mjs` | Token/cookie checks and every cross-user query and mutation. |
| `server/dashboard.html` | The page, styles, and vanilla-JS client. |
| `server/index.mjs` | Entry point; serves the page through `server/routes/admin.mjs`, which also routes `/v1/admin/*`. |
| `server/admin.test.mjs` | Token matching, stats, filters, detail, edits, session revoke, platform link/unlink, campus disconnect, portal clear, delete. |

## Limits

- The dashboard is for the operator of a local or trusted deployment. Do not
  expose `/admin` on a public host without TLS and a strong `DASHBOARD_TOKEN`.
- It shows account metadata and counts, never a C@MPUS bearer token,
  `PSESSIONID`, or a university password. The browser harvest stays in server
  memory as described in [accounts.md](accounts.md).
- There is no audit log yet; destructive actions are confirmed in the UI but not
  recorded server-side.
