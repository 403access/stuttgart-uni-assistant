# Accounts and sessions

Every sign-in creates or refreshes one **user** on the assistant server and mints
an opaque **session token** for it. The device keeps the token and a copy of the
public user record; the server keeps the identity, the token hash, and one row
per linked platform. The account screen at `/konto` shows all of it as one
account across C@MPUS, ILIAS, SDG Campus, SIAM, and UniMail.

Status: implemented. The server side is `apps/server/auth.mjs` and the `users`,
`user_sessions`, and `user_platforms` tables in `apps/server/db.mjs`. The client side
is `apps/mobile/src/auth/session.ts`, `apps/mobile/src/auth/user.ts`, the store in `apps/mobile/src/state/`, and
`apps/mobile/app/konto.tsx`.

## Identity

The university identity is the primary key of a user. C@MPUS and SIAM return the
same st-account through different routes, so both land on one record:

| Sign-in | Verified by | User mode | Platforms linked |
| --- | --- | --- | --- |
| C@MPUS (automated or visible browser, or the `.env` token) | `POST /v1/campus/login` reads C@MPUS with the harvested or configured session | `campus` | `campus` connected, `ilias`/`sdg`/`siam` linked through SSO |
| SIAM | `POST /v1/oidc/exchange` after the authorization-code flow | `oidc` | `siam` connected, `campus`/`ilias`/`sdg` linked through SSO |
| UniMail | `POST /v1/mail/credentials` proves the st-account against TIK IMAP | — | `mail` connected on the signed-in user |
| Demonstration profile | `POST /v1/auth/session` with `mode: demo` | `demo` | none |
| Account id only | `POST /v1/auth/session` with `mode: local` | `local` | none |

`account_key` is the lower-cased account id, so `st123456` and
`ST123456@stud.uni-stuttgart.de`-style variants that share the short id resolve
to the same user. The stored `account` keeps the casing of the first sign-in.

A platform link has a `status`:

- **connected** — a working session or credential exists for that platform right
  now (the C@MPUS portal session, a proven UniMail IMAP credential).
- **linked** — the same identity is known to be valid there (C@MPUS, ILIAS and
  SDG Campus all authenticate against SIAM), but this server holds no session
  for it.

`last_sync_at` is set by an explicit `POST /v1/auth/sync`. The local
`syncAt` map still drives the per-platform "last marked" copy; the server keeps
the account-level view.

## Sessions

`POST /v1/auth/session` (demo/local), `POST /v1/oidc/exchange`, and
`POST /v1/campus/login` all end in `createUserSession`, which upserts the user,
links the proven platforms, and issues a token.

- The token is 32 random bytes, base64url. Only its SHA-256 hash is stored, so a
  copy of `campus-server.db` cannot be replayed as a login.
- Lifetime is `AUTH_SESSION_HOURS` (default 720 hours = 30 days).
- `GET /v1/auth/me` resolves the `Authorization: Bearer` header to the user and
  refreshes `last_seen_at`.
- `POST /v1/auth/logout` marks the token revoked. Expired and revoked rows are
  pruned; revoked rows stay for a day so a stale client gets a 401 instead of a
  silent new session.
- `apps/mobile/src/auth/session.ts` keeps the token in `expo-secure-store` (iOS keychain /
  Android Keystore) on native and in AsyncStorage on web, where no secure store
  exists. It is **not** in the `university-assistant/v1` AsyncStorage payload.

On launch the store (`apps/mobile/src/state/use-auth-session.ts`) reads the token and asks
`/v1/auth/me`. A network failure
keeps the cached user, so the app still opens offline with the last account
shown.

The token is stored with the server **session id** (`session.id` from
`/v1/auth/me`, also returned by every sign-in route). The id is not a bearer and
cannot authenticate a request; it names the session row next to the token.

`SessionRefresh` (`apps/mobile/src/auth/session-refresh.tsx`) repeats the check whenever the
app becomes active; the silent path lives in `apps/mobile/src/state/use-session-resume.ts`.
A 401 triggers one re-login before anything is dropped:

- `demo` and `local` accounts are minted again from the stored mode and account.
- C@MPUS re-submits the last portal harvest the server accepted (kept in the
  device vault, without the password) to `/v1/campus/credentials` and then
  `/v1/campus/login`. When the portal session is gone, the harvest is deleted.
- SIAM/OIDC has no reusable credential on the device, so a rejected token still
  signs the account out.

A successful refresh or re-login stores the new token and session id together.

## Web device pairing

The web build cannot create a `demo`, `local`, `campus`, or OIDC session from its
own sign-in screen. It shows a QR code instead; the already signed-in native app
opens **Einstellungen → Gerät verknüpfen**, scans the code, and approves the
pairing with its bearer token.

- `POST /v1/auth/devices/start` creates a pending row in `device_links` and
  returns a one-time 32-byte token plus
  `universityassistant://device-link?token=…`. Only the token hash reaches
  SQLite. The code is valid for ten minutes.
- `POST /v1/auth/devices/approve` (Bearer) attaches the pending code to the
  signed-in user. A code cannot be approved twice or after it expires.
- `POST /v1/auth/devices/poll` is the browser's unauthenticated poll. Before
  approval it returns `{ status: "pending" }`; the first poll after approval
  mints the session, stores its id on `device_links.session_id`, and returns the
  same `user`, `token`, and `expiresAt` shape as every other sign-in.
- `GET /v1/auth/devices` lists the caller's browsers. `DELETE
  /v1/auth/devices/<id>` revokes the link and its session. The operator
  dashboard has the same view under `#/devices` and can revoke a browser there.

The QR payload never contains a server URL: the phone approves against its own
configured assistant server, so a crafted QR code cannot redirect the bearer
token to another host.

## Routes

