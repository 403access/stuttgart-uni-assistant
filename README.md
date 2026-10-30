# University Assistant

A study assistant for students at the University of Stuttgart. The app brings the timetable, degree progress, course material, campus orientation, and peer notes into one Expo app, and answers questions about that record in German or English.

This repository is a student demonstration. It is not a service of the University of Stuttgart, and it does not use the university logo. Sign-in can open the university identity provider (the same OpenID Connect login that C@MPUS uses). The timetable, grades, ILIAS files, and SDG Campus data in the app are still the fictional record of Lena Hartmann. The password is typed only on the university page.

## Status, licence, and generative AI

**Status.** This is a student demonstration, not a service of the University of Stuttgart. It does not use the university signet or the Univers typeface, and its bundle id is `dev.demo.universityassistant`, not a `uni-stuttgart.de` id. The academic record is fictional (see [docs/00-product-description.md](docs/00-product-description.md)). An analysis of grant options and an application plan are under [docs/funding/](docs/funding/README.md).

**Licence.** Unless a file says otherwise, this project is licensed under the **GNU Affero General Public License, version 3 or later** (see [LICENSE](LICENSE)). Copyright (C) 2026 Oliver Molnar. Contributions are accepted under the same licence; see [CONTRIBUTING.md](CONTRIBUTING.md).

**Generative AI.** Parts of this codebase were written with AI coding assistants, and the project says so. AI is also a runtime feature: when an xAI key is set, the assistant server may rewrite answers through Grok, opt-in and with `store: false`. The design, the domain model, the credit rules in `apps/mobile/src/domain/plan.ts`, the privacy boundary and the tests are human-authored and accountable. Contributors mark generated code in their commit messages; see [CONTRIBUTING.md](CONTRIBUTING.md).

**Service terms.** A service-by-service review of the university's IuK/C@MPUS/ILIAS/SIAM/UniMail rules, xAI, Cloudflare, ngrok, Tally, Apple, and the OpenVPN licence is in [docs/legal/terms-review.md](docs/legal/terms-review.md). It is a compliance review, not legal advice.

## Run the app

Requirements: Node.js 22 or newer.

```bash
cd stuttgart-uni-assistant
bun install
bunx expo start
```

Then open the project in Expo Go, an iOS simulator, an Android emulator, or the browser:

```bash
bun run web
bun run ios
bun run android
bun run tunnel   # from another network; the assistant needs its own tunnel too
```

The web build has exactly one sign-in path: the browser shows a QR code, and the already signed-in mobile app approves it under **Einstellungen → Gerät verknüpfen**. The code is valid for ten minutes and can be redeemed once. The web never repeats onboarding: the phone's completion, language, theme, and design choice travel through `/v1/auth/preferences`, and the server's campus snapshots supply the timetable, courses, calendar, and mail. On the native sign-in screen, **Mit C@MPUS-Token anmelden** loads the curriculum structure through the assistant server. The `.env` bearer token and `PSESSIONID` cookie stay on the server; a browser sign-in keeps that user's harvested session on the server too, never in the app bundle. **C@MPUS öffnen und anmelden** opens the official campus login. Use the account and password you already have. The app does not need to be registered for that, and the password is typed only on the university page. **Mit dieser Nutzerkennung weiter** labels the profile with your account id and does not check a password. **Mit SIAM anmelden** is the registered OpenID Connect client, documented in [docs/engineering/oidc-login.md](docs/engineering/oidc-login.md). **Demonstrationsprofil öffnen** loads Lena Hartmann. Any path that reaches the server creates one user record and one session; **Campus → Konto** shows C@MPUS, ILIAS, SDG Campus, SIAM, and UniMail as links on that account, per [docs/engineering/accounts.md](docs/engineering/accounts.md). C@MPUS credentials and every portal row are scoped to that user, so two accounts on one server do not share a timetable or a portal session. **Mehr → Schnittstelle** lists the server routes and can send them again. The request and the stored nodes are documented in [docs/engineering/campus-curriculum.md](docs/engineering/campus-curriculum.md), and the study chooser in [docs/engineering/campus-studies.md](docs/engineering/campus-studies.md).

On a device with an enrolled fingerprint or face, the first successful sign-in opens a one-page onboarding before the tabs. It offers a biometric App Lock for launch and return from the background, and the same switch lives under **Campus → Sicherheit**. The flow is documented in [docs/engineering/onboarding.md](docs/engineering/onboarding.md). Face ID needs a development build; Expo Go cannot test it on iOS.

## Run the assistant server

The chat and the document tools answer from the on-device record immediately. When the server below is running and `XAI_API_KEY` is set, those answers are rewritten by Grok (`grok-4.7`) through the xAI Responses API. The key stays in the server process.

