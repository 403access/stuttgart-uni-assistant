# NLnet — open-call application draft

**Programme.** NLnet Foundation open call.
**Deadline.** **3 November 2026, 12:00 CET**. Submit at [nlnet.nl/propose](https://nlnet.nl/propose/).
**Fund to select.** **Other / open call.** Do not pick Restack: it states "AI-related projects are not within scope" unless already used by more than a million people. The [Research and Higher Education Technology Fund](../opportunities.md#nlnet--research-and-higher-education-technology-fund-nren) is the closest theme, but it is not listed among the funds currently open, so the open call is the route.
**Amount.** Between €5,000 and €50,000 for a first grant.
**Language.** English, plain text, in your own words.

> **Read this first.** NLnet's proposal form says "We are not interested in AI-generated projects or proposals", and its GenAI policy requires a **prompt provenance log** in the application and marked, accountable use in the code. This project uses AI in development. Submit only if you can (a) lead with the privacy/education-tooling work, not the assistant, and (b) hand over the prompts and outputs you used to write this proposal. Otherwise, skip NLnet and put the effort into Prototype Fund.

> Replace every `[…]`. The field names below match the NLnet form exactly.

## Select a fund

`Other / open call`

## Project overview

**Proposal title.** An open, local-first client and interchange format for campus records.

**Project website(s) / repositories.** https://github.com/403access/stuttgart-uni-assistant

**Summary (max 1000 characters).**

> University Assistant is a local-first, open-source client for the academic record that students already own but cannot currently take with them: timetable, degree progress and course material. Today that record is locked inside closed campus-management portals (in Germany, C@MPUS, ILIAS and SDG Campus). This project defines a small, versioned, open "campus record" interchange format and builds a reference client against it that keeps the student's data on the device. No central server stores a transcript; the optional language-model layer is a replaceable presentation layer, never a data store. The result is a reusable, privacy-preserving building block that any campus-management university can adopt and adapt, with open standards and no vendor lock-in. A working prototype exists; the effort funds a documented format, a reference client, accessibility, and a public user test.

## Proposed effort

**How much money.** `[amount, €5,000–€50,000]` €

**Budget breakdown (max 4000 characters).** Work packages, roughly:

- WP1 — Specify the open campus-record format and publish a versioned specification and JSON schema. `[hours]` h.
- WP2 — Reference client: local-first storage, import/export, offline behaviour. `[hours]` h.
- WP3 — A documented, standards-based campus connector (OIDC/SIAM) with explicit data-flow boundaries. `[hours]` h.
- WP4 — Accessibility and internationalisation (German/English), plus a security/privacy review. `[hours]` h.
- WP5 — A public user test with `[n]` students and a written report. `[hours]` h.
- WP6 — Packaging, documentation and contributor onboarding. `[hours]` h.

Rate: `[rate]` €/h, cost-recovery.

**Comparison with other efforts (max 4000 characters).** Cover: existing university apps and portals (closed, single-institution); generic note/timetable apps (no academic-record semantics, no local privacy model); and the closest open efforts and why this differs — it models the *record* and its portability rather than a single feature. Cite the repositories you looked at.

**Technical challenges (max 4000 characters).** Candidate list: reverse-engineering no public API; modelling an academic record that generalises across institutions; keeping the assistant factually bounded to the record; privacy-preserving auth without collecting passwords; reproducible, auditable local storage; accessibility on mobile and web.

## Background

**What makes you the right person(s)?** `[your experience, the prototype you already built, the tests, the documentation]`.

**Other funding sources.** "None. This is an unfunded student prototype." (Say clearly whether it is also applying to the Prototype Fund.)

## AI disclosure

Answer honestly. If you used AI to prepare the proposal, select **Yes** and paste the model, dates, prompts and raw output. If not, select **No**. Separately, the project README should state how AI is used in the code (added to this repository).

## Contact information

Name, email, country of residence: `[…]`. Type of applicant: **Individual** (or **Collective (without legal entity)** if there is a team).

## Why this is lower-probability than Prototype Fund

- The proposal form is explicit: "We are not interested in AI-generated projects or proposals."
- Restack, the main open fund, excludes AI-related projects.
- The education fund (NREN) is not currently listed as open.
- NLnet pays cost-recovery rates, not commercial rates.

If you submit, do it before 3 November 2026; if the disclosure burden or the AI stance is uncomfortable, submit only to Prototype Fund.
