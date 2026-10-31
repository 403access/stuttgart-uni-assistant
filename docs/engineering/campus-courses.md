# C@MPUS curriculum-element courses

One authenticated read from the C@MPUS portal, observed in a signed-in browser session for study `339485` (Philosophie) and element `287785`. It lists the courses (`Lehrveranstaltungen`) grouped under one curriculum node. Types live in `apps/mobile/src/campus/courses.ts`. A reduced fixture is `apps/mobile/src/campus/courses.sample.ts`. The assistant server calls this URL for `POST /v1/campus/courses`. The app shows the mapped list per node and does not store it. The route requires the app bearer token, and the server store is per `user_id`.

The portal is CAMPUSonline. The path segment `slc.cm.cs` is the student curriculum service, the same one as [campus-curriculum.md](campus-curriculum.md). This file records the one courses operation that was returned, not a full catalog of C@MPUS.

## Request

```http
GET /cusonline/ee/rest/slc.cm.cs/student/myStudies/{studyId}/myCurriculumElements/{elementId}/courses?$ctx=design=ca;lang=de&$filter=active-eq=true;currentlyValid-eq=true;partOfCurriculum-eq=true
Host: campus.uni-stuttgart.de
Authorization: Bearer <access_token>
Cookie: PSESSIONID=<portal_session>
Accept: application/json
```

| Piece | Observed value |
| --- | --- |
| Study | `{studyId}` — the observed call used `339485` |
| Node | `{elementId}` — the observed call used `287785` |
| `$ctx` | `design=ca;lang=de` |
| `$filter` | `active-eq=true;currentlyValid-eq=true;partOfCurriculum-eq=true` |

`coursesRequestUrl` in `apps/mobile/src/campus/courses.ts` builds this URL. Unlike the structure call, an element id is required: `POST /v1/campus/courses` answers `bad_element_id` without one. The study id defaults to the configured study when omitted, so callers pass the selected study explicitly — see [campus-study-switcher.md](campus-study-switcher.md).

The server reads `CAMPUS_BEARER_TOKEN` and `CAMPUS_SESSION_COOKIE` exactly as for the structure read. The token and `PSESSIONID` are not `EXPO_PUBLIC_` variables and are never returned or logged.

## Response

`Content-Type` is JSON. The top-level value is a collection with one entry:

| Field | Type | Observed |
| --- | --- | --- |
| `link` | `CampusLink[]` | `[]` on the collection |
| `resource` | Array | One entry |

The entry:

| Field | Type | Observed |
| --- | --- | --- |
| `link` | `CampusLink[]` | `[]` |
| `content.type` | `string` | `model-slc.cm.mystudy.CmCurriculumElementCourseGroupingsListDto` |
| `content.CmCurriculumElementCourseGroupingsListDto` | object | The grouping list |

The JSON key is `CmCurriculumElementCourseGroupingsListDto`, with a capital `C` — the same capitalization quirk as `CmStudyInfoDto` in [campus-studies.md](campus-studies.md). `coursesFromPayload` reads it and falls back to the lower-cased spelling.

The list object:

| Field | Observed |
| --- | --- |
| `courseGroupings` | Array with one grouping holding `courseList` |
| `noElementMessage` | `$slc_cm_course_grouping_no_course_in_node` |
| `currentSemesterId` | `216` |
| `displayAchievementList` | `true` |
| `currentSort` | `SEMESTER` |
| `studentCanToggle` | `true` |

## Course fields

Each `courseList` entry:

| Field | Notes |
| --- | --- |
| `id` | Course id, e.g. `461346` — also the `{key}` of the detail and bookmark links |
| `courseNumber.courseNumber` | For example `127262002` |
| `courseTitle` | `LangData`, German first |
| `courseTypeName` / `courseTypeShortName` | For example `Seminar` / `SE` (`en` short was `S`) |
| `courseTypeId` | Observed as `15` |
| `semester` | For example `2026 W`; `semesterId` was `216` |
| `duration` | Observed as `2` |
| `lectureships[].identityLibDto` | `firstName`, `lastName`, mapped as `Nachname, Vorname` — observed `Baumeister, David Craig` with teaching function `Vortragende*r` |
| `roomName` | For example `Breitscheid 02A - M 2.00 (BS02AEGM 2.00)`; `roomLink` points at the room UI |
| `startTime` / `endTime` | For example `2026-10-19T14:00` / `2026-10-19T15:30` |
| `detailPageLink.href` | Course page, e.g. `.../pages/slc.tm.cp/course/461346` |
| `courseRegistrationData.textAbove.textInfo` | Registration state, e.g. `Fixplatz zugewiesen` — the calendar treats a `Fixplatz` status as assigned to the student |
| `courseRegistrationData.action` | Text (e.g. `LV-Anmeldung bearbeiten`) plus a registration URL carrying `cStudyId` |

The mapped `CampusCourse` keeps `id`, `courseNumber`, the German `title`, `courseType`, `courseTypeShort`, `semester`, `semesterId`, `duration`, the lecturer names, `roomName`, `startTime`, `endTime`, `detailUrl`, `registrationStatus`, `registrationAction`, and `registrationUrl`. Rows without a numeric `id` or a title are dropped. The raw body is not stored.

