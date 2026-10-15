# C@MPUS study switcher

After a C@MPUS sign-in the app starts from production data, not the demonstration record. The enrolled studies from the chooser call in [campus-studies.md](campus-studies.md) are shown at the very top of the Today screen and can be switched. One study is shown directly; several studies are selectable.

## Flow

1. `signInWithCampusToken` in `src/auth/campus.ts` calls `POST /v1/campus/login` and then `GET /v1/campus/studies`. The login response may already carry the chooser list (current server); otherwise the client fetches it. Without the studies list there is no sign-in — the app would otherwise fall back to mockup data silently.
2. The studies are stored as `campusStudies` on the device record, next to `curriculumNodes`. See [data-model.md](data-model.md).
3. `activeStudyId` names the selected study. `pickActiveStudyId` in `src/state/AppState.tsx` resolves it: a single study is auto-selected; otherwise the stored choice wins if it is still enrolled, then `lastAccessed`, then the first row. `setStudies` re-resolves it on every chooser refresh; `setActiveStudy` only accepts an enrolled id.
4. `StudySelector` in `src/components/study-selector.tsx` renders at the top of Today (`app/(tabs)/index.tsx`) and on the More and C@MPUS screens. It returns nothing outside a campus session or without studies.

## Switching studies

A tap on another study loads its curriculum before anything is committed:

- `loadCampusCurriculum(elementId, studyId)` posts `{ elementId, studyId }` to `POST /v1/campus/structure`.
- Only after the portal answers do `setActiveStudy` and `setCurriculum` run, so the header and the curriculum nodes stay consistent. A failed switch keeps the previous study.
- A study without a `myStudyLink` root id (`elementId` null) cannot load a structure. The selector says so and asks for a chooser refresh instead of calling the server.
- `POST /v1/campus/structure` also accepts `studyId` alone: the server resolves the root element through the chooser (`loadCurriculumStructure` in `server/campus.mjs`). `POST /v1/campus/login` returns `{ studies, activeStudyId }` alongside the profile.

## Failure UX

A failed switch shows `Studium nicht gewechselt (<code>, <detail>).` with the last campus calls underneath (see [campus-logging.md](campus-logging.md)). A `detail` of `… ohne Detail` means the assistant server answers in the old error shape — stop it and restart with `npm run assistant`; afterwards the portal response appears in the same place.

| Selector state | Meaning |
| --- | --- |
| One study, name + degree | Production data, nothing to choose |
| Several chips, one highlighted | Enrolled studies, tap to switch; `…` marks the loading one |
| Error + call log | Switch failed, previous study still active |

The Today subtitle and the degree pill follow the active study (`name · intendedDegree · versionIdentifier`); demo and local sessions keep the demonstration record. The Schnittstelle screen (`app/api.tsx`) lists the same studies and taps select the active one for inspection.
