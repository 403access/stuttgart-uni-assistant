# C@MPUS study chooser

One authenticated read from the C@MPUS portal, observed in a signed-in browser session. It lists the studies the student is enrolled in. Types live in `src/campus/studies.ts`. A reduced fixture is `src/campus/studies.sample.ts`. The assistant server calls this URL for `GET /v1/campus/studies`. The app stores the mapped list, not the raw portal body. The route requires the app bearer token, and the snapshot is stored per `user_id`.

The portal is CAMPUSonline. The path segment `slc.cm.cs` is the student curriculum service, the same one as [campus-curriculum.md](campus-curriculum.md). This file records the one chooser operation that was returned, not a full catalog of C@MPUS.

## Request

```http
GET /cusonline/ee/rest/slc.cm.cs/student/myStudies/chooser?$ctx=design=ca;lang=de&$filter=
Host: campus.uni-stuttgart.de
Authorization: Bearer <access_token>
Cookie: PSESSIONID=<portal_session>
Accept: application/json
```

| Piece | Observed value |
| --- | --- |
| Origin | `https://campus.uni-stuttgart.de` |
| Service prefix | `/cusonline/ee/rest` |
| Resource | `myStudies/chooser` — no study id in the path |
| `$ctx` | `design=ca;lang=de` |
| `$filter` | Empty |

`studiesChooserUrl` in `src/campus/studies.ts` builds this URL. Unlike the structure request, the chooser is not scoped to a study. It is the call that reveals the study ids in the first place.

The server reads `CAMPUS_BEARER_TOKEN` and `CAMPUS_SESSION_COOKIE` from `.env` or the environment, exactly as for the structure read. See [campus-curriculum.md](campus-curriculum.md). The token and `PSESSIONID` are not `EXPO_PUBLIC_` variables and are not returned to the app.

## Response

`Content-Type` is JSON. The top-level value is a collection:

| Field | Type | Observed |
| --- | --- | --- |
| `link` | `CampusLink[]` | `[]` on the collection |
| `resource` | `StudyInfoResource[]` | One entry per study |

Each resource:

| Field | Type | Observed |
| --- | --- | --- |
| `link` | `CampusLink[]` | `[]` |
| `content.type` | `string` | `model-slc.cm.cs.student.cmStudyInfoDto` |
| `content.CmStudyInfoDto` | object | The study |

The JSON key is `CmStudyInfoDto`, with a capital `C`. That is the observed spelling, and it differs from the lower-cased `content.type` and from the lower-cased `curriculumStructureElementDto` in [campus-curriculum.md](campus-curriculum.md). `studiesFromChooser` reads `CmStudyInfoDto` and falls back to `cmStudyInfoDto`.

## Study fields

`CmStudyInfoDto`:

| Field | Type | Notes |
| --- | --- | --- |
| `studyId` | `number` | The `{studyId}` for the structure URL |
| `curriculumVersionId` | `number` | Version of the examination regulations |
| `curriculumId` | `number` | Curriculum group, for example `42` |
| `name` | `LangData` | German program name, with an English translation |
| `intendedDegree` | `LangData` | Observed as `Bachelor of Arts` |
| `versionIdentifier` | `string` | Same value as the root node `designation`, for example `84-127-14` |
| `studyStatus` | `string` | Observed as `STUDYING_ALLOWED` |
| `identifier` | `string` | For example `1590 84 127 1` |
| `customizationDto` | object | `color` and `icon`. `icon` was empty |
| `customizationLink` | `CampusLink` | `name` was `CmMyStudyCustomization` |
| `myStudyLink` | `CampusLink` | `name` was `curriculumElement` |
| `lastAccessed` | `boolean` | The study the student opened most recently |

`LangData` and `CampusLink` are the types from [campus-curriculum.md](campus-curriculum.md).

`myStudyLink.href` points at the root curriculum element, for example `.../myStudies/339485/myCurriculumElements/278343`. `elementIdFromLink` in `server/campus.mjs` and `myStudyElementId` in `src/campus/studies.ts` read the trailing `myCurriculumElements` id and reject anything else. That root id is the `{elementId}` the structure call uses, so the chooser is how both ids are discovered.

## Studies in the observed body

The read on 14 October 2026 returned two studies:

| studyId | Name | Degree | versionIdentifier | identifier | root elementId | lastAccessed |
| --- | --- | --- | --- | --- | --- | --- |
| 339484 | Linguistik | Bachelor of Arts | 84-152-23 | 1590 84 152 1 | 2496981 | true |
| 339485 | Philosophie | Bachelor of Arts | 84-127-14 | 1590 84 127 1 | 278343 | false |

Both had `studyStatus` `STUDYING_ALLOWED`. The Philosophie study is the one `CAMPUS_STUDY_ID` and `CAMPUS_CURRICULUM_ID` point at by default, and its root `278343` and designation `84-127-14` match the root in [campus-curriculum.md](campus-curriculum.md). The Linguistik study was marked `lastAccessed`.

## Server route

| Method | Path | Behavior |
| --- | --- | --- |
| `GET` | `/v1/campus/studies` | Calls the chooser and returns `{ studies, activeStudyId }` |

`server/catalog.mjs` lists it as `campus-studies`, so the Schnittstelle screen can replay it. The mapped `CampusStudy` keeps `studyId`, the German `name`, `intendedDegree`, `versionIdentifier`, `studyStatus`, `identifier`, `curriculumVersionId`, `curriculumId`, `color`, `lastAccessed`, and `elementId`. The raw body is not stored.

`campusStudies` lives on the device record next to `curriculumNodes`, plus `activeStudyId` for the selected study. Sign-out, and a switch to the demo, local, or OIDC session, clears both. A later chooser call replaces the whole list, because the endpoint returns every study at once. The selection rule (single study auto-selected, else stored choice, `lastAccessed`, first row) and the switcher UI are documented in [campus-study-switcher.md](campus-study-switcher.md).

Known portal failures are the same codes as the structure read: `missing_session_cookie`, `invalid_token`, `campus_unauthorized`, `token_missing`, `campus_failed`, and `campus_unexpected` when the body names no study. Every failure carries a `detail` string (`upstream <status>[: <portal message>]`), which the app shows and logs as documented in [campus-logging.md](campus-logging.md). The token and `PSESSIONID` are never logged. A first chooser read on 14 October 2026 returned `200` with the two studies above. A second read minutes later, after the portal session had turned over, returned `401` and `invalid_token`; the server mapped it to the `invalid_token` code.

## What this call does not return

No curriculum nodes, no grades, no ECTS totals, no timetable. The curriculum tree is the structure call in [campus-curriculum.md](campus-curriculum.md). This call only names the studies and the root node each one starts from.

Paging was not in the observed response. It is one student's study list, not the university's catalog.
