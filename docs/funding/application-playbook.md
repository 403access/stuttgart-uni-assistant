# Application playbook

This is the ordered, concrete plan. It assumes the analysis in [opportunities.md](opportunities.md) and the gaps in [eligibility-and-gaps.md](eligibility-and-gaps.md). Dates are as of 19 October 2026.

## The 12-month calendar

| When | Action | Programme |
| --- | --- | --- |
| **Now – 31 Oct 2026** | Replace `LICENSE`, add `CONTRIBUTING.md`, decide the legal route, draft the two short applications | preparation |
| **3 Nov 2026, 12:00 CET** | Submit to NLnet's Open Internet Stack open call (if the generative-AI policy still allows it) | Route A |
| **30 Nov 2026, 15:00 CET** | Submit to Prototype Fund Jahrgang 03 | Route A |
| **Dec 2026** | Watch for the Uni Stuttgart Deutschlandstipendium 2027/28 call; apply | Route C |
| **Dec 2026 – Mar 2027** | Prototype Fund selection, jury, and formal BMFTR application with support | Route A |
| **Jan–Feb 2027** | Studienstiftung self-application test (registration closes in February) | Route C |
| **Early 2027** | Approaching Freiraum's next round with a lecturer; watch the Junge Innovatoren tranche | Routes D, B |
| **Rolling** | Start the EXIST conversation with TRACES/TTI now; it takes months to prepare | Route B |
| **1 Jun 2027** | Prototype Fund funding period starts (if selected) | Route A |

## Step 1 — Prepare the repository (this week)

These make every later application easier and are cheap.

1. **Licence — done, confirm the choice.** The Expo notice has been replaced with **AGPL-3.0-or-later** and the project's own copyright. If you prefer permissive reuse, switch to **MIT** or **Apache-2.0**; every funder here accepts either. The licence is stated in the [README](https://github.com/403access/stuttgart-uni-assistant/blob/main/README.md).
2. **Add `CONTRIBUTING.md`** with a contributor path, a code-of-conduct link, and how to run `npm run check`. Open-source funders read this to judge stewardship.
3. **State the project's own API and status** in the README: what is a demonstration record, what is live, what the boundary is. Much of this exists in [`docs/00-product-description.md`](../00-product-description.md); surface it at the top of the README.
4. **Keep the tests green.** `npm run check` is evidence of engineering quality. Make sure it passes and say so in applications.
5. **Do not remove the "not affilated with the University of Stuttgart" language.** It protects the project and it is honest.
6. **Make the repository public.** Both open-source funders require it, and a jury cannot read the code otherwise. The GitHub remote currently answers **HTTP 404** to an anonymous request.

## Step 2 — Choose the legal route (this month)

The routes need different things, and the applications cost real time.

- **Route A (open source) is the fastest.** To apply to Prototype Fund you must be self-employed/freelance or apply as a GbR, or be released part-time by an employer. Decide whether to register as a freelancer (Freiberufler, software development) or to form a small GbR with a co-contributor.
- **Route B (spin-off) is the highest ceiling.** It needs the university. Book a conversation with **TRACES/TTI** now: they advise on EXIST, EXIST Research Transfer, Junge Innovatoren and BW Pre-Seed, and TTI can host a team before incorporation.

They are not exclusive. Many founders apply to an open-source fund to build the prototype and to EXIST to build the company.

## Step 3 — Run a pilot (this month)

This is the highest-value addition that is not a legal step.

- Recruit 3–10 students (a Fachschaft or a seminar is enough).
- Have them use the demonstration, then record: task completion, the questions they asked the assistant, what broke, and whether they would use it.
- Write it up in one page with consent-cleared screenshots and no real grades or names.
- Add `docs/funding/pilot.md` (or a section in this file) with the result.

A pilot converts the project from "one student's prototype" into "a validated student need", which is what a jury looks for.

## Step 4 — Apply to Prototype Fund (before 30 November 2026)

This is the single best open opportunity. The application is deliberately low-threshold: a short form first, then a formal BMFTR application only if selected.

### What they ask, in effect

- What is the software, and what public benefit does it create?
- Why is open source the right form?
- Who is on the team, and what is the plan for six (or ten) months?
- Which funding line does it fit — Innovation, Resilienz, or Up and Coming?

### Recommended positioning

- **Funding line: Resilienz** (free, open alternatives to proprietary, centralised ecosystems), with the **Up and Coming** line if you qualify by age or enrolment.
- **Core sentence:** *University Assistant gives students a local-first, open record of their own studies — timetable, progress and course material — that they control on their own device, instead of scattering it across closed campus portals.*
- **Public benefit:** students get transparency over their own academic data; universities and third parties get an open, auditable client that does not require trusting a private server with a transcript; the pattern is reusable by any campus-management university.
- **Scope for six months:** turn the demonstration into a working, installable open-source prototype with a real (consented) pilot: a stable local data model, a documented connector seam, accessibility and i18n, and a public release.

