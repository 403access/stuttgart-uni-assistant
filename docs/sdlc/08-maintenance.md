# 8. Maintenance

## Purpose

Keep the demonstration true after the first build: the numbers, the disclaimer, the dependencies, and the boundary with the university.

## What drifts

| Thing | How it drifts | What to do |
| --- | --- | --- |
| Expo SDK | A new SDK changes file-system, router, and picker APIs | Read the versioned docs for the SDK in `package.json` before editing those calls. Install with `npx expo install` |
| The xAI model id | The quickstart names the current model | Before changing `server/index.mjs`, re-read the text-generation quickstart and copy the model id and the request shape |
| The curriculum story | A module added by hand breaks 180 ECTS | Run `npm run check`. Fix the catalog or the expectation in the same change |
| Copy | A new screen forgets English or the demonstration label | German and English ship together in `src/i18n/de.ts` and `src/i18n/en.ts`. Add the key to both; English is typed against the German keys, so `npm run check` fails when one is missing ([i18n.md](../engineering/i18n.md)). Credit surfaces keep the word Demonstration |
| Dependencies | `npm audit` reports issues in the Expo tree | Don't force-upgrade past the SDK pin. Take the Expo-compatible bump |

## Operating rules

- Do not add a client-side call that posts the university password to a project server. The authorize redirect in `server/oidc.mjs` is the login for the SIAM path.
- The C@MPUS automated sign-in is the one accepted exception that stores the university password: only in `expo-secure-store` via [vault.ts](../../src/auth/vault.ts), only after the user opts in, optionally behind biometrics, never in Async Storage, never in `.env`, never sent to the assistant server, and deleted on sign-out. Do not widen it — no logging, no copying to another store, no auto-retry with a second account.
- Do not put `XAI_API_KEY` in `EXPO_PUBLIC_*` or in source.
- Do not add exam PDFs to `src/data` or to the document hub.
- Do not replace the drawn mark with the university signet.
- If a screen shows a grade, a room, or a deadline, it must be traceable to `src/data` or to something the user typed.

## Changing the record

The fictional student is a fixture, not a config file scattered through the UI. Change her semester, a grade, or a room in `src/data`, then update `scripts/check-assistant.ts` so the new fact is the one the answers assert. Screens should not need a parallel edit if they already read the catalog.

## Support posture

There is no production on-call. If the local assistant is wrong, the bug is in `buildLocalAnswer` or in the catalog. If Grok is wrong while the campus answer was right, the bug is the prompt or a fact that `renderFacts` dropped. If Grok is silent, the app is working as designed: the campus answer remains, and `/health` tells you whether a key is configured.

## End of life for the prototype

The prototype should be retired, not slowly turned into a scraper, when a real integration starts. The replacement path is a backend that holds the service credentials, a SIAM authorization-code login, and a record with the same shape as `AnswerInput`. The screens can stay. The bundled grades cannot become a fallback for a signed-in real student. An empty or explicit error state is safer than showing Lena Hartmann's average to someone else.

## Exit check

Maintenance is in force as long as this repository is the demonstration. The check is social as much as technical: a pull request that fetches official pages with a student's password outside the documented vault path does not get merged, regardless of how complete the feature looks. The vault path is bounded by [campus-browser-login.md](../engineering/campus-browser-login.md) and the operating rules above.
