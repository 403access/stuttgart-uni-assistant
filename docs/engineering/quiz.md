# Learning quiz

The **Quiz** tab turns module content into practice questions. It is local-only:
answers, streaks, and session history never leave the device.

Status: implemented. The tab is `app/(tabs)/quiz.tsx`, the topic overview is
`app/quiz/[topic]/index.tsx`, a round is `app/quiz/[topic]/run.tsx`, and the
reusable question views live in `src/quiz/components/`.

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
| `flashcard` | `flashcard.tsx` | `known` / `unknown` | Reveal the back, then self-assess. |

Every view receives the same props (`value`, `revealed`, `onChange`) from
`question-view.tsx`. The round screen owns the draft answer and the checked
state; the views render only.

The map view uses `react-native-svg`. A `MapQuestion` carries its own `viewBox`
and `backdrop` outlines, and every region carries an SVG `path` plus a label
anchor. The Europe shapes live in `src/quiz/maps/europe.ts`, generated from
Natural Earth 1:50m Admin 0 Countries and 1:10m Admin 1 States/Provinces (public
domain) with a Lambert conformal conic projection. The backdrop countries are
context only; the interactive regions are keyed by the same ids as `correct`.

## Content

`src/quiz/content/index.ts` registers modules. A module has topics, and a topic
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

`scripts/quiz-from-pdf.ts` turns PDFs into topics that are attached to an
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
`src/quiz/content/generated/<module>-<file>.ts`, and the CLI rewrites
`src/quiz/content/generated/index.ts`. `content/index.ts` attaches those topics
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
working offline.

### Free text checking

`src/quiz/evaluate.ts` lower-cases, strips accents and punctuation, collapses
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

## Rounds and progress

`src/quiz/session.ts` builds a round:

- `all` keeps the authored order,
- `quick` takes five questions, preferring unseen, then previously wrong ones,
- `review` repeats only questions whose last answer was wrong,
- `mixed` shuffles all questions and caps the round at twenty.

Progress is stored separately from the app store under
`university-assistant/quiz/v1` (`src/quiz/progress.tsx`). It keeps per-question
attempts, correct counts, the last result, the latest 60 sessions, and one
**active session per topic**. Keeping it separate means an older persisted app
state still loads without migration.

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

The provider is mounted in `app/_layout.tsx` so the tab, the overview, and the
round screen see the same record. The tab can reset everything after an `Alert`
confirmation.

## Checks

`scripts/check-quiz.ts` verifies unique ids, answer shapes, bilingual copy,
correct/incorrect evaluation, free-text tolerance, kind labels, and topic
registration. `scripts/check-quiz-pipeline.ts` checks slugging, normalization,
invalid drafts, source capping, the registry round-trip, and serializer
escaping. Both run as part of `bun run check`.
