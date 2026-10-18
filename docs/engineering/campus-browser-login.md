# C@MPUS browser login (beta)

Temporary workaround until the university approves the OIDC client: sign in with the st-account and password on the real C@MPUS pages inside the app, then adopt the session into the assistant server. The password never leaves the university pages and never touches this codebase.

## Flow

1. The login screen button `Im C@MPUS-Browser anmelden (Beta)` opens a `WebView` modal at `https://campus.uni-stuttgart.de/cusonline/` (`react-native-webview`, cookies shared). The user logs in there exactly as in a browser.
2. After logging in, the user taps `Anmeldung übernehmen`. The app first reads the WebView's cookie store natively (`readNativeCampusCookies` in `app/login.tsx`, `@preeternal/react-native-cookie-manager`, iOS: `{ iosCookieStore: 'webKit' }`) — `document.cookie` cannot see `HttpOnly` cookies such as `PSESSIONID`. Then injected JavaScript (`HARVEST_JS`) reads `document.cookie` plus `localStorage`/`sessionStorage` (values capped) and posts the harvest back via `onMessage`. The native cookies fill the gaps; the first value per name wins. Errors and the validation progress show inside the modal itself — the login screen behind it stays untouched until success.
3. `submitBrowserCredentials` in `src/auth/campus.ts` sends the harvest to `POST /v1/campus/credentials`. Cookies and storage values travel only there — never into the app bundle, never into logs.
4. The server (`loginWithBrowserCredentials` in `server/campus.mjs`) extracts `PSESSIONID` and bearer candidates — the known key `cusonline_co.login.accessToken` first (accepted as-is, observed at 44 chars), then token-named keys, accepting JWT shape or long opaque values — validates each combination against the study chooser — cookie+bearer first, then bearer alone — and keeps the first working pair in process memory. Anything else is restored on failure. Every attempt logs `session=true|false bearer=true|false` plus the failure code, never the values. On success the response carries `{ ok, studies, activeStudyId }`; a failure carries `{ error, detail }` with the upstream status like the other campus routes.
5. The app continues with the regular token sign-in (`enterWithCampusToken`), which now succeeds against the server-held credentials and loads studies plus structure.

## Failure modes

| Server code | Meaning |
| --- | --- |
| `no_credentials_found` | The harvest held neither a session cookie nor a token. The app explains the manual token flow as fallback. |
| `invalid_token` / `campus_unauthorized` | Nothing harvested validates against the portal. Previous credentials, if any, stay untouched. A `detail` of `upstream 401: …missing_session_cookie` means the token was fine but the `PSESSIONID` cookie was missing — C@MPUS wants both together (see [campus-curriculum.md](campus-curriculum.md)). |
| `token_missing` | No bearer anywhere — neither harvested nor configured. The portal needs one alongside the cookie. |

Credentials live in server memory only: `runtimeBearerToken`/`runtimeSessionCookie` take precedence while set, and a restart falls back to `.env`. Persist a working pair with `npm run campus:token` / `npm run campus:session` for restart-proof operation. The credentials endpoint is `replay: false` in `server/catalog.mjs` and its body is never logged.

## Limits of the workaround

- The native cookie read needs a development build that contains `@preeternal/react-native-cookie-manager`; Expo Go does not. After adding or updating it, rebuild with `npx expo run:ios|android` or `eas build --profile development`. The module is New Architecture only (Expo SDK 58 / RN 0.88 is).
- On iOS the default WebKit store is read, which is the one `react-native-webview` uses unless the WebView runs an incognito or custom data store. A memory-only bearer (never written to storage) still yields no token — then only the manual flow works.
- The modal WebView keeps its own cookie jar; an external browser login does not transfer.
- This flow exists for beta testing only. Once TIK issues the OIDC client, SIAM sign-in replaces it; the password stays on the IdP either way.
