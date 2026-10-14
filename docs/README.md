# Documentation map

Stuttgart Uni is documented as a product, as a system, and as a lifecycle. The files below are the record of how the demonstration was framed, designed, built, checked, and what remains before a real university integration.

## Product

| Document | Contents |
| --- | --- |
| [00-product-description.md](00-product-description.md) | The product description: platforms, modules, chat, peers, campus, documents |
| [product/feature-catalog.md](product/feature-catalog.md) | Each requested capability, the screen that carries it, and what this build actually does |
| [product/personas-and-journeys.md](product/personas-and-journeys.md) | Who the app is for, and five journeys through the current build |

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
| [engineering/data-model.md](engineering/data-model.md) | Program, modules, places, and what is stored on the device |
| [engineering/integrations.md](engineering/integrations.md) | SIAM, C@MPUS, ILIAS, SDG Campus, and which of them are live |
| [engineering/campus-curriculum.md](engineering/campus-curriculum.md) | C@MPUS curriculum-structure request, stored nodes, and the API screen |
| [engineering/campus-studies.md](engineering/campus-studies.md) | C@MPUS study-chooser request, the mapped study list, and the route |
| [engineering/campus-study-switcher.md](engineering/campus-study-switcher.md) | Enrolled studies at the top of Today: selection, per-study structure load, failure UX |
| [engineering/campus-logging.md](engineering/campus-logging.md) | Campus call log in app and server, portal error detail, stale-server detection |
| [engineering/oidc-login.md](engineering/oidc-login.md) | Identity provider URLs, the authorization-code flow, and the `.env` client |
| [engineering/ai-assistant.md](engineering/ai-assistant.md) | Local answers, fact sheet, Grok |
| [engineering/security-and-privacy.md](engineering/security-and-privacy.md) | Credentials, keys, student data, past papers |
| [engineering/design-system.md](engineering/design-system.md) | Color, type, mark, and screen patterns |

## Delivery

| Document | Contents |
| --- | --- |
| [delivery/backlog.md](delivery/backlog.md) | What is in this build, and the ordered work after it |
| [delivery/release-and-operations.md](delivery/release-and-operations.md) | Environments, release shape, and how to run it day to day |
