# C@MPUS curriculum structure

One authenticated read from the C@MPUS portal, observed in a signed-in browser session. Types live in `src/campus/curriculum.ts`. A reduced fixture is `src/campus/curriculum.sample.ts`. The assistant server calls this URL for `POST /v1/campus/login` and `POST /v1/campus/structure`. The app stores the mapped nodes, not the raw portal body. Both routes require the app bearer token, and the server stores the rows under the caller's `user_id`.

The two ids in the path are discovered by the study chooser in [campus-studies.md](campus-studies.md). The portal is CAMPUSonline. The path segment `slc.cm.cs` is the student curriculum service. This file records the one structure operation that was returned, not a full catalog of C@MPUS.

## Request

```http
GET /cusonline/ee/rest/slc.cm.cs/student/myStudies/{studyId}/myCurriculumElements/{elementId}/structure?$ctx=design=ca;lang=de&$filter=active-eq=true;currentlyValid-eq=true;partOfCurriculum-eq=true
Host: campus.uni-stuttgart.de
Authorization: Bearer <access_token>
Accept: application/json
```

| Piece | Observed value |
| --- | --- |
| Origin | `https://campus.uni-stuttgart.de` |
| Service prefix | `/cusonline/ee/rest` |
| Study | `{studyId}` — one observed call used `339485` |
| Node | `{elementId}` — that call asked for the root `278343` |
| `$ctx` | `design=ca;lang=de` |
| `$filter` | `active-eq=true;currentlyValid-eq=true;partOfCurriculum-eq=true` |

`curriculumStructureUrl` in `src/campus/curriculum.ts` builds this URL. The two ids are per student. They are not constants of the app.

The observed call sent `Authorization: Bearer` and no other credential. A browser session cookie is not this header.

## Token in `.env`

The server reads `CAMPUS_BEARER_TOKEN` from `.env` or the environment. Copy the empty line from `.env.example`. Paste the token, or the whole header value `Bearer <token>`. The server strips a leading `Bearer `. `npm run campus:token -- <token>` writes the value for you and never prints it back; omit the value to type it without echoing. `npm run campus:secret -- list` shows which secrets are set, masked.

An expired bearer no longer means a manual rotation round. The server renews the token **proactively**: on start, and then every `CAMPUS_REFRESH_MINUTES` minutes (default 10, clamped to 1–1440), it sends `POST .../ee/rest/auth/token/refresh` — an empty POST carrying only the `PSESSIONID` cookie, exactly like the signed-in browser — while a session cookie is configured. A failed proactive renewal is only logged; the reactive path stays as the safety net: on `invalid_token` (or any other 401) during a portal call the server renews once and retries the failed call with the fresh token. The renewed token lives in the process (`tokenRefreshed: true` in the public status); a server restart falls back to `.env`, so persist a fresh value with `npm run campus:token` when the log line says it was refreshed. Renewal needs a valid `PSESSIONID`: with a dead cookie the original `invalid_token` (or `missing_session_cookie`) still reaches the app.

The name is not `EXPO_PUBLIC_`. A public Expo variable would be copied into the app bundle. This token stays in the Node process. `.env` is git-ignored. Do not commit a filled-in value.

`GET /health` and `GET /v1/campus/config` include `campus.tokenConfigured` and do not include the token. That server is `http://127.0.0.1:8787` after `npm run assistant`. `http://localhost:8081` is the Expo app and has no `/health` route. The login button writes the call and the result under itself, and the server prints `[campus]` lines without the token.

## Sign-in button

**Mit C@MPUS-Token anmelden** on the login screen calls `POST /v1/campus/login`. The server sends the token and `PSESSIONID` to the structure URL above, then reads the study chooser, and returns the German root name, the designation, the nodes on that level, and `{ studies, activeStudyId }`. The app stores those nodes and the study list with the session. The token and cookie are not returned.

**Schnittstelle** (`app/api.tsx`, linked from Mehr) lists the routes from `GET /v1/api` and can send the ones marked for replay. `POST /v1/campus/structure` accepts an optional positive integer `elementId` and an optional `studyId`, and calls the same path for that study and node; a `studyId` without an `elementId` resolves the root through the chooser. It does not accept a URL. A tap on a loaded node sends that node’s id. OIDC start, exchange, and logout stay in the browser sign-in flow and are not replayed from this screen.

