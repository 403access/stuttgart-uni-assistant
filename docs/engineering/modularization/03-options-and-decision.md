# Options and decision

The direction is decided. [ADR-001](05-adr-001-target-architecture.md) accepts **Option C: a modular monorepo with a dual-renderer design system, a React admin, feature packages, and a bundled distribution service**. This document records how the options were compared and which defaults remain.

## 1. Criteria

| Criterion | Weight | What it measures |
| --- | ---: | --- |
| Reuse benefit | 35% | How much logic, contract, UI, and token duplication disappears |
| Maintainability | 25% | How easy it is to change a shared fact once and trust the result |
| Deployment stability | 15% | Whether every surface keeps deploying independently |
| Migration risk | 10% | Chance of breaking the app, native builds, or a standalone deployment |
| Tooling complexity | 10% | New build steps, bundlers, and configuration a contributor must learn |
| Time to first benefit | 5% | How quickly the first duplication is removed |

Scores are 1 (poor) to 5 (excellent).

## 2. Option A — Shared kernel only

**Shape:** Bun workspace, move apps and tools into folders, extract `@ua/core`, `@ua/contracts`, `@ua/format`, and `@ua/design-tokens`. Leave the dashboard, dist service, site, and feature UI as they are.

| Pro | Con |
| --- | --- |
| Removes the highest-value duplication: API and C@MPUS contracts, palette, formatting | The dashboard still has its own DOM, format, theme, and API copies |
| Lowest migration risk | No feature boundaries; the app remains a single `src/` tree |
| Server and dist keep their exact deployment | `env`/`http`/`html` duplication remains |
| Two to three weeks | No React admin, no shared admin UI |

**Best if:** the only goal is a clean contract layer.

## 3. Option B — Kernel plus web platform packages

**Shape:** Option A plus `@ua/api-client`, `@ua/server-kit`, `@ua/ui`, and `@ua/quiz-content`. The admin stays vanilla and consumes shared DOM helpers and tokens. Dist shares helpers through a bundle.

| Pro | Con |
| --- | --- |
| Removes contract, token, format, DOM, and runtime-plumbing duplication | The admin stays a 17k-line vanilla codebase |
| No React rewrite; lower risk than C | No feature packages; mail, ILIAS, and quiz stay in one `src/` tree |
| Dist gets shared code and stays standalone | Shared admin UI is limited to CSS and DOM helpers |
| Can be reached in four to six weeks | The admin's data layer and routing stay ad hoc |

**Best if:** the build step is not allowed and the admin should not be rewritten.

## 4. Option C — Dual-renderer design system and React admin (chosen)

**Shape:** Option A plus `@ua/api-client`, `@ua/server-kit`, `@ua/ui`, `@ua/ui-react`, `@ua/quiz-content`, and vertical feature packages. The admin is rewritten with React + Vite and consumes `@ua/ui-react`. Dist is bundled. Feature packages own mail, ILIAS, and quiz.

| Pro | Con |
| --- | --- |
| Maximum reuse without forcing React Native into the admin | The admin rewrite is the largest single work item |
| One design contract, two appropriate renderers | Two UI implementations must be kept aligned through tokens and review |
| Feature packages give mail, ILIAS, and quiz real boundaries | More manifests and dependency rules |
| Admin gets typed routes, query caching, a tested data layer, and shared tables/forms | Adds Vite, Vitest, and React DOM to the toolchain |
| Dist shares code and remains one deployable file | Dist release gains a bundle step |
| The app, server, and admin all use the same contracts | Requires discipline; the boundary check is mandatory |

**Chosen because:** the three constraints that made C unattractive are gone. The admin may gain a build step, the dist service may be bundled, and feature packages are wanted now.

### Variant C-RNW — React Native Web for the admin

A single `@ua/ui` rendered by React Native Web in the app and the admin would maximise component reuse. It was considered and rejected for the first pass:

- the admin is table-, form-, and keyboard-heavy, and RN Web has no semantic table or full form model;
- the admin would inherit the RN Web runtime and the Expo/RN upgrade cadence for a UI that uses no native capability;
- the DOM ecosystem (TanStack Table, Radix, React Aria, Testing Library) is the natural fit for an operator console;
- the app already covers web with RN Web, so this is about one desktop surface, not about web support.

