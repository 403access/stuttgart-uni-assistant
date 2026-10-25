---
title: Component catalog
sidebar_label: Component catalog
hide_table_of_contents: true
---

<!-- GENERATED FILE — do not edit by hand. Run `bun run catalog:components`. -->

# Component catalog

Every component under `src/` with its exports, platform files, and every place it is imported, rendered, called, or referenced. The page is generated from the TypeScript AST by `tools/generate-component-catalog.mjs`. The in-app view with live previews is **Dev → Komponenten** (`/dev/components`); the operator inventory is **Komponenten** (`/admin#/components`). The **Preview** column names the exports with a live demo; the admin page links them to the Expo web app on port 8081.

`render` is a JSX tag, `call` is a direct invocation, `reference` is an identifier passed as a value (for example `component={Screen}`), `import` and `type` are import statements, and `re-export` is a barrel line such as `src/state/AppState.tsx`. The catalog sources themselves are excluded so the counts do not include this page.

> Run `bun run catalog:components` after changing a component or a usage. `bun run check:components` fails when this page or `apps/mobile/src/components/catalog.generated.ts` is stale.

## Summary

| Metric | Value |
| --- | ---: |
| Components | 77 |
| Exports | 113 |
| Usage references | 816 |
| Files with occurrences | 103 |
| Unused components | 0 |
| Imported but never used | 0 |
| Components with platform files | 4 |
| Components with live previews | 32 |
| Shared UI | 35 |
| Feature components | 34 |
| App-wide providers | 8 |

## Shared UI

| Component | File | Platform | Preview | Exports | Usages | Files |
| --- | --- | --- | --- | --- | ---: | ---: |
| `ui` | `apps/mobile/src/components/ui.tsx` | Native + Web | Button, Card, FieldLabel, InfoRow, Mark, Meter, Muted, Pill, SearchField, Section, Strong | Button, Card, FieldLabel, InfoRow, Mark, Meter, Muted, Pill, Screen, SearchField, Section, Strong, listPosition | 610 | 83 |
| `login-blocks` | `apps/mobile/src/components/login-blocks.tsx` | Native + Web | Checkbox, Chip, ErrorText, Field, Footer, LanguagePicker, Meta, Notice, SectionTitle | Checkbox, Chip, ErrorText, Field, Footer, LanguagePicker, Meta, Notice, SectionTitle | 25 | 6 |
| `control-icon` | `packages/ui/src/control-icon.tsx` | Native + Web | ControlIcon, ToolButton | ControlIcon, ToolButton | 14 | 9 |
| `ChoiceCard` | `apps/mobile/src/components/choice-card.tsx` | Native + Web | ChoiceCard | ChoiceCard | 10 | 3 |
| `ResponsiveGrid` | `packages/ui/src/responsive-grid.tsx` | Native + Web | ResponsiveGrid | ResponsiveGrid | 10 | 9 |
| `OptionRows` | `packages/ui/src/option-rows.tsx` | Native + Web | OptionRows | OptionRows | 9 | 5 |
| `toast` | `packages/ui/src/toast.tsx` | Native + Web | showToast | ToastHost, showToast | 6 | 7 |
| `AmbientBackground` | `apps/mobile/src/components/ambient-background.tsx` | Native + Web | – | AmbientBackground | 5 | 5 |
| `DrawerPanel` | `packages/ui/src/drawer-panel.tsx` | Native + Web | DrawerPanel | DrawerPanel | 5 | 4 |
| `JsonTree` | `packages/ui/src/json-tree.tsx` | Native + Web | JsonTree | JsonTree | 5 | 5 |
| `SigningIn` | `apps/mobile/src/components/signing-in.tsx` | Native + Web | SigningIn | SigningIn | 5 | 4 |
| `StudySelector` | `apps/mobile/src/components/study-selector.tsx` | Native + Web | – | StudySelector | 3 | 3 |
| `CampusBrowserModal` | `apps/mobile/src/components/campus-browser-modal.tsx` | Native + Web | – | CampusBrowserModal | 2 | 2 |
| `CampusHeadlessModal` | `apps/mobile/src/components/campus-headless-modal.tsx` | Native + Web | – | CampusHeadlessModal | 2 | 2 |
| `CampusInfoView` | `apps/mobile/src/components/campus-info-view.tsx` | Native + Web | – | CampusInfoView | 2 | 2 |
| `CurriculumTree` | `apps/mobile/src/components/curriculum-tree.tsx` | Native + Web | – | CurriculumTree | 2 | 2 |
| `pane-mode` | `packages/ui/src/pane-mode.tsx` | Native + Web | – | PaneModeProvider, usePaneMode | 2 | 3 |
| `structure-row` | `apps/mobile/src/components/structure-row.tsx` | Native + Web | StructureRow, TreeChildren | StructureRow, TreeChildren | 2 | 1 |
| `ApiEntryDetail` | `apps/mobile/src/components/api-entry-detail.tsx` | Native + Web | – | ApiEntryDetail | 1 | 1 |
| `ApiHistory` | `apps/mobile/src/components/api-history.tsx` | Native + Web | – | ApiHistory | 1 | 1 |
| `AppLock` | `apps/mobile/src/components/app-lock.tsx` | Native + Web | – | AppLock | 1 | 1 |
| `CalendarHero` | `apps/mobile/src/components/calendar-hero.tsx` | Native + Web | CalendarHero | CalendarHero | 1 | 1 |
| `CampusCredentialsForm` | `apps/mobile/src/components/campus-credentials-form.tsx` | Native + Web | – | CampusCredentialsForm | 1 | 1 |
| `CurriculumNodeDetail` | `apps/mobile/src/components/curriculum-node-detail.tsx` | Native + Web | – | CurriculumNodeDetail | 1 | 1 |
| `CurriculumToolbar` | `apps/mobile/src/components/curriculum-toolbar.tsx` | Native + Web | – | CurriculumToolbar | 1 | 1 |
| `DeviceQr` | `apps/mobile/src/components/device-qr.tsx` | Native + Web (split) | DeviceQr | DeviceQr | 1 | 1 |
| `DropdownPicker` | `packages/ui/src/dropdown-picker.tsx` | Native + Web | DropdownPicker | DropdownPicker | 1 | 2 |
| `LecturersList` | `apps/mobile/src/components/lecturers-list.tsx` | Native + Web | LecturersList | LecturersList | 1 | 1 |
| `mailBody` | `apps/mobile/src/components/mailBody.tsx` | Native + Web | MailBody | MailBody, segmentQuotedText | 1 | 1 |
| `StudyCacheCard` | `apps/mobile/src/components/study-cache-card.tsx` | Native + Web | – | StudyCacheCard | 1 | 1 |
| `TutorialsList` | `apps/mobile/src/components/tutorials-list.tsx` | Native + Web | TutorialsList | TutorialsList | 1 | 1 |
| `UniMapView` | `apps/mobile/src/components/uni-map-view.tsx` | Native + Web (split) | – | UniMapView | 1 | 1 |
| `WebDeviceLogin` | `apps/mobile/src/components/web-device-login.tsx` | Native + Web | – | WebDeviceLogin | 1 | 1 |
| `WebHead` | `apps/mobile/src/components/web-head.tsx` | Native + Web | – | WebHead | 1 | 1 |
| `WebSidebar` | `apps/mobile/src/components/web-sidebar.tsx` | Native + Web | – | WebSidebar | 1 | 1 |

### ui

- File: `apps/mobile/src/components/ui.tsx`
- Category: Shared UI
- Exports: `Button` (component), `Card` (component), `FieldLabel` (component), `InfoRow` (component), `Mark` (component), `Meter` (component), `Muted` (component), `Pill` (component), `Screen` (component), `SearchField` (component), `Section` (component), `Strong` (component), `listPosition` (helper)
- Live preview in the app: `Button`, `Card`, `FieldLabel`, `InfoRow`, `Mark`, `Meter`, `Muted`, `Pill`, `SearchField`, `Section`, `Strong`
- Usages: 610 references in 83 files

