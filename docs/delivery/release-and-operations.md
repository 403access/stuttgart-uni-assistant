# Release and operations

How to run the prototype, what "released" means today, and the checks that gate a change. Nothing in this file has been submitted to an app store or deployed to a public host.

## Day to day

Requirements: Node.js 22 or newer. This build was created with Node 24.

```bash
cd stuttgart-uni-assistant
npm install
npm run typecheck
npm run check
npx expo start
```

Scripts in `package.json`:

| Script | Command | Use |
| --- | --- | --- |
| `start` | `expo start` | Dev server, then Expo Go, a simulator, or the web UI |
| `web` | `expo start --web` | Browser |
| `ios` / `android` | `expo start --ios` / `--android` | Simulator or emulator |
| `typecheck` | `tsc --noEmit` | Types for the app and the check script |
| `check` | `tsx scripts/check-assistant.ts` + `tsx scripts/check-campus-db.ts` + `node --test` | Catalog totals, German answers, campus DB round-trips (real SQLite via node:sqlite, AsyncStorage faked), the OIDC and campus server tests, the secrets CLI tests |
| `assistant` | `node server/index.mjs` | Local Grok proxy on port 8787 |
| `campus:token` / `campus:session` | `node scripts/set-campus-secret.mjs` | Write `CAMPUS_BEARER_TOKEN` / `CAMPUS_SESSION_COOKIE` into git-ignored `.env` |
| `campus:secret` | `node scripts/set-campus-secret.mjs` | `list` shows which secrets are set, masked; `--help` shows usage |

Sign in with **Mit SIAM anmelden** when `OIDC_CLIENT_ID` and `OIDC_CLIENT_SECRET` are in `.env`, or open the demonstration profile. There is no password field. The URLs and the TIK registration step are in [oidc-login.md](../engineering/oidc-login.md).

### Assistant process

```bash
cp .env.example .env
# set XAI_API_KEY in .env — do not commit .env
npm run assistant
curl -s http://127.0.0.1:8787/health
```

Rotate the C@MPUS secrets without editing the file by hand: `npm run campus:token -- <token>` and `npm run campus:session -- <PSESSIONID>`. A pasted `Bearer` header or a full cookie string is reduced to the bare value, the value can be piped or typed without echoing, and `npm run campus:secret -- list` reports masked status. Restart `npm run assistant` after a change.

Restart the assistant server after every server code change as well, not only after secret changes. An old process answers new calls in the old error shape (no `detail`), which the app reports as `… ohne Detail` — the absence of `[campus #N]` request lines in the server terminal confirms the staleness. The campus logs and the diagnosis steps are in [campus-logging.md](../engineering/campus-logging.md).

The server keeps its portal mirror in `server/campus-server.db` (git-ignored, `CAMPUS_DB_PATH` overrides the path, Node 22.5+ for `node:sqlite`). It survives restarts; delete the file to start from an empty store. Background sync jobs do not survive restarts, but their stored rows do, so the next run resumes.

Healthy and unconfigured:

```json
{"ok":true,"model":"grok-4.7","configured":false,"oidc":{"configured":false},"campus":{"tokenConfigured":false,"sessionCookieConfigured":false,"studyId":339485,"elementId":278343}}
```

`POST /v1/assist` without a key returns 503 `{ "error": "missing_key" }`. The app then keeps the local answer.

On a phone, set `EXPO_PUBLIC_ASSISTANT_URL` to `http://<computer-lan-ip>:8787` before starting Expo. Restart Expo after changing it, because public env vars are read at bundle time. Use `off` to force the local engine.

Stop the assistant process when you are done. It listens on `0.0.0.0`. Leave it running only while you are demonstrating on the LAN.

### Web export

```bash
npx expo export --platform web --output-dir /tmp/stuttgart-uni-web
```

This writes a static bundle and renders the routes. It is a build check, not a hosting setup. The export directory in `/tmp` is disposable.

## Environments

| Name | Client | Data | Assistant |
| --- | --- | --- | --- |
| Local demo | `npx expo start` or `npm run web` | Bundle + Async Storage | Optional, same machine |
| Device demo | Expo Go or a dev build | Same | LAN URL in `EXPO_PUBLIC_ASSISTANT_URL` |
| Later preview binary | EAS, not configured | Still the fictional record | Server host with the key in the environment |
| Later production | Store build under the demo bundle id only until a real owner exists | Per-student data from a backend | Same proxy pattern, connectors behind the backend |

There is no staging server in this repository.

## Configuration map

| Piece | Where |
| --- | --- |
| Display name, scheme `stuttgartuniassistant`, light mode, splash `#004191` | `app.json` |
| Bundle id `dev.demo.stuttgartuniassistant` | `app.json`, iOS and Android |
| File sharing and opening documents in place | `expo-file-system` plugin in `app.json` |
| On-device curriculum, course, and call cache | `expo-sqlite` plugin in `app.json`. Included in Expo Go; on web the cache falls back to AsyncStorage |
| Secrets | `.env`, git-ignored |
| Public assistant URL | `EXPO_PUBLIC_ASSISTANT_URL` |

Do not generate or commit `ios/` and `android/`. When a binary is actually required:

```bash
npx expo prebuild
npx expo run:ios
npx expo run:android
```

Cloud builds need an `eas.json` and an Expo account. Add those in a change that names who owns the bundle id. The id should stay on `dev.demo.*` until the project is no longer a demonstration.

## Release gate for a change in this repo

1. `npm run typecheck` exits 0.
2. `npm run check` exits 0. If an assertion moved, the catalog and the docs moved with it.
3. `npx expo export --platform web` completes when the change touches navigation, native-module imports, or the document reader.
4. `GET /health` still returns the JSON above when the server changed.
5. The diff does not add `.env`, a live key, the university signet, or an exam PDF.

Interactive sign-in is still a manual step. Say so when you report a UI change you could not click.

## Dependency hygiene

Install Expo libraries with `npx expo install <package>` from the project directory, not from the Desktop folder and not with a raw version pin that ignores the SDK.

`npm audit` reports issues inherited from the SDK. Do not run `npm audit fix --force`. Upgrade through Expo's installer when you choose a newer SDK, then re-run the gate.

## Operations the app does not have

- No crash reporter, no analytics, no remote logging.
- No backup of Async Storage. Reset and uninstall are the recovery tools.
- No rate limit on the proxy beyond the body cap and the upstream timeout. Do not expose it on the public internet with a key installed.
- No on-call rotation. The maintenance rules for changing the record are in [the maintenance note](../sdlc/08-maintenance.md).

## Support answers that match the product

- "Is this the university app?" No. It is a student demonstration. Sign-in can use the university identity provider. The timetable in the app is still the demonstration record.
- "Where do I put my password?" Only on `https://idp.uni-stuttgart.de`. The `.env` file takes the OIDC client id and secret from TIK, and optionally `OIDC_LOGIN_HINT` for the account id.
- "Why did chat answer without the internet?" The campus engine is local. Grok is a rewrite when the proxy and the key are both present.
- "Can I upload an Altklausur PDF?" The screen indexes topics only. This project does not host exam files.
