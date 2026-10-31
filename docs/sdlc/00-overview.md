# Lifecycle overview

The work follows eight phases. They are sequential on paper and overlapping in practice: a design choice about credentials changed the requirements, and the test suite is part of the implementation rather than a gate that waits until the end.

| Phase | Question it answers | Artifact in this repo | Status |
| --- | --- | --- | --- |
| Initiation | Why build this, and what must it never pretend to be? | [01-initiation.md](01-initiation.md) | Done for the prototype |
| Planning | What is in the first build, and in which order? | [02-planning.md](02-planning.md), [delivery/backlog.md](../delivery/backlog.md) | Done for the prototype |
| Requirements | What must each area do, and which facts are in or out? | [03-requirements.md](03-requirements.md), [00-product-description.md](../00-product-description.md) | Done for the prototype |
| Design | How is the product structured, visually and technically? | [04-design.md](04-design.md), `docs/engineering/` | Done for the prototype |
| Implementation | What was built, and where does it live? | [05-implementation.md](05-implementation.md), `apps/mobile/app/`, `apps/mobile/src/`, `apps/server/` | Done for the prototype |
| Testing | How do we know the record and the answers stay honest? | [06-testing.md](06-testing.md), `tools/assistant/check-assistant.ts` | First pass done |
| Deployment | How does a build leave this machine? | [07-deployment.md](07-deployment.md) | Specified, not shipped |
| Maintenance | What has to stay true after the first build? | [08-maintenance.md](08-maintenance.md) | Operating rules written |

## Decision that shapes every phase

The university systems named in the product description are real, and this repository has no right to log into them on a student's behalf. Every phase therefore separates three layers:

1. The student-facing workflow (screens, language, assistant).
2. The academic record the workflow reads.
3. The connector that would fill that record from C@MPUS, ILIAS, SDG Campus, and SIAM.

Layers 1 and 2 are implemented. Layer 3 is a documented interface with a local stand-in. The app says so on the sign-in screen, in credit answers, and in Settings.

## Definition of done for this repository

The prototype is done when:

- A student can open the demonstration profile and move through all six product areas without a dead end.
- Credit totals, the next-semester suggestion, and the scripted German answers match the bundled record.
- `npm run typecheck` and `npm run check` pass.
- The web bundle exports.
- The assistant server starts, reports its health, and refuses to call Grok when no key is present.
- The documents in `docs/` describe the product, the system, and these phases.

Store submission, a real identity-provider contract, and a production backend are outside that definition. They are tracked in the deployment and backlog documents.
