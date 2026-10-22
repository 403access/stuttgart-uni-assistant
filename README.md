# University Assistant

A study assistant for students at the University of Stuttgart. The app brings the timetable, degree progress, course material, campus orientation, and peer notes into one Expo app, and answers questions about that record in German or English.

This repository is a student demonstration. It is not a service of the University of Stuttgart, and it does not use the university logo. Sign-in can open the university identity provider (the same OpenID Connect login that C@MPUS uses). The timetable, grades, ILIAS files, and SDG Campus data in the app are still the fictional record of Lena Hartmann. The password is typed only on the university page.

## Status, licence, and generative AI

**Status.** This is a student demonstration, not a service of the University of Stuttgart. It does not use the university signet or the Univers typeface, and its bundle id is `dev.demo.universityassistant`, not a `uni-stuttgart.de` id. The academic record is fictional (see [docs/00-product-description.md](docs/00-product-description.md)). An analysis of grant options and an application plan are under [docs/funding/](docs/funding/README.md).

**Licence.** Unless a file says otherwise, this project is licensed under the **GNU Affero General Public License, version 3 or later** (see [LICENSE](LICENSE)). Copyright (C) 2026 Oliver Molnar. Contributions are accepted under the same licence; see [CONTRIBUTING.md](CONTRIBUTING.md).

**Generative AI.** Parts of this codebase were written with AI coding assistants, and the project says so. AI is also a runtime feature: when an xAI key is set, the assistant server may rewrite answers through Grok, opt-in and with `store: false`. The design, the domain model, the credit rules in `src/domain/plan.ts`, the privacy boundary and the tests are human-authored and accountable. Contributors mark generated code in their commit messages; see [CONTRIBUTING.md](CONTRIBUTING.md).

**Service terms.** A service-by-service review of the university's IuK/C@MPUS/ILIAS/SIAM/UniMail rules, xAI, Cloudflare, ngrok, Tally, Apple, and the OpenVPN licence is in [docs/legal/terms-review.md](docs/legal/terms-review.md). It is a compliance review, not legal advice.

## Run the app

Requirements: Node.js 22 or newer.

```bash
cd stuttgart-uni-assistant
npm install
npx expo start
```

Then open the project in Expo Go, an iOS simulator, an Android emulator, or the browser:

```bash
npm run web
npm run ios
npm run android
npm run tunnel   # from another network; the assistant needs its own tunnel too
```

The web build has exactly one sign-in path: the browser shows a QR code, and the already signed-in mobile app approves it under **Einstellungen → Gerät verknüpfen**. The code is valid for ten minutes and can be redeemed once. The web never repeats onboarding: the phone's completion, language, theme, and design choice travel through `/v1/auth/preferences`, and the server's campus snapshots supply the timetable, courses, calendar, and mail. On the native sign-in screen, **Mit C@MPUS-Token anmelden** loads the curriculum structure through the assistant server. The `.env` bearer token and `PSESSIONID` cookie stay on the server; a browser sign-in keeps that user's harvested session on the server too, never in the app bundle. **C@MPUS öffnen und anmelden** opens the official campus login. Use the account and password you already have. The app does not need to be registered for that, and the password is typed only on the university page. **Mit dieser Nutzerkennung weiter** labels the profile with your account id and does not check a password. **Mit SIAM anmelden** is the registered OpenID Connect client, documented in [docs/engineering/oidc-login.md](docs/engineering/oidc-login.md). **Demonstrationsprofil öffnen** loads Lena Hartmann. Any path that reaches the server creates one user record and one session; **Campus → Konto** shows C@MPUS, ILIAS, SDG Campus, SIAM, and UniMail as links on that account, per [docs/engineering/accounts.md](docs/engineering/accounts.md). C@MPUS credentials and every portal row are scoped to that user, so two accounts on one server do not share a timetable or a portal session. **Mehr → Schnittstelle** lists the server routes and can send them again. The request and the stored nodes are documented in [docs/engineering/campus-curriculum.md](docs/engineering/campus-curriculum.md), and the study chooser in [docs/engineering/campus-studies.md](docs/engineering/campus-studies.md).

