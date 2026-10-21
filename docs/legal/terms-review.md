# Terms-of-service and platform-rules review

- **Status:** internal compliance review, not legal advice
- **Date:** 20 October 2026
- **Scope:** the Expo app, the assistant server, the browser-login and mail flows, the tunnel and distribution setup, and the beta forms
- **Primary question:** does the project violate the terms of the services it integrates with?

> **Read this first.** This is an engineering and compliance review, not a legal opinion. It quotes the rules that were publicly reachable on 20 October 2026. Terms change, and some of the relevant university rules are German administrative law rather than a click-through contract. Before a public launch, a beta with other people's accounts, or a funding application that claims compliance, have a German lawyer or the university's legal counsel review the specific deployment.

---

## 1. The short answer

**Yes, at least one likely violation exists in the current design, and it is not a close call if the assistant server is used by anyone other than the person whose account it is.**

The university's IT rules make access credentials personal and non-transferable. The app's server-side architecture moves a C@MPUS session and, for UniMail, the account password, from the device to a server. It also has a code path that lets an unauthenticated caller sign in with the operator's own `.env` C@MPUS credential. That is the pattern the university's CERT publicly called a violation in the UniNow case: a third party processing university credentials and scraping university systems.

There is also a separate, serious security defect that becomes a terms problem: the UniMail routes have **no authentication** and the server keeps **one global mailbox** in process memory. While the assistant tunnel is up, anyone who learns the tunnel URL can read the connected mailbox. The project's own security note already says every assistant route is public while the tunnel is up.

The commercial services are mostly fine for development use. xAI and Apple are **conditional**: the current build does not meet the conditions. Cloudflare and ngrok are fine for a demo, but not for production traffic. Tally and GitHub Pages are low risk. The OpenVPN dependency is a separate licence problem, not a terms-of-service problem, and it is more clear-cut than several of the ToS findings.

### 1.1 Verdict table

| Service | What the project actually does | Key rule | Verdict | Severity |
| --- | --- | --- | --- | --- |
| **University of Stuttgart — IuK rules** | Harvests C@MPUS session cookies/token, sends them to the assistant server, calls internal C@MPUS REST endpoints, reuses the password for IMAP, exposes the server over a tunnel | IuK-Benutzungsordnung § 3(2)(f), (g), (q); § 2(7) | **Likely violation when the server is hosted, tunnelled, or used by another person**; unclear but risky even locally | **High** |
| **C@MPUS** | Server-side calls to `slc.cm.cs` and `slc.tm.cp` with a harvested `PSESSIONID` and bearer; `robots.txt` is `Disallow: /`; no published third-party API | IuK rules; robots; no API permission | **No permission found; strong negative signals; likely unauthorised automated access** | **High** |
| **ILIAS** | No real ILIAS data is fetched today; ILIAS is linked as a platform and the bundled documents are fictional | ILIAS terms § 4: personal account, may not be made available to third parties; § 5: materials not for sharing | **No current violation found**; would become one if a real connector is added | Medium (future) |
| **SDG Campus** | No real SDG data is fetched; the FÜSQ module is fictional | SDG Campus's own terms; university rules | **No current violation found**; obtain permission before a connector | Low (future) |
| **SIAM / OIDC** | Authorization-code flow, PKCE, server-side client secret, tokens in server memory | TIK registration rules; discovery document | **Compliant only with a TIK-registered client and exact redirect URI**; unconfigured today | Medium (conditional) |
| **UniMail / TIK IMAP** | Sends the st-account password to the assistant server, proves it against `imap.uni-stuttgart.de:993`, keeps it in process memory, reads mail | TIK publishes IMAP for mail clients; IuK § 3(2)(f) for credential sharing | **Interface is allowed; server-side handling likely violates IuK rules when hosted** | **High** |
| **xAI / Grok** | Sends question, last six chat turns, fact sheet, and document text to `api.x.ai/v1/responses` with `store: false`; no separate opt-in | xAI Enterprise Terms § 3.1, § 11.1–11.2; AUP | **Likely non-compliant for personal data**: `store: false` is not ZDR, and there is no explicit consent | **High** |
| **Cloudflare** | Quick tunnel exposes the assistant; named tunnel serves the iOS build service | Self-Serve Subscription Agreement § 2.2.1(j), § 2.5.2, § 2.7 | **Fine for dev/demo**; risk if used as a public proxy for credential-bearing traffic | Medium |
| **ngrok / Expo tunnel** | `expo start --tunnel` for the bundle | ngrok ToS: 18+, no unlawful or infringing content | **Fine for development**; not a production channel | Low |
| **Tally** | Beta signup, survey, interview forms | Tally Terms / DPA; GDPR | **No ToS violation found**; the operator is the data controller and must honour retention/deletion | Low |
| **GitHub Pages** | Static site and docs | GitHub Terms / Pages policies | **No issue found** | Low |
| **Apple** | Ad Hoc / TestFlight distribution, VPN screen and optional OpenVPN engine, hidden WebView, account creation | DPLA; App Review Guidelines 5.2.2, 5.1.1, 5.1.2, 5.4 | **Likely to fail App Review / TestFlight review on several points**; Ad Hoc is testing-only | **High** |
| **OpenVPN libraries** | `@aliakhgar1/react-native-openvpn` ships GPLv2-only `libopenvpn.so` and ics-openvpn code inside an AGPL app | GPLv2 / AGPLv3 | **Separate licence violation**, not a ToS issue; unresolved in the repo's own docs | **High** |

### 1.2 The findings that matter most

