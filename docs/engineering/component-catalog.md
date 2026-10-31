---
title: Component catalog
sidebar_label: Component catalog
hide_table_of_contents: true
---

<!-- GENERATED FILE — do not edit by hand. Run `bun run catalog:components`. -->

# Component catalog

Every component under `src/` with its exports, platform files, and every place it is imported, rendered, called, or referenced. The page is generated from the TypeScript AST by `tools/codegen/generate-component-catalog.mjs`. The in-app view with live previews is **Dev → Komponenten** (`/dev/components`); the operator inventory is **Komponenten** (`/admin#/components`). The **Preview** column names the exports with a live demo; the admin page links them to the Expo web app on port 8081.

`render` is a JSX tag, `call` is a direct invocation, `reference` is an identifier passed as a value (for example `component={Screen}`), `import` and `type` are import statements, and `re-export` is a barrel line such as `src/state/AppState.tsx`. The catalog sources themselves are excluded so the counts do not include this page.

> Run `bun run catalog:components` after changing a component or a usage. `bun run check:components` fails when this page or `apps/mobile/src/components/catalog.generated.ts` is stale.

## Summary

| Metric | Value |
| --- | ---: |
| Components | 86 |
| Exports | 131 |
| Usage references | 842 |
| Files with occurrences | 111 |
| Unused components | 1 |
| Imported but never used | 0 |
| Components with platform files | 4 |
| Components with live previews | 32 |
| Shared UI | 37 |
| Feature components | 41 |
| App-wide providers | 8 |

## Shared UI

| Component | File | Platform | Preview | Exports | Usages | Files |
| --- | --- | --- | --- | --- | ---: | ---: |
| `ui` | `packages/ui/src/ui.tsx` | Native + Web | Button, Card, FieldLabel, InfoRow, Mark, Meter, Muted, Pill, SearchField, Section, Strong | Button, Card, FieldLabel, InfoRow, Mark, Meter, Muted, Pill, Screen, SearchField, Section, Strong, listPosition | 623 | 87 |
| `login-blocks` | `apps/mobile/src/components/login-blocks.tsx` | Native + Web | Checkbox, Chip, ErrorText, Field, Footer, LanguagePicker, Meta, Notice, SectionTitle | Checkbox, Chip, ErrorText, Field, Footer, LanguagePicker, Meta, Notice, SectionTitle | 25 | 6 |
| `control-icon` | `packages/ui/src/control-icon.tsx` | Native + Web | ControlIcon, ToolButton | ControlIcon, ToolButton | 14 | 9 |
| `ChoiceCard` | `apps/mobile/src/components/choice-card.tsx` | Native + Web | ChoiceCard | ChoiceCard | 10 | 3 |
| `ResponsiveGrid` | `packages/ui/src/responsive-grid.tsx` | Native + Web | ResponsiveGrid | ResponsiveGrid | 10 | 9 |
| `OptionRows` | `packages/ui/src/option-rows.tsx` | Native + Web | OptionRows | OptionRows | 9 | 5 |
| `toast` | `packages/ui/src/toast.tsx` | Native + Web | showToast | ToastHost, showToast | 6 | 7 |
| `DrawerPanel` | `packages/ui/src/drawer-panel.tsx` | Native + Web | DrawerPanel | DrawerPanel | 5 | 4 |
| `JsonTree` | `packages/ui/src/json-tree.tsx` | Native + Web | JsonTree | JsonTree | 5 | 5 |
| `SigningIn` | `apps/mobile/src/components/signing-in.tsx` | Native + Web | SigningIn | SigningIn | 5 | 4 |
| `StudySelector` | `apps/mobile/src/components/study-selector.tsx` | Native + Web | – | StudySelector | 3 | 3 |
| `CampusBrowserModal` | `apps/mobile/src/components/campus-browser-modal.tsx` | Native + Web | – | CampusBrowserModal | 2 | 2 |
| `CampusHeadlessModal` | `apps/mobile/src/components/campus-headless-modal.tsx` | Native + Web | – | CampusHeadlessModal | 2 | 2 |
| `CampusInfoView` | `apps/mobile/src/components/campus-info-view.tsx` | Native + Web | – | CampusInfoView | 2 | 2 |
| `CurriculumTree` | `apps/mobile/src/components/curriculum-tree.tsx` | Native + Web | – | CurriculumTree | 2 | 2 |
| `pane-mode` | `packages/ui/src/pane-mode.tsx` | Native + Web | – | PaneModeProvider, usePaneMode | 2 | 3 |
| `SavedCredentialPanel` | `apps/mobile/src/components/saved-credentials.tsx` | Native + Web | – | SavedCredentialPanel | 2 | 2 |
| `structure-row` | `apps/mobile/src/components/structure-row.tsx` | Native + Web | StructureRow, TreeChildren | StructureRow, TreeChildren | 2 | 1 |
| `AmbientBackground` | `packages/ui/src/ambient-background.tsx` | Native + Web | – | AmbientBackground | 1 | 1 |
| `ApiEntryDetail` | `apps/mobile/src/components/api-entry-detail.tsx` | Native + Web | – | ApiEntryDetail | 1 | 1 |
| `ApiHistory` | `apps/mobile/src/components/api-history.tsx` | Native + Web | – | ApiHistory | 1 | 1 |
| `AppLock` | `apps/mobile/src/components/app-lock.tsx` | Native + Web | – | AppLock | 1 | 1 |
| `CalendarHero` | `apps/mobile/src/components/calendar-hero.tsx` | Native + Web | CalendarHero | CalendarHero | 1 | 1 |
| `CampusCredentialsForm` | `apps/mobile/src/components/campus-credentials-form.tsx` | Native + Web | – | CampusCredentialsForm | 1 | 1 |
| `CurriculumNodeDetail` | `apps/mobile/src/components/curriculum-node-detail.tsx` | Native + Web | – | CurriculumNodeDetail | 1 | 1 |
| `CurriculumToolbar` | `apps/mobile/src/components/curriculum-toolbar.tsx` | Native + Web | – | CurriculumToolbar | 1 | 1 |
| `design-mode` | `packages/ui/src/design-mode.tsx` | Native + Web | – | DesignModeProvider, useDesignMode | 1 | 1 |
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

- File: `packages/ui/src/ui.tsx`
- Category: Shared UI
- Exports: `Button` (component), `Card` (component), `FieldLabel` (component), `InfoRow` (component), `Mark` (component), `Meter` (component), `Muted` (component), `Pill` (component), `Screen` (component), `SearchField` (component), `Section` (component), `Strong` (component), `listPosition` (helper)
- Live preview in the app: `Button`, `Card`, `FieldLabel`, `InfoRow`, `Mark`, `Meter`, `Muted`, `Pill`, `SearchField`, `Section`, `Strong`
- Usages: 623 references in 87 files

