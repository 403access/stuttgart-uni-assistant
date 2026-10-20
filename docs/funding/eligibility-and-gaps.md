# Eligibility and gaps

This file answers "why can't I just apply?" for each route, and lists the project-level issues to fix before any application is judged on merit. It assumes the applicant profile below; if any line is wrong, the conclusions change.

## The applicant as the funding programmes see it

| Field | Value (as found in the repository) | Why it matters |
| --- | --- | --- |
| Applicant | One developer. Git author: Oliver Molnar. No team in the repository | Prototype Fund allows a team; most others want a team or an institution |
| Legal form | None stated. No GbR, GmbH, UG, e.V. or gGmbH | The single biggest blocker for Routes A and B |
| Status | Student at (or connected to) the University of Stuttgart, demonstrated by the product, the domain and the campus knowledge; not asserted in the repository | Determines EXIST, Junge Innovatoren, Deutschlandstipendium and Studienstiftung eligibility |
| Employment | No evidence of self-employment or freelance status | Prototype Fund requires it (or a partial release by an employer) |
| Repository | `github.com/403access/stuttgart-uni-assistant`; `package.json` is `"private": true` (npm-private) | Open-source grants need a public repository with a correct licence |
| Licence | `LICENSE` carries **Expo's** copyright, not the project's | Disqualifying for any open-source grant until fixed |
| Data | Fully fictional demonstration record (Lena Hartmann) | Low privacy risk, which is an asset; but no real pilot users yet |
| AI use | On-device answers plus an optional Grok proxy; the development is heavily AI-assisted | Interacts with the NLnet generative-AI policy |
| Branding | Name "University Assistant", bundle id `dev.demo.universityassistant`, university corporate colours, no logo, no Univers font | Deliberately non-official; the boundary must stay visible in any application |

## Route-by-route gap

### Route A — open source (Prototype Fund, NLnet)

**What you have:** a public-interest software prototype, a written problem statement, tests, documentation.

**What is missing:**