## Server routes

`server/catalog.mjs` is the list. The screen refuses any other path.

| Method | Path | Replay from Schnittstelle |
| --- | --- | --- |
| `GET` | `/health` | Yes. Status only |
| `GET` | `/v1/campus/config` | Yes. `tokenConfigured`, `sessionCookieConfigured`, `studyId`, `elementId` |
| `GET` | `/v1/oidc/config` | Yes. No client secret |
| `POST` | `/v1/campus/login` | Yes. Root structure, chooser list, then a campus session |
| `POST` | `/v1/campus/structure` | Yes. Optional `elementId` and `studyId` |
| `GET` | `/v1/campus/studies` | Yes. The study chooser, see [campus-studies.md](campus-studies.md) |
| `POST` | `/v1/assist` | Yes. A fixed short question, so the button does not invent a prompt |
| `POST` | `/v1/oidc/start` | No |
| `POST` | `/v1/oidc/exchange` | No |
| `POST` | `/v1/oidc/logout` | No |

The client types are `src/auth/campus.ts` and `src/auth/api.ts`. `nodesFromCurriculum` in `server/campus.mjs` maps each `curriculumStructureElementDto` to `CurriculumNode`: `id`, `designation`, `elementType`, `name` (German, then `value`), `parentId`, `completed` from `enabledInfo.completed`, and `inProgress` when a tag has `tagType` `IN_PROGRESS`. The raw portal body is not stored.

`curriculumNodes` lives on the device record, with `curriculumStudyId` naming the study the tree belongs to. Sign-out, and a switch to the demo, local, or OIDC session, clears both. Reset keeps them while the campus session stays. A later structure call merges nodes by id, so loading a child does not drop the root; a study switch or a fresh login replaces the whole tree instead, so nodes from another study never linger.

Known portal failures, mapped to short codes and never logged with the token or cookie. Every failure carries a `detail` string with the upstream status and the portal message, shown in the app and in the logs as documented in [campus-logging.md](campus-logging.md):

| Portal signal | App code |
| --- | --- |
| `missing_session_cookie` | `missing_session_cookie` |
| `invalid_token` | `invalid_token` |
| Any other 401 | `campus_unauthorized` |
| Token unset | `token_missing` |
| Other failure, or a body with no named node | `campus_failed` or `campus_unexpected` |
| `elementId` that is not a positive integer | `bad_element_id` |
| `studyId` that is not a positive integer | `bad_study_id` |

A call from this server with only the bearer token was answered `401` and `$core.lib.authn.missing_session_cookie`. A call with only a guessed `JSESSIONID` was answered `401` and `Authorization missing`. C@MPUS expects the bearer token and the portal session cookie together when the request does not come from the already signed-in browser.

The signed-in browser on `https://campus.uni-stuttgart.de` shows these cookie names. Types are `CampusCookieName` and `CampusCookies` in `src/campus/cookies.ts`.

| Name | Role |
| --- | --- |
| `PSESSIONID` | Portal session. This is the value for `CAMPUS_SESSION_COOKIE`. |
| `CO_LANG` | Language preference. |
| `CO_PROFILE` | Profile preference. |
| `PROFILE_CHOOSER_ENABLED` | Profile-chooser preference. |
| `SESSION_MODIFICATION_DEBUG` | Debug flag. |

Put only the `PSESSIONID` value into `CAMPUS_SESSION_COOKIE`, without the name `PSESSIONID=`, and restart `npm run assistant`. `npm run campus:session -- <value>` writes it; paste the whole cookie string and the script keeps just the `PSESSIONID`. The other four cookies are not sent. `CAMPUS_STUDY_ID` and `CAMPUS_CURRICULUM_ID` select the node. The defaults are the observed ids `339485` and `278343`. The normalization, the masked output, and the refusal cases of both updater commands are pinned by `scripts/set-campus-secret.test.mjs`, which `npm run check` runs.

How `{studyId}` and the root `{elementId}` are discovered is the chooser call in [campus-studies.md](campus-studies.md). The body only describes the node that was requested and the nodes directly under it.

