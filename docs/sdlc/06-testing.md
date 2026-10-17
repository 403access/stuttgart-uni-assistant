# 6. Testing

## Purpose

Catch a wrong credit total or a fabricated answer before a screen redesign hides it. The record is the product. The tests pin the record.

## What is checked automatically

`npm run check` runs `scripts/check-assistant.ts` against the real catalog, with the clock fixed at 13 October 2026, a Tuesday.

| Check | Expected |
| --- | --- |
| Passed / enrolled / open / total | 90 / 18 / 72 / 180 |
| Weighted average | 1.9 |
| Next-semester suggestion | 30 ECTS, includes numerics and the internship, excludes Machine Learning and the thesis |
| "Wie viele ECTS fehlen mir noch?" | Mentions 90, 180, and the grade 1,9 |
| "Wo ist die Mensa in Vaihingen?" | Mentions Pfaffenwaldring 45 |
| "Wann endet die Prüfungsanmeldung?" | Mentions 16.11.2026 |
| "Was habe ich heute?" | Mentions the AI lecture and V47.02 |
| "Kann ich Maschinelles Lernen jetzt belegen?" | Names M-INF-640 and says it is not yet open |
| Summary of the week-3 slides | Keeps the token A* |

`npm run check` also runs `node --test server/oidc.test.mjs server/campus.test.mjs scripts/set-campus-secret.test.mjs scripts/tunnel-assistant.test.mjs`. The OIDC test checks the authorize URL, the redirect allowlist, and that a password variable is not copied into the request. It does not sign in to the identity provider. The campus test pins the curriculum mapping, the study-chooser mapping, and the catalog of replayable routes. The secrets test pins the CLI that writes `CAMPUS_BEARER_TOKEN` and `CAMPUS_SESSION_COOKIE`: header and cookie normalization, `.env` line replacement, the masked `list` output, and refusal cases (`--help` as a value, unknown flags, whitespace, empty input). The tunnel test pins the assistant-tunnel helper ([assistant-tunnel.md](../engineering/assistant-tunnel.md)): the hostname read out of the `cloudflared` box, the split-across-chunks case, the refusal of a named-tunnel URL, `--port` parsing, and the missing-`cloudflared` message. The CLI runs are executed against a copy of the script in a temporary directory, so the real `.env` is never touched.

`npm run typecheck` runs `tsc --noEmit` over the app, the domain, and the check script.

The assistant server is checked by starting it and requesting `GET /health`. With no key, the body is `{ "ok": true, "model": "grok-4.7", "configured": false }`.

## What was checked by building

`npx expo export --platform web` bundles the client and statically renders every route, including login, the five tabs, and the dynamic screens (module, room, document, person, notice, exam). A broken import or a crash during render fails that export. It does not click through the app.

## What this pass does not prove

- No device lab run on a physical iPhone or Android phone in this session.
- No browser click-through of sign-in, import, and chat. Those flows are implemented and typecheck, and the web bundle renders, but they were not exercised with a pointer.
- No live call to Grok. The request body matches the Responses API quickstart (`model`, `input`, `store: false`). A call with a real key is a manual check once `XAI_API_KEY` is present.
- No accessibility audit and no screenshot comparison against the corporate-design manual.

## How to re-run

```bash
npm run typecheck
npm run check
npx expo export --platform web --output-dir /tmp/stuttgart-uni-web
npm run assistant
curl -s http://127.0.0.1:8787/health
```

## Exit check

The prototype's test bar is the table above plus a successful web export. Failing any row in the table means the record or the answer writer changed and the screens are no longer telling the same story. Update the catalog and the check together, on purpose.