1. **The operator credential path is the clearest university-rules breach.** `resolveLoginCredential()` falls back to `CAMPUS_BEARER_TOKEN` / `CAMPUS_SESSION_COOKIE` when the caller has no ticket and no session. The deprecated `/login-legacy` screen still calls that path, and the server exposes it to any direct caller. Any user who can reach the server can therefore trigger a C@MPUS read under the operator's account. The university's rules say the user must ensure that no other person gains access through their credentials.
2. **Server-side scraping of C@MPUS has no published permission.** I found no C@MPUS-specific "no bots" clause, and no explicit "automation is allowed" clause either. What I did find: no public API or client registration for this app, `campus.uni-stuttgart.de/robots.txt` set to `Disallow: /`, and a CERT precedent that treats provider-side web scraping plus credential processing as a violation. This is a permission gap with strong negative signals, not a quoted prohibition.
3. **The UniMail routes are unauthenticated and share one global credential.** `server/mail.mjs` has a single `secrets` object; `server/routes/mail.mjs` never calls `requireAuth`; `GET /v1/mail/config` even returns the connected account and address to anyone. With the tunnel up, that is a public mailbox.
4. **xAI is not being used on xAI's terms for personal data.** The Enterprise Terms require personal data to go through the ZDR-enabled API. The app uses `store: false`, which is a request flag, not ZDR. The privacy notice itself says the Grok forwarding cannot yet be switched off.
5. **Apple is likely to reject the current shape** on third-party-service permission (5.2.2), account deletion (5.1.1(v)), explicit third-party-AI consent (5.1.2(i)), and VPN apps from an individual developer (5.4). Ad Hoc is for testing on registered devices, not a general distribution channel.

---

## 2. Method and limits

I checked:

- the public terms, user regulations, and help pages of each service;
- the repository's own statements about what it does;
- the code paths that actually move data, because a privacy notice can be accurate while the implementation still breaks a platform rule.

I did **not**:

- log in to C@MPUS, ILIAS, SDG Campus, or UniMail, so a platform-specific accepted-use clause shown only after login cannot be ruled out;
- test the live tunnel or the live mail routes against another person's account;
- obtain a legal opinion;
- verify whether TIK has registered an OIDC client for this project. The repository says it has not (`OIDC_CLIENT_ID` is empty in `.env.example`).

Line numbers are from 20 October 2026 and may move. Treat them as pointers, not permanent citations.

---

## 3. The university rules

### 3.1 Which rules apply

The University of Stuttgart's **Benutzungsordnung für die digitale Informationsverarbeitung und Kommunikationstechnik (IuK)** of 18 December 2006 is the general rule for university IT systems. TIK's own "Nutzungsbedingungen und rechtliche Informationen" page links it as the governing order. ILIAS's own terms say the IuK order applies to ILIAS.

The relevant provisions are:

- **§ 1(1):** the order covers university IT systems, including software and services.
- **§ 2(7):** the usage authorisation is **not transferable**.
- **§ 3(2)(e):** use the systems only within the authorisation granted.
- **§ 3(2)(f):** ensure that **no other person gains access** through your authorisation; in particular, ensure that others do not learn your authentication information (password, PIN, private key).
- **§ 3(2)(g):** do not obtain or disclose other people's authentication information.
- **§ 3(2)(h):** do not take unauthorised access to other users' information and do not pass it on.
- **§ 3(2)(q):** coordinate any processing of personal data through your own procedures with the system operator and the data protection officer.

The list in § 3(2)(f) is non-exhaustive ("z. B."). A session cookie or bearer token is authentication information in the ordinary sense even if it is not literally a password.

ILIAS's own terms are even more explicit:

- **§ 4:** "Beim ILIAS-Konto handelt es sich um ein persönliches Konto, das nur persönlich genutzt werden und keinem Dritten zur Verfügung gestellt werden darf." (The ILIAS account is personal and may not be made available to a third party.)
- **§ 5:** learning materials in the access-protected areas are for the authorised person's personal use and may not be passed on to third parties.

### 3.2 The CERT precedent is directly on point

The university's CERT (RUS-CERT) published a warning about the UniNow app in 2016:

> "Die Verwendung der App UniNow verstößt gegen den § 3 Abs. 2 f der Benutzungsordnung ... Dies ergibt sich aus der Tatsache, dass der Anbieter dieser App Zugangsdaten zu Diensten der Universität Stuttgart auf seinen Servern im Klartext verarbeitet und für den Abruf von Daten von den Servern der Universität Stuttgart (sog. Webscraping) nutzt. Die Weitergabe von Zugangsdaten an Dritte, ist jedoch durch die Benutzungsordnung explizit verboten."

Translation: the app violated § 3(2)(f) because the provider processed university credentials in plaintext on its servers and used them for web scraping. The follow-up article says the revised app, which kept credentials on the device and did not pass them to third parties, did **not** violate the order.

That is the exact fault line this project has to decide on:

- **Locally-run server, same device, no tunnel, no other users:** the server is arguably not a "third party", and the security note's "password stays on the device" story can be true for the C@MPUS part. This is the defensible configuration.
- **Hosted server, tunnel, beta testers, or any path where another person's request is served with the operator's credential:** the server is a third party in the ordinary sense. The UniNow reasoning applies. The fact that the data is read-only or that the record is fictional does not change the credential-sharing analysis.

### 3.3 What the code actually does

| Behaviour | Evidence |
| --- | --- |
| Hidden WebView fills the official Shibboleth/Keycloak form with the stored password | `src/auth/campus-browser-scripts.ts:52` (`headlessAutofillScript`), `src/auth/use-campus-headless-login.ts` |
| Visible WebView harvests `document.cookie`, `localStorage`, `sessionStorage`, plus native `HttpOnly` cookies | `src/auth/campus-browser-scripts.ts:16`, `src/auth/use-campus-browser-login.ts:64-65`, `src/auth/campus-browser.ts:28` |
| Harvest is POSTed to the assistant server | `src/auth/campus.ts:708` (`submitBrowserCredentials`), `server/routes/campus.mjs:33` |
| Server validates and keeps the session in process memory | `server/campus.mjs:1086` (`validateBrowserCredentials`), `server/campus.mjs:56` (`setUserCampusCredential`) |
| Server calls internal C@MPUS REST endpoints with `PSESSIONID` and bearer | `server/campus.mjs:182-202`, `server/campus.mjs:121-129` |
| Unauthenticated `/v1/campus/login` falls back to the operator's `.env` credential | `server/campus.mjs:655-660`, `server/routes/campus.mjs:59`, `src/auth/campus.ts:194-204` |
| Successful automated sign-in reuses the same password for UniMail and sends it to the server | `src/auth/use-login-flow.ts:109-110`, `src/auth/use-login-flow.ts:169-176`, `server/routes/mail.mjs:28` |
| Server binds all interfaces and allows any origin | `server/index.mjs:47`, `server/http.mjs:44` |
| The docs say every assistant route is public while the tunnel is up | `docs/engineering/security-and-privacy.md:56` |