On a device with an enrolled fingerprint or face, the first successful sign-in opens a one-page onboarding before the tabs. It offers a biometric App Lock for launch and return from the background, and the same switch lives under **Campus → Sicherheit**. The flow is documented in [docs/engineering/onboarding.md](docs/engineering/onboarding.md). Face ID needs a development build; Expo Go cannot test it on iOS.

## Run the assistant server

The chat and the document tools answer from the on-device record immediately. When the server below is running and `XAI_API_KEY` is set, those answers are rewritten by Grok (`grok-4.7`) through the xAI Responses API. The key stays in the server process.

```bash
cp .env.example .env
# put your key in XAI_API_KEY
npm run assistant
```

The app reads `EXPO_PUBLIC_ASSISTANT_URL`, which defaults to `http://127.0.0.1:8787`. On a physical phone, use the computer's LAN address instead of `127.0.0.1`. `npm run assistant:tunnel` writes the public hostname of a running tunnel to `EXPO_PUBLIC_ASSISTANT_TUNNEL_URL`, which takes priority while it is set, and blanks it again when the tunnel stops — so a local run never inherits a dead tunnel URL. `GET /health` is on that assistant server, for example `http://127.0.0.1:8787/health`. The Expo app on port 8081 does not serve `/health`.

`GET /health` reports whether an xAI key is configured, whether the OIDC client is set, and whether `CAMPUS_BEARER_TOKEN` and `CAMPUS_SESSION_COOKIE` are set. It does not return either secret. `GET /v1/api` lists the implemented routes. Without an xAI key the server returns 503 for `/v1/assist` and the app keeps the local answer. The university password is not a variable in `.env`.

The assistant server also hosts an operator dashboard at `http://127.0.0.1:8787/admin`. Set `DASHBOARD_TOKEN` in `.env` to enable it; without the token the page and every `/v1/admin/*` route stay disabled. The dashboard lists and explores users, sessions, browser device links, platform links, C@MPUS curriculum/course/calendar/call data, audit history, persisted service logs, and system health, and can create, edit, revoke, disconnect, clear, start or cancel syncs, export CSV, or delete. Details: [docs/engineering/admin-dashboard.md](docs/engineering/admin-dashboard.md).

When the phone is not on the local network, Expo's tunnel carries the bundle but not the assistant, so the assistant needs a tunnel of its own. Run the three processes in this order, because `EXPO_PUBLIC_*` is read at bundle time:

```bash
npm run assistant         # assistant on 127.0.0.1:8787
npm run assistant:tunnel  # Cloudflare hostname, written into EXPO_PUBLIC_ASSISTANT_TUNNEL_URL
npm run tunnel            # Expo with --tunnel
```

The `trycloudflare.com` hostname changes on every run, so restart Expo whenever it does. `npm run assistant:tunnel -- --help` prints the options, and [docs/engineering/assistant-tunnel.md](docs/engineering/assistant-tunnel.md) has the details and the security caveats.

Write the C@MPUS secrets without editing the file by hand. `npm run campus:token -- <token>` sets `CAMPUS_BEARER_TOKEN` and `npm run campus:session -- <value>` sets `CAMPUS_SESSION_COOKIE` in the git-ignored `.env`. A pasted `Bearer <token>` header, an `Authorization:` line, or a full `PSESSIONID=...; ...` cookie string is reduced to the bare value. Omit the value to type it without echoing, or pipe it with `echo "$TOKEN" | npm run campus:token`. `npm run campus:secret -- list` shows which values are set, masked. Restart `npm run assistant` after a change.

ILIAS has no student JSON API, so the server signs in through the standard HTTPS form and parses the dashboard. The ILIAS password is the same as the C@MPUS password; ILIAS expects only the part of the address before the `@` (`st206509@stud.uni-stuttgart.de` → `st206509`). Test the flow from the terminal before changing the app:

```bash
npm run ilias:login -- --probe
npm run ilias:login -- --user st206509 --password-stdin
npm run ilias:login -- --cookie "$ILIAS_SESSION_COOKIE"
```