- `apps/mobile/app/(tabs)/ilias.tsx`: 8 import `Button`; 8 import `Card`; 8 import `Screen`; 163 render `Screen`; 170 render `Screen`; 200 render `Screen`; 221 render `Card`; 224 render `Button`; 225 render `Button`
- `apps/mobile/app/(tabs)/index.tsx`: 5 import `Card`; 5 import `InfoRow`; 5 import `Meter`; 5 import `Screen`; 5 import `Section`; 28 render `Card`; 34 render `Meter`; 40 render `Card`; 53 render `Section`; 56 render `InfoRow`; 65 render `Card`; 70 render `Section`; 72 render `InfoRow`; 81 render `Section`; 83 render `InfoRow`; 95 render `Screen`
- `apps/mobile/app/(tabs)/kalender.tsx`: 9 import `Button`; 9 import `Card`; 9 import `Muted`; 9 import `Pill`; 9 import `Screen`; 9 import `Section`; 124 render `Screen`; 126 render `Card`; 127 render `Muted`; 132 render `Card`; 133 render `Muted`; 136 render `Button`; 222 render `Section`; 223 render `Card`; 224 render `Muted`; 285 render `Pill`; 289 render `Pill`; 296 render `Pill`; 299 render `Pill`; 315 render `Pill`; 319 render `Pill`; 334 render `Pill`; 338 render `Pill`; 354 render `Pill`; 433 render `Muted`; 499 render `Muted`; 508 render `Pill`; 511 render `Pill`; 514 render `Pill`; 539 render `Muted`; 623 render `Pill`; 626 render `Pill`; 629 render `Pill`; 836 render `Section`; 841 render `Card`; 858 render `Button`; 860 render `Button`
- `apps/mobile/app/(tabs)/mail.tsx`: 7 import `Screen`; 161 render `Screen`
- `apps/mobile/app/(tabs)/mehr.tsx`: 9 import `Button`; 9 import `Card`; 9 import `InfoRow`; 9 import `listPosition`; 9 import `Screen`; 9 import `Section`; 223 render `InfoRow`; 228 call `listPosition`; 237 render `Section`; 244 render `Screen`; 280 render `Card`; 311 render `Card`; 383 render `Card`; 387 render `Button`; 393 render `Button`
- `apps/mobile/app/(tabs)/quiz.tsx`: 7 import `Card`; 7 import `Meter`; 7 import `Screen`; 7 import `Section`; 123 render `Screen`; 124 render `Card`; 286 render `Card`; 300 render `Meter`; 329 render `Section`; 332 render `Section`; 355 render `Card`; 365 render `Section`; 366 render `Card`; 390 render `Screen`; 451 render `Screen`; 561 render `Meter`
- `apps/mobile/app/altklausuren.tsx`: 3 import `InfoRow`; 3 import `Screen`; 11 render `Screen`; 19 render `InfoRow`
- `apps/mobile/app/anforderungen.tsx`: 3 import `Card`; 3 import `Meter`; 3 import `Screen`; 18 render `Screen`; 23 render `Card`; 39 render `Card`; 45 render `Meter`
- `apps/mobile/app/anrechnung.tsx`: 5 import `Button`; 5 import `Card`; 5 import `InfoRow`; 5 import `Pill`; 5 import `Screen`; 60 render `Screen`; 67 render `Pill`; 70 render `Pill`; 84 render `Pill`; 89 render `Card`; 101 render `Card`; 108 render `Button`; 110 render `InfoRow`
- `apps/mobile/app/api.tsx`: 10 import `Button`; 10 import `Card`; 10 import `InfoRow`; 10 import `Muted`; 10 import `Screen`; 10 import `Section`; 145 render `Screen`; 151 render `Muted`; 155 render `Section`; 157 render `Card`; 161 render `Muted`; 182 render `Button`; 187 render `Muted`; 193 render `Card`; 200 render `Section`; 202 render `Muted`; 205 render `InfoRow`; 221 render `Section`; 223 render `Muted`; 226 render `InfoRow`; 234 render `Section`; 236 render `Muted`; 239 render `InfoRow`
- `apps/mobile/app/campus-info.tsx`: 4 import `Screen`; 8 render `Screen`
- `apps/mobile/app/campus.tsx`: 6 import `Button`; 6 import `Card`; 6 import `InfoRow`; 6 import `Muted`; 6 import `Pill`; 6 import `Screen`; 26 render `Screen`; 37 render `Pill`; 40 render `Pill`; 52 render `Card`; 53 render `Muted`; 56 render `Button`; 91 render `Pill`; 117 render `InfoRow`
- `apps/mobile/app/darstellung.tsx`: 5 import `Muted`; 5 import `Screen`; 5 import `Section`; 16 render `Screen`; 36 render `Section`; 37 render `Muted`
- `apps/mobile/app/dev/nfc.tsx`: 5 import `Button`; 5 import `Card`; 5 import `Screen`; 5 import `Section`; 56 render `Screen`; 60 render `Section`; 61 render `Card`; 66 render `Button`; 68 render `Button`; 74 render `Section`; 75 render `Card`; 95 render `Section`; 96 render `Card`; 116 render `Section`; 117 render `Card`
- `apps/mobile/app/dev/onboarding.tsx`: 5 import `Button`; 5 import `Card`; 5 import `Screen`; 5 import `Section`; 73 render `Screen`; 77 render `Section`; 78 render `Card`; 90 render `Section`; 91 render `Card`; 100 render `Section`; 102 render `Button`; 106 render `Button`; 111 render `Button`; 123 render `Section`; 124 render `Card`
- `apps/mobile/app/dev/state.tsx`: 6 import `Button`; 6 import `Card`; 6 import `Screen`; 6 import `Section`; 39 render `Screen`; 43 render `Section`; 44 render `Card`; 57 render `Section`; 58 render `Card`; 71 render `Button`; 74 render `Section`; 75 render `Card`
- `apps/mobile/app/dokument/[id].tsx`: 8 import `Button`; 8 import `Card`; 8 import `Screen`; 52 render `Screen`; 62 render `Screen`; 66 render `Card`; 73 render `Card`; 83 render `Button`; 87 render `Button`; 97 render `Button`; 106 render `Button`; 107 render `Button`; 117 render `Button`; 120 render `Button`; 127 render `Card`
- `apps/mobile/app/dokumente.tsx`: 5 import `Button`; 5 import `Card`; 5 import `InfoRow`; 5 import `Screen`; 5 import `Section`; 63 render `Screen`; 65 render `Button`; 72 render `Button`; 74 render `Section`; 79 render `InfoRow`; 91 render `Section`; 96 render `InfoRow`; 99 render `InfoRow`; 102 render `Card`; 106 render `Button`
- `apps/mobile/app/dozent/[id].tsx`: 4 import `Card`; 4 import `InfoRow`; 4 import `Screen`; 17 render `Screen`; 25 render `Screen`; 27 render `Card`; 33 render `InfoRow`; 36 render `InfoRow`
- `apps/mobile/app/drucker.tsx`: 5 import `Button`; 5 import `Card`; 5 import `Screen`; 5 import `Section`; 42 render `Screen`; 45 render `Card`; 48 render `Button`; 51 render `Section`; 52 render `Card`; 58 render `Button`; 61 render `Section`; 62 render `Card`; 66 render `Section`; 67 render `Card`; 77 render `Section`; 78 render `Card`; 84 render `Button`; 86 render `Card`; 89 render `Button`; 91 render `Card`; 96 render `Section`; 97 render `Card`; 102 render `Section`; 103 render `Card`; 105 render `Button`; 108 render `Section`; 109 render `Card`; 118 render `Section`; 119 render `Card`; 121 render `Button`; 122 render `Button`
- `apps/mobile/app/einstellungen.tsx`: 8 import `Button`; 8 import `Card`; 8 import `InfoRow`; 8 import `Screen`; 8 import `Section`; 40 render `Card`; 52 render `InfoRow`; 66 render `Card`; 69 render `Card`; 81 render `Button`; 88 render `Screen`; 124 render `Section`; 132 render `Section`
- `apps/mobile/app/feed.tsx`: 4 import `InfoRow`; 4 import `Screen`; 15 render `Screen`; 31 render `InfoRow`
- `apps/mobile/app/fristen.tsx`: 3 import `InfoRow`; 3 import `Screen`; 12 render `Screen`; 16 render `InfoRow`
- `apps/mobile/app/geraet-verknuepfen.tsx`: 15 import `Button`; 15 import `Card`; 15 import `Pill`; 15 import `Screen`; 179 render `Screen`; 188 render `Card`; 195 render `Card`; 204 render `Pill`; 208 render `Button`; 209 render `Button`; 215 render `Card`; 223 render `Button`; 225 render `Button`; 227 render `Button`; 244 render `Button`; 268 render `Button`; 272 render `Card`; 275 render `Pill`; 311 render `Button`; 317 render `Card`
- `apps/mobile/app/ilias/[refId].tsx`: 7 import `Button`; 7 import `Card`; 7 import `Muted`; 7 import `Pill`; 7 import `Screen`; 7 import `Section`; 35 render `Card`; 40 render `Pill`; 81 render `Pill`; 181 render `Screen`; 201 render `Card`; 202 render `Muted`; 207 render `Card`; 208 render `Muted`; 209 render `Button`; 210 render `Button`; 219 render `Card`; 220 render `Muted`; 224 render `Section`; 238 render `Button`; 245 render `Section`; 246 render `Card`
- `apps/mobile/app/ilias/datei.tsx`: 6 import `Button`; 6 import `Muted`; 6 import `Screen`; 65 render `Screen`; 73 render `Button`; 84 render `Button`; 124 render `Muted`
- `apps/mobile/app/ilias/mitglied.tsx`: 6 import `Button`; 6 import `Card`; 6 import `Muted`; 6 import `Pill`; 6 import `Screen`; 6 import `Section`; 62 render `Screen`; 80 render `Card`; 88 render `Pill`; 97 render `Muted`; 103 render `Card`; 104 render `Muted`; 106 render `Button`; 112 render `Card`; 116 render `Button`; 127 render `Card`; 136 render `Button`; 143 render `Button`; 154 render `Section`; 157 render `Card`; 162 render `Pill`; 171 render `Button`
- `apps/mobile/app/kalender-export.tsx`: 9 import `Button`; 9 import `Card`; 9 import `InfoRow`; 9 import `listPosition`; 9 import `Pill`; 9 import `Screen`; 9 import `Section`; 136 render `Screen`; 141 render `Card`; 146 render `Pill`; 150 render `Button`; 151 render `Button`; 155 render `Section`; 157 render `Card`; 165 render `InfoRow`; 170 call `listPosition`
- `apps/mobile/app/kommilitonen.tsx`: 5 import `Card`; 5 import `InfoRow`; 5 import `Screen`; 5 import `Section`; 24 render `Screen`; 26 render `Section`; 27 render `Card`; 42 render `Section`; 47 render `Card`; 57 render `Section`; 60 render `InfoRow`
- `apps/mobile/app/konto.tsx`: 10 import `Button`; 10 import `Card`; 10 import `InfoRow`; 10 import `listPosition`; 10 import `Pill`; 10 import `Screen`; 10 import `Section`; 89 render `Screen`; 92 render `Card`; 104 render `Pill`; 111 render `Section`; 118 render `InfoRow`; 123 call `listPosition`; 129 render `Section`; 131 render `InfoRow`; 138 render `Card`; 148 render `Button`; 149 render `Button`
- `apps/mobile/app/kurs/[id].tsx`: 8 import `Button`; 8 import `Card`; 8 import `InfoRow`; 8 import `Muted`; 8 import `Screen`; 33 render `Screen`; 35 render `Muted`; 48 render `Screen`; 50 render `Card`; 61 render `InfoRow`; 67 render `InfoRow`; 79 render `InfoRow`; 85 render `InfoRow`; 88 render `Button`
- `apps/mobile/app/kurse.tsx`: 10 import `Button`; 10 import `Card`; 10 import `InfoRow`; 10 import `Muted`; 10 import `Pill`; 10 import `Screen`; 10 import `Section`; 165 render `Screen`; 175 render `Card`; 176 render `Muted`; 182 render `Card`; 191 render `Muted`; 195 render `Button`; 197 render `Button`; 232 render `Button`; 234 render `Button`; 240 render `Button`; 255 render `Pill`; 259 render `Pill`; 266 render `Pill`; 273 render `Section`; 276 render `InfoRow`
- `apps/mobile/app/login-legacy.tsx`: 26 import `Button`; 26 import `Mark`; 147 render `Mark`; 183 render `Button`; 195 render `Button`; 204 render `Button`; 211 render `Button`; 231 render `Button`; 252 render `Button`
- `apps/mobile/app/login.tsx`: 12 import `Button`; 12 import `Mark`; 59 render `Mark`; 118 render `Button`
- `apps/mobile/app/mail-nachricht.tsx`: 3 import `Screen`; 21 render `Screen`
- `apps/mobile/app/mail-verbindung.tsx`: 14 import `Button`; 14 import `Card`; 14 import `Pill`; 14 import `Screen`; 71 render `Screen`; 78 render `Card`; 81 render `Pill`; 98 render `Button`; 102 render `Button`; 105 render `Card`
- `apps/mobile/app/mail-verfassen.tsx`: 7 import `Button`; 7 import `Card`; 7 import `Pill`; 7 import `Screen`; 273 render `Screen`; 289 render `Button`; 301 render `Pill`; 310 render `Card`
- `apps/mobile/app/meldung/[id].tsx`: 4 import `Card`; 4 import `Screen`; 18 render `Screen`; 27 render `Screen`; 29 render `Card`
- `apps/mobile/app/modul/[id].tsx`: 5 import `Button`; 5 import `Card`; 5 import `InfoRow`; 5 import `Pill`; 5 import `Screen`; 26 render `Screen`; 59 render `Screen`; 62 render `Pill`; 63 render `Pill`; 64 render `Pill`; 66 render `Card`; 75 render `Card`; 84 render `Button`; 90 render `Card`; 107 render `InfoRow`; 116 render `InfoRow`; 126 render `InfoRow`; 129 render `InfoRow`; 132 render `InfoRow`; 135 render `Card`; 142 render `Card`; 147 render `Button`
- `apps/mobile/app/oidc.tsx`: 3 import `Screen`; 12 render `Screen`
- `apps/mobile/app/onboarding.tsx`: 9 import `Button`; 9 import `Mark`; 9 import `Pill`; 155 render `Mark`; 212 render `Button`; 217 render `Button`; 223 render `Button`; 300 render `Button`; 304 render `Button`; 708 render `Button`; 766 render `Pill`; 902 render `Button`; 905 render `Button`; 908 render `Button`
- `apps/mobile/app/profil/auffindbarkeit.tsx`: 4 import `Card`; 4 import `InfoRow`; 4 import `Screen`; 4 import `Section`; 20 render `Screen`; 25 render `Card`; 44 render `Section`; 47 render `Section`; 49 render `InfoRow`
- `apps/mobile/app/profil/daten.tsx`: 5 import `Card`; 5 import `InfoRow`; 5 import `Pill`; 5 import `Screen`; 5 import `Section`; 20 render `Screen`; 25 render `Section`; 30 render `Card`; 36 render `Pill`; 50 render `Section`; 51 render `Card`; 55 render `InfoRow`; 56 render `InfoRow`; 57 render `InfoRow`; 58 render `InfoRow`
- `apps/mobile/app/profil/index.tsx`: 4 import `Button`; 4 import `Card`; 4 import `InfoRow`; 4 import `Screen`; 4 import `Section`; 23 render `Screen`; 28 render `Card`; 29 render `Button`; 33 render `Section`; 35 render `InfoRow`; 41 render `InfoRow`; 47 render `InfoRow`
- `apps/mobile/app/profil/sichtbarkeit.tsx`: 5 import `Button`; 5 import `Card`; 5 import `Screen`; 5 import `Section`; 29 render `Screen`; 34 render `Card`; 35 render `Button`; 40 render `Section`; 44 render `Card`; 88 render `Section`
- `apps/mobile/app/pruefung/[id].tsx`: 4 import `Card`; 4 import `InfoRow`; 4 import `Screen`; 17 render `Screen`; 24 render `Screen`; 26 render `Card`; 35 render `InfoRow`
- `apps/mobile/app/quiz/[topic]/index.tsx`: 6 import `Card`; 6 import `Meter`; 6 import `Pill`; 6 import `Screen`; 6 import `Section`; 36 render `Screen`; 38 render `Card`; 47 render `Screen`; 121 render `Screen`; 127 render `Card`; 141 render `Meter`; 147 render `Pill`; 169 render `Meter`; 199 render `Section`; 200 render `Card`; 247 render `Section`; 248 render `Card`
- `apps/mobile/app/quiz/[topic]/run.tsx`: 6 import `Card`; 6 import `Meter`; 6 import `Pill`; 6 import `Screen`; 58 render `Screen`; 60 render `Card`; 69 render `Screen`; 187 render `Screen`; 305 render `Screen`; 311 render `Meter`; 313 render `Pill`; 314 render `Pill`; 367 render `Screen`; 378 render `Card`; 391 render `Meter`
- `apps/mobile/app/quiz/modul/[id].tsx`: 5 import `Card`; 5 import `Meter`; 5 import `Pill`; 5 import `Screen`; 5 import `Section`; 30 render `Screen`; 32 render `Card`; 41 render `Screen`; 76 render `Screen`; 79 render `Card`; 93 render `Meter`; 105 render `Section`; 132 render `Card`; 150 render `Meter`; 165 render `Pill`
- `apps/mobile/app/quiz/studio/index.tsx`: 6 import `Card`; 6 import `Pill`; 6 import `Screen`; 6 import `Section`; 43 render `Card`; 50 render `Section`; 57 render `Card`; 63 render `Card`; 82 render `Screen`; 117 render `Pill`; 119 render `Pill`; 121 render `Pill`; 123 render `Pill`; 149 render `Card`
- `apps/mobile/app/raum/[id].tsx`: 4 import `Card`; 4 import `InfoRow`; 4 import `Screen`; 18 render `Screen`; 27 render `Screen`; 29 render `Card`; 39 render `InfoRow`
- `apps/mobile/app/reihenfolge.tsx`: 4 import `Card`; 4 import `InfoRow`; 4 import `Screen`; 4 import `Section`; 17 render `Screen`; 22 render `Card`; 32 render `Section`; 36 render `InfoRow`; 49 render `Card`
- `apps/mobile/app/sicherheit.tsx`: 10 import `Button`; 10 import `Card`; 117 render `Card`; 135 render `Button`; 143 render `Card`; 160 render `Button`
- `apps/mobile/app/sprache.tsx`: 4 import `Screen`; 13 render `Screen`
- `apps/mobile/app/strukturen.tsx`: 21 import `Button`; 21 import `Card`; 21 import `InfoRow`; 21 import `Muted`; 21 import `Screen`; 21 import `Section`; 221 render `Screen`; 222 render `Card`; 223 render `Muted`; 233 render `Screen`; 234 render `Card`; 235 render `Muted`; 247 render `Screen`; 255 render `Section`; 256 render `Button`; 277 render `Section`; 303 render `Button`; 309 render `Muted`; 314 render `Muted`; 320 render `InfoRow`; 346 render `Section`; 348 render `Button`
- `apps/mobile/app/studium.tsx`: 8 import `Card`; 8 import `InfoRow`; 8 import `Meter`; 8 import `Pill`; 8 import `Screen`; 8 import `Section`; 41 render `Screen`; 45 render `Pill`; 51 render `Card`; 55 render `Meter`; 73 render `Pill`; 78 render `Section`; 80 render `InfoRow`; 100 render `Card`
- `apps/mobile/app/vpn.tsx`: 6 import `Button`; 6 import `Card`; 6 import `Pill`; 6 import `Screen`; 6 import `SearchField`; 6 import `Section`; 59 render `Screen`; 62 render `Card`; 65 render `Pill`; 79 render `Card`; 88 render `Button`; 89 render `Button`; 93 render `Button`; 94 render `Button`; 95 render `Button`; 101 render `Section`; 115 render `Card`; 118 render `Pill`; 129 render `Section`; 130 render `Card`; 145 render `Button`; 160 render `Button`; 164 render `Card`; 166 render `SearchField`; 172 render `SearchField`; 181 render `Button`; 183 render `Button`; 201 render `Section`; 211 render `Card`; 214 render `Pill`; 225 render `Section`; 226 render `Card`; 233 render `Card`; 235 render `SearchField`; 244 render `Button`; 246 render `Button`; 262 render `Section`; 263 render `Card`; 273 render `Button`; 277 render `Section`; 278 render `Card`; 282 render `Section`; 283 render `Card`; 293 render `Button`
- `apps/mobile/src/components/api-entry-detail.tsx`: 6 import `Button`; 6 import `Card`; 6 import `Muted`; 6 import `Pill`; 6 import `Section`; 25 render `Pill`; 98 render `Pill`; 102 render `Muted`; 124 render `Muted`; 166 render `Section`; 167 render `Card`; 203 render `Button`
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
- `apps/mobile/src/components/saved-credentials.tsx`: 5 import `Button`; 82 render `Button`; 84 render `Button`
- `apps/mobile/src/components/structure-row.tsx`: 4 import `Pill`; 56 render `Pill`
- `apps/mobile/src/components/study-cache-card.tsx`: 3 import `Button`; 3 import `Card`; 42 render `Card`; 55 render `Button`; 59 render `Button`; 64 render `Button`
- `apps/mobile/src/components/tutorials-list.tsx`: 4 import `InfoRow`; 4 import `Muted`; 13 render `Muted`; 23 render `InfoRow`
- `apps/mobile/src/components/web-device-login.tsx`: 9 import `Button`; 9 import `Mark`; 147 render `Button`; 185 render `Mark`
- `apps/mobile/src/components/web-sidebar.tsx`: 9 import `Mark`; 119 render `Mark`
- `apps/mobile/src/ilias/components/office-view.tsx`: 6 import `Button`; 46 render `Button`
- `apps/mobile/src/ilias/components/office-view.web.tsx`: 4 import `Button`; 54 render `Button`
- `apps/mobile/src/ilias/components/pdf-view.tsx`: 5 import `Button`; 64 render `Button`
- `apps/mobile/src/ilias/components/pdf-view.web.tsx`: 4 import `Button`; 62 render `Button`
- `apps/mobile/src/mail/components/mail-message-list.tsx`: 3 import `Card`; 66 render `Card`
- `apps/mobile/src/mail/components/mail-reader.tsx`: 8 import `Button`; 8 import `Card`; 8 import `Pill`; 129 render `Card`; 138 render `Pill`; 144 render `Button`; 157 render `Card`; 173 render `Button`; 178 render `Card`
- `apps/mobile/src/profile/profile-preview.tsx`: 3 import `Card`; 13 render `Card`; 20 render `Card`; 26 render `Card`
- `apps/mobile/src/profile/profile-summary.tsx`: 3 import `Card`; 3 import `Pill`; 12 render `Card`; 24 render `Pill`; 25 render `Pill`; 29 render `Pill`
- `apps/mobile/src/quiz/studio-link.tsx`: 5 import `Card`; 27 render `Card`
- `packages/features/ilias/src/ui/ilias-dashboard.tsx`: 4 import `Card`; 4 import `Pill`; 4 import `Section`; 65 render `Pill`; 143 render `Card`; 155 render `Section`
- `packages/features/mail/src/ui/mail-connection-panel.tsx`: 3 import `Button`; 3 import `Card`; 3 import `FieldLabel`; 3 import `Pill`; 36 render `Card`; 39 render `Pill`; 42 render `FieldLabel`; 52 render `FieldLabel`; 54 render `Button`; 59 render `Card`
- `packages/features/quiz/src/ui/components/diagram-figure.tsx`: 3 import `Card`; 3 import `Section`; 27 render `Section`; 28 render `Card`
- `packages/ui/src/index.ts`: 15 re-export `Button`; 16 re-export `Card`; 17 re-export `FieldLabel`; 18 re-export `InfoRow`; 19 re-export `Mark`; 20 re-export `Meter`; 21 re-export `Muted`; 22 re-export `Pill`; 23 re-export `Screen`; 24 re-export `SearchField`; 25 re-export `Section`; 26 re-export `Strong`; 27 re-export `listPosition`