### 3.4 Verdict and what would make it compliant

**Verdict:**

- **High risk of violating § 3(2)(f), § 2(7), and the ILIAS § 4 rule** in the hosted/tunnelled/multi-user configuration.
- **The `.env` fallback is a violation on its own** if the app is used by anyone other than the operator, because it lets another person access the operator's C@MPUS identity.
- **The scraping itself is likely outside the terms** even in a local configuration, because no published API or permission exists and `robots.txt` rejects all automated access. A local server does not fix that; it only fixes the third-party-credential part.
- **The "fictional record" defence does not help** with the credential-sharing rule. The rule protects the account, not the content.

**Minimum changes:**

1. **Remove the `.env` fallback for unauthenticated callers.** A request without a user session must not be able to read C@MPUS with the operator's credential. If the demo needs a fictional record, use the bundled record, not a real token.
2. **Default the assistant server to loopback (`127.0.0.1`), not `0.0.0.0`.** Add an explicit `--lan` or `--tunnel` flag that warns about credential exposure.
3. **Do not run the credential-harvesting routes over a tunnel.** If a tunnel is needed, expose only the fictional assistant route and require a per-user token.
4. **Get written permission from TIK** for (a) automated read-only access to the C@MPUS endpoints and (b) the browser-harvest flow. Until then, treat both as beta-only and local-only.
5. **Do not send the university password to a server.** Keep the C@MPUS credential and the IMAP password on the device, or use an official OIDC/IMAP token flow that does not require the password to leave the device.
6. **Ask TIK whether a locally-run assistant server counts as a "third party"** under § 3(2)(f). Get the answer in writing; it determines whether the local-only configuration is defensible.
7. **Coordinate the personal-data processing with the data protection officer** under § 3(2)(q) if the server stores portal rows, users, sessions, or mail.

---

## 4. C@MPUS, ILIAS, and SDG Campus

### 4.1 Automation: what is actually established

The question "is automation allowed?" has a different answer from "is the current automation covered by a permission?" The public record does not contain a clean yes/no for C@MPUS or ILIAS. This is what I could establish:

| Platform | Explicit automation clause? | Sanctioned automation path? | What follows |
| --- | --- | --- | --- |
| **C@MPUS** | **No public clause found.** The IuK order does not mention bots, crawlers, or scraping. The C@MPUS login page links only to Datenschutz and Impressum. | **No public API advertised by the university.** The CAMPUSonline vendor offers a Public REST API that requires a Client-ID, but the university has not issued one to this project. | **No permission found.** `robots.txt` is `Disallow: /`; the project calls internal endpoints with a harvested session. Treat this as unauthorised until TIK says otherwise. |
| **ILIAS** | **No automation clause found.** The ILIAS terms ban third-party account use and sharing materials, not automated reads as such. | **No public API advertised.** The terms reference the IuK order. | Automation with your own session may be technically possible, but it is not clearly permitted and would still be bound by § 4 (personal account) and § 5 (no sharing materials). Ask ILIAS support. |
| **SDG Campus** | **No general automation clause found.** The Moodle policy requires personal registration and secret credentials; it separately forbids autonomous AI agents that complete tasks or answer for you. | Moodle web service/API may exist, but no public terms for third-party clients were found. | No permission found. Do not add a connector without asking the SDG Campus operator. |
| **SIAM** | The OIDC flow is the sanctioned path; the terms are about registration and scopes, not about forbidding automation. | **Yes: OIDC authorization code.** | Use a TIK-registered client. Do not automate the password form. |
| **UniMail** | The TIK e-mail page publishes IMAP/POP3/SMTP for mail clients. | **Yes: IMAP on `imap.uni-stuttgart.de:993`.** | Automation is allowed by design; the issue is where the password is processed, not whether a client may connect. |
| **xAI** | The AUP forbids "unauthorized automated or non-human means"; the API key is the authorised means. | **Yes: the xAI API.** | Server-side API calls are fine; scraping the web UI or bypassing limits is not. |

**What this means in plain language:**

- I did **not** find a clause that says "automated access to C@MPUS is prohibited."
- I also did **not** find a clause that says "automated access to C@MPUS is allowed," nor a published API or client registration that covers this app.
- The strongest evidence against the current flow is indirect: `robots.txt` rejects all crawling, the endpoints are undocumented, the project has no API client id, and the university's CERT has already treated provider-side scraping plus credential processing as a violation.
- The RUS-CERT UniNow follow-up is important: it says the revised app, which kept credentials on the device and did not pass them to third parties, did **not** violate the order. That suggests the university's objection was primarily the third-party credential handling, not automation as such. It does **not** amount to permission for server-side scraping.
- For ILIAS and SDG Campus, the same logic applies: no explicit ban on automation, but no permission either, and the account/material rules still apply.

So the correct label for the current C@MPUS flow is **"no permission found, strong negative signals, likely unauthorised"**, not **"expressly prohibited by a quoted clause."** The action is the same: ask TIK for a written decision or use an official API/OIDC path.

### 4.2 C@MPUS

C@MPUS is the university's campus-management portal. The university describes it as a service of the IT application centre; it is not a public API. The portal's `robots.txt` at `https://campus.uni-stuttgart.de/robots.txt` is:

```text
User-agent: *
Disallow: /
```

That is not a contract, but it is a clear operator signal that automated crawling is not wanted. The app ignores it and calls undocumented internal endpoints:

- `/cusonline/ee/rest/slc.cm.cs/student/myStudies/.../structure`
- `/cusonline/ee/rest/slc.cm.cs/student/myStudies/chooser`
- `/cusonline/ee/rest/slc.cm.cs/student/myStudies/.../courses`
- `/cusonline/ee/rest/slc.tm.cp/student/courseGroups/firstGroups/...`
- `/cusonline/ee/rest/auth/token/refresh`
- `/cusonline/wbKalender.wbExport`

