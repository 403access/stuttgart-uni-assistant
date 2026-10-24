# Feature catalog

Each row is a capability from the product description, the screen that carries it in this build, and what the screen does. Timetable, grades, ILIAS, and SDG Campus are still the demonstration record. The C@MPUS curriculum structure and the study chooser are live reads, documented in [campus-curriculum.md](../engineering/campus-curriculum.md) and [campus-studies.md](../engineering/campus-studies.md). SIAM sign-in opens the university identity provider. The URLs are in [oidc-login.md](../engineering/oidc-login.md).

Status words:

- **In this build** — a student can complete the workflow on the bundled record.
- **Local only** — the workflow exists, and its result stays on the device.
- **Later** — specified, not built.

## 1. Platforms (Plattformen)

| Capability | Screen | Status | What this build does |
| --- | --- | --- | --- |
| C@MPUS schedule, exams, handbook, grades, announcements | `/konto`, Heute, Fristen, module list | In this build | Reads the bundled timetable, deadlines, modules, and grades. Sync writes a timestamp in `syncAt.campus` and marks the `campus` link connected on the account. |
| ILIAS materials, slides, homework, forum notices | `/dokumente`, `/konto` | In this build | Sync marks every bundled ILIAS document as downloaded and stamps `syncAt.ilias`. Forum-style text lives in the news feed. |
| SDG Campus and FÜSQ courses | `/konto`, Nachhaltigkeit module, Tutorien | In this build | The enrolled key-competency module, its tutorial, and SDG news items stand in for the platform. Sync stamps `syncAt.sdg`. |
| One account across the platforms | `/konto` | In this build | Every sign-in creates or refreshes a server-side user and one bearer session, and links C@MPUS, ILIAS, SDG Campus, SIAM, and UniMail to it. Each row shows connected versus linked and the action that fits. See [accounts.md](../engineering/accounts.md). |
| Operator dashboard | `/admin` on the assistant server | In this build | Token-protected console for accounts, sessions, platform links, per-user C@MPUS data, curriculum/course/event/call explorers, audit log, persisted service logs, and system health. Creates, edits, and deletes accounts, revokes sessions, manages platform links, disconnects C@MPUS, starts/cancels sync jobs, clears portal/calendar/call data and service logs, and exports filtered CSV. Disabled without `DASHBOARD_TOKEN`. See [admin-dashboard.md](../engineering/admin-dashboard.md). |
| SIAM single sign-on | `/login` | Several paths | **Automatisch anmelden** fills the official C@MPUS form from a credential kept in the device vault (`expo-secure-store`, optional biometrics) via a hidden WebView; the password stays on the device. **Mit C@MPUS-Token anmelden** asks the local server to read the curriculum root. The token and `PSESSIONID` stay in `.env`. **C@MPUS öffnen** uses the existing account on the official site. No client registration. **Im C@MPUS-Browser anmelden (Beta)** is the visible browser with the same harvest. **Mit dieser Nutzerkennung weiter** stores the account id locally and does not check a password. **Mit SIAM anmelden** is the registered OIDC client. **Demonstrationsprofil öffnen** loads Lena Hartmann. Every path that reaches the server ends in one user record and one session. |
| Assistant API overview | `/api` | In this build | Lists the server routes and sends the replayable ones. A structure response is stored as curriculum nodes, and a study-chooser response as the study list. OIDC browser steps are listed and not sent from here. |

## 2. Modules (Module)

