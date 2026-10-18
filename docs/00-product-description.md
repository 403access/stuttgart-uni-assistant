# Product description

**University Assistant.** An intelligent, AI-driven digital companion tailored for students at the University of Stuttgart. The app combines central academic systems (C@MPUS, ILIAS, SDG Campus) with collaborative, student-sourced intelligence to answer questions, structure study workflows, and manage campus administrative requirements.

This file is the product description the app is built from. Later documents record how that description was turned into a demonstration client. Where a live university system cannot be called from this repository, the screen still exists and the data is labeled as a demonstration record.

## 1. Core platform integration (Plattformen)

**C@MPUS.** Synchronize schedules, exam registrations, module handbooks, grades, and official course announcements directly from C@MPUS.

**ILIAS hub.** Integration with ILIAS for learning materials, course slides, homework assignments, and forum notices.

**SDG Campus.** Connection to SDG Campus for tracking and enrolling in sustainability and key-competency courses (FÜSQ).

**SIAM authentication.** Single sign-on with standard university IAM credentials, so access to personal data stays tied to the student's own account.

## 2. Academic and module planning (Module)

**Requirements tracker (Anforderungen).** AI analysis of degree-program rules (Prüfungsordnung) to calculate remaining credits, prerequisites, and mandatory courses.

**Credit recognition and transfer (Anrechnung).** An assistant that guides credit-transfer requests from study abroad or from a previous university.

**Learning sequence and dependencies (Reihenfolge / Lernen).** Curriculum mapping that suggests a semester sequence and shows prerequisite paths.

**Professor and lecturer info (Dozenten).** Faculty profiles, consultation hours, contact information, and research areas.

**Course content insights (Inhalt).** Search into course syllabi, lecture topics, and module summaries.

**Tutorials and practice (Tutorien).** Tutorial sessions, exercise groups, and enrollment slots.

## 3. Smart AI chatbot and real-time info (Chat Bot & Aktuell)

**Exam summaries and deadlines (Termine: Zusammenstellung & Aktuell).** A dashboard and natural-language queries for exam-registration deadlines, exam dates, and assignment due dates.

**Communication channels (Kommunikationsquellen).** One feed for faculty departments, student representation (stuvus), institutes, and official university announcements.

## 4. Peer exchange and student feedback (Kommilitonen)

**Course and module recommendations (Empfehlungen).** Student reviews, ratings, and workload assessments for electives and key competencies.

**Student reviews and comments (Studi-Kommentare).** A feedback channel for tips, difficulty ratings, and preparation advice on specific modules.

**Exams and past papers (Prüfungen / Altklausuren).** A community index of past exam topics, focus areas, and study-group hints.

## 5. Location and campus navigation (Ort)

**Interactive campus navigation.** Guidance across the Vaihingen and Stadtmitte campuses.

**Room and building finder.** Search for lecture halls (for example K1 and K2), institute rooms, study spaces, library desks, and dining (Mensa).

## 6. Document management and sharing (Document Hub)

**ILIAS document downloader.** One-tap synchronization of lecture slides, exercise sheets, and readings from registered ILIAS courses.

**Student document sharing.** A place for students to keep and share their own notes, summaries, flashcards, and solution guides.

**In-app reader and AI annotation.** A viewer in which the student can ask questions about a document, request a bullet summary, or have a lecture restated in plain language.

**Local import and export.** Upload from device storage (iOS Files, Android storage, or the desktop) into personal study folders, and share material with course peers.

## Scope of the current build

The description above is the target product. This repository implements the information architecture, the student workflows, and the assistant against a fixed demonstration record:

- Fictional student Lena Hartmann, B.Sc. Informatik, 5th semester, Faculty 5.
- A simplified 180 ECTS plan. It is not the legal Prüfungsordnung.
- Fictional lecturers and a schematic campus. Room numbers are orientation markers, not a surveyed floor plan.
- Past-exam entries list topics and study hints. They do not redistribute exam PDFs.
- Sign-in opens the university identity provider at `https://idp.uni-stuttgart.de` with authorization-code OpenID Connect. SIAM is the account system behind that provider. The password is entered on the provider's page. Client id and secret come from TIK and stay in the server `.env`. See [engineering/oidc-login.md](engineering/oidc-login.md).
- A successful sign-in identifies the account. It does not replace the timetable or the grades. Those remain the demonstration record until a C@MPUS connector exists.
- Platform sync for C@MPUS, ILIAS, and SDG Campus updates a local timestamp. It does not call those hosts.

A later phase replaces each local connector with a server-side integration. That boundary is specified in [engineering/integrations.md](engineering/integrations.md) and [engineering/security-and-privacy.md](engineering/security-and-privacy.md).
