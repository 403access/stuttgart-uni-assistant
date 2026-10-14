# Feature catalog

Each row is a capability from the product description, the screen that carries it in this build, and what the screen does. Timetable, grades, ILIAS, and SDG Campus are still the demonstration record. The C@MPUS curriculum structure is a live read, documented in [campus-curriculum.md](../engineering/campus-curriculum.md). SIAM sign-in opens the university identity provider. The URLs are in [oidc-login.md](../engineering/oidc-login.md).

Status words:

- **In this build** — a student can complete the workflow on the bundled record.
- **Local only** — the workflow exists, and its result stays on the device.
- **Later** — specified, not built.

## 1. Platforms (Plattformen)

| Capability | Screen | Status | What this build does |
| --- | --- | --- | --- |
| C@MPUS schedule, exams, handbook, grades, announcements | `/plattformen`, Heute, Fristen, module list | In this build | Reads the bundled timetable, deadlines, modules, and grades. Sync writes a timestamp in `syncAt.campus`. |
| ILIAS materials, slides, homework, forum notices | `/dokumente`, `/plattformen` | In this build | Sync marks every bundled ILIAS document as downloaded and stamps `syncAt.ilias`. Forum-style text lives in the news feed. |
| SDG Campus and FÜSQ courses | `/plattformen`, Nachhaltigkeit module, Tutorien | In this build | The enrolled key-competency module, its tutorial, and SDG news items stand in for the platform. Sync stamps `syncAt.sdg`. |
| SIAM single sign-on | `/login` | Several paths | **Mit C@MPUS-Token anmelden** asks the local server to read the curriculum root. The token and `PSESSIONID` stay in `.env`. **C@MPUS öffnen** uses the existing account on the official site. No client registration. The password stays on that page. **Mit dieser Nutzerkennung weiter** stores the account id locally and does not check a password. **Mit SIAM anmelden** is the registered OIDC client. **Demonstrationsprofil öffnen** loads Lena Hartmann. |
| Assistant API overview | `/api` | In this build | Lists the server routes and sends the replayable ones. A structure response is stored as curriculum nodes. OIDC browser steps are listed and not sent from here. |

## 2. Modules (Module)

| Capability | Screen | Status | What this build does |
| --- | --- | --- | --- |
| Requirements tracker | `/anforderungen`, Studium | In this build | Area meters against the 180 ECTS plan. Passed 90, enrolled 18, open 72, weighted average 1.9. Gap versus 30 ECTS times completed semesters. |
| Credit recognition (Anrechnung) | `/anrechnung` | Local only | Draft: origin (abroad or previous study), institution, course, ECTS, grade, target module, checklist of papers. Saved on the device. A passed target is flagged. Nothing is submitted. |
| Learning sequence | `/reihenfolge`, module detail | In this build | Prerequisite locks and a next-semester suggestion of at most 30 ECTS. For Lena that suggestion is Numerische Mathematik, HCI, presentation, the internship, IT security, and ethics. Machine Learning and the thesis stay out. |
| Lecturer profiles | `/dozenten`, `/dozent/[id]` | In this build | Fictional profiles: institute, consultation hours, demo email, research, office room. No phone numbers. |
| Course content search | Studium search, Chat | In this build | Lexical search over titles, aliases, topics, and summaries. Chat answers a named module from the same fields. Embeddings are later. |
| Tutorials and exercise groups | `/tutorien` | In this build | Groups, rooms, seats, and whether the demonstration student is enrolled. Enrollment is a label on the record, not a booking call. |

Planning an open module (`plannedIds`) is a local mark. It does not change earned credits.

## 3. Chat and current information (Chat Bot & Aktuell)

| Capability | Screen | Status | What this build does |
| --- | --- | --- | --- |
| Deadlines, exam dates, due dates | Heute, `/fristen`, Chat | In this build | Dashboard plus natural-language answers. Exam registration closes 16 November 2026. Answers say they are a demonstration record. |
| Unified news | `/feed`, `/meldung/[id]`, Heute | In this build | Items from the university, the faculty, an institute, stuvus, and SDG Campus. |
| AI chatbot | `/chat` | In this build | Local answer first. If `npm run assistant` is up and `XAI_API_KEY` is set, Grok rewrites that answer from the same facts. |

## 4. Peers (Kommilitonen)

| Capability | Screen | Status | What this build does |
| --- | --- | --- | --- |
| Course recommendations and workload | `/kommilitonen`, module detail | In this build | Seed reviews with rating, hours per week, and difficulty for HCI, security, Machine Learning, compilers, and the AI course. |
| Student comments | `/kommilitonen`, module detail | Local only | The student can add a review. It is stored on this device and shown with the seed reviews. |
| Past exams (Altklausuren) | `/altklausuren`, `/pruefung/[id]` | In this build | Topics, focus, and a study hint. No exam PDF. |

## 5. Campus (Ort)

| Capability | Screen | Status | What this build does |
| --- | --- | --- | --- |
| Vaihingen and Stadtmitte | `/campus` | In this build | Campus switch and a schematic of dots. The screen says it is not a live location. |
| Room and building finder | `/campus`, `/raum/[id]`, Chat | In this build | Lecture halls (including K I, K II, K1, K2), offices, study space, libraries, Mensa. "Mensa Vaihingen" resolves to Pfaffenwaldring 45. A room screen lists the address and the sessions held there. |

## 6. Documents (Document Hub)

| Capability | Screen | Status | What this build does |
| --- | --- | --- | --- |
| ILIAS downloader | `/dokumente` | Local only | One tap marks the bundled ILIAS texts as saved. There is no background download from a server. |
| Peer sharing | `/dokumente`, `/kommilitonen` | Local only | A note or an imported text file can be marked shared. Kommilitonen lists shared items on the same device. |
| Reader, summary, plain language, questions | `/dokument/[id]` | In this build | Bundled pages are bilingual, so a language switch is immediate. Summary and plain language use an extractive fallback, then Grok when the server answers. Chat can be opened with `?doc=` so the next question is about that text. |
| Import and export | `/dokumente`, reader | In this build | The system document picker reads text, Markdown, CSV, and JSON. A binary PDF is kept by name with a note that extraction is not in this build. Export writes a `.txt` through the share sheet, or a download on web. |

## Cross-cutting

| Capability | Where | Status |
| --- | --- | --- |
| German default, English toggle | Einstellungen, every bundled string | In this build |
| Corporate palette, original circle mark | `src/theme.ts`, `Mark` | In this build |
| Reset local notes, chat, reviews, drafts | Einstellungen | In this build. Language and the session stay. |
| Live university connectors | — | Later. See [integrations](../engineering/integrations.md). |
| Native PDF renderer | — | Later. |
| GPS navigation | — | Later. The map stays schematic until then. |
