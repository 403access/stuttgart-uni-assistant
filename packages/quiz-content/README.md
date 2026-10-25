# @ua/quiz-content

The bilingual quiz catalogue: studies, modules, topics, questions, generated topics, diagrams, and maps. Types live in `./types`; the catalogue is the package root.

The server does not import this package. `bun run quiz:export-catalog` writes `apps/server/quiz/catalog.json`, and the server seeds from that snapshot.
