# C@MPUS browser login (beta)

Temporary workaround until the university approves the OIDC client: sign in with the st-account and password on the real C@MPUS pages inside the app, then adopt the session into the assistant server. Two paths exist: a visible browser the user drives, and an automated one that fills the official form from a credential the user opted to keep on the device.

## Automated sign-in (headless)

`Automatisch anmelden` on the login screen takes the account id and the password, optionally stores them in the device vault ([vault.ts](../../src/auth/vault.ts)), and runs the sign-in in a hidden `WebView`. The script builders live in [campus-browser-scripts.ts](../../src/auth/campus-browser-scripts.ts), free of React Native imports so `scripts/campus-headless.test.mjs` can drive them against fixtures in `jsdom`.

The C@MPUS shell presents **two** sign-ins on the same page: the realm's own account form, embedded in the shell document (the URL stays `/cusonline/`), and a link to the brokered university sign-in. A student's st-account only exists at the broker, so the script takes that entry first:

```
/cusonline/co/public/sec/auth/realms/CAMPUSonline_IDP/broker/oidc/login?client_id=co-iam-idp-connector&tab_id=…
  → https://idp.uni-stuttgart.de/idp/profile/oidc/authorize?execution=e1s1
  → https://idp.uni-stuttgart.de/idp/profile/oidc/authorize?execution=e1s2   (the sign-in form)
```

Filling the embedded local form instead is what produced Keycloak's generic "Benutzername oder Kennwort ungültig" with a correct student credential — that realm has never heard of the account. The step order is:

1. The hidden WebView opens `https://campus.uni-stuttgart.de/cusonline/`.
2. On the shell, a `Zur Anmeldung`/broker entry (`/broker/oidc/login`, else any `/broker/*/login`) is clicked before any password form is filled. This is the `sso-click` step. The same page/entry pair is clicked **once**: the poll runs every three seconds while that click's navigation is still in flight, and clicking again restarts the brokered OIDC flow. A different page, or the same page after eight seconds, may click again, and four clicks per attempt is the backstop — after that the run reports `broker-exhausted` instead of clicking forever.
3. On `idp.uni-stuttgart.de` the Shibboleth form is filled (`j_username`, `j_password`, `_eventId_proceed` — a `<button>`, not an `<input>`). The CAMPUSonline Keycloak form (`#username`, `#password`, `#kc-login`, or the `data-test="id_brm-pm-dtop_login_*_input"` hooks) is still covered for the realm's own accounts.
4. Fillability is decided by computed style (`display`, `visibility`), never by rectangle size: the hidden WebView reports zero-sized rectangles for every element.
5. A submit button left disabled by the page is re-enabled before the click, and the stored account always overwrites the portal's echoed prefill.
6. A portal-reported refusal stops the run: the `rejected` step carries the portal's own text, from Keycloak's `#input-error`/`aria-invalid` or the identity provider's `p.output-message.output--error` ("Invalid authentication credentials."). Retrying a refused credential is what locks accounts, so it does not happen.
7. Submits are otherwise throttled (five seconds apart, three per page, six per run; a navigation or a new attempt restores the page budget); the whole attempt times out after 90 seconds.
8. Signed in means the `cusonline_co.login.accessToken` value exists in web storage **and** the URL is not the `#/login` route. The desktop login route also contains `/desktop/`, and treating it as signed in harvested an empty session.
9. The harvest below then runs unchanged: the token from web storage plus the natively read `HttpOnly` cookies.

Every step posts back and is logged as `[campus-headless] <step> <url>`, with `user=`/`submit=`/`lengths=` on `filled`, `try=` on `sso-click`, `href=`/`clicks=` on `broker-exhausted`, `label=` on `cta-click`, `reason=` on `rejected`, and `passwordInputs`/`display`/`size`/`readyState` on `no-form`. The modal has a `Seite ausgeben` button that posts a redacted dump of the current page's forms and controls (`[campus-headless-dump]`) for pinning selectors against a page that changes.

## Terminal probe

`npm run campus:headless` runs the same sign-in from the command line, so a selector or flow change can be checked in seconds instead of a rebuild:

```
printf '%s' "$ST_PASSWORD" | npm run campus:headless -- --user st206509@stud.uni-stuttgart.de --password-stdin
```

`scripts/campus-headless-login.mjs` takes the credential per invocation — never from a file or the environment — and prints every step, the cookie names with their lengths, and a verdict. With `--password-stdin` and a terminal it prompts without echoing and reads a single line; with a pipe it reads to EOF, so `printf '%s' "$ST_PASSWORD" | …` also works and keeps the value out of the shell history entirely. The value is never printed (`mask`), never stored, and the process leaves nothing behind. `--verify` (the default) mints a bearer from the session cookie through `/ee/rest/auth/token/refresh` and hands cookie plus bearer to the running assistant server's `POST /v1/campus/credentials`, which is the same validation the app triggers; `--no-verify` stops after the login, and `--json` prints a machine-readable summary.

Two engines:

- **browser** (default when Playwright is installed): a headless Chromium drives the real pages, so the C@MPUS shell can run its own JavaScript — the SSO redirect starts client-side, and no plain HTTP request reaches the Keycloak form. The probe re-uses the app's injected `headlessAutofillScript` through `page.evaluate`, then reads the cookie jar (including `PSESSIONID`) and web storage (including `cusonline_co.login.accessToken`). `--headed` shows the window for debugging. Install with `bun add -d playwright && bunx playwright install chromium`; the browser lives in the user cache, not the repository.
- **http** (`--http`): `fetch` with a cookie jar, parsing each page with jsdom in `outside-only` mode. No browser download, and it terminates at the C@MPUS shell, which is why the browser engine is the default. It is the engine the offline tests exercise.