### Budget shape (six months, solo, following the programme's logic)

- Roughly a part- to full-time developer salary for six months; the hourly rate is capped (€50) and the maximum is €47,500 per solo developer.
- Include user-testing/design coaching and a small amount for accessibility or security review if allowed.
- Do not budget hardware; the programme is software-only.

### Evidence to cite in the application

- [`docs/product/personas-and-journeys.md`](../product/personas-and-journeys.md) — the users and the eight journeys.
- [`docs/engineering/architecture.md`](../engineering/architecture.md) and [`docs/engineering/data-model.md`](../engineering/data-model.md) — the design.
- [`docs/engineering/security-and-privacy.md`](../engineering/security-and-privacy.md) — the local-first, privacy-by-design position.
- `npm run check` — the automated evidence.

## Step 5 — NLnet (optional; before 3 November 2026)

Verification downgraded NLnet from a strong second choice to an **optional** submission:

- **Restack excludes AI projects outright** unless they already serve more than a million people, and the proposal form says NLnet is "not interested in AI-generated projects or proposals".
- The dedicated **Research and Higher Education Technology Fund (NREN)** is the best thematic fit, but the site does not list it among the funds currently open.
- The GenAI policy is a **disclosure** rule: any AI used to write the proposal must be logged (model, prompts, raw output).

Submit only if you are comfortable with all three. In the form, select **Other / open call**. The ready draft is [applications/nlnet.md](applications/nlnet.md).

### Recommended positioning

- **Theme:** a privacy-preserving, local-first client for campus-management systems, published as an open protocol/format definition plus a reference client.
- **Avoid leading with the chatbot.** Lead with the data path: *the student's record stays on the device; nothing is sent to a central server; the client is open and auditable.*
- **Ask:** €5,000–€50,000 for a defined chunk — for example, formalising an open "campus record" interchange format and building the reference client against it, with a security review.
- **If the AI stance or the disclosure burden is uncomfortable:** skip NLnet and put the effort into Prototype Fund.

## Step 6 — Open the EXIST route (start now, apply when ready)

EXIST cannot be applied for directly. The route is:

1. **Talk to TRACES/TTI** (University of Stuttgart Transfer Center). Ask which programme fits today: EXIST-Gründerstipendium, Junge Innovatoren, or EXIST Research Transfer.
2. **Find a mentor professor.** A technical-fachliche Stellungnahme is required. A lecturer who already values the tool (see Route D) can be the same person.
3. **Write the ~15-page idea paper.** Allow at least two months. Use the repository's docs as raw material.
4. **Resolve the team question.** EXIST does not fund teams that are mainly students. Either recruit a graduate co-founder or prefer Junge Innovatoren (BW), which targets graduates in the pre-founding phase and is the natural successor to EXIST.
5. **Prepare letters of intent** from potential users or partners (a Fachschaft, a department, an institute). These carry weight.

## Step 7 — Seed Route D for 2027

The next Freiraum round begins around the start of 2027 and the applicant must be a lecturer or the university.

1. Identify a lecturer in Faculty 5 (or the teaching-development unit) who owns digital-teaching or study-success topics.
2. Bring the running demo, the pilot write-up, and a one-page concept for a teaching/learning innovation.
3. Let them lead the application; be ready to be named as the technical partner.
4. Check whether Baden-Württemberg runs a Lehrfellowship scheme at that time (the Thüringen model is the template).

## Draft one-liners

Reusable, accurate sentences about the project for forms:

- *"A local-first, open-source study assistant for students at campus-management universities, built with Expo/React Native and TypeScript."*
- *"The student's academic record stays on the device; the assistant answers from that record and, optionally, rewrites the answer through a server proxy that holds no transcript."*
- *"Today it runs on a fictional demonstration record; the integration boundary for C@MPUS, ILIAS and SDG Campus is specified but not yet implemented, by design and for data-protection reasons."*
- *"It is not a service of the University of Stuttgart and does not use the university's logo or typeface."*

## Anti-patterns to avoid

- **Do not claim university endorsement** you do not have. Every route values the honesty in the current docs.
- **Do not hide the AI assistance.** The commit history and the engineering notes are public. Present the human design and testing as the work.
- **Do not apply to Sovereign Tech Fund as an application.** It funds base technologies and does not fund prototypes.
- **Do not chase every deadline.** Prototype Fund plus one Route-B programme plus one scholarship is a realistic year. Ten half-prepared applications is not.