## Response

`Content-Type` is JSON. The top-level value is a collection:

| Field | Type | Observed |
| --- | --- | --- |
| `link` | `CampusLink[]` | `[]` on the collection |
| `resource` | `CurriculumStructureResource[]` | One entry per node |

Each resource:

| Field | Type | Observed |
| --- | --- | --- |
| `link` | `CampusLink[]` | Related links, see below |
| `content.type` | `string` | `model-slc.cm.mystudy.curriculumStructureElementDto` |
| `content.curriculumStructureElementDto` | object | The node |

`CampusLink` is `rel`, `href`, and sometimes `name`.

| `name` | When it appears |
| --- | --- |
| `curriculumStructureElementChildren` | The node has a `structure/children` resource |
| `curriculumElement` | The node itself, without `/structure` |

`Drittversuche` and `Orientierungsprüfung` in the observed body had only `curriculumElement`. The other nodes had both links.

## Node fields

`CurriculumStructureElementDto`:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `number` | Same id as `{elementId}` for that node |
| `designation` | `string` | Short code, for example `84-127-14`, `100`, `DV` |
| `elementType` | `ROOT` or `DEFAULT` | `ROOT` was the study. Groups were `DEFAULT` |
| `name` | `LangData` | `value` plus `translations.translation[]` |
| `enabledInfo` | `EnabledInfo` | Five booleans, below |
| `iconName` | `string` | `stp_0` on the root, `stp_5` on groups |
| `isActive` | `boolean` | |
| `tags` | `CurriculumTag[]` | Empty, or an in-progress tag |
| `sortPriority` | `number`, optional | Absent on the root and on some leaves |
| `parentId` | `number`, optional | Absent on the root. Children pointed at `278343` |

`EnabledInfo`: `enabled`, `active`, `partOfCurriculum`, `validInTime`, `completed`. In the observed body every node had the first four `true` and `completed` `false`.

`LangData.coType` was `model-core.lib.model.langdata`. `translations.translation[]` has `lang` and an optional `value`. `fr` and `it` were present with no `value`. `langText` reads a language and falls back to `value`.

`CurriculumTag`:

| Field | Observed |
| --- | --- |
| `text` | `$slc_cm_my_study_in_progress_tag` |
| `tagType` | `IN_PROGRESS` |
| `replacementData` | `{ "key": "SEMESTER", "value": "2026 W" }` |

## C@MPUS tab

The `C@MPUS` tab (`app/(tabs)/campus-info.tsx`) renders the stored tree for the active study: the study switcher on top, the root and its groups as an indented tree, and a reload button. Tapping a node loads its children through `POST /v1/campus/structure` with that study's id. A `Kurse` toggle under every node loads that node's courses through `POST /v1/campus/courses`, documented in [campus-courses.md](campus-courses.md). When the stored nodes belong to another study (`curriculumStudyId` differs from the selection), the tab says so and offers to load the matching structure.

## Full sync and SQLite cache

One structure call returns a node and the level below it, so the whole tree needs one call per node. The walk runs on the assistant server as a background job (`POST /v1/campus/sync`, `server/sync.mjs`): breadth-first from the root, three calls in flight, every unseen id queued exactly once, a failing element retried up to three times before it lands in `failedIds`. The app only starts, polls (`runServerSync` in `src/campus/server-sync.ts`), and cancels — progress persists server-side as it is fetched, so cancelling keeps partials and the next job resumes where the last stopped. Each job completion lands in the call history as a `sync` entry.

`src/campus/db.ts` keeps the client's own copy in the on-device SQLite database `campus-cache.db` (`expo-sqlite`):

| Table / column | Contents |
| --- | --- |
| `curriculum_nodes` | One row per `(study_id, id)`: designation, type, German name, parent, completion flags, fetch time, plus `expanded` — whether that node's own structure call already succeeded |
| `curriculum_sync` | One row per study: root element, node count, finish time, `complete` flag |

Replacing per study keeps trees apart; partial walks (cancelled or with skipped nodes) are stored with `complete` false. The tab hydrates from the cache on open — switching to a cached study shows its tree instantly — and offers `Alles laden` / `Weiter laden`, cancel, and cache clearing per study; each button run hydrates the local copy from the server snapshot when the job finishes. Courses have their own per-study cache, documented in [campus-courses.md](campus-courses.md).

