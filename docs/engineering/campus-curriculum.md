# C@MPUS curriculum structure

One authenticated read from the C@MPUS portal, observed in a signed-in browser session. Types live in `src/campus/curriculum.ts`. A reduced fixture is `src/campus/curriculum.sample.ts`. The assistant server calls this URL for `POST /v1/campus/login` and `POST /v1/campus/structure`. The app stores the mapped nodes, not the raw portal body.

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

The `C@MPUS` tab (`app/(tabs)/campus-info.tsx`) renders the stored tree for the active study: the study switcher on top, the root and its groups as an indented tree, and a reload button. Tapping a node loads its children through `POST /v1/campus/structure` with that study's id. When the stored nodes belong to another study (`curriculumStudyId` differs from the selection), the tab says so and offers to load the matching structure.

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
