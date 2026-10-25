# Documentation map

University Assistant is documented as a product, as a system, and as a lifecycle. The files below are the record of how the demonstration was framed, designed, built, checked, and what remains before a real university integration.

## User guide

For the person holding the phone: what each screen does and what stays on the device.

| Document | Contents |
| --- | --- |
| [user/README.md](user/README.md) | How to read this guide, and the rule the app keeps about what is live versus demonstration record |
| [user/getting-started.md](user/getting-started.md) | Running the app, the six sign-in paths, the first-run biometrics page, language, first minutes |
| [user/daily-screens.md](user/daily-screens.md) | Heute, Kalender, Chat, and the deadline list |
| [user/study.md](user/study.md) | Modules, requirements, planning, recognition, lecturers, peers |
| [user/campus.md](user/campus.md) | Live C@MPUS structures and courses, rooms, the map |
| [user/mail.md](user/mail.md) | UniMail: connecting, the inbox, reading a message |
| [user/documents-and-settings.md](user/documents-and-settings.md) | Documents, notices, settings, and what is stored about you |
| [user/vpn-and-printing.md](user/vpn-and-printing.md) | The VPN screen and the campus printers, which need the university network |

## Product

| Document | Contents |
| --- | --- |
| [00-product-description.md](00-product-description.md) | The product description: platforms, modules, chat, peers, campus, documents |
| [product/feature-catalog.md](product/feature-catalog.md) | Each requested capability, the screen that carries it, and what this build actually does |
| [product/personas-and-journeys.md](product/personas-and-journeys.md) | Who the app is for, and five journeys through the current build |
| [product/beta-signup.md](product/beta-signup.md) | The tester intake form: contact details, device, frustration baseline, privacy, and how it fits the pilot |
| [product/beta-survey.md](product/beta-survey.md) | The five-minute pilot questionnaire, German and English, with Tally setup and decision thresholds |
| [product/beta-recruitment.md](product/beta-recruitment.md) | Who to recruit, the invite and reminder messages, and the non-user follow-up |
| [product/beta-interview-guide.md](product/beta-interview-guide.md) | The 15-minute interview script, consent, capture template, and analysis |

## Lifecycle

Read these in order. Each file states the decision for this project, the artifact it produced, and the exit check.

| Phase | Document |
| --- | --- |
| Overview | [sdlc/00-overview.md](sdlc/00-overview.md) |
| 1. Initiation | [sdlc/01-initiation.md](sdlc/01-initiation.md) |
| 2. Planning | [sdlc/02-planning.md](sdlc/02-planning.md) |
| 3. Requirements | [sdlc/03-requirements.md](sdlc/03-requirements.md) |
| 4. Design | [sdlc/04-design.md](sdlc/04-design.md) |
| 5. Implementation | [sdlc/05-implementation.md](sdlc/05-implementation.md) |
| 6. Testing | [sdlc/06-testing.md](sdlc/06-testing.md) |
| 7. Deployment | [sdlc/07-deployment.md](sdlc/07-deployment.md) |
| 8. Maintenance | [sdlc/08-maintenance.md](sdlc/08-maintenance.md) |

## Engineering

