# Funding and grants

This section answers one question: **can the University Assistant demonstration attract grant funding, and if so, from where?**

It is written for the builder of this repository — one student at the University of Stuttgart with a working Expo prototype, no registered company, no university mandate, and a public-interest framing. It names the programmes that fit, states the eligibility gap that stands between this project and each one, and links every claim to a source. The catalogue is in [opportunities.md](opportunities.md), the gap analysis is in [eligibility-and-gaps.md](eligibility-and-gaps.md), the ordered plan is in [application-playbook.md](application-playbook.md), and every URL is collected in [sources.md](sources.md).

> **Status.** Compiled on 19 October 2026 against the programmes that were open at that date. Grant terms, budgets and deadlines change between tranches. Always confirm an amount or a date at the funder's own page before acting on it. This is analysis, not legal, tax, or funding advice.
>
> **Verified 19 October 2026.** Each finding was re-checked against the funder's own pages; the results are in [verified-findings.md](verified-findings.md). Three checks changed the picture: NLnet's Restack fund **excludes AI projects**, so NLnet drops to a lower-probability fit; NLnet has a dedicated **Research and Higher Education Technology Fund**; and the NLnet GenAI rule is a **disclosure** rule, not a blanket ban.

## Can this project get a grant?

**Yes — but not with the project exactly as it stands today.** The blocker is almost never the idea. The blocker is legal form: most project and startup grants require a *funder-recognised applicant* — a self-employed developer, a GbR, a GmbH/UG, a registered association, or a university acting on your behalf. This repository is none of those yet.

There are four realistic routes, and they want different things from the project.

| Route | What it funds | Applicant it needs | Best-known programmes | Money | Nearest deadline |
| --- | --- | --- | --- | --- | --- |
| **A. Open-source / public-interest tech** | The software prototype | An individual developer (freelance/self-employed) or a ≤4-person team / GbR | Prototype Fund; NLnet Open Internet Stack | €47.5k–€158k (Prototype Fund); €5k–€50k+ (NLnet) | **3 Nov 2026** (NLnet), **30 Nov 2026** (Prototype Fund) |
| **B. University spin-off / startup** | The company being prepared | A founding team routed **via the university** (EXIST) or an existing GmbH/UG/AG | EXIST-Gründerstipendium; Junge Innovatoren (BW); Start-up BW Pre-Seed | €12k–€36k/yr stipend + €35k; half TV-L E13 for 1 yr + €20k; €50k–€200k loan | Rolling (EXIST); next BW tranche ≈ early 2027 |
| **C. Personal scholarship** | The student, not the app | An enrolled student, usually with academic + social criteria | Deutschlandstipendium; Studienstiftung; Begabtenförderungswerke; BW-Stipendium | ~€300/mo up to ~€1,400/mo | Dec 2026 (DStip Uni Stuttgart); Feb 2026 (Studienstiftung test) |
| **D. Higher-education teaching innovation** | A teaching/learning project | A **Lehrende/r** (teacher) or a university as lead | Stiftung Innovation in der Hochschullehre (Freiraum); state Lehrfellowships | Up to ~€50k–€60k per fellowship; large consortia | Next Freiraum round ≈ early 2027 |

The honest ranking for *this* repository, today:

1. **Route A is the only route that is open right now without a company and without the university.** Prototype Fund and NLnet both fund individuals on public-interest open-source software. This project fits the *subject* well — a study companion that helps students reclaim their own data from C@MPUS, ILIAS and SDG Campus is textbook public-interest tech. After verification, **Prototype Fund is the clear first choice**; **NLnet is lower-probability**, because its Restack fund excludes AI projects and its form says it is "not interested in AI-generated projects". See [verified-findings.md](verified-findings.md).
2. **Route B is the strongest route if the goal is to turn the demo into a real service.** It needs the university's transfer office (TRACES / TTI GmbH) as an active partner and, for EXIST, a professor as mentor.
3. **Route C is the fastest money for the person** and is the right answer if the goal is to keep building while studying. It does not fund the app, but it buys the time.
4. **Route D is the best strategic fit for the *content*** but not for a solo student: the applicant must be a lecturer or the university itself. It becomes available once a professor co-signs.

## Three things to fix before applying

1. **Licence — replaced.** [`LICENSE`](https://github.com/403access/stuttgart-uni-assistant/blob/main/LICENSE) carried Expo's copyright. It has been replaced with the **GNU Affero General Public License v3.0 or later**, with the project's own copyright. Confirm the choice: AGPL-3.0 is copyleft; MIT/Apache-2.0 is permissive. See [eligibility-and-gaps.md](eligibility-and-gaps.md#the-licence-must-be-yours).
2. **The repository must be public — verify.** Prototype Fund and NLnet both require publicly accessible code. The GitHub remote currently answers **HTTP 404** to an anonymous request, which means the repository is private (or renamed). Make it public before applying.
3. **Generative AI must be disclosed, not hidden.** The commit history shows heavy use of AI coding tools. NLnet allows it only with a **prompt provenance log** and marked commits, and Prototype Fund asks directly. Disclose it, and frame the human design, domain model, tests and privacy boundary as the funded work. A transparency section has been added to the [README](https://github.com/403access/stuttgart-uni-assistant/blob/main/README.md) and [CONTRIBUTING.md](https://github.com/403access/stuttgart-uni-assistant/blob/main/CONTRIBUTING.md). See [eligibility-and-gaps.md](eligibility-and-gaps.md#the-generative-ai-policy).

## What makes this project fundable

The repository already holds most of what a reviewer asks for, which is unusual for a student prototype:

- **A written problem, users and journeys.** [`docs/sdlc/01-initiation.md`](../sdlc/01-initiation.md), [`docs/product/personas-and-journeys.md`](../product/personas-and-journeys.md), [`docs/00-product-description.md`](../00-product-description.md).
- **Architecture and integration boundaries.** [`docs/engineering/architecture.md`](../engineering/architecture.md), [`docs/engineering/integrations.md`](../engineering/integrations.md).
- **A privacy and security position, including the parts that leave the device.** [`docs/engineering/security-and-privacy.md`](../engineering/security-and-privacy.md).
- **Automated checks.** `npm run check` asserts the credit model, the planner and several German answers, and runs the server tests.
- **A stated scope boundary that refuses to look official.** The product description, the sign-in screen and [`docs/sdlc/01-initiation.md`](../sdlc/01-initiation.md) all say it is not a university service.

A reviewer will also look for the things that are missing: a public licence, a README that states a public API, real (not fictional) pilot users, and a named maintainer. Those are the gaps in [eligibility-and-gaps.md](eligibility-and-gaps.md).

## Read next

| Document | What it helps you decide |
| --- | --- |
| [verified-findings.md](verified-findings.md) | Every finding re-checked against primary sources, with the corrections |
| [opportunities.md](opportunities.md) | Every programme that plausibly fits, with amounts, applicants, deadlines and a fit rating |
| [eligibility-and-gaps.md](eligibility-and-gaps.md) | The applicant profile, the per-route gap, and the project-level compliance issues to fix first |
| [application-playbook.md](application-playbook.md) | The ordered plan, ready-to-use positioning text, and a 12-month calendar |
| [applications/](applications/README.md) | Ready-to-submit drafts for Prototype Fund and NLnet |
| [sources.md](sources.md) | Every source URL, grouped, with what it supports |