- `apps/mobile/app/(tabs)/ilias.tsx`: 10 import `Button`; 10 import `Card`; 10 import `Screen`; 164 render `Screen`; 171 render `Screen`; 201 render `Screen`; 222 render `Card`; 225 render `Button`; 226 render `Button`
- `apps/mobile/app/(tabs)/index.tsx`: 5 import `Card`; 5 import `InfoRow`; 5 import `Meter`; 5 import `Screen`; 5 import `Section`; 29 render `Card`; 35 render `Meter`; 41 render `Card`; 54 render `Section`; 57 render `InfoRow`; 66 render `Card`; 71 render `Section`; 73 render `InfoRow`; 82 render `Section`; 84 render `InfoRow`; 96 render `Screen`
- `apps/mobile/app/(tabs)/kalender.tsx`: 9 import `Button`; 9 import `Card`; 9 import `Muted`; 9 import `Pill`; 9 import `Screen`; 9 import `Section`; 125 render `Screen`; 127 render `Card`; 128 render `Muted`; 133 render `Card`; 134 render `Muted`; 137 render `Button`; 223 render `Section`; 224 render `Card`; 225 render `Muted`; 286 render `Pill`; 290 render `Pill`; 297 render `Pill`; 300 render `Pill`; 316 render `Pill`; 320 render `Pill`; 335 render `Pill`; 339 render `Pill`; 355 render `Pill`; 434 render `Muted`; 500 render `Muted`; 509 render `Pill`; 512 render `Pill`; 515 render `Pill`; 540 render `Muted`; 624 render `Pill`; 627 render `Pill`; 630 render `Pill`; 837 render `Section`; 842 render `Card`; 859 render `Button`; 861 render `Button`
- `apps/mobile/app/(tabs)/mail.tsx`: 8 import `Screen`; 165 render `Screen`
- `apps/mobile/app/(tabs)/mehr.tsx`: 10 import `Button`; 10 import `Card`; 10 import `InfoRow`; 10 import `listPosition`; 10 import `Screen`; 10 import `Section`; 223 render `InfoRow`; 228 call `listPosition`; 237 render `Section`; 244 render `Screen`; 280 render `Card`; 311 render `Card`; 383 render `Card`; 387 render `Button`; 393 render `Button`
- `apps/mobile/app/(tabs)/quiz.tsx`: 9 import `Card`; 9 import `Meter`; 9 import `Screen`; 9 import `Section`; 123 render `Screen`; 124 render `Card`; 286 render `Card`; 300 render `Meter`; 329 render `Section`; 352 render `Card`; 362 render `Section`; 363 render `Card`; 387 render `Screen`; 448 render `Screen`; 558 render `Meter`
- `apps/mobile/app/altklausuren.tsx`: 3 import `InfoRow`; 3 import `Screen`; 11 render `Screen`; 19 render `InfoRow`
- `apps/mobile/app/anforderungen.tsx`: 3 import `Card`; 3 import `Meter`; 3 import `Screen`; 18 render `Screen`; 23 render `Card`; 39 render `Card`; 45 render `Meter`
- `apps/mobile/app/anrechnung.tsx`: 5 import `Button`; 5 import `Card`; 5 import `InfoRow`; 5 import `Pill`; 5 import `Screen`; 60 render `Screen`; 67 render `Pill`; 70 render `Pill`; 84 render `Pill`; 89 render `Card`; 101 render `Card`; 108 render `Button`; 110 render `InfoRow`
- `apps/mobile/app/api.tsx`: 10 import `Button`; 10 import `Card`; 10 import `InfoRow`; 10 import `Muted`; 10 import `Screen`; 10 import `Section`; 145 render `Screen`; 151 render `Muted`; 155 render `Section`; 157 render `Card`; 161 render `Muted`; 182 render `Button`; 187 render `Muted`; 193 render `Card`; 200 render `Section`; 202 render `Muted`; 205 render `InfoRow`; 221 render `Section`; 223 render `Muted`; 226 render `InfoRow`; 234 render `Section`; 236 render `Muted`; 239 render `InfoRow`
- `apps/mobile/app/campus-info.tsx`: 4 import `Screen`; 8 render `Screen`
- `apps/mobile/app/campus.tsx`: 6 import `Button`; 6 import `Card`; 6 import `InfoRow`; 6 import `Muted`; 6 import `Pill`; 6 import `Screen`; 26 render `Screen`; 37 render `Pill`; 40 render `Pill`; 52 render `Card`; 53 render `Muted`; 56 render `Button`; 91 render `Pill`; 117 render `InfoRow`
- `apps/mobile/app/darstellung.tsx`: 5 import `Muted`; 5 import `Screen`; 5 import `Section`; 16 render `Screen`; 36 render `Section`; 37 render `Muted`
- `apps/mobile/app/dev/nfc.tsx`: 6 import `Button`; 6 import `Card`; 6 import `Screen`; 6 import `Section`; 57 render `Screen`; 61 render `Section`; 62 render `Card`; 67 render `Button`; 69 render `Button`; 75 render `Section`; 76 render `Card`; 96 render `Section`; 97 render `Card`; 117 render `Section`; 118 render `Card`
- `apps/mobile/app/dev/onboarding.tsx`: 6 import `Button`; 6 import `Card`; 6 import `Screen`; 6 import `Section`; 74 render `Screen`; 78 render `Section`; 79 render `Card`; 91 render `Section`; 92 render `Card`; 101 render `Section`; 103 render `Button`; 107 render `Button`; 112 render `Button`; 124 render `Section`; 125 render `Card`
- `apps/mobile/app/dev/state.tsx`: 7 import `Button`; 7 import `Card`; 7 import `Screen`; 7 import `Section`; 40 render `Screen`; 44 render `Section`; 45 render `Card`; 58 render `Section`; 59 render `Card`; 72 render `Button`; 75 render `Section`; 76 render `Card`
- `apps/mobile/app/dokument/[id].tsx`: 8 import `Button`; 8 import `Card`; 8 import `Screen`; 51 render `Screen`; 61 render `Screen`; 65 render `Card`; 72 render `Card`; 82 render `Button`; 86 render `Button`; 96 render `Button`; 105 render `Button`; 106 render `Button`; 116 render `Button`; 119 render `Button`; 126 render `Card`
- `apps/mobile/app/dokumente.tsx`: 6 import `Button`; 6 import `Card`; 6 import `InfoRow`; 6 import `Screen`; 6 import `Section`; 64 render `Screen`; 66 render `Button`; 73 render `Button`; 75 render `Section`; 80 render `InfoRow`; 92 render `Section`; 97 render `InfoRow`; 100 render `InfoRow`; 103 render `Card`; 107 render `Button`
- `apps/mobile/app/dozent/[id].tsx`: 4 import `Card`; 4 import `InfoRow`; 4 import `Screen`; 16 render `Screen`; 24 render `Screen`; 26 render `Card`; 32 render `InfoRow`; 35 render `InfoRow`
- `apps/mobile/app/drucker.tsx`: 5 import `Button`; 5 import `Card`; 5 import `Screen`; 5 import `Section`; 42 render `Screen`; 45 render `Card`; 48 render `Button`; 51 render `Section`; 52 render `Card`; 58 render `Button`; 61 render `Section`; 62 render `Card`; 66 render `Section`; 67 render `Card`; 77 render `Section`; 78 render `Card`; 84 render `Button`; 86 render `Card`; 89 render `Button`; 91 render `Card`; 96 render `Section`; 97 render `Card`; 102 render `Section`; 103 render `Card`; 105 render `Button`; 108 render `Section`; 109 render `Card`; 118 render `Section`; 119 render `Card`; 121 render `Button`; 122 render `Button`
- `apps/mobile/app/einstellungen.tsx`: 8 import `Button`; 8 import `Card`; 8 import `InfoRow`; 8 import `Screen`; 8 import `Section`; 41 render `Card`; 53 render `InfoRow`; 67 render `Card`; 70 render `Card`; 82 render `Button`; 89 render `Screen`; 125 render `Section`; 133 render `Section`
- `apps/mobile/app/feed.tsx`: 5 import `InfoRow`; 5 import `Screen`; 16 render `Screen`; 32 render `InfoRow`
- `apps/mobile/app/fristen.tsx`: 4 import `InfoRow`; 4 import `Screen`; 13 render `Screen`; 17 render `InfoRow`
- `apps/mobile/app/geraet-verknuepfen.tsx`: 15 import `Button`; 15 import `Card`; 15 import `Pill`; 15 import `Screen`; 179 render `Screen`; 188 render `Card`; 195 render `Card`; 204 render `Pill`; 208 render `Button`; 209 render `Button`; 215 render `Card`; 223 render `Button`; 225 render `Button`; 227 render `Button`; 244 render `Button`; 268 render `Button`; 272 render `Card`; 275 render `Pill`; 311 render `Button`; 317 render `Card`
- `apps/mobile/app/ilias/[refId].tsx`: 8 import `Button`; 8 import `Card`; 8 import `Muted`; 8 import `Pill`; 8 import `Screen`; 8 import `Section`; 36 render `Card`; 41 render `Pill`; 82 render `Pill`; 182 render `Screen`; 202 render `Card`; 203 render `Muted`; 208 render `Card`; 209 render `Muted`; 210 render `Button`; 211 render `Button`; 220 render `Card`; 221 render `Muted`; 225 render `Section`; 239 render `Button`; 246 render `Section`; 247 render `Card`
- `apps/mobile/app/ilias/datei.tsx`: 7 import `Button`; 7 import `Muted`; 7 import `Screen`; 65 render `Screen`; 73 render `Button`; 84 render `Button`; 124 render `Muted`
- `apps/mobile/app/ilias/mitglied.tsx`: 6 import `Button`; 6 import `Card`; 6 import `Muted`; 6 import `Pill`; 6 import `Screen`; 6 import `Section`; 61 render `Screen`; 79 render `Card`; 87 render `Pill`; 96 render `Muted`; 102 render `Card`; 103 render `Muted`; 105 render `Button`; 111 render `Card`; 115 render `Button`; 126 render `Card`; 135 render `Button`; 142 render `Button`; 153 render `Section`; 156 render `Card`; 161 render `Pill`; 170 render `Button`
- `apps/mobile/app/kalender-export.tsx`: 9 import `Button`; 9 import `Card`; 9 import `InfoRow`; 9 import `listPosition`; 9 import `Pill`; 9 import `Screen`; 9 import `Section`; 136 render `Screen`; 141 render `Card`; 146 render `Pill`; 150 render `Button`; 151 render `Button`; 155 render `Section`; 157 render `Card`; 165 render `InfoRow`; 170 call `listPosition`
- `apps/mobile/app/kommilitonen.tsx`: 6 import `Card`; 6 import `InfoRow`; 6 import `Screen`; 6 import `Section`; 25 render `Screen`; 27 render `Section`; 28 render `Card`; 43 render `Section`; 48 render `Card`; 58 render `Section`; 61 render `InfoRow`
- `apps/mobile/app/konto.tsx`: 10 import `Button`; 10 import `Card`; 10 import `InfoRow`; 10 import `listPosition`; 10 import `Pill`; 10 import `Screen`; 10 import `Section`; 89 render `Screen`; 92 render `Card`; 104 render `Pill`; 111 render `Section`; 118 render `InfoRow`; 123 call `listPosition`; 129 render `Section`; 131 render `InfoRow`; 138 render `Card`; 148 render `Button`; 149 render `Button`
- `apps/mobile/app/kurs/[id].tsx`: 8 import `Button`; 8 import `Card`; 8 import `InfoRow`; 8 import `Muted`; 8 import `Screen`; 32 render `Screen`; 34 render `Muted`; 47 render `Screen`; 49 render `Card`; 60 render `InfoRow`; 66 render `InfoRow`; 78 render `InfoRow`; 84 render `InfoRow`; 87 render `Button`
- `apps/mobile/app/kurse.tsx`: 11 import `Button`; 11 import `Card`; 11 import `InfoRow`; 11 import `Muted`; 11 import `Pill`; 11 import `Screen`; 11 import `Section`; 166 render `Screen`; 176 render `Card`; 177 render `Muted`; 183 render `Card`; 192 render `Muted`; 196 render `Button`; 198 render `Button`; 233 render `Button`; 235 render `Button`; 241 render `Button`; 256 render `Pill`; 260 render `Pill`; 267 render `Pill`; 274 render `Section`; 277 render `InfoRow`
- `apps/mobile/app/login-legacy.tsx`: 26 import `Button`; 26 import `Mark`; 147 render `Mark`; 183 render `Button`; 195 render `Button`; 204 render `Button`; 211 render `Button`; 231 render `Button`; 252 render `Button`
- `apps/mobile/app/login.tsx`: 11 import `Button`; 11 import `Mark`; 58 render `Mark`; 117 render `Button`; 126 render `Button`; 133 render `Button`
- `apps/mobile/app/mail-nachricht.tsx`: 3 import `Screen`; 21 render `Screen`
- `apps/mobile/app/mail-verbindung.tsx`: 14 import `Button`; 14 import `Card`; 14 import `Pill`; 14 import `Screen`; 71 render `Screen`; 78 render `Card`; 81 render `Pill`; 98 render `Button`; 102 render `Button`; 105 render `Card`
- `apps/mobile/app/mail-verfassen.tsx`: 8 import `Button`; 8 import `Card`; 8 import `Pill`; 8 import `Screen`; 278 render `Screen`; 294 render `Button`; 306 render `Pill`; 315 render `Card`
- `apps/mobile/app/meldung/[id].tsx`: 4 import `Card`; 4 import `Screen`; 17 render `Screen`; 26 render `Screen`; 28 render `Card`
- `apps/mobile/app/modul/[id].tsx`: 5 import `Button`; 5 import `Card`; 5 import `InfoRow`; 5 import `Pill`; 5 import `Screen`; 25 render `Screen`; 58 render `Screen`; 61 render `Pill`; 62 render `Pill`; 63 render `Pill`; 65 render `Card`; 74 render `Card`; 83 render `Button`; 89 render `Card`; 106 render `InfoRow`; 115 render `InfoRow`; 125 render `InfoRow`; 128 render `InfoRow`; 131 render `InfoRow`; 134 render `Card`; 141 render `Card`; 146 render `Button`
- `apps/mobile/app/oidc.tsx`: 3 import `Screen`; 12 render `Screen`
- `apps/mobile/app/onboarding.tsx`: 11 import `Button`; 11 import `Mark`; 11 import `Pill`; 157 render `Mark`; 214 render `Button`; 219 render `Button`; 225 render `Button`; 302 render `Button`; 306 render `Button`; 710 render `Button`; 768 render `Pill`; 904 render `Button`; 907 render `Button`; 910 render `Button`
- `apps/mobile/app/profil/auffindbarkeit.tsx`: 4 import `Card`; 4 import `InfoRow`; 4 import `Screen`; 4 import `Section`; 20 render `Screen`; 25 render `Card`; 44 render `Section`; 47 render `Section`; 49 render `InfoRow`
- `apps/mobile/app/profil/daten.tsx`: 5 import `Card`; 5 import `InfoRow`; 5 import `Pill`; 5 import `Screen`; 5 import `Section`; 20 render `Screen`; 25 render `Section`; 30 render `Card`; 36 render `Pill`; 50 render `Section`; 51 render `Card`; 55 render `InfoRow`; 56 render `InfoRow`; 57 render `InfoRow`; 58 render `InfoRow`
- `apps/mobile/app/profil/index.tsx`: 4 import `Button`; 4 import `Card`; 4 import `InfoRow`; 4 import `Screen`; 4 import `Section`; 23 render `Screen`; 28 render `Card`; 29 render `Button`; 33 render `Section`; 35 render `InfoRow`; 41 render `InfoRow`; 47 render `InfoRow`
- `apps/mobile/app/profil/sichtbarkeit.tsx`: 5 import `Button`; 5 import `Card`; 5 import `Screen`; 5 import `Section`; 29 render `Screen`; 34 render `Card`; 35 render `Button`; 40 render `Section`; 44 render `Card`; 88 render `Section`
- `apps/mobile/app/pruefung/[id].tsx`: 4 import `Card`; 4 import `InfoRow`; 4 import `Screen`; 16 render `Screen`; 23 render `Screen`; 25 render `Card`; 34 render `InfoRow`
- `apps/mobile/app/quiz/[topic]/index.tsx`: 6 import `Card`; 6 import `Meter`; 6 import `Pill`; 6 import `Screen`; 6 import `Section`; 35 render `Screen`; 37 render `Card`; 46 render `Screen`; 120 render `Screen`; 126 render `Card`; 140 render `Meter`; 146 render `Pill`; 168 render `Meter`; 189 render `Section`; 190 render `Card`; 237 render `Section`; 238 render `Card`
- `apps/mobile/app/quiz/[topic]/run.tsx`: 6 import `Card`; 6 import `Meter`; 6 import `Pill`; 6 import `Screen`; 62 render `Screen`; 64 render `Card`; 73 render `Screen`; 191 render `Screen`; 309 render `Screen`; 315 render `Meter`; 317 render `Pill`; 318 render `Pill`; 371 render `Screen`; 382 render `Card`; 395 render `Meter`
- `apps/mobile/app/quiz/modul/[id].tsx`: 5 import `Card`; 5 import `Meter`; 5 import `Pill`; 5 import `Screen`; 5 import `Section`; 29 render `Screen`; 31 render `Card`; 40 render `Screen`; 75 render `Screen`; 78 render `Card`; 92 render `Meter`; 104 render `Section`; 131 render `Card`; 149 render `Meter`; 164 render `Pill`
- `apps/mobile/app/raum/[id].tsx`: 4 import `Card`; 4 import `InfoRow`; 4 import `Screen`; 17 render `Screen`; 26 render `Screen`; 28 render `Card`; 38 render `InfoRow`
- `apps/mobile/app/reihenfolge.tsx`: 4 import `Card`; 4 import `InfoRow`; 4 import `Screen`; 4 import `Section`; 17 render `Screen`; 22 render `Card`; 32 render `Section`; 36 render `InfoRow`; 49 render `Card`
- `apps/mobile/app/sicherheit.tsx`: 8 import `Button`; 8 import `Card`; 112 render `Card`; 130 render `Button`; 142 render `Button`
- `apps/mobile/app/sprache.tsx`: 4 import `Screen`; 13 render `Screen`
- `apps/mobile/app/strukturen.tsx`: 21 import `Button`; 21 import `Card`; 21 import `InfoRow`; 21 import `Muted`; 21 import `Screen`; 21 import `Section`; 221 render `Screen`; 222 render `Card`; 223 render `Muted`; 233 render `Screen`; 234 render `Card`; 235 render `Muted`; 247 render `Screen`; 255 render `Section`; 256 render `Button`; 277 render `Section`; 303 render `Button`; 309 render `Muted`; 314 render `Muted`; 320 render `InfoRow`; 346 render `Section`; 348 render `Button`
- `apps/mobile/app/studium.tsx`: 8 import `Card`; 8 import `InfoRow`; 8 import `Meter`; 8 import `Pill`; 8 import `Screen`; 8 import `Section`; 41 render `Screen`; 45 render `Pill`; 51 render `Card`; 55 render `Meter`; 73 render `Pill`; 78 render `Section`; 80 render `InfoRow`; 100 render `Card`
- `apps/mobile/app/vpn.tsx`: 6 import `Button`; 6 import `Card`; 6 import `Pill`; 6 import `Screen`; 6 import `SearchField`; 6 import `Section`; 59 render `Screen`; 62 render `Card`; 65 render `Pill`; 79 render `Card`; 88 render `Button`; 89 render `Button`; 93 render `Button`; 94 render `Button`; 95 render `Button`; 101 render `Section`; 115 render `Card`; 118 render `Pill`; 129 render `Section`; 130 render `Card`; 145 render `Button`; 160 render `Button`; 164 render `Card`; 166 render `SearchField`; 172 render `SearchField`; 181 render `Button`; 183 render `Button`; 201 render `Section`; 211 render `Card`; 214 render `Pill`; 225 render `Section`; 226 render `Card`; 233 render `Card`; 235 render `SearchField`; 244 render `Button`; 246 render `Button`; 262 render `Section`; 263 render `Card`; 273 render `Button`; 277 render `Section`; 278 render `Card`; 282 render `Section`; 283 render `Card`; 293 render `Button`
- `apps/mobile/src/components/api-entry-detail.tsx`: 7 import `Button`; 7 import `Card`; 7 import `Muted`; 7 import `Pill`; 7 import `Section`; 26 render `Pill`; 99 render `Pill`; 103 render `Muted`; 125 render `Muted`; 167 render `Section`; 168 render `Card`; 204 render `Button`
- `apps/mobile/src/components/api-history.tsx`: 4 import `Card`; 4 import `Muted`; 4 import `Pill`; 4 import `SearchField`; 67 render `Muted`; 71 render `SearchField`; 75 render `Pill`; 80 render `Pill`; 85 render `Pill`; 92 render `Pill`; 96 render `Muted`; 103 render `Card`
- `apps/mobile/src/components/app-lock.tsx`: 7 import `Button`; 7 import `Mark`; 42 render `Mark`; 56 render `Button`; 60 render `Button`
- `apps/mobile/src/components/campus-browser-modal.tsx`: 9 import `Button`; 89 render `Button`; 93 render `Button`
- `apps/mobile/src/components/campus-credentials-form.tsx`: 4 import `Button`; 75 render `Button`; 80 render `Button`; 87 render `Button`
- `apps/mobile/src/components/campus-headless-modal.tsx`: 11 import `Button`; 11 import `Mark`; 86 render `Mark`; 112 render `Button`; 114 render `Button`; 116 render `Button`
- `apps/mobile/src/components/campus-info-view.tsx`: 11 import `Button`; 11 import `Card`; 11 import `InfoRow`; 11 import `Muted`; 11 import `Pill`; 11 import `Section`; 165 render `Muted`; 172 render `Card`; 173 render `Muted`; 180 render `Pill`; 188 render `Button`; 191 render `Card`; 192 render `Muted`; 195 render `Button`; 198 render `Section`; 199 render `Card`; 205 render `Muted`; 225 render `Button`; 227 render `Button`; 233 render `Button`; 239 render `Button`; 242 render `Card`; 243 render `Muted`; 248 render `Section`; 313 render `InfoRow`
- `apps/mobile/src/components/choice-card.tsx`: 5 import `Card`; 21 render `Card`
- `apps/mobile/src/components/curriculum-node-detail.tsx`: 7 import `Button`; 7 import `Card`; 7 import `InfoRow`; 7 import `Muted`; 7 import `Section`; 76 render `Section`; 77 render `Card`; 88 render `Section`; 90 render `Card`; 97 render `Section`; 105 render `Button`; 109 render `Muted`; 111 render `InfoRow`
- `apps/mobile/src/components/curriculum-toolbar.tsx`: 4 import `Pill`; 4 import `SearchField`; 62 render `SearchField`; 70 render `Pill`; 73 render `Pill`; 76 render `Pill`; 79 render `Pill`; 82 render `Pill`; 90 render `Pill`; 94 render `Pill`; 102 render `Pill`
- `apps/mobile/src/components/lecturers-list.tsx`: 4 import `InfoRow`; 4 import `Muted`; 13 render `Muted`; 15 render `InfoRow`
- `apps/mobile/src/components/structure-row.tsx`: 4 import `Pill`; 56 render `Pill`
- `apps/mobile/src/components/study-cache-card.tsx`: 3 import `Button`; 3 import `Card`; 42 render `Card`; 55 render `Button`; 59 render `Button`; 64 render `Button`
- `apps/mobile/src/components/tutorials-list.tsx`: 4 import `InfoRow`; 4 import `Muted`; 13 render `Muted`; 23 render `InfoRow`
- `apps/mobile/src/components/web-device-login.tsx`: 9 import `Button`; 9 import `Mark`; 148 render `Button`; 186 render `Mark`
- `apps/mobile/src/components/web-sidebar.tsx`: 9 import `Mark`; 119 render `Mark`
- `apps/mobile/src/ilias/components/ilias-dashboard.tsx`: 5 import `Card`; 5 import `Pill`; 5 import `Section`; 66 render `Pill`; 144 render `Card`; 156 render `Section`
- `apps/mobile/src/ilias/components/office-view.tsx`: 6 import `Button`; 46 render `Button`
- `apps/mobile/src/ilias/components/office-view.web.tsx`: 4 import `Button`; 54 render `Button`
- `apps/mobile/src/ilias/components/pdf-view.tsx`: 5 import `Button`; 64 render `Button`
- `apps/mobile/src/ilias/components/pdf-view.web.tsx`: 4 import `Button`; 62 render `Button`
- `apps/mobile/src/mail/components/mail-connection-panel.tsx`: 3 import `Button`; 3 import `Card`; 3 import `FieldLabel`; 3 import `Pill`; 36 render `Card`; 39 render `Pill`; 42 render `FieldLabel`; 52 render `FieldLabel`; 54 render `Button`; 59 render `Card`
- `apps/mobile/src/mail/components/mail-message-list.tsx`: 3 import `Card`; 66 render `Card`
- `apps/mobile/src/mail/components/mail-reader.tsx`: 8 import `Button`; 8 import `Card`; 8 import `Pill`; 129 render `Card`; 138 render `Pill`; 144 render `Button`; 157 render `Card`; 173 render `Button`; 178 render `Card`
- `apps/mobile/src/profile/profile-preview.tsx`: 3 import `Card`; 13 render `Card`; 20 render `Card`; 26 render `Card`
- `apps/mobile/src/profile/profile-summary.tsx`: 3 import `Card`; 3 import `Pill`; 12 render `Card`; 24 render `Pill`; 25 render `Pill`; 29 render `Pill`
- `apps/mobile/src/quiz/components/diagram-figure.tsx`: 3 import `Card`; 3 import `Section`; 27 render `Section`; 28 render `Card`

