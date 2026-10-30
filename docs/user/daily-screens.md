# The daily screens

These are the tabs a student opens most days: **Heute (Today)**, **Kalender (Calendar)**, **Chat**, **Lernquiz (Quiz)**, and the deadline screen.

## Heute (Today)

The dashboard. Top to bottom:

| Block | What you see | What you can tap |
| --- | --- | --- |
| Greeting card | Your name with a C@MPUS session, or the demonstration header with Lena's name and semester | — |
| Date card | Today's date, the number of upcoming appointments, and the next appointment (only with a C@MPUS session and a course cache; hidden otherwise) | The next appointment's course |
| Credit card | Passed ECTS against the 180-ECTS plan, ECTS in this semester, weighted average | Opens **Anforderungen (requirements)** |
| Today's weekday | Every session of today from the timetable: kind of event, time, room | The module detail screen |
| Fristen (deadlines) | The next three deadlines with dates | All deadlines on `/fristen` |
| Aktuelles (news) | The two newest items from university, faculty, institute, stuvus, or SDG Campus | The item's own screen |

With a C@MPUS session a study selector sits on top: switch between enrolled studies and the whole screen follows the selected study.

If no class is on today's timetable, the screen says so.

## Chat

Type a question in German or English about your studies, deadlines, rooms, modules, documents, or past exams.

How an answer is built:

1. The app answers immediately from the bundled record. The bubble carries the engine label `campus`.
2. If the assistant server is running and an xAI key is configured, that same answer is rewritten by Grok in a second bubble labelled `grok`. A slow or failed server never replaces the local answer.
3. Answers name their sources from the record and say when they are a demonstration record.

Be specific about a module ("Was muss ich in Numerische Mathematik können?", "What does HCI cover?"), a deadline, or a room ("Wo ist Mensa Vaihingen?"). The chat can also be opened focused on a document from the reader, and then answers questions about that text.

## Kalender (Calendar)

The calendar tab works over the cached appointments of your courses, loaded from C@MPUS; a study filter (default **Alle / All**) spans all enrolled studies. Without a course cache it is empty — that is the honest state, not an error.

| Control | What it does |
| --- | --- |
| View switch | Agenda list, week, day, or month grid |
| Search | A magnifier button opens a field that filters by course or appointment title |
| Filter pills | Study (**Alle** or one enrolled study), course type (lecture, tutorial, seminar …), and whether only fixed appointment slots are shown |
| Sort | By date, or by title |

Tapping an appointment opens the course's own screen. On web the course opens in a side panel so the calendar stays visible.

The official ICS/CSV pull and the database sync are not on this tab: they live on the Campus tab as **Kalender-Import**, together with the import history (see [campus-calendar-export](../engineering/campus-calendar-export.md)).

## Lernquiz (Quiz)

The practice tab. Modules are grouped by degree program; every module opens its topics, and every topic opens a round.

| Block | What you see | What you can tap |
| --- | --- | --- |
| Progress | Securely answered questions against the total, the hit rate, and the last round | The topic of the last round |
| Lernwerkzeuge (learning tools) | The articulation studio | The studio |
| Module tiles | Each module with its semester, topic and question count, and a progress ring | The module and its topics |

A topic offers **Alle Fragen (all)**, **Schnelltest (quick)**, **Fehler wiederholen (review)**, and for a whole degree program a **Gemischte Runde (mixed)**. Ten question kinds appear: single and multiple choice, true/false, free text, matching, ordering, cloze, map, diagram, and flashcards.

Your progress lives on the device. With a session, checked answers and completed rounds are also synced to the account; signing out clears the queue.

### Lernwerkzeuge: Artikulationsstudio

The studio animates how a sound is produced on the same head cross-section the diagram questions use: the airstream rises from the lungs, the vocal cords vibrate or stay apart, and the tongue, lips, and velum take the pose of the sound. Pick from 24 sounds — stops, nasals, fricatives, approximants, and vowels — each with an IPA symbol, an example word, and a one-line explanation.

**2D / 3D** switches between the flat cutaway and a turnable block of the same anatomy. **Drehen (turning)** steps the model left and right, and the airstream and voicing rings travel with it. Both views tell the same three-step story: **Luftstrom (airstream)**, **Stimme (voice)**, **Artikulation (articulation)**.

The studio opens from the quiz tab, from any phonetics topic (**Im Artikulationsstudio ansehen**), and from **Campus → Studium**. With the system's reduce-motion setting the model stands still and the player says so.

## Fristen (Deadlines)

The full list of deadlines: exam registration windows, submission dates, and exams, each with its date and what it belongs to. The list comes from the bundled record; the demonstration record says so where it matters — for example that exam registration closing on 16 November 2026 is a demonstration date.
