# 3. Requirements

## Purpose

State what the prototype must do so a later design can be checked against something sharper than the original paragraph.

Requirements use three words on purpose:

- **Must** — in this repository, and covered by a screen or a check.
- **Should** — in this repository if it stays small.
- **Won't** — explicitly out of this build.

## Accounts and trust

- The app must offer SIAM sign-in through the university identity provider, and must not transmit the password. The password is entered on `https://idp.uni-stuttgart.de`. Client id and secret stay on the server. See [oidc-login.md](../engineering/oidc-login.md).
- The app must load one named demonstration record, and must show that name even if the typed account differs.
- The app must keep language, notes, drafts, and chat on the device.
- The app must create one server-side user per university identity and mint a bearer session for it, and the device must keep only that session token (keychain/Keystore on native) plus a copy of the public user record. The account screen must show C@MPUS, ILIAS, SDG Campus, SIAM, and UniMail as links on that one account. See [accounts.md](../engineering/accounts.md).
- The server must offer a token-protected operator dashboard at `/admin` for listing, creating, editing, and deleting users; inspecting sessions/platforms/C@MPUS state and stored curriculum/course/calendar/call data; revoking sessions; managing platform links; disconnecting C@MPUS; clearing portal data; starting/cancelling sync jobs; reviewing an audit trail; and exporting filtered data. Without `DASHBOARD_TOKEN` it must stay disabled. See [admin-dashboard.md](../engineering/admin-dashboard.md).

## Platforms

- The app must show C@MPUS, ILIAS, SDG Campus, SIAM, and UniMail as links on one account.
- Sync must be an explicit action. C@MPUS structure, studies, courses, and calendar data must be read through the assistant server with the signed-in user's own credential and stored under that user id. ILIAS sync must mark the bundled lecture files as saved on the device.
- Every C@MPUS route that reads portal data must require the app session token and must not answer from another user's rows. A missing credential is a clear 409, not a shared fallback.
- ILIAS and SDG Campus have no live client; their account links are identity-level only. The university identity provider remains the only direct browser flow.

## Degree

- The record must sum to 180 ECTS, split into the areas in `apps/mobile/src/data/program.ts`.
- Passed, enrolled, and open credits must be visible, with a weighted average of passed modules.
- The requirements screen must show each area against its required ECTS, and the gap against 30 ECTS per completed semester.
- A module must show its topics, lecturer, sessions, prerequisites, tutorials, documents, reviews, and past-exam topics when those exist.
- An open module whose prerequisite is not passed, or whose minimum earned credits are not met, must say so.
- The sequence screen must suggest a next semester of at most 30 ECTS, using only unlocked modules, and must not suggest Maschinelles Lernen or the thesis for this student.
- The student must be able to mark an open module as planned. That mark must not change earned credits.
- Recognition must collect origin, institution, course, ECTS, and a target module, list the papers the board would ask for, and store the draft on the device. It must not submit the request.
- If the target module is already passed, the screen must say a second recognition would likely be refused.

## Time and news

- Today must list the sessions for the current weekday. On Tuesday 13 October 2026 that is the AI lecture in V47.02.
- Deadlines must include the exam-registration close on 16 November 2026, assignment due dates, the FÜSQ change date, and the two winter exams.
- The feed must carry university, faculty, institute, stuvus, and SDG Campus items.

## Assistant

- The assistant must answer in the active language from the demonstration record, without a network call.
- It must answer, at least: remaining credits, the Vaihingen cafeteria address, the registration deadline, today's classes, whether Machine Learning can be taken, and a summary of a focused document.
- Credit and deadline answers must say they are not a live C@MPUS extract.
- When the assistant server is up and a key is set, the app should replace the local wording with a Grok answer grounded on the same facts.
- The key must not be in the app bundle. Requests that store conversation state on the provider must be sent with `store: false`.

## Campus

- The app must switch between Vaihingen and Stadtmitte.
- The map must be labeled as a schematic, not a live location.
- Search must find the Mensa, the libraries, and the Stadtmitte halls K1 and K2.
- A room screen must name the address and the sessions held there.

## Documents and peers

- Bundled ILIAS texts must be readable inside the app, with summary, plain language, a language switch, a jump into chat, and export.
- The student must be able to import a file from the device and write a note.
- Sharing a personal note must make it visible under Kommilitonen on the same device.
- Reviews must show rating, weekly workload, and difficulty. The student must be able to add one locally.
- Past exams must list topics, focus, and a hint, and must not link to an exam PDF.

## Languages and design

- German is the default. English must cover the interface and the bundled content.
- Official names stay as they are: C@MPUS, ILIAS, SIAM, SDG Campus, stuvus, FÜSQ, Prüfungsordnung.
- The visual language must follow the published anthracite / mid blue / light blue palette and must not reproduce the university signet.

## Exit check

A requirement is accepted when it is testable on the demonstration record. The checks in [06-testing.md](06-testing.md) cover the numbers and the scripted answers. The screens cover the rest.
