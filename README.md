# Stuttgart Uni

A study assistant for students at the University of Stuttgart. The app brings the timetable, degree progress, course material, campus orientation, and peer notes into one Expo app, and answers questions about that record in German or English.

This repository is a student demonstration. It is not a service of the University of Stuttgart, it does not use the university logo, and it does not connect to SIAM, C@MPUS, ILIAS, or SDG Campus. The academic record belongs to a fictional student, Lena Hartmann.

## Run the app

Requirements: Node.js 22 or newer.

```bash
cd stuttgart-uni-assistant
npm install
npx expo start
```

Then open the project in Expo Go, an iOS simulator, an Android emulator, or the browser:

```bash
npm run web
npm run ios
npm run android
```

On the sign-in screen, keep the account `st123456` and type any password. The password is discarded. It is not stored and not sent.

## Run the assistant server

The chat and the document tools answer from the on-device record immediately. When the server below is running and `XAI_API_KEY` is set, those answers are rewritten by Grok (`grok-4.7`) through the xAI Responses API. The key stays in the server process.

```bash
cp .env.example .env
# put your key in XAI_API_KEY
npm run assistant
```

The app reads `EXPO_PUBLIC_ASSISTANT_URL`, which defaults to `http://127.0.0.1:8787`. On a physical phone, use the computer's LAN address instead of `127.0.0.1`.

`GET /health` reports whether a key is configured. Without a key the server returns 503 for `/v1/assist` and the app keeps the local answer.

## Checks

```bash
npm run typecheck
npm run check
```

`npm run check` asserts the 180 ECTS demonstration curriculum, the next-semester suggestion, and several German answers (credits, cafeteria, exam registration, Tuesday's lecture, a locked module, a slide summary).

## Where things live

| Path | What it is |
| --- | --- |
| `app/` | Expo Router screens |
| `src/data/` | Demonstration curriculum, places, people, deadlines, documents |
| `src/domain/plan.ts` | Credit totals, prerequisites, next-semester suggestion |
| `src/assistant/` | Local answers, fact sheet, optional Grok call |
| `src/state/AppState.tsx` | Session, language, notes, and chat, stored on the device |
| `server/index.mjs` | SpaceXAI proxy. Holds `XAI_API_KEY` |
| `docs/` | Product description, engineering notes, and the lifecycle write-up |

## Documentation

Start with [docs/README.md](docs/README.md). The original product description is [docs/00-product-description.md](docs/00-product-description.md). The lifecycle, from initiation through maintenance, is under [docs/sdlc/](docs/sdlc/00-overview.md).

## Palette

The interface uses the university's published corporate colors: anthracite `#323232`, mid blue `#004191`, and light blue `#00BEFF`, on a white and mist ground. The mark is an original pair of circles, not the university signet. The licensed Univers typeface is not embedded. The app uses the platform UI font.
