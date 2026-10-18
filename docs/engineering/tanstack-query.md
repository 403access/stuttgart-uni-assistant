# TanStack Query

Every read and mutation that touches a server, the SQLite device cache, or a portal result goes through TanStack Query (`@tanstack/react-query`). Screens hold no `useState` copies of that data and no `.then()` hydration chains: queries own the reads, mutations own the writes the user triggers.

## Wiring

`src/query/client.tsx` creates the `QueryClient` and mounts `QueryProvider` inside `AppStateProvider` (queries key on its state, so the provider order matters).

Defaults:

| Option | Value | Reason |
| --- | --- | --- |
| `staleTime` | 30 000 ms | Server snapshots stay usable between short visits. |
| `gcTime` | 10 min | Unused keys free themselves. |
| `retry` | false | The server already retries; the UI retry buttons call `refetch()` or `mutate()` instead. |

Two managers connect the outside world:

- Focus (web only): `AppState` on native already remounts queries through navigation; `focusManager.setFocused` is wired to `AppState` events so a returning browser tab refetches.
- Online: `expo-network` (`getNetworkStateAsync` + `addNetworkStateListener`). The listener subscription is removed on unmount.

## Query keys

`src/query/keys.ts` is a typed factory. Roots: `['app']`, `['app', 'campus']`, `['app', 'oidc']`, `['app', 'catalog']`. Inside `campus`:

- `device*` keys (`deviceNodes`, `deviceCourses`, `deviceCourse`, `deviceCoursesByElement`, `deviceTrees`, `coursesFetchedIds`, `coursesSync`, `syncInfo`) answer from the SQLite cache or the session course map. They use `staleTime: Infinity` — the store only changes through local writes, so they never redeliver on their own; writers call `setQueryData` or `invalidateQueries`.
- `server*` keys (`serverTree`, `serverCourses`, `serverCalls`) answer from the assistant server and follow the default stale time.
- `apiLog`, `campusStatus`, `campusStudies`, `oidcStatus`, `catalog` cover the remaining reads.

`src/query/queries.ts` exports `queryOptions` factories (`deviceNodesQuery`, `deviceCoursesQuery`, `serverCoursesQuery`, `syncInfoQuery`, `deviceTreesQuery`, `coursesFetchedIdsQuery`, `coursesSyncQuery`, `apiLogQuery`, `serverCallsQuery`). Each accepts `{ enabled }` so a screen can withhold a question until a study is selected.

## Mutations

`src/query/mutations.ts` holds the shared `campusSyncMutation()`. It wraps `runServerSync` (`src/campus/server-sync.ts`): the polling loop runs inside the mutation function, progress and cancel hooks travel as variables, and the caller resolves `isPending` plus `onSuccess`/`onError`/`onSettled`. Three screens use it: course sync (`app/kurse.tsx`), structure sync (`src/components/campus-info-view.tsx`), and the per-study browser sync (`app/strukturen.tsx`).

Other flows use one `useMutation` per screen:

| Flow | Screen | Notes |
| --- | --- | --- |
| C@MPUS token sign-in, SIAM sign-in, browser harvest | `src/auth/use-login-flow.ts` (rendered by `app/login.tsx`) | Success commits to AppState; failure sets the inline message and the retry toast targets `mutate()`. |
| Study switch | `src/components/study-selector.tsx` | Commits only when the portal answered; `variables` names the pending study for the chip label. |
| Calendar export and database sync | `app/(tabs)/kalender.tsx` | The download side effects (blob link, share sheet) live in the mutation function. |
| API replays | `app/api.tsx` | Adopting nodes, studies, and a login from a portal response happens in `onSuccess`. |
| Chat remote rewrite | `app/(tabs)/chat.tsx` | The local campus answer is posted first; Grok's text replaces it in `onSuccess`. A failed or absent rewrite keeps the local answer. |
| Document refine | `app/dokument/[id].tsx` | Same pattern with the local summary as the seed. |

Toasts (`showFetchAlert`) stay user-initiated: query errors render as inline text (tap to refetch), mutation errors raise the alert with a retry button wired to `mutate()`.

## Device-cache writes

Writers update the query cache instead of copying rows into screens:

- After a sync: `setQueryData` refreshes `deviceNodes`, `deviceCourses`, `coursesFetchedIds`, `coursesSync`; `server*` keys are invalidated.
- Cross-device catch-up (`app/kurse.tsx`): the server snapshot merges into SQLite once per study (guarded by a ref), then invalidates the device keys so the query re-reads the store.
- Cache clears: store deletion followed by `setQueryData` to empty the keys or `invalidateQueries` on the scope.
- The Kurse screen keeps per-study keys, so a late sync completion safely writes rows for a study no longer on screen; `success` is written to the keys keyed by its own `studyId`.

## Rules of use

1. Reads never call SQLite or the fetch wrappers directly; they go through `useQuery(...)` with a factory from `src/query/queries.ts`.
2. User-triggered server and store writes go through `useMutation`; no fire-and-forget `.catch(() => undefined)` chains in screens.
3. Screen-local state remains for progress, selection, filters, and mirroring flags (`running`, `syncing` map to `isPending` derived values).
4. AppState stays authoritative for session, profile, and curriculum commitment; queries only move data in and out around it.
