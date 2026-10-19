# Beta interview guide

A 15-minute conversation with a tester, run after the survey. The survey shows what happened across the cohort; the interview shows why. Five conversations will teach more than fifty responses, so run these even if the survey sample is small.

## Before the interview

- Book a slot within a week of the survey closing. Memory fades quickly.
- Ask the tester to have the app installed and to use the demo profile, not their own account. If they used real credentials, ask them to sign out before sharing their screen.
- Read the consent script below. Do not record without explicit permission.
- Have the capture template ready. One interviewer, one note-taker if possible.
- Do not demo features. If the tester cannot find something, that is the finding.

### Consent script

> Thanks for the time. I am [name], a student at [programme]. This is a student project, not an official university service. I want to learn where the app got in your way, not sell it to you. May I take notes? [If recording: may I record the audio? I will delete it after transcription.] You can skip any question and stop at any time. I will not publish your name or a quote without asking you first.

## Structure

| Time | Segment | Purpose |
| --- | --- | --- |
| 0:00 | Consent and context | Set expectations, get permission |
| 0:02 | Baseline | Learn the current workflow before the app |
| 0:05 | Observation | Watch one real task, without helping |
| 0:10 | Friction and gaps | Turn observations into specifics |
| 0:13 | Adoption and close | Test the retention decision |

## Questions

Ask these in order. Follow the tester's words, not the script. Silence is a tool: count to five before prompting.

### 1. Baseline (3 min)

> Tell me about the last time you checked your timetable or a deadline. Walk me through what you did, from picking up your phone.

Probes:

- Which app or website did you open first?
- How many steps was that?
- What annoyed you about it?
- What did you do when the information was not there?

This establishes what the app has to beat. Do not mention the app yet.

### 2. Observation (5 min)

> Open the app and show me the last thing you did in it. Please think out loud.

Rules:

- Do not touch the phone or the keyboard.
- Do not answer "where is it?" for the first 60 seconds. Note the hesitation instead.
- If they are completely stuck after a minute, ask: "What are you looking for right now?" Then help.
- Watch for the first screen they land on, the first tap, and the first back gesture.

### 3. Friction and gaps (3 min)

> Where did you hesitate, or want to give up?

> What did you do outside the app that you expected to do inside it?

> If you had to delete one screen, which would it be, and why?

Probes:

- What did you expect that screen to do?
- What did you think would happen when you tapped that?
- Which part did you trust least?

The deletion question is a forced choice. It surfaces the screen testers tolerate rather than value, which ratings rarely do.

### 4. Adoption and close (2 min)

> Would you install this on your main phone today? Why, or why not?

> What would make you stop using it after one week?

> Who else should I talk to about this?

The first question is behavioural, not hypothetical: "today" and "main phone" are concrete. The second names the retention risk before it happens.

## Do not

- Ask "Do you like it?" or "Would you use feature X?" Both invite polite answers.
- Explain a feature the tester missed. The miss is the data.
- Defend a decision. Say "thank you, that is useful" and write it down.
- Ask them to rate anything. The survey already did that.
- Show the roadmap. It changes what they say next.
- Keep going past 15 minutes. Fatigue produces agreement, not insight.

## Capture template

Copy this into the notes for each participant.

```text
Code:            P__
Date / duration:
Build / device:
Sign-in path:    demo / own / token / OIDC / none
Baseline tools:

Observation
- First screen:
- First tap:
- Hesitations (with timestamps):
- Where I had to help:

Friction
1.
2.
3.

Quotes (verbatim)
- "
- "
- "

Gap: what they did outside the app
Deletion answer:
Install on main phone: yes / no / maybe — why
Stop-after-a-week risk:
Surprise:
Decision implication:
Follow-up:
```

## Analysis

- Run five interviews, then affinity-map the notes into themes. Recruit more only if the fifth interview still adds a new theme; stop when two consecutive interviews add nothing.
- Separate observation from interpretation. "Tapped Kalender three times, then searched" is observation. "Confused by the calendar" is interpretation.
- Compare the interview themes with the survey's Q12 buckets. Where they disagree, trust the interview for *why* and the survey for *how often*.
- Keep quotes verbatim and check each one for identifying detail before it goes into a readout.
- The output is the same one-page readout as the survey: sample, five findings, three decisions, and what will not be built.

## Ethics and data

- Delete audio after transcription. Delete the contact list after the last interview.
- Do not photograph a screen that shows a real account, a real timetable, or an email address.
- If a tester discloses a security problem, stop the interview, take it privately, and do not put the details in shared notes.
- A tester can withdraw after the interview. Remove their quotes and notes on request.
