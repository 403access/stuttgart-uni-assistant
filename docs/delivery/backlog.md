# Backlog

Status of the prototype on 13 October 2026. "Done" means the screen or script exists in this repository and matches [the feature catalog](../product/feature-catalog.md). It does not mean a store release or a live university connection.

## Done in this build

- Expo SDK 57 app, Expo Router, TypeScript, German and English.
- Five tabs and the stack screens for modules, people, rooms, documents, notices, exams, platforms, deadlines, feed, requirements, sequence, tutorials, peers, recognition, and settings.
- Fictional 180 ECTS Informatik record for Lena Hartmann, with locks, a 30 ECTS suggestion, deadlines, news, tutorials, reviews, and topic-only past exams.
- Local assistant and the checks in `scripts/check-assistant.ts`.
- Optional Grok proxy (`server/index.mjs`, `grok-4.7`, `store: false`) with a campus fallback.
- ILIAS-style local sync, text import, notes, on-device sharing, reader, extractive summary, export.
- Schematic campus for Vaihingen and Stadtmitte.
- SIAM sign-in through the TIK identity provider (authorization code, secret on the server). Demonstration profile remains. See [oidc-login.md](../engineering/oidc-login.md).
- Server-side users, bearer sessions, one account across C@MPUS, ILIAS, SDG Campus, SIAM, and UniMail, per-user C@MPUS credentials and portal rows, and a token-protected operator dashboard at `/admin`. See [accounts.md](../engineering/accounts.md) and [admin-dashboard.md](../engineering/admin-dashboard.md).
- Documentation of the product, the lifecycle, and this engineering set.
- `npm run typecheck`, `npm run check`, and a web export of the routes. `GET /health` without a key.

## Not done, and accepted

- Pointer click-through on web or a device in the session that produced this build.
- A live call to Grok with a real key.
- A development build or a store binary. No `eas.json`.
- A store binary. No `eas.json`. Encrypted local storage and accounts, except the opt-in C@MPUS autologin vault in `expo-secure-store`.

## Next, in order

The order is the order a follow-up should use. Each item stays inside the demo boundary until the one that explicitly leaves it.

1. **Click-through notes.** Run `npm run web`, sign in, and walk the eight journeys in [personas and journeys](../product/personas-and-journeys.md). Fix whatever the pointer finds. The web export only proved that the routes render.
2. **Assistant smoke with a key.** Start `npm run assistant` with `XAI_API_KEY` set locally, ask one credit question, and confirm the bubble switches to Grok without new grades or dates. Do not commit the key.
3. **Health of the failure path.** `POST /v1/assist` with no key should stay 503, and the app should keep the campus answer. Confirm that once, on purpose.
4. **Today shortcuts.** The Heute screen casts some links. Replace the cast with typed `Href` values if a future Expo Router upgrade rejects them.
5. **Import of a real text file on a phone.** Confirm `expo-file-system` dynamic import on iOS and Android. Web already exports.
6. **Stronger search.** Add embeddings only after the lexical checks still pass. The campus engine remains the fallback when the network is down.
7. **PDF text.** A later reader may extract a text layer. Until then the honest note stays. Do not add a viewer that implies the file was understood.
8. **EAS preview.** Add `eas.json` when someone needs a binary. Keep the bundle id `dev.demo.universityassistant`.
9. **Backend boundary.** The first server feature that is not the xAI proxy should be session and fact-sheet assembly, still on the fictional record, so the client stops shipping the whole catalog only when a connector exists.
10. **University connectors.** Only with an agreement, server-side OIDC, and no password sent to the app backend. The beta C@MPUS vault stores the credential on the device only; replace it with the OIDC refresh token once TIK registers the client. Spec is in [integrations](../engineering/integrations.md).

## Won't in this repository without a new decision

- Official logo, Univers font files, or a `uni-stuttgart.de` bundle id.
- Redistribution of exam PDFs or copyrighted lecture decks.
- Background scraping of C@MPUS or ILIAS.
- `npm audit fix --force`.
- GPS turn-by-turn navigation. A schematic plus street addresses is the campus feature until a map provider is chosen.
- Multi-user chat or a public note dump.

## How to add a module without breaking the checks

1. Edit `src/data/modules.ts` so passed + enrolled + open still equals 180.
2. Recompute the weighted average if the new row is passed.
3. Run `npm run check`. If the suggestion changes, update the assertion and [data-model.md](../engineering/data-model.md) in the same change, and say why the planner moved.
4. Run `npm run typecheck`.
