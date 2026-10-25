# Beta survey

The questionnaire for the first student pilot. It is a five-minute core form, not a feature wish-list. The design targets three risks: whether a student reaches a useful screen, whether the beta sign-in is acceptable, and whether the app becomes a weekly habit.

Status: **draft, not yet fielded.** The pilot it belongs to is the gap described in [funding/eligibility-and-gaps.md](../funding/eligibility-and-gaps.md#a-first-real-pilot). The repository has no results yet.

## What the survey must decide

| Decision | Question | Signal |
| --- | --- | --- |
| Can a student get to something useful? | Q6, Q9 | Sign-in completion and which areas were reached |
| Is the beta C@MPUS sign-in acceptable? | Q7 | Trust rating and the objections named |
| Do testers know what is live and what is demonstration? | Q8 | "No" or "partly" answers, and what was unclear |
| Is there a weekly habit? | Q13, Q14 | Weekly-use intent and the Sean Ellis answer |
| What hurts most? | Q12 | The most frustrating moment, coded into themes |
| What should be built next? | Q10, Q14 | Most useful area and the forced next-feature choice |

## Design rules

- Ask about behaviour, not opinion. "Which areas did you open?" beats "Do you like the app?"
- Only ask testers to rate what they actually used. Q7 carries a `Nicht ausprobiert` option; hide it in the Tally UI if you want the stricter version.
- Keep it to five minutes and fifteen questions. Required fields: consent and Q12 only.
- Never ask for a password, token, matriculation number, or screenshot containing one.
- Keep contact details out of the questionnaire. The interview invite sits on the end page and points to a separate one-field form.
- Do not use a 0–10 recommendation score at this sample size. Q14 is the Sean Ellis question instead.
- A bug belongs in the issue tracker, not a rating. The pilot needs a permanent **Feedback** entry under Mehr before launch; that entry is not in this build yet.

## The form, German and English side by side

The table is the source of truth. Paste the German column into the German form and the English column into the English form; do not mix languages in one form. The app mixes du and Sie in places, but the survey uses **du** consistently.

### Intro and consent

| | Deutsch | English |
| --- | --- | --- |
| Intro | Das ist ein studentisches Projekt, kein Angebot der Universität Stuttgart. Deine Antworten entscheiden mit, was als Nächstes gebaut wird. Bitte gib keine Passwörter, Tokens oder Matrikelnummern ein. Die Auswertung erfolgt pseudonym. | This is a student project, not an official University of Stuttgart service. Your answers help decide what gets built next. Please do not enter passwords, tokens, or matriculation numbers. Responses are evaluated pseudonymously. |
| Consent | ☐ Ich habe den Hinweis gelesen und bin mit der pseudonymen Auswertung einverstanden. *(Pflicht)* | ☐ I have read the notice and agree to pseudonymous evaluation. *(required)* |

### A. Context

| # | Deutsch | English |
| --- | --- | --- |
| 1 | Was studierst du, und in welchem Fachsemester?<br />[Kurztext: Studiengang] [Zahl: Fachsemester] | What do you study, and in which semester?<br />[short text: programme] [number: semester] |
| 2 | Wo hast du die App getestet?<br />☐ iOS (Dev-Build) ☐ Android (Dev-Build) ☐ Webbrowser ☐ Expo Go ☐ Sonstiges | Where did you test the app?<br />☐ iOS (dev build) ☐ Android (dev build) ☐ Web browser ☐ Expo Go ☐ Other |
| 3 | Hast du mit dem Demo-Profil oder mit deinem eigenen C@MPUS-Konto getestet?<br />☐ Demo-Profil (Lena Hartmann) ☐ Eigenes Konto ☐ Beides | Did you test with the demo profile or your own C@MPUS account?<br />☐ Demo profile (Lena Hartmann) ☐ Own account ☐ Both |
| 4 | An wie vielen Tagen hast du die App geöffnet?<br />☐ 1 ☐ 2–3 ☐ 4–7 ☐ mehr als 7 | On how many days did you open the app?<br />☐ 1 ☐ 2–3 ☐ 4–7 ☐ more than 7 |

### B. First run and sign-in

| # | Deutsch | English |
| --- | --- | --- |
| 5 | Welchen Anmeldeweg hast du benutzt?<br />☐ Im C@MPUS-Browser anmelden (Beta) ☐ Automatisch anmelden ☐ Mit C@MPUS-Token anmelden ☐ Mit SIAM anmelden ☐ Mit dieser Nutzerkennung weiter ☐ Demonstrationsprofil öffnen ☐ Mehrere | Which sign-in path did you use?<br />☐ C@MPUS browser (Beta) ☐ Automatic sign-in ☐ C@MPUS token ☐ SIAM ☐ Username only ☐ Demo profile ☐ Several |
| 6 | Hat die Anmeldung funktioniert?<br />☐ Ja ☐ Nein ☐ Nicht ausprobiert<br />**Falls nein:** An welcher Stelle hat es aufgehört, und was hast du gesehen? *(offen)* | Did sign-in work?<br />☐ Yes ☐ No ☐ Did not try<br />**If no:** Where did it stop, and what did you see? *(open)* |
| 7 | Wie hast du dich gefühlt, als du deine C@MPUS-Zugangsdaten in der App eingegeben hast?<br />1 = sehr unwohl … 5 = unproblematisch<br />☐ Nicht ausprobiert<br />*(nur anzeigen, wenn Q5 nicht „Demonstrationsprofil öffnen“ ist)* | How did you feel entering your C@MPUS credentials into the app?<br />1 = very uncomfortable … 5 = fine<br />☐ Did not try<br />*(only show if Q5 is not "Demo profile")* |
| 8 | War dir klar, welche Daten echt sind und welche aus dem Demonstrationsprofil stammen?<br />☐ Ja ☐ Teilweise ☐ Nein<br />Was war unklar? *(offen, optional)* | Was it clear which data was real and which came from the demonstration record?<br />☐ Yes ☐ Partly ☐ No<br />What was unclear? *(open, optional)* |

### C. Use and value

| # | Deutsch | English |
| --- | --- | --- |
| 9 | Welche Bereiche hast du geöffnet? *(Mehrfachauswahl)*<br />☐ Heute ☐ Kalender ☐ Studium/Module ☐ Chat ☐ Dokumente ☐ Fristen ☐ Kommilitonen ☐ Campus/Karte ☐ Kurse ☐ Mail ☐ VPN ☐ Drucker ☐ Mehr/Schnittstelle | Which areas did you open? *(multi-select)*<br />☐ Today ☐ Calendar ☐ Studies/Modules ☐ Chat ☐ Documents ☐ Deadlines ☐ Peers ☐ Campus/Map ☐ Courses ☐ Mail ☐ VPN ☐ Printing ☐ More/API |
| 10 | Welcher Bereich war am nützlichsten? *(Einfachauswahl, gleiche Liste wie Q9)*<br />Warum? *(Kurztext)* | Which area was most useful? *(single choice, same list as Q9)*<br />Why? *(short text)* |
| 11 | Wie korrekt waren die Inhalte, die du geprüft hast?<br />1 = vieles falsch … 5 = alles korrekt<br />☐ Nicht geprüft<br />Was war falsch oder fehlt? *(offen, optional)* | How accurate was the content you checked?<br />1 = much of it wrong … 5 = all correct<br />☐ Did not check<br />What was wrong or missing? *(open, optional)* |
| 12 | Was war der nervigste Moment? *(offen, **Pflicht**)* | What was the most frustrating moment? *(open, **required**)* |

### D. Retention and next step

| # | Deutsch | English |
| --- | --- | --- |
| 13 | Würdest du die App im Semester wöchentlich benutzen?<br />☐ Auf jeden Fall ☐ Wahrscheinlich ☐ Unsicher ☐ Wahrscheinlich nicht ☐ Nein<br />Warum? *(offen, optional)* | Would you use the app weekly during the semester?<br />☐ Definitely ☐ Probably ☐ Not sure ☐ Probably not ☐ No<br />Why? *(open, optional)* |
| 14 | Wie enttäuscht wärst du, wenn du die App ab morgen nicht mehr benutzen könntest?<br />☐ Sehr enttäuscht ☐ Etwas enttäuscht ☐ Nicht enttäuscht | How disappointed would you be if you could no longer use the app from tomorrow?<br />☐ Very disappointed ☐ Somewhat disappointed ☐ Not disappointed |
| 15 | Sonst noch etwas? *(offen, optional)* | Anything else? *(open, optional)* |

### End page

| | Deutsch | English |
| --- | --- | --- |
| Invite | Danke! Wenn du uns 15 Minuten zu deinen Erfahrungen geben magst, trag dich hier ein: [Link zum separaten Interview-Formular]. Deine Kontaktdaten werden nicht mit diesem Fragebogen verknüpft. | Thank you! If you are open to 15 minutes of questions, sign up here: [link to the separate interview form]. Your contact details are not linked to this questionnaire. |
| Close | Der Fragebogen schließt am [Datum]. | The form closes on [date]. |

### Rejected questions

These were considered and left out. Keep them out unless the pilot grows past roughly 30 responses.

- **"Would you pay for this?"** Hypothetical, and the sample is too small to price anything.
- **"How much time did it save you?"** Recall is unreliable and the number is not comparable across testers.
- **"Do you like the design?"** Not actionable. Q12 catches specific friction.
- **A 0–10 recommendation score.** Unstable below roughly 30 responses. Q14 is the stronger signal.
- **A long feature wish-list.** Biases the roadmap toward whatever is listed. Q10 and Q14 force a choice.
- **Ratings for every feature.** Testers who did not open a screen cannot rate it, and the missing data is invisible in the average.

## Tally setup

Tally has no built-in full translation of a form. Use two forms with identical question order:

1. `Uni-Assistant Beta (DE)` and `Uni-Assistant Beta (EN)`.
2. Add a `language` column when merging the two exports, or set a hidden field in each form if your Tally plan supports default values for hidden fields.
3. Required: consent and Q12. Everything else optional.
4. Q7 is visible in the API-created form with a `Nicht ausprobiert` option. Hide it in the Tally UI if you want it shown only to testers who tried a credential path.
5. Build Q7 and Q11 as single choice with a `Nicht ausprobiert` / `Did not check` option, not as a rating widget. A rating widget cannot carry a skip option.
6. Turn off respondent email collection and any automatic IP or location metadata Tally offers for the form.
7. Put the interview signup on a separate one-field form and link it from the end page. Do not add an email question to the main form.
8. Test the published form on iOS and Android before sending it. Most testers will answer on a phone.
9. Set a closing date and state it in the intro. Open-ended forms lose urgency.
10. Send the German link by default. Send the English link to testers who write in English, or publish both and let the tester choose.

The live links are in [beta-forms.json](beta-forms.json).

### Create the forms from the command line

`tools/create-beta-forms.mjs` builds the German form, the English form, and the interview signup through the Tally API. It reads `TALLY_API_KEY` from the environment, `~/.config/tally/api_key`, or the git-ignored `.env`, and never prints it. The ids land in `docs/product/beta-forms.json`.

```bash
npm run beta:forms              # three drafts
npm run beta:forms -- --dry-run # block counts, no API call
npm run beta:forms -- --publish # publish the existing drafts
npm run beta:forms -- --force   # create a new set instead of reusing the ids
```

Create a key at [developers.tally.so/api-reference/api-keys](https://developers.tally.so/api-reference/api-keys). Review the drafts in Tally before publishing; the script sets `DRAFT` by default. The API is free on the Tally free plan.

## Analysis

At eight to twelve responses, the numbers are anecdotes, not evidence. Read the free text first.

1. **Completion.** Share of invited testers who submitted. Below 50% means the form or the pilot instructions are too heavy.
2. **Sign-in.** Success rate among testers who tried, split by path. Attribute failures to a step, not to "login broken".
3. **Real versus demonstration.** Count `Nein` and `Teilweise`. Any concentration means provenance labels are missing.
4. **Frustration themes.** Code Q12 and Q13 into five buckets: sign-in, empty states, real-versus-demo confusion, missing or wrong data, performance. The most frequent theme is the next sprint, ahead of the Q14 answer.
5. **Weekly habit.** Combine Q13 `Auf jeden Fall` and `Wahrscheinlich`. Below 40% means the wedge is not proven, whatever the ratings say.
6. **Sean Ellis.** Share of Q14 `Sehr enttäuscht`. Above 40% is the classic product-market-fit threshold; above 25% is encouraging at beta scale. Do not quote either figure without the sample size.
7. **Cross-tabs.** Demo-profile versus own-account testers, and sign-in success versus weekly intent. These two splits explain most of the variance.

Write a one-page readout: sample size and cohort, completion, five findings with one consented quote each, three decisions, and what will explicitly not be built. Keep aggregate counts and consented quotes in the repository; keep raw responses and contact details out of it.

### Thresholds that should change a decision

| Signal | Action |
| --- | --- |
| Below 50% complete sign-in | Freeze new features and fix onboarding first |
| Trust mean below 3 | Do not widen the beta; publish the data-flow explanation and wait for OIDC |
| More than 20% answer "Nein" to Q8 | Add visible data-provenance labels per screen |
| Below 40% weekly use | The wedge is unproven; interview the non-returners before building |
| Below 25% "Sehr enttäuscht" | Not yet product-market fit; keep the pilot small |
| One frustration theme dominates | That theme leads the next sprint, ahead of the Q14 feature |

## Privacy and ethics

- The demonstration record is fictional. The intro says so, and the recruitment message repeats it.
- The demo profile is the default test path. A tester who wants to try the beta sign-in reads [campus-browser-login.md](../engineering/campus-browser-login.md) first and decides for themselves.
- The questionnaire never asks for a password, token, matriculation number, or a screenshot that might contain one.
- Free text can identify a person even when the form does not ask for a name. Treat responses as pseudonymous, not anonymous, and check every quote before publishing it.
- Contact details live in a separate form. Delete the contact list after the interviews and the raw responses twelve months after the readout. Keep only aggregate counts and consented quotes.
- A tester can withdraw at any time, including after submitting. The intro links to a contact address for that.

## Known limitations

- Self-selection: volunteers are not a random sample of students.
- Recruiting through friends of the author over-represents one programme and one social circle. [beta-recruitment.md](beta-recruitment.md) sets a minimum spread.
- Most testers will see the demonstration record, not their own data. Q8 measures whether they understood that, but it does not validate live sync.
- There is no control group and no before-and-after baseline. The pilot can show that the app is usable and wanted; it cannot show that it improves grades or saves a measurable number of hours.
