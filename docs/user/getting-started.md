# Getting started

## Run the app

On your computer:

```bash
npm install
npx expo start
```

Open the project in Expo Go, an iOS simulator, an Android emulator, or the browser. On a real phone, scan the QR code from the dev server. The phone and the computer need to be on the same network, because the app talks to the assistant server on the computer.

If you are on mobile data or another network, start Expo with `npm run tunnel` and put the assistant behind a tunnel of its own with `npm run assistant:tunnel`. Expo may start only after that, because the public address is baked into the app. The commands and the caveats are in [assistant-tunnel.md](../engineering/assistant-tunnel.md).

If you also want live C@MPUS data and e-mail, start the assistant server first:

```bash
cp .env.example .env
npm run assistant
```

`GET /health` on `http://127.0.0.1:8787/health` tells you what the server can do right now: whether an xAI key is set for chat rewrites, whether the OIDC client is configured, and whether C@MPUS tokens are present.

## Sign in

The sign-in screen groups the paths by what they check.

**Existing account, no registration:**

| Button | What happens |
| --- | --- |
| **Mit C@MPUS-Token anmelden** | The local server reads the curriculum root of your enrolled studies with the bearer token and the `PSESSIONID` cookie from `.env`. Your name and studies come from C@MPUS. The app never shows a token field; the token stays on the server. |
| **Im C@MPUS-Browser anmelden (Beta)** | An in-app browser opens the official C@MPUS login. You type the password on the university page only. The app picks up the signed-in session after you finish and loads your studies. Marked beta: if anything fails, use the token path or a fallback below. |
| **C@MPUS öffnen und anmelden** | Opens `https://campus.uni-stuttgart.de` in the system browser. Nothing is harvested or stored; use the official site and come back. |

**Account id for this app:**

| Button | What happens |
| --- | --- |
| **Mit dieser Nutzerkennung weiter** | Stores your account id, for example `st123456`, on the device. The password is not asked for and not checked. The study record stays the demonstration profile. |

**Registered SIAM client:**

| Button | What happens |
| --- | --- |
| **Mit SIAM anmelden** | The registered OpenID Connect client. The browser opens the university identity provider, the app receives only what the client is registered for. |

**Demonstration:**

| Button | What happens |
| --- | --- |
| **Demonstrationsprofil öffnen** | Loads the fictional student Lena Hartmann. Every bundled feature works on this record with no server and no university account. |

Any path signs you in. The demonstration profile needs nothing; the token, browser, and SIAM paths expect the assistant server to be running.

## First minutes

1. Pick the language in **Einstellungen (Settings)**. German is the default, English switches every bundled string immediately.
2. On **Heute (Today)** you see credits, today's sessions, and the next deadlines. On the demonstration profile these are Lena's numbers.
3. The five tabs at the bottom are **Heute (Today)**, **Kalender (Calendar)**, **Chat**, **Nachrichten (Messages)**, **Campus**. Everything else is reached from the last tab.
4. Your profile lives under **Campus** at the top: name, account, and — with a C@MPUS session — the study selector for switching between enrolled studies.

## Sign out and switch profile

**Campus → Einstellungen** has sign-out. Signing out clears the session and returns to the sign-in screen. Language stays as you set it.