### login-blocks

- File: `apps/mobile/src/components/login-blocks.tsx`
- Category: Shared UI
- Exports: `Checkbox` (component), `Chip` (component), `ErrorText` (component), `Field` (component), `Footer` (component), `LanguagePicker` (component), `Meta` (component), `Notice` (component), `SectionTitle` (component)
- Live preview in the app: `Checkbox`, `Chip`, `ErrorText`, `Field`, `Footer`, `LanguagePicker`, `Meta`, `Notice`, `SectionTitle`
- Usages: 25 references in 6 files

- `apps/mobile/app/login-legacy.tsx`: 24 import `Field`; 24 import `Footer`; 24 import `LanguagePicker`; 24 import `Meta`; 24 import `Notice`; 24 import `SectionTitle`; 160 render `LanguagePicker`; 179 render `SectionTitle`; 180 render `Notice`; 197 render `Footer`; 205 render `Field`; 222 render `Footer`; 225 render `SectionTitle`; 226 render `Notice`; 229 render `Meta`; 230 render `Meta`; 244 render `Footer`; 253 render `Footer`
- `apps/mobile/app/login.tsx`: 9 import `Checkbox`; 9 import `Field`; 9 import `LanguagePicker`; 78 render `LanguagePicker`; 95 render `Field`; 103 render `Field`; 111 render `Checkbox`
- `apps/mobile/src/components/campus-browser-modal.tsx`: 7 import `ErrorText`; 88 render `ErrorText`
- `apps/mobile/src/components/campus-credentials-form.tsx`: 3 import `Chip`; 3 import `Field`; 3 import `Notice`; 3 import `SectionTitle`; 50 render `SectionTitle`; 51 render `Notice`; 54 render `Field`; 61 render `Field`; 70 render `Chip`; 72 render `Chip`
- `apps/mobile/src/components/campus-headless-modal.tsx`: 9 import `ErrorText`; 104 render `ErrorText`
- `apps/mobile/src/components/web-device-login.tsx`: 8 import `LanguagePicker`; 189 render `LanguagePicker`