C-RNW remains a valid future direction if the admin becomes mobile-like. See [ADR-001](05-adr-001-target-architecture.md#when-rn-web-would-win) for the conditions and a one-to-two-day spike that can test the assumption before Phase 5.

## 5. Scoring

| Criterion | A | B | C |
| --- | ---: | ---: | ---: |
| Reuse benefit (35%) | 3 | 4 | 5 |
| Maintainability (25%) | 3 | 4 | 5 |
| Deployment stability (15%) | 5 | 5 | 4 |
| Migration risk (10%) | 5 | 4 | 2 |
| Tooling complexity (10%) | 5 | 5 | 3 |
| Time to first benefit (5%) | 5 | 4 | 2 |
| **Weighted score** | **3.80** | **4.25** | **4.20** |

B scores marginally higher because it avoids the admin rewrite. C is the target because the decision is not only about this quarter: the admin is a long-lived surface, and the feature packages make the app's vertical slices explicit. B is preserved as the **checkpoint architecture**: after Phase 3 the repository is healthy at B, and Phase 4–5 add features and the React admin without changing the earlier packages.

## 6. Recommendation

**Target Option C. Execute it through the Option B checkpoint.**

That means:

1. Build the workspace and shared kernel first. The kernel, contracts, tokens, API client, and server kit are identical in B and C.
2. Ship the B checkpoint: app, server, dist, and a still-vanilla admin running from the new tree.
3. Add feature packages for mail, ILIAS, and quiz.
4. Rewrite the admin with React + Vite and `@ua/ui-react`.
5. Delete the vanilla dashboard and enforce the boundaries in CI.

If the admin rewrite is cancelled after the checkpoint, the repository is still in a good state. That is deliberate: the target is ambitious, but the fallback is not a failed migration.

## 7. Decision record

| Field | Value |
| --- | --- |
| Date | 2026-10-25 |
| Decision | [ADR-001: Modular monorepo with a dual-renderer design system](05-adr-001-target-architecture.md) |
| Option chosen | C |
| Decided by | Oliver Molnar |
| D1 — admin build step | **Yes.** React + Vite is the target. |
| D2 — dist bundling | **Yes.** `bun build --target=node`; one file plus data. |
| D3 — feature packages now | **Yes.** Mail, ILIAS, and quiz. Campus is a later candidate. |
| Revisit trigger | The admin rewrite proves disproportionately expensive, or the team drops below one regular frontend maintainer. In that case, stop at the B checkpoint. |
| Follow-up | Phase 0 baseline and Phase 1 workspace pull request. |

## 8. Remaining defaults

These were not explicitly answered. They are the recommended defaults and can be confirmed in Phase 0 without changing the architecture.

| # | Decision | Recommended default | Why |
| --- | --- | --- | --- |
| D4 | One lockfile or docs separate? | One root lockfile; `apps/docs` keeps its own install | Avoids hoisting Docusaurus React into the app; keeps the Pages workflow simple |
| D5 | Package manager | Bun | `bun.lock` already exists; workspaces and the docs workflow use Bun |
| D6 | Server build | Unbundled, no external npm dependencies | Preserves debuggability and the current deploy model |
| D7 | CI | Add a `check` workflow | The restructuring moves hundreds of files |
| D8 | Move all apps at once? | Yes, in Phase 1 | Two path migrations cost more than one |
| D9 | Platform forks | Keep `.web.tsx`/`.native.tsx` | Metro resolution is a feature, not debt |
| D10 | Component catalog output | One generator, app/admin/docs outputs; shared JSON only if a fourth consumer appears | Matches the existing generated-catalog pattern |
| D11 | Admin router | TanStack Router | Type-safe search params for filters; same ecosystem as Query and Store |
| D12 | Admin rewrite style | Page-by-page commits, one cutover, delete each vanilla page in the same PR | Avoids a long-lived hybrid |
| D13 | Feature scope | Mail, ILIAS, quiz first; campus later | Campus auth/sync spans the app shell and server |

## 9. Consequences of Option C

**Positive**

- One API catalog, one set of portal URL builders, one error vocabulary.
- One palette source for React Native, React DOM, CSS, and server-rendered HTML.
- A real admin component library, typed routes, and a tested data layer.
- Mail, ILIAS, and quiz have public APIs and independent tests.
- The dist service shares code and remains standalone.
- CI can enforce the dependency matrix.

**Negative**

- A multi-week migration and a substantial admin rewrite.
- Two UI renderers to keep aligned.
- Vite, Vitest, and React DOM join the toolchain.
- More packages and manifests.
- The team must learn and follow the boundary rules.

**Neutral**

- The number of deployables does not change.
- The assistant server stays plain Node and unbundled.
- The docs stay canonical in `docs/`.
- The app's runtime behaviour is unchanged by the restructuring itself.

## 10. If the migration stops

Stopping is allowed at defined checkpoints:

| Checkpoint | State | Safe? |
| --- | --- | --- |
| After Phase 1 | Workspace folders, no shared packages | Yes, but no reuse yet |
| After Phase 2 | Contracts, format, tokens, core | Yes, high-value duplication removed |
| After Phase 3 | UI, API client, server kit, dist bundle | Yes, the B architecture is complete |
| After Phase 4 | Feature packages | Yes, the app is modular |
| After Phase 5 | React admin | Yes, the C architecture is complete |

Do not stop in the middle of Phase 5 with the vanilla and React admin both serving traffic. Choose a cutover and finish it.
