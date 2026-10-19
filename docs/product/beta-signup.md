# Beta signup

The one intake form for testers. It collects contact details, the test device, and one qualitative answer, so the pilot has a single list instead of a scattered reply thread.

Status: **live.** Form: [tally.so/r/kbaB7Z](https://tally.so/r/kbaB7Z) · Tally id `kbaB7Z` · recorded in [beta-forms.json](beta-forms.json).

The form is bilingual in one document: German first, English in the same label. Tally's own interface language is German. The other forms are split by language; this one is short enough that a single link is easier to share.

## Fields

| # | Field | Required | Why it is there |
| --- | --- | --- | --- |
| 1 | Name | Yes | To address the tester and keep the contact list readable |
| 2 | Email | Yes | The primary channel for the build link, onboarding, and the survey |
| 3 | Phone | No | Optional. Only for scheduling an interview or an urgent beta issue. A tester can join without giving a number |
| 4 | Device | Yes | `iOS` or `Android`. Shapes which build to send and whether the cohort is balanced |
| 5 | Frustration with current platforms | Yes | One open answer: what C@MPUS, ILIAS, Uni-Mail, or the current workflow does badly. Used to segment testers and to check whether the app addresses a real complaint |
| 6 | Consent | Yes | Contact and storage until the end of the beta, with withdrawal on request |

The form does **not** ask for a C@MPUS password, token, matriculation number, or screenshots. The device question is a single choice; a tester with both phones picks the one they will test on.

## Why the phone number is optional

The pilot can run entirely over email. A phone number is useful for scheduling a 15-minute interview, but making it mandatory lowers signups and adds personal data that most of the pilot does not need. If an interview needs a call, ask for the number then, in the interview form.

## Privacy

This form is **identifiable**, unlike the survey:

- The survey is pseudonymous and has no contact fields.
- The interview form keeps contact details, but in a separate form from the survey answers.
- This signup form is deliberately identifiable because its purpose is to contact the tester. Say so in the intro, and do not merge these rows into the survey export.

What is stored and where:

- Tally hosts the form and its responses. Tally describes itself as made and hosted in the EU; check [Tally's GDPR page](https://tally.so/help/gdpr) before publishing if your institution needs a data-processing agreement.
- The repository stores only the form link and id, never the responses.
- Keep the exported signup list out of git. Use participant codes `P01`–`P20` in the pilot tracking sheet and keep the code-to-contact mapping in a separate, access-controlled list.
- Delete the contact list after the last interview. Tell testers they can withdraw and have their row removed.
- Do not publish a frustration quote with a name attached. If a quote is useful, anonymise it and ask the tester before quoting.

## How it fits the pilot

```text
signup form → onboarding message → 5–7 days of use → survey → interview
```

1. Share the signup link in the invite instead of collecting replies by hand.
2. Check the list, send the build and the four onboarding tasks, and note the device.
3. On day 6, send the survey to people who actually used the app. Send the three-question non-user follow-up to the rest.
4. Book interviews from the separate interview form, not from the signup list, so the survey and the conversation stay unlinked.

The funnel is described in [beta-recruitment.md](beta-recruitment.md). The questionnaire is [beta-survey.md](beta-survey.md); the conversation is [beta-interview-guide.md](beta-interview-guide.md).

## Operating the form

- Recreate or reuse it with `npm run beta:forms -- --signup`. The command creates the form as published if no signup entry exists, and prints the link. Use `--force` to create a fresh one.
- `npm run beta:forms -- --publish` republishes every form in `beta-forms.json`, including this one, and re-sends the full block set.
- Export responses from Tally as CSV. Keep the raw file out of git; copy only aggregate counts into the readout.
- The device split is the first number to look at: if the cohort is almost all iOS, the Android build has not been exercised and the survey results cannot speak for it.
- Code the frustration answers into the same themes as survey Q12 (sign-in, empty states, real-versus-demo confusion, missing or wrong data, performance). If the signup complaints and the in-app frustrations point at different things, the app is solving the wrong problem.

## Limitations

- The form is self-selected, like every open signup. It will over-represent the channels it is posted in.
- The frustration answer is written before the tester uses the app, so it is a baseline, not an evaluation of the app.
- A phone number, even optional, raises the bar for some students. Watch the completion rate and drop the field if it costs more signups than it saves.