### control-icon

- File: `packages/ui/src/control-icon.tsx`
- Category: Shared UI
- Exports: `ControlIcon` (component), `ToolButton` (component)
- Live preview in the app: `ControlIcon`, `ToolButton`
- Usages: 14 references in 9 files

- `packages/features/ilias/src/ui/ilias-toolbar.tsx`: 3 import `ControlIcon`; 3 import `ToolButton`; 30 render `ToolButton`; 38 render `ControlIcon`
- `packages/features/mail/src/ui/attachment-list.tsx`: 3 import `ControlIcon`; 34 render `ControlIcon`
- `packages/features/mail/src/ui/mail-toolbar.tsx`: 9 import `ControlIcon`; 9 import `ToolButton`; 52 render `ToolButton`; 54 render `ToolButton`; 60 render `ControlIcon`; 78 render `ToolButton`
- `packages/features/mail/src/ui/template-sheet.tsx`: 3 import `ControlIcon`; 46 render `ControlIcon`
- `packages/features/quiz/src/ui/components/quiz-toolbar.tsx`: 3 import `ControlIcon`; 3 import `ToolButton`; 36 render `ToolButton`; 45 render `ControlIcon`; 68 render `ToolButton`
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
- `apps/mobile/app/onboarding.tsx`: 10 import `ChoiceCard`; 266 render `ChoiceCard`; 272 render `ChoiceCard`; 282 render `ChoiceCard`; 288 render `ChoiceCard`
- `apps/mobile/app/sprache.tsx`: 3 import `ChoiceCard`; 19 render `ChoiceCard`; 20 render `ChoiceCard`

### ResponsiveGrid

- File: `packages/ui/src/responsive-grid.tsx`
- Category: Shared UI
- Exports: `ResponsiveGrid` (component)
- Live preview in the app: `ResponsiveGrid`
- Usages: 10 references in 9 files

- `apps/mobile/app/(tabs)/chat.tsx`: 10 import `ResponsiveGrid`; 110 render `ResponsiveGrid`
- `apps/mobile/app/(tabs)/mehr.tsx`: 9 import `ResponsiveGrid`; 406 render `ResponsiveGrid`
- `apps/mobile/app/dokumente.tsx`: 5 import `ResponsiveGrid`; 75 render `ResponsiveGrid`; 92 render `ResponsiveGrid`
- `apps/mobile/app/feed.tsx`: 4 import `ResponsiveGrid`; 29 render `ResponsiveGrid`
- `apps/mobile/app/fristen.tsx`: 3 import `ResponsiveGrid`; 14 render `ResponsiveGrid`
- `apps/mobile/app/kommilitonen.tsx`: 5 import `ResponsiveGrid`; 43 render `ResponsiveGrid`; 58 render `ResponsiveGrid`
- `apps/mobile/app/kurse.tsx`: 10 import `ResponsiveGrid`; 274 render `ResponsiveGrid`
- `packages/features/ilias/src/ui/ilias-dashboard.tsx`: 4 import `ResponsiveGrid`; 156 render `ResponsiveGrid`
- `packages/ui/src/index.ts`: 7 re-export `ResponsiveGrid`

### OptionRows

- File: `packages/ui/src/option-rows.tsx`
- Category: Shared UI
- Exports: `OptionRows` (component)
- Live preview in the app: `OptionRows`
- Usages: 9 references in 5 files

- `apps/mobile/app/(tabs)/ilias.tsx`: 9 import `OptionRows`; 96 render `OptionRows`
- `apps/mobile/app/(tabs)/mail.tsx`: 7 import `OptionRows`; 82 render `OptionRows`; 95 render `OptionRows`; 106 render `OptionRows`; 108 render `OptionRows`
- `apps/mobile/app/(tabs)/quiz.tsx`: 8 import `OptionRows`; 249 render `OptionRows`; 268 render `OptionRows`; 394 render `OptionRows`
- `packages/ui/src/dropdown-picker.tsx`: 8 import `OptionRows`; 44 render `OptionRows`
- `packages/ui/src/index.ts`: 5 re-export `OptionRows`

### toast

- File: `packages/ui/src/toast.tsx`
- Category: Shared UI
- Exports: `ToastHost` (component), `showToast` (helper)
- Live preview in the app: `showToast`
- Usages: 6 references in 7 files

