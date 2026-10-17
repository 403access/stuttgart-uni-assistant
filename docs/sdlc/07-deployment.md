# 7. Deployment

## Purpose

Describe how the prototype runs today, and what a later release has to add before anyone outside the project installs it.

This phase is specified. The app has not been submitted to TestFlight, the Play Console, or a hosting service.

## Environments

| Environment | Client | Record | Assistant |
| --- | --- | --- | --- |
| Local demo | `npx expo start`, Expo Go, or `npm run web` | Bundled catalog plus Async Storage | Optional `npm run assistant` on the same machine |
| Device demo | Expo Go or a development build | Same | `EXPO_PUBLIC_ASSISTANT_URL` set to the computer's LAN address |
| Device demo, off the LAN | Expo Go | Same | `npm run assistant:tunnel` hostname in `EXPO_PUBLIC_ASSISTANT_URL`, Expo through `npm run tunnel` ([assistant-tunnel.md](../engineering/assistant-tunnel.md)) |
| Later internal build | EAS development or preview profile | Still the demonstration record, until a connector exists | Assistant server deployed with `XAI_API_KEY` in the host environment, not in the app |
| Later production | Store binaries | Per-student record from a backend | Same server pattern, with university connectors behind it |

## Configuration

`app.json` holds the display name Stuttgart Uni, the scheme `stuttgartuniassistant`, the light interface, tablet support, and the demo bundle identifiers:

- iOS: `dev.demo.stuttgartuniassistant`
- Android: `dev.demo.stuttgartuniassistant`

The file-system plugin turns on opening documents in place and file sharing, so a later binary can see imports from the Files app. The splash color is mid blue `#004191`.

Secrets:

- `XAI_API_KEY` only in the server environment or a git-ignored `.env`. `.gitignore` ignores `.env`.
- `EXPO_PUBLIC_ASSISTANT_URL` is public by design. It is a URL, not a credential.

## Build path when a binary is needed

Do not commit `ios/` or `android/`. When a binary is required:

```bash
npx expo prebuild
npx expo run:ios
npx expo run:android
```

Or, without local Xcode and Android Studio, use EAS and the same `app.json`. A cloud build is not configured in this repository yet. Adding it means an `eas.json`, an Expo account, and a decision about who owns the bundle id.

## Web

`npx expo export --platform web` writes a static bundle. It is enough to prove the routes render. It is not a hosted environment. A public web deploy would need a host, the assistant URL of that environment, and the same disclaimer the sign-in screen already shows.

## Release gate

A build is eligible to leave the author's machine when:

1. `npm run typecheck` and `npm run check` pass.
2. The web export completes.
3. The sign-in screen still sends the password nowhere, and it names the identity-provider URL.
4. No secret is in the diff.
5. The version in `app.json` is the version being handed to someone.

Store review, privacy nutrition labels, and a university trademark conversation are part of a later release, not of this prototype. See [security-and-privacy.md](../engineering/security-and-privacy.md).

## Exit check

Deployment of the prototype is "run from source". The exit check for a future binary is the gate above, plus a signed build that still shows the demonstration record rather than an empty production shell.