### login-blocks

- File: `apps/mobile/src/components/login-blocks.tsx`
- Category: Shared UI
- Exports: `Checkbox` (component), `Chip` (component), `ErrorText` (component), `Field` (component), `Footer` (component), `LanguagePicker` (component), `Meta` (component), `Notice` (component), `SectionTitle` (component)
- Live preview in the app: `Checkbox`, `Chip`, `ErrorText`, `Field`, `Footer`, `LanguagePicker`, `Meta`, `Notice`, `SectionTitle`
- Usages: 25 references in 6 files

- `apps/mobile/app/login-legacy.tsx`: 24 import `Field`; 24 import `Footer`; 24 import `LanguagePicker`; 24 import `Meta`; 24 import `Notice`; 24 import `SectionTitle`; 160 render `LanguagePicker`; 179 render `SectionTitle`; 180 render `Notice`; 197 render `Footer`; 205 render `Field`; 222 render `Footer`; 225 render `SectionTitle`; 226 render `Notice`; 229 render `Meta`; 230 render `Meta`; 244 render `Footer`; 253 render `Footer`
- `apps/mobile/app/login.tsx`: 9 import `Checkbox`; 9 import `Field`; 9 import `LanguagePicker`; 77 render `LanguagePicker`; 94 render `Field`; 102 render `Field`; 110 render `Checkbox`
- `apps/mobile/src/components/campus-browser-modal.tsx`: 7 import `ErrorText`; 88 render `ErrorText`
- `apps/mobile/src/components/campus-credentials-form.tsx`: 3 import `Chip`; 3 import `Field`; 3 import `Notice`; 3 import `SectionTitle`; 50 render `SectionTitle`; 51 render `Notice`; 54 render `Field`; 61 render `Field`; 70 render `Chip`; 72 render `Chip`
- `apps/mobile/src/components/campus-headless-modal.tsx`: 9 import `ErrorText`; 104 render `ErrorText`
- `apps/mobile/src/components/web-device-login.tsx`: 8 import `LanguagePicker`; 190 render `LanguagePicker`

