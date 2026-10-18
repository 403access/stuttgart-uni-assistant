# C@MPUS browser login (beta)

Temporary workaround until the university approves the OIDC client: sign in with the st-account and password on the real C@MPUS pages inside the app, then adopt the session into the assistant server. The password never leaves the university pages and never touches this codebase.

## Flow

1. The login screen button `Im C@MPUS-Browser anmelden (Beta)` opens a `WebView` modal at `https://campus.uni-stuttgart.de/cusonline/` (`react-native-webview`, cookies shared). The user logs in there exactly as in a browser.
2. After logging in, the user taps `Anmeldung übernehmen`. Injected JavaScript (`HARVEST_JS` in `app/login.tsx`) reads `document.cookie` plus `localStorage`/`sessionStorage` (values capped) and posts the harvest back via `onMessage`. Errors and the validation progress show inside the modal itself — the login screen behind it stays untouched until success.
3. `submitBrowserCredentials` in `src/auth/campus.ts` sends the harvest to `POST /v1/campus/credentials`. Cookies and storage values travel only there — never into the app bundle, never into logs.
4. The server (`loginWithBrowserCredentials` in `server/campus.mjs`) extracts `PSESSIONID` and bearer candidates — the known key `cusonline_co.login.accessToken` first (accepted as-is, observed at 44 chars), then token-named keys, accepting JWT shape or long opaque values — validates each combination against the study chooser — cookie+bearer first, then bearer alone — and keeps the first working pair in process memory. Anything else is restored on failure. Every attempt logs `session=true|false bearer=true|false` plus the failure code, never the values. On success the response carries `{ ok, studies, activeStudyId }`; a failure carries `{ error, detail }` with the upstream status like the other campus routes.
5. The app continues with the regular token sign-in (`enterWithCampusToken`), which now succeeds against the server-held credentials and loads studies plus structure.

## Failure modes

| Server code | Meaning |
| --- | --- |
| `no_credentials_found` | The harvest held neither a session cookie (often `HttpOnly`, invisible to JavaScript) nor a token. The app explains the manual token flow as fallback. |
| `invalid_token` / `campus_unauthorized` | Nothing harvested validates against the portal. Previous credentials, if any, stay untouched. A `detail` of `upstream 401: …missing_session_cookie` means the token was fine but the `PSESSIONID` cookie was missing — C@MPUS wants both together (see [campus-curriculum.md](campus-curriculum.md)). |
| `token_missing` | No bearer anywhere — neither harvested nor configured. The portal needs one alongside the cookie. |

Credentials live in server memory only: `runtimeBearerToken`/`runtimeSessionCookie` take precedence while set, and a restart falls back to `.env`. Persist a working pair with `npm run campus:token` / `npm run campus:session` for restart-proof operation. The credentials endpoint is `replay: false` in `server/catalog.mjs` and its body is never logged.

## Limits of the workaround

- A `HttpOnly` `PSESSIONID` plus a memory-only bearer (never written to storage) yields an empty harvest — then only the manual flow works.
- The modal WebView keeps its own cookie jar; an external browser login does not transfer.
- This flow exists for beta testing only. Once TIK issues the OIDC client, SIAM sign-in replaces it; the password stays on the IdP either way.