A wrong credential is a useful run: it should print `filled` then `rejected` with the portal's own message, which proves the fill and submit reached the real form.

Observed end to end on 18 October 2026 with a real student credential: `sso-click` on the broker entry, `filled` on `idp.uni-stuttgart.de` with `j_username` carrying the full `st…@stud.uni-stuttgart.de` address (the identity provider accepts it; the short `st`-account works too), `PSESSIONID` back at 64 characters, and the assistant server answering `{ ok: true, studies: 2, activeStudyId: 339485 }`. The probe also captured the CAMPUSonline service-provider realm exchanging the authorization code (`code`, `grant_type`, `client_id`, `redirect_uri`, `code_verifier`), so the PKCE round trip happens in the browser exactly as it would for a person.

The credential is filled and submitted in the app's own WebView against the university page, and only the resulting session goes to `POST /v1/campus/credentials`; the password itself is never sent to C@MPUS or the assistant server for the C@MPUS sign-in. On success the same st-account and password are reused to connect UniMail, which the assistant server proves against TIK IMAP (see [mail.md](mail.md)). Failure shows inside the modal with a button to fall back to the visible browser. While the hidden browser works, the modal shows the phases of the sign-in (`connect`, `identify`, `adopt`, `profile`) from `src/auth/campus-progress.ts` through `src/components/signing-in.tsx`, rather than an empty spinner — see [design-system.md](design-system.md#waiting-states).

The wait uses the whole display: the title sits at the top and the mark, current phase and step list spread evenly down to the footer. The hidden `WebView` must stay out of that layout — pass the off-screen style through `containerStyle`, not `style`. `react-native-webview` applies `style` to its inner native view and keeps a `flex: 1` wrapper, so styling only `style` leaves the wrapper in flow and splits the height with the progress.

The waiting view is deliberately **not** dismissed when the session is adopted. The session update and the route change land in the same tick, so hiding the modal at that moment renders one frame of the bare login screen before the tabs arrive. It stays up through `profile` and disappears with the login screen when the gate swaps in the tabs, so the visible transition is waiting view → home.

## Manual browser sign-in (Beta)

1. The login screen button `Im C@MPUS-Browser anmelden (Beta)` opens a `WebView` modal at `https://campus.uni-stuttgart.de/cusonline/` (`react-native-webview`, cookies shared). The user logs in there exactly as in a browser.
2. After logging in, the user taps `Anmeldung übernehmen`. The app first reads the WebView's cookie store natively (`readNativeCampusCookies` in `src/auth/campus-browser.ts`, called from `src/auth/use-campus-browser-login.ts`; `@preeternal/react-native-cookie-manager`, iOS: `{ iosCookieStore: 'webKit' }`) — `document.cookie` cannot see `HttpOnly` cookies such as `PSESSIONID`. Then injected JavaScript (`HARVEST_JS`) reads `document.cookie` plus `localStorage`/`sessionStorage` (values capped) and posts the harvest back via `onMessage`. The native cookies fill the gaps; the first value per name wins. Errors and the validation progress show inside the modal itself — the login screen behind it stays untouched until success.
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

## The device vault

The opt-in `Auf diesem Gerät speichern` writes `{ account, password, biometrics, savedAt }` through [vault.ts](../../src/auth/vault.ts) into `expo-secure-store`: the iOS keychain (`kSecClassGenericPassword`, hardware-backed where the device has a Secure Enclave) and Android `SharedPreferences` encrypted with the Android Keystore. With `Mit Biometrie schützen`, the entry carries `requireAuthentication` and an `authenticationPrompt`, so reading it raises the system biometric prompt; a biometric change invalidates the entry and it is treated as absent. `keychainAccessible` is `WHEN_PASSCODE_SET_THIS_DEVICE_ONLY`, so a removed passcode deletes the entry and it never migrates to a restored backup.

The entry is device-only and local: the app deletes it on sign-out (`Campus → App → Sitzung beenden`), the login screen has `Gespeicherte Anmeldung löschen`, and it is never sent to C@MPUS. It does leave the device for UniMail alone, where the assistant server proves the same password against TIK IMAP after a successful automated sign-in (see [mail.md](mail.md)). The account id alone is mirrored to Async Storage as a non-secret hint, so the screen can offer the vaulted login without prompting first. iOS persists keychain entries across a reinstall with the same bundle id, which is why sign-out deletes rather than ignores.

## Limits of the workaround

- The native cookie read needs a development build that contains `@preeternal/react-native-cookie-manager`; the vault needs `expo-secure-store`. Expo Go does not. After adding or updating them, rebuild with `npx expo run:ios|android` or `eas build --profile development`. Both modules are New Architecture only (Expo SDK 58 / RN 0.88 is).
- The automated path depends on the university pages: if the identity provider changes its form, adds a second factor, or adds bot protection, the autofill cannot get through and the fallback is the visible browser. It also does not read a password-manager or an OS passkey.
- Keeping the university password on the device is a real risk, accepted for this beta only: the credential unlocks C@MPUS, mail, and exam registration, unlike the scoped session. Prefer the stored-session or the later OIDC refresh-token path when the university approves the client, and see [security-and-privacy.md](security-and-privacy.md) and [08-maintenance.md](../sdlc/08-maintenance.md).
- On iOS the default WebKit store is read, which is the one `react-native-webview` uses unless the WebView runs an incognito or custom data store. A memory-only bearer (never written to storage) still yields no token — then only the manual flow works.
- The modal WebView keeps its own cookie jar; an external browser login does not transfer.
- This flow exists for beta testing only. Once TIK issues the OIDC client, SIAM sign-in replaces it; the password stays on the IdP either way.