| Capability | Screen | Status | What this build does |
| --- | --- | --- | --- |
| Requirements tracker | `/anforderungen`, Studium | In this build | Area meters against the 180 ECTS plan. Passed 90, enrolled 18, open 72, weighted average 1.9. Gap versus 30 ECTS times completed semesters. |
| Credit recognition (Anrechnung) | `/anrechnung` | Local only | Draft: origin (abroad or previous study), institution, course, ECTS, grade, target module, checklist of papers. Saved on the device. A passed target is flagged. Nothing is submitted. |
| Learning sequence | `/reihenfolge`, module detail | In this build | Prerequisite locks and a next-semester suggestion of at most 30 ECTS. For Lena that suggestion is Numerische Mathematik, HCI, presentation, the internship, IT security, and ethics. Machine Learning and the thesis stay out. |
| Lecturer profiles | `/dozenten`, `/dozent/[id]` | In this build | Fictional profiles: institute, consultation hours, demo email, research, office room. No phone numbers. |
| Course content search | Studium search, Chat | In this build | Lexical search over titles, aliases, topics, and summaries. Chat answers a named module from the same fields. Embeddings are later. |
| Learning quiz | Quiz tab, `/quiz/[topic]`, `/quiz/[topic]/run` | Local only | 220 questions from three first sessions – linguistics, the history of philosophy (Prof. Dr. Christian Martin), and pragmatics (Fabian Dirscherl) – across ten topics, plus a mixed round. Single choice, multiple choice, true/false, free text, matching, ordering, cloze, an interactive map of Europe, and flashcards. An interrupted round is kept per topic and can be continued or restarted; restarting warns that a new wrong answer can lower the score. Progress and session history stay on the device. Topics can also be generated from PDF handouts with `bun run quiz:from-pdf` and reviewed before they are committed. See [quiz.md](../engineering/quiz.md). |
| Tutorials and exercise groups | `/tutorien` | In this build | Groups, rooms, seats, and whether the demonstration student is enrolled. Enrollment is a label on the record, not a booking call. |

Planning an open module (`plannedIds`) is a local mark. It does not change earned credits.

## 3. Chat and current information (Chat Bot & Aktuell)

| Capability | Screen | Status | What this build does |
| --- | --- | --- | --- |
| Deadlines, exam dates, due dates | Heute, `/fristen`, Chat | In this build | Dashboard plus natural-language answers. Exam registration closes 16 November 2026. Answers say they are a demonstration record. |
| Unified news | `/feed`, `/meldung/[id]`, Heute | In this build | Operator-published items from the admin dashboard replace the feed when any exist; bundled university, faculty, institute, stuvus, and SDG Campus samples remain as the offline fallback. |
| AI chatbot | `/chat` | In this build | Local answer first. If `npm run assistant` is up and `XAI_API_KEY` is set, Grok rewrites that answer from the same facts. |

## 4. Peers (Kommilitonen)

| Capability | Screen | Status | What this build does |
| --- | --- | --- | --- |
| Course recommendations and workload | `/kommilitonen`, module detail | In this build | Seed reviews with rating, hours per week, and difficulty for HCI, security, Machine Learning, compilers, and the AI course. |
| Student comments | `/kommilitonen`, module detail | Local only | The student can add a review. It is stored on this device and shown with the seed reviews. |
| Past exams (Altklausuren) | `/altklausuren`, `/pruefung/[id]` | In this build | Topics, focus, and a study hint. No exam PDF. |

## 5. Map (Ort)

| Capability | Screen | Status | What this build does |
| --- | --- | --- | --- |
| University map | `/campus` (Map tab) | In this build | Embedded `https://maps.uni-stuttgart.de/`, active by default. Falls back to opening the browser when embedding fails. |
| Vaihingen and Stadtmitte | `/campus` (Übersicht) | In this build | Campus switch and a schematic of dots. The screen says it is not a live location. |
| Room and building finder | `/campus`, `/raum/[id]`, Chat | In this build | Lecture halls (including K I, K II, K1, K2), offices, study space, libraries, Mensa. "Mensa Vaihingen" resolves to Pfaffenwaldring 45. A room screen lists the address and the sessions held there. |
| Live curriculum structure | `/campus-info` (C@MPUS tab) | In this build | Root and groups from `POST /v1/campus/structure` for the selected study, tappable down to children. Follows study switches; reload button included. `Alles laden` runs a server sync job and hydrates the on-device SQLite cache from its snapshot. |
| Structure browser (web only) | `/strukturen` | In this build | Cached trees of all enrolled studies with search, type/status filter, and sort, plus the session API history. Browsing never refetches; per-study buttons fetch with resume. |
| Live course lists | `/campus-info` (Kurse toggle), `/kurs/[id]`, `/api` | In this build | Courses of a curriculum node from `POST /v1/campus/courses`: title, type, semester, lecturers, time, room, registration state. The detail screen adds number, SWS, next appointment, and portal links. Empty list is a valid answer. |
| All courses of a study | `/kurse` | In this build | One server sync job per study (structures plus courses), local hydrate from the snapshots, dynamic course-type pills, search, and title/type/appointment sort. Cached per study with resume. |
| Course calendar | `/kalender` (Kalender tab) | In this build | Agenda, week, day, and month views over cached appointments, with a study filter (default **Alle**), a magnifier-toggled search, course-type and Fixplatz filters, and Termin/Titel sort. Taps open `/kurs/[id]`, on web a side panel. The official ICS/CSV pull and the UID-deduped database sync live on the Campus tab as **Kalender-Import**, which also shows the import history. No portal calls otherwise; empty without a course cache. |

