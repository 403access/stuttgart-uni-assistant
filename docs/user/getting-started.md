# Getting started

## Run the app

On your computer:

```bash
npm install
npx expo start
```

Open the project in Expo Go, an iOS simulator, an Android emulator, or the browser. On a real phone, scan the QR code from the dev server. The phone and the computer need to be on the same network, because the app talks to the assistant server on the computer.

The biometrics page and App Lock use `expo-local-authentication`, which is native code. Face ID does not work in Expo Go on iOS. Use a development build (`npx expo run:ios`, `npx expo run:android`, or an EAS development build) and rebuild after changing native modules; reloading only the JavaScript bundle is not enough.

If you are on mobile data or another network, start Expo with `npm run tunnel` and put the assistant behind a tunnel of its own with `npm run assistant:tunnel`. Expo may start only after that, because the public address is baked into the app. The commands and the caveats are in [assistant-tunnel.md](../engineering/assistant-tunnel.md).

If you also want live C@MPUS data and e-mail, start the assistant server first:

```bash
cp .env.example .env
npm run assistant
```

`GET /health` on `http://127.0.0.1:8787/health` tells you what the server can do right now: whether an xAI key is set for chat rewrites, whether the OIDC client is configured, and whether C@MPUS tokens are present.

## Sign in

The screen that greets you once the splash screen lifts offers the automated
**Mit C@MPUS anmelden** path and nothing else: you type the account id and the
password, a hidden browser fills the official C@MPUS form, and the app adopts
the session. With **Mit Biometrie schützen** the credential kept in the device
vault (iOS keychain / Android Keystore) is unlocked with biometrics; it is
deleted when you sign out. The same st-account and password are also used to
connect UniMail on the assistant server, so your Messages tab is ready without a
second entry. A loading indicator names the phase while the profile and
curriculum load.

The C@MPUS portal session is kept for your account on the assistant server, not
for the whole server. Another student signing in on the same server gets a
separate account, credential, and curriculum. After a server restart the
browser session is gone and the account has to connect C@MPUS again; `.env`
credentials survive because they stay in the environment. See
[accounts.md](../engineering/accounts.md).

The other paths still work but have moved to the deprecated `/login-legacy`
screen, which the start screen no longer links to:

| Button | What happens |
| --- | --- |
| **Automatisch anmelden** | The same automated sign-in as the start screen, with the store-on-device switch. |
| **Mit C@MPUS-Token anmelden** | The local server reads the curriculum root of your enrolled studies with the bearer token and the `PSESSIONID` cookie from `.env`. Your name and studies come from C@MPUS. The app never shows a token field; the token stays on the server. |
| **Im C@MPUS-Browser anmelden (Beta)** | An in-app browser opens the official C@MPUS login. You type the password on the university page only. The app picks up the signed-in session after you finish and loads your studies. |
| **C@MPUS öffnen und anmelden** | Opens `https://campus.uni-stuttgart.de` in the system browser. Nothing is harvested or stored; use the official site and come back. |
| **Mit dieser Nutzerkennung weiter** | Stores your account id, for example `st123456`, on the device. The password is not asked for and not checked. The study record stays the demonstration profile. |
| **Mit SIAM anmelden** | The registered OpenID Connect client. The browser opens the university identity provider, the app receives only what the client is registered for. |
| **Demonstrationsprofil öffnen** | Loads the fictional student Lena Hartmann. Every bundled feature works on this record with no server and no university account. |

Any path signs you in. The demonstration profile needs nothing; the token, browser, and SIAM paths expect the assistant server to be running.

## First-run onboarding

After a successful sign-in on a device with a fingerprint or face enrolled, the
app shows a one-page setup screen before the tabs. It asks whether to enable
biometrics for unlocking the app. The page is skipped when the device has no
biometric hardware or no enrolled fingerprint/face.

| Action | What happens |
| --- | --- |
| **Biometrie aktivieren** | The system Face ID / fingerprint prompt opens. After success, the app asks for that confirmation on launch and when it returns from the background. |
| **Nicht jetzt** | The flow closes without enabling the lock. The same switch can be turned on later in **Campus → Sicherheit**. |
| **Abbrechen** in the system prompt | Nothing is enabled. Dismissing the prompt or denying Face ID counts as a decline, so the flow closes like **Nicht jetzt**; the switch remains available in Settings. |

The completion record belongs to this installation, not to one account. Signing
out and signing in again does not replay onboarding, and resetting local data
does not delete it. If biometrics are not available at first launch, the flow is
not marked complete; enrolling a fingerprint or face later can bring the page
back on the next launch. The web build skips the page because it does not use a
browser biometric API.

## First minutes

1. Pick the language in **Einstellungen (Settings)**. German is the default, English switches every bundled string immediately.
2. On **Heute (Today)** you see credits, today's sessions, and the next deadlines. On the demonstration profile these are Lena's numbers.
3. The five tabs at the bottom are **Heute (Today)**, **Kalender (Calendar)**, **Chat**, **Nachrichten (Messages)**, **Campus**. Everything else is reached from the last tab.
4. Your profile lives under **Campus** at the top: name, account, and — with a C@MPUS session — the study selector for switching between enrolled studies.
5. **Campus → Konto** is one account for C@MPUS, ILIAS, SDG Campus, SIAM, and UniMail. It shows what is connected (a live session or credential) and what is only linked through the same identity, and each row carries the action that fits: open C@MPUS, sync ILIAS or SDG Campus, or enter UniMail. See [accounts.md](../engineering/accounts.md).

## Sign out and switch profile

**Campus → Konto → Abmelden** (or the sign-out row in Campus) revokes the server session, deletes the session token and the stored C@MPUS password from this device, and returns to the sign-in screen. The server keeps the user and its platform links, so signing in again with the same account finds them. Language stays as you set it.
