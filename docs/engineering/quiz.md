# Learning quiz

The **Quiz** tab turns module content into practice questions. It keeps working
offline with the bundled catalog and a local progress store. When a user is
signed in, checked answers and completed rounds are also synced to that account;
the operator dashboard shows every answer across all users.

Status: implemented. The tab is `apps/mobile/app/(tabs)/quiz.tsx`, the topic overview is
`apps/mobile/app/quiz/[topic]/index.tsx`, a round is `apps/mobile/app/quiz/[topic]/run.tsx`, and the
reusable question views live in `apps/mobile/src/quiz/components/`. The server catalog and
analytics live in `apps/server/quiz/`; the admin screens are
`apps/admin/public/pages/quiz/`.

## Question kinds

| Kind | View | Answer shape | Interaction |
| --- | --- | --- | --- |
| `single` | `single-choice.tsx` | option id | Tap one option. Options are shuffled per round. |
| `multiple` | `multiple-choice.tsx` | option ids | Toggle any number of options; the exact set has to match. |
| `true-false` | `true-false.tsx` | `boolean` | Two large truth options. |
| `free-text` | `free-text.tsx` | `string` | Typed answer with typo tolerance and optional keyword groups. |
| `matching` | `matching.tsx` | `Record<leftId, rightId>` | Tap a left term, then its right match. Assigned pairs can be removed. |
| `ordering` | `ordering.tsx` | ordered ids | Arrow buttons move an item up or down. |
| `cloze` | `cloze.tsx` | one string per blank | Inline inputs inside the sentence. |
| `map` | `map.tsx` | `Record<regionId, zoneId>` | Pick a zone chip, then tap a country on the map or in the country list. |
| `diagram` | `diagram.tsx` | region ids | Tap structures in an SVG figure; multiple correct regions toggle. |
| `flashcard` | `flashcard.tsx` | `known` / `unknown` | Reveal the back, then self-assess. |

Every view receives the same props (`value`, `revealed`, `onChange`) from
`question-view.tsx`. The round screen owns the draft answer and the checked
state; the views render only.

The map view uses `react-native-svg`. A `MapQuestion` carries its own `viewBox`
and `backdrop` outlines, and every region carries an SVG `path` plus a label
anchor. The Europe shapes live in `apps/mobile/src/quiz/maps/europe.ts`, generated from
Natural Earth 1:50m Admin 0 Countries and 1:10m Admin 1 States/Provinces (public
domain) with a Lambert conformal conic projection. The backdrop countries are
context only; the interactive regions are keyed by the same ids as `correct`.

The diagram view uses the same SVG approach for illustrated questions. A
`DiagramQuestion` owns a `viewBox`, `backdrop` outlines, labelled regions and one
or more correct region ids. Regions can be paths or circles and carry a fixed
tone, so the anatomy stays readable in both themes. The head cross-section and
the IPA vowel chart live in `apps/mobile/src/quiz/figures/vocal-tract.ts`. A topic can also
carry a `figure` (`QuizFigure`), which the overview renders as a numbered study
card above the round options; the card and the questions share the exact same
geometry, so a label can never drift from its tap target.

## Content

`apps/mobile/src/quiz/content/index.ts` registers modules. A module has topics, and a topic
has questions:

```ts
{
  id: 'ling-sprachfamilien',
  title: l('Sprachfamilien & Deutsch', 'Language families & German'),
  meeting: l('1. Sitzung', 'Session 1'),
  summary: l('…', '…'),
  questions: [
    {
      id: 'ling-deutsch-familie', // globally unique
      kind: 'single',
      prompt: l('Zu welcher Sprachfamilie gehört Deutsch?', '…'),
      options: [{ id: 'a', label: l('Indogermanisch', 'Indo-European') }],
      correctId: 'a',
      explanation: l('…', '…'),
      difficulty: 2,
    },
    // …
  ],
}
```

`l(de, en)` comes from `content/helpers.ts`. Every prompt and explanation is
bilingual. `mixedTopic` in `content/index.ts` combines all module questions for
the mixed round; do not add it to a module.

Registered modules:

- `ling` — Einführung in die Linguistik, three topics from the first session
  (56 questions).
