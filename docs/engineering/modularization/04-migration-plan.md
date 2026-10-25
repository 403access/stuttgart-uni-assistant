# Migration plan

This plan reaches [ADR-001](05-adr-001-target-architecture.md). It is ordered so the app, server, dashboard, dist service, site, and docs remain runnable after every phase.

Estimates are rough, for one developer familiar with the repository. They exclude review time and feature work.

## 1. Phase overview

| Phase | Outcome | Effort |
| --- | --- | ---: |
| 0. Baseline and decisions | Clean tree, recorded baseline, report-only boundary check | 0.5–1 day |
| 1. Workspace skeleton | Apps and tools in target folders; no shared packages yet | 2–3 days |
| 2. Neutral kernel | `contracts`, `format`, `design-tokens`, `core` | 5–8 days |
| 3. Platform packages | `api-client`, `ui`, `server-kit`; dist bundle | 5–8 days |
| 4. Feature packages | `feature-mail`, `feature-ilias`, `feature-quiz` | 6–10 days |
| 5. React admin | Vite + React + `ui-react`; replace the vanilla dashboard | 10–15 days |
| 6. Cleanup and enforcement | Old paths gone, docs updated, CI blocks violations | 1–2 days |
| **Total** | | **30–47 dev days** |

The B checkpoint is after Phase 3. If the admin rewrite is cancelled there, the repository is still in a healthy modular state. Phase 4 and Phase 5 can run in parallel with two developers; Phase 5 does not depend on the feature packages.

## 2. Phase 0 — Baseline and decisions

### Tasks

1. Commit or merge the in-progress quiz catalog and quiz-sync work. Do not start a path migration on a dirty tree.
2. Record the baseline:
   ```bash
   bun run check
   bun run docs:build
   npx expo export --platform web
   node --test dist-service/server.test.mjs
   ```
   Save the duration, the bundle size, and any existing failures.
