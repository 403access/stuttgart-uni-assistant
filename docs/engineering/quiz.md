# Learning quiz

The **Quiz** tab turns module content into practice questions. It keeps working
offline with the bundled catalog and a local progress store. When a user is
signed in, checked answers and completed rounds are also synced to that account;
the operator dashboard shows every answer across all users.

Status: implemented. The tab is `apps/mobile/app/(tabs)/quiz.tsx`, the topic overview is
`apps/mobile/app/quiz/[topic]/index.tsx`, a round is `apps/mobile/app/quiz/[topic]/run.tsx`, and the
reusable question views live in `packages/features/quiz/src/ui/components/`. The server catalog and
analytics live in `apps/server/quiz/`; the admin screens are
`apps/admin/src/routes/quiz.tsx`.

## Learning tools

Alongside the questions, the quiz ships small **learning tools** (in the UI:
*Lernwerkzeuge*) that explain content instead of testing it. They are listed in
the **Lernwerkzeuge** section on the quiz hub, linked from the topic they
belong to, and searchable under **Campus → Studium**. The first one is the
articulation studio.

### Articulation studio

`apps/mobile/app/quiz/studio/index.tsx` (route `/quiz/studio`) animates how a
sound is produced: the airstream rises from the lungs, the vocal cords either
vibrate or stay apart, and the tongue, lips and velum take the pose of the
selected sound. 24 sounds are bundled (stops, nasals, fricatives, approximants
and vowels), each with an IPA glyph, an example word and a one-line
explanation.

The figure reuses the quiz diagram: it draws `articulationRegions` (the static
anatomy from `vocalTractRegions`) with the same `DiagramCanvas` in `plain` mode,
then layers the movable articulators on top. The studio is its own package
(`@ua/feature-articulation`); the pose geometry lives in
`packages/features/articulation/src/core/geometry/`:

- `tongueOutline(pose)` builds a closed Catmull-Rom curve through a handful of
  anchors per `TonguePose`, so every tongue position shares one shape family.
- `lipOutlines(pose)` returns the two lip pads for a `LipPose`.
- `velumOutlines` rotate around `VELUM_HINGE` by `velumAngle(pose)`, which is how
  the velum opens and closes the nasal cavity.
- `cordOutlines(voiced)` draws the glottis open or closed.
- `airflowLane(lane, pose)` returns a polyline; the oral lane follows the tongue
  surface so the air never disappears inside the dorsum.
- `articulationFocus(sound)` is the point the focus ring pulses on.

`useArticulationTimeline` (`packages/features/articulation/src/ui/timeline.ts`)
drives one clock from 0 to 1 over the sound's phases. The flat and the 3D figure
both consume it, so the airstream, the pressure/burst ring and the pose always
show the same phase. Switching sounds cross-fades the pose layer. With the
platform's reduce-motion setting on, the figure stays static, the player hides
the play button and says so.

### Phases

A sound is not one still image, so `articulationPhases(sound)` returns the
stages it runs through, each with a label, a one-line explanation, a relative
weight and an airflow behaviour:

| Phase | What the studio shows |
| --- | --- |
| `approach` | The tongue and lips move from the neutral pose into the target pose while air rises from the lungs — no sound yet. |
| `closure` | The seal is complete. The lungs keep pushing, but the air cannot escape: air puffs stop at the stricture and the focus ring pulses as a pressure marker. Nasals use a `nasal` closure instead, where the air leaves through the nose. |
| `release` | The seal opens: the ring expands as a burst and the puffs leave through the stricture. |
| `aspiration` | English voiceless stops hold the vocal cords apart a little longer, so a puff of air follows the burst before the next sound voices. |
| `stricture` | Fricatives and approximants keep the tract narrow: air streams through with (`turbulent`) or without (`free`) friction noise. |
| `flow` | Vowels: the tract is open and the air flows freely. |

The sets come from the manner (and, for stops, the voicing), so `p`, `t` and `k`
run approach → closure → release → aspiration, while `b`, `d` and `g` stop after
the release. A common misunderstanding is worth stating in the copy: during the
closure the lungs *do* keep pushing air — it simply cannot escape, which is what
builds the pressure. The sound appears at the release.

The weights are relative; `articulationPhaseWindows(sound)` normalises them into
tiling 0–1 windows that the timeline and the website both use. The player renders
the phases as a chip strip plus the active phase's explanation.

The chips are controls, not a legend: tapping one calls `seekPhase`, which moves
the clock to that window without restarting the loop, so the learner can jump
between stages while the animation runs. Pausing keeps the frame instead of
resetting it, which is what makes stepping through a stop by hand practical.

**Speed** is a separate row (0.5×, 1×, 1.5×, 2×). The player passes it to the
timeline, which multiplies the per-frame delta, so changing speed mid-flight
never restarts the cycle or drops the current phase.

Two overlay switches sit next to the play control and only appear in the 3D
view. **Axes** draws an orientation gizmo in the corner — X red, Y green, Z blue,
projected through the same camera, so it turns with the model; axes pointing
away are dimmed. **Grid** draws a faint reference grid on the cut plane
(`ARTICULATION_GRID`), with stronger lines through the pivot, which gives the
model scale and a spatial frame. Both are aids: they never affect the scene.

