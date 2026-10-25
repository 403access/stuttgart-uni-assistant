# C@MPUS calendar import

One authenticated download from the C@MPUS portal, observed in a signed-in browser session on 16 October 2026. It exports the personal calendar through the export mask `wbKalender.wbExport`. Unlike the REST calls in [campus-curriculum.md](campus-curriculum.md), this is the classic web UI: a form POST with the session cookie and a binary attachment back. The assistant server calls it for `POST /v1/campus/calendar-export`. In the app the feature is called **Kalender-Import** and sits on the Campus tab (Studium → Kalender-Import): the portal side is an export, the app's action is an import. The route requires the app bearer token and uses that user's portal session cookie; imported events are stored per `user_id`.

## Observed calls

Opening the mask (informational — the server does not replay it):

```http
GET /cusonline/wbKalender.wbExport/NC_3433?pMode=I
Host: campus.uni-stuttgart.de
Cookie: PSESSIONID=<portal_session>; ...
```

It answers `200` with `text/xml` instructions that render the `Termine exportieren` overlay: date range (defaults one year out), output format, charset, lecturer export, and a Download button.

Submitting the mask (this is what the server replays):

```http
POST /cusonline/wbKalender.wbExport
Host: campus.uni-stuttgart.de
Content-Type: application/x-www-form-urlencoded
Cookie: PSESSIONID=<portal_session>; ...
```

| Field | Observed value |
| --- | --- |
| `pMode` | `I` |
| `pOrgNr`, `pResNr` | Empty |
| `pInclPruef`, `pInclPruefGepl` | `N` |
| `pExportBetreff`, `pExportAnsprechpartner`, `pExportOrt`, `pExportTerminTyp`, `pExportPublikumIntern` | Empty |
| `pDateFrom` / `pDateTo` | `16.10.2026` / `20.10.2027` (`TT.MM.JJJJ`) |
| `pOutputFormat` | `2` (observed; `1` XML, `3` CSV für Excel, `99` ICS) |
| `pCharset` | `WE8ISO8859P1` (observed; `UTF8` for ICS) |
| `pMaskAction` | `DOWNLOAD` |

The browser sends no `Authorization` header here — only cookies — so neither does the server. The observed answer was `200` with `text/csv; charset=utf-8` and `content-disposition: attachment;filename=personal_20261016_022933.csv;filename*=utf-8''personal_20261016_022933.csv` (29 708 bytes).

## Server route

| Method | Path | Behavior |
| --- | --- | --- |
| `POST` | `/v1/campus/calendar-export` | Validates `{ dateFrom, dateTo, format, charset }`, posts the mask fields, returns `{ filename, contentType, bytes, base64 }` |
| `POST` | `/v1/campus/calendar-sync` | Downloads the ICS and upserts its `VEVENT`s into `user_exported_events`; repeats are skipped |
| `GET` | `/v1/campus/calendar-events` | Returns the persisted events of the bearer user (`limit` optional, capped at 5000), newest date range first, for the onboarding overview |

Validation: dates must be `TT.MM.JJJJ` between 2000 and 2100, format one of `1`, `2`, `3`, `99`, charset `UTF8` or `WE8ISO8859P1` — anything else is a `400` without touching the portal. The filename comes from the `filename*=utf-8''…` disposition parameter, falling back to `kalender-export.<ics|xml|csv>`. A missing `CAMPUS_SESSION_COOKIE` is `token_missing`; a rejected download maps like the other portal failures (see [campus-logging.md](campus-logging.md)). The 60 second timeout covers large date ranges.

## App usage

`exportCampusCalendar` in `apps/mobile/src/auth/campus.ts` posts the range (today to today-plus-one-year) and the chosen format, and records the call as an `export` entry in the API history. The Kalender-Import screen offers ICS (UTF-8) and CSV (ISO 8859-1, the portal default): on native the file is written to the cache and handed to the share sheet (`expo-sharing`), on web it downloads via a Blob link — the same split as document export in `apps/mobile/src/documents/io.ts`.

## Database sync

`In Datenbank syncen` downloads the ICS and upserts its `VEVENT`s into the `exported_events` table (`POST /v1/campus/calendar-sync`, always ICS/UTF-8): unfolding of folded lines, unescaping, and the UID plus recurrence id as the dedupe key — repeats are skipped, so re-syncing imports only what's new. The answer reports `{ filename, imported, skipped, total, events }`; the parsed events are returned so the first caller can render them without a second round-trip.

The onboarding calendar page runs the same sync automatically and uses the returned events for its overview: imported total, upcoming total, and the next entries. `GET /v1/campus/calendar-events` (`loadCalendarEvents` in `apps/mobile/src/auth/campus.ts`) remains the store read; if an older server returns only counts, the page parses the ICS attachment from `calendar-export` locally (`apps/mobile/src/onboarding/ics.ts`). The Kalender-Import screen keeps its manual buttons and history.

## Import history

The Kalender-Import screen lists recent imports below the buttons. It reads the device API history (`readApiLog`, filtered to `op: 'export'` — the same entries `exportCampusCalendar` and `syncExportedCalendar` record) and merges it with the live session log by `uid`, newest first, refreshing after each import. Each row shows the kind (download or database sync), the local time, the requested range, and the result (`filename · bytes`, or `imported new · skipped duplicates`). Only successful calls are recorded, so failed attempts do not appear.