| Document | Contents |
| --- | --- |
| [engineering/architecture.md](engineering/architecture.md) | Client, local record, assistant server |
| [engineering/modularization/README.md](engineering/modularization/README.md) | Target architecture, reuse map, and document index |
| [engineering/modularization/05-adr-001-target-architecture.md](engineering/modularization/05-adr-001-target-architecture.md) | Accepted decision: modular monorepo, dual-renderer design system, React admin, feature packages |
| [engineering/modularization/01-current-state.md](engineering/modularization/01-current-state.md) | The repository as it was before the move: surfaces, dependency graph, duplication, and constraints |
| [engineering/modularization/02-target-modules.md](engineering/modularization/02-target-modules.md) | Package catalog, dependency matrix, admin architecture, and target tree |
| [engineering/modularization/03-options-and-decision.md](engineering/modularization/03-options-and-decision.md) | The three directions, their scores, the decision record, and remaining defaults |
| [engineering/modularization/04-migration-plan.md](engineering/modularization/04-migration-plan.md) | Phased move with exit criteria, risks, and script mapping |
| [engineering/accounts.md](engineering/accounts.md) | Server-side users, bearer sessions, and the one account across C@MPUS, ILIAS, SDG Campus, SIAM, and UniMail |
| [engineering/admin-dashboard.md](engineering/admin-dashboard.md) | The token-protected `/admin` console for accounts, sessions, platform links, C@MPUS data, audit history, service logs, and system health |
| [engineering/data-model.md](engineering/data-model.md) | Program, modules, places, and what is stored on the device |
| [engineering/integrations.md](engineering/integrations.md) | SIAM, C@MPUS, ILIAS, SDG Campus, and which of them are live |
| [engineering/campus-curriculum.md](engineering/campus-curriculum.md) | C@MPUS curriculum-structure request, stored nodes, and the API screen |
| [engineering/campus-studies.md](engineering/campus-studies.md) | C@MPUS study-chooser request, the mapped study list, and the route |
| [engineering/campus-study-switcher.md](engineering/campus-study-switcher.md) | Enrolled studies at the top of Today: selection, per-study structure load, failure UX |
| [engineering/campus-courses.md](engineering/campus-courses.md) | C@MPUS courses of a curriculum node: request, mapped course list, and the route |
| [engineering/campus-course-groups.md](engineering/campus-course-groups.md) | C@MPUS groups and dated appointments of one course: request, mapped group list, and the route |
| [engineering/campus-calendar-export.md](engineering/campus-calendar-export.md) | C@MPUS calendar import (export mask): observed form fields, formats, the download/sync route, and the in-app import history |
| [engineering/campus-browser-login.md](engineering/campus-browser-login.md) | Beta sign-in through the in-app C@MPUS browser: harvest, validation, failure modes |
| [engineering/onboarding.md](engineering/onboarding.md) | Post-sign-in onboarding: the gate, the biometrics page and App Lock, storage, settings, native build requirements, and the remaining planned steps |
| [engineering/dev-tools.md](engineering/dev-tools.md) | Development-only Dev category: onboarding diagnostics and next-launch override, local state snapshot, NFC card reader, raw AsyncStorage |
| [engineering/nfc-card.md](engineering/nfc-card.md) | The read-only student ID card reader: readable values, DESFire limits, platform configuration, and the iOS entitlement flag |
| [engineering/campus-logging.md](engineering/campus-logging.md) | Campus call log in app and server, portal error detail, stale-server detection |
| [engineering/tanstack-query.md](engineering/tanstack-query.md) | Query client wiring, typed key factory, shared sync mutation, device-cache write-back |
| [engineering/tanstack-store.md](engineering/tanstack-store.md) | App store shape, selector reads, stable actions, persistence, and the smaller mail/log/quiz stores |
| [engineering/oidc-login.md](engineering/oidc-login.md) | Identity provider URLs, the authorization-code flow, and the `.env` client |
| [engineering/ai-assistant.md](engineering/ai-assistant.md) | Local answers, fact sheet, Grok |
| [engineering/assistant-tunnel.md](engineering/assistant-tunnel.md) | Reaching the assistant from a phone off the LAN: the two tunnels, the quick hostname, the `.env` write |
| [engineering/security-and-privacy.md](engineering/security-and-privacy.md) | Credentials, keys, student data, past papers |
| [engineering/vpn-comparison.md](engineering/vpn-comparison.md) | The three university VPN endpoints, protocols, the engines available for each, and the evidence |
| [engineering/vpn-tunnel.md](engineering/vpn-tunnel.md) | The TIK AnyConnect and ZDI OpenVPN services: screens, native control surface, and the engine seam |
| [engineering/ios-distribution.md](engineering/ios-distribution.md) | Getting a build onto an iPhone without the App Store: the four routes, the free-Account limits, which Apple account signs the build, the local `.ipa` workflow, and the standalone distribution service (`apps/dist/`) |
| [engineering/design-system.md](engineering/design-system.md) | Color, type, mark, and screen patterns |
| [engineering/component-catalog.md](engineering/component-catalog.md) | Generated inventory of every `apps/mobile/src/` component, its platform files, exports, all usages, and which exports have live previews |
| [engineering/i18n.md](engineering/i18n.md) | The keyed German/English catalogs, `tx`, placeholder values, and how to add a string |

## Delivery

| Document | Contents |
| --- | --- |
| [delivery/backlog.md](delivery/backlog.md) | What is in this build, and the ordered work after it |
| [delivery/release-and-operations.md](delivery/release-and-operations.md) | Environments, release shape, and how to run it day to day |

## Legal

| Document | Contents |
| --- | --- |
| [legal/terms-review.md](legal/terms-review.md) | Service-by-service terms review: University IuK/C@MPUS/ILIAS/SIAM/UniMail, xAI, Cloudflare, ngrok, Tally, Apple, and the OpenVPN licence, with code evidence and a prioritized action plan |

## Funding

| Document | Contents |
| --- | --- |
| [funding/README.md](funding/README.md) | Whether the project can get grants, the four routes, and the bottom line |
| [funding/verified-findings.md](funding/verified-findings.md) | Every finding re-checked against primary sources, with the corrections |
| [funding/opportunities.md](funding/opportunities.md) | Every programme that plausibly fits: money, applicant, deadline, fit rating |
| [funding/eligibility-and-gaps.md](funding/eligibility-and-gaps.md) | The applicant profile, the per-route gap, and the project-level issues to fix first |
| [funding/application-playbook.md](funding/application-playbook.md) | The ordered plan, draft positioning, and a 12-month calendar |
| [funding/applications/README.md](funding/applications/README.md) | Ready-to-submit drafts for Prototype Fund and NLnet, plus the applicant-status verdict |
| [funding/applications/employer-release-template.md](funding/applications/employer-release-template.md) | The part-time release letter that closes the Prototype Fund eligibility gap |
| [funding/sources.md](funding/sources.md) | Every source URL, grouped, with what it supports |
