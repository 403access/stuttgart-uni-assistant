# ADR-001: Modular monorepo with a dual-renderer design system

- **Status:** Accepted
- **Date:** 2026-10-25
- **Deciders:** Oliver Molnar
- **Supersedes:** the "Option B" recommendation in the first draft of this proposal

## Context

The repository has six runnable surfaces (mobile app, assistant server, operator dashboard, distribution service, marketing site, docs site) and one local Expo module. They are already independent at runtime, but they share a single package manifest and duplicate contracts, formatting, tokens, and runtime plumbing.

The first analysis proposed Option B: a shared kernel with a vanilla, no-build admin. Three decisions have since been made:

1. The admin dashboard **may gain a build step**.
2. The distribution service **may be bundled before deployment**.
3. Feature-level packages (mail, ILIAS, quiz) are **wanted now**, not deferred.

Those decisions remove the constraints that made a React admin and feature packages unattractive. This ADR records the target architecture.

## Decision

Adopt a **Bun-workspace modular monorepo** with:

- a dependency-free **contracts** layer shared by app, server, admin, and tools;
- a platform-neutral **kernel** for app domain logic and state;
- a **dual-renderer design system**: React Native for the app, React DOM for the admin, both driven by one token source;
- **vertical feature packages** for mail, ILIAS, and quiz;
- a **React + Vite admin** that consumes shared tokens, formatting, contracts, the admin API client, and the React DOM UI package;
- a **bundled distribution service** that shares Node helpers without losing its standalone deployment;
- independently deployable apps with enforced one-way dependencies.

### Target graph

```text
apps/mobile ──> feature-mail / feature-ilias / feature-quiz
     │                    │
     │                    ├──> @ua/ui            (React Native / RN Web)
     │                    ├──> @ua/core          (domain, state, i18n)
     │                    └──> @ua/api-client
     ├──> @ua/core
     ├──> @ua/contracts
     ├──> @ua/format
     ├──> @ua/design-tokens
     └──> @ua/quiz-content

apps/admin ──> @ua/ui-react   (React DOM)
     ├──> @ua/api-client/admin
     ├──> @ua/contracts
     ├──> @ua/format
     └──> @ua/design-tokens

apps/server ──> @ua/contracts
     ├──> @ua/server-kit
     └──> @ua/format

apps/dist ──> @ua/server-kit
     ├──> @ua/format
     └──> @ua/design-tokens   (CSS string, inlined at bundle time)

apps/site ──> @ua/design-tokens (generated CSS)

packages/* ──> never import apps
apps/*     ──> never import another app
```

## Package set

| Package | Kind | Consumers |
| --- | --- | --- |
| `@ua/contracts` | Neutral JS + `.d.ts`; API catalog, error codes, C@MPUS/mail/ILIAS/OIDC/news/quiz/admin DTOs and pure parsers | App, server, admin, tools |
| `@ua/core` | Neutral TypeScript; domain types, demonstration record, plan, auth primitives, profile, onboarding, i18n, formatting re-export, app state, query keys, assistant | App, feature packages, tools |
| `@ua/format` | Neutral JS + `.d.ts`; dates, grades, bytes, initials | All surfaces |
| `@ua/design-tokens` | Token source; generated TS, CSS, CSS string, JS | All surfaces |
| `@ua/api-client` | Neutral JS + `.d.ts`; public and admin clients | App, admin, tools |
| `@ua/ui` | React Native / RN Web primitives | App, feature packages |
| `@ua/ui-react` | React DOM primitives, icons, DataTable, forms, theme | Admin, future web surfaces |
| `@ua/server-kit` | Node-only env, HTTP, HTML, SQLite, auth, static serving | Server, dist (bundled) |
| `@ua/quiz-content` | Quiz content, schema, export shape | App, feature-quiz, tools |
| `@ua/feature-mail` | Mail core + RN UI/hooks | App |
| `@ua/feature-ilias` | ILIAS core + RN UI/hooks | App |
| `@ua/feature-quiz` | Quiz core + RN UI/hooks | App |

`@ua/feature-campus` is a later candidate. Campus auth and sync span the app shell and the server, so splitting it before the other three settle would create a package that imports half the app.

## Why a React DOM admin rather than React Native Web

First, the app side is already React Native Web: `apps/mobile` builds iOS, Android, **and** the browser from the same React Native source. Nothing in this decision changes that. The question is whether the **admin dashboard** should also be built with React Native Web.

The admin is a different product surface: a dense desktop operator console with tables, filters, forms, keyboard navigation, and semantic HTML. React Native Web can render it, but it is a compatibility layer designed for mobile-first interfaces, not a replacement for the DOM.

