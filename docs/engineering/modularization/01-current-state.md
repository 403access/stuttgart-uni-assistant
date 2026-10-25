# Current state

This is the evidence base for the restructuring proposal. It describes the repository as it is, not as it should be.

Baseline: `main` at `d147414`, plus the in-progress quiz catalog and quiz-sync work in the working tree (`server/quiz/`, `server/routes/quiz.mjs`, `server/routes/admin/quiz.mjs`, `server/dashboard/pages/quiz.mjs`, `scripts/export-quiz-catalog.ts`, `src/quiz/catalog-*.ts`, `src/quiz/remote.ts`, and the app quiz screens). The uncommitted work does not change the analysis; it adds one more example of a code generator and a shared catalog crossing app and server.

## 1. What ships today

The repository contains six runnable surfaces and one native module. They share a repository and a lockfile, but almost no runtime code.

| Surface | Where it lives | Runtime | Deployment |
| --- | --- | --- | --- |
| Mobile app (iOS, Android, web) | `app/`, `src/`, `assets/`, `app.json`, `plugins/` | Expo SDK 58, React Native 0.88, React 19.3, React Native Web | EAS build, Expo web export, dev server |
| Assistant server | `server/` | Node 22+, plain ESM, no npm dependencies | `node server/index.mjs`, optional tunnel |
| Operator dashboard | `server/dashboard/` | Browser ES modules, no build step | Served by the assistant server at `/admin` |
| Distribution service | `dist-service/` | Node 22+, plain ESM, no npm dependencies | Standalone host, own port, own SQLite, own data directory |
| Marketing and legal site | `site/` | Static HTML, CSS, JS | GitHub Pages, composed with the docs |
| Documentation site | `docs-site/` | Docusaurus 3.10 | GitHub Pages, renders `docs/` |
| Local Expo module | `modules/university-vpn/` | Kotlin + Swift, no `package.json` | Autolinked from the app project's `modules/` directory |

The native folders `ios/` and `android/`, the Expo web export `dist/`, the SQLite databases, and the distribution data directory are git-ignored. That part of the hygiene is correct.

## 2. Size and shape

| Area | Files | Lines | Notes |
| --- | ---: | ---: | --- |
| `app/` | 63 `.tsx` | 12,667 | Expo Router screens only |
| `src/` | 247 `.ts`/`.tsx` | 38,348 | Excludes the generated component catalog (12,349 lines) |
| `server/` | 116 `.mjs` | 20,492 | Server core 11,711; dashboard 5,092; tests 3,689 |
| `scripts/` | 48 `.mjs`/`.ts` | 9,460 | Non-test tools 6,863; tests 2,597 |
| `dist-service/` | 5 `.mjs` | 938 | Includes a 274-line test |
| `site/` | 7 files | 3,235 | Plain HTML, CSS, JS |
| `docs/` | 70 Markdown files | — | Canonical documentation |
| Generated catalog | 3 files | 25,620 | `src/components/catalog.generated.ts`, `server/dashboard/assets/component-catalog.mjs`, `docs/engineering/component-catalog.md` |

A fifth of `src/` is quiz content, figures, and maps (8,844 lines across 24 files). The code is not uniformly complex: the repository is large because it carries a lot of data and a large generated inventory.

## 3. Runtime dependency graph

The important property is that the runnable surfaces are already isolated. There is no runtime import from the app to the server, from the server to the app, or from either to the distribution service.

```text
app/  ──> src/  ──> React Native, Expo, TanStack
  │
  └── no imports from server/, dist-service/, site/, docs/

server/ ──> server/** only ──> Node built-ins
  └── serves server/dashboard/** as static browser modules

dist-service/ ──> dist-service/** only ──> Node built-ins

site/ ──> no imports

docs-site/ ──> ../docs (Markdown)
```

The exceptions are all in tooling, not runtime:

| Tool | Reaches into | Why |
| --- | --- | --- |
| `scripts/ilias-login.mjs` | `server/ilias.mjs` | CLI for the server's ILIAS login |
| `scripts/publish-ipa.mjs` | `dist-service/env.mjs` | Reads the shared root `.env` |
| `scripts/generate-component-catalog.mjs` | `app/`, `src/`, `docs/`, `server/dashboard/` | Scans the app and writes three outputs |
| 10 of the 18 tests under `scripts/*.test.mjs` | `src/**` | Test pure app modules from the root test runner |