## Server route

| Method | Path | Behavior |
| --- | --- | --- |
| `POST` | `/v1/campus/courses` | Calls the courses URL for `{ studyId, elementId }` and returns `{ studyId, elementId, courses }` |

`apps/server/catalog.mjs` lists it as `campus-courses`, so the Schnittstelle screen can replay it with an element id and the selected study. An element with no courses returns an empty list — a valid answer, not an error. Portal failures use the same codes and the same `detail` propagation as the structure read, documented in [campus-logging.md](campus-logging.md).

## Full course catalogue

The curriculum-element call above is enrollment-scoped. C@MPUS also exposes the semester's whole course catalogue to the same student session:

```http
GET /cusonline/ee/rest/slc.tm.cp/student/courses?$ctx=design=ca;lang=de
Host: campus.uni-stuttgart.de
Authorization: Bearer <access_token>
Cookie: PSESSIONID=<portal_session>
Accept: application/json
```

The read on 23 October 2026 returned:

| Field | Observed |
| --- | --- |
| `courses` | The first 20 entries |
| `totalCount` | `3546` for WiSe 2026/27 |
| `links` | Related filters (`myCourses`, `course-categories`, `courseInstructionLanguages`, `course-tags`, `courseFilterResources`) and bookmark create/delete links |

Each `courses` entry carries `id`, `courseNumber`, `courseTitle`, `courseTypeDto`, `semesterDto`, `lectureships`, `registrationAvailable`, `registrationInfo`, and `courseNormConfigs`. The catalogue is not limited to the student's studies: the first page alone contains courses from other faculties, for example `457764` `IHFG-Kolloquium`, `457777` `Datenbanksysteme`, and `457781` `Englisch: English for Space Engineering (C1)`.

Course-level detail and groups are readable for those rows too:

| Request | Observed |
| --- | --- |
| `GET /slc.tm.cp/student/courses/{id}?$ctx=design=ca;lang=de` | `200`; `cpCourseDetailDto.cpCourseDto` with the same fields plus `sameCourseDtos` |
| `GET /slc.tm.cp/student/courseGroups/firstGroups/{id}` | `200`; `courseGroupDtos` and `totalCount` |

This is metadata, not curriculum structure. Another study's master data and curriculum still answer `403`; the catalogue is the usable “not enrolled” read. See the authorization results in [campus-studies.md](campus-studies.md).

No server route and no app screen calls the catalogue yet. It also returns 20 rows per page, so a caller that wants the whole semester has to page through `totalCount` (or use the returned filter links).

## App usage

- The C@MPUS tab (`apps/mobile/app/(tabs)/campus-info.tsx`) shows a `Kurse` toggle under every structure node. It reads the course cache first (instant, offline) and only then the network with write-through. Switching studies reloads the tree, so the toggles always query the selected study.
- Tapping a course opens `/kurs/[id]`: number, type and short name, `SWS` from `duration`, semester, lecturers, registration state with a link into the portal registration, the next appointment (`Nächster Termin`, rendered from `startTime`/`endTime` via `formatDay`/`formatTime` in `apps/mobile/src/text.ts`), the room, and the C@MPUS detail page. It reads the session cache (`cacheCampusCourses` in `apps/mobile/src/auth/campus.ts`) and, after a restart, the persisted course cache.
- The courses view (`apps/mobile/app/kurse.tsx`) runs one server job per study (structures plus courses), then hydrates the local store from the server snapshots and merges. It hydrates from the course cache on open, so `Weiter laden` continues the remainder. Dynamic type pills come from the returned `courseTypeName` values — Seminar, Vorlesung, Übung, or whatever else the portal returns — plus search across title, lecturers, number, and room, and title/type/appointment sort.
- The Schnittstelle screen (`apps/mobile/app/api.tsx`) replays the call and lists the mapped courses for inspection.

## Course cache

`apps/mobile/src/campus/db.ts` persists courses per study in the same `campus-cache.db` (AsyncStorage on web):

| Table | Contents |
| --- | --- |
| `courses` | One row per `(study_id, id)` with all mapped fields; lecturers as JSON |
| `course_elements` | Which elements each course was seen on (a course can appear under several) |
| `courses_sync` | Fetched element ids (JSON, for resume), course count, finish time, `complete` flag |

`saveCourses` replaces one study's rows; `loadCachedCourses` and `loadCachedCoursesByElement` read them back; `findCachedCourse` searches all studies for the detail screen. Clearing a study's structure cache leaves its courses alone (and vice versa via `clearCachedCourses`); only the global `Alle Caches leeren` drops both. Round-trips on both backends are pinned by `tools/campus/check-campus-db.ts` (real SQLite via node:sqlite, AsyncStorage faked), wired into `npm run check`.

## What this call does not return

No grades, no ECTS totals, no timetable subscription. Registration stays a link: the action URL opens the portal registration, the app does not submit it.