```bash
cp .env.example .env
# put your key in XAI_API_KEY
bun run assistant
```

The app reads `EXPO_PUBLIC_ASSISTANT_URL`, which defaults to `http://127.0.0.1:8787`. On a physical phone, use the computer's LAN address instead of `127.0.0.1`. `bun run assistant:tunnel` writes the public hostname of a running tunnel to `EXPO_PUBLIC_ASSISTANT_TUNNEL_URL`, which takes priority while it is set, and blanks it again when the tunnel stops — so a local run never inherits a dead tunnel URL. `GET /health` is on that assistant server, for example `http://127.0.0.1:8787/health`. The Expo app on port 8081 does not serve `/health`.

`GET /health` reports whether an xAI key is configured, whether the OIDC client is set, and whether `CAMPUS_BEARER_TOKEN` and `CAMPUS_SESSION_COOKIE` are set. It does not return either secret. `GET /v1/api` lists the implemented routes. Without an xAI key the server returns 503 for `/v1/assist` and the app keeps the local answer. The university password is not a variable in `.env`.

The assistant server also hosts an operator dashboard at `http://127.0.0.1:8787/admin`. Set `DASHBOARD_TOKEN` in `.env` to enable it; without the token the page and every `/v1/admin/*` route stay disabled. The dashboard lists and explores users, sessions, browser device links, platform links, C@MPUS curriculum/course/calendar/call data, the generated component catalog (including which components have live previews and links to them), audit history, persisted service logs, and system health, and can create, edit, revoke, disconnect, clear, start or cancel syncs, export CSV, or delete. Details: [docs/engineering/admin-dashboard.md](docs/engineering/admin-dashboard.md).

When the phone is not on the local network, Expo's tunnel carries the bundle but not the assistant, so the assistant needs a tunnel of its own. Run the three processes in this order, because `EXPO_PUBLIC_*` is read at bundle time:

```bash
bun run assistant         # assistant on 127.0.0.1:8787
bun run assistant:tunnel  # Cloudflare hostname, written into EXPO_PUBLIC_ASSISTANT_TUNNEL_URL
bun run tunnel            # Expo with --tunnel
```

The `trycloudflare.com` hostname changes on every run, so restart Expo whenever it does. `bun run assistant:tunnel -- --help` prints the options, and [docs/engineering/assistant-tunnel.md](docs/engineering/assistant-tunnel.md) has the details and the security caveats.

Write the C@MPUS secrets without editing the file by hand. `bun run campus:token -- <token>` sets `CAMPUS_BEARER_TOKEN` and `bun run campus:session -- <value>` sets `CAMPUS_SESSION_COOKIE` in the git-ignored `.env`. A pasted `Bearer <token>` header, an `Authorization:` line, or a full `PSESSIONID=...; ...` cookie string is reduced to the bare value. Omit the value to type it without echoing, or pipe it with `echo "$TOKEN" | bun run campus:token`. `bun run campus:secret -- list` shows which values are set, masked. Restart `bun run assistant` after a change.

ILIAS has no student JSON API, so the server signs in through the standard HTTPS form and parses the dashboard. The ILIAS password is the same as the C@MPUS password; ILIAS expects only the part of the address before the `@` (`st206509@stud.uni-stuttgart.de` → `st206509`). Test the flow from the terminal before changing the app:

```bash
bun run ilias:login -- --probe
bun run ilias:login -- --user st206509 --password-stdin
bun run ilias:login -- --cookie "$ILIAS_SESSION_COOKIE"
```

The password is used for the single login POST and never stored; a successful run keeps only `PHPSESSID` in server memory. The login response hands that cookie to the signed-in app, which seeds it into a hidden WebView and reads the dashboard and course pages there. The server only parses and caches the harvested HTML (`POST /v1/ilias/ingest`), so its work does not grow with the number of active users. In the app, the **ILIAS** tab shows courses, groups, news, the ILIAS mailbox, and to-dos. A C@MPUS sign-in through the automated login also connects ILIAS in the background with the same password and the address before the `@` as the login name. If the opt-in C@MPUS credential is in the device vault, the tab reconnects with it whenever the server-side session is gone — on first view or after returning to the foreground — so a server restart (which drops the in-memory `PHPSESSID`) does not ask for the password again. The operator dashboard has a matching **ILIAS** page and a per-account tab. `ILIAS_SESSION_COOKIE` and `ILIAS_ACCOUNT` in `.env` let the operator reuse one session without the app.

## Checks

```bash
bun run typecheck
bun run check
```

