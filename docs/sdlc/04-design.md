# 4. Design

## Purpose

Choose the structure of the app, the shape of the record, and the visual system before the screens multiply.

The detailed references are [engineering/architecture.md](../engineering/architecture.md), [engineering/data-model.md](../engineering/data-model.md), [engineering/ai-assistant.md](../engineering/ai-assistant.md), and [engineering/design-system.md](../engineering/design-system.md). This file records the decisions.

## Information architecture

Five tabs, because the product has more than five areas and a tab bar with ten items is not a design:

| Tab | Job |
| --- | --- |
| Heute | The day: credits, sessions, the next deadlines, the latest notices |
| Studium | The degree: search, filters, requirements, sequence, tutorials, lecturers |
| Chat | Questions against the record, and against an open document |
| Campus | Vaihingen and Stadtmitte, schematic map, room search |
| Mehr | Profile and the rest: platforms, documents, peers, past exams, news, recognition, deadlines, settings |

Stack screens open on top of the tabs for a module, a person, a room, a document, a notice, and an exam topic. The paths are the file names under `app/`.

## Record before connectors

The design treats the academic record as a typed snapshot. Screens and the assistant read that snapshot. A connector, later, replaces the snapshot. Nothing in the UI reaches for a network client of its own except the optional assistant call.

That split is why `src/data/` and `src/domain/plan.ts` do not import React.

## Assistant design

Two engines, one transcript:

1. **Campus record.** A deterministic reader. It classifies the question, pulls the matching rows, and writes a short answer in the active language. It always runs.
2. **Grok.** Optional. The server sends the same facts to `grok-4.7` with `store: false`. If the call fails, the campus answer stays.

The reader is not a general chatbot with a hidden prompt about Stuttgart. If the record does not contain a fact, the campus answer does not invent one. The model is instructed the same way.

Document actions (summary, plain language, translation) use the same pair: an extractive summary first, a grounded rewrite when the server answers.

## Recognition and past papers

Recognition is a checklist and a draft, not a workflow that ends in "submitted". The examinations board remains the only place a request is decided.

Past papers are an index: term, topics, focus, hint. The design refuses a file slot for the exam itself.

## Visual design

Light only. White cards on mist `#F3F6F8`, anthracite text, mid blue for actions and section labels, light blue as a small second circle and a highlight. Hairline borders, no drop shadows, 18 px card radius. The mark is two overlapping circles drawn in the app, so there is no logo file to misuse.

German copy is the source. English is a full second string, not a machine pass left in the bundle. System names are not translated.

## What design refused

- A dark theme in this build. The corporate surface is white, and two themes would split every screen.
- A live map tile provider. The schematic is honest about being an orientation aid.
- Embedding Univers. The platform font avoids shipping a licensed university face.
- Password storage, even "for convenience".

## Exit check

Design is complete when a new screen can be placed on the tab or stack map, can read the record without a new network client, and can be built from the existing card, pill, meter, and button. The screens in `app/` follow that rule.