## 6. Documents (Document Hub)

| Capability | Screen | Status | What this build does |
| --- | --- | --- | --- |
| ILIAS downloader | `/dokumente` | Local only | One tap marks the bundled ILIAS texts as saved. There is no background download from a server. |
| Peer sharing | `/dokumente`, `/kommilitonen` | Local only | A note or an imported text file can be marked shared. Kommilitonen lists shared items on the same device. |
| Reader, summary, plain language, questions | `/dokument/[id]` | In this build | Bundled pages are bilingual, so a language switch is immediate. Summary and plain language use an extractive fallback, then Grok when the server answers. Chat can be opened with `?doc=` so the next question is about that text. |
| Import and export | `/dokumente`, reader | In this build | The system document picker reads text, Markdown, CSV, and JSON. A binary PDF is kept by name with a note that extraction is not in this build. Export writes a `.txt` through the share sheet, or a download on web. |

## 7. Network and printing (Netz & Druck)

| Capability | Screen | Status | What this build does |
| --- | --- | --- | --- |
| VPN provider choice | `/vpn` | In this build | Offers the two real services: ZDI **OpenVPN** (Fakultät 5, department/CIP-pool account) first, and the TIK **Cisco AnyConnect** access as the university-wide alternative. Each carries its own account rules, servers or files, and support link. |
| OpenVPN profile import | `/vpn` | In this build | Picks a `.ovpn` / `.conf` file, validates it (`looksLikeOpenVpn`, tested), shows the name and `remote`, and stores it in the app's private sandbox — it may contain a key. Reset removes it. |
| In-app tunnel | `/vpn` | Dev build | The OpenVPN engine is wired (`@aliakhgar1/react-native-openvpn` behind `src/vpn/engine-openvpn.ts`, with a six-line RN 0.88 patch), plus the Android manifest and iOS entitlements from `plugins/withVpnTunnel.js`. **Android builds and packages the engine** (`libopenvpn.so`/`libovpn3.so` for four ABIs); a development build on a device is what is still needed to prove traffic, and iOS still needs the `PacketTunnel` target plus Apple's `packet-tunnel-provider` grant. The TIK path has no engine. The screen never reports a false `connected`. See [vpn-tunnel.md](../engineering/vpn-tunnel.md). |
| Campus printing | `/drucker` | In this build | Registration, credit, the exact prices, Mobility Print / Web Print / USB printing, releasing at the device, scanning, the device locations on both campuses, and the stuvus contacts. The screen states that the printers need the university WLAN or the VPN and links to `/vpn`. |

## Cross-cutting

| Capability | Where | Status |
| --- | --- | --- |
| German default, English toggle | Einstellungen, every bundled string | In this build |
| First-run onboarding | `/onboarding` | In this build. Biometrics, then separate calendar, messages, and timetable import pages after the first successful sign-in on a device with enrolled biometrics. All three imports start with the flow, so each page usually opens on its overview; a cold store shows a spinner first. The record is device-level. Skipped without hardware/enrollment and not marked complete, so enrolling later can show it. Web skips it. |
| Biometric app lock | `/onboarding`, `/sicherheit` | In this build. Face ID / fingerprint unlock on cold launch and after background. Cancelling leaves retry and sign-out. The lock is preference-driven; if biometrics are removed, the system prompt can fall back to the device passcode and sign-out remains available. Separate from the optional C@MPUS credential vault. |
| Corporate palette, original circle mark | `src/theme.ts`, `Mark` | In this build |
| Reset local notes, chat, reviews, drafts | Einstellungen | In this build. Language and the session stay. |
| Live university connectors | — | Later. See [integrations](../engineering/integrations.md). |
| Native PDF renderer | — | Later. |
| GPS navigation | — | Later. The map stays schematic until then. |
