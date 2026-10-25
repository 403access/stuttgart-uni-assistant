# Repository modularization

This folder analyses how the repository is structured today, proposes a module layout shared by the Expo app (iOS, Android, web), the operator dashboard, the distribution service, the marketing site, and the assistant server, and records the migration.

The direction is decided: [ADR-001](05-adr-001-target-architecture.md) accepts a modular monorepo with a dual-renderer design system, a React admin, feature packages, and a bundled distribution service. Phases 1–4 are in place and Phase 5 has started: the React admin shell, theme, login, and overview are built with Vite and `@ua/ui-react`. The remaining pages still use the vanilla dashboard until they are ported. Feature UI remains in the app until its services and primitives are decoupled.

## Target architecture

**A Bun-workspace modular monorepo with a dependency-free contracts layer, a platform-neutral core, a dual-renderer design system (React Native for the app, React DOM for the admin), vertical feature packages, and independently deployable apps.**

```text
apps/
  mobile/        Expo app (iOS, Android, web)
  admin/         React + Vite operator dashboard
  server/        assistant + admin API (plain Node ESM)
  dist/          iOS distribution service (bundled for deployment)
  site/          static marketing and legal pages
  docs/          Docusaurus, separate install
packages/
  core/          domain, data, state, i18n, assistant
  contracts/     API catalog, errors, C@MPUS/mail/ILIAS/OIDC/news/quiz/admin contracts
  api-client/    public and admin fetch clients
  format/        dates, grades, bytes, initials
  design-tokens/ one palette, generated TS/CSS/JS
  ui/            React Native / RN Web primitives
  ui-react/      React DOM primitives for the admin
  server-kit/    Node env, HTTP, SQLite, auth, static serving
  quiz-content/  quiz content and export schema
  features/
    mail/        @ua/feature-mail
    ilias/       @ua/feature-ilias
    quiz/        @ua/feature-quiz
tools/           codegen, release, dev, product, quiz pipeline, test support
docs/            canonical documentation
```

The detailed package catalog, dependency matrix, and target tree are in [target modules](02-target-modules.md). The decision record is [ADR-001](05-adr-001-target-architecture.md).

## Reuse map

| Shared fact | Single source | Consumers |
| --- | --- | --- |
| API operation list, error codes, portal DTOs | `@ua/contracts` | App, server, admin, tools |
| C@MPUS URLs and normalisers | `@ua/contracts/campus` | App, server |
| Mail, ILIAS, OIDC, news, quiz shapes | `@ua/contracts/*` | App, server, admin, tools |
| Palette, spacing, radii | `@ua/design-tokens` | App, admin, dist, site |
| Dates, grades, bytes, initials | `@ua/format` | All surfaces |
| Public and admin API calls | `@ua/api-client` | App, admin, tools |
| `.env`, HTTP, HTML escaping, SQLite bootstrap | `@ua/server-kit` | Server, dist (bundled) |
| Shared mobile visual primitives | `@ua/ui` | App, feature packages |
| Shared admin visual primitives | `@ua/ui-react` | Admin, future web surfaces |
| Quiz content and export shape | `@ua/quiz-content` | App, feature-quiz, tools |
| Mail / ILIAS / quiz vertical slices | `@ua/feature-*` | App |

## Why this direction

- The expensive duplication is not in screens; it is in **contracts, formatting, tokens, API calls, and runtime plumbing**. The C@MPUS URL builders exist twice, the API catalog lists 42 operations while the app fallback lists 19, and the palette appears in five stylesheets with different names.
- The admin dashboard is 17k lines of vanilla ES modules. A React + Vite rewrite gives it typed routes, a tested data layer, reusable tables and forms, and a real component library. The build step is now allowed, so this is the right time.
- The distribution service is deliberately standalone. Bundling it with `bun build --target=node` lets it share source while remaining one deployable file plus data.
- Feature packages make mail, ILIAS, and quiz visible vertical slices with a public API instead of deep imports into `src/`.
- Expo SDK 58 has first-class monorepo support. Metro, typed routes, and platform extensions work in a workspace without custom Metro configuration.

## What must not change

- `apps/mobile/app/` stays the Expo Router route directory.
- `docs/` stays the canonical documentation source rendered by Docusaurus.
- `apps/site/` stays plain HTML, CSS, and JS.
- The assistant server stays a plain Node ESM process. It may import dependency-free workspace packages, but it gets no framework and no build step.
- The distribution service stays independently deployable. It gets a bundle step, not a runtime dependency on the assistant server.
- The demonstration record stays fictional, and the privacy boundary in [security and privacy](../security-and-privacy.md) is unchanged.

## Documents

| Document | Question it answers |
| --- | --- |
| [ADR-001](05-adr-001-target-architecture.md) | The accepted target architecture and why |
| [Current state](01-current-state.md) | What exists today, how the parts depend on each other, where code is duplicated, and which constraints limit the work |
| [Target modules](02-target-modules.md) | Which packages exist, what each contains, who may import what, and what the target tree looks like |
| [Options and decision](03-options-and-decision.md) | The three directions, how they scored, the recommendation, and the decisions taken |
| [Migration plan](04-migration-plan.md) | In which order to move, what "done" means per phase, and how to keep the app shippable throughout |

## Status

| Item | Value |
| --- | --- |
| Analysis baseline | `main` at `d147414`, working tree with the in-progress quiz catalog and quiz-sync work |
| Decision | [ADR-001](05-adr-001-target-architecture.md) accepted |
| Code moved | Phases 1–4 complete: workspace, kernel, design tokens, server kit, API client, shared UI, bundled dist service, and the feature cores. |
| Files added | The workspace manifests, the shared packages, the generators, and these documents |
| Next step | Phase 5: port the remaining admin pages, then switch `ADMIN_DIST_DIR` to the Vite build and remove `public/` |

The three questions from the first draft are answered:

1. The admin **may** gain a build step. The target is React + Vite.
2. The distribution service **may** be bundled. It shares `server-kit`, `format`, and tokens.
3. Feature packages **are wanted now**. Mail, ILIAS, and quiz become vertical packages.

The remaining defaults (one lockfile, Bun as the package manager, unbundled server, CI checks) are recorded in [the decision table](03-options-and-decision.md#8-remaining-defaults). They can be confirmed in Phase 0 without changing the architecture.
