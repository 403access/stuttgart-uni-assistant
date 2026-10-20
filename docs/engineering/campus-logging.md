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

Every call is also persisted: `appendApiCall` writes it fire-and-forget into the `api_calls` table (SQLite on native, AsyncStorage on web — same platform split as the structure cache), capped at the newest 1000 rows and keyed by a stable `uid`. `readApiLog(limit)` reads newest-first. The structure browser merges the live session log with the stored log by `uid`, so the history survives reloads and keeps growing across sessions. It additionally merges the server's portal hops (`GET /v1/campus/calls`, one row per attempt including retries, ordered by full timestamp), so syncs started anywhere stay traceable. Its `Verlauf löschen` button empties both the session log and the store. Logging never throws into the call it records.

Each entry carries more than metadata: `request` names what was asked (`element=… study=…`) and `response` summarizes what came back (`30 Knoten · Philosophie, Basismodule, …`, capped at 300 characters). The mapped payload additionally lands in `responseJson` (compact JSON, arrays clipped to fit ~8000 characters so it always parses) — never the raw portal body. The detail panel renders the payload as a count with name pills, as raw JSON, or as a collapsible syntax-highlighted tree (`JsonTree` in `src/components/json-tree.tsx`) behind a Text/JSON/Pretty toggle, and the history search covers the summary fields.

The study switcher (`src/components/study-selector.tsx`) shows the newest entries under a switch error, so the failing request is visible where it happened:

```text
12:03:11 structure s=339484 e=2496981 → campus_failed upstream 500: … (502) · 812ms
```

## Server side

`server/campus.mjs` maps the portal answer in `readCampus`:

- The portal message is read by `portalMessage`, which checks the observed `resource[0].content.coErrorDto.message` shape first and falls back to `error.message`, `message`, `error_description`, and `error`. Anything else is an empty message, never an exception.
- Every failure carries `detail`: `upstream <status>[: <portal message>]`, or `request failed: <reason>` when the portal was unreachable. The request logs the upstream status, the portal message, the user id, and the elapsed milliseconds. The token and cookie are never logged.
- Portal hops land in `user_portal_calls` with the calling `user_id`; `GET /v1/campus/calls` reads only that user's rows. The cap is the newest 2000 hops per user.
- `server/routes/campus.mjs` forwards `{ error, detail, status }` for the campus routes, and logs each campus request with an id, timestamp, and request body: `[campus #7 …] POST /v1/campus/structure body={"elementId":…,"studyId":…}` followed by the `ok` or `failed … detail=…` line.

## Stale server detection

A `detail` of `http <status> vom Assistenz-Server ohne Detail` means the assistant server answers in the old `{ error }` shape without `detail`. The running process predates the logging change: stop it and restart with `npm run assistant`. The switcher states this explicitly. Absent `[campus #N]` lines in the server terminal confirm the same thing.

## Error alerts

Fetch failures surface twice: inline red text where they happened (always, including background loads) and a toast with a retry action for user-initiated loads. `showToast` in `src/components/toast.tsx` renders bottom-stacked dark cards (accent bar per tone, action pill, dismiss, auto-expire) through `<ToastHost />` at the root; `showFetchAlert` in `src/components/fetch-alert.ts` builds the error variant and re-invokes the same loader on retry, so study switches, structure/node/course loads, bulk syncs, and the C@MPUS sign-in all resume with one tap. Auto and silent loads (tab hydration, first paint) stay inline-only and never pop up unasked.

## Diagnosing a failed study switch

1. Restart the assistant server so the code matches this repository.
2. Tap the study again.
3. Read the in-app call log under the error (request ids, statuses, portal message, duration).
4. Match it with the `[campus #N]` lines in the server terminal, which show the request body the app sent and the upstream answer.

Pinned by `server/campus.test.mjs`: `portalMessage` extraction, `parseStudyId` validation, and detail propagation for a 500 with a `coErrorDto` message and for an empty 403 body.