### control-icon

- File: `packages/ui/src/control-icon.tsx`
- Category: Shared UI
- Exports: `ControlIcon` (component), `ToolButton` (component)
- Live preview in the app: `ControlIcon`, `ToolButton`
- Usages: 14 references in 9 files

- `apps/mobile/src/ilias/components/ilias-toolbar.tsx`: 3 import `ControlIcon`; 3 import `ToolButton`; 30 render `ToolButton`; 38 render `ControlIcon`
- `apps/mobile/src/mail/components/attachment-list.tsx`: 3 import `ControlIcon`; 34 render `ControlIcon`
- `apps/mobile/src/mail/components/mail-toolbar.tsx`: 9 import `ControlIcon`; 9 import `ToolButton`; 52 render `ToolButton`; 54 render `ToolButton`; 60 render `ControlIcon`; 78 render `ToolButton`
- `apps/mobile/src/mail/components/template-sheet.tsx`: 3 import `ControlIcon`; 46 render `ControlIcon`
- `apps/mobile/src/quiz/components/quiz-toolbar.tsx`: 3 import `ControlIcon`; 3 import `ToolButton`; 36 render `ToolButton`; 45 render `ControlIcon`; 68 render `ToolButton`
- `packages/ui/src/drawer-panel.tsx`: 7 import `ControlIcon`; 23 render `ControlIcon`
- `packages/ui/src/dropdown-picker.tsx`: 7 import `ControlIcon`; 34 render `ControlIcon`
- `packages/ui/src/index.ts`: 1 re-export `ControlIcon`; 1 re-export `ToolButton`
- `packages/ui/src/option-rows.tsx`: 6 import `ControlIcon`; 40 render `ControlIcon`

### ChoiceCard

- File: `apps/mobile/src/components/choice-card.tsx`
- Category: Shared UI
- Exports: `ChoiceCard` (component)
- Live preview in the app: `ChoiceCard`
- Usages: 10 references in 3 files

- `apps/mobile/app/darstellung.tsx`: 4 import `ChoiceCard`; 22 render `ChoiceCard`; 28 render `ChoiceCard`; 39 render `ChoiceCard`; 45 render `ChoiceCard`
- `apps/mobile/app/onboarding.tsx`: 10 import `ChoiceCard`; 268 render `ChoiceCard`; 274 render `ChoiceCard`; 284 render `ChoiceCard`; 290 render `ChoiceCard`
- `apps/mobile/app/sprache.tsx`: 3 import `ChoiceCard`; 19 render `ChoiceCard`; 20 render `ChoiceCard`

### ResponsiveGrid

- File: `packages/ui/src/responsive-grid.tsx`
- Category: Shared UI
- Exports: `ResponsiveGrid` (component)
- Live preview in the app: `ResponsiveGrid`
- Usages: 10 references in 9 files

- `apps/mobile/app/(tabs)/chat.tsx`: 11 import `ResponsiveGrid`; 110 render `ResponsiveGrid`
- `apps/mobile/app/(tabs)/mehr.tsx`: 9 import `ResponsiveGrid`; 406 render `ResponsiveGrid`
- `apps/mobile/app/dokumente.tsx`: 5 import `ResponsiveGrid`; 76 render `ResponsiveGrid`; 93 render `ResponsiveGrid`
- `apps/mobile/app/feed.tsx`: 4 import `ResponsiveGrid`; 30 render `ResponsiveGrid`
- `apps/mobile/app/fristen.tsx`: 3 import `ResponsiveGrid`; 15 render `ResponsiveGrid`
- `apps/mobile/app/kommilitonen.tsx`: 5 import `ResponsiveGrid`; 44 render `ResponsiveGrid`; 59 render `ResponsiveGrid`
- `apps/mobile/app/kurse.tsx`: 10 import `ResponsiveGrid`; 275 render `ResponsiveGrid`
- `apps/mobile/src/ilias/components/ilias-dashboard.tsx`: 4 import `ResponsiveGrid`; 157 render `ResponsiveGrid`
- `packages/ui/src/index.ts`: 7 re-export `ResponsiveGrid`

### OptionRows

