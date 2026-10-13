# Data model

The catalog is TypeScript in `src/data/`. Types live in `src/types.ts`. The device stores only what the student changes. Grades, rooms, and deadlines are not in Async Storage. They come from the bundle, so a reset cannot corrupt them.

This curriculum is a simplified fictional B.Sc. Informatik plan. It is not the legal Prüfungsordnung of the University of Stuttgart.

## Program

`src/data/program.ts`

| Field | Value |
| --- | --- |
| Id | `bsc-inf` |
| Degree | Bachelor of Science, Informatik |
| Total | 180 ECTS |
| Pace | 30 ECTS per semester |

Areas, in ECTS:

| Id | German title | ECTS |
| --- | --- | --- |
| `math` | Mathematik | 30 |
| `theory` | Theoretische Informatik | 18 |
| `practical` | Praktische Informatik | 24 |
| `systems` | Technische Informatik | 18 |
| `core` | Kernmodule | 18 |
| `elective` | Ergänzungsmodule | 24 |
| `sq` | Schlüsselqualifikationen | 18 |
| `project` | Projekt und Praktikum | 18 |
| `thesis` | Bachelorarbeit | 12 |

These nine areas sum to 180.

## Student

| Field | Value |
| --- | --- |
| Name | Lena Hartmann |
| Account | `st123456` |
| Matriculation | `4123456` |
| Semester | 5 |
| Email | `lena.hartmann@demo.uni-stuttgart.test` |
| Faculty | Fakultät 5 |
| Home campus | Vaihingen |

Expected pace after four completed semesters is 120 ECTS. She has earned 90, so the gap shown on Anforderungen is 30.

## Modules

`ModuleItem` in `src/data/modules.ts`. Twenty-nine modules.

| Status | ECTS | Meaning |
| --- | --- | --- |
| `passed` | 90 | Grade is set. Weighted average is 1.9. |
| `enrolled` | 18 | Current semester. Sessions are on the timetable. |
| `open` | 72 | Not yet taken. |

Passed examples include Programmierung und Software-Entwicklung (`pse`, 9 ECTS, 1.7), Datenstrukturen (`dsa`, 9, 1.3), and Stochastik (`stoch`, 6, 3.0). Enrolled modules are Künstliche Intelligenz (`ai`, M-INF-510), Betriebssysteme (`os`, M-INF-520), the sustainability key competency (`sustain`, M-SQ-210), and the seminar (`seminar`, M-INF-530).

A module may list `prerequisites` (other module ids) and `minEarned` (ECTS that must already be passed). The thesis uses `minEarned: 120`. Machine Learning requires `ai` and `stoch`. Stochastik is passed. The AI course is only enrolled, so Machine Learning stays locked.

`lockReason` returns `min:<n>`, `prereq:<ids>`, or null. `prerequisitesMet` is true only when every prerequisite has status `passed`.

Sessions use JavaScript weekday numbers, Monday = 1 through Friday = 5. The AI lecture is Tuesday (`day: 2`) 09:45–11:15 in V47.02. `scheduleForDay` skips passed modules.

### Next-semester suggestion

`suggestNextSemester(modules, areas, cap = 30)`:

1. Among unlocked open modules that fit the remaining cap, prefer one that closes an area (`ects` at least the remaining gap). Smallest gap first, then smaller ECTS, then module code. That picks Numerische Mathematik.
2. Then fill by the largest remaining area gap. Ties follow `math`, `sq`, `project`, `elective`, `core`, `systems`, `practical`, `theory`, `thesis`. Inside an area, smaller ECTS, then code.
3. Stop at 30 ECTS or when nothing unlocked fits.

The result for this student is `num`, `hci`, `presentation`, `prakt`, `sec`, `ethics`. Machine Learning and the thesis are excluded because they are locked. `scripts/check-assistant.ts` asserts that list.

`plannedIds` on the device is a separate set. The suggestion does not read it, and planning a module does not change `totals`.

## People and places

People in `src/data/people.ts` are fictional. Emails use `@demo.uni-stuttgart.test`. There are no phone numbers. Each person points at a `roomId`.

Places in `src/data/places.ts` have a campus, a building, a street address, schematic `x` and `y` (0–100), aliases, and a bilingual note. Examples:

| Id | Place | Address |
| --- | --- | --- |
| `mensa-v` | Mensa Vaihingen | Pfaffenwaldring 45 |
| `v47-hs` | V47.02 | Pfaffenwaldring 47 |
| `v38-hs` | Informatik lecture hall | Universitätsstraße 38 |
| `lib-v` | Library, Vaihingen | Pfaffenwaldring 55 |
| `k1`, `k2` | Stadtmitte halls | Keplerstraße 17 |
| `lib-sm` | Universitätsbibliothek Stadtmitte | Holzgartenstraße 16 |

Room search scores a name or alias match above a campus match, so a question that names both "Mensa" and "Vaihingen" returns Pfaffenwaldring 45 rather than the first Vaihingen building.

## Activity

`src/data/activity.ts` holds deadlines, news, documents, reviews, past exams, and tutorials.

Deadlines run from an operating-systems sheet on 16 October 2026 through the exam-registration close on 16 November 2026, plus Rückmeldung on 15 January 2027 and the winter exams (AI on 18 February 2027, operating systems on 24 February 2027). The assistant lists deadlines on or after the current local date.

News sources are `university`, `faculty`, `institute`, `stuvus`, and `sdg`.

Documents are either `ilias` or `peer`. Each has bilingual `pages`. The AI slides include the token A* so the summary check can see that the text survived. Past exams store topics, a focus sentence, and a hint. They do not store a file.

Reviews carry `rating`, `workload` (hours per week), and `difficulty`. Tutorials carry seats, taken seats, and `enrolled`.

## Recognition drafts

`TransferDraft`: `origin` is `abroad` or `previous`, plus institution, course title, ECTS and grade as strings (the form is free text), `targetModuleId`, a note, and `createdAt`. `suggestRecognitionTarget` scores words longer than three characters against module titles and aliases.

## Imports and chat

`ImportedDocument`: title, text, folder, `source` (`device` or `note`), `shared`, optional `uri` and `mimeType`. Text types and `.txt`, `.md`, `.csv`, `.json` are read. A binary PDF is stored with an explanation in `text` and no extracted body.

`ChatMessage`: `role`, `text`, `sources`, `engine` (`campus` or `grok`), `createdAt`.

## Device record

Key: `stuttgart-uni-assistant/v1`.

```ts
interface PersistedState {
  locale: 'de' | 'en';
  sessionAccount: string | null;
  syncAt: Partial<Record<'campus' | 'ilias' | 'sdg' | 'siam', string>>;
  downloadedIds: string[];
  imports: ImportedDocument[];
  reviews: Review[];
  transfers: TransferDraft[];
  messages: ChatMessage[];
  plannedIds: string[];
}
```

`sanitize` keeps only well-typed fields. Unknown JSON is ignored. ILIAS sync unions every `source: 'ilias'` document id into `downloadedIds` and sets `syncAt.ilias`. Other platforms only set their timestamp.

Not stored: the password, the API key, grades, the catalog, GPS, or anyone else's account.
