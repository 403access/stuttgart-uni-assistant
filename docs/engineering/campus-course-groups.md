# C@MPUS course groups and appointments

One authenticated read from the C@MPUS portal, observed in a signed-in browser session on 18 October 2026 for course `461098`. It lists the groups (`Gruppen`) of one course with every dated appointment (`Termine`) and the group lecturers. The mapping lives in `apps/server/campus.mjs`; there is no app type or store for it — the app sees the mapped JSON as raw text. The assistant server calls this URL for `POST /v1/campus/course-groups`.

The path segment `slc.tm.cp` is the course-pages service — the same prefix as the `detailPageLink` hrefs of [campus-courses.md](campus-courses.md) (`.../pages/slc.tm.cp/course/461098`). `firstGroups` answers with the first-group set the course page shows.

## Request

```http
GET /cusonline/ee/rest/slc.tm.cp/student/courseGroups/firstGroups/{courseId}
Host: campus.uni-stuttgart.de
Authorization: Bearer <access_token>
Cookie: PSESSIONID=<portal_session>
Accept: application/json
```

`courseGroupsRequestUrl` in `apps/server/campus.mjs` builds this URL. A course id is required, same as the element id of the courses read: `POST /v1/campus/course-groups` answers `bad_course_id` without one. The server reads `CAMPUS_BEARER_TOKEN` and `CAMPUS_SESSION_COOKIE` exactly as for the other portal reads, and renews the bearer through the refresh endpoint on the same cadence (see [campus-curriculum.md](campus-curriculum.md)).

## Response

`Content-Type` is JSON. Unlike the structure and courses reads, the answer is **not** wrapped in a `resource` array — `courseGroupDtos` sits at the top level, next to `links` and `totalCount`. `groupsFromPayload` reads `courseGroupDtos` and ignores the rest.

Each entry (observed shape):

| Field | Observed |
| --- | --- |
| `id` | Group id, e.g. `421533` |
| `name` | `LangData`-free string, e.g. `Standardgruppe` |
| `courseId` | The requested course id, e.g. `461098` |
| `appointmentDtos` | Every dated session of the group — one per calendar week, e.g. 16 for a winter semester |
| `appointmentSeriesDtos` | The series summary (`seriesBegin`/`seriesEnd`, begin/end time, resource, weekdays) the UI derives from |
| `lectureshipDtos` | Group lecturers: `identityLibDto` (`firstName`, `lastName`, obfuscated id, `businessCardLink`) plus `teachingFunction` (e.g. key `V`, `Vortragende*r`) |
| `standardgroupFlag` | `J`/`N` |
| `maxNumberOfParticipants` / `confirmedPlaces` | Group capacity, e.g. `60` / `60` |
| `limitedParticipationFlag` / `schilfFlag` | `J`/`N` |

Each `appointmentDtos` entry:

| Field | Notes |
| --- | --- |
| `id` | Appointment id, e.g. `3977982` |
| `weekday` | `key` (`Do.`) plus `langDataType` (`value` `Donnerstag`, translations `Thursday`) — German first, like the courses title |
| `timestampFrom` / `timestampTo` | `{ coType: 'datetime', value: '2026-10-15T14:00:00' }` — local wall time, no timezone suffix |
| `appointmentEventTypeDto` | `LangData` name (e.g. `Abhaltung` / `regular class`) plus `key` `A` |
| `resourceId` / `resourceName` / `resourceUrl` | Room, e.g. `Kepler 11 (K1) - M 11.32 (KP1103M 11.32)`; the URL is a **relative path** (`/app/desktop/#/pl/ui/$ctx/ris.einzelRaum?raumKey=7235`) |
| `appointmentStatusType` | e.g. `CONFIRMED` |
| `appointmentLectureshipDto` | Slots that differ from the group lecturers |
| `appointmentSeriesId` | e.g. `255839` — shared by every appointment of one series |
| `interGroupFlag` / `urlGroups` | Observed as `J` / `[]` |

## Mapped shape

`groupsFromPayload` / `appointmentFromPayload` keep:

- **Group:** `id`, `name`, `courseId`, `standard` (from `standardgroupFlag === 'J'`), `limitedParticipation`, `maxParticipants`, `confirmedPlaces`, `lecturers` (`Nachname, Vorname`, empty slots dropped), and `appointments`.
- **Appointment:** `id`, `weekday` (German, from `langDataType`), `weekdayShort` (`key`), `date` (first 10 chars of `timestampFrom.value`), `startTime`/`endTime` (first 5 chars of both), `eventType`, `room`, `roomUrl` (relative paths resolved against `https://campus.uni-stuttgart.de` by `portalUrl`), `status`, `seriesId`, and its own `lecturers` (often empty — the group lecturers apply).

Rows without a numeric `id` (group) or without an id and a `timestampFrom` (appointment) are dropped. An empty `courseGroupDtos` list is a valid answer, not an error. The response is not stored on the server; the call itself lands in the portal history (`logPortalCall`, op `course-groups`) like every read.

## Server route

| Method | Path | Behavior |
| --- | --- | --- |
| `POST` | `/v1/campus/course-groups` | Calls the groups URL for `{ courseId }` and returns `{ courseId, groups }` |

`apps/server/catalog.mjs` lists it as `campus-course-groups` with `acceptsCourseId: true`, so the Schnittstelle screen can replay it with a course id. Portal failures use the same codes and the same `detail` propagation as the courses read.

## What this call does not return

No registration or group booking. The `links` entry with rel `create`/`delete` points at `myCoursesBookmarked` (a course bookmark, not a group assignment) and is not acted on — this endpoint is read-only, like every portal read here.