- File: `packages/ui/src/option-rows.tsx`
- Category: Shared UI
- Exports: `OptionRows` (component)
- Live preview in the app: `OptionRows`
- Usages: 9 references in 5 files

- `apps/mobile/app/(tabs)/ilias.tsx`: 9 import `OptionRows`; 97 render `OptionRows`
- `apps/mobile/app/(tabs)/mail.tsx`: 9 import `OptionRows`; 86 render `OptionRows`; 99 render `OptionRows`; 110 render `OptionRows`; 112 render `OptionRows`
- `apps/mobile/app/(tabs)/quiz.tsx`: 8 import `OptionRows`; 249 render `OptionRows`; 268 render `OptionRows`; 391 render `OptionRows`
- `packages/ui/src/dropdown-picker.tsx`: 8 import `OptionRows`; 44 render `OptionRows`
- `packages/ui/src/index.ts`: 5 re-export `OptionRows`

### toast

- File: `packages/ui/src/toast.tsx`
- Category: Shared UI
- Exports: `ToastHost` (component), `showToast` (helper)
- Live preview in the app: `showToast`
- Usages: 6 references in 7 files

- `apps/mobile/app/_layout.tsx`: 13 import `ToastHost`; 51 render `ToastHost`
- `apps/mobile/app/ilias/[refId].tsx`: 7 import `showToast`; 155 call `showToast`
- `apps/mobile/app/ilias/datei.tsx`: 6 import `showToast`; 54 call `showToast`
- `apps/mobile/app/kurse.tsx`: 10 import `showToast`; 100 call `showToast`
- `apps/mobile/app/mail-verfassen.tsx`: 7 import `showToast`; 255 call `showToast`
- `apps/mobile/app/onboarding.tsx`: 12 import `showToast`; 69 call `showToast`
- `packages/ui/src/index.ts`: 8 re-export `showToast`; 8 re-export `ToastHost`

### AmbientBackground

- File: `apps/mobile/src/components/ambient-background.tsx`
- Category: Shared UI
- Exports: `AmbientBackground` (component)
- Usages: 5 references in 5 files

- `apps/mobile/app/(tabs)/chat.tsx`: 10 import `AmbientBackground`; 87 render `AmbientBackground`
- `apps/mobile/app/(tabs)/mail.tsx`: 7 import `AmbientBackground`; 104 render `AmbientBackground`
- `apps/mobile/app/+not-found.tsx`: 4 import `AmbientBackground`; 12 render `AmbientBackground`
- `apps/mobile/app/onboarding.tsx`: 9 import `AmbientBackground`; 258 render `AmbientBackground`
- `apps/mobile/src/components/ui.tsx`: 6 import `AmbientBackground`; 125 render `AmbientBackground`

### DrawerPanel

- File: `packages/ui/src/drawer-panel.tsx`
- Category: Shared UI
- Exports: `DrawerPanel` (component)
- Live preview in the app: `DrawerPanel`
- Usages: 5 references in 4 files

- `apps/mobile/app/(tabs)/ilias.tsx`: 8 import `DrawerPanel`; 194 render `DrawerPanel`
- `apps/mobile/app/(tabs)/mail.tsx`: 9 import `DrawerPanel`; 82 render `DrawerPanel`; 98 render `DrawerPanel`
- `apps/mobile/app/(tabs)/quiz.tsx`: 7 import `DrawerPanel`; 421 render `DrawerPanel`; 439 render `DrawerPanel`
- `packages/ui/src/index.ts`: 2 re-export `DrawerPanel`

### JsonTree

- File: `packages/ui/src/json-tree.tsx`
- Category: Shared UI
- Exports: `JsonTree` (component)
- Live preview in the app: `JsonTree`
- Usages: 5 references in 5 files

- `apps/mobile/app/dev/nfc.tsx`: 5 import `JsonTree`; 119 render `JsonTree`
- `apps/mobile/app/dev/onboarding.tsx`: 5 import `JsonTree`; 127 render `JsonTree`
- `apps/mobile/app/dev/state.tsx`: 6 import `JsonTree`; 79 render `JsonTree`
- `apps/mobile/src/components/api-entry-detail.tsx`: 6 import `JsonTree`; 74 render `JsonTree`; 84 render `JsonTree`
- `packages/ui/src/index.ts`: 4 re-export `JsonTree`

### SigningIn

- File: `apps/mobile/src/components/signing-in.tsx`
- Category: Shared UI
- Exports: `SigningIn` (component)
- Live preview in the app: `SigningIn`
- Usages: 5 references in 4 files

- `apps/mobile/app/login-legacy.tsx`: 25 import `SigningIn`; 188 render `SigningIn`; 236 render `SigningIn`
- `apps/mobile/app/login.tsx`: 10 import `SigningIn`; 140 render `SigningIn`
- `apps/mobile/src/components/campus-browser-modal.tsx`: 8 import `SigningIn`; 77 render `SigningIn`
- `apps/mobile/src/components/campus-headless-modal.tsx`: 10 import `SigningIn`; 93 render `SigningIn`

### StudySelector

- File: `apps/mobile/src/components/study-selector.tsx`
- Category: Shared UI
- Exports: `StudySelector` (component)
- Usages: 3 references in 3 files

- `apps/mobile/app/(tabs)/mehr.tsx`: 12 import `StudySelector`; 279 render `StudySelector`
- `apps/mobile/app/kurse.tsx`: 13 import `StudySelector`; 174 render `StudySelector`
- `apps/mobile/src/components/campus-info-view.tsx`: 14 import `StudySelector`; 170 render `StudySelector`

### CampusBrowserModal

- File: `apps/mobile/src/components/campus-browser-modal.tsx`
- Category: Shared UI
- Exports: `CampusBrowserModal` (component)
- Usages: 2 references in 2 files

- `apps/mobile/app/login-legacy.tsx`: 20 import `CampusBrowserModal`; 257 render `CampusBrowserModal`
- `apps/mobile/app/login.tsx`: 7 import `CampusBrowserModal`; 152 render `CampusBrowserModal`

### CampusHeadlessModal

- File: `apps/mobile/src/components/campus-headless-modal.tsx`
- Category: Shared UI
- Exports: `CampusHeadlessModal` (component)
- Usages: 2 references in 2 files

- `apps/mobile/app/login-legacy.tsx`: 22 import `CampusHeadlessModal`; 272 render `CampusHeadlessModal`
- `apps/mobile/app/login.tsx`: 8 import `CampusHeadlessModal`; 167 render `CampusHeadlessModal`

### CampusInfoView

- File: `apps/mobile/src/components/campus-info-view.tsx`
- Category: Shared UI
- Exports: `CampusInfoView` (component)
- Usages: 2 references in 2 files

- `apps/mobile/app/campus-info.tsx`: 3 import `CampusInfoView`; 10 render `CampusInfoView`
- `apps/mobile/app/studium.tsx`: 5 import `CampusInfoView`; 90 render `CampusInfoView`

### CurriculumTree

- File: `apps/mobile/src/components/curriculum-tree.tsx`
- Category: Shared UI
- Exports: `CurriculumTree` (component)
- Usages: 2 references in 2 files

- `apps/mobile/app/strukturen.tsx`: 18 import `CurriculumTree`; 330 render `CurriculumTree`
- `apps/mobile/src/components/campus-info-view.tsx`: 13 import `CurriculumTree`; 249 render `CurriculumTree`

### pane-mode

- File: `packages/ui/src/pane-mode.tsx`
- Category: Shared UI
- Exports: `PaneModeProvider` (component), `usePaneMode` (hook)
- Usages: 2 references in 3 files

- `apps/mobile/app/(tabs)/mehr.tsx`: 9 import `PaneModeProvider`; 377 render `PaneModeProvider`
- `apps/mobile/src/components/ui.tsx`: 7 import `usePaneMode`; 99 call `usePaneMode`
- `packages/ui/src/index.ts`: 6 re-export `PaneModeProvider`; 6 re-export `usePaneMode`

### structure-row

- File: `apps/mobile/src/components/structure-row.tsx`
- Category: Shared UI
- Exports: `StructureRow` (component), `TreeChildren` (component)
- Live preview in the app: `StructureRow`, `TreeChildren`
- Usages: 2 references in 1 file

- `apps/mobile/src/components/curriculum-tree.tsx`: 4 import `StructureRow`; 4 import `TreeChildren`; 46 render `StructureRow`; 60 render `TreeChildren`

### ApiEntryDetail

- File: `apps/mobile/src/components/api-entry-detail.tsx`
- Category: Shared UI
- Exports: `ApiEntryDetail` (component)
- Usages: 1 reference in 1 file

- `apps/mobile/app/strukturen.tsx`: 14 import `ApiEntryDetail`; 374 render `ApiEntryDetail`

### ApiHistory

- File: `apps/mobile/src/components/api-history.tsx`
- Category: Shared UI
- Exports: `ApiHistory` (component)
- Usages: 1 reference in 1 file

- `apps/mobile/app/strukturen.tsx`: 15 import `ApiHistory`; 359 render `ApiHistory`

### AppLock

- File: `apps/mobile/src/components/app-lock.tsx`
- Category: Shared UI
- Exports: `AppLock` (component)
- Usages: 1 reference in 1 file

- `apps/mobile/app/_layout.tsx`: 12 import `AppLock`; 225 render `AppLock`

### CalendarHero

- File: `apps/mobile/src/components/calendar-hero.tsx`
- Category: Shared UI
- Exports: `CalendarHero` (component)
- Live preview in the app: `CalendarHero`
- Usages: 1 reference in 1 file

- `apps/mobile/app/(tabs)/index.tsx`: 4 import `CalendarHero`; 28 render `CalendarHero`

### CampusCredentialsForm

- File: `apps/mobile/src/components/campus-credentials-form.tsx`
- Category: Shared UI
- Exports: `CampusCredentialsForm` (component)
- Usages: 1 reference in 1 file

- `apps/mobile/app/login-legacy.tsx`: 21 import `CampusCredentialsForm`; 161 render `CampusCredentialsForm`

### CurriculumNodeDetail