The repository's own `docs/engineering/integrations.md:30` says C@MPUS "is not published as an open API for third-party mobile apps." That is the honest statement. The beta path "drives the official pages instead of a university API" — but the server does not drive pages; it calls the REST endpoints directly with a harvested session.

**Verdict:** likely unauthorised automated access. The risk is highest if the server is hosted or shared; even locally, the university can treat the scraping as a terms breach and block the account or the IP.

### 4.3 ILIAS

The app does not currently fetch real ILIAS data. It marks bundled ILIAS documents as downloaded and links to ILIAS. The terms only become a live issue when a real connector is added.

If that connector is added:

- The ILIAS account is personal and may not be made available to a third party (§ 4).
- Course materials may not be passed on to third parties (§ 5).
- The university's copyright rules apply to every file, even if the student already has a copy.

**Verdict:** no current violation. A real connector needs an explicit ILIAS API/terms review and a per-user, on-device design.

### 4.4 SDG Campus

The app does not fetch SDG Campus data. The FÜSQ module is fictional. SDG Campus is a separate platform with its own terms and a consortium of universities. Do not add a connector without checking its terms and getting permission.

**Verdict:** no current violation; future risk only.

---

## 5. SIAM and the OIDC client

The SIAM path is the cleanest part of the design **if** TIK has registered the client.

What is compliant:

- The password is typed on `idp.uni-stuttgart.de`, not in the app.
- The server uses the authorization-code flow with PKCE and a server-side client secret.
- The university access and refresh tokens stay in server memory and are not returned to the app.
- The app does not replay the `execution=` parameter from a C@MPUS login.
- The client id and secret are in `.env`, not in the bundle.

What is missing:

- A TIK-registered client id and secret. `.env.example` leaves both empty; the login button returns `oidc_unconfigured` until they exist.
- An exact registered redirect URI. The app generates `universityassistant://oidc` for a development/store build and `exp://…` in Expo Go. TIK must register the exact value.
- Minimal scopes. The default `openid profile email uid siam` may be broader than TIK enables for the client; narrow it to what TIK approves.

**Verdict:** compliant in principle, but **not currently active**. Do not use the C@MPUS client id, do not reuse a client secret from another app, and do not ship an unregistered client.

---

## 6. UniMail / TIK IMAP

### 6.1 The interface is allowed

TIK publishes IMAP (`imap.uni-stuttgart.de:993`, SSL) as an interface for mail clients. Using IMAP to read an inbox and set its read flag is within the published service description. The app does not send mail or create drafts.

### 6.2 The handling is the problem

The app sends the st-account **password** to the assistant server. The server proves it against IMAP and keeps it in process memory. That is a very different posture from a local mail client:

- If the server runs on the user's own device, the password is still leaving the app sandbox and entering a Node process. That may be acceptable to the user, but it is not "the password stays on the device".
- If the server is hosted or tunnelled, the password reaches a third party. IuK § 3(2)(f) applies.
- The same password also unlocks C@MPUS and exam registration. Reusing it automatically after a C@MPUS sign-in (`use-login-flow.ts:109-110`) increases the blast radius.

### 6.3 The unauthenticated global mailbox is a P0 defect

This is the most serious implementation finding in the repository:

```js
// server/mail.mjs:29
let secrets = null; // { username, password } — process memory only.

// server/mail.mjs:80
secrets = { username: account, password };
```

There is **one** mailbox for the whole server. The routes do not check the caller:

- `GET /v1/mail/config` returns `configured`, `account`, and `address` to anyone.
- `GET /v1/mail/folders` calls `loadMailFolders()` with no user id.
- `GET /v1/mail/messages` calls `loadMailMessages(...)` with no user id.
- `GET /v1/mail/body` calls `loadMailBody(...)` with no user id.
- `POST /v1/mail/logout` clears the global credential for everyone.
- `server/routes/mail.mjs` does not import or call `requireAuth`.

The docs already say "every assistant route is public while that tunnel is up" (`docs/engineering/security-and-privacy.md:56`). That means: while the demo tunnel is running, anyone with the URL can read the connected mailbox. The tunnel URL is in the client bundle (`EXPO_PUBLIC_ASSISTANT_TUNNEL_URL`), so "anyone with the URL" is not a small set.

**Verdict:** when the server is reachable by anyone other than the mailbox owner, this is a violation of the university's access rules and of GDPR Art. 5(1)(f) and Art. 32, independent of the ToS question. It is also a straightforward security bug even on a trusted LAN.

**Fix:**

1. Require `requireAuth` on every `/v1/mail/*` route except `/config` (and make `/config` return only `{ configured: boolean }`).
2. Key the mail credential by user id, like the C@MPUS credential. Do not use a module-global `secrets`.
3. Never run the mail routes over a public tunnel.
4. Add a per-user disconnect and a server-side expiry.
5. Add a test that two users cannot read each other's mailbox.

---

## 7. xAI / Grok

### 7.1 What the terms say

xAI's API is governed by the **Terms of Service — Enterprise** (last updated 14 August 2026) and the **Acceptable Use Policy** (effective 14 August 2026). The relevant clauses:

- **§ 2:** the customer must comply with the AUP and must maintain legally enforceable terms of service and an acceptable use policy with all end users that are no less protective than the xAI terms.
- **§ 3.1:** the customer warrants that it has all rights, licences, consents, and permissions to submit Input.
- **§ 11.1:** if Input includes personal data, xAI processes it as a processor under the xAI DPA.
- **§ 11.2:** the customer "will not intentionally submit ... any Personal Data to the Services except through SpaceXSI's ZDR-Enabled API". Using a non-ZDR API for personal data is a material breach.
- **AUP:** no scraping, harvesting, or reselling Input/Output; no bypassing protective measures; no misleading users about AI use; no unlawful content.

### 7.2 What the app sends

`server/routes/assist.mjs` sends:

- the user's question;
- the last six chat turns;
- a fact sheet up to 24,000 characters;
- the focused document text, if a document is open.

The fact sheet is built from the local record and can include imported notes, chat history, grades, modules, deadlines, and peers (`docs/engineering/security-and-privacy.md:87-91`). The request uses `store: false` (`server/routes/assist.mjs:61`).