3. Add a `check:boundaries` script in report-only mode. It can fail later; the first run shows current violations.
4. Confirm the remaining defaults in [the decision table](03-options-and-decision.md#8-remaining-defaults). They do not change the architecture.
5. Add the links to [docs/README.md](../../README.md) and the Docusaurus sidebar.

### Exit criteria

- Clean working tree.
- Baseline commands pass and their output is saved.
- No code moved.

## 3. Phase 1 — Workspace skeleton

This is the only path-heavy phase. Do it on a short-lived branch without concurrent feature work.

### 3.1 Move map

| From | To |
| --- | --- |
| `app/` | `apps/mobile/app/` |
| `src/` | `apps/mobile/src/` (temporary; features and packages split later) |
| `assets/` | `apps/mobile/assets/` |
| `app.json` | `apps/mobile/app.json` |
| `plugins/` | `apps/mobile/plugins/` |
| `modules/university-vpn/` | `apps/mobile/modules/university-vpn/` |
| `expo-env.d.ts` | `apps/mobile/expo-env.d.ts` |
| `server/` minus `dashboard/` | `apps/server/` |
| `server/dashboard/` | `apps/admin/public/` (vanilla until Phase 5) |
| `dist-service/` | `apps/dist/` |
| `site/` | `apps/site/` |
| `docs-site/` | `apps/docs/` |
| `scripts/` | `tools/` |
| `docs/` | `docs/` (unchanged) |
| `patches/` | `patches/` (unchanged) |

Use `git mv` so history follows the files.

### 3.2 Root workspace

`package.json` becomes the orchestrator:

```json
{
  "name": "university-assistant",
  "private": true,
  "workspaces": [
    "apps/mobile",
    "apps/server",
    "apps/admin",
    "apps/dist",
    "apps/site",
    "packages/*",
    "packages/features/*",
    "tools"
  ],
  "scripts": {
    "start": "bun run --filter @ua/mobile start",
    "web": "bun run --filter @ua/mobile web",
    "android": "bun run --filter @ua/mobile android",
    "ios": "bun run --filter @ua/mobile ios",
    "assistant": "bun run --filter @ua/server start",
    "admin": "bun run --filter @ua/admin dev",
    "dist:serve": "bun run --filter @ua/dist start",
    "dist:build": "bun run --filter @ua/dist build",
    "dist:publish": "node tools/release/publish-ipa.mjs",
    "dist:tunnel": "cloudflared --config apps/dist/tunnel.yml tunnel run",
    "docs": "cd apps/docs && bun run start",
    "docs:build": "cd apps/docs && bun run build",
    "site": "python3 -m http.server 4173 --directory apps/site",
    "check": "bun run check:types && bun run check:lint && bun run check:boundaries && bun run check:generated && bun run check:tests",
    "check:types": "bun run --filter '*' typecheck",
    "check:tests": "bun run --filter '*' test"
  },
  "devDependencies": {
    "eslint": "^9.39.5",
    "eslint-config-expo": "~58.0.4",
    "globals": "^16.0.0",
    "typescript": "~6.0.3"
  }
}
```

Keep `patchedDependencies` and `patches/` at the root.

### 3.3 Package manifests

`apps/mobile/package.json`:

```json
{
  "name": "@ua/mobile",
  "private": true,
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "web": "expo start --web",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "typecheck": "tsc --noEmit",
    "test": "node --test"
  }
}
```

Move the 51 runtime dependencies into this manifest. Keep type-only dependencies there or in the root tooling manifest.

`apps/server/package.json`:

```json
{
  "name": "@ua/server",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "node index.mjs",
    "typecheck": "echo 'plain node'",
    "test": "node --test"
  },
  "dependencies": {
    "@ua/contracts": "workspace:*",
    "@ua/server-kit": "workspace:*"
  }
}
```

The workspace dependencies are added in Phase 2–3. The server still has no external npm dependencies.

`apps/admin/package.json` in Phase 1 is temporary, because the dashboard is still vanilla:

```json
{
  "name": "@ua/admin",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "node dev-server.mjs",
    "typecheck": "echo 'vanilla phase'",
    "test": "echo 'vanilla phase'"
  }
}
```

It becomes the Vite manifest in Phase 5.

`apps/dist/package.json`:

```json
{
  "name": "@ua/dist",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "node server.mjs",
    "build": "bun build server.mjs --target=node --outfile=dist/server.mjs",
    "typecheck": "echo 'plain node'",
    "test": "node --test"
  }
}
```

`apps/site/package.json`:

```json
{
  "name": "@ua/site",
  "private": true,
  "scripts": {
    "start": "python3 -m http.server 4173 --directory ."
  }
}
```

`apps/docs` stays out of the workspace and keeps its own `package.json` and `bun.lock`.

### 3.4 Path fixes

| File | Change |
| --- | --- |
| `apps/server/index.mjs` | `.env` URL becomes `new URL('../../.env', import.meta.url)` |
| `apps/server/routes/admin/assets.mjs` | Dashboard root becomes `new URL('../../../admin/public/', import.meta.url)` (or `ADMIN_DIR`) |
| `apps/dist/server.mjs` | Root `.env` URL |
| `apps/dist/db.mjs` | Data directory stays inside `apps/dist/data` or `DIST_DATA_DIR` |
| `apps/docs/docusaurus.config.js` | Docs path `../docs` → `../../docs` |
| `.github/workflows/pages.yml` | Paths `site/**` → `apps/site/**`, `docs-site/**` → `apps/docs/**`; copy commands |
| `.gitignore` | `/ios` → `/apps/mobile/ios`, `/android` → `/apps/mobile/android`, `dist/` → `apps/mobile/dist`, etc. |
| `tsconfig.json` | Root file becomes `tsconfig.base.json`; `apps/mobile/tsconfig.json` owns `@/*` |
| `eslint.config.js` | Folder globs for `apps/server`, `apps/admin`, `apps/dist`, `apps/mobile`, `tools`, `packages` |
| `scripts/tsconfig.test.json` | Moves with the tooling and points at `packages/core` later |
| `README.md`, `CONTRIBUTING.md`, `AGENTS.md` | Commands and paths |
| `docs/engineering/*` | Only paths that would otherwise be wrong; a full doc pass is Phase 6 |

The Expo Router app root must remain `apps/mobile/app`. `expo-env.d.ts` and `.expo/` belong to the app. Do not add a custom Metro `watchFolders`; Expo SDK 58 detects the workspace automatically. Run `expo start --clear` once after the move.

### 3.5 Verification

| Surface | Check |
| --- | --- |
| Mobile types | `cd apps/mobile && npx tsc --noEmit` |
| Mobile web | `cd apps/mobile && npx expo export --platform web` |
| Native config | `cd apps/mobile && npx expo config --type prebuild` and confirm the VPN/NFC plugins |
| Native build | One debug build per platform if the machine allows it |
| Server | `node apps/server/index.mjs`, then `curl /health`, `/v1/api`, `/admin` |
| Server tests | `cd apps/server && node --test` |
| Admin | Open `/admin`, log in, load **Übersicht**, **Nutzer**, **System**, **Komponenten** |
| Dist | `node apps/dist/server.mjs`, run its test |
| Site | `python3 -m http.server 4173 --directory apps/site` |
| Docs | `cd apps/docs && bun install && bun run build` |

### Exit criteria

- Every surface runs from its new path.
- One root lockfile; `apps/docs` keeps its own.
- The admin is still vanilla and still served by the server.
- A native build confirms `modules/university-vpn` and both config plugins still resolve.

### Rollback

Revert the Phase 1 commits. No logic changed, so the old tree is restored cleanly. Do not mix Phase 1 with feature commits.

## 4. Phase 2 — Neutral kernel

### 4.1 `@ua/format`

1. Create `packages/format` with `date.js`, `number.js`, `bytes.js`, `names.js`, `text.js`, `index.js`, and `index.d.ts`.
2. Move the locale-aware pure functions from `src/text.ts` and `formatBytes` from `src/mail/attachments.ts`.
3. Add fixtures for German and English dates, grades, bytes, initials, and avatar tone.
4. Replace `src/text.ts` with a re-export from `@ua/format` (temporary) and later from `@ua/core/format`.

### 4.2 `@ua/contracts`

1. Move `server/catalog.mjs` to `packages/contracts/api.js`. Re-export it from `server/catalog.mjs` for one commit, then delete the old file.
2. Replace the fallback list in `src/auth/api.ts` with the same catalog. The fallback is no longer a second list; it is the catalog used when the server is offline.
3. Move error codes from `server/routes/**` and `server/auth.mjs` into `packages/contracts/errors.js`.
4. Move the C@MPUS URL builders and DTO normalisers from `server/campus.mjs` and `src/campus/{curriculum,courses,studies}.ts` into `packages/contracts/campus.js`. Keep a locale parameter; the server passes `de`, the app passes the selected locale.
5. Move platform ids, link statuses, and sign-in modes into `packages/contracts/auth.js`.
6. Add the shapes needed by the admin: `packages/contracts/admin.d.ts` for overview, user, device, audit, logs, news, ILIAS, system, quiz.
7. Add `packages/contracts/test/`:
   - every `/v1/*` literal in `apps/server/routes` is either in the catalog or explicitly marked internal;
   - the app fallback is the catalog;
   - URL builders return the expected strings for `de` and `en`;
   - normalisers handle the sample payloads in `src/campus/*.sample.ts`.

### 4.3 `@ua/design-tokens`

1. Create `tokens.json` with semantic colours, spacing, radii, typography, and mark geometry.
2. Write `tools/codegen/tokens.mjs` with `--check`.
3. Generate `generated/theme.ts` with legacy aliases, `generated/tokens.css`, `generated/tokens.js` (CSS string), and `generated/tokens.d.ts`.
4. Replace `src/theme.ts` with a thin adapter that exports the generated `colors`, `themedStyles`, and `ThemeColors`.
5. Replace the dashboard's `:root` and `[data-theme="dark"]` blocks with the generated token CSS. In Phase 1–4 the vanilla dashboard can import the CSS file served by the server.
6. Replace the inline palette in `dist-service/render.mjs` with the generated CSS string.
7. Generate `apps/site/assets/tokens.css`; the site adopts it incrementally.

### 4.4 `@ua/core`

1. Create the package with the subpaths from [target modules](02-target-modules.md#4-package-catalog).
2. Move the neutral modules: `domain`, `data`, `plan`, `assistant`, pure `auth`, `profile`, `onboarding/ics`, `i18n`, `state` (store, persisted, pure actions), `query/keys`, and the formatting re-export.
3. Keep platform files in the app: `src/campus/db.ts`, `db.web.ts`, `src/auth/vault.ts`, `session.ts`, `biometrics.ts`, all `use-*` hooks that import Expo/RN, `src/query/client.tsx`, `mutations`, `queries`.
4. Move the ten app-module tests from `tools/` into `packages/core/test/`. Keep the eight tooling tests in `tools/`.
5. Add `packages/core/package.json` with `exports` for each subpath and a `typecheck` script.
6. Update `check:app-tests` and the campus DB test paths.

### Exit criteria

- The app imports `@ua/core`, `@ua/contracts`, `@ua/format`, and `@ua/design-tokens`; no app file imports a server or tool path.
- The server imports `@ua/contracts` for the catalog and C@MPUS logic; no server file imports app code.
- `check:contracts`, `check:tokens`, and `check:core-tests` pass.
- The app's visual output is unchanged.
- `expo export --platform web` still succeeds.

## 5. Phase 3 — Platform packages

### 5.1 `@ua/api-client`

1. Extract the admin client: `server/dashboard/assets/api.mjs` becomes `packages/api-client/admin.js` with the same error mapping. Keep the vanilla dashboard's copy until Phase 5, or replace it with a served copy if the module is browser-safe.
2. Extract the simple public endpoints (`health`, `auth`, `news`, `oidc`, `quiz`) and move the app's `src/auth/api.ts` to call it.
3. Leave the campus sync flow until last; its retries and timeouts belong in the app adapter.
4. Add tests for error mapping and JSON parsing with a fake `fetch`.

### 5.2 `@ua/ui`

1. Use the generated catalog to select the 35 **shared UI** components.
2. Move them to `packages/ui/src/`; keep the 34 feature components and 7 providers in the app until Phase 4.
3. Add `package.json` with React/RN peer dependencies and `exports`.
4. Update app imports. Delete `src/components/ui.tsx` after the last import moves.
5. Keep the Dev → Komponenten previews in the app; they import from `@ua/ui`.
6. Run a web export and a native build to catch a missing platform file.

### 5.3 `@ua/server-kit`

1. Move `server/env.mjs` and `dist-service/env.mjs` into `env.js`.
2. Move `server/http.mjs`; add the dist service's `sendJson`/`sendHtml`/`readBody` as the same API.
3. Move `escapeHtml` from `server/ilias/viewer.mjs` and `dist-service/render.mjs` into `html.js`.
4. Add `sqlite.js` with open/WAL/migrate/transaction helpers; do not move the server or dist schema.
5. Move token hashing, bearer parsing, constant-time comparison, and session TTL from `server/auth.mjs`.
6. Move static-file serving from `server/routes/admin/assets.mjs` and the dist service.
7. Add tests for env precedence, body limits, header injection, and path containment.

### 5.4 Dist bundle

1. Add `@ua/server-kit`, `@ua/format`, and `@ua/design-tokens` as dependencies.
2. Add `bun build server.mjs --target=node --outfile=dist/server.mjs`.
3. Verify the bundle runs with only `dist/server.mjs` and the data directory present.
4. Keep `node server.mjs` for development.

### Exit criteria

- The app uses `@ua/ui` for its shared primitives.
- The server and dist share one env/http/html implementation.
- The dist release is one bundled file plus data.
- The admin is still vanilla and runs from `apps/admin/public`.
- `check:boundaries` passes for the packages extracted so far.

## 6. Phase 4 — Feature packages

Do mail first, then ILIAS, then quiz. Each feature is a self-contained pair of pull requests: core extraction, then UI extraction.

### 6.1 `@ua/feature-mail`

1. Create `packages/features/mail` with the layout from [target modules](02-target-modules.md#feature-packages).
2. Move `src/mail/{compose-draft,recipients,templates,format,types}.ts` and the pure draft model into `src/core/`.
3. Move `src/mail/{use-*,draft-storage,attachments}` and `src/mail/components/*` into `src/ui/`.
4. Move pure tests (`mail-compose.test.mjs`) into the package.
5. Update app routes (`app/(tabs)/mail.tsx`, `app/mail-*.tsx`) to import from `@ua/feature-mail` and `@ua/feature-mail/ui`.
6. Delete the old `src/mail` tree.

### 6.2 `@ua/feature-ilias`

1. Move `src/ilias/{account,files,tutorials,errors,types}.ts` into `src/core/`.
2. Move `api`, `headless`, `download`, `queries`, `use-ilias`, providers, and components into `src/ui/`.
3. Move the tutorial and file tests into the package.
4. Update the ILIAS routes and the root provider imports.
5. Keep `src/ilias/auto-connect` in the app if it coordinates campus auth and session state; otherwise move it to the feature UI.

### 6.3 `@ua/feature-quiz`

1. `@ua/quiz-content` holds content, figures, maps, and schema (Phase 2 or 4; it can move early because it is a leaf).
2. Move `src/quiz/{answer,evaluate,session,labels,types}.ts` into `src/core/`.
3. Move components, `progress`, `confirm`, and the progress provider into `src/ui/`.
4. Move the quiz checks into the package and keep the content export in `tools/`.
5. Update quiz routes and the root `QuizProgressProvider`.

### Exit criteria

- The app has no `src/mail`, `src/ilias`, or `src/quiz` UI trees; only feature packages and thin routes.
- Each feature has a public API and a README.
- `check:boundaries` rejects app imports of a feature's `src/` path.
- The app still exports for web and builds natively.

## 7. Phase 5 — React admin

This is the largest phase. It starts after Phase 3 (the B checkpoint) and can run in parallel with Phase 4.

### 7.1 Scaffolding

1. Add `apps/admin` with:
   ```text
   index.html
   vite.config.ts
   tsconfig.json
   src/main.tsx
   src/app.tsx
   src/routes/
   src/components/
   src/lib/
   src/styles/
   test/
   ```
2. Dependencies: `react`, `react-dom`, `@tanstack/react-query`, `@tanstack/react-router`, `@ua/ui-react`, `@ua/api-client`, `@ua/contracts`, `@ua/format`, `@ua/design-tokens`.
3. Dev dependencies: `vite`, `@vitejs/plugin-react`, `vitest`, `@testing-library/react`, `@testing-library/user-event`, `jsdom`, `typescript`, `@types/react`, `@types/react-dom`.
4. `vite.config.ts` sets `base: '/admin/'` for the build, proxies `/v1` to `http://127.0.0.1:8787`, and lets the router use browser history. The dev server runs at `/admin/` as well.
5. If Vite tries to pre-bundle a workspace package, add it to `optimizeDeps.exclude`; linked TypeScript packages should be transpiled from source, not pre-bundled.
6. `index.html` loads `src/main.tsx`; `@ua/design-tokens/css` is imported once.

### 7.2 `@ua/ui-react`

Build the primitives before porting pages:

1. `ThemeProvider`, `useTheme`, token CSS import.
2. Layout: `AppShell`, `Sidebar`, `Topbar`, `PageHeader`, `Card`, `Section`.
3. Data: `Badge`, `Avatar`, `CopyButton`, `EmptyState`, `Spinner`, `StatCard`, `Table`, `DataTable`, `Pagination`.
4. Forms: `Button`, `Field`, `Input`, `TextArea`, `Select`, `Checkbox`, `Switch`, `Dialog`, `ConfirmDialog`, `Tabs`.
5. Feedback: `Toast`, `ErrorState`, `Alert`.
6. Icons: the dashboard's SVG set.
7. Tests for keyboard, focus, and the DataTable.

`DataTable` is the most important component: column definitions, sorting, selection, pagination, empty/loading states, and row actions. It should be generic enough for users, devices, audit, logs, news, and quiz.

### 7.3 Shell and data layer

1. `lib/query.ts` creates the TanStack Query client; `lib/api.ts` creates the admin client against same-origin `/v1/admin`.
2. `lib/auth.ts` handles the login, logout, and the `503 admin_unconfigured` state.
3. `routes/__root.tsx` renders the shell, theme toggle, sidebar, toasts, and error boundary.
4. Replace the old global `state` object with route search params and query keys.
5. Add a route smoke test with a mocked API client.

### 7.4 Page order

Port one page per pull request, with its API calls and a smoke test, and delete the vanilla module in the same PR:

1. Overview.
2. System.
3. Logs.
4. Audit.
5. News.
6. Devices and device detail.
7. ILIAS.
8. Components.
9. Quiz.
10. Users.
11. User detail (the 1,214-line page; port tabs one at a time).

The user detail page is last because it has the most surface area: overview, campus, courses, calendar, calls, platforms, sessions, devices, ILIAS, mail, and destructive actions.

### 7.5 Cutover

1. Build to `apps/admin/dist`.
2. Set `ADMIN_DIST_DIR=apps/admin/dist` in the server (default in the repo).
3. Serve `/admin` and `/admin/assets/*` from the build output with the same security headers.
4. Add an SPA fallback: a request for `/admin/*` that is not an existing file returns `index.html`, so browser-history routes such as `/admin/users/42` work. Keep the fallback inside the admin path and preserve the existing CSP and `X-Frame-Options`.
5. Delete `apps/admin/public/` and the vanilla page modules.
6. Keep the old admin reachable at a temporary path for one release if needed; do not run both as the primary UI indefinitely.

### Exit criteria

- The React admin covers every vanilla page and action.
- The server serves only `apps/admin/dist`.
- The admin has component and route tests.
- Login, logout, filters, pagination, destructive confirmations, CSV export, and the theme toggle are verified.
- The vanilla `server/dashboard` tree is gone.

## 8. Phase 6 — Cleanup and enforcement

1. Delete all temporary re-exports at old paths.
2. Remove empty `src/`, `server/`, `dist-service/`, `site/`, and `docs-site/` shells.
3. Update `docs/engineering/architecture.md`, `design-system.md`, `admin-dashboard.md`, `ios-distribution.md`, `i18n.md`, and `component-catalog.md` to the new paths.
4. Update `docs/README.md` and the Docusaurus sidebar.
5. Add package READMEs with purpose, consumers, and forbidden imports.
6. Make `check:boundaries` blocking.
7. Add `.github/workflows/check.yml`:
   ```yaml
   name: Check
   on: [pull_request, push]
   jobs:
     check:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: oven-sh/setup-bun@v2
           with: { bun-version: 1.4.3 }
         - run: bun install --frozen-lockfile
         - run: bun run check
   ```
8. Run the full matrix one last time and record the result in the ADR.

## 9. Risks and mitigations

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Metro cannot resolve a workspace package | Medium | Prove it in Phase 2 with `@ua/format` before moving large packages. Expo SDK 58 configures monorepos automatically; do not add `watchFolders` unless resolution fails. |
| Duplicate React or React Native | Medium | `bun pm why react` and `bun pm why react-native`; keep docs out of the workspace; use root resolutions only if needed. The admin uses the same React 19 version. |
| Expo Router typed routes break after the move | Medium | Keep `app/` directly under `apps/mobile`; delete `.expo/` and run `expo start --clear`; check `expo-env.d.ts`. |
| VPN or NFC native module not linked | Medium | Move `modules/` and `plugins/` with the app; run `expo config --type prebuild`; do one native build. |
| Server reads the wrong `.env` | High | Make the loader's URL explicit at each entry point; add a test that a root `.env` is found from `apps/server` and `apps/dist`. |
| Admin rewrite regresses an operator workflow | High | Page-by-page ports with smoke tests; keep a staging deploy of the old admin for one release; verify destructive actions and permissions explicitly. |
| Admin auth breaks in development | Medium | Vite proxy keeps `/v1` same-origin; never call the API from a different origin. |
| Vite cannot resolve a workspace package or CSS Modules | Medium | Exclude linked packages from pre-bundling; run a production build in CI; keep package exports simple. |
| Admin assets 404 under `/admin/` | Medium | `base: '/admin/'`, verify `index.html` asset URLs, and add the SPA fallback before deleting the vanilla admin. |
| Feature packages create cycles | Medium | `core` never imports a feature; features depend on `core`; boundary check blocks deep imports. |
| Feature UI pulls platform code into core | Medium | `src/core` has its own lint rule banning React Native/Expo; CI runs it. |
| Dist bundle misses a file or breaks at runtime | Medium | CI runs the bundle and the dist test; the release checklist deploys only the bundle plus data. |
| Tools break because an internal path moved | High | Move the CLIs to the owning app (`ilias-login` → server, `publish-ipa` → dist); add the boundary check. |
| Docs links and sidebar break | Medium | Update `docs/README.md` and `sidebars.js` in the same PR; the Pages workflow builds the docs on every change. |
| Long-lived restructuring branch diverges | High | One phase per PR; keep `main` shippable; avoid feature work on the Phase 1 branch. |
| Generated files drift | Medium | Every generator supports `--check`; CI runs `check:generated`. |
| Check time becomes painful | Low | Run package checks in parallel; cache Bun installs; keep the aggregate `check` for CI and a `check:fast` for local loops. |

## 10. Script mapping

| Old | New |
| --- | --- |
| `npm start` | `bun run start` (filters to `@ua/mobile`) |
| `npm run web` | `bun run web` |
| `npm run assistant` | `bun run assistant` |
| `npm run admin` | `bun run admin` (Vite dev server after Phase 5) |
| `npm run assistant:tunnel` | `bun run tools/dev/tunnel-assistant.mjs` |
| `npm run assistant:local` | `bun run tools/dev/tunnel-assistant.mjs --clear` |
| `npm run dist:serve` | `bun run dist:serve` |
| `npm run dist:publish` | `bun run dist:publish` |
| `npm run dist:tunnel` | `bun run dist:tunnel` |
| `npm run campus:token` | `bun run tools/dev/set-campus-secret.mjs token` |
| `npm run campus:session` | `bun run tools/dev/set-campus-secret.mjs session` |
| `npm run campus:headless` | `bun run tools/dev/campus-headless-login.mjs` |
| `npm run ilias:login` | `bun run apps/server/bin/ilias-login.mjs` |
| `npm run quiz:from-pdf` | `bun run tools/quiz/quiz-from-pdf.ts` |
| `npm run docs` | `bun run docs` (cd `apps/docs`) |
| `npm run docs:build` | `bun run docs:build` |
| `npm run site` | `bun run site` |
| `npm run icons` | `bun run tools/codegen/generate-icons.mjs` |
| `npm run catalog:components` | `bun run tools/codegen/generate-component-catalog.mjs` |
| `npm run check` | `bun run check` (aggregate) |

## 11. Metrics to watch

Record these before Phase 1 and after Phase 6:

| Metric | Baseline | Target |
| --- | ---: | ---: |
| Boundary violations (`check:boundaries`) | Unknown | 0 |
| API catalog entries missing from the app fallback | 23 | 0 |
| Palette sources | 5 | 1 |
| `loadEnv` implementations | 2 + 1 inline | 1 |
| `readBody`/response helpers | 2 | 1 |
| `escapeHtml` implementations | 2 | 1 |
| Vertical feature packages | 0 | 3 |
| Admin pages in React | 0 | All |
| Admin bundle size | n/a | Measured and reviewed |
| Generated component catalog copies | 2 executable + 1 Markdown | App/admin/docs from one model |
| `bun run check` duration | Baseline | No worse than +30% |
| Expo web bundle size | Baseline | No worse than +5% |

## 12. Suggested pull requests

1. **Analysis and baseline** — these documents, the docs index, the sidebar, and a report-only boundary check. No code moves.
2. **Workspace skeleton** — Phase 1. Path-only plus manifest changes.
3. **Contracts and formatting** — Phase 2. Start with `@ua/format` and `@ua/contracts`.
4. **Design tokens** — Phase 2. Token source, generator, app adapter, dashboard CSS.
5. **Core extraction** — Phase 2. One domain per commit inside the PR.
6. **API client and server kit** — Phase 3.
7. **Shared UI** — Phase 3. Move the 35 shared components.
8. **Dist bundle** — Phase 3.
9. **Feature mail** — Phase 4.
10. **Feature ILIAS** — Phase 4.
11. **Feature quiz and quiz content** — Phase 4.
12. **Admin scaffold and ui-react** — Phase 5.
13. **Admin pages** — Phase 5. One PR per page or small page group.
14. **Admin cutover** — Phase 5. Serve `dist`, delete `public`.
15. **Cleanup and CI** — Phase 6.

Keep each PR independently revertible. The app must be runnable at every commit.
