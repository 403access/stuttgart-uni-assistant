# C@MPUS browser login (beta)

Temporary workaround until the university approves the OIDC client: sign in with the st-account and password on the real C@MPUS pages inside the app, then adopt the session into the assistant server. Two paths exist: a visible browser the user drives, and an automated one that fills the official form from a credential the user opted to keep on the device.

## Automated sign-in (headless)

`Automatisch anmelden` on the login screen takes the account id and the password, optionally stores them in the device vault ([vault.ts](../../src/auth/vault.ts)), and runs the sign-in in a hidden `WebView` (`headlessAutofillScript` in [campus-browser.ts](../../src/auth/campus-browser.ts)):

1. The hidden WebView opens `https://campus.uni-stuttgart.de/cusonline/`.
2. On every load, and on a three-second poll for late-rendered single-page forms, the injected script looks for a visible `input[type=password]`, prefers the named Shibboleth/CAMPUSonline username fields, writes the account and the password, and submits the form it belongs to. A "sign in" call to action on the C@MPUS host is clicked when the login sits behind one.
3. Submits are throttled (five seconds apart, at most three) so a wrong password cannot loop. The whole attempt times out after 90 seconds.
4. Once `cusonline_co.login.accessToken` or a `/desktop/` URL appears, the harvest below runs unchanged: the token from web storage plus the natively read `HttpOnly` cookies.

The credential never leaves the device: the fill and submit happen in the app's own WebView against the university page, and only the resulting session goes to `POST /v1/campus/credentials`. Failure shows inside the modal with a button to fall back to the visible browser.

## Manual browser sign-in (Beta)

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

## The device vault

The opt-in `Auf diesem Gerät speichern` writes `{ account, password, biometrics, savedAt }` through [vault.ts](../../src/auth/vault.ts) into `expo-secure-store`: the iOS keychain (`kSecClassGenericPassword`, hardware-backed where the device has a Secure Enclave) and Android `SharedPreferences` encrypted with the Android Keystore. With `Mit Biometrie schützen`, the entry carries `requireAuthentication` and an `authenticationPrompt`, so reading it raises the system biometric prompt; a biometric change invalidates the entry and it is treated as absent. `keychainAccessible` is `WHEN_PASSCODE_SET_THIS_DEVICE_ONLY`, so a removed passcode deletes the entry and it never migrates to a restored backup.

The entry is device-only and local: the app deletes it on sign-out (`Einstellungen → Sitzung beenden`), the login screen has `Gespeicherte Anmeldung löschen`, and it never reaches the assistant server. The account id alone is mirrored to Async Storage as a non-secret hint, so the screen can offer the vaulted login without prompting first. iOS persists keychain entries across a reinstall with the same bundle id, which is why sign-out deletes rather than ignores.

## Limits of the workaround

- The native cookie read needs a development build that contains `@preeternal/react-native-cookie-manager`; the vault needs `expo-secure-store`. Expo Go does not. After adding or updating them, rebuild with `npx expo run:ios|android` or `eas build --profile development`. Both modules are New Architecture only (Expo SDK 58 / RN 0.88 is).
- The automated path depends on the university pages: if the identity provider changes its form, adds a second factor, or adds bot protection, the autofill cannot get through and the fallback is the visible browser. It also does not read a password-manager or an OS passkey.
- Keeping the university password on the device is a real risk, accepted for this beta only: the credential unlocks C@MPUS, mail, and exam registration, unlike the scoped session. Prefer the stored-session or the later OIDC refresh-token path when the university approves the client, and see [security-and-privacy.md](security-and-privacy.md) and [08-maintenance.md](../sdlc/08-maintenance.md).
- On iOS the default WebKit store is read, which is the one `react-native-webview` uses unless the WebView runs an incognito or custom data store. A memory-only bearer (never written to storage) still yields no token — then only the manual flow works.
- The modal WebView keeps its own cookie jar; an external browser login does not transfer.
- This flow exists for beta testing only. Once TIK issues the OIDC client, SIAM sign-in replaces it; the password stays on the IdP either way.
