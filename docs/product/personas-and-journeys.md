# Personas and journeys

The people below are roles the demonstration is built for. Only Lena Hartmann has a full academic record in the app. The others describe who a later connector would have to serve, and which current screens already match their task.

## Personas

### Lena Hartmann — fifth-semester Informatik

The signed-in record.

- Account `st123456`, matriculation `4123456`, semester 5, Faculty 5.
- Email `lena.hartmann@demo.uni-stuttgart.test`. Home campus Vaihingen.
- 90 ECTS passed, 18 enrolled (AI, operating systems, sustainability, seminar), 72 open. Weighted average 1.9.
- She wants the week, the remaining degree, and a straight answer when a module is locked.

The login screen always loads this record. Typing a different account changes only the stored account string. The grades do not change, and the screen says so.

### First-year student

Needs the timetable, where the hall is, and which modules are still ahead. The same screens work. The catalog would be a different snapshot: fewer passed modules, a different weekday. This repository ships one snapshot so the checks stay stable.

### Student returning from abroad

Needs Anrechnung: which local module a course might map to, which papers to collect, and a draft that is not yet a filing. `/anrechnung` is that workflow. It does not send the draft to an examination board.

### Peer contributor

Writes a review or a shared note. In this build that person is still Lena, on one device. Kommilitonen shows seed reviews plus anything she marks shared. A multi-student feed needs a backend and moderation, which this build does not have.

## Journeys

Each journey names the path through the current app. Dates assume the demonstration clock around Tuesday 13 October 2026.

### 1. Open the day

1. Sign in with `st123456` and any password.
2. Land on Heute.
3. See the credit strip, today's AI lecture (Tuesday 09:45–11:15, V47.02), the next deadlines, and the latest notice.
4. Open the lecture room or the deadline list from that screen.

The splash stays up until storage has loaded and the route matches the session, so the tabs do not flash before login.

### 2. See what is left in the degree

1. Open Studium.
2. Filter or search the handbook.
3. Open Anforderungen and read each area against its required ECTS, plus the gap against the 30 ECTS pace.
4. Open Reihenfolge. The suggestion is Numerische Mathematik, HCI, presentation, the internship, IT security, and ethics (30 ECTS).
5. Open Maschinelles Lernen. The screen says it is not yet open because the AI course is enrolled, not passed. Stochastik is already passed. The thesis additionally waits for 120 earned ECTS.

Marking a module as planned stores an id. The credit totals stay 90 / 18 / 72.

### 3. Ask in the language of the question

1. Open Chat.
2. Ask "Wie viele ECTS fehlen mir noch?", "Wo ist die Mensa in Vaihingen?", "Wann endet die Prüfungsanmeldung?", or "Was habe ich heute?".
3. The local answer appears at once and names the demonstration figures (90 of 180, Pfaffenwaldring 45, 16.11.2026, the AI lecture in V47.02).
4. If the assistant server is running with a key, that bubble is replaced by a Grok wording of the same facts and marked as Grok. If the server is down, the local answer remains.

### 4. Find a room on the other campus

1. Open Campus and switch to Stadtmitte.
2. Search K1 or K2. Both are at Keplerstraße 17.
3. Open the room. The address and any sessions held there are on the card.
4. Switch back to Vaihingen for the Informatik building (Universitätsstraße 38), Pfaffenwaldring 47, the library, and the Mensa.

The dots are a schematic. The app does not read GPS.

### 5. Read a lecture and ask about it

1. Open Mehr, then Dokumente.
2. Sync ILIAS. The bundled slides are marked saved.
3. Open the AI week-3 text. Switch language, request a bullet summary, or ask for plain language.
4. Jump to Chat with that document focused. A summary question answers from the page text, including the token A*.
5. Export writes a text file. On a phone that is the share sheet. On the web it is a download.

Importing a `.txt` or `.md` file fills the reader with that text. Importing a binary PDF stores the file name and explains that this build does not extract it.

### 6. Leave a note for other students

1. On Dokumente, write a note or import a text file.
2. Mark it shared.
3. Open Kommilitonen. The note appears with the peer documents and the seed reviews.
4. Add a review on a module: rating, hours per week, difficulty, comment.

Sharing does not upload anywhere. Another phone will not see it.

### 7. Draft a recognition request

1. Open Anrechnung.
2. Choose study abroad or a previous university.
3. Enter the institution, course title, ECTS, and grade.
4. Pick a target. Electives and key competencies are offered, and a title match can suggest one.
5. Read the paper checklist. Save the draft. Tap it later to remove it.

If the target is already passed, the screen warns that a second recognition would likely be refused.

### 8. Catch the registration deadline

1. From Heute, open Fristen.
2. Read the exam-registration window through 16 November 2026, the assignment dates, the FÜSQ change, Rückmeldung, and the February exam dates for AI and operating systems.
3. Open the feed for the university notice that announces the same window, and for the stuvus item.

Chat answers the same dates from the record and says they are not a live C@MPUS extract.
