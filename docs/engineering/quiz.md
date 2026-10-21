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
| `map` | `map.tsx` | `Record<regionId, zoneId>` | Pick a zone chip, then tap a country on a schematic map or in the country list. |
| `flashcard` | `flashcard.tsx` | `known` / `unknown` | Reveal the back, then self-assess. |

Every view receives the same props (`value`, `revealed`, `onChange`) from
`question-view.tsx`. The round screen owns the draft answer and the checked
state; the views render only.

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

Progress is stored separately from `AppState` under
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
registration. It runs as part of `bun run check`.
