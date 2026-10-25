# TanStack Store

The app state lives in a TanStack Store (`@tanstack/store`, read through `@tanstack/react-store`). There is no app-state React context: components subscribe to the slice they read, so a locale change does not re-render the chat, and an arriving mail row does not re-render the tab bar.

## Files

| File | Responsibility |
| --- | --- |
| `apps/mobile/src/state/app-store.ts` | `appStore` (`AppStoreState`), `updateApp`/`patchApp`, and the persisted-slice helpers |
| `apps/mobile/src/state/actions/` | Plain action functions: session, sign-in, resume, account, appearance, content, chat |
| `apps/mobile/src/state/actions/index.ts` | `appActions`, one stable object with every action |
| `apps/mobile/src/state/use-app-store.ts` | `useAppSelector` (one slice) and `useAppState` (whole store, diagnostics only) |
| `apps/mobile/src/state/use-app-persistence.ts` | Hydration from AsyncStorage plus the write subscription |
| `apps/mobile/src/state/AppStateProvider.tsx` | Mounts hydration, launch session restore, and the cross-device campus snapshot |
| `apps/mobile/src/state/AppState.tsx` | Public entry point; screens import from here |

`AppStoreState` is `PersistedState` plus three runtime fields: `ready`, `authToken`, and `authSessionId`. The runtime fields never reach AsyncStorage; `selectPersisted` strips them before a write and `samePersisted` skips writes when only a runtime value changed.

## Reading

```ts
import { useAppSelector } from '@/src/state/AppState';

const locale = useAppSelector((state) => state.locale);
const campusStudies = useAppSelector((state) => state.campusStudies);
```

Select one field per call. A selector that returns a new object or array on every read would make `useSelector` compare unequal forever; use several calls instead, or pass an explicit `compare` as the second argument.

`useAppState()` subscribes to the whole store and is reserved for the development state screen.

## Writing

Actions are stable functions, not hooks. Import the handles and call them from event handlers, effects, or plain modules:

```ts
import { appActions } from '@/src/state/AppState';

const { setLocale, signOut } = appActions;
setLocale('en');
```

Actions read the current state with `getAppState()` at call time, so they need no dependency arrays and cannot capture a stale locale or token. An action either patches fields (`patchApp`) or computes the next state from the current one (`updateApp`).

The session actions (`establishAuthSession`, `adoptAuthSession`, `clearLocalSession`, `signOut`) also own the device vault writes. The resume action (`refreshOrReauthenticate`) is plain async code; `SessionRefresh` calls it on foreground.

## Persistence

`useAppPersistence` runs two effects:

1. Read `university-assistant/v1`, sanitize it, apply the stored theme, and merge it into the store. `ready` flips to true after the read settles.
2. Subscribe to the store. The subscription writes only when `ready` is true and one of the persisted fields changed by reference — a new bearer token, a `ready` flip, or an unchanged re-render does not touch the disk.

Mail hydration runs in the same first effect, so the inbox tab can paint its cached rows on the first frame.

## Other stores

Three smaller stores use the same library without the app store:

| Store | Consumer | Notes |
| --- | --- | --- |
| `mailStore` (`apps/mobile/src/auth/mail.ts`) | `useMailSnapshot` | Status, folders, rows, active folder; mirrored to `mail-snapshot/v1` |
| `campusLogStore` (`apps/mobile/src/auth/campus-log.ts`) | `useCampusLog` | Last 30 calls of this session, newest first |
| `quizProgressStore` (`apps/mobile/src/quiz/progress.tsx`) | `useQuizProgress` | Attempts, sessions, interrupted rounds; its own AsyncStorage key |

## Relation to TanStack Query

TanStack Query owns server and SQLite reads and the mutations the user triggers. The app store owns committed local state: session, profile, appearance, curriculum selection, downloads, imports, reviews, transfers, and chat. Query results move into the store only when the user commits something (a sign-in, a study switch, an import); queries never mirror a store field, and the store never mirrors a cache entry. The rules in [tanstack-query.md](tanstack-query.md) still apply.