- `apps/mobile/app/_layout.tsx`: 13 import `ToastHost`; 52 render `ToastHost`
- `apps/mobile/app/ilias/[refId].tsx`: 7 import `showToast`; 154 call `showToast`
- `apps/mobile/app/ilias/datei.tsx`: 6 import `showToast`; 54 call `showToast`
- `apps/mobile/app/kurse.tsx`: 10 import `showToast`; 99 call `showToast`
- `apps/mobile/app/mail-verfassen.tsx`: 7 import `showToast`; 250 call `showToast`
- `apps/mobile/app/onboarding.tsx`: 9 import `showToast`; 67 call `showToast`
- `packages/ui/src/index.ts`: 8 re-export `showToast`; 8 re-export `ToastHost`

### DrawerPanel

- File: `packages/ui/src/drawer-panel.tsx`
- Category: Shared UI
- Exports: `DrawerPanel` (component)
- Live preview in the app: `DrawerPanel`
- Usages: 5 references in 4 files

- `apps/mobile/app/(tabs)/ilias.tsx`: 8 import `DrawerPanel`; 193 render `DrawerPanel`
- `apps/mobile/app/(tabs)/mail.tsx`: 7 import `DrawerPanel`; 78 render `DrawerPanel`; 94 render `DrawerPanel`
- `apps/mobile/app/(tabs)/quiz.tsx`: 7 import `DrawerPanel`; 424 render `DrawerPanel`; 442 render `DrawerPanel`
- `packages/ui/src/index.ts`: 2 re-export `DrawerPanel`

### JsonTree

- File: `packages/ui/src/json-tree.tsx`
- Category: Shared UI
- Exports: `JsonTree` (component)
- Live preview in the app: `JsonTree`
- Usages: 5 references in 5 files

- `apps/mobile/app/dev/nfc.tsx`: 5 import `JsonTree`; 118 render `JsonTree`
- `apps/mobile/app/dev/onboarding.tsx`: 5 import `JsonTree`; 126 render `JsonTree`
- `apps/mobile/app/dev/state.tsx`: 6 import `JsonTree`; 78 render `JsonTree`
- `apps/mobile/src/components/api-entry-detail.tsx`: 6 import `JsonTree`; 73 render `JsonTree`; 83 render `JsonTree`
- `packages/ui/src/index.ts`: 4 re-export `JsonTree`

### SigningIn

- File: `apps/mobile/src/components/signing-in.tsx`
- Category: Shared UI
- Exports: `SigningIn` (component)
- Live preview in the app: `SigningIn`
- Usages: 5 references in 4 files

- `apps/mobile/app/login-legacy.tsx`: 25 import `SigningIn`; 188 render `SigningIn`; 236 render `SigningIn`
- `apps/mobile/app/login.tsx`: 11 import `SigningIn`; 135 render `SigningIn`
- `apps/mobile/src/components/campus-browser-modal.tsx`: 8 import `SigningIn`; 77 render `SigningIn`
- `apps/mobile/src/components/campus-headless-modal.tsx`: 10 import `SigningIn`; 93 render `SigningIn`

### StudySelector

- File: `apps/mobile/src/components/study-selector.tsx`
- Category: Shared UI
- Exports: `StudySelector` (component)
- Usages: 3 references in 3 files

- `apps/mobile/app/(tabs)/mehr.tsx`: 11 import `StudySelector`; 279 render `StudySelector`
- `apps/mobile/app/kurse.tsx`: 12 import `StudySelector`; 173 render `StudySelector`
- `apps/mobile/src/components/campus-info-view.tsx`: 14 import `StudySelector`; 170 render `StudySelector`

### CampusBrowserModal

- File: `apps/mobile/src/components/campus-browser-modal.tsx`
- Category: Shared UI
- Exports: `CampusBrowserModal` (component)
- Usages: 2 references in 2 files

- `apps/mobile/app/login-legacy.tsx`: 20 import `CampusBrowserModal`; 257 render `CampusBrowserModal`
- `apps/mobile/app/login.tsx`: 7 import `CampusBrowserModal`; 147 render `CampusBrowserModal`

### CampusHeadlessModal

- File: `apps/mobile/src/components/campus-headless-modal.tsx`
- Category: Shared UI
- Exports: `CampusHeadlessModal` (component)
- Usages: 2 references in 2 files

- `apps/mobile/app/login-legacy.tsx`: 22 import `CampusHeadlessModal`; 272 render `CampusHeadlessModal`
- `apps/mobile/app/login.tsx`: 8 import `CampusHeadlessModal`; 162 render `CampusHeadlessModal`

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
- `packages/ui/src/index.ts`: 6 re-export `PaneModeProvider`; 6 re-export `usePaneMode`
- `packages/ui/src/ui.tsx`: 7 import `usePaneMode`; 99 call `usePaneMode`

### SavedCredentialPanel

- File: `apps/mobile/src/components/saved-credentials.tsx`
- Category: Shared UI
- Exports: `SavedCredentialPanel` (component)
- Usages: 2 references in 2 files

- `apps/mobile/app/login.tsx`: 10 import `SavedCredentialPanel`; 127 render `SavedCredentialPanel`
- `apps/mobile/app/sicherheit.tsx`: 9 import `SavedCredentialPanel`; 148 render `SavedCredentialPanel`

### structure-row

- File: `apps/mobile/src/components/structure-row.tsx`
- Category: Shared UI
- Exports: `StructureRow` (component), `TreeChildren` (component)
- Live preview in the app: `StructureRow`, `TreeChildren`
- Usages: 2 references in 1 file

- `apps/mobile/src/components/curriculum-tree.tsx`: 4 import `StructureRow`; 4 import `TreeChildren`; 46 render `StructureRow`; 60 render `TreeChildren`

### AmbientBackground

- File: `packages/ui/src/ambient-background.tsx`
- Category: Shared UI
- Exports: `AmbientBackground` (component)
- Usages: 1 reference in 1 file

- `packages/ui/src/ui.tsx`: 6 import `AmbientBackground`; 125 render `AmbientBackground`

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

- `apps/mobile/app/_layout.tsx`: 12 import `AppLock`; 232 render `AppLock`

### CalendarHero

- File: `apps/mobile/src/components/calendar-hero.tsx`
- Category: Shared UI
- Exports: `CalendarHero` (component)
- Live preview in the app: `CalendarHero`
- Usages: 1 reference in 1 file

- `apps/mobile/app/(tabs)/index.tsx`: 4 import `CalendarHero`; 27 render `CalendarHero`

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

### design-mode

- File: `packages/ui/src/design-mode.tsx`
- Category: Shared UI
- Exports: `DesignModeProvider` (component), `useDesignMode` (hook)
- Usages: 1 reference in 1 file

- `packages/ui/src/ambient-background.tsx`: 4 import `useDesignMode`; 18 call `useDesignMode`

### DeviceQr

- File: `apps/mobile/src/components/device-qr.tsx`
- Platform files: `apps/mobile/src/components/device-qr.tsx` (native), `apps/mobile/src/components/device-qr.web.tsx` (web)
- Category: Shared UI
- Exports: `DeviceQr` (component)
- Live preview in the app: `DeviceQr`
- Usages: 1 reference in 1 file

- `apps/mobile/src/components/web-device-login.tsx`: 7 import `DeviceQr`; 105 render `DeviceQr`

### DropdownPicker

- File: `packages/ui/src/dropdown-picker.tsx`
- Category: Shared UI
- Exports: `DropdownPicker` (component)
- Live preview in the app: `DropdownPicker`
- Usages: 1 reference in 2 files

- `packages/features/mail/src/ui/mail-toolbar.tsx`: 9 import `DropdownPicker`; 76 render `DropdownPicker`
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

- `apps/mobile/app/login.tsx`: 13 import `WebDeviceLogin`; 27 render `WebDeviceLogin`

### WebHead

- File: `apps/mobile/src/components/web-head.tsx`
- Category: Shared UI
- Exports: `WebHead` (component)
- Usages: 1 reference in 1 file

- `apps/mobile/app/_layout.tsx`: 14 import `WebHead`; 205 render `WebHead`

### WebSidebar

- File: `apps/mobile/src/components/web-sidebar.tsx`
- Category: Shared UI
- Exports: `WebSidebar` (component)
- Usages: 1 reference in 1 file

- `apps/mobile/app/_layout.tsx`: 15 import `WebSidebar`; 208 render `WebSidebar`

## Feature components