`store: false` asks xAI not to retain the response. It is **not** the contractual ZDR-Enabled API described in § 11.2. The app has no separate Grok toggle; the privacy notice admits this at `site/datenschutz/index.html:251-253`.

### 7.3 Verdict

- **For purely fictional data with no personal notes:** the API use is within the ordinary terms, provided the app discloses that Grok is used and does not misrepresent the output as human or official. The app labels Grok bubbles, which is good.
- **For real personal data (imported notes, a real transcript, a real chat):** likely a breach of § 11.2 and a GDPR problem. `store: false` does not cure it.
- **For end users:** the project has no in-app terms of service or AUP. § 2 requires enforceable end-user terms. The site's privacy notice is not a substitute.

### 7.4 Fix

1. Use xAI's ZDR-enabled API for any request that can contain personal data, or guarantee that the request contains only fictional data.
2. Add an explicit, separate opt-in before the first Grok request. Do not send imported notes, chat history, or document text until the user opts in.
3. Add an in-app "AI and data" screen that names xAI, the data sent, the purpose, the retention position, and the opt-out.
4. Add end-user terms and an AUP that incorporate the xAI restrictions.
5. Sign/accept the xAI DPA if personal data will be processed.
6. Do not describe `store: false` as "no retention" without qualification; it is a request flag, not ZDR.

---

## 8. Cloudflare

### 8.1 Quick tunnels

Cloudflare's Quick Tunnels are account-less, have no uptime guarantee, change hostname on every start, and are explicitly not the production path ("For stable hostnames and production traffic, create a Cloudflare Tunnel"). Using one for a demo is fine. Using one as the permanent backend for a beta is not.

Cloudflare's Self-Serve Subscription Agreement (12 September 2025) also says:

- **§ 2.2.1(j):** you may not "use the Services to provide a virtual private network or other similar proxy services."
- **§ 2.5.2:** you must obtain all necessary rights and permissions to provide Customer Content, and the content must not violate law.
- **§ 2.7(b):** no content that infringes third-party rights or is otherwise unlawful.

The assistant tunnel is HTTP ingress, not a VPN, so § 2.2.1(j) is not automatically engaged. But if the tunnel is used to proxy credential-bearing traffic to a service that violates university terms, § 2.5.2/§ 2.7 become relevant. The practical risk is not Cloudflare terminating the account; it is that the tunnel makes the university-rules violation public and easy to discover.

### 8.2 Named tunnel for the build service

`dist-service/` uses a named Cloudflare tunnel for `builds.olimo.me`. That is the supported shape and is fine technically. The IPA download is a large file; Cloudflare's current self-serve terms do not contain the old blanket non-HTML restriction, but keep an eye on plan limits and do not use the free tier as a general file CDN.

### 8.3 Fix

1. Use Quick Tunnels only for short demos, with `--allowed-mail` if possible.
2. Never expose the mail or credential routes through a quick tunnel.
3. Use a named tunnel plus Cloudflare Access for any longer-running beta.
4. Shut the tunnel down when the demo ends; the script already clears the URL, keep that behaviour.

---

## 9. ngrok / Expo tunnel

`expo start --tunnel` carries the JS bundle through ngrok. ngrok's Terms of Service (2 March 2026) require the user to be at least 18, prohibit unlawful or infringing content, phishing, malware, and use that violates third-party rights. A development tunnel for a student demo is ordinary use.

There is no production SLA and no reason to use the ngrok tunnel for the assistant. The project already separates the two tunnels; keep that.

**Verdict:** no issue for development. Do not use it as the distribution channel for a beta.

---

## 10. Tally

Tally hosts the beta signup, survey, and interview forms. Its GDPR page says:

- Tally is based in Belgium and stores form data in Europe.
- A DPA is available and is accepted by professional users when they create an account; no separate signature is required.
- The form creator is the data controller; Tally is the processor.
- Deleted form data is removed from backups within 90 days.

The signup form collects name, email, optional phone, device, a free-text answer, and consent. The privacy notice covers it. There is no ToS violation in the current use.

**What to keep doing:**

- Do not ask for C@MPUS passwords, tokens, matriculation numbers, or screenshots.
- Keep the contact list out of git.
- Delete the contact list after the last interview.
- Do not merge the identified signup list with the pseudonymous survey.
- Accept the Tally DPA in the account settings and keep a record of it.

---

## 11. Apple

The app is intended for Ad Hoc / TestFlight / a sideloading fallback, not the App Store. The Apple Developer Program License Agreement still applies, and TestFlight builds go through Beta App Review. The App Review Guidelines are the practical test.

### 11.1 Distribution

Apple's DPLA allows distribution through the App Store, Custom App Distribution, **Ad Hoc** (registered devices, testing, 100 devices per product family per membership year), and **TestFlight** (beta testing). Ad Hoc is explicitly a testing mechanism, not a long-term distribution channel. The repository's own `docs/engineering/ios-distribution.md` says this correctly.

`dist-service/` is fine for Ad Hoc/TestFlight testers. Do not turn it into a public download page for anyone with the link. The device limit and the one-year profile expiry are the guardrails, not a licence to distribute broadly.

### 11.2 App Review issues

| Guideline | Issue | Current state |
| --- | --- | --- |
| **5.2.2 Third-Party Sites/Services** | If the app uses a third-party service, it must be permitted under that service's terms. | C@MPUS scraping is not shown to be permitted under the university's terms. This alone is a rejection/removal risk. |
| **5.1.1(i) Privacy Policies** | A privacy policy link must be in App Store Connect metadata and **within the app**. | The site has a privacy notice; the app does not appear to link it. |
| **5.1.1(v) Account Sign-In** | If the app supports account creation, it must offer **account deletion within the app**. | The admin dashboard can delete users; the app has no self-service deletion. |
| **5.1.1(vi)** | Apps may not surreptitiously discover passwords or private data. | The hidden WebView fills the official form and harvests cookies. It is disclosed, but App Review may treat a hidden password form plus cookie harvesting as high-risk. |
| **5.1.2(i) Data Use and Sharing** | Explicit permission is required before sharing personal data with third parties, including third-party AI. | The app sends chat/facts to xAI with no separate opt-in. |
| **5.4 VPN Apps** | VPN apps must use `NEVPNManager` and **may only be offered by developers enrolled as an organization**. | The developer is an Individual membership. The VPN screen is in every build; the OpenVPN engine can be compiled in. If the feature is enabled and offered as a VPN, this guideline applies. |
| **2.5.1 Public APIs** | Only public APIs. | The cookie manager uses public WebKit APIs; likely fine, but review the implementation. |
| **2.3.9 Fictional account info** | Use fictional account information, not a real person's data. | The demo record is fictional and labelled. Good. |
| **5.2.1 Trademarks** | Do not use third-party trademarks without permission. | C@MPUS/ILIAS names are used nominatively; no university signet. Low risk, but avoid implying endorsement. |

