# Target modules

This document is the package and dependency specification for the accepted architecture in [ADR-001](05-adr-001-target-architecture.md). It is deliberately concrete: each package has a purpose, a runtime, a consumer list, and an import rule.

## 1. Principles

1. **One source of truth per fact.** A C@MPUS URL, an API path, a colour, or a date format exists once and is consumed everywhere.
2. **One-way dependencies.** Apps depend on packages. Packages never depend on apps. Tools may use an app's public entry point, never its internals.
3. **Runtime independence stays.** The assistant server, distribution service, dashboard, site, and app keep deploying separately. Sharing source must not create a shared process.
4. **Platform code stays at the edge.** React Native, Expo, SQLite, SecureStore, browser DOM, and Node built-ins live in the package or app that owns that platform. Neutral packages stay neutral.
5. **Two UI renderers, one design contract.** The app uses React Native / React Native Web. The admin uses React DOM. Both consume the same tokens, spacing, states, and formatting.
6. **Generate, do not hand-copy.** Tokens, the component catalog, the quiz catalog, and the site token stylesheet are generated with a `--check` mode.
7. **No new framework without a reason.** Bun workspaces, Vite for the admin, and small scripts are enough. No Nx, no Turborepo, no universal UI framework.
8. **Incremental exits.** Every phase leaves the app, server, dashboard, and dist service runnable and checked.

### Why two UI renderers

There is no single component implementation that runs unchanged in React Native and a dense desktop DOM console. The plan shares the design contract and provides two renderers:

- `@ua/ui` — React Native and React Native Web, used by the app (which covers app web and app native).
- `@ua/ui-react` — React DOM, used by the admin and future web surfaces.