- File: `apps/mobile/src/components/curriculum-node-detail.tsx`
- Category: Shared UI
- Exports: `CurriculumNodeDetail` (component)
- Usages: 1 reference in 1 file

- `apps/mobile/app/strukturen.tsx`: 16 import `CurriculumNodeDetail`; 364 render `CurriculumNodeDetail`

### CurriculumToolbar

- File: `apps/mobile/src/components/curriculum-toolbar.tsx`
- Category: Shared UI
- Exports: `CurriculumToolbar` (component)
- Usages: 1 reference in 1 file

- `apps/mobile/app/strukturen.tsx`: 17 import `CurriculumToolbar`; 287 render `CurriculumToolbar`

### DeviceQr

- File: `apps/mobile/src/components/device-qr.tsx`
- Platform files: `apps/mobile/src/components/device-qr.tsx` (native), `apps/mobile/src/components/device-qr.web.tsx` (web)
- Category: Shared UI
- Exports: `DeviceQr` (component)
- Live preview in the app: `DeviceQr`
- Usages: 1 reference in 1 file

- `apps/mobile/src/components/web-device-login.tsx`: 7 import `DeviceQr`; 106 render `DeviceQr`

### DropdownPicker

- File: `packages/ui/src/dropdown-picker.tsx`
- Category: Shared UI
- Exports: `DropdownPicker` (component)
- Live preview in the app: `DropdownPicker`
- Usages: 1 reference in 2 files

- `apps/mobile/src/mail/components/mail-toolbar.tsx`: 9 import `DropdownPicker`; 76 render `DropdownPicker`
- `packages/ui/src/index.ts`: 3 re-export `DropdownPicker`

### LecturersList

- File: `apps/mobile/src/components/lecturers-list.tsx`
- Category: Shared UI
- Exports: `LecturersList` (component)
- Live preview in the app: `LecturersList`
- Usages: 1 reference in 1 file

- `apps/mobile/app/studium.tsx`: 6 import `LecturersList`; 92 render `LecturersList`

### mailBody

- File: `apps/mobile/src/components/mailBody.tsx`
- Category: Shared UI
- Exports: `MailBody` (component), `segmentQuotedText` (helper)
- Live preview in the app: `MailBody`
- Usages: 1 reference in 1 file

- `apps/mobile/src/mail/components/mail-reader.tsx`: 7 import `MailBody`; 159 render `MailBody`

### StudyCacheCard

- File: `apps/mobile/src/components/study-cache-card.tsx`
- Category: Shared UI
- Exports: `StudyCacheCard` (component)
- Usages: 1 reference in 1 file

- `apps/mobile/app/strukturen.tsx`: 19 import `StudyCacheCard`; 258 render `StudyCacheCard`

### TutorialsList

- File: `apps/mobile/src/components/tutorials-list.tsx`
- Category: Shared UI
- Exports: `TutorialsList` (component)
- Live preview in the app: `TutorialsList`
- Usages: 1 reference in 1 file

- `apps/mobile/app/studium.tsx`: 7 import `TutorialsList`; 91 render `TutorialsList`

### UniMapView

- File: `apps/mobile/src/components/uni-map-view.tsx`
- Platform files: `apps/mobile/src/components/uni-map-view.tsx` (native), `apps/mobile/src/components/uni-map-view.web.tsx` (web)
- Category: Shared UI
- Exports: `UniMapView` (component)
- Usages: 1 reference in 1 file

- `apps/mobile/app/campus.tsx`: 7 import `UniMapView`; 63 render `UniMapView`

### WebDeviceLogin

- File: `apps/mobile/src/components/web-device-login.tsx`
- Category: Shared UI
- Exports: `WebDeviceLogin` (component)
- Usages: 1 reference in 1 file

- `apps/mobile/app/login.tsx`: 12 import `WebDeviceLogin`; 26 render `WebDeviceLogin`

### WebHead

- File: `apps/mobile/src/components/web-head.tsx`
- Category: Shared UI
- Exports: `WebHead` (component)
- Usages: 1 reference in 1 file

- `apps/mobile/app/_layout.tsx`: 14 import `WebHead`; 198 render `WebHead`

### WebSidebar

- File: `apps/mobile/src/components/web-sidebar.tsx`
- Category: Shared UI
- Exports: `WebSidebar` (component)
- Usages: 1 reference in 1 file

- `apps/mobile/app/_layout.tsx`: 15 import `WebSidebar`; 201 render `WebSidebar`

## Feature components

| Component | File | Platform | Preview | Exports | Usages | Files |
| --- | --- | --- | --- | --- | ---: | ---: |
| `QuizButton` | `apps/mobile/src/quiz/components/quiz-button.tsx` | Native + Web | QuizButton | QuizButton | 8 | 2 |
| `mail-skeletons` | `apps/mobile/src/mail/components/mail-skeletons.tsx` | Native + Web | MailListSkeleton, ToolbarSkeleton | MailListSkeleton, MailReveal, ToolbarReveal, ToolbarSkeleton | 4 | 2 |
| `OptionRow` | `apps/mobile/src/quiz/components/option-row.tsx` | Native + Web | OptionRow | OptionRow | 4 | 3 |
| `ProfileSummary` | `apps/mobile/src/profile/profile-summary.tsx` | Native + Web | ProfileSummary | ProfileSummary | 4 | 4 |
| `diagram` | `apps/mobile/src/quiz/components/diagram.tsx` | Native + Web | – | DiagramCanvas, DiagramView, diagramAspect | 3 | 2 |
| `RecipientField` | `apps/mobile/src/mail/components/recipient-field.tsx` | Native + Web | – | RecipientField | 3 | 1 |
| `ContactBadge` | `apps/mobile/src/mail/components/contact-badge.tsx` | Native + Web | ContactBadge | ContactBadge | 2 | 1 |
| `ilias-dashboard` | `apps/mobile/src/ilias/components/ilias-dashboard.tsx` | Native + Web | – | IliasDashboardView, iliasFilterLabel | 2 | 1 |
| `MailMessageList` | `apps/mobile/src/mail/components/mail-message-list.tsx` | Native + Web | – | MailMessageList | 2 | 1 |
| `MailReader` | `apps/mobile/src/mail/components/mail-reader.tsx` | Native + Web | – | MailReader | 2 | 2 |
| `MemberAvatar` | `apps/mobile/src/ilias/components/member-avatar.tsx` | Native + Web | MemberAvatar | MemberAvatar | 2 | 2 |
| `ProfilePreview` | `apps/mobile/src/profile/profile-preview.tsx` | Native + Web | ProfilePreview | ProfilePreview | 2 | 2 |
| `AttachmentList` | `apps/mobile/src/mail/components/attachment-list.tsx` | Native + Web | AttachmentList | AttachmentList | 1 | 1 |
| `ClozeView` | `apps/mobile/src/quiz/components/cloze.tsx` | Native + Web | ClozeView | ClozeView | 1 | 1 |
| `DiagramFigureCard` | `apps/mobile/src/quiz/components/diagram-figure.tsx` | Native + Web | – | DiagramFigureCard | 1 | 1 |
| `FlashcardView` | `apps/mobile/src/quiz/components/flashcard.tsx` | Native + Web | FlashcardView | FlashcardView | 1 | 1 |
| `FreeTextView` | `apps/mobile/src/quiz/components/free-text.tsx` | Native + Web | – | FreeTextView | 1 | 1 |
| `IliasOfficeView` | `apps/mobile/src/ilias/components/office-view.tsx` | Native + Web (split) | – | IliasOfficeView | 1 | 1 |
| `IliasPdfView` | `apps/mobile/src/ilias/components/pdf-view.tsx` | Native + Web (split) | – | IliasPdfView | 1 | 1 |
| `IliasToolbar` | `apps/mobile/src/ilias/components/ilias-toolbar.tsx` | Native + Web | – | IliasToolbar | 1 | 1 |
| `MailComposeActions` | `apps/mobile/src/mail/components/compose-actions.tsx` | Native + Web | – | MailComposeActions | 1 | 1 |
| `MailConnectionPanel` | `apps/mobile/src/mail/components/mail-connection-panel.tsx` | Native + Web | – | MailConnectionPanel | 1 | 1 |
| `MailRow` | `apps/mobile/src/mail/components/mail-row.tsx` | Native + Web | MailRow | MailRow | 1 | 1 |
| `MailToolbar` | `apps/mobile/src/mail/components/mail-toolbar.tsx` | Native + Web | – | MailToolbar | 1 | 1 |
| `MapView` | `apps/mobile/src/quiz/components/map.tsx` | Native + Web | – | MapView | 1 | 1 |
| `MatchingView` | `apps/mobile/src/quiz/components/matching.tsx` | Native + Web | – | MatchingView | 1 | 1 |
| `MultipleChoiceView` | `apps/mobile/src/quiz/components/multiple-choice.tsx` | Native + Web | – | MultipleChoiceView | 1 | 1 |
| `OrderingView` | `apps/mobile/src/quiz/components/ordering.tsx` | Native + Web | – | OrderingView | 1 | 1 |
| `QuestionFeedback` | `apps/mobile/src/quiz/components/question-feedback.tsx` | Native + Web | QuestionFeedback | QuestionFeedback | 1 | 1 |
| `QuestionView` | `apps/mobile/src/quiz/components/question-view.tsx` | Native + Web | – | QuestionView | 1 | 1 |
| `QuizToolbar` | `apps/mobile/src/quiz/components/quiz-toolbar.tsx` | Native + Web | QuizToolbar | QuizToolbar | 1 | 1 |
| `SingleChoiceView` | `apps/mobile/src/quiz/components/single-choice.tsx` | Native + Web | SingleChoiceView | SingleChoiceView | 1 | 1 |
| `TemplateSheet` | `apps/mobile/src/mail/components/template-sheet.tsx` | Native + Web | – | TemplateSheet | 1 | 1 |
| `TrueFalseView` | `apps/mobile/src/quiz/components/true-false.tsx` | Native + Web | TrueFalseView | TrueFalseView | 1 | 1 |

### QuizButton