### 11.3 What 5.2.2 means here

Apple's text is:

> "If your app uses, accesses, monetizes access to, or displays content from a third-party service, ensure that you are specifically permitted to do so under the service's terms of use. Authorization must be provided upon request."

This is not a general anti-scraping law, and Apple is not interpreting the university's rules for you. It is an **App Review evidence requirement**: if the app accesses C@MPUS content, the developer must be able to show that the university permits that access. A student's own account does not, by itself, prove that a third-party app or server is permitted. Apple can ask for the authorization, and the project currently has no written permission, no C@MPUS API client id, and no official API integration to show.

That is why the document says **"not shown to be permitted"**, not **"prohibited."** The absence of a public permission is the finding. A written TIK approval or an official API/OIDC registration would satisfy this specific Apple requirement, even though it would not automatically resolve the separate IuK questions.

Source: Apple, [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/), section 5.2.2, retrieved 20 October 2026.

### 11.4 What to do before submitting

1. Get written permission for C@MPUS access, or remove the scraping from the store build.
2. Add an in-app privacy policy link and an in-app account-deletion flow.
3. Add an explicit AI consent screen and a toggle.
4. Remove the VPN screen from the store build until the developer is an organization and the entitlement is approved, or make it a separate app.
5. Use TestFlight for beta testers; do not hand out public Ad Hoc links.
6. Be ready to explain the hidden WebView in the review notes. If the explanation is "we fill the university's form for the user and harvest the session", expect scrutiny under 5.1.1(vi).

---

## 12. Not a ToS issue, but a harder legal issue: the OpenVPN licence

`@aliakhgar1/react-native-openvpn` is labelled MIT, but the repository's own analysis (`docs/engineering/vpn-tunnel.md:54-67`) says it ships:

- `libovpn3.so` — OpenVPN 3, AGPL-3.0-only **or** MPL-2.0;
- `libopenvpn.so` — the OpenVPN 2 core, GPLv2;
- vendored `de.blinkt.openvpn` AIDL and helpers — ics-openvpn, GPLv2.

This repository is AGPL-3.0-or-later. AGPL is compatible with OpenVPN 3's AGPL/MPL offers but **not** with GPLv2-only code. The repo's own document calls the collision real rather than resolved.

This is a licence compliance problem, not a terms-of-service problem. It is more clear-cut than several of the ToS findings, and it should be fixed before any distribution:

- Use only the OpenVPN 3 core under MPL-2.0, or
- replace the GPLv2-only parts, or
- obtain permission from the rights holders, or
- do not ship the OpenVPN engine.

Separately, distributing AGPL code through the App Store raises the known AGPL/Apple terms tension. If the app is ever submitted to the App Store, have counsel review that too.

---

## 13. Cross-cutting issues

### 13.1 GDPR

The operator is likely a controller for the server-side user records, portal rows, mail cache, and beta contact list. The app's privacy notice is a good start, but the current implementation has gaps:

- **Art. 5(1)(f) / Art. 32:** the unauthenticated global mailbox and the public tunnel are not appropriate technical measures.
- **Art. 6:** the legal basis for server-side mail and C@MPUS processing needs to be specific. "Provision of the feature" is plausible for the user's own data, but not for a shared server.
- **Art. 13/14:** the privacy notice must name every recipient and transfer mechanism. It names xAI, Cloudflare, Tally, GitHub, Apple/Google. Good, but keep it in sync with the code.
- **Art. 15–17:** users need access, correction, and deletion. The admin dashboard has delete; the app does not.
- **Art. 32:** encrypt the SQLite database at rest, restrict the admin dashboard, add audit logs, and rate-limit the auth routes.
- **Art. 35:** a DPIA is likely required for systematic processing of student credentials and academic records.

### 13.2 The admin dashboard

The operator dashboard at `/admin` shows users, sessions, platform links, and per-user C@MPUS data. That is a central collection of academic data. If the server is hosted for beta testers:

- Each tester must be told that the operator can see their data.
- The dashboard must be access-controlled, TLS-only, and audited.
- The operator must have a deletion and retention policy.
- The data must not be used for any other purpose.

`DASHBOARD_TOKEN` is a good gate, but it is a single shared secret with no user accounts and no audit trail. For a real beta, use a proper identity provider and per-operator accounts.

### 13.3 Trademark and impersonation

The project is careful:

- No university signet.
- No Univers typeface.
- Bundle id `dev.demo.universityassistant`, not `uni-stuttgart.de`.
- Explicit "not a service of the University of Stuttgart" line.
- Original mark.

The remaining risk is the name "University Assistant" and the use of C@MPUS/ILIAS marks. Nominative use of the service names is generally acceptable if it does not imply endorsement. Keep the disclaimer visible in the app, the store listing, and the site. Do not use "official", "certified", or the university's logo.

### 13.4 Copyright

The app does not redistribute exam PDFs or lecture decks; it lists topics only. That is the right call. If a real ILIAS connector is added, ILIAS § 5 prohibits passing materials to third parties. Do not build a peer-sharing upload service for copyrighted course material.

### 13.5 NFC student card

The dev screen reads the card's UID, technology, and NDEF records. It does not write or upload. That is low risk, but:

- Tell the user what is read and why.
- Do not store the UID or build a card database.
- Do not clone or emulate the card.
- Check the university's card terms if the feature moves out of the dev screen.