### 3D view

A sagittal section is flat by nature, so the 3D view is built like a cutaway
anatomy model (`packages/features/articulation/src/core/scene3d.ts`):

- The head is an **open shell**: a back plate plus a swept rim, with the cut
  plane left open so the organs stay visible.
- Every organ is a **volume of its own** — depth, thickness and pivot in
  `articulationScene`/`articulationPoseLayers`. The renderer draws nine shaded
  slices per volume (darker towards the back) and then its lit face, which is
  what gives the tongue, palate and lips real thickness instead of a paper-cut
  look.
- The layers are **painter-sorted** by their projected depth, so a turn
  actually reveals the volumes behind one another.
- `projectScenePoint` is an orthographic camera with a **yaw** (turn) and a
  **pitch** (tilt); `ARTICULATION_PIVOT` keeps the model centred while it
  turns. `ui/scene.ts` turns the same projection into one SVG `matrix` per
  slice, so the path data never changes — only the transform does.

The model turns on **one axis**: dragging wraps the yaw at ±180°, and three
presets (front, left and right three-quarter) sit next to it. The camera's
pitch is a fixed elevation (`ARTICULATION_CAMERA.pitch`) — it is what gives a
turned view depth and is deliberately not a control. The drag schedules at most
one React render per frame and the shell drops from ten rim slices to five while
the finger is down. The canvas reports itself as an adjustable control, so
screen readers can turn it too.

It is all plain SVG — no WebGL, no `three.js`, no new dependency — so the view
works offline and looks the same on iOS, Android and the web.
`tools/articulation/check-articulation.ts` projects the airstream, the focus point and the
shell outline through the camera at the extreme angles and asserts that they
stay inside the padded frame.

### The studio on the website

The marketing page (`apps/site`) runs the same studio as a live demo in its
**Lernwerkzeuge** section. It has no build step, so the geometry is committed as a
snapshot: `bun run site:articulation` writes `apps/site/assets/articulation.js`
from `packages/features/articulation/src/core/site.ts`, and
`apps/site/articulation.js` renders it with plain SVG and a `requestAnimationFrame`
timeline. The snapshot is checked by `tools/articulation/check-articulation.ts`, so a new sound cannot
ship in the app while the website still shows the old set.

The sound catalog lives in `packages/features/articulation/src/core/sounds/`. Adding a sound
is a data-only change: pick a `manner`, an optional `place` (vowels use `shape`
instead), `voiced`, and the `pose`. `tools/articulation/check-articulation.ts` verifies unique ids,
bilingual copy, manner/velum/airstream consistency, drawable paths and that
`studioSoundForTopic` points at real topics and sounds.

`studioSoundForTopic` decides which sound a topic opens with; it is kept next to
the content rather than on `QuizTopic`, so importing a server catalog can never
remove the link.

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
anchor. The Europe shapes live in `packages/quiz-content/src/maps/europe.ts`, generated from
Natural Earth 1:50m Admin 0 Countries and 1:10m Admin 1 States/Provinces (public
domain) with a Lambert conformal conic projection. The backdrop countries are
context only; the interactive regions are keyed by the same ids as `correct`.

The diagram view uses the same SVG approach for illustrated questions. A
`DiagramQuestion` owns a `viewBox`, `backdrop` outlines, labelled regions and one
or more correct region ids. Regions can be paths or circles and carry a fixed
tone, so the anatomy stays readable in both themes. The head cross-section and
the IPA vowel chart live in `packages/quiz-content/src/figures/vocal-tract.ts`. A topic can also
carry a `figure` (`QuizFigure`), which the overview renders as a numbered study
card above the round options; the card and the questions share the exact same
geometry, so a label can never drift from its tap target.

## Content

`packages/quiz-content/src/content/index.ts` registers modules. A module has topics, and a topic
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

`tools/quiz/quiz-from-pdf.ts` turns PDFs into topics that are attached to an
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
`packages/quiz-content/src/content/generated/<module>-<file>.ts`, and the CLI rewrites
`packages/quiz-content/src/content/generated/index.ts`. `content/index.ts` attaches those topics
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

`packages/features/quiz/src/core/evaluate.ts` lower-cases, strips accents and punctuation, collapses
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
drift by `tools/quiz/check-quiz.ts`.

## Rounds and progress

`packages/features/quiz/src/core/session.ts` builds a round:

- `all` keeps the authored order,
- `quick` takes five questions, preferring unseen, then previously wrong ones,
- `review` repeats only questions whose last answer was wrong,
- `mixed` shuffles all questions and caps the round at twenty.

Progress is stored separately from the app store under
`university-assistant/quiz/v1` (`apps/mobile/src/quiz/progress.tsx`, with the reducer in `packages/features/quiz/src/core/answer.ts`). It keeps per-question
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

`tools/quiz/check-quiz.ts` verifies unique ids, answer shapes, bilingual copy,
correct/incorrect evaluation, free-text tolerance, kind labels, and topic
registration. `tools/quiz/check-quiz-pipeline.ts` checks slugging, normalization,
invalid drafts, source capping, the registry round-trip, and serializer
escaping. Both run as part of `bun run check`.