That is the inversion to fix: tools may depend on an app's public entry point, but not on its internals.

## 4. What is already modular

The repository is in better shape than the folder list suggests.

- **Server routes are separated by concern.** `server/routes/` groups admin, auth, campus, ILIAS, mail, news, OIDC, quiz, and assist. `server/admin/index.mjs` is an explicit public barrel over a split data layer.
- **Pure logic is already separated from React.** 78 of the 247 modules under `src/` are transitively free of `react`, `react-native`, and Expo. Examples: `src/domain/plan.ts`, `src/assistant/answer.ts`, `src/mail/compose-draft.ts`, `src/news/parse.ts`, `src/auth/user.ts`, most of `src/quiz/`, and `src/state/app-store.ts`.
- **Platform forks are explicit.** `.web.ts`/`.native.tsx` pairs exist for the campus cache, QR code, map, PDF/office viewers, and NFC. Metro's platform resolution is doing real work and must remain inside the app or UI packages.
- **The server has no npm dependencies.** It runs from source with Node built-ins only. That is a deliberate and valuable property.
- **The distribution service is deliberately standalone.** Its header comment says so, and the code matches: node built-ins plus its own files only.
- **The docs have one source of truth.** Docusaurus reads `../docs`; the Markdown is not copied.
- **Generated artifacts are checked.** `scripts/generate-component-catalog.mjs --check` fails when the catalog is stale. The new quiz catalog follows the same pattern.
- **The app is already universal.** React Native Web means the same screens run on phone and browser. The missing reuse is between the app and the *other* web surfaces, not between app web and app native.

## 5. Findings

Severity is about cost and risk, not style.

### F1. One package boundary for six surfaces — High

`package.json` at the root declares 51 dependencies and 10 dev dependencies for the app, and every tool and test uses the same manifest. Nothing states which dependency belongs to which consumer. The server and distribution service intentionally have zero dependencies, but that is only visible by reading their imports.

**Impact:** dependency upgrades and installs touch every surface; a server-only tool can accidentally pull in an Expo package; there is no enforceable boundary.

### F2. A root-wide `@/*` alias with no import restrictions — High

`tsconfig.json` maps `@/*` to `./*`. Any file can import any other file with a short alias. `eslint.config.js` scopes linting by folder but does not restrict imports. The only boundary today is convention.

**Impact:** the restructuring has no guardrail. A new screen can import `server/db.mjs` or a tool can import a screen without a warning.

### F3. Tooling imports app and service internals — High

`scripts/ilias-login.mjs` imports `../server/ilias.mjs`; `scripts/publish-ipa.mjs` imports `../dist-service/env.mjs`. Ten of the eighteen root tests import modules under `src/`. The component catalog generator writes into `src/`, `docs/`, and `server/dashboard/` in one run.

**Impact:** moving an app or refactoring an internal module breaks tools that should not know about it. Deployment boundaries are not reflected in the import graph.

### F4. The operator dashboard is a full frontend inside the server tree — High

`server/dashboard/` is 5,092 lines: 3,516 lines of pages, 905 lines of shared browser modules, 671 lines of HTML/CSS, plus the generated 12,278-line catalog. It is served as static ES modules by `server/routes/admin/assets.mjs`. It talks to the server only over `/v1/admin/*` with a cookie, which is the right boundary, but it lives in the server's source tree and has no package of its own.

**Impact:** the dashboard cannot be developed, tested, or deployed independently. A future React migration has no obvious home. Shared web UI has nowhere to live.

### F5. Duplicated runtime plumbing — Medium

| Primitive | Copies |
| --- | --- |
| `.env` loader | `server/env.mjs`, `dist-service/env.mjs`, plus an inline loader in `scripts/quiz-from-pdf.ts` |
| `readBody` / JSON response / HTML response | `server/http.mjs`, `dist-service/server.mjs` |
| HTML escaping | `server/ilias/viewer.mjs`, `dist-service/render.mjs` |
| Date and byte formatting | `src/text.ts`, `src/mail/attachments.ts`, `dist-service/render.mjs` |
| Initials / avatar tone | `src/auth/user.ts`, `src/components/web-sidebar.tsx`, `src/ilias/components/member-avatar.tsx`, `server/dashboard/assets/ui.mjs` |
| Theme persistence and toggle | `src/state/actions/appearance.ts`, `server/dashboard/assets/theme.mjs`, `site/theme.js` |