---

## 14. Action plan

### P0 — before any beta with another person's account, or any public tunnel

| # | Action | Why | Exit criterion |
| --- | --- | --- | --- |
| 1 | Require auth on every `/v1/mail/*` route; key mail credentials by user id; stop returning the account/address in `/v1/mail/config` | Unauthenticated global mailbox = university-rules and GDPR breach | Two users cannot read each other's mailbox; `/v1/mail/config` returns only `{ configured }` |
| 2 | Remove the `.env` C@MPUS fallback for unauthenticated callers | Other people gain access through the operator's credential | `POST /v1/campus/login` without a ticket/session returns 401/409, not the operator's data |
| 3 | Bind the server to `127.0.0.1` by default; require an explicit flag for LAN/tunnel | Limits the blast radius; matches the "local-first" story | Default `npm run assistant` is not reachable from another host |
| 4 | Do not expose credential or mail routes over a tunnel | The docs already admit every route is public while the tunnel is up | Tunnel allow-list contains only the fictional assistant route |
| 5 | Disable headless autofill and the device vault until TIK/legal approve | The hidden WebView + cookie harvest is the highest-risk university-rules path | The login screen offers only the visible browser and SIAM; no stored university password |
| 6 | Stop C@MPUS scraping or get written permission | `robots.txt` is `Disallow: /`; no published API | Written TIK approval, or the feature is removed from the beta |
| 7 | Add an explicit xAI opt-in and use ZDR for any personal data; stop sending imported notes by default | xAI § 11.2 + Apple 5.1.2 | First Grok request requires a separate consent; `facts` excludes notes unless opted in |
| 8 | Add an in-app privacy policy link and account deletion | Apple 5.1.1(i), 5.1.1(v) | Both are reachable from the app's settings |
| 9 | Remove the VPN feature from the store build until the developer is an organization and the licence is resolved | Apple 5.4 + GPLv2/AGPL | Store build has no VPN engine; or organization membership + entitlement + licence opinion |

### P1 — before a funded pilot or a public launch

| # | Action |
| --- | --- |
| 10 | Write a data map and a DPIA for credentials, mail, portal rows, and the admin dashboard |
| 11 | Sign/accept DPAs with xAI, Cloudflare, Tally; record the EU transfer mechanism |
| 12 | Add end-user terms and an AUP that incorporate the xAI and university restrictions |
| 13 | Add rate limits, audit logs, TLS-only admin access, and encryption at rest for `campus-server.db` |
| 14 | Ask TIK/legal the questions in section 15 and keep the written answers |
| 15 | Use TestFlight/Ad Hoc only within the device limit; no public IPA links |
| 16 | Review the ILIAS/SDG connectors before adding them; get API/terms permission |

### P2 — nice to have

| # | Action |
| --- | --- |
| 17 | Trademark review of the app name and store metadata |
| 18 | NFC disclosure and a "do not store the UID" test |
| 19 | A public compliance page that states what is live, what is fictional, and what is beta |
| 20 | A quarterly terms review, because all of these documents change |

---

## 15. Questions to put to TIK / university legal counsel

1. Is automated, read-only access to the `slc.cm.cs` and `slc.tm.cp` endpoints through a student's own session permitted? Is automation itself the objection, or only the processing of the session by a third-party server? If automation is not permitted, is there an official API or an OIDC client for a third-party app?
2. Does a locally-run assistant server on the student's own device count as a "third party" under § 3(2)(f) of the IuK order?
3. Is a hosted server for a small beta allowed? What approvals, data-protection documentation, and security measures are required?
4. May the app reuse the st-account password for IMAP after a C@MPUS sign-in, or does that require a separate consent/flow?
5. Is the browser-harvest flow (hidden WebView fills the official form, app reads the session) acceptable, or does it fall under the UniNow warning?
6. What does § 3(2)(q) require for a student project that stores portal rows and mail on a server?
7. Are ILIAS and SDG Campus APIs available for read-only access? Under what terms?
8. Does the university allow a third-party VPN client that imports a user's own ZDI profile? Are there restrictions on distributing such a client?
9. Does the university's trademark/corporate-design policy permit the name "University Assistant" and the published colors without the signet?
10. Who is the contact for a data-protection review, and what is the expected timeline?

---

## 16. What is already good

This is not a project that ignores the issues. The repository already does several things right:

- The academic record is fictional and labelled as a demonstration.
- The university signet and Univers typeface are not embedded; the bundle id is not a `uni-stuttgart.de` id.
- The SIAM path does not collect the password in the app.
- The xAI key stays on the server; the client bundle does not contain it.
- The mail interface is the published IMAP service, and the app only writes the read flag.
- Exam PDFs and lecture decks are not redistributed.
- The privacy notice is detailed and names the main recipients.
- The Tally forms do not ask for C@MPUS passwords or tokens.
- The repository documents the C@MPUS and ILIAS limits instead of pretending they are official APIs.
- The docs already flag the platform-terms gap in `docs/funding/eligibility-and-gaps.md:86-92`.

The problem is not that the project is careless. The problem is that the beta architecture moved from "local demo" to "server-side credential handling" without a written permission or a data-protection review, and the mail routes were never locked down.

---

## 17. Sources

All URLs retrieved on 20 October 2026.

### University of Stuttgart