Native and web caches are separate devices stores: SQLite lives in the app's files, the web fallback in that browser's `localStorage`. A bulk load in Expo Go does not appear in the browser and vice versa — each needs its own run.

## Server as source of truth

The assistant server keeps the same tables in `server/campus-server.db` and fills them from every portal read; the client cache is the offline copy. Reads are live-first with store fallback (`cached: true` in the response), and `POST /v1/campus/sync` walks whole studies in background jobs so the app no longer has to hammer the portal itself. Details in [architecture.md](architecture.md).

The web-only structure browser (`app/strukturen.tsx`, linked from the C@MPUS tab) reads all cached studies side by side: per-study fetch buttons with resume, per-study and global cache clearing, search across names and designations, type and completion filters, name/code/id sort, an expandable tree per study, and the session API history in the right column — itself searchable, filterable by status and operation, and sortable by time or duration, with failures in red. Tapping a search hit reveals it in the tree: ancestors expand, the node selects, and the column scrolls to it. The root element stays hidden by default (the header line already carries the study name plus element id, section and node counts); a `Wurzel` toggle restores the classic view. Only the arrow toggles a branch; tapping the row itself opens a node detail panel (designation, status, study, parent, children, courses — cached courses show instantly, otherwise a load button fetches once) in place of the call detail. Clicking a history entry opens a detail panel with the full call data and a reload button for that exact call. Expanding, searching, filtering, and sorting touch only cached rows — the page issues no structure calls itself.

The browser is assembled from shared, tree-agnostic pieces: `CurriculumTree` (`src/components/curriculum-tree.tsx`) draws any node list as an indented tree and is reused by the C@MPUS tab; `CurriculumToolbar` (`src/components/curriculum-toolbar.tsx`); `StudyCacheCard` (`src/components/study-cache-card.tsx`); `ApiHistory` (`src/components/api-history.tsx`) and `ApiEntryDetail` (`src/components/api-entry-detail.tsx`); and `CurriculumNodeDetail` (`src/components/curriculum-node-detail.tsx`). The pure grouping, sorting, filtering and summary helpers live in `src/domain/curriculum.ts`, with the node status labels in `src/labels.ts`.

`expo-sqlite` is intentionally absent from the web bundle: its web worker breaks Metro bundling without a wasm/`SharedArrayBuffer` setup, so on web `src/campus/db.web.ts` (AsyncStorage in `localStorage`) implements the same API instead of `src/campus/db.ts`. Syncing, resuming, and hydrating work identically — the rows just live in `localStorage` instead of SQLite on web.

## Nodes in the observed body

The root was `Philosophie` (`ROOT`, id `278343`, designation `84-127-14`). The groups under it, in response order:

| Id | Designation | German name |
| --- | --- | --- |
| 287780 | 57410 | Interdisziplinäre Studien |
| 287781 | 80370 | Bachelorarbeit Philosophie |
| 287776 | 500 | Wahlbereich |
| 567165 | 990 | Fremdsprachennachweis |
| 287777 | 600 | Fachfremde Orientierung |
| 287779 | 900 | Schlüsselqualifikationen fachübergreifend |
| 287772 | 100 | Basismodule |
| 287773 | 200 | Kernmodule |
| 560866 | DV | Drittversuche |
| 287774 | 300 | Ergänzungsmodule |
| 560867 | OP | Orientierungsprüfung |
| 287775 | 400 | Schlüsselqualifikationen fachaffin |

In the first captured body, `Basismodule` and `Schlüsselqualifikationen fachübergreifend` carried the in-progress tag for semester `2026 W`. A later read through `POST /v1/campus/structure` on 14 October 2026 returned the same 13 nodes and marked only `Basismodule` in progress. This is one student's tree, not the Informatik demonstration record in `src/data/modules.ts`.

## What this call does not return

No grades, no timetable, no ECTS totals, no lecturer, no room. Those would be other resources linked from a node. This document does not invent their paths.

Paging and the token audience were not in the observed response. The error codes above are the ones this server has mapped. The token and `PSESSIONID` stay in the server environment.