| Component | File | Platform | Preview | Exports | Usages | Files |
| --- | --- | --- | --- | --- | ---: | ---: |
| `QuizButton` | `packages/features/quiz/src/ui/components/quiz-button.tsx` | Native + Web | QuizButton | QuizButton | 9 | 4 |
| `controls` | `packages/features/articulation/src/ui/controls.tsx` | Native + Web | – | AngleRow, AxesToggle, PlayButton, SpeedRow, ViewToggle, SPEEDS, formatAngle, formatSpeed | 6 | 1 |
| `mail-skeletons` | `packages/features/mail/src/ui/mail-skeletons.tsx` | Native + Web | MailListSkeleton, ToolbarSkeleton | MailListSkeleton, MailReveal, ToolbarReveal, ToolbarSkeleton | 4 | 3 |
| `OptionRow` | `packages/features/quiz/src/ui/components/option-row.tsx` | Native + Web | OptionRow | OptionRow | 4 | 4 |
| `ProfileSummary` | `apps/mobile/src/profile/profile-summary.tsx` | Native + Web | ProfileSummary | ProfileSummary | 4 | 4 |
| `diagram` | `packages/features/quiz/src/ui/components/diagram.tsx` | Native + Web | – | DiagramCanvas, DiagramView, diagramAspect, diagramTone | 3 | 3 |
| `RecipientField` | `packages/features/mail/src/ui/recipient-field.tsx` | Native + Web | – | RecipientField | 3 | 2 |
| `ContactBadge` | `packages/features/mail/src/ui/contact-badge.tsx` | Native + Web | ContactBadge | ContactBadge | 2 | 2 |
| `ilias-dashboard` | `packages/features/ilias/src/ui/ilias-dashboard.tsx` | Native + Web | – | IliasDashboardView, iliasFilterLabel | 2 | 2 |
| `MailMessageList` | `apps/mobile/src/mail/components/mail-message-list.tsx` | Native + Web | – | MailMessageList | 2 | 1 |
| `MailReader` | `apps/mobile/src/mail/components/mail-reader.tsx` | Native + Web | – | MailReader | 2 | 2 |
| `MemberAvatar` | `apps/mobile/src/ilias/components/member-avatar.tsx` | Native + Web | MemberAvatar | MemberAvatar | 2 | 2 |
| `PoseArt` | `packages/features/articulation/src/ui/pose-art.tsx` | Native + Web | – | PoseArt | 2 | 1 |
| `ProfilePreview` | `apps/mobile/src/profile/profile-preview.tsx` | Native + Web | ProfilePreview | ProfilePreview | 2 | 2 |
| `StudioLinkCard` | `apps/mobile/src/quiz/studio-link.tsx` | Native + Web | – | StudioLinkCard | 2 | 2 |
| `ArticulationFigure` | `packages/features/articulation/src/ui/figure-2d.tsx` | Native + Web | – | ArticulationFigure | 1 | 1 |
| `ArticulationFigure3D` | `packages/features/articulation/src/ui/figure-3d.tsx` | Native + Web | – | ArticulationFigure3D | 1 | 1 |
| `AttachmentList` | `packages/features/mail/src/ui/attachment-list.tsx` | Native + Web | AttachmentList | AttachmentList | 1 | 2 |
| `ClozeView` | `packages/features/quiz/src/ui/components/cloze.tsx` | Native + Web | ClozeView | ClozeView | 1 | 2 |
| `DiagramFigureCard` | `packages/features/quiz/src/ui/components/diagram-figure.tsx` | Native + Web | – | DiagramFigureCard | 1 | 2 |
| `FlashcardView` | `packages/features/quiz/src/ui/components/flashcard.tsx` | Native + Web | FlashcardView | FlashcardView | 1 | 2 |
| `FreeTextView` | `packages/features/quiz/src/ui/components/free-text.tsx` | Native + Web | – | FreeTextView | 1 | 2 |
| `IliasOfficeView` | `apps/mobile/src/ilias/components/office-view.tsx` | Native + Web (split) | – | IliasOfficeView | 1 | 1 |
| `IliasPdfView` | `apps/mobile/src/ilias/components/pdf-view.tsx` | Native + Web (split) | – | IliasPdfView | 1 | 1 |
| `IliasToolbar` | `packages/features/ilias/src/ui/ilias-toolbar.tsx` | Native + Web | – | IliasToolbar | 1 | 2 |
| `MailComposeActions` | `packages/features/mail/src/ui/compose-actions.tsx` | Native + Web | – | MailComposeActions | 1 | 2 |
| `MailConnectionPanel` | `packages/features/mail/src/ui/mail-connection-panel.tsx` | Native + Web | – | MailConnectionPanel | 1 | 2 |
| `MailRow` | `packages/features/mail/src/ui/mail-row.tsx` | Native + Web | MailRow | MailRow | 1 | 2 |
| `MailToolbar` | `packages/features/mail/src/ui/mail-toolbar.tsx` | Native + Web | – | MailToolbar | 1 | 2 |
| `MapView` | `packages/features/quiz/src/ui/components/map.tsx` | Native + Web | – | MapView | 1 | 2 |
| `MatchingView` | `packages/features/quiz/src/ui/components/matching.tsx` | Native + Web | – | MatchingView | 1 | 2 |
| `MultipleChoiceView` | `packages/features/quiz/src/ui/components/multiple-choice.tsx` | Native + Web | – | MultipleChoiceView | 1 | 2 |
| `OrderingView` | `packages/features/quiz/src/ui/components/ordering.tsx` | Native + Web | – | OrderingView | 1 | 2 |
| `PhaseStrip` | `packages/features/articulation/src/ui/phase-strip.tsx` | Native + Web | – | PhaseStrip | 1 | 1 |
| `QuestionFeedback` | `packages/features/quiz/src/ui/components/question-feedback.tsx` | Native + Web | QuestionFeedback | QuestionFeedback | 1 | 2 |
| `QuestionView` | `packages/features/quiz/src/ui/components/question-view.tsx` | Native + Web | – | QuestionView | 1 | 2 |
| `QuizToolbar` | `packages/features/quiz/src/ui/components/quiz-toolbar.tsx` | Native + Web | QuizToolbar | QuizToolbar | 1 | 2 |
| `SingleChoiceView` | `packages/features/quiz/src/ui/components/single-choice.tsx` | Native + Web | SingleChoiceView | SingleChoiceView | 1 | 2 |
| `TemplateSheet` | `packages/features/mail/src/ui/template-sheet.tsx` | Native + Web | – | TemplateSheet | 1 | 2 |
| `TrueFalseView` | `packages/features/quiz/src/ui/components/true-false.tsx` | Native + Web | TrueFalseView | TrueFalseView | 1 | 2 |
| `ArticulationPlayer` | `packages/features/articulation/src/ui/player.tsx` | Native + Web | – | ArticulationPlayer | 0 | 0 |

### QuizButton

- File: `packages/features/quiz/src/ui/components/quiz-button.tsx`
- Category: Feature components
- Exports: `QuizButton` (component)
- Live preview in the app: `QuizButton`
- Usages: 9 references in 4 files

- `apps/mobile/app/quiz/[topic]/index.tsx`: 12 import `QuizButton`; 175 render `QuizButton`; 179 render `QuizButton`; 238 render `QuizButton`
- `apps/mobile/app/quiz/[topic]/run.tsx`: 10 import `QuizButton`; 192 render `QuizButton`; 293 render `QuizButton`; 300 render `QuizButton`; 373 render `QuizButton`; 374 render `QuizButton`
- `apps/mobile/app/quiz/studio/index.tsx`: 7 import `QuizButton`; 71 render `QuizButton`
- `packages/features/quiz/src/ui.ts`: 13 re-export `QuizButton`

### controls

- File: `packages/features/articulation/src/ui/controls.tsx`
- Category: Feature components
- Exports: `AngleRow` (component), `AxesToggle` (component), `PlayButton` (component), `SpeedRow` (component), `ViewToggle` (component), `SPEEDS` (constant), `formatAngle` (helper), `formatSpeed` (helper)
- Usages: 6 references in 1 file

- `packages/features/articulation/src/ui/player.tsx`: 10 import `AngleRow`; 10 import `AxesToggle`; 10 import `formatAngle`; 10 import `PlayButton`; 10 import `SpeedRow`; 10 import `ViewToggle`; 130 render `PlayButton`; 133 render `AxesToggle`; 135 render `ViewToggle`; 138 render `SpeedRow`; 141 render `AngleRow`; 145 call `formatAngle`

### mail-skeletons

- File: `packages/features/mail/src/ui/mail-skeletons.tsx`
- Category: Feature components
- Exports: `MailListSkeleton` (component), `MailReveal` (component), `ToolbarReveal` (component), `ToolbarSkeleton` (component)
- Live preview in the app: `MailListSkeleton`, `ToolbarSkeleton`
- Usages: 4 references in 3 files

- `apps/mobile/app/(tabs)/mail.tsx`: 8 import `MailReveal`; 122 render `MailReveal`; 191 render `MailReveal`
- `packages/features/mail/src/ui.ts`: 9 re-export `ToolbarReveal`; 10 re-export `MailListSkeleton`; 11 re-export `ToolbarSkeleton`; 13 re-export `MailReveal`
- `packages/features/mail/src/ui/mail-toolbar.tsx`: 10 import `ToolbarReveal`; 10 import `ToolbarSkeleton`; 56 render `ToolbarSkeleton`; 58 render `ToolbarReveal`

### OptionRow

- File: `packages/features/quiz/src/ui/components/option-row.tsx`
- Category: Feature components
- Exports: `OptionRow` (component)
- Live preview in the app: `OptionRow`
- Usages: 4 references in 4 files

- `packages/features/quiz/src/ui.ts`: 9 re-export `OptionRow`
- `packages/features/quiz/src/ui/components/multiple-choice.tsx`: 9 import `OptionRow`; 32 render `OptionRow`
- `packages/features/quiz/src/ui/components/single-choice.tsx`: 9 import `OptionRow`; 30 render `OptionRow`
- `packages/features/quiz/src/ui/components/true-false.tsx`: 7 import `OptionRow`; 24 render `OptionRow`; 32 render `OptionRow`

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

- File: `packages/features/quiz/src/ui/components/diagram.tsx`
- Category: Feature components
- Exports: `DiagramCanvas` (component), `DiagramView` (component), `diagramAspect` (helper), `diagramTone` (helper)
- Usages: 3 references in 3 files