- IuK-Benutzungsordnung, 18 December 2006: [https://www.uni-stuttgart.de/universitaet/aktuelles/bekanntmachungen/dokumente/bekanntm_179.pdf](https://www.uni-stuttgart.de/universitaet/aktuelles/bekanntmachungen/dokumente/bekanntm_179.pdf)
- TIK, "Nutzungsbedingungen und rechtliche Informationen": [https://www.tik.uni-stuttgart.de/das-tik/nutzung](https://www.tik.uni-stuttgart.de/das-tik/nutzung)
- ILIAS, "Impressum & Nutzungsbedingungen" (status 17 March 2021): [https://ilias3.uni-stuttgart.de/go/impr/0](https://ilias3.uni-stuttgart.de/go/impr/0)
- RUS-CERT, "Nutzung der App UniNow verstößt gegen die Benutzungsordnung" (10 August 2016): [https://cert.uni-stuttgart.de/ticker/article.php?mid=1744](https://cert.uni-stuttgart.de/ticker/article.php?mid=1744)
- C@MPUS `robots.txt`: [https://campus.uni-stuttgart.de/robots.txt](https://campus.uni-stuttgart.de/robots.txt)
- C@MPUS service description: [https://www.izus.uni-stuttgart.de/itap/campus](https://www.izus.uni-stuttgart.de/itap/campus)
- TIK e-mail service / IMAP: [https://www.tik.uni-stuttgart.de/dienste-a-z/E-mail-00002](https://www.tik.uni-stuttgart.de/dienste-a-z/E-mail-00002)
- TIK VPN service: [https://www.tik.uni-stuttgart.de/dienste-a-z/VPN-Netzwerkzugang-von-unterwegs/](https://www.tik.uni-stuttgart.de/dienste-a-z/VPN-Netzwerkzugang-von-unterwegs/)
- ZDI OpenVPN page: [http://www.zdi.uni-stuttgart.de/zdi/vpn/openvpn.html](http://www.zdi.uni-stuttgart.de/zdi/vpn/openvpn.html)
- SIAM / identity management: [https://www.tik.uni-stuttgart.de/dienste-a-z/Identitaetsmanagement-00001/](https://www.tik.uni-stuttgart.de/dienste-a-z/Identitaetsmanagement-00001/)
- OIDC discovery: [https://idp.uni-stuttgart.de/.well-known/openid-configuration](https://idp.uni-stuttgart.de/.well-known/openid-configuration)
- SDG Campus at the University of Stuttgart: [https://www.zlw.uni-stuttgart.de/fuesq/sdg-campus-an-der-universitaet-stuttgart](https://www.zlw.uni-stuttgart.de/fuesq/sdg-campus-an-der-universitaet-stuttgart)
- SDG Campus terms and policies (Moodle policy pages): [https://sdg-campus.de/admin/tool/policy/viewall.php](https://sdg-campus.de/admin/tool/policy/viewall.php)
- CAMPUSonline Public REST API (vendor documentation, Client-ID required): [https://public.api.campusonline.community/public/app/public-rest-api](https://public.api.campusonline.community/public/app/public-rest-api)

### xAI

- Acceptable Use Policy, effective 14 August 2026: [https://x.ai/legal/acceptable-use-policy](https://x.ai/legal/acceptable-use-policy)
- Terms of Service — Enterprise, last updated 14 August 2026: [https://x.ai/legal/terms-of-service-enterprise](https://x.ai/legal/terms-of-service-enterprise)
- Data Processing Addendum: [https://x.ai/legal/data-processing-addendum](https://x.ai/legal/data-processing-addendum)
- Privacy policy: [https://x.ai/legal/privacy-policy](https://x.ai/legal/privacy-policy)

### Cloudflare

- Self-Serve Subscription Agreement, last updated 12 September 2025: [https://www.cloudflare.com/terms/](https://www.cloudflare.com/terms/)
- Quick Tunnels documentation: [https://developers.cloudflare.com/tunnel/get-started/quick-tunnels](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels)
- Website Terms of Use: [https://www.cloudflare.com/website-terms](https://www.cloudflare.com/website-terms)

### ngrok / Expo

- ngrok Terms of Service, last updated 2 March 2026: [https://ngrok.com/tos](https://ngrok.com/tos)
- Expo tunnel / development docs: [https://docs.expo.dev/](https://docs.expo.dev/)

### Tally

- Tally GDPR page: [https://tally.so/help/gdpr](https://tally.so/help/gdpr)
- Tally data-processing agreement: [https://tally.so/help/data-processing-agreement](https://tally.so/help/data-processing-agreement)
- Tally terms and privacy: [https://tally.so/help/terms-and-privacy](https://tally.so/help/terms-and-privacy)

### Apple

- App Review Guidelines: [https://developer.apple.com/app-store/review/guidelines/](https://developer.apple.com/app-store/review/guidelines/)
- Apple Developer Program License Agreement: [https://developer.apple.com/support/terms/apple-developer-program-license-agreement](https://developer.apple.com/support/terms/apple-developer-program-license-agreement)
- Devices overview / Ad Hoc limits: [https://developer.apple.com/help/account/devices/devices-overview](https://developer.apple.com/help/account/devices/devices-overview)
- TestFlight: [https://developer.apple.com/testflight/](https://developer.apple.com/testflight/)

### Repository evidence

- `server/mail.mjs` — global `secrets`, IMAP handling.
- `server/routes/mail.mjs` — unauthenticated mail routes.
- `server/campus.mjs` — C@MPUS REST calls, credential resolution, `.env` fallback.
- `server/routes/campus.mjs` — credential and login routes.
- `src/auth/campus-browser-scripts.ts` — autofill and harvest scripts.
- `src/auth/use-campus-browser-login.ts` — native cookie read and harvest.
- `src/auth/campus.ts` — `submitBrowserCredentials`, `signInWithCampusToken`.
- `src/auth/use-login-flow.ts` — password reuse for UniMail.
- `server/routes/assist.mjs` — xAI request.
- `app/(tabs)/chat.tsx` — automatic Grok call.
- `server/index.mjs` — `0.0.0.0` bind.
- `server/http.mjs` — CORS `*`.
- `docs/engineering/security-and-privacy.md` — the "every assistant route is public" admission.
- `docs/engineering/campus-browser-login.md` — the browser-login design and limits.
- `docs/engineering/mail.md` — the IMAP design.
- `docs/engineering/ios-distribution.md` — Apple distribution routes.
- `docs/engineering/vpn-tunnel.md` — OpenVPN licence collision.
- `docs/funding/eligibility-and-gaps.md` — the existing platform-terms gap.

---

## 18. One-sentence version

If you run the assistant server only for yourself, on your own device, with no tunnel and no `.env` credential sharing, the university-rules risk is mostly about scraping and the unauthenticated mail bug; if you host it for beta testers, the combination of harvested C@MPUS sessions, the operator `.env` fallback, server-side IMAP passwords, and a public tunnel is the exact pattern the University of Stuttgart has already called a violation.