- File: `apps/mobile/src/quiz/components/quiz-button.tsx`
- Category: Feature components
- Exports: `QuizButton` (component)
- Live preview in the app: `QuizButton`
- Usages: 8 references in 2 files

- `apps/mobile/app/quiz/[topic]/index.tsx`: 11 import `QuizButton`; 174 render `QuizButton`; 178 render `QuizButton`; 228 render `QuizButton`
- `apps/mobile/app/quiz/[topic]/run.tsx`: 12 import `QuizButton`; 196 render `QuizButton`; 297 render `QuizButton`; 304 render `QuizButton`; 377 render `QuizButton`; 378 render `QuizButton`

### mail-skeletons

- File: `apps/mobile/src/mail/components/mail-skeletons.tsx`
- Category: Feature components
- Exports: `MailListSkeleton` (component), `MailReveal` (component), `ToolbarReveal` (component), `ToolbarSkeleton` (component)
- Live preview in the app: `MailListSkeleton`, `ToolbarSkeleton`
- Usages: 4 references in 2 files

- `apps/mobile/app/(tabs)/mail.tsx`: 13 import `MailReveal`; 126 render `MailReveal`; 195 render `MailReveal`
- `apps/mobile/src/mail/components/mail-toolbar.tsx`: 10 import `ToolbarReveal`; 10 import `ToolbarSkeleton`; 56 render `ToolbarSkeleton`; 58 render `ToolbarReveal`

### OptionRow

- File: `apps/mobile/src/quiz/components/option-row.tsx`
- Category: Feature components
- Exports: `OptionRow` (component)
- Live preview in the app: `OptionRow`
- Usages: 4 references in 3 files

- `apps/mobile/src/quiz/components/multiple-choice.tsx`: 9 import `OptionRow`; 32 render `OptionRow`
- `apps/mobile/src/quiz/components/single-choice.tsx`: 9 import `OptionRow`; 30 render `OptionRow`
- `apps/mobile/src/quiz/components/true-false.tsx`: 7 import `OptionRow`; 24 render `OptionRow`; 32 render `OptionRow`

### ProfileSummary

- File: `apps/mobile/src/profile/profile-summary.tsx`
- Category: Feature components
- Exports: `ProfileSummary` (component)
- Live preview in the app: `ProfileSummary`
- Usages: 4 references in 4 files

- `apps/mobile/app/profil/auffindbarkeit.tsx`: 7 import `ProfileSummary`; 23 render `ProfileSummary`
- `apps/mobile/app/profil/daten.tsx`: 8 import `ProfileSummary`; 23 render `ProfileSummary`
- `apps/mobile/app/profil/index.tsx`: 6 import `ProfileSummary`; 26 render `ProfileSummary`
- `apps/mobile/app/profil/sichtbarkeit.tsx`: 8 import `ProfileSummary`; 32 render `ProfileSummary`

### diagram

- File: `apps/mobile/src/quiz/components/diagram.tsx`
- Category: Feature components
- Exports: `DiagramCanvas` (component), `DiagramView` (component), `diagramAspect` (helper)
- Usages: 3 references in 2 files

- `apps/mobile/src/quiz/components/diagram-figure.tsx`: 9 import `diagramAspect`; 9 import `DiagramCanvas`; 29 call `diagramAspect`; 30 render `DiagramCanvas`
- `apps/mobile/src/quiz/components/question-view.tsx`: 5 import `DiagramView`; 120 render `DiagramView`

### RecipientField

- File: `apps/mobile/src/mail/components/recipient-field.tsx`
- Category: Feature components
- Exports: `RecipientField` (component)
- Usages: 3 references in 1 file

- `apps/mobile/app/mail-verfassen.tsx`: 18 import `RecipientField`; 316 render `RecipientField`; 344 render `RecipientField`; 354 render `RecipientField`

### ContactBadge

- File: `apps/mobile/src/mail/components/contact-badge.tsx`
- Category: Feature components
- Exports: `ContactBadge` (component)
- Live preview in the app: `ContactBadge`
- Usages: 2 references in 1 file

- `apps/mobile/src/mail/components/recipient-field.tsx`: 10 import `ContactBadge`; 172 render `ContactBadge`; 196 render `ContactBadge`

### ilias-dashboard

- File: `apps/mobile/src/ilias/components/ilias-dashboard.tsx`
- Category: Feature components
- Exports: `IliasDashboardView` (component), `iliasFilterLabel` (helper)
- Usages: 2 references in 1 file

- `apps/mobile/app/(tabs)/ilias.tsx`: 11 import `IliasDashboardView`; 11 import `iliasFilterLabel`; 58 call `iliasFilterLabel`; 133 render `IliasDashboardView`

### MailMessageList

- File: `apps/mobile/src/mail/components/mail-message-list.tsx`
- Category: Feature components
- Exports: `MailMessageList` (component)
- Usages: 2 references in 1 file

- `apps/mobile/app/(tabs)/mail.tsx`: 11 import `MailMessageList`; 129 render `MailMessageList`; 198 render `MailMessageList`

### MailReader

- File: `apps/mobile/src/mail/components/mail-reader.tsx`
- Category: Feature components
- Exports: `MailReader` (component)
- Usages: 2 references in 2 files

- `apps/mobile/app/(tabs)/mail.tsx`: 12 import `MailReader`; 146 render `MailReader`
- `apps/mobile/app/mail-nachricht.tsx`: 4 import `MailReader`; 23 render `MailReader`

### MemberAvatar

- File: `apps/mobile/src/ilias/components/member-avatar.tsx`
- Category: Feature components
- Exports: `MemberAvatar` (component)
- Live preview in the app: `MemberAvatar`
- Usages: 2 references in 2 files

- `apps/mobile/app/ilias/[refId].tsx`: 12 import `MemberAvatar`; 70 render `MemberAvatar`
- `apps/mobile/app/ilias/mitglied.tsx`: 8 import `MemberAvatar`; 81 render `MemberAvatar`

### ProfilePreview

- File: `apps/mobile/src/profile/profile-preview.tsx`
- Category: Feature components
- Exports: `ProfilePreview` (component)
- Live preview in the app: `ProfilePreview`
- Usages: 2 references in 2 files

- `apps/mobile/app/profil/auffindbarkeit.tsx`: 6 import `ProfilePreview`; 45 render `ProfilePreview`
- `apps/mobile/app/profil/sichtbarkeit.tsx`: 7 import `ProfilePreview`; 89 render `ProfilePreview`

### AttachmentList

- File: `apps/mobile/src/mail/components/attachment-list.tsx`
- Category: Feature components
- Exports: `AttachmentList` (component)
- Live preview in the app: `AttachmentList`
- Usages: 1 reference in 1 file

- `apps/mobile/app/mail-verfassen.tsx`: 17 import `AttachmentList`; 420 render `AttachmentList`

### ClozeView

- File: `apps/mobile/src/quiz/components/cloze.tsx`
- Category: Feature components
- Exports: `ClozeView` (component)
- Live preview in the app: `ClozeView`
- Usages: 1 reference in 1 file

- `apps/mobile/src/quiz/components/question-view.tsx`: 4 import `ClozeView`; 100 render `ClozeView`

### DiagramFigureCard

- File: `apps/mobile/src/quiz/components/diagram-figure.tsx`
- Category: Feature components
- Exports: `DiagramFigureCard` (component)
- Usages: 1 reference in 1 file

- `apps/mobile/app/quiz/[topic]/index.tsx`: 10 import `DiagramFigureCard`; 187 render `DiagramFigureCard`

### FlashcardView

- File: `apps/mobile/src/quiz/components/flashcard.tsx`
- Category: Feature components
- Exports: `FlashcardView` (component)
- Live preview in the app: `FlashcardView`
- Usages: 1 reference in 1 file

- `apps/mobile/src/quiz/components/question-view.tsx`: 6 import `FlashcardView`; 130 render `FlashcardView`

### FreeTextView

- File: `apps/mobile/src/quiz/components/free-text.tsx`
- Category: Feature components
- Exports: `FreeTextView` (component)
- Usages: 1 reference in 1 file

- `apps/mobile/src/quiz/components/question-view.tsx`: 7 import `FreeTextView`; 69 render `FreeTextView`

### IliasOfficeView

- File: `apps/mobile/src/ilias/components/office-view.tsx`
- Platform files: `apps/mobile/src/ilias/components/office-view.tsx` (native), `apps/mobile/src/ilias/components/office-view.web.tsx` (web)
- Category: Feature components
- Exports: `IliasOfficeView` (component)
- Usages: 1 reference in 1 file

- `apps/mobile/app/ilias/datei.tsx`: 8 import `IliasOfficeView`; 111 render `IliasOfficeView`

### IliasPdfView

- File: `apps/mobile/src/ilias/components/pdf-view.tsx`
- Platform files: `apps/mobile/src/ilias/components/pdf-view.tsx` (native), `apps/mobile/src/ilias/components/pdf-view.web.tsx` (web)
- Category: Feature components
- Exports: `IliasPdfView` (component)
- Usages: 1 reference in 1 file

- `apps/mobile/app/ilias/datei.tsx`: 9 import `IliasPdfView`; 113 render `IliasPdfView`

### IliasToolbar

- File: `apps/mobile/src/ilias/components/ilias-toolbar.tsx`
- Category: Feature components
- Exports: `IliasToolbar` (component)
- Usages: 1 reference in 1 file

- `apps/mobile/app/(tabs)/ilias.tsx`: 12 import `IliasToolbar`; 67 render `IliasToolbar`

### MailComposeActions

- File: `apps/mobile/src/mail/components/compose-actions.tsx`
- Category: Feature components
- Exports: `MailComposeActions` (component)
- Usages: 1 reference in 1 file

- `apps/mobile/src/mail/components/mail-reader.tsx`: 14 import `MailComposeActions`; 141 render `MailComposeActions`

### MailConnectionPanel

- File: `apps/mobile/src/mail/components/mail-connection-panel.tsx`
- Category: Feature components
- Exports: `MailConnectionPanel` (component)
- Usages: 1 reference in 1 file

- `apps/mobile/app/(tabs)/mail.tsx`: 10 import `MailConnectionPanel`; 181 render `MailConnectionPanel`

