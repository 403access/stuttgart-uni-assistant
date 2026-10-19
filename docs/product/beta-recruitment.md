# Beta recruitment

How to find the first eight to twelve testers, what to tell them, and when. The intake form is [beta-signup.md](beta-signup.md); the questionnaire is [beta-survey.md](beta-survey.md); the conversation afterwards is [beta-interview-guide.md](beta-interview-guide.md). The current form links are in [beta-forms.json](beta-forms.json).

## Signup form

[beta-signup.md](beta-signup.md) is the single intake form: name, email, optional phone, device, and one frustration answer, plus consent. Share [tally.so/r/kbaB7Z](https://tally.so/r/kbaB7Z) in the invite. It keeps the cohort in one list and tells you the iOS/Android split before you send a build. Keep the responses out of the repository.

## Cohort

Invite **15–20 people to end with 8–12 completions.** Expect roughly half to install, and half of those to finish the survey.

Aim for this spread, not for volume:

- At least three testers outside Informatik. The app is for the whole university, and non-CS testers expose jargon and assumptions.
- At least three people the author does not already know personally. Friends are polite; strangers are honest.
- At least two in the first four semesters and two in later semesters. Their tasks differ.
- Both iOS and Android, plus one web tester if possible.
- At least one tester who prefers English, so the English form is exercised.

## Channels

- Fachschaft and stuvus Matrix or Discord rooms, with the moderators' permission.
- Subject mailing lists, after asking the list owner. Do not cross-post the same message to several lists on one day.
- A five-line announcement at the end of a lecture or tutorial, with the lecturer's permission.
- Friends-of-friends: ask one tester to name one other person. This widens the circle faster than a public post.
- A QR code on a single A5 sheet in a study room or the Mensa, if the university allows it.

Do not recruit only from one friend group, one seminar, or one faculty. The survey will still be self-selected, but it should not be predictable.

## What not to do

- Do not call it an official university app or imply university endorsement.
- Do not ask for a C@MPUS password in a recruitment message, a chat, or a survey.
- Do not promise features, a release date, or that a reported bug will be fixed.
- Do not offer a large incentive. A coffee or a small Mensa credit is enough, and say it comes from the author, not the university.
- Do not publish a tester's name, screenshot, or quote without explicit consent.
- Do not argue with negative feedback in the thread. Thank the tester and move the detail to the interview.

## Timeline

| Day | Action |
| --- | --- |
| −1 | Check the signup list and send the onboarding message with the build link |
| 0 | Tester installs, opens the demo profile, and tries the four tasks |
| 3 | Short nudge; ask whether anything is blocking them |
| 6 | Send the survey |
| 9 | Close the survey, send the non-user follow-up, book interviews |
| 10–14 | Run the 15-minute interviews |
| 15–21 | Write the one-page readout and delete the contact list |

## Messages

Replace `[Link]`, `[Signup-Link]`, `[Datum]`, and `[Sicherheitshinweis]` before sending. Send the German message by default and the English one to testers who write in English.

### Invite — Deutsch

> Hi! Ich baue als studentisches Projekt eine App für Studierende der Uni Stuttgart: Stundenplan, Fristen, Module, Dokumente und ein Assistent an einem Ort. Sie ist kein offizielles Angebot der Universität, und die Demo-Daten sind fiktiv.
>
> Ich suche 8–12 Leute, die sie 5–7 Tage lang ausprobieren und danach 5 Minuten Fragen beantworten. Du brauchst kein C@MPUS-Passwort – das Demo-Profil reicht. Interesse? Trag dich hier ein: [Signup-Link]. Du kannst mir auch einfach kurz mit Ja antworten.

### Invite — English

> Hi! I am building a student project for University of Stuttgart students: timetable, deadlines, modules, documents, and an assistant in one app. It is not an official university service, and the demo data is fictional.
>
> I am looking for 8–12 people to try it for 5–7 days and then answer five minutes of questions. You do not need a C@MPUS password — the demo profile is enough. Interested? Sign up here: [signup link]. You can also just reply yes.

### Onboarding — Deutsch

> Hier ist der Test-Build: [Link].
>
> 1. Installieren und öffnen.
> 2. **Demonstrationsprofil öffnen** wählen.
> 3. Vier Dinge probieren: den Stundenplan ansehen, einen Raum finden, den Assistenten etwas fragen, ein Dokument öffnen.
> 4. Die App in den nächsten Tagen so benutzen, wie du sie benutzen würdest.
>
> Die Daten im Demo-Profil sind fiktiv. Wenn du die Beta-Anmeldung testen willst, lies vorher [Sicherheitshinweis] und gib dein Passwort nur ein, wenn du das möchtest. Am [Datum] kommt der Fragebogen.

### Onboarding — English

> Here is the test build: [Link].
>
> 1. Install and open it.
> 2. Choose **Open demo profile**.
> 3. Try four things: view the timetable, find a room, ask the assistant something, open a document.
> 4. Use it over the next few days the way you would normally use it.
>
> The demo data is fictional. If you want to test the beta sign-in, read [security note] first and enter your password only if you choose to. The questionnaire follows on [date].

### Day-3 nudge — Deutsch

> Kurze Erinnerung: Hat der Test-Build geklappt? Wenn du irgendwo hängst, schreib mir ein Wort – genau das ist die Rückmeldung, die hilft.

### Day-3 nudge — English

> Quick check-in: did the test build work? If you are stuck anywhere, send me one line — that is exactly the feedback that helps.

### Survey message — Deutsch

> Der Fragebogen ist offen: [Link]. Fünf Minuten, 15 Fragen, nur zwei Pflichtfelder. Es geht nicht darum, ob du die App magst, sondern wo sie dich aufgehalten hat. Danke!

### Survey message — English

> The questionnaire is open: [Link]. Five minutes, 15 questions, only two required fields. It is not about whether you like the app — it is about where it got in your way. Thank you!

### Close — Deutsch

> Danke! Der Fragebogen schließt am [Datum]. Wer 15 Minuten für ein Gespräch hat: [Interview-Link].

### Close — English

> Thank you! The questionnaire closes on [date]. If you have 15 minutes for a conversation: [interview link].

## Non-user follow-up

Send this separately to anyone who installed but did not finish, or who never opened the app. It is three questions, not the main survey.

1. **Wie weit bist du gekommen?** ☐ Installiert ☐ Geöffnet ☐ Angemeldet ☐ Etwas Nützliches gefunden ☐ Ein paar Tage benutzt
2. **Wo hast du aufgehört, und warum?** *(offen)*
3. **Was hätte dich zum Weitermachen gebracht?** *(offen)*

English:

1. **How far did you get?** ☐ Installed ☐ Opened ☐ Signed in ☐ Found something useful ☐ Used it for a few days
2. **Where did you stop, and why?** *(open)*
3. **What would have kept you going?** *(open)*

## Tracking

Keep one sheet with participant codes `P01`–`P20`, not names. Columns: code, cohort note (programme and semester band, not the full programme), device, invited, onboarded, day-3 nudge, survey, interview, and a free note. Link the code to contact details in a separate list that is deleted after the interviews.

If a tester reports a security problem, handle it privately. Do not ask them to put it in the survey, and do not repeat the details in a group chat.