| Concern | RN Web admin | React DOM admin |
| --- | --- | --- |
| Component reuse with the app | Full reuse of `@ua/ui` | Shares tokens, formatting, contracts, API client; UI is a second renderer |
| Tables | No table primitive; flex rows, custom sorting, selection, sticky headers, virtualization | Semantic `<table>`, DOM table libraries, native column and row semantics |
| Forms | `TextInput` maps to an input, but native form semantics, validation, autofill, and field grouping need work | Native `<form>`, labels, validation, autofill, password managers |
| Accessibility and keyboard | Partial ARIA mapping; focus order and roles are manual | Semantic HTML, focus management, screen-reader behaviour |
| Layout and CSS | Flexbox only; no CSS grid, media queries, print styles, or normal CSS tooling | CSS grid, media queries, print, CSS Modules, container queries |
| Ecosystem | React Native libraries | Radix, TanStack Table, React Aria, Testing Library, browser devtools |
| Runtime and deployment | RN Web runtime and style layer; couples admin builds to Expo/RN upgrades | Plain React + Vite; independent release cadence |
| Bundle | Larger baseline for a UI that uses no native capability | Smaller baseline; only the components it needs |
| Testing | React Native testing setup | jsdom + Testing Library, the normal web path |
| Contributor pool | React Native experience required | Standard React/web experience |
| Mobile/tablet admin use | Good | Usable, but not optimised |

The dual-renderer model shares the **design contract** (tokens, spacing, states, typography) and the **headless logic** (contracts, API client, formatting), not the component implementation. That is the right trade-off for two interfaces with different interaction models.

### When RN Web would win

Switch the admin to RN Web if most of these become true:

- the admin is mostly mobile-like cards and simple CRUD, not dense tables,
- the team is React Native-only and does not want a second web stack,
- reusing `@ua/ui` component-for-component is more valuable than desktop ergonomics,
- the admin must run on tablets/phones as a first-class target,
- and the admin can share the app's Expo release cadence.

### A cheap way to test the assumption

Before Phase 5, build the **Users table** twice in a one-to-two-day spike: once with `@ua/ui` + React Native Web, once with `@ua/ui-react` + React DOM. Compare the time to a usable table, keyboard behaviour, accessibility, and the diff size. If RN Web is clearly better, the decision can be reversed before the rewrite starts; the kernel, contracts, tokens, API client, and feature packages are unaffected either way.

## Why bundle the distribution service

The service must stay deployable on its own host with its own data directory. A `bun build --target=node` bundle gives it shared source code while keeping that property: the release artifact is one `server.mjs` plus data. It does not depend on the assistant server's process, port, or database.

## Why feature packages now

Mail, ILIAS, and quiz each combine pure logic, platform hooks, and UI. Keeping them in one `src/` tree makes the app a single layer and hides the boundaries between features. A package per feature:

- gives each feature a public API instead of deep imports,
- makes feature logic testable without the app shell,
- allows the feature UI to evolve without touching routes,
- and keeps the app screens as thin compositions.

Feature packages are not shared with the server. Server-side mail, ILIAS, and C@MPUS adapters have different responsibilities (IMAP/SMTP, HTML scraping, portal sessions). Anything that is genuinely shared across runtimes goes into `@ua/contracts`, not a feature package.

## Consequences

**Positive**

- One source for API paths, error codes, C@MPUS URLs, token parsing, and portal DTOs.
- One palette source, generated for React Native, React DOM, CSS, and server-rendered HTML.
- The admin gets a real component library, type-safe routes, and a tested data layer.
- Feature boundaries are enforceable and visible in the import graph.
- The distribution service shares code without a shared process.
- CI can reject boundary violations and stale generated files.

**Negative**

- The admin rewrite is the largest single work item.
- Two UI renderers must be kept visually aligned through tokens and review.
- More packages and manifests to maintain.
- The dist release gains a bundle step.
- The team must learn Vite, React DOM, and the boundary rules.

**Neutral**

- The number of deployables does not change.
- The assistant server stays plain Node, unbundled, and free of external npm dependencies.
- The docs remain canonical in `docs/`.
- The app's runtime behaviour is unchanged by the restructuring itself.

## Execution

The architecture is reached in phases, not in one branch:

1. Workspace skeleton.
2. Contracts, formatting, tokens, core.
3. `ui`, `api-client`, `server-kit`, dist bundle.
4. Feature packages (mail, ILIAS, quiz).
5. React admin with Vite and `ui-react`.
6. Cleanup, CI, boundary enforcement.

The detailed plan is in [04-migration-plan.md](04-migration-plan.md). The package catalog and rules are in [02-target-modules.md](02-target-modules.md).