`bun run check` asserts the 180 ECTS demonstration curriculum, the next-semester suggestion, and several German answers (credits, cafeteria, exam registration, Tuesday's lecture, a locked module, a slide summary). It also verifies that the generated component catalog, docs page, and admin asset are current, runs the server tests, and runs the secrets CLI tests (`tools/set-campus-secret.test.mjs`), which exercise the token and session updater against a throwaway `.env` copy and assert the real one is never touched.

## Generate quiz content from PDFs

Quiz topics can be generated from lecture PDFs and attached to an existing module. The command reads embedded PDF text, asks xAI for a validated bilingual topic (it needs `XAI_API_KEY`), and writes TypeScript under `packages/quiz-content/src/content/generated/`:

```bash
bun run quiz:from-pdf --module prag ./sitzung-2.pdf
bun run quiz:from-pdf --module phil ./pdfs/ --questions 12 --dry-run
```

Scanned PDFs need OCR first. `--dry-run` prints the topic without writing; `--force` replaces an existing generated topic. After changing quiz content, export the server snapshot with `bun run quiz:export-catalog`; the assistant seeds its quiz tables from it on first start, and the admin dashboard can re-import it under **Lernquiz**. The full options, validation rules, and review checklist are in [docs/engineering/quiz.md](docs/engineering/quiz.md).

## Where things live

| Path | What it is |
| --- | --- |
| `apps/mobile/app/` | Expo Router screens |
| `apps/site/` | Static website for the app (plain HTML, CSS, JS; `bun run site`) |
| `packages/core/src/data/` | Demonstration curriculum, places, people, deadlines, documents |
| `packages/core/src/domain/plan.ts` | Credit totals, prerequisites, next-semester suggestion |
| `apps/mobile/src/components/catalog.generated.ts` | Generated component inventory for **Dev → Komponenten**, the admin dashboard's **Komponenten** view, and [the docs page](docs/engineering/component-catalog.md); regenerate with `bun run catalog:components` |
| `packages/core/src/assistant/` | Local answers, fact sheet, optional Grok call |
| `packages/core/src/state/` | TanStack Store shape, persisted state, and pure actions |
| `apps/mobile/src/state/AppState.tsx` | Provider that binds the store to the app and Async Storage |
| `apps/mobile/src/onboarding/` | First-run completion and the biometric app-lock preference |
| `apps/mobile/src/auth/biometrics.ts` | Device biometric availability and the system prompt |
| `apps/mobile/src/auth/session.ts` | The server user session: token storage and the `/v1/auth/*` calls |
| `apps/server/auth.mjs` | Server-side users, bearer sessions, and platform links |
| `apps/mobile/app/api.tsx` | API overview. Replays known server routes |
| `apps/admin/` | React + Vite operator dashboard; built to `apps/admin/dist` and served at `/admin` |
| `apps/server/index.mjs` | Assistant server entry point. Loads `.env`, owns the listener, and dispatches to `apps/server/routes/` |
| `apps/server/routes/` | Route modules for admin, health, auth, mail, C@MPUS, OIDC, and the Grok rewrite |
| `packages/` | Shared workspace packages: `core`, `contracts`, `format`, `design-tokens`, `api-client`, `ui`, `ui-react`, `server-kit`, `quiz-content`, and `features/*` |
| `tools/quiz-from-pdf.ts` | Builds quiz topics from PDF handouts; see [docs/engineering/quiz.md](docs/engineering/quiz.md) |
| `packages/quiz-content/src/articulation.ts` | Sounds and poses for the articulation studio, the quiz's 2D/3D learning tool; see [docs/engineering/quiz.md](docs/engineering/quiz.md#articulation-studio) |
| `tools/tunnel-assistant.mjs` | Cloudflare quick tunnel for the assistant; writes `EXPO_PUBLIC_ASSISTANT_TUNNEL_URL` and clears it on exit |
| `tools/set-campus-secret.mjs` | Writes `CAMPUS_BEARER_TOKEN` or `CAMPUS_SESSION_COOKIE` into `.env` |
| `docs/` | Product description, engineering notes, and the lifecycle write-up |

## Documentation

Start with [docs/README.md](docs/README.md). The original product description is [docs/00-product-description.md](docs/00-product-description.md). The lifecycle, from initiation through maintenance, is under [docs/sdlc/](docs/sdlc/00-overview.md). Funding options, eligibility and an application plan are under [docs/funding/](docs/funding/README.md).

The accepted target architecture — a modular monorepo with shared packages for the app, admin dashboard, distribution service, site, and server — is documented under [docs/engineering/modularization/](docs/engineering/modularization/README.md). The migration is implemented; the React admin is the default build when `apps/admin/dist` exists.

## Palette

The interface uses the university's published corporate colors: anthracite `#323232`, mid blue `#004191`, and light blue `#00BEFF`, on a white and mist ground. The mark is an original pair of circles, not the university signet. The licensed Univers typeface is not embedded. The app uses the platform UI font.
