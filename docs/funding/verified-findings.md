# Verified findings

This file re-checks every finding in the [funding section](README.md) against primary sources. It was compiled on **19 October 2026**. Where a check changed an earlier statement, the correction is called out.

Legend: **Confirmed** = matches the primary source. **Corrected** = the earlier statement was wrong or incomplete. **Carried** = taken from a secondary source and not re-opened against the funder's own page today.

## Table

| # | Finding | Verdict | Evidence | Source |
| --- | --- | --- | --- | --- |
| 1 | `LICENSE` carries Expo's copyright, not the project's | **Confirmed** | Line 3 reads `Copyright (c) 2015-present 650 Industries, Inc. (aka Expo)` | local [`LICENSE`](https://github.com/403access/stuttgart-uni-assistant/blob/main/LICENSE) |
| 2 | Prototype Fund application window is 1 Oct – 30 Nov 2026, 15:00 CET | **Confirmed** | "Bewerbungen für Jahrgang 03 sind bis zum 30. November 2026, 15:00 Uhr (CET) möglich" | [prototypefund.de/bewerbung](https://www.prototypefund.de/bewerbung), [details](https://www.prototypefund.de/bewerbung/details) |
| 3 | Prototype Fund amounts: €47,500 solo / €95,000 team for six months | **Confirmed** | Regular phase 01.06.2027–30.11.2027; Second Stage adds €31,667 / €63,333 | [prototypefund.de/bewerbung/details](https://www.prototypefund.de/bewerbung/details) |
| 4 | Prototype Fund solo applicants must be self-employed/freelance and resident in Germany | **Confirmed** | Formal rules list; "Bewerbungen von Unternehmen, Vereinen oder sonstigen Organisationen sind nicht zulässig" | [prototypefund.de/bewerbung](https://www.prototypefund.de/bewerbung) |
| 5 | The formal Prototype Fund application must be in German | **Confirmed** | "Der formale Antrag sowie einige andere Dokumente müssen aber auf Deutsch eingereicht werden" | [prototypefund.de/bewerbung](https://www.prototypefund.de/bewerbung) |
| 6 | "Up and Coming" is for ≤25 / students / IT trainees | **Confirmed**, with a scope correction | It exists, but it is limited to projects in **Datensicherheit** or **Software-Infrastruktur** — not the Resilienz theme | [prototypefund.de/up-and-coming](https://www.prototypefund.de/up-and-coming) |
| 7 | "Resilienz" is free alternatives to proprietary/centralised software | **Confirmed**, with a condition | Innovation is secondary in this line, **and** the Second Stage application with a concept is **mandatory** (10-month track) | [prototypefund.de/bewerbung/details](https://www.prototypefund.de/bewerbung/details) |
| 8 | NLnet deadline is the 3rd of every odd month; next 3 Nov 2026 | **Confirmed** | "Next deadline November 3rd 2026 12:00 CET (noon)" | [nlnet.nl/funding.html](https://nlnet.nl/funding.html), [propose](https://nlnet.nl/propose/) |
| 9 | NLnet grants are €5,000–€50,000 | **Confirmed** | "Between € 5 000 and € 50 000 for a first grant" | [nlnet.nl/propose/](https://nlnet.nl/propose/) |
| 10 | NLnet Restack is a plausible fit for this app | **Corrected — now Weak** | Restack states "**AI-related projects are not within scope** — unless they are already widely used throughout society (> 1 million active human users)". This app is AI-flavoured and new | [nlnet.nl/restack/](https://nlnet.nl/restack/) |
| 11 | NLnet excludes LLM-dominated ("vibecoded") work | **Corrected — it is a disclosure rule, not a blanket ban** | The GenAI policy (v1.1, 26 Jan 2026) lets applicants use GenAI **if they disclose**: model, dates, prompts and raw output. But the proposal form adds "We are not interested in AI-generated projects or proposals", and a stricter policy is pending | [GenAI policy](https://nlnet.nl/foundation/policies/generativeAI/), [propose](https://nlnet.nl/propose/) |
| 12 | NLnet has a fund aimed specifically at research and education technology | **New finding** | The **Research and Higher Education Technology Fund** (with the Vietsch Foundation) funds "small initiatives that can make a noticeable difference to the users and providers of Research and Education networks" | [nlnet.nl/nren/](https://nlnet.nl/nren/) |
| 13 | Which NLnet funds are open right now | **New finding** | The site lists only **Restack** and **CodeSupply** as "currently open for proposals". The proposal form also offers "Other / open call" | [nlnet.nl/themes/](https://nlnet.nl/themes/), [propose](https://nlnet.nl/propose/) |
| 14 | Sovereign Tech Fund does not fund prototypes and wants >€50,000 | **Carried** | "We do not finance the development of prototypes"; "must exceed €50,000" | [sovereign.tech/programs/fund](https://www.sovereign.tech/programs/fund) |
| 15 | EXIST goes through the university, wants ≥ half the degree, a mentor, and a non-student-majority team | **Carried** | Applicant is the university; mentor's statement and ~15-page idea paper required | [exist.de](https://exist.de/programm/gruendungsstipendium), [TRACES](https://www.traces.uni-stuttgart.de/en/about-us/entrepreneurship) |
| 16 | Junge Innovatoren's next tranche is expected in early 2027 | **Carried** | 45th tranche closed 5 May 2026; programme under evaluation | [junge-innovatoren.de](https://junge-innovatoren.de/) |
| 17 | StIL "Freiraum" next round begins in early 2027 and needs a lecturer as applicant | **Carried** | "Die nächste Freiraum-Ausschreibung beginnt Anfang 2027"; applicants are Lehrende/institutions | [stiftung-hochschullehre.de](https://stiftung-hochschullehre.de/foerderung/freiraum) |
| 18 | Deutschlandstipendium is €300/month; Univerity of Stuttgart's 2027/28 call is expected around December 2026 | **Carried** | "Die Ausschreibung ... für das Förderjahr 2027/28 ... voraussichtlich im Dezember 2026" | [uni-stuttgart.de](https://www.student.uni-stuttgart.de/finanzierung/deutschlandstipendium/ausschreibung) |
| 19 | Studienstiftung admits students by self-application with an ability test | **Carried** | Self-application test registration in February | [studienstiftung.de](https://www.studienstiftung.de/infos-fuer-studierende-und-vorschlagende/bewerbung-und-auswahl) |
| 20 | TRACES / TTI is the university entry point for EXIST and coordinates with TTI GmbH | **Carried** | TRACES coordinates funding routes and TTI hosting | [traces.uni-stuttgart.de](https://www.traces.uni-stuttgart.de/en/about-us/entrepreneurship) |

## What the corrections change

1. **NLnet is a weaker fit than first written.** The earlier note rated it "partial–strong". Restack excludes AI projects outright, and the proposal form says NLnet is "not interested in AI-generated projects or proposals". The honest rating for this project is **Weak for Restack**, with the **open call** and the **Research and Higher Education Technology Fund** as the only plausible doors — and only if the application leads with the privacy/education-tooling work, not the assistant.
2. **The GenAI finding was too blunt.** NLnet does not ban all LLM use. It requires *disclosure with a prompt provenance log* in the application, and *marked, accountable* use in the code. The project's heavy AI-assisted development is therefore not automatically fatal, but it must be disclosed, and the new policy may close the exceptions.
3. **A better-fitting NLnet fund exists.** The **Research and Higher Education Technology Fund** (NREN, with the Vietsch Foundation) is purpose-built for education and research technology. It is not listed among the funds currently open for proposals, so the practical route is the open call — but this is where the project would look most at home.

## Consequence for the plan

The [application playbook](application-playbook.md) is updated to:

- Put **Prototype Fund first** (still the best open fit), with **Resilienz** as the line and a mandatory Second Stage concept.
- Treat **NLnet as an optional, lower-probability** submission, through the **open call**, framed as a privacy-preserving local-first client — not as an AI feature.
- Add a **generative-AI transparency section** to the repository, because disclosure is now a concrete requirement for NLnet and good practice for Prototype Fund.