- `packages/features/quiz/src/ui.ts`: 3 re-export `DiagramCanvas`; 3 re-export `DiagramView`
- `packages/features/quiz/src/ui/components/diagram-figure.tsx`: 9 import `diagramAspect`; 9 import `DiagramCanvas`; 29 call `diagramAspect`; 30 render `DiagramCanvas`
- `packages/features/quiz/src/ui/components/question-view.tsx`: 5 import `DiagramView`; 120 render `DiagramView`

### RecipientField

- File: `packages/features/mail/src/ui/recipient-field.tsx`
- Category: Feature components
- Exports: `RecipientField` (component)
- Usages: 3 references in 2 files

- `apps/mobile/app/mail-verfassen.tsx`: 16 import `RecipientField`; 311 render `RecipientField`; 339 render `RecipientField`; 349 render `RecipientField`
- `packages/features/mail/src/ui.ts`: 5 re-export `RecipientField`

### ContactBadge

- File: `packages/features/mail/src/ui/contact-badge.tsx`
- Category: Feature components
- Exports: `ContactBadge` (component)
- Live preview in the app: `ContactBadge`
- Usages: 2 references in 2 files

- `packages/features/mail/src/ui.ts`: 3 re-export `ContactBadge`
- `packages/features/mail/src/ui/recipient-field.tsx`: 10 import `ContactBadge`; 172 render `ContactBadge`; 196 render `ContactBadge`

### ilias-dashboard

- File: `packages/features/ilias/src/ui/ilias-dashboard.tsx`
- Category: Feature components
- Exports: `IliasDashboardView` (component), `iliasFilterLabel` (helper)
- Usages: 2 references in 2 files

- `apps/mobile/app/(tabs)/ilias.tsx`: 10 import `IliasDashboardView`; 10 import `iliasFilterLabel`; 57 call `iliasFilterLabel`; 132 render `IliasDashboardView`
- `packages/features/ilias/src/ui.ts`: 1 re-export `IliasDashboardView`; 1 re-export `iliasFilterLabel`

### MailMessageList

- File: `apps/mobile/src/mail/components/mail-message-list.tsx`
- Category: Feature components
- Exports: `MailMessageList` (component)
- Usages: 2 references in 1 file

- `apps/mobile/app/(tabs)/mail.tsx`: 9 import `MailMessageList`; 125 render `MailMessageList`; 194 render `MailMessageList`

### MailReader

- File: `apps/mobile/src/mail/components/mail-reader.tsx`
- Category: Feature components
- Exports: `MailReader` (component)
- Usages: 2 references in 2 files

- `apps/mobile/app/(tabs)/mail.tsx`: 10 import `MailReader`; 142 render `MailReader`
- `apps/mobile/app/mail-nachricht.tsx`: 4 import `MailReader`; 23 render `MailReader`

### MemberAvatar

- File: `apps/mobile/src/ilias/components/member-avatar.tsx`
- Category: Feature components
- Exports: `MemberAvatar` (component)
- Live preview in the app: `MemberAvatar`
- Usages: 2 references in 2 files

- `apps/mobile/app/ilias/[refId].tsx`: 10 import `MemberAvatar`; 69 render `MemberAvatar`
- `apps/mobile/app/ilias/mitglied.tsx`: 8 import `MemberAvatar`; 82 render `MemberAvatar`

### PoseArt

- File: `packages/features/articulation/src/ui/pose-art.tsx`
- Category: Feature components
- Exports: `PoseArt` (component)
- Usages: 2 references in 1 file

- `packages/features/articulation/src/ui/figure-2d.tsx`: 21 import `PoseArt`; 106 render `PoseArt`; 109 render `PoseArt`

### ProfilePreview

- File: `apps/mobile/src/profile/profile-preview.tsx`
- Category: Feature components
- Exports: `ProfilePreview` (component)
- Live preview in the app: `ProfilePreview`
- Usages: 2 references in 2 files

- `apps/mobile/app/profil/auffindbarkeit.tsx`: 6 import `ProfilePreview`; 45 render `ProfilePreview`
- `apps/mobile/app/profil/sichtbarkeit.tsx`: 7 import `ProfilePreview`; 89 render `ProfilePreview`

### StudioLinkCard

- File: `apps/mobile/src/quiz/studio-link.tsx`
- Category: Feature components
- Exports: `StudioLinkCard` (component)
- Usages: 2 references in 2 files

- `apps/mobile/app/(tabs)/quiz.tsx`: 20 import `StudioLinkCard`; 330 render `StudioLinkCard`
- `apps/mobile/app/quiz/[topic]/index.tsx`: 9 import `StudioLinkCard`; 191 render `StudioLinkCard`

### ArticulationFigure

- File: `packages/features/articulation/src/ui/figure-2d.tsx`
- Category: Feature components
- Exports: `ArticulationFigure` (component)
- Usages: 1 reference in 1 file

- `packages/features/articulation/src/ui/player.tsx`: 11 import `ArticulationFigure`; 113 render `ArticulationFigure`

### ArticulationFigure3D

- File: `packages/features/articulation/src/ui/figure-3d.tsx`
- Category: Feature components
- Exports: `ArticulationFigure3D` (component)
- Usages: 1 reference in 1 file

- `packages/features/articulation/src/ui/player.tsx`: 12 import `ArticulationFigure3D`; 103 render `ArticulationFigure3D`

### AttachmentList

- File: `packages/features/mail/src/ui/attachment-list.tsx`
- Category: Feature components
- Exports: `AttachmentList` (component)
- Live preview in the app: `AttachmentList`
- Usages: 1 reference in 2 files

- `apps/mobile/app/mail-verfassen.tsx`: 16 import `AttachmentList`; 415 render `AttachmentList`
- `packages/features/mail/src/ui.ts`: 2 re-export `AttachmentList`

### ClozeView

- File: `packages/features/quiz/src/ui/components/cloze.tsx`
- Category: Feature components
- Exports: `ClozeView` (component)
- Live preview in the app: `ClozeView`
- Usages: 1 reference in 2 files

- `packages/features/quiz/src/ui.ts`: 1 re-export `ClozeView`
- `packages/features/quiz/src/ui/components/question-view.tsx`: 4 import `ClozeView`; 100 render `ClozeView`

### DiagramFigureCard

- File: `packages/features/quiz/src/ui/components/diagram-figure.tsx`
- Category: Feature components
- Exports: `DiagramFigureCard` (component)
- Usages: 1 reference in 2 files

- `apps/mobile/app/quiz/[topic]/index.tsx`: 12 import `DiagramFigureCard`; 188 render `DiagramFigureCard`
- `packages/features/quiz/src/ui.ts`: 2 re-export `DiagramFigureCard`

### FlashcardView

- File: `packages/features/quiz/src/ui/components/flashcard.tsx`
- Category: Feature components
- Exports: `FlashcardView` (component)
- Live preview in the app: `FlashcardView`
- Usages: 1 reference in 2 files

- `packages/features/quiz/src/ui.ts`: 4 re-export `FlashcardView`
- `packages/features/quiz/src/ui/components/question-view.tsx`: 6 import `FlashcardView`; 130 render `FlashcardView`

### FreeTextView

- File: `packages/features/quiz/src/ui/components/free-text.tsx`
- Category: Feature components
- Exports: `FreeTextView` (component)
- Usages: 1 reference in 2 files

- `packages/features/quiz/src/ui.ts`: 5 re-export `FreeTextView`
- `packages/features/quiz/src/ui/components/question-view.tsx`: 7 import `FreeTextView`; 69 render `FreeTextView`

### IliasOfficeView

- File: `apps/mobile/src/ilias/components/office-view.tsx`
- Platform files: `apps/mobile/src/ilias/components/office-view.tsx` (native), `apps/mobile/src/ilias/components/office-view.web.tsx` (web)
- Category: Feature components
- Exports: `IliasOfficeView` (component)
- Usages: 1 reference in 1 file

- `apps/mobile/app/ilias/datei.tsx`: 7 import `IliasOfficeView`; 111 render `IliasOfficeView`

### IliasPdfView

- File: `apps/mobile/src/ilias/components/pdf-view.tsx`
- Platform files: `apps/mobile/src/ilias/components/pdf-view.tsx` (native), `apps/mobile/src/ilias/components/pdf-view.web.tsx` (web)
- Category: Feature components
- Exports: `IliasPdfView` (component)
- Usages: 1 reference in 1 file

- `apps/mobile/app/ilias/datei.tsx`: 8 import `IliasPdfView`; 113 render `IliasPdfView`

### IliasToolbar

- File: `packages/features/ilias/src/ui/ilias-toolbar.tsx`
- Category: Feature components
- Exports: `IliasToolbar` (component)
- Usages: 1 reference in 2 files

- `apps/mobile/app/(tabs)/ilias.tsx`: 11 import `IliasToolbar`; 66 render `IliasToolbar`
- `packages/features/ilias/src/ui.ts`: 2 re-export `IliasToolbar`

### MailComposeActions

- File: `packages/features/mail/src/ui/compose-actions.tsx`
- Category: Feature components
- Exports: `MailComposeActions` (component)
- Usages: 1 reference in 2 files

- `apps/mobile/src/mail/components/mail-reader.tsx`: 14 import `MailComposeActions`; 141 render `MailComposeActions`
- `packages/features/mail/src/ui.ts`: 12 re-export `MailComposeActions`

### MailConnectionPanel

- File: `packages/features/mail/src/ui/mail-connection-panel.tsx`
- Category: Feature components
- Exports: `MailConnectionPanel` (component)
- Usages: 1 reference in 2 files

