# Integrations

The product description names four university systems. C@MPUS, ILIAS, and SDG Campus are not called. SIAM sign-in is a real OpenID Connect authorization-code flow against the TIK identity provider, documented with every URL in [oidc-login.md](oidc-login.md).

For SIAM the app never stores or sends the university password. The student types it on `https://idp.uni-stuttgart.de`. Client id and client secret, issued by TIK, stay in the server `.env`. Two deliberate exceptions exist. UniMail is documented in [mail.md](mail.md): the TIK publishes IMAP as the interface for mail clients, so the password goes from the app to the local assistant server (which proves and holds it in memory) and on to the TIK IMAP host — never to any other endpoint, never persisted. The C@MPUS automated sign-in is the second: the user may keep the st-account password in the device vault so a hidden WebView can fill the official form; the password stays on the device for the C@MPUS sign-in itself, is deleted on sign-out, and only the harvested session reaches the assistant server for C@MPUS. That same password is then reused to connect UniMail, where it does reach the assistant server for the IMAP proof — see [campus-browser-login.md](campus-browser-login.md) and [mail.md](mail.md).

## One account across the platforms

Every sign-in creates or refreshes one server-side user, keyed by the st-account, and links the platforms that share that identity: C@MPUS, ILIAS, and SDG Campus through SIAM, plus UniMail once its IMAP credential is proven. The device keeps a session token and a copy of the public user record; the account screen at `/konto` is the single place that shows, syncs, or opens each platform. Links are `connected` (a live session or credential) or `linked` (the same identity is known). C@MPUS credentials and every portal row are scoped to that user id, so two accounts on one server do not share a timetable or a portal session. The model, the ticket handoff, the routes, and the session lifetime are in [accounts.md](accounts.md).

## What sync does today

`syncPlatform` in `src/state/AppState.tsx` writes an ISO timestamp on `syncAt[platform]`. For ILIAS it also marks the bundled ILIAS document ids as downloaded. The handbook, grades, deadlines, and news do not change, because they already are the record.

**UniMail is the one real personal-data connector besides C@MPUS.** The student enters the
st-account and password in the app, the assistant server proofs the pair against the TIK
IMAP service (`imap.uni-stuttgart.de:993`, officially published for mail clients) and
reads the inbox server-side. The password never touches the app storage, the device keeps
only the account id. Details: [mail.md](mail.md).

| Platform id | Screen copy | Local effect |
| --- | --- | --- |
| `siam` | Sign-in through the identity provider | Browser authorization code flow. On success, account, name, and email from UserInfo, plus `syncAt.siam`. |
| `campus` | C@MPUS | Timestamp only. Schedule and grades are the bundle. |
| `ilias` | ILIAS | Timestamp, plus `downloadedIds` for bundled ILIAS texts. |
| `sdg` | SDG Campus | Timestamp only. The FÜSQ module is already enrolled in the bundle. |

## Why there is no client

C@MPUS, ILIAS, and SDG Campus are authenticated, personal, and not published as an open API for third-party mobile apps. The beta C@MPUS browser path is the compromise: it drives the official pages instead of a university API, and the automated variant keeps the credential only in the device vault. It is not a substitute for the registered `slc.cm.cs` reads the assistant server makes, and it is explicitly beta — see [campus-browser-login.md](campus-browser-login.md).

SIAM is different because TIK publishes an identity provider for relying parties and asks services to use it instead of collecting passwords. This app is that relying party. It still needs a client id that TIK registers. It does not reuse the C@MPUS client, and it does not replay the `execution=` parameter that appears in the address bar after C@MPUS has already started a login. The login screen states that the project is not an official university app.

## Shape of a later connector

A real integration replaces the bundled snapshot for the signed-in student. It does not grow new `fetch` calls inside screens.

```text
Student → this app → project backend → university IdP and academic systems
                         → xAI Responses API (already this shape)
```

1. **Identity.** Implemented as authorization-code OpenID Connect. The token exchange already runs on this server, which also creates the server-side user and its app session ([accounts.md](accounts.md)). The app stores the account, name, email, subject, and the public platform links for display. It does not store the university tokens. Details and URLs: [oidc-login.md](oidc-login.md).
2. **C@MPUS.** One signed-in read is already shaped: the curriculum structure under `slc.cm.cs`, documented in [campus-curriculum.md](campus-curriculum.md). The assistant server calls it for login and for `POST /v1/campus/structure`. The study chooser, documented in [campus-studies.md](campus-studies.md), lists the enrolled studies and the root node of each; the server calls it for `GET /v1/campus/studies`. The bearer token and `PSESSIONID` stay in the server environment. A later connector still has to map that tree onto the modules `src/domain/plan.ts` already uses.
3. **ILIAS.** The backend lists file metadata and streams files the student is enrolled to see. The one-tap control becomes a real download into the app's document directory. Copyright stays with the course. The app should not republish those files to other students.
4. **SDG Campus.** Enrollment and the FÜSQ catalog come from that backend. The sustainability module row is the placeholder.
5. **News.** Faculty, institute, stuvus, and university items become feeds the backend normalizes into `NewsItem`.

Until that backend exists, the honest demo is the one in this repository: labeled data, local timestamps, no outbound university traffic.

## Assistant integration

This one is implemented. The client calls only the project server. The server calls `https://api.x.ai/v1/responses`. Details are in [ai-assistant.md](ai-assistant.md).

`EXPO_PUBLIC_ASSISTANT_URL` defaults to `http://127.0.0.1:8787`. A physical device must use the computer's LAN address, because `127.0.0.1` on the phone is the phone. Away from the LAN, the assistant gets a public hostname from `npm run assistant:tunnel` instead: the script writes it to `EXPO_PUBLIC_ASSISTANT_TUNNEL_URL`, which wins over the base URL while it is set and is cleared again when the tunnel stops — see [assistant-tunnel.md](assistant-tunnel.md). Setting `EXPO_PUBLIC_ASSISTANT_URL` to `off` disables the remote call and leaves the local answer.

## Files and sharing

Import uses the platform document picker (iOS Files, Android storage, or the desktop file dialog). Export uses `expo-sharing` on native and a Blob download on web. `app.json` enables `supportsOpeningDocumentsInPlace` and `enableFileSharing` on the `expo-file-system` plugin so a development build can see those files. Expo Go covers the picker and sharing modules that ship with the SDK. A custom native module would need a development build.

Peer sharing in this build is a boolean on the device record. A shared folder that other students can open needs accounts, storage, and a policy for who may upload solution guides. That service is not in this repository, and it must not become a dump for copyrighted lecture or exam files.