- `bpp` — Basic Phonetics and Phonology, three topics from the first session on
  15 October 2026 (66 questions): the sagittal head with 14 labelled parts and
  hotspot questions, phonetics/phonology basics, and IPA/transcription with the
  vowel chart. The tab shows `Dr. Yulia Zuban · yulia.zuban@ling.uni-stuttgart.de`.
- `phil` — Einführung in die Geschichte der Philosophie, three topics from the
  first lecture on 19 October 2026 (93 questions). The tab shows
  `Prof. Dr. Christian Martin · christian.martin@philo.uni-stuttgart.de`.
- `prag` — Pragmatik I, four topics from the first session on 12 October 2026
  (71 questions): context and utterance meaning, Grice’s maxims and
  implicatures, speech acts, and organisation/exam. The tab shows
  `Fabian Dirscherl · fabian.dirscherl@ling.uni-stuttgart.de`.
- `syntax` — Syntax I, two topics from the introductory session on 15 October
  2026 (61 questions): syntax as a cognitive science with the adequacy levels,
  then word classes, constituent tests, phrases, and complements/adjuncts. The
  tab shows `Fabian Bross · fabian.bross@ling.uni-stuttgart.de`.

`QuizModule` also supports optional `lecturer` and `email` fields, shown in the
module header.

### Generated topics from PDFs

`tools/quiz-from-pdf.ts` turns PDFs into topics that are attached to an
existing module. It reads embedded PDF text, asks xAI for a structured topic,
validates it, and writes TypeScript source:

```bash
bun run quiz:from-pdf --module prag ./sitzung-2.pdf
bun run quiz:from-pdf --module phil ./pdfs/ --questions 12
bun run quiz:from-pdf --module prag ./sitzung-2.pdf --dry-run
```

- `--module` is required. The topic appears at the end of that module's topic
  list and in the mixed round.
- `--questions` defaults to 10 (minimum 5, maximum 30).
- `--kinds` defaults to `single,multiple,true-false,free-text,cloze,flashcard`.
  `matching` and `ordering` are also available; `map` is not generated.
- `--title` and `--meeting` override the generated metadata. `--source-lang`
  tells the model whether the PDF is German or English; both languages are
  always written.
- `--dry-run` prints the normalized topic as JSON without touching the repo.
- `--force` is required to replace a topic with the same id. IDs are derived
  from the module and file name, so renaming a file creates a new topic.
- `XAI_API_KEY` comes from `.env` or the environment. `QUIZ_MODEL` optionally
  overrides the model.

Each PDF becomes one topic in
`apps/mobile/src/quiz/content/generated/<module>-<file>.ts`, and the CLI rewrites
`apps/mobile/src/quiz/content/generated/index.ts`. `content/index.ts` attaches those topics
to their modules, so generated and hand-authored content share progress,
modes, the module hub, and validation. The pipeline never overwrites
hand-authored topics.

Only embedded text is read. A scanned PDF has to be OCRed first. The extracted
text is capped at 120,000 characters by default (`--max-chars`); the pipeline
truncates the end and says so.

Generated quizzes are still content: review the questions and explanations
before committing them. Only process material you are allowed to use, and do
not commit generated questions from copyrighted lecture material without
permission. They are committed source, not runtime data, so the app keeps
working offline. After a content change, run `bun run quiz:export-catalog` and
re-import the catalog in the dashboard if the server should pick it up before
the next first-start seed.

### Free text checking

`apps/mobile/src/quiz/evaluate.ts` lower-cases, strips accents and punctuation, collapses
whitespace, and folds `ß` to `ss`. Numeric answers also drop thousands
separators, so `6.000`, `6 000`, and `6000` match. Answers up to three
characters must match exactly; longer answers tolerate one typo (two above ten
characters). A surname matches a full name (`Saussure` for `Ferdinand de
Saussure`).

Longer answers can use `keywords` instead of a single spelling. Every inner
array is one required fact and any keyword in it satisfies that fact:

```ts
keywords: [
  ['indogermanisch', 'indoeuropean'],
  ['germanisch', 'germanic'],
  ['westgermanisch', 'west germanic'],
]
```