1. **A legal applicant for Prototype Fund.** As a solo developer you must be *selbständig oder freiberuflich* (or released part-time by an employer). If you are a student with no freelance registration, you must either register as a freelancer (Freiberufler, e.g. as a software developer) or apply as a team with a GbR seated in Germany. Confirm the current wording in the application handbook.
2. **A correct open-source licence.** Replace the Expo notice in [`LICENSE`](https://github.com/403access/stuttgart-uni-assistant/blob/main/LICENSE) with your own licence and add a copyright line. Whether you choose a permissive licence (MIT/Apache-2.0) or a copyleft one (AGPL-3.0) is a real strategic choice — see [below](#the-licence-must-be-yours).
3. **A public repository and a contribution path.** NLnet looks at how a project will be stewarded and reused; Prototype Fund requires the code to be published. A `CONTRIBUTING.md`, an issue tracker that is actually used, and a maintainer identity help.
4. **A clear public benefit and audience.** The application must name who benefits (students at Stuttgart, and the broader set of students at campus-management universities) and why an open tool is better than a closed one.

**NLnet-specific:** the project is AI-flavoured and the fund's Restack call excludes AI projects except one narrow exception, and its generative-AI policy disqualifies LLM-dominated work. The application should lead with **data sovereignty, privacy and the local-first record**, and present the assistant as an optional, replaceable layer.

### Route B — spin-off (EXIST, Junge Innovatoren, Pre-Seed)

**What you have:** a technology-oriented, knowledge-based product idea — exactly the EXIST target.

**What is missing:**

1. **A university partner.** EXIST cannot be applied for directly; it goes through the university's start-up network. The entry point is **TRACES (Transfer Center)** and **TTI GmbH**, which can also host the team as a technology and start-up enterprise. This is a conversation, not a form.
2. **A professor as mentor** and a roughly 15-page idea paper (allow at least two months).
3. **A non-student-majority team.** EXIST does not fund teams that are mainly students; this is the structural catch for a solo student. Options: find a graduate co-founder, or route through Junge Innovatoren, which is aimed precisely at graduates in the pre-founding phase.
4. **For Pre-Seed: a legal form and a co-investor.** GmbH/UG/AG seated in BW plus a co-investor providing 20%.
5. **A commercial thesis.** The repository is explicitly an unofficial demonstration. Turning it into a company means answering: who pays, and how does it coexist with the university's own systems and rules?

### Route C — scholarships

**What you have:** an enrolled student with a demonstrated public-interest project.

**What is missing:** mostly paperwork and timing. The Deutschlandstipendium asks for grades plus at least one additional criterion; a self-built public-interest tool is strong material. The Studienstiftung self-application has a fixed test window in February. There is no structural blocker here — only the ordinary competitiveness of scholarships.

### Route D — teaching innovation

**What you have:** a tool that improves study and learning, with a real workflow.

**What is missing:** the applicant. StIL and the state fellowships fund **Lehrende** or institutions. The path is to find a lecturer who will lead the application with the demo as evidence, and to check the next Freiraum round, which begins around the start of 2027.

## Project-level issues to fix before applying

These are not optional polish; reviewers and funders look for them, and some are legal.

### The licence must be yours

[`LICENSE`](https://github.com/403access/stuttgart-uni-assistant/blob/main/LICENSE) carried Expo's notice:

> Copyright (c) 2015-present 650 Industries, Inc. (aka Expo)

That was Expo's MIT licence, copied from the framework template, asserting the wrong copyright holder. **It has been replaced** with the **GNU Affero General Public License v3.0 or later** and the project's own copyright. If you prefer a permissive licence, swap the file for MIT or Apache-2.0 — you own the copyright, so the change is yours. Two defensible choices:

- **MIT or Apache-2.0** — maximum reuse, easiest for a university or a company to adopt.
- **AGPL-3.0** — copyleft; anyone who runs a modified version as a network service must publish their changes. The current choice, and the common one for software whose value is that it is not re-monopolised.

The choice is stated in the README, because it is part of the funding story.

### The repository must be public

Prototype Fund and NLnet both require the code to be publicly accessible. The GitHub remote `https://github.com/403access/stuttgart-uni-assistant` answers **HTTP 404** to an anonymous request, which means the repository is **private** (or renamed). A jury cannot verify anything until it is public. This is a required action, and only the owner can take it.

### Identity, trademark and the "not official" boundary

The project is careful — no university logo, bundle id `dev.demo.universityassistant`, fictional staff and grades, an explicit "not a service of the University of Stuttgart" line. Keep it that way, and make it explicit in applications:

- The university's **corporate colours** are published and usable; the **signet and the Univers typeface** are not. The repository already refuses to embed them ([`docs/engineering/security-and-privacy.md`](../engineering/security-and-privacy.md)).
- Do not adopt a `uni-stuttgart.de` bundle id, domain or name, and do not let a funder's press materials imply university endorsement.

### Platform terms of service and data protection

The demonstration stores sessions and (in the beta C@MPUS browser path) an opt-in credential vault, and harvests a session to sign in. Even with fictional data, a funder that evaluates ethics — NLnet, Sovereign Tech, StIL — will read [`docs/engineering/campus-browser-login.md`](../engineering/campus-browser-login.md) and [`docs/engineering/security-and-privacy.md`](../engineering/security-and-privacy.md). Before applying:

- Be able to state whether the sign-in harvesting is consistent with the university's terms of use and with the identity provider's rules. The current evidence is in [`docs/legal/terms-review.md`](../legal/terms-review.md): the `.env` fallback, hosted/tunnelled server, and unauthenticated mail routes are the items that must be fixed or approved before claiming consistency.
- Keep the "password is typed only on the university page" property, and describe the opt-in vault as a beta exception with its own rules, as the repository already does.
- State plainly that the demonstration data is fictional and that no real transcript is shipped.

### Copyright of materials

The project correctly refuses to redistribute exam PDFs or lecture decks, listing topics only. Say so in applications; it converts a risk into a virtue (respecting copyright and academic-integrity norms).

### The generative-AI policy

The verified position is more precise than "LLMs are banned":

- **NLnet's GenAI policy** (v1.1, 26 January 2026) permits GenAI in preparing an application and in the funded work, **provided it is disclosed**. Applications need a **prompt provenance log** (model, dates and times, the prompts, the unedited output); code contributions must be marked with the model and prompt, for example in the commit message. Work purely generated by AI cannot be presented as human work or paid as such. A stricter version is announced, under which exceptions will no longer be possible.
- **The NLnet proposal form** goes further: "We are not interested in AI-generated projects or proposals."
- **Prototype Fund** asks directly whether AI was used to write the application and whether the project is "vibe-coded".

The repository's history shows substantial AI-assisted development. Do not conceal it. Instead:

- Disclose it in the README (done) and in every application.
- Frame the funded work as **human design**: the domain model, the credit rules in `src/domain/plan.ts`, the i18n catalogue, the privacy boundary, the campus API mapping and the test suite.
- Keep a prompt log for anything you generate while preparing an application, because NLnet requires it.
- Prefer **Prototype Fund**, which has no equivalent blanket exclusion, and treat NLnet as optional.

### A first real pilot

Every route is stronger with evidence that a real student besides the author used the tool. The demonstration record is fictional by design, but a small pilot — a handful of students, a short survey, a screenshot of a real timetable export with consenting data — turns "prototype" into "validated". The survey, recruitment messages, and interview guide are drafted in [beta-survey.md](../product/beta-survey.md); no pilot has run and there are no results yet. This remains the single highest-value non-legal addition.

## What to do first (summary)

1. Replace the licence and add a `CONTRIBUTING.md`; make the repository's public status explicit.
2. Decide the legal route: freelancer/GbR (Route A) or university spin-off (Route B). They are not mutually exclusive but the applications cost time.
3. Run one small pilot with real students and write it up.
4. Talk to TRACES/TTI about EXIST and to a lecturer about StIL.
5. Apply to Prototype Fund before 30 November 2026.

The ordered plan and draft text are in [application-playbook.md](application-playbook.md).