- `apps/mobile/app/(tabs)/mail.tsx`: 8 import `MailConnectionPanel`; 177 render `MailConnectionPanel`
- `packages/features/mail/src/ui.ts`: 4 re-export `MailConnectionPanel`

### MailRow

- File: `packages/features/mail/src/ui/mail-row.tsx`
- Category: Feature components
- Exports: `MailRow` (component)
- Live preview in the app: `MailRow`
- Usages: 1 reference in 2 files

- `apps/mobile/src/mail/components/mail-message-list.tsx`: 9 import `MailRow`; 54 render `MailRow`
- `packages/features/mail/src/ui.ts`: 7 re-export `MailRow`

### MailToolbar

- File: `packages/features/mail/src/ui/mail-toolbar.tsx`
- Category: Feature components
- Exports: `MailToolbar` (component)
- Usages: 1 reference in 2 files

- `apps/mobile/app/(tabs)/mail.tsx`: 8 import `MailToolbar`; 51 render `MailToolbar`
- `packages/features/mail/src/ui.ts`: 8 re-export `MailToolbar`

### MapView

- File: `packages/features/quiz/src/ui/components/map.tsx`
- Category: Feature components
- Exports: `MapView` (component)
- Usages: 1 reference in 2 files

- `packages/features/quiz/src/ui.ts`: 6 re-export `MapView`
- `packages/features/quiz/src/ui/components/question-view.tsx`: 8 import `MapView`; 110 render `MapView`

### MatchingView

- File: `packages/features/quiz/src/ui/components/matching.tsx`
- Category: Feature components
- Exports: `MatchingView` (component)
- Usages: 1 reference in 2 files

- `packages/features/quiz/src/ui.ts`: 7 re-export `MatchingView`
- `packages/features/quiz/src/ui/components/question-view.tsx`: 9 import `MatchingView`; 80 render `MatchingView`

### MultipleChoiceView

- File: `packages/features/quiz/src/ui/components/multiple-choice.tsx`
- Category: Feature components
- Exports: `MultipleChoiceView` (component)
- Usages: 1 reference in 2 files

- `packages/features/quiz/src/ui.ts`: 8 re-export `MultipleChoiceView`
- `packages/features/quiz/src/ui/components/question-view.tsx`: 10 import `MultipleChoiceView`; 49 render `MultipleChoiceView`

### OrderingView

- File: `packages/features/quiz/src/ui/components/ordering.tsx`
- Category: Feature components
- Exports: `OrderingView` (component)
- Usages: 1 reference in 2 files

- `packages/features/quiz/src/ui.ts`: 10 re-export `OrderingView`
- `packages/features/quiz/src/ui/components/question-view.tsx`: 11 import `OrderingView`; 90 render `OrderingView`

### PhaseStrip

- File: `packages/features/articulation/src/ui/phase-strip.tsx`
- Category: Feature components
- Exports: `PhaseStrip` (component)
- Usages: 1 reference in 1 file

- `packages/features/articulation/src/ui/player.tsx`: 13 import `PhaseStrip`; 116 render `PhaseStrip`

### QuestionFeedback

- File: `packages/features/quiz/src/ui/components/question-feedback.tsx`
- Category: Feature components
- Exports: `QuestionFeedback` (component)
- Live preview in the app: `QuestionFeedback`
- Usages: 1 reference in 2 files

- `apps/mobile/app/quiz/[topic]/run.tsx`: 10 import `QuestionFeedback`; 335 render `QuestionFeedback`
- `packages/features/quiz/src/ui.ts`: 11 re-export `QuestionFeedback`

### QuestionView

- File: `packages/features/quiz/src/ui/components/question-view.tsx`
- Category: Feature components
- Exports: `QuestionView` (component)
- Usages: 1 reference in 2 files

- `apps/mobile/app/quiz/[topic]/run.tsx`: 10 import `QuestionView`; 326 render `QuestionView`
- `packages/features/quiz/src/ui.ts`: 12 re-export `QuestionView`

### QuizToolbar

- File: `packages/features/quiz/src/ui/components/quiz-toolbar.tsx`
- Category: Feature components
- Exports: `QuizToolbar` (component)
- Live preview in the app: `QuizToolbar`
- Usages: 1 reference in 2 files

- `apps/mobile/app/(tabs)/quiz.tsx`: 19 import `QuizToolbar`; 235 render `QuizToolbar`
- `packages/features/quiz/src/ui.ts`: 14 re-export `QuizToolbar`

### SingleChoiceView

- File: `packages/features/quiz/src/ui/components/single-choice.tsx`
- Category: Feature components
- Exports: `SingleChoiceView` (component)
- Live preview in the app: `SingleChoiceView`
- Usages: 1 reference in 2 files

- `packages/features/quiz/src/ui.ts`: 15 re-export `SingleChoiceView`
- `packages/features/quiz/src/ui/components/question-view.tsx`: 12 import `SingleChoiceView`; 39 render `SingleChoiceView`

### TemplateSheet

- File: `packages/features/mail/src/ui/template-sheet.tsx`
- Category: Feature components
- Exports: `TemplateSheet` (component)
- Usages: 1 reference in 2 files

- `apps/mobile/app/mail-verfassen.tsx`: 16 import `TemplateSheet`; 429 render `TemplateSheet`
- `packages/features/mail/src/ui.ts`: 6 re-export `TemplateSheet`

### TrueFalseView

- File: `packages/features/quiz/src/ui/components/true-false.tsx`
- Category: Feature components
- Exports: `TrueFalseView` (component)
- Live preview in the app: `TrueFalseView`
- Usages: 1 reference in 2 files

- `packages/features/quiz/src/ui.ts`: 16 re-export `TrueFalseView`
- `packages/features/quiz/src/ui/components/question-view.tsx`: 13 import `TrueFalseView`; 59 render `TrueFalseView`

### ArticulationPlayer

- File: `packages/features/articulation/src/ui/player.tsx`
- Category: Feature components
- Exports: `ArticulationPlayer` (component)
- Usages: 0 references in 0 files
- **Unused:** no import or reference was found.

_No occurrences found._

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

- `apps/mobile/app/_layout.tsx`: 19 import `OnboardingProvider`; 19 import `useOnboarding`; 44 render `OnboardingProvider`; 82 call `useOnboarding`
- `apps/mobile/app/dev/onboarding.tsx`: 9 import `ONBOARDING_STORAGE_KEY`; 10 import `readStoredOnboardingPreferences`; 11 import `useOnboarding`; 38 call `useOnboarding`; 43 call `readStoredOnboardingPreferences`; 97 reference `ONBOARDING_STORAGE_KEY`
- `apps/mobile/app/geraet-verknuepfen.tsx`: 16 import `useOnboarding`; 54 call `useOnboarding`
- `apps/mobile/app/onboarding.tsx`: 12 import `useOnboarding`; 41 call `useOnboarding`
- `apps/mobile/app/sicherheit.tsx`: 12 import `useOnboarding`; 35 call `useOnboarding`

### progress

- File: `apps/mobile/src/quiz/progress.tsx`
- Category: App-wide providers
- Exports: `QuizProgressProvider` (component), `useQuizProgress` (hook), `QUIZ_PROGRESS_STORAGE_KEY` (constant)
- Usages: 6 references in 5 files

- `apps/mobile/app/_layout.tsx`: 21 import `QuizProgressProvider`; 47 render `QuizProgressProvider`
- `apps/mobile/app/(tabs)/quiz.tsx`: 22 import `useQuizProgress`; 107 call `useQuizProgress`
- `apps/mobile/app/quiz/[topic]/index.tsx`: 14 import `useQuizProgress`; 30 call `useQuizProgress`
- `apps/mobile/app/quiz/[topic]/run.tsx`: 11 import `useQuizProgress`; 50 call `useQuizProgress`; 102 call `useQuizProgress`
- `apps/mobile/app/quiz/modul/[id].tsx`: 8 import `useQuizProgress`; 25 call `useQuizProgress`

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

- `apps/mobile/app/_layout.tsx`: 17 import `IliasAutoConnect`; 43 render `IliasAutoConnect`

### IliasHeadlessProvider

- File: `apps/mobile/src/ilias/ilias-headless-provider.tsx`
- Category: App-wide providers
- Exports: `IliasHeadlessProvider` (component)
- Usages: 1 reference in 1 file

- `apps/mobile/app/_layout.tsx`: 18 import `IliasHeadlessProvider`; 41 render `IliasHeadlessProvider`

### QueryProvider

- File: `apps/mobile/src/query/client.tsx`
- Category: App-wide providers
- Exports: `QueryProvider` (component)
- Usages: 1 reference in 1 file

- `apps/mobile/app/_layout.tsx`: 22 import `QueryProvider`; 45 render `QueryProvider`

### QuizCatalogProvider

- File: `apps/mobile/src/quiz/catalog-provider.tsx`
- Category: App-wide providers
- Exports: `QuizCatalogProvider` (component)
- Usages: 1 reference in 1 file

- `apps/mobile/app/_layout.tsx`: 20 import `QuizCatalogProvider`; 48 render `QuizCatalogProvider`

### SessionRefresh

- File: `apps/mobile/src/auth/session-refresh.tsx`
- Category: App-wide providers
- Exports: `SessionRefresh` (component)
- Usages: 1 reference in 1 file

- `apps/mobile/app/_layout.tsx`: 10 import `SessionRefresh`; 42 render `SessionRefresh`

