# 5. Implementation

## Purpose

Record what was built, with the paths a later change should start from.

## Stack

- Expo SDK 57, React Native 0.86, React 19, TypeScript.
- Expo Router, file-based. Routes are in `app/`, not `src/app/`. Shared code is in `src/`.
- Async Storage for the device record of language, session, notes, reviews, recognition drafts, downloads, and chat.
- `expo-document-picker`, `expo-file-system`, and `expo-sharing` for import and export. The file system is imported only when a native export or a native text read actually runs.
- A Node server in `server/index.mjs` with no npm dependencies. It calls `https://api.x.ai/v1/responses`, and `server/oidc.mjs` calls the university token and userinfo endpoints. The browser calls the authorize endpoint.

`ios/` and `android/` are not in the tree. Continuous Native Generation produces them at build time from `app.json`.

## Layout of the client

```text
app/_layout.tsx              session gate and stack
app/login.tsx                demonstration sign-in
app/(tabs)/                  Heute, Studium, Chat, Campus, Mehr
app/modul/[id].tsx           module detail, plan mark, local review
app/dokument/[id].tsx        reader, summary, export, share
app/anrechnung.tsx           recognition draft
app/anforderungen.tsx        area progress
app/reihenfolge.tsx          suggestion and semester ladder
src/data/                    the demonstration record
src/domain/plan.ts           totals, locks, suggestion, search
src/assistant/answer.ts      deterministic answers
src/assistant/context.ts     localized fact input
src/assistant/remote.ts      optional call to the server
src/state/AppState.tsx       persistence
src/documents/io.ts          picker and export
```

The root layout keeps the splash up until storage has loaded and the route matches the session: login when signed out, the tabs when signed in.

## Record

`src/data/modules.ts` holds the curriculum used everywhere else. Passed modules carry grades. Enrolled modules carry the weekly sessions. Open modules carry prerequisites and, for the thesis, `minEarned: 120`.

`suggestNextSemester` in `src/domain/plan.ts`:

1. Picks an unlocked module that closes a remaining area, smallest gap first. For this student that is Numerische Mathematik.
2. Then fills up to 30 ECTS by always taking the largest remaining gap, breaking ties in the order math, key competencies, project, electives.
3. Skips locked modules. Machine Learning waits on the AI course. The thesis waits on 120 ECTS.

The check script expects that suggestion to be exactly 30 ECTS and to include numerics and the internship.

## Assistant

`buildAnswerInput` localizes the record. `buildLocalAnswer` scores intents (deadlines, schedule, credits, sequence, rooms, people, documents, reviews, exams, news, transfer, summary, module) and writes the answer. A module named in the question wins over a weak intent, which is why "Kann ich Maschinelles Lernen jetzt belegen?" returns the module and its lock instead of a generic plan.

`renderFacts` flattens the same input for the server. The server wraps it in a system message, sends `store: false`, and returns `output_text` or the message blocks inside `output`.

## Device features

- ILIAS sync adds the bundled ILIAS document ids to `downloadedIds`.
- Import uses the system document picker. Text files are read. A PDF without a text layer is stored as a title and an explanation.
- Notes are first-class imports with `source: 'note'`.
- Sharing flips `shared` on that note. Kommilitonen lists peer documents and shared imports.
- Export writes a `.txt` via the share sheet, or a download on web.

## Identity of the build

`app.json` names the app University Assistant, pins the light interface, and uses the bundle id `dev.demo.universityassistant` so the binary is not presented as an official university application.

## Exit check

Implementation of the prototype is complete when `npm run typecheck` passes and `npx expo export --platform web` emits the tab screens and the stack screens. Both were run for this build.