Each copy is small. Together they are the main reason a change such as "German date format" or "UTF-8 filename header" has to be repeated.

### F6. Design tokens are repeated across five surfaces — High

| Surface | Source | Unique hex values |
| --- | --- | ---: |
| App | `src/theme.ts` | 36 |
| Admin | `server/dashboard/assets/styles.css` | 73 |
| Site | `site/styles.css` | 47 |
| Distribution service | inline style in `dist-service/render.mjs` | 9 |
| Docs | `docs-site/src/css/custom.css` | 14 |

`#004191` appears in 11 files, `#00BEFF` in 6, `#F3F6F8` in 4. The app's semantic names (`blue`, `light`, `paper`, `mist`, `inkSoft`, `mute`) and the dashboard's names (`brand`, `accent`, `bg`, `surface`, `text`, `muted`) describe the same palette differently.

**Impact:** visual drift is inevitable, and a brand change is a manual search across five surfaces.

### F7. API contracts drift — High

- `server/catalog.mjs` lists 42 operations.
- The fallback list in `src/auth/api.ts` lists 19. **23 catalogued operations are missing from the fallback.**
- Server route modules contain 72 unique `/v1/*` path literals; the app contains 38.
- The dashboard calls 17 admin endpoints directly by string.

There is no type or test that connects a server route, the public catalog, the app's fallback, and the dashboard's client.

**Impact:** the Schnittstelle screen silently offers an incomplete list when the server is offline, and route renames are not caught.

### F8. C@MPUS portal logic exists twice — High

The app and the server both build C@MPUS REST URLs and normalise the same DTOs:

| Concern | App | Server |
| --- | --- | --- |
| Base origin and URL builders | `src/campus/curriculum.ts`, `courses.ts`, `studies.ts` | `server/campus.mjs` |
| Structure URL | `curriculumStructureUrl()` with a language parameter | `curriculumRequestUrl()` hardcoded to `de` |
| Courses URL | `coursesRequestUrl()` | `coursesRequestUrl()` |
| Studies chooser URL | `studiesChooserUrl()` | `studiesRequestUrl()` |
| DTO → node/study/course mapping | `src/campus/*` and `src/domain` | `nodesFromCurriculum()`, `studiesFromChooser()`, `coursesFromPayload()` |

**Impact:** a portal change or a new filter has to be made twice, and the two sides can disagree about what a course, study, or element is.

### F9. The component catalog generator writes into three consumers — Medium

`scripts/generate-component-catalog.mjs` scans `app/` and `src/`, then writes:

- `src/components/catalog.generated.ts` for the in-app Dev screen,
- `docs/engineering/component-catalog.md` for the docs site,
- `server/dashboard/assets/component-catalog.mjs` for the admin dashboard.

The catalog is 25,620 generated lines, duplicated in two executable formats. The generator is 906 lines and knows the paths of three apps.

**Impact:** the tool is coupled to every consumer. A fourth consumer would need a fourth output. The same information could be generated once and adapted.

### F10. Tests are in the wrong place for the target boundaries — Medium

The app has no test directory. Ten of the eighteen tests under `scripts/` test pure app modules (`app-store`, `assistant-endpoints`, `campus-browser-scripts`, `mail-compose`, `news`, `vpn-profile`, and others); the other eight test tools. Server tests live next to server code; the distribution service test lives next to its service.

**Impact:** the root test runner is a map of accidental access rather than a package test suite. Moving code will move tests twice.

### F11. The package manager is ambiguous — Medium

`README.md` and `CONTRIBUTING.md` use `npm`, while the repository has `bun.lock` and no `package-lock.json`. `docs-site/` has its own `bun.lock`. CI uses Bun for the docs build and Node for the scripts.

**Impact:** two developers can install different trees. A workspace restructuring needs one authoritative package manager.

### F12. No CI for typecheck, lint, or tests — Medium

The only workflow is `.github/workflows/pages.yml`, which builds Docusaurus and the site. `npm run check` is comprehensive but runs only on a developer machine.

**Impact:** the restructuring will move hundreds of files. Without a CI check, a broken boundary or a stale generated file can land on `main`.

### F13. The local Expo module and config plugins assume the app root — Low, but a migration trap