## Server catalog and answer sync

The app bundle stays the offline fallback; the running assistant server owns
the live catalog:

- `bun run quiz:export-catalog` writes `apps/server/quiz/catalog.json` from the
  bundled TypeScript content.
- On startup, `seedQuizCatalog()` (`apps/server/quiz/seed.mjs`) fills the quiz tables
  only when they are empty. **Katalog neu importieren** on the dashboard's
  Lernquiz page replaces the catalog from the snapshot; answers and rounds are
  never deleted by an import.
- `GET /v1/quiz/catalog` returns published modules, topics, and questions. The
  app caches the response under `university-assistant/quiz-catalog/v1` and
  installs it through `installQuizCatalog()`; a cached copy is used before the
  network request, so the quiz still opens offline.
- `POST /v1/quiz/sync` takes a bounded batch of checked answers and completed
  rounds. The app queues them under `university-assistant/quiz-sync/v1` and
  retries after sign-in, so an offline round is not lost. `clientId` makes the
  upload idempotent.
- Attempt rows snapshot the topic title, prompt, kind, raw answer JSON, and a
  human-readable answer text. Editing or deleting a question therefore never
  rewrites the answer history.

The admin side exposes `GET /v1/admin/quiz/overview`, list/detail endpoints for
topics and questions, `POST`/`DELETE` catalog mutations, `POST
/v1/admin/quiz/seed`, and `GET /v1/admin/quiz/attempts` (with topic, user,
correctness, and text filters plus `attempts/export.csv`). Rounds are under
`/v1/admin/quiz/sessions`; a single account's history is available at
`/v1/admin/quiz/users/:id`.

Question-specific fields are edited as JSON on the dashboard. The server
validates the shape for every kind before writing, so an invalid payload cannot
reach the app. The bundled snapshot and the server catalog are checked for
drift by `tools/check-quiz.ts`.

## Rounds and progress

`apps/mobile/src/quiz/session.ts` builds a round:

- `all` keeps the authored order,
- `quick` takes five questions, preferring unseen, then previously wrong ones,
- `review` repeats only questions whose last answer was wrong,
- `mixed` shuffles all questions and caps the round at twenty.

Progress is stored separately from the app store under
`university-assistant/quiz/v1` (`apps/mobile/src/quiz/progress.tsx`). It keeps per-question
attempts, correct counts, the last result, the latest 60 sessions, and one
**active session per topic**. Keeping it separate means an older persisted app
state still loads without migration. This local store remains the UI source of
truth; the server copy is for the account history and the operator dashboard.
Answers are queued only while a session token is active, and sign-out clears
the queue.

## Interrupted rounds

The topic overview is the entry point. It shows the topic summary, per-question
progress, the question types, and the mode picker. It also shows:

- **Unterbrochene Sitzung** when `activeSessions[topicId]` exists: mode, current
  question, answered count, correct/wrong so far, and the last edit time.
  **Fortsetzen** opens the same question ids in their original order and restores
  the draft answer, checked state, and results. **Neu starten** asks for
  confirmation first: restarting at question 1 discards the current round score,
  and a later wrong answer can lower the result.
- **Letzte abgeschlossene Runde** from the session history: score, mode, and
  local timestamp.

Starting a new mode while a round is interrupted uses the same confirmation.
The run screen saves `activeSessions[topicId]` after each check, self-assessment,
and question change, and on unmount when the user already interacted with the
round. Finishing a round records the session and deletes the active entry. Going
back from the run returns to the overview, so the interrupted session is visible
immediately; a later visit from the tab reads the same persisted record.

The provider is mounted in `apps/mobile/app/_layout.tsx` so the tab, the overview, and the
round screen see the same record. The tab can reset everything after an `Alert`
confirmation.

## Checks

`tools/check-quiz.ts` verifies unique ids, answer shapes, bilingual copy,
correct/incorrect evaluation, free-text tolerance, kind labels, and topic
registration. `tools/check-quiz-pipeline.ts` checks slugging, normalization,
invalid drafts, source capping, the registry round-trip, and serializer
escaping. Both run as part of `bun run check`.