A single React Native Web library for both is rejected because the admin needs semantic tables, forms, focus management, and desktop density. The trade-off is documented in [ADR-001](05-adr-001-target-architecture.md#why-a-react-dom-admin-rather-than-react-native-web).

## 2. Architecture layers

```text
┌─────────────────────────────────────────────────────────────────────┐
│ Composition roots                                                   │
│ mobile (Expo)  admin (React+Vite)  server (Node)  dist (Node)       │
│ site (static)  docs (Docusaurus)                                    │
└───────────────┬─────────────────────────────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────────────────────────┐
│ Vertical features                                                   │
│ feature-mail   feature-ilias   feature-quiz                         │
│ each: core (neutral) + ui (React Native)                            │
└───────────────┬─────────────────────────────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────────────────────────┐
│ Presentation and platform adapters                                  │
│ ui (RN/RN Web)      ui-react (DOM React)      server-kit (Node)     │
└───────────────┬─────────────────────────────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────────────────────────┐
│ Kernel and shared language                                          │
│ core (domain, state, i18n)   api-client   format   design-tokens    │
│ contracts (API, errors, portal DTOs)   quiz-content                 │
└─────────────────────────────────────────────────────────────────────┘
```

Arrows point from caller to dependency. No arrow points upward.

## 3. Target tree

```text
.
├── apps/
│   ├── mobile/                     Expo app for iOS, Android, and web
│   │   ├── app/                    Expo Router routes (must stay here)
│   │   ├── src/
│   │   │   ├── components/         app-only components
│   │   │   ├── hooks/              React Native / Expo hooks
│   │   │   ├── platform/           db.ts, db.web.ts, nfc, vpn native, documents
│   │   │   └── providers/          AppState, Query, Onboarding, QuizProgress
│   │   ├── modules/university-vpn/ local Expo module (autolinked here)
│   │   ├── plugins/                withVpnTunnel.js, withNfc.js
│   │   ├── assets/
│   │   ├── app.json
│   │   ├── tsconfig.json
│   │   └── package.json
│   ├── admin/                      React + Vite operator dashboard
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── main.tsx
│   │   │   ├── app.tsx
│   │   │   ├── routes/             overview, users, user, devices, news, ...
│   │   │   ├── components/         admin-only layout and page pieces
│   │   │   ├── lib/                query client, auth, theme, toast
│   │   │   ├── generated/          component catalog, if imported at build
│   │   │   └── styles/             CSS Modules and app-level CSS
│   │   ├── test/
│   │   └── package.json
│   ├── server/                     assistant + admin API (plain Node ESM)
│   │   ├── index.mjs
│   │   ├── routes/
│   │   ├── admin/
│   │   ├── campus.mjs, ilias/, mail/, oidc.mjs, quiz/, sync.mjs, ...
│   │   ├── test/
│   │   └── package.json
│   ├── dist/                       iOS build distribution service
│   │   ├── server.mjs, db.mjs, render.mjs, env.mjs
│   │   ├── test/
│   │   └── package.json
│   ├── site/                       static marketing and legal pages
│   └── docs/                       Docusaurus, separate install
├── packages/
│   ├── core/
│   ├── contracts/
│   ├── api-client/
│   ├── format/
│   ├── design-tokens/
│   ├── ui/
│   ├── ui-react/
│   ├── server-kit/
│   ├── quiz-content/
│   └── features/
│       ├── mail/
│       ├── ilias/
│       └── quiz/
├── tools/
│   ├── campus/                     C@MPUS probes, secrets, DB check, headless login
│   ├── ilias/                      ILIAS probe and portal tests
│   ├── quiz/                       quiz checks, catalog export, PDF pipeline
│   ├── articulation/               articulation checks and site export
│   ├── assistant/                  assistant checks and Cloudflare tunnel
│   ├── app/                        app-module unit tests
│   ├── codegen/                    catalogs, tokens, icons, site sitemap
│   ├── release/                    iOS build, publish, Xcode accounts
│   ├── product/                    beta forms and product utilities
│   ├── testing/                    fake AsyncStorage, fake SQLite, fixtures
│   └── admin-screenshots/          Playwright captures for the parity docs
├── docs/                           canonical documentation
├── patches/                        Bun patched dependencies
├── package.json                    workspace root and task runner
├── bun.lock                        one lockfile
├── tsconfig.base.json
├── eslint.config.js
└── AGENTS.md
```

`apps/docs` stays out of the workspace. It keeps its own install and lockfile so Docusaurus React cannot be hoisted into the mobile app.

## 4. Package catalog

### `@ua/contracts` — shared language

| Field | Value |
| --- | --- |
| Language | ES modules (`.js`) + hand-written `.d.ts`; no build |
| Runtime | Neutral: no React, DOM, Node built-ins, or dependencies |
| Consumers | Mobile, server, admin, tools, tests |
| Depends on | Nothing |

Subpaths:

- `api` — the operation catalog: `id`, `method`, `path`, `replay`, optional payload hints. Replaces `server/catalog.mjs` and the fallback in `src/auth/api.ts`.
- `errors` — stable error codes and a short default diagnostic message. UI copy stays local.
- `auth` — platform ids, link statuses, sign-in modes, public user shape.
- `campus` — C@MPUS origin, URL builders, `elementIdFromLink`, and DTO → domain normalisers for structure, studies, courses, and course groups.
- `mail` — address parsing, recipient shape, folder/message summaries.
- `ilias` — content/page shapes, file metadata, tutorial item parsing.
- `oidc` — profile claims and status shape.
- `news` — item/list shape and merge rules.
- `quiz` — catalog JSON shape and version.
- `admin` — admin response DTOs used by `@ua/api-client/admin`.

Rule: if the **server** needs a parser or a shape, it belongs in `contracts`, not in a feature package. `contracts` is a leaf and must not import `@ua/core`.

### `@ua/core` — app kernel

| Field | Value |
| --- | --- |
| Language | TypeScript, source only, no build |
| Runtime | Neutral: no React, React Native, Expo, DOM, or Node built-ins |
| Consumers | Mobile, feature packages, tools, tests |
| Depends on | `@ua/contracts`, `@ua/format`, `@tanstack/store` (state only) |

Subpaths:

- `domain` — shared types: locale, localized values, campus, programme, module, place, account, platform, theme, persisted state.
- `data` — the fictional demonstration record.
- `plan` — credit totals, prerequisites, next-semester suggestion.
- `assistant` — local answer engine, fact sheet, summariser, endpoint resolution.
- `auth` — pure user parsing, browser-script source, harvest parsing, progress, login messages. Platform vault/session hooks stay in the app.
- `profile` — privacy model and formatting.
- `onboarding/ics` — calendar generation.
- `i18n` — German and English catalogs and `tx`.
- `state` — app store, persisted aggregate, pure actions.
- `query/keys` — typed query-key factory.
- `format` — re-exports `@ua/format` for app code.

`@ua/core` is an **app kernel**, not a universal domain library. It owns the persisted app-state aggregate and the app's copy. Feature packages may import it; it never imports a feature.

### `@ua/api-client` — fetch clients

| Field | Value |
| --- | --- |
| Language | ES modules (`.js`) + `.d.ts` |
| Runtime | `fetch` only; no storage, DOM, React, or Node built-ins |
| Consumers | Mobile, admin, tools |
| Depends on | `@ua/contracts` |

Subpaths:

- `public` — `health`, `auth`, `campus`, `ilias`, `mail`, `news`, `oidc`, `quiz`, `assist`.
- `admin` — the `/v1/admin/*` calls the dashboard makes, with `credentials: 'same-origin'`.
- `client` — `createClient({ baseUrl, token, fetch, timeoutMs })`, JSON parsing, error normalisation.
- `errors` — `ApiError` with `code`, `status`, `detail`.

The app keeps its platform adapters: base-URL resolution (`src/assistant/endpoints.ts`), token storage (`src/auth/session.ts`), and campus retry policy. The client receives those as arguments.

### `@ua/format` — shared formatting

| Field | Value |
| --- | --- |
| Language | ES modules (`.js`) + `.d.ts` |
| Runtime | Neutral |
| Consumers | All surfaces, tools |
| Depends on | Nothing |

Contents: ISO day/time formatting, German/English months and weekdays, grades, byte sizes, initials, avatar tone, relative time, and `breakable`. Functions take a locale argument; catalogs stay in `@ua/core/i18n`.

### `@ua/design-tokens` — one palette, every renderer

| Field | Value |
| --- | --- |
| Language | `tokens.json` source; generated `.ts`, `.css`, `.js`, `.d.ts` |
| Runtime | Neutral output |
| Consumers | Mobile, admin, dist, site, docs (optional), codegen |
| Depends on | Nothing |

Source tokens:

- colour: `brand`, `brandStrong`, `accent`, `bg`, `surface`, `surfaceMuted`, `text`, `textMuted`, `textSubtle`, `line`, `success`, `warning`, `danger`, `info`
- spacing: `xs`, `sm`, `md`, `lg`, `xl`, `screen`
- radius: `sm`, `md`, `lg`, `pill`
- typography: family stack, sizes, weights
- mark geometry: disc ratios and offsets

Generated outputs and exports:

- `.` → `generated/theme.ts` for React Native, with legacy aliases (`blue = brand`, `light = accent`, `paper = surface`, `mist = bg`, `inkSoft = textMuted`, `mute = textSubtle`) so the app's 54 theme imports do not all change at once.
- `./css` → `generated/tokens.css` for the admin and site.
- `./css-string` → `generated/tokens.js`, exporting a CSS string for the dist service's Node templates.
- `./tokens` → the raw token object for tests and tools.

### `@ua/ui` — React Native and RN Web primitives

| Field | Value |
| --- | --- |
| Language | `.tsx` + `.ts`, no build |
| Runtime | React, React Native, React Native Web |
| Consumers | Mobile, feature packages |
| Depends on | `@ua/core`, `@ua/format`, `@ua/design-tokens` |

Contents: the 35 components the generated catalog classifies as **shared UI**, for example `Screen`, `Card`, `Section`, `Pill`, `Meter`, `Button`, `SearchField`, `FieldLabel`, `Muted`, `Strong`, `InfoRow`, `Mark`, `ControlIcon`, `ToolButton`, `ChoiceCard`, `DropdownPicker`, `Toast`, `PaneMode`, `ResponsiveGrid`, and `AmbientBackground`.

Rules:

- No feature imports.
- No navigation, data fetching, or store writes.
- Platform-specific files (`.web.tsx`) are allowed for visual implementation details.
- The 34 feature components leave `src/components` for the feature packages or the app. The 7 providers stay in the app.

### `@ua/ui-react` — React DOM primitives

| Field | Value |
| --- | --- |
| Language | `.tsx` + `.ts` + CSS Modules |
| Runtime | React DOM |
| Consumers | Admin, future web surfaces |
| Depends on | `@ua/format`, `@ua/design-tokens` |
| Peer deps | `react`, `react-dom` |

Contents:

- Layout: `AppShell`, `Sidebar`, `Topbar`, `PageHeader`, `Section`, `Card`.
- Data: `DataTable`, `Table`, `Pagination`, `StatCard`, `Badge`, `Avatar`, `CopyButton`, `EmptyState`, `Spinner`.
- Forms: `Button`, `Field`, `Input`, `TextArea`, `Select`, `Checkbox`, `Switch`, `Dialog`, `ConfirmDialog`, `Tabs`.
- Feedback: `Toast`, `ErrorState`, `Alert`.
- Theme: `ThemeProvider`, `useTheme`, with localStorage persistence.
- Icons: the SVG set currently in the dashboard's `icons.mjs`.

Rules:

- No API calls, no routing, no global app state.
- Semantic HTML first: `<table>`, `<form>`, `<dialog>`, `<button>`.
- No React Native imports.
- CSS Modules plus the generated token CSS variables.
- Accessibility: labels, focus management, keyboard navigation, and `aria-*` are part of the component contract.
- Tests use Vitest and Testing Library.

### `@ua/server-kit` — Node runtime helpers

| Field | Value |
| --- | --- |
| Language | ES modules (`.js`), Node 22+ |
| Runtime | Node built-ins only, no npm dependencies |
| Consumers | Server; dist via its bundle |
| Depends on | Nothing |

Contents:

- `env` — the `.env` loader (one implementation).
- `http` — `readBody`, `readJsonBody`, `send`, `sendHtml`, `sendAsset`, `attachmentDisposition`.
- `html` — `escapeHtml`, safe attribute helpers.
- `sqlite` — open with WAL, migration helper, transaction helper; no schema.
- `auth` — token hashing, bearer parsing, constant-time comparison, session TTL.
- `static` — allowlisted static file serving with root containment.
- `log` — service-log interface; the database implementation is injected.
- `i18n` — the `t()` lookup used by the assistant prompt.

Server tables, routes, and portal logic stay in `apps/server`. Dist keeps its own schema and data directory.

### `@ua/quiz-content` — content and export shape

| Field | Value |
| --- | --- |
| Language | TypeScript, source only |
| Runtime | Neutral |
| Consumers | `@ua/feature-quiz`, mobile, tools |
| Depends on | `@ua/core` (types only) |

Contents: the 8,844 lines currently under `src/quiz/content`, `src/quiz/figures`, and `src/quiz/maps`, plus the schema/validation used by the PDF pipeline. The server does not import it; it receives the generated `catalog.json`.

### Feature packages

| Package | Core (neutral) | UI (React Native) |
| --- | --- | --- |
| `@ua/feature-mail` | compose draft, recipients, templates, formatting, draft model | inbox hooks, message list, reader, composer, attachment list, template sheet |
| `@ua/feature-ilias` | account identity, tutorial parsing, file metadata, error model | dashboard, course lists, office/PDF viewers, members, headless provider |
| `@ua/feature-quiz` | session, evaluation, labels, progress model | question views, cloze, matching, ordering, map, figure, toolbar |

Layout per feature:

```text
packages/features/mail/
├── src/
│   ├── core/            neutral logic, no React Native or Expo
│   ├── ui/              components, hooks, platform adapters
│   ├── index.ts         public core API
│   └── ui.ts            public UI API
├── test/
├── package.json
├── tsconfig.json
└── README.md
```

Package `exports`:

```json
{
  "exports": {
    ".": "./src/index.ts",
    "./ui": "./src/ui.ts",
    "./package.json": "./package.json"
  }
}
```

Rules:

- `src/core` must stay free of React Native and Expo. It may use `@ua/core`, `@ua/contracts`, `@ua/format`, and `@ua/api-client`.
- `src/ui` may use `@ua/ui`, Expo, and React Native.
- The app imports `@ua/feature-mail` for logic and `@ua/feature-mail/ui` for screens; it never deep-imports `src/`.
- Expo and React Native libraries used by `src/ui` are **peer dependencies** of the feature package. `apps/mobile` owns the installed version. This avoids duplicate native modules in a workspace.
- Feature packages are not used by the server or admin. Shared server parsers live in `@ua/contracts`.
- `@ua/feature-campus` is a later candidate. Campus auth and sync span the app shell and the server; split it only after the first three settle.

## 5. Dependency matrix

### Packages

| ↓ imports → | contracts | core | api-client | format | tokens | ui | ui-react | server-kit | quiz-content |
| --- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `@ua/contracts` | — | | | | | | | | |
| `@ua/core` | ✓ | — | | ✓ | | | | | |
| `@ua/api-client` | ✓ | | — | | | | | | |
| `@ua/format` | | | | — | | | | | |
| `@ua/design-tokens` | | | | | — | | | | |
| `@ua/ui` | | ✓ | | ✓ | ✓ | — | | | |
| `@ua/ui-react` | | | | ✓ | ✓ | | — | | |
| `@ua/server-kit` | | | | | | | | — | |
| `@ua/quiz-content` | | ✓ | | | | | | | — |
| `@ua/feature-mail` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | | | |
| `@ua/feature-ilias` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | | | |
| `@ua/feature-quiz` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | | | ✓ |

### Apps and tools

| ↓ may import → | contracts | core | api-client | format | tokens | ui | ui-react | server-kit | quiz-content | features |
| --- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `apps/mobile` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | | | ✓ | ✓ |
| `apps/admin` | ✓ | | ✓ | ✓ | ✓ | | ✓ | | | |
| `apps/server` | ✓ | | | ✓ | | | | ✓ | | |
| `apps/dist` | | | | ✓ | ✓ | | | ✓ | | |
| `apps/site` | | | | | ✓ | | | | | |
| `tools/*` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

Rules:

1. A package never imports an app.
2. An app never imports another app.
3. `contracts` and `format` are leaves.
4. `core` never imports a UI runtime or a feature.
5. `ui` and `ui-react` are siblings and never import each other.
6. `server-kit` is Node-only and never imports a UI package.
7. The admin never imports React Native, `@ua/ui`, or a feature package.
8. The server never imports `@ua/core`, `@ua/ui`, or a feature package.

## 6. Import rules and enforcement

- **Package `exports` maps.** Every package declares explicit subpaths; deep imports fail resolution.
- **TypeScript paths.** The app keeps `@/*` → `apps/mobile/*`. Packages use their own names. The root-wide `@/*` alias disappears.
- **ESLint restrictions.** `no-restricted-imports` or `import/no-restricted-paths` encodes the matrix per workspace.
- **`check:boundaries`.** A `dependency-cruiser` run (or a small Node script) fails on:
  - a package importing an app,
  - an app importing another app,
  - `contracts`, `format`, or `core` importing React/RN/Expo/DOM/Node,
  - `ui` importing `ui-react` or vice versa,
  - the admin importing a React Native package or a feature package,
  - a tool importing an app path that is not an `exports` entry.
- **Generated-file checks.** Every generator supports `--check`.
- **CI.** A `check` workflow runs typecheck, lint, boundaries, generated checks, and tests on every pull request.

Illustrative neutral-package rule:

```js
{
  files: ['packages/core/**/*.{ts,tsx}', 'packages/contracts/**/*.js', 'packages/format/**/*.js'],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [
        { group: ['react', 'react-native', 'react-native/*', 'expo', 'expo-*', '@expo/*'],
          message: 'Neutral packages must not depend on a UI runtime.' },
        { group: ['node:*'],
          message: 'Neutral packages must not depend on Node built-ins.' },
        { group: ['@/apps/*', '../../apps/*', '@ua/feature-*'],
          message: 'Packages must not import an app or a feature from the kernel.' },
      ],
    }],
  },
}
```

## 7. Mapping from today's folders

| Today | Target | First pass? |
| --- | --- | --- |
| `app/` | `apps/mobile/app/` | Yes |
| `src/components/ui.tsx` and the other shared primitives | `packages/ui/src/` | Yes |
| `src/components` feature components | `packages/features/*/src/ui/` or `apps/mobile/src/components/` | Yes |
| `src/data`, `src/domain`, `src/assistant`, `src/i18n`, `src/labels.ts`, `src/types.ts`, `src/state` pure parts | `packages/core/src/` | Yes |
| `src/text.ts` pure formatting | `packages/format/` + `packages/core/src/format/` re-export | Yes |
| `src/auth` pure modules | `packages/core/src/auth/` | Yes |
| `src/auth` vault/session/biometrics/`use-*` | `apps/mobile/src/auth/` | Yes |
| `src/campus` URL builders and DTO normalisers | `packages/contracts/campus.js` | Yes |
| `src/campus` SQLite/AsyncStorage cache | `apps/mobile/src/platform/campus-db/` | Yes |
| `src/mail` pure modules | `packages/features/mail/src/core/` | Yes |
| `src/mail` components and hooks | `packages/features/mail/src/ui/` | Yes |
| `src/ilias` pure modules | `packages/features/ilias/src/core/` | Yes |
| `src/ilias` components and hooks | `packages/features/ilias/src/ui/` | Yes |
| `src/quiz/content`, `figures`, `maps` | `packages/quiz-content/` | Yes |
| `src/quiz` evaluation/session/labels/types | `packages/features/quiz/src/core/` | Yes |
| `src/quiz` components and progress | `packages/features/quiz/src/ui/` | Yes |
| `src/query/keys.ts` | `packages/core/src/query/` | Yes |
| `src/query/client.tsx`, queries, mutations | `apps/mobile/src/query/` | Yes |
| `src/hooks` | `apps/mobile/src/hooks/` | Yes |
| `src/documents`, `src/nfc`, `src/vpn` native/engine/hooks | `apps/mobile/src/platform/` | Yes |
| `src/theme.ts` | `packages/design-tokens/generated/theme.ts` + thin app adapter | Yes |
| `server/` minus dashboard | `apps/server/` | Yes |
| `server/dashboard/` | `apps/admin/` (vanilla first, React in Phase 5) | Yes |
| `dist-service/` | `apps/dist/` | Yes |
| `site/` | `apps/site/` | Yes |
| `docs-site/` | `apps/docs/` (own install) | Yes |
| `scripts/` | `tools/` | Yes |
| `modules/university-vpn/` | `apps/mobile/modules/university-vpn/` | Yes, with the app move |
| `plugins/` | `apps/mobile/plugins/` | Yes, with the app move |
| `docs/` | `docs/` | Unchanged |

Temporary re-export files at old paths are allowed for one pull request per domain, then deleted.

## 8. Generated artifacts

| Artifact | Producer | Consumers |
| --- | --- | --- |
| `packages/design-tokens/generated/*` | `tools/codegen/generate-tokens.mjs` | All surfaces |
| `apps/mobile/src/components/catalog.generated.ts` | `tools/codegen/generate-component-catalog.mjs` | Dev screen |
| `apps/admin/src/generated/component-catalog.json` | same | Admin **Komponenten** page |
| `docs/engineering/component-catalog.md` | same | Docs site |
| `apps/server/data/quiz/catalog.json` | `tools/quiz/export-quiz-catalog.ts` | Server seed and admin quiz |
| `apps/site/assets/tokens.css` | `tools/codegen/generate-tokens.mjs` | Site |

The component catalog generator owns one in-memory model and writes the app, admin, and docs outputs. If a fourth consumer appears, emit one shared JSON and let each consumer adapt it. Do not hand-maintain the outputs.

The admin no longer needs a vendor copy or an import map: Vite resolves workspace packages at build time.

## 9. Runtime and deployment

| Surface | Development | Release |
| --- | --- | --- |
| Mobile | `cd apps/mobile && npx expo start` | EAS build from `apps/mobile`; `npx expo export --platform web` writes `apps/mobile/dist` |
| Admin | `cd apps/admin && bun run dev`; Vite proxies `/v1` and `/admin` to `127.0.0.1:8787` | `bun run build` writes `apps/admin/dist`; the server serves it at `/admin` from `ADMIN_DIST_DIR` |
| Server | `node apps/server/index.mjs` from the repo root, root `.env` | Same command; plain Node, workspace JS packages resolved from the root install. Optional single-file bundle if a host should receive only `apps/server`. |
| Dist | `node apps/dist/server.mjs` with workspace links | `bun build apps/dist/server.mjs --target=node --outfile=apps/dist/dist/server.mjs`; deploy that file plus the data directory |
| Site | `python3 -m http.server 4173 --directory apps/site` | GitHub Pages copies `apps/site` over the docs build |
| Docs | `cd apps/docs && bun install && bun run start` | `bun run build`; own install and lockfile |

The server serves the admin build, not its source. During Phases 1–4, before the React rewrite, it can keep serving the vanilla `apps/admin/public` directory; Phase 5 switches `ADMIN_DIST_DIR` to `apps/admin/dist` and removes the source serving.

## 10. Admin architecture

| Concern | Choice | Why |
| --- | --- | --- |
| Build | Vite | Fast, standard React setup, workspace package resolution, static output the existing server can serve |
| UI runtime | React 19 + React DOM | Semantic HTML for tables, forms, dialogs, and keyboard navigation |
| Routing | TanStack Router | Type-safe routes and search params for filters; same ecosystem as Query and Store |
| Server state | TanStack Query | Caching, retries, invalidation, and loading states without a global mutable runtime |
| Local state | React state + URL search params | The old `runtime.mjs` global object disappears |
| Components | `@ua/ui-react` | One admin design system, reusable by future web surfaces |
| Styling | CSS Modules + token variables | No new CSS framework; component styles stay local |
| Auth | Existing `HttpOnly` admin cookie | Same-origin; Vite proxy makes development identical |
| API | `@ua/api-client/admin` | Typed endpoints, one error model |
| Tests | Vitest + Testing Library + jsdom | Component and route tests in the same toolchain as Vite |
| Forms | Native controlled forms | No form library until a form justifies one |

Route layout:

```text
src/routes/
  __root.tsx          AppShell, theme, error boundary
  index.tsx           overview
  users.tsx           list, filters in search params
  users.$id.tsx       detail with tabs
  devices.tsx
  devices.$id.tsx
  news.tsx
  ilias.tsx
  audit.tsx
  logs.tsx
  system.tsx
  components.tsx
  quiz.tsx
```

The rewrite order is chosen by risk and value: shell + overview + system + logs + audit + news + devices + ILIAS + components, then users and the 1,214-line user detail page. Every page is ported with its API calls and a smoke test; the vanilla page is deleted in the same pull request.

## 11. Testing and checks

| Layer | Tests | Runner |
| --- | --- | --- |
| `@ua/contracts` | Catalog completeness, URL builders, DTO normalisers, declaration smoke test | `node --test` |
| `@ua/format` | Locale fixtures for dates, grades, bytes, initials | `node --test` |
| `@ua/core` | The ten app-module tests currently under `scripts/*.test.mjs`; the eight tool tests stay in `tools/` | `node --test` with `tsx` |
| `@ua/api-client` | Error mapping, JSON parsing, fake `fetch` | `node --test` |
| `@ua/ui` | No unit tests initially; Dev → Komponenten previews and an Expo web export | `expo export` |
| `@ua/ui-react` | Render, keyboard, focus, DataTable, form, theme | Vitest + Testing Library |
| `@ua/feature-*` | Core logic; UI typecheck and app smoke | `node --test` / `tsc` |
| `apps/mobile` | Typecheck, lint, web export; existing headless/Playwright checks stay in `tools/campus` | `tsc`, `expo export` |
| `apps/server` | Existing 11 test files, moved with the code | `node --test` |
| `apps/admin` | Route smoke tests with a mocked API client; component tests | Vitest + Testing Library |
| `apps/dist` | Existing test plus a bundle smoke test | `node --test` |
| `tools` | Existing build, tunnel, secret, quiz-pipeline tests | `node --test` |
| Whole repo | `check:types`, `check:lint`, `check:boundaries`, `check:generated`, `check:tests` | root scripts |

The root aggregate:

```bash
bun run check
# = check:types && check:lint && check:boundaries && check:generated && check:tests
```

Add `.github/workflows/check.yml` with the same commands. The existing Pages workflow remains deployment-only.

## 12. What is intentionally not shared

| Not shared | Why |
| --- | --- |
| React Native components with the admin | The admin uses React DOM and semantic HTML. A shared implementation would force RN Web into a desktop console. |
| Feature UI with the server or admin | Features are app vertical slices. Server adapters and operator CRUD have different responsibilities. |
| TanStack Store with the server | The store is device state; the server has SQLite rows. |
| SQLite schema between server and dist | Separate deployments, separate data, separate migrations. |
| Docusaurus with the app workspace | Avoids duplicate React and a heavy dependency in the mobile install. |
| i18n catalogs across all surfaces | Vocabularies barely overlap. Share the `tx` mechanism and error codes; keep product copy local. |
| A universal UI framework (Tamagui, NativeWind, etc.) | It would rewrite the design system to solve a sharing problem that tokens plus two renderers already solve. |
| `@ua/feature-campus` in the first pass | Campus auth and sync span the app shell and server; split it after the first three features settle. |

## 13. Conventions

- Package names: `@ua/<name>`, `"private": true`, `"version": "0.0.0"`.
- Workspace dependencies: `"workspace:*"`.
- Neutral packages: `.js` + `.d.ts` (`contracts`, `api-client`, `format`) or `.ts` source (`core`, `quiz-content`). No `dist/` build output.
- UI packages: `.tsx` source. Metro or Vite transpiles them; no package build.
- Node packages: `.js`, `"type": "module"`, Node 22+.
- Admin: Vite + React 19 + TypeScript; CSS Modules; Vitest.
- One `package.json` per app and package, with `start`, `test`, and `typecheck` where meaningful. Declare a no-op rather than omitting a script, so `bun run --filter '*' test` has a uniform target.
- Singleton libraries (`react`, `react-dom`, `react-native`, `@tanstack/*`) are peer dependencies in packages; the consuming app owns the installed version. One React and one React Native version in the workspace.
- Root scripts orchestrate; they do not contain product logic.
- Every generator supports `--check`.
- Every package has a short `README.md` stating purpose, consumers, and forbidden imports.
