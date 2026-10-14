# C@MPUS logging and failure diagnosis

Campus calls fail at two hops: app to assistant server, assistant server to portal. Both hops are logged, and the portal answer travels back to the app as a `detail` string. No log carries the bearer token, `PSESSIONID`, or the full portal body.

## App side

`src/auth/campus-log.ts` keeps a ring buffer of the last 30 campus calls (login, structure, studies). Every call in `src/auth/campus.ts` records one entry through `recordCampusCall`:

| Field | Contents |
| --- | --- |
| `time` | Local `HH:MM:SS` |
| `op` | `login`, `structure`, or `studies` |
| `studyId` / `elementId` | The requested ids (`-` when the call has none) |
| `ok` | Whether the call succeeded |
| `httpStatus` | Assistant-server HTTP status |
| `code` | Error code on failure (`campus_failed`, `invalid_token`, …) |
| `detail` | Portal answer, e.g. `upstream 500: …` (see below) |
| `elapsedMs` | Round-trip time |

Each entry is also printed to the Metro console as `[campus-log]`, next to the existing `[campus-login]`, `[campus-studies]`, and `[campus-structure]` lines. `useCampusLog` re-renders a component on every new entry; `lastCampusLog(n)` reads without subscribing.

The study switcher (`src/components/study-selector.tsx`) shows the newest entries under a switch error, so the failing request is visible where it happened:

```text
12:03:11 structure s=339484 e=2496981 → campus_failed upstream 500: … (502) · 812ms
```

## Server side

`server/campus.mjs` maps the portal answer in `readCampus`:

- The portal message is read by `portalMessage`, which checks the observed `resource[0].content.coErrorDto.message` shape first and falls back to `error.message`, `message`, `error_description`, and `error`. Anything else is an empty message, never an exception.
- Every failure carries `detail`: `upstream <status>[: <portal message>]`, or `request failed: <reason>` when the portal was unreachable. The request logs the upstream status, the portal message, and the elapsed milliseconds. The token and cookie are only ever logged as present/absent booleans.
- `server/index.mjs` forwards `{ error, detail, status }` for the login, structure, and studies routes, and logs each campus request with an id, timestamp, and request body: `[campus #7 …] POST /v1/campus/structure body={"elementId":…,"studyId":…}` followed by the `ok` or `failed … detail=…` line.

## Stale server detection

A `detail` of `http <status> vom Assistenz-Server ohne Detail` means the assistant server answers in the old `{ error }` shape without `detail`. The running process predates the logging change: stop it and restart with `npm run assistant`. The switcher states this explicitly. Absent `[campus #N]` lines in the server terminal confirm the same thing.

## Diagnosing a failed study switch

1. Restart the assistant server so the code matches this repository.
2. Tap the study again.
3. Read the in-app call log under the error (request ids, statuses, portal message, duration).
4. Match it with the `[campus #N]` lines in the server terminal, which show the request body the app sent and the upstream answer.

Pinned by `server/campus.test.mjs`: `portalMessage` extraction, `parseStudyId` validation, and detail propagation for a 500 with a `coErrorDto` message and for an empty 403 body.
