# Admin interaction audit

Automated Playwright click-through against the current React admin, using the same
temporary fixture database as the screenshots. Last run: 2026-10-26 — **66/66 checks passed**.

## Verified interactions

### Overview
- All ten KPI tiles are links.
- Each target URL is correct, including the filtered user lists:
  `?activity=active`, `?credential=active`, `?data=portal|courses|events|calls`,
  `?sort=created`, `/devices`, `/ilias`.
- Recent account rows open the account detail page.
- “Alle Konten”, “Alle” and “Details” open the matching lists/pages.

### Users
- Account name and “Details” open the account detail page.
- Detail topbar shows the account name and `account · sign-in mode`.
- All eleven tabs update both URL and content:
  Übersicht, Sitzungen, Geräte, Plattformen, C@MPUS, ILIAS, Studiengänge,
  Kalender, Aufrufe, Lernquiz, Aktivität.
- Tabs use `?tab=…`, so reload, deep links and browser back/forward preserve the tab.
- At 1440 px all tabs fit without horizontal clipping.
- “Studiengänge → Öffnen” switches to the data tab.
- Account form saves successfully.
- Session row “Widerrufen” works.
- Platforms tab renders all five platforms, including unlinked ones with a
  “Verknüpfen” action. Existing links can be edited, synced or removed.
- Campus tab exposes portal, calendar and call clearing actions.
- Data tab shows the study summary, structure/course switch, node explorer and
  course explorer; both views load rows and paginate.
- ILIAS tab disables live “Inhalte”/“Mitglieder” actions when no ILIAS session
  exists and explains why. Neuigkeiten, Postfach and To-Dos are rendered.

### Devices
- Rows open the device detail dialog.
- The dialog shows device, client, IP, account, timestamps and session fields.
- “Konto öffnen” opens the linked account.
- Revoke opens a confirmation dialog; cancel leaves the device and session intact.
- Status, page-size and pagination controls work.

### ILIAS
- Account “Öffnen” opens the account on its ILIAS tab.
- “Aktualisieren” reloads the account list.
- KPI tiles are intentionally static, matching the previous dashboard
  (only Overview and Quiz catalog tiles were links).

### Quiz
- Catalog KPI tiles switch to catalog/answers views.
- Topic title and “Öffnen” open the question manager dialog.
- “Bearbeiten” loads the existing topic fields (title, meeting, source, figure).
- “Themen filtern” applies the module filter.
- “Alle Antworten” and “Runden” update the URL (`?view=attempts|sessions`) and
  topbar title. Browser back returns to the catalog.
- Answer and round tables paginate.

### Components
- “Details” expands a full component panel (files, exports, usage sites) and
  collapses again.
- Category/platform/unused/preview filters and live-preview links work.

### Audit and logs
- Audit action badges use the old human-readable labels and detailed formatting.
- Audit and log account references are links to the account page.
- Logs service/level badges use the old German names.
- “Auto (5 s)”, “Neu laden” and “Leeren” work.

### System
- “Geheimnisse anzeigen” requires confirmation, reveals values and writes an
  audit entry. “Geheimnisse verbergen” masks them again.
- UniMail disconnect and sync-job cancellation use confirmation dialogs.

### News / mobile
- News create and edit save both German and English fields.
- Mobile menu opens the sidebar, navigation closes it, and the route changes.

## Interaction differences that are intentional

- The old quiz opened a topic as a dedicated page; the React admin opens a
  question dialog. The catalog/topic screenshots show this directly.
- The old devices list opened a detail page; the React admin opens a detail dialog.
- The old data tab used study pills; the React admin uses a study select plus a
  “Struktur / Kurse” segmented control.
- The audit toolbar additionally exposes a “Konto-ID” filter; the old dashboard
  only used account links from other pages.

## Repeatability

The data and screenshots are created by:

```bash
node tools/admin-screenshots/capture.mjs
```

The interaction audit uses the same fixture set and a temporary server/database.
No developer database or live account is touched.