The password is used for the single login POST and never stored; a successful run keeps only `PHPSESSID` in server memory. In the app, the **ILIAS** tab shows courses, groups, news, the ILIAS mailbox, and to-dos. A C@MPUS sign-in through the automated login also connects ILIAS in the background with the same password and the address before the `@` as the login name. If the opt-in C@MPUS credential is in the device vault, the tab reconnects with it once per app session, so a server restart (which drops the in-memory `PHPSESSID`) does not ask for the password again. The operator dashboard has a matching **ILIAS** page and a per-account tab. `ILIAS_SESSION_COOKIE` and `ILIAS_ACCOUNT` in `.env` let the operator reuse one session without the app.

## Checks

```bash
npm run typecheck
npm run check
```

`npm run check` asserts the 180 ECTS demonstration curriculum, the next-semester suggestion, and several German answers (credits, cafeteria, exam registration, Tuesday's lecture, a locked module, a slide summary). It also runs the server tests and the secrets CLI tests (`scripts/set-campus-secret.test.mjs`), which exercise the token and session updater against a throwaway `.env` copy and assert the real one is never touched.

## Generate quiz content from PDFs

Quiz topics can be generated from lecture PDFs and attached to an existing module. The command reads embedded PDF text, asks xAI for a validated bilingual topic (it needs `XAI_API_KEY`), and writes TypeScript under `src/quiz/content/generated/`:

```bash
bun run quiz:from-pdf --module prag ./sitzung-2.pdf
bun run quiz:from-pdf --module phil ./pdfs/ --questions 12 --dry-run
```

Scanned PDFs need OCR first. `--dry-run` prints the topic without writing; `--force` replaces an existing generated topic. The full options, validation rules, and review checklist are in [docs/engineering/quiz.md](docs/engineering/quiz.md).

## Where things live

| Path | What it is |
| --- | --- |
| `app/` | Expo Router screens |
| `site/` | Static website for the app (plain HTML, CSS, JS; `npm run site`) |
| `src/data/` | Demonstration curriculum, places, people, deadlines, documents |
| `src/domain/plan.ts` | Credit totals, prerequisites, next-semester suggestion |
| `src/assistant/` | Local answers, fact sheet, optional Grok call |
| `src/state/AppState.tsx` | TanStack Store: session, language, curriculum selection, notes, and chat, stored on the device |
| `src/onboarding/` | First-run completion and the biometric app-lock preference |
| `src/auth/biometrics.ts` | Device biometric availability and the system prompt |
| `src/auth/session.ts` | The server user session: token storage and the `/v1/auth/*` calls |
| `server/auth.mjs` | Server-side users, bearer sessions, and platform links |
| `app/api.tsx` | API overview. Replays known server routes |
| `server/index.mjs` | Assistant server entry point. Loads `.env`, owns the listener, and dispatches to `server/routes/` |
| `server/routes/` | Route modules for admin, health, auth, mail, C@MPUS, OIDC, and the Grok rewrite |
| `scripts/quiz-from-pdf.ts` | Builds quiz topics from PDF handouts; see [docs/engineering/quiz.md](docs/engineering/quiz.md) |
| `scripts/tunnel-assistant.mjs` | Cloudflare quick tunnel for the assistant; writes `EXPO_PUBLIC_ASSISTANT_TUNNEL_URL` and clears it on exit |
| `scripts/set-campus-secret.mjs` | Writes `CAMPUS_BEARER_TOKEN` or `CAMPUS_SESSION_COOKIE` into `.env` |
| `docs/` | Product description, engineering notes, and the lifecycle write-up |

## Documentation

Start with [docs/README.md](docs/README.md). The original product description is [docs/00-product-description.md](docs/00-product-description.md). The lifecycle, from initiation through maintenance, is under [docs/sdlc/](docs/sdlc/00-overview.md). Funding options, eligibility and an application plan are under [docs/funding/](docs/funding/README.md).

## Palette

The interface uses the university's published corporate colors: anthracite `#323232`, mid blue `#004191`, and light blue `#00BEFF`, on a white and mist ground. The mark is an original pair of circles, not the university signet. The licensed Univers typeface is not embedded. The app uses the platform UI font.