`modules/university-vpn/` has no `package.json`; Expo autolinking finds it under the app project's `modules/` directory. `app.json` references `./plugins/withVpnTunnel` and `./plugins/withNfc` relative to the app root. `src/vpn/native.ts` only references the native module by name.

**Impact:** moving the app without moving `modules/` and `plugins/` silently disables the VPN and NFC native paths. This must be part of Phase 1, not an afterthought.

### F14. i18n is fragmented on purpose and by accident — Low to Medium

| Surface | Approach |
| --- | --- |
| App | 2 keyed catalogs, about 2,700 lines, `tx(locale, key, values)` |
| Server | 2 tiny catalogs (Grok system prompt and two ILIAS viewer strings) |
| Admin | Hardcoded German in page modules and `assets/api.mjs` |
| Site | Inline `data-i18n` dictionary in `site/main.js`, German markup |
| Distribution service | English template strings |

Not all of this should merge: the vocabularies barely overlap. But there is no shared error-code dictionary, and the admin cannot be translated without a second pass.

### F15. The admin and dist service had no build step — a constraint now waived

The dashboard is served as source ES modules. The distribution service renders template strings. Both choices keep deployment small and debuggable, but they also block ordinary package imports. [ADR-001](05-adr-001-target-architecture.md) waives both: the admin gets React + Vite, and the dist service gets a single-file bundle. The no-build property is no longer a design constraint; deployment independence still is.

## 6. Constraints

These are hard or expensive to change. The target design must respect them.

| Constraint | Consequence |
| --- | --- |
| Expo Router requires an `app/` directory in the app project root | The mobile app can move to `apps/mobile`, but `app/` stays directly below it. `typedRoutes` regenerates under `apps/mobile/.expo`. |
| Metro resolves platform extensions (`.web.tsx`, `.native.tsx`) and transpiles workspace TypeScript | Platform forks stay in app/UI packages, never in neutral core. Expo SDK 58 configures monorepos automatically; do not hand-write `watchFolders` unless necessary. |
| One React and one React Native version in the workspace | Docusaurus and the app both use React 19, but keeping the docs install separate avoids a hoisting conflict. |
| The assistant server is plain Node ESM with no build | It can import dependency-free JavaScript workspace packages (`.js` + `.d.ts`). It cannot import TypeScript source. It should not gain a framework. |
| The distribution service must deploy standalone | Share source only if the release step bundles it into one file, or keep its helpers duplicated. **Decided:** bundle it with `bun build --target=node`. |
| The admin dashboard originally had no build step | Shared browser modules must be reachable as static files, or the dashboard gains a bundler. **Decided:** the admin gains React + Vite. |
| Docusaurus reads the canonical `docs/` path | Do not move documentation into a package. |
| The repository is AGPL-3.0-or-later | Shared packages stay AGPL. Third-party native licences remain a separate concern. |
| Bun is the lockfile owner | Adopt Bun workspaces. Do not introduce npm or pnpm workspaces in parallel. |
| The app uses `patches/` and `patchedDependencies` | Patches stay at the workspace root. |

## 7. Baseline checks

Before moving anything, record the current state so regressions are visible:

```bash
bun run check          # types, lint, catalog, campus DB, app/server/tooling tests
bun run docs:build     # Docusaurus renders the docs
npx expo export --platform web
node --test dist-service/server.test.mjs
```

Optional but useful:

```bash
bun pm why react
bun pm why react-native
find . -path ./node_modules -prune -o -name '*.mjs' -print | wc -l
```

The first two confirm one React and one React Native version. The third is a rough size baseline for the move.

## 8. Summary

The repository is not a monolith in the runtime sense. It is a **single package with six independent surfaces and a shared test/tool layer that reaches across them**. The restructuring should formalise the boundaries that already exist, move the genuinely shared logic into packages, and add enforcement so the boundaries survive the next feature.

The largest reuse wins, in order:

1. API, C@MPUS, mail, ILIAS, and admin contracts (app ↔ server ↔ admin ↔ tools).
2. Design tokens (app, admin, site, dist).
3. Formatting and API calls (all surfaces).
4. Runtime plumbing for Node services (server, dist).
5. Two UI renderers (React Native for the app, React DOM for the admin) plus vertical feature packages for mail, ILIAS, and quiz.
