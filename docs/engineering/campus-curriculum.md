# C@MPUS curriculum structure

One authenticated read from the C@MPUS portal, observed in a signed-in browser session. The app does not call this URL yet. Types live in `src/campus/curriculum.ts`. A reduced fixture is `src/campus/curriculum.sample.ts`.

The portal is CAMPUSonline. The path segment `slc.cm.cs` is the student curriculum service. This file records the one operation that was returned, not a full catalog of C@MPUS.

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

The server reads `CAMPUS_BEARER_TOKEN` from `.env` or the environment. Copy the empty line from `.env.example`. Paste the token, or the whole header value `Bearer <token>`. The server strips a leading `Bearer `.

The name is not `EXPO_PUBLIC_`. A public Expo variable would be copied into the app bundle. This token stays in the Node process. `.env` is git-ignored. Do not commit a filled-in value.

`GET /health` and `GET /v1/campus/config` include `campus.tokenConfigured` and do not include the token. That server is `http://127.0.0.1:8787` after `npm run assistant`. `http://localhost:8081` is the Expo app and has no `/health` route. The login button writes the call and the result under itself, and the server prints `[campus]` lines without the token.

## Sign-in button

**Mit C@MPUS-Token anmelden** on the login screen calls `POST /v1/campus/login`. The server sends the token to the structure URL above and, when the call succeeds, opens a session named with the German root node. The token is not returned to the app.

A call from this server with only the bearer token was answered `401` and `$core.lib.authn.missing_session_cookie`. A call with only a guessed `JSESSIONID` was answered `401` and `Authorization missing`. C@MPUS expects the bearer token and the portal session cookie together when the request does not come from the already signed-in browser.

The signed-in browser on `https://campus.uni-stuttgart.de` shows these cookie names. Types are `CampusCookieName` and `CampusCookies` in `src/campus/cookies.ts`.

| Name | Role |
| --- | --- |
| `PSESSIONID` | Portal session. This is the value for `CAMPUS_SESSION_COOKIE`. |
| `CO_LANG` | Language preference. |
| `CO_PROFILE` | Profile preference. |
| `PROFILE_CHOOSER_ENABLED` | Profile-chooser preference. |
| `SESSION_MODIFICATION_DEBUG` | Debug flag. |

Put only the `PSESSIONID` value into `CAMPUS_SESSION_COOKIE`, without the name `PSESSIONID=`, and restart `npm run assistant`. The other four cookies are not sent. `CAMPUS_STUDY_ID` and `CAMPUS_CURRICULUM_ID` select the node. The defaults are the observed ids `339485` and `278343`.

How `{studyId}` and the root `{elementId}` are discovered is not part of this response. The body only describes the node that was requested and the nodes directly under it.

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

`Basismodule` and `Schlüsselqualifikationen fachübergreifend` carried the in-progress tag for semester `2026 W`. This is one student's tree, not the Informatik demonstration record in `src/data/modules.ts`.

## What this call does not return

No grades, no timetable, no ECTS totals, no lecturer, no room. Those would be other resources linked from a node. This document does not invent their paths.

Error bodies, paging, and the token audience were not in the observed response. A later call should record the status and the JSON when the token is missing or expired, and should keep the token on the server.