| Route | Auth | Behavior |
| --- | --- | --- |
| `POST /v1/auth/session` | none | Creates a `demo` or `local` user and session. Campus and OIDC sessions are only minted by their verified routes. |
| `GET /v1/auth/me` | Bearer | The public user with platform links, plus the session id and expiry. |
| `POST /v1/auth/logout` | Bearer | Revokes the token and drops the in-memory portal credential. |
| `POST /v1/auth/devices/start` | none | Creates a ten-minute browser pairing; returns the one-time token and deep link. |
| `POST /v1/auth/devices/approve` | Bearer | Attaches a scanned pairing token to the signed-in account. |
| `POST /v1/auth/devices/poll` | none | Returns `pending`, or mints and returns the browser session after approval. |
| `GET /v1/auth/devices` | Bearer | Lists the account's linked browsers. |
| `DELETE /v1/auth/devices/<id>` | Bearer | Revokes one browser link and its session. |
| `GET /v1/auth/preferences` | Bearer | Cross-device onboarding completion and appearance/language preferences. |
| `POST /v1/auth/preferences` | Bearer | Partial upsert of `onboardingCompletedAt`, `theme`, `design`, and `locale`. |
| `POST /v1/auth/links` | Bearer | Links or refreshes one platform (`platform`, `account`, `status`, `source`). |
| `DELETE /v1/auth/links/<platform>` | Bearer | Removes one link. |
| `POST /v1/auth/sync` | Bearer | Sets `last_sync_at` for one platform. |
| `POST /v1/campus/credentials` | optional Bearer | Validates a browser harvest. Signed in: attaches it to the user. Signed out: returns a one-shot `ticket` (10 min). |
| `POST /v1/campus/login` | optional Bearer | Body `{ ticket }` or the user's credential or `.env`. Returns the C@MPUS profile **and** `user`, `token`, `expiresAt`; attaches the credential to that user. |
| `GET /v1/campus/config` | optional Bearer | Public `.env` status, plus `credentialActive` and `credentialSource` for the caller. |
| `GET/POST /v1/campus/*` | Bearer | Every other campus route resolves the user from the token and reads that user's rows only. |
| `POST /v1/oidc/exchange` | none | Returns the profile **and** `user`, `token`, `expiresAt`. |
| `POST /v1/mail/credentials` | optional Bearer | Links `mail` when the caller is signed in. |
| `POST /v1/mail/send` | Bearer | Submits a message over SMTP and appends a copy to Sent. |
| `POST /v1/mail/logout` | optional Bearer | Unlinks `mail` when the caller is signed in. |

The public user shape:

```jsonc
{
  "id": "usr_…",
  "account": "st123456",
  "name": "Lena Hartmann",
  "email": null,
  "matriculation": null,
  "subject": null,
  "mode": "campus",
  "createdAt": "…",
  "updatedAt": "…",
  "lastLoginAt": "…",
  "platforms": [
    { "id": "campus", "account": "st123456", "status": "connected", "source": "campus", "linkedAt": "…", "lastSyncAt": null }
  ]
}
```

## C@MPUS credentials are per user

The portal credential is not global any more. Each account gets its own:

| Sign-in | Credential source | Stored where |
| --- | --- | --- |
| C@MPUS browser harvest | Cookie and bearer validated by `POST /v1/campus/credentials` | Process memory, keyed by the user id, after `/v1/campus/login` |
| C@MPUS `.env` token | `CAMPUS_BEARER_TOKEN` / `CAMPUS_SESSION_COOKIE` | Never copied: the user's row in `user_campus` marks the account as `env` and the server reads the environment on each call |
| SIAM | No C@MPUS credential | The account has `siam` connected and the C@MPUS family linked; a later C@MPUS read asks for a harvest |

The harvest path is a two-step handoff because the user does not exist yet when
the browser finishes:

```text
POST /v1/campus/credentials   validate the harvest, keep it in memory,
                              return a short-lived ticket (10 min)
POST /v1/campus/login         { ticket } → create/refresh the user, attach the
                              credential to that user id, return app session
```

A signed-in user reconnecting C@MPUS sends the bearer on the credentials route
instead; the credential is attached to that user immediately and no ticket is
issued.

`resolveCampusCredential(userId)` returns the user's own credential, or the
`.env` credential only when `user_campus.source = 'env'` for that exact account,
otherwise `409 campus_credentials_missing`. A browser credential is memory-only:
a server restart asks the user to connect C@MPUS again. `.env` accounts survive a
restart because the secret stays in the environment, not in SQLite.

Sign-out revokes the app session and drops the in-memory portal credential; the
user's stored portal rows stay for the next sign-in.

## Portal rows are scoped by user

Every portal table carries `user_id` in its primary key:

```text
user_curriculum_nodes   (user_id, study_id, id)
user_curriculum_sync    (user_id, study_id)
user_courses            (user_id, study_id, id)
user_course_elements    (user_id, study_id, course_id, element_id)
user_courses_sync       (user_id, study_id)
user_studies_snapshot   (user_id)
user_exported_events    (user_id, uid)
user_portal_calls       (user_id, id)
```

`GET /v1/campus/config` is public; every other `/v1/campus/*` route requires the
app bearer token and resolves the user id from it. `GET /v1/campus/tree`,
`/v1/campus/courses/all`, and `/v1/campus/calls` now answer only from the caller's
rows. Sync jobs carry their user id, and a job id from another account is a 404.

The old single-user tables (`curriculum_nodes`, `courses`, `studies_snapshot`,
`portal_calls`, …) are left untouched in an existing database and are no longer
read or written. They can be deleted with the rest of `campus-server.db`.

The operator view of these records is the token-protected dashboard at `/admin`;
see [admin-dashboard.md](admin-dashboard.md).