### MailRow

- File: `apps/mobile/src/mail/components/mail-row.tsx`
- Category: Feature components
- Exports: `MailRow` (component)
- Live preview in the app: `MailRow`
- Usages: 1 reference in 1 file

- `apps/mobile/src/mail/components/mail-message-list.tsx`: 9 import `MailRow`; 54 render `MailRow`

### MailToolbar

- File: `apps/mobile/src/mail/components/mail-toolbar.tsx`
- Category: Feature components
- Exports: `MailToolbar` (component)
- Usages: 1 reference in 1 file

- `apps/mobile/app/(tabs)/mail.tsx`: 14 import `MailToolbar`; 55 render `MailToolbar`

### MapView

- File: `apps/mobile/src/quiz/components/map.tsx`
- Category: Feature components
- Exports: `MapView` (component)
- Usages: 1 reference in 1 file

- `apps/mobile/src/quiz/components/question-view.tsx`: 8 import `MapView`; 110 render `MapView`

### MatchingView

- File: `apps/mobile/src/quiz/components/matching.tsx`
- Category: Feature components
- Exports: `MatchingView` (component)
- Usages: 1 reference in 1 file

- `apps/mobile/src/quiz/components/question-view.tsx`: 9 import `MatchingView`; 80 render `MatchingView`

### MultipleChoiceView

- File: `apps/mobile/src/quiz/components/multiple-choice.tsx`
- Category: Feature components
- Exports: `MultipleChoiceView` (component)
- Usages: 1 reference in 1 file

- `apps/mobile/src/quiz/components/question-view.tsx`: 10 import `MultipleChoiceView`; 49 render `MultipleChoiceView`

### OrderingView

- File: `apps/mobile/src/quiz/components/ordering.tsx`
- Category: Feature components
- Exports: `OrderingView` (component)
- Usages: 1 reference in 1 file

- `apps/mobile/src/quiz/components/question-view.tsx`: 11 import `OrderingView`; 90 render `OrderingView`

### QuestionFeedback

- File: `apps/mobile/src/quiz/components/question-feedback.tsx`
- Category: Feature components
- Exports: `QuestionFeedback` (component)
- Live preview in the app: `QuestionFeedback`
- Usages: 1 reference in 1 file

- `apps/mobile/app/quiz/[topic]/run.tsx`: 10 import `QuestionFeedback`; 339 render `QuestionFeedback`

### QuestionView

- File: `apps/mobile/src/quiz/components/question-view.tsx`
- Category: Feature components
- Exports: `QuestionView` (component)
- Usages: 1 reference in 1 file

- `apps/mobile/app/quiz/[topic]/run.tsx`: 11 import `QuestionView`; 330 render `QuestionView`

### QuizToolbar

- File: `apps/mobile/src/quiz/components/quiz-toolbar.tsx`
- Category: Feature components
- Exports: `QuizToolbar` (component)
- Live preview in the app: `QuizToolbar`
- Usages: 1 reference in 1 file

- `apps/mobile/app/(tabs)/quiz.tsx`: 20 import `QuizToolbar`; 235 render `QuizToolbar`

### SingleChoiceView

- File: `apps/mobile/src/quiz/components/single-choice.tsx`
- Category: Feature components
- Exports: `SingleChoiceView` (component)
- Live preview in the app: `SingleChoiceView`
- Usages: 1 reference in 1 file

- `apps/mobile/src/quiz/components/question-view.tsx`: 12 import `SingleChoiceView`; 39 render `SingleChoiceView`

### TemplateSheet

- File: `apps/mobile/src/mail/components/template-sheet.tsx`
- Category: Feature components
- Exports: `TemplateSheet` (component)
- Usages: 1 reference in 1 file

- `apps/mobile/app/mail-verfassen.tsx`: 19 import `TemplateSheet`; 434 render `TemplateSheet`

### TrueFalseView

- File: `apps/mobile/src/quiz/components/true-false.tsx`
- Category: Feature components
- Exports: `TrueFalseView` (component)
- Live preview in the app: `TrueFalseView`
- Usages: 1 reference in 1 file

- `apps/mobile/src/quiz/components/question-view.tsx`: 13 import `TrueFalseView`; 59 render `TrueFalseView`

## App-wide providers

| Component | File | Platform | Preview | Exports | Usages | Files |
| --- | --- | --- | --- | --- | ---: | ---: |
| `OnboardingState` | `apps/mobile/src/onboarding/OnboardingState.tsx` | Native + Web | – | OnboardingProvider, useOnboarding, ONBOARDING_STORAGE_KEY, readStoredOnboardingPreferences | 8 | 5 |
| `progress` | `apps/mobile/src/quiz/progress.tsx` | Native + Web | – | QuizProgressProvider, useQuizProgress, QUIZ_PROGRESS_STORAGE_KEY | 6 | 5 |
| `AppStateProvider` | `apps/mobile/src/state/AppStateProvider.tsx` | Native + Web | – | AppStateProvider | 1 | 2 |
| `IliasAutoConnect` | `apps/mobile/src/ilias/ilias-auto-connect.tsx` | Native + Web | – | IliasAutoConnect | 1 | 1 |
| `IliasHeadlessProvider` | `apps/mobile/src/ilias/ilias-headless-provider.tsx` | Native + Web | – | IliasHeadlessProvider | 1 | 1 |
| `QueryProvider` | `apps/mobile/src/query/client.tsx` | Native + Web | – | QueryProvider | 1 | 1 |
| `QuizCatalogProvider` | `apps/mobile/src/quiz/catalog-provider.tsx` | Native + Web | – | QuizCatalogProvider | 1 | 1 |
| `SessionRefresh` | `apps/mobile/src/auth/session-refresh.tsx` | Native + Web | – | SessionRefresh | 1 | 1 |

### OnboardingState

- File: `apps/mobile/src/onboarding/OnboardingState.tsx`
- Category: App-wide providers
- Exports: `OnboardingProvider` (component), `useOnboarding` (hook), `ONBOARDING_STORAGE_KEY` (constant), `readStoredOnboardingPreferences` (helper)
- Usages: 8 references in 5 files

- `apps/mobile/app/_layout.tsx`: 19 import `OnboardingProvider`; 19 import `useOnboarding`; 43 render `OnboardingProvider`; 75 call `useOnboarding`
- `apps/mobile/app/dev/onboarding.tsx`: 10 import `ONBOARDING_STORAGE_KEY`; 11 import `readStoredOnboardingPreferences`; 12 import `useOnboarding`; 39 call `useOnboarding`; 44 call `readStoredOnboardingPreferences`; 98 reference `ONBOARDING_STORAGE_KEY`
- `apps/mobile/app/geraet-verknuepfen.tsx`: 16 import `useOnboarding`; 54 call `useOnboarding`
- `apps/mobile/app/onboarding.tsx`: 14 import `useOnboarding`; 43 call `useOnboarding`
- `apps/mobile/app/sicherheit.tsx`: 11 import `useOnboarding`; 34 call `useOnboarding`

### progress

- File: `apps/mobile/src/quiz/progress.tsx`
- Category: App-wide providers
- Exports: `QuizProgressProvider` (component), `useQuizProgress` (hook), `QUIZ_PROGRESS_STORAGE_KEY` (constant)
- Usages: 6 references in 5 files

- `apps/mobile/app/_layout.tsx`: 21 import `QuizProgressProvider`; 46 render `QuizProgressProvider`
- `apps/mobile/app/(tabs)/quiz.tsx`: 22 import `useQuizProgress`; 107 call `useQuizProgress`
- `apps/mobile/app/quiz/[topic]/index.tsx`: 13 import `useQuizProgress`; 29 call `useQuizProgress`
- `apps/mobile/app/quiz/[topic]/run.tsx`: 15 import `useQuizProgress`; 54 call `useQuizProgress`; 106 call `useQuizProgress`
- `apps/mobile/app/quiz/modul/[id].tsx`: 8 import `useQuizProgress`; 24 call `useQuizProgress`

### AppStateProvider

- File: `apps/mobile/src/state/AppStateProvider.tsx`
- Category: App-wide providers
- Exports: `AppStateProvider` (component)
- Usages: 1 reference in 2 files

- `apps/mobile/app/_layout.tsx`: 23 import `AppStateProvider`; 39 render `AppStateProvider`
- `apps/mobile/src/state/AppState.tsx`: 6 re-export `AppStateProvider`

### IliasAutoConnect

- File: `apps/mobile/src/ilias/ilias-auto-connect.tsx`
- Category: App-wide providers
- Exports: `IliasAutoConnect` (component)
- Usages: 1 reference in 1 file

- `apps/mobile/app/_layout.tsx`: 17 import `IliasAutoConnect`; 42 render `IliasAutoConnect`

### IliasHeadlessProvider

- File: `apps/mobile/src/ilias/ilias-headless-provider.tsx`
- Category: App-wide providers
- Exports: `IliasHeadlessProvider` (component)
- Usages: 1 reference in 1 file

- `apps/mobile/app/_layout.tsx`: 18 import `IliasHeadlessProvider`; 40 render `IliasHeadlessProvider`

### QueryProvider

- File: `apps/mobile/src/query/client.tsx`
- Category: App-wide providers
- Exports: `QueryProvider` (component)
- Usages: 1 reference in 1 file

- `apps/mobile/app/_layout.tsx`: 22 import `QueryProvider`; 44 render `QueryProvider`

### QuizCatalogProvider

- File: `apps/mobile/src/quiz/catalog-provider.tsx`
- Category: App-wide providers
- Exports: `QuizCatalogProvider` (component)
- Usages: 1 reference in 1 file

- `apps/mobile/app/_layout.tsx`: 20 import `QuizCatalogProvider`; 47 render `QuizCatalogProvider`

### SessionRefresh

- File: `apps/mobile/src/auth/session-refresh.tsx`
- Category: App-wide providers
- Exports: `SessionRefresh` (component)
- Usages: 1 reference in 1 file

- `apps/mobile/app/_layout.tsx`: 10 import `SessionRefresh`; 41 render `SessionRefresh`

