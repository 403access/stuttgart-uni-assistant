# University sign-in (SIAM and OIDC)

SIAM is the identity management of the University of Stuttgart. It creates and holds the account (`st123456` for a student, `ac123456` for staff). It does not draw the login form that C@MPUS opens.

The login form belongs to the central identity provider operated by TIK. C@MPUS, ILIAS, and other university services send the browser there. The protocol is OpenID Connect, authorization code. TIK also offers SAML. TIK recommends OIDC when a service can use either. This app uses OIDC.

The password is typed on the identity provider's page. This repository has no password field and no environment variable for a password. `OIDC_PASSWORD`, `PASSWORD`, `CAMPUS_PASSWORD`, `SIAM_PASSWORD`, and `UNI_PASSWORD` are ignored. The server prints a warning if one of them is set.

## What the campus button does

1. The student opens [https://campus.uni-stuttgart.de/](https://campus.uni-stuttgart.de/).
2. The login control redirects the browser to the identity provider.
3. The address bar then shows the authorize endpoint, often with an extra `execution` parameter, for example `execution=e1s2`.

`execution` is a short-lived Shibboleth conversation id. It changes on every visit. It is not a client id, not a redirect URI, and not a URL this app should store or replay. The stable start of the login is the authorize endpoint below, with the OAuth query parameters added by this server.

## URLs

Fetched from the production discovery document on 14 October 2026: [https://idp.uni-stuttgart.de/.well-known/openid-configuration](https://idp.uni-stuttgart.de/.well-known/openid-configuration).

| Role | URL |
| --- | --- |
| C@MPUS | https://campus.uni-stuttgart.de/ |
| Issuer | https://idp.uni-stuttgart.de |
| Discovery, production | https://idp.uni-stuttgart.de/.well-known/openid-configuration |
| Discovery, test IdP | https://idp-test.tik.uni-stuttgart.de/.well-known/openid-configuration |
| Authorization | https://idp.uni-stuttgart.de/idp/profile/oidc/authorize |
| Token | https://idp.uni-stuttgart.de/idp/profile/oidc/token |
| UserInfo | https://idp.uni-stuttgart.de/idp/profile/oidc/userinfo |
| JSON Web Key Set | https://idp.uni-stuttgart.de/idp/profile/oidc/keyset |
| Registration | https://idp.uni-stuttgart.de/idp/profile/oidc/register |
| End session | https://idp.uni-stuttgart.de/idp/profile/oidc/end-session |
| Revocation | https://idp.uni-stuttgart.de/idp/profile/oauth2/revocation |
| Introspection | https://idp.uni-stuttgart.de/idp/profile/oauth2/introspection |
| Pushed authorization | https://idp.uni-stuttgart.de/idp/profile/oauth2/pushed-authorization |
| SAML metadata | https://idp.uni-stuttgart.de/idp/shibboleth |
| SAML metadata, test | https://idp-test.tik.uni-stuttgart.de/idp/shibboleth |
| TIK service description (SSO) | https://www.tik.uni-stuttgart.de/dienste-a-z/Anmelde--und-Authentifizierungsdienst-Single-Sign-On---SSO/ |
| SIAM, German | https://www.tik.uni-stuttgart.de/dienste-a-z/Identitaetsmanagement-00001/ |
| SIAM, English | https://www.tik.uni-stuttgart.de/en/services-a-z/Identity-management-SIAM/ |
| Registration contact | shibboleth-support@tik.uni-stuttgart.de |

The discovery document lists `token_endpoint_auth_methods_supported` as `client_secret_basic`, `client_secret_post`, `client_secret_jwt`, and `private_key_jwt`. It does not list `none`. A mobile app cannot complete the token step alone. TIK's published example uses `client_secret_basic`, and this server does the same. The secret stays in `.env` on the server.

Scopes advertised by that document include `openid`, `profile`, `email`, `phone`, `uid`, and `siam`. Claims include `siamAccountId`, `preferred_username`, `email`, `name`, and `eduPersonScopedAffiliation`. The default request is `openid profile email uid siam`. Narrow `OIDC_SCOPES` to the set TIK actually enables for the client.

Subject type is `pairwise`. The `sub` claim is not a stable public account number. The screen shows `siamAccountId`, then `preferred_username`, then `email`, then `sub`.

## How this app signs in

```text
App  →  POST /v1/oidc/start { redirectUri }
     ←  authorization URL (PKCE S256, state, nonce, optional login_hint)
App  →  system browser opens the authorization URL
Student types the password on idp.uni-stuttgart.de
IdP  →  redirectUri?code&state
App  →  POST /v1/oidc/exchange { code, state, redirectUri }
Server → token endpoint, client_secret_basic, code_verifier
Server → userinfo
App  ←  account, name, email, subject, and a local session id
```

Code lives in `server/oidc.mjs`, `src/auth/oidc.ts`, and `app/login.tsx`. The browser step uses `expo-web-browser` and `expo-auth-session` (`makeRedirectUri`). `WebBrowser.maybeCompleteAuthSession()` runs from `app/_layout.tsx` so a web popup can close when the code returns to `/oidc`.

The university access token and the refresh token stay in the server process memory, keyed by the local session id. They are not written to Async Storage and not returned to the app. Sign-out calls `POST /v1/oidc/logout`, which revokes the refresh token (or the access token) at the revocation endpoint and drops the memory entry. Restarting the server drops every token. The profile cached on the device remains until the student signs out.

`login_hint` is sent only when `OIDC_LOGIN_HINT` is set. That value is the account id, for example `st123456`, so the IdP can prefill its own form. It is not a credential this server can use by itself.

## Existing account, without registering the app

The identity provider does not offer the password grant. `grant_types_supported` in the discovery document is `authorization_code`, `implicit`, and `refresh_token`. An unregistered app cannot check a SIAM password, and this project does not post the password to the login form.

The alternate path opens the official C@MPUS site in the system browser:

[https://campus.uni-stuttgart.de/](https://campus.uni-stuttgart.de/)

C@MPUS then redirects to the identity provider. The student types the account and password they already have, on that page. No client id is required, because the student is signing in to C@MPUS itself, not to this app. The password is not read by this app and is not written to `.env`.

On the sign-in screen, **Mit dieser Nutzerkennung weiter** stores the typed account id on the device (`sessionMode: local`). That label is not a verified login. The timetable and grades stay the demonstration record. **C@MPUS öffnen** is also on the platforms screen.

## What has to be registered before the button succeeds

TIK does not hand a client id to an unregistered app. The public registration endpoint is listed in discovery, and this project does not call it. The published path is an email to shibboleth-support@tik.uni-stuttgart.de with:

- the name and purpose of the service
- a contact person
- the URL where people sign in
- the redirect URL or URLs
- the minimum attributes required

TIK then sends a client id and a secret. Put those in `.env` as `OIDC_CLIENT_ID` and `OIDC_CLIENT_SECRET`. Copy `.env.example`. Do not prefix them with `EXPO_PUBLIC_`.

The redirect URI the app will use is shown on the login screen. It must be registered character for character.

| Environment | Redirect the app generates |
| --- | --- |
| Development build or a store binary | `stuttgartuniassistant://oidc` |
| Expo Go | an `exp://…/--/oidc` URL from `makeRedirectUri` |
| Web dev server | `http://localhost:<port>/oidc` or `http://127.0.0.1:<port>/oidc` |

The server refuses to build an authorize URL for any other redirect, unless it is listed in `OIDC_REDIRECT_URIS`. Dev redirects can be turned off with `OIDC_ALLOW_DEV_REDIRECTS=false`. The IdP still rejects a redirect it has not registered, even if this server allows it.

A test client, if TIK issues one, uses `OIDC_ISSUER=https://idp-test.tik.uni-stuttgart.de`. The server then loads that issuer's discovery document instead of the production fallback.

Until a client id exists, the login button returns `oidc_unconfigured` and the screen explains the gap. The demonstration profile remains available and still loads Lena Hartmann's record.

## What a successful login does not do

The IdP proves who the account is. It does not return the timetable, grades, or ILIAS files. Those systems are separate. After SIAM sign-in the profile card shows the name and account from UserInfo, and it states that the timetable and grades are still the demonstration record. C@MPUS, ILIAS, and SDG Campus sync actions are unchanged: they stamp a local time and do not call those hosts.

## Checks

`node --test server/oidc.test.mjs` (also run by `npm run check`) asserts that the authorize URL uses the production endpoint, sends PKCE, omits `execution` and any password, and that a secret in the environment is not copied into the URL. It does not complete a login against the IdP. A real login needs a TIK client, a running `npm run assistant`, and a redirect URI that TIK has registered.

`GET /health` and `GET /v1/oidc/config` report `oidc.configured`. They do not report the secret or the login hint.
