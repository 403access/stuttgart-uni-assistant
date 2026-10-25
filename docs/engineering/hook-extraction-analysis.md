# Hook extraction analysis

A code-base-wide review of logic that can move out of screens/components into
general-purpose or domain-specific React hooks.

Scope: `apps/mobile/app/` and `apps/mobile/src/` — 165 TS/TSX files, ≈25.7k lines, excluding
`node_modules`, `docs-site`, `server`, `scripts` and `apps/mobile/modules/`. Reviewed at
commit state of 2026-10-20.

---

## 1. Executive summary

The project already has a healthy habit of moving logic into hooks
(`use-login-flow`, `use-mail-inbox`, `use-onboarding-import`, `use-vpn`, …).
The remaining debt is not "no hooks" — it is **the same hook logic being
re-implemented inline in 2–4 places each time**.

Three findings dominate:

| # | Finding | Where | Extracted hook | Est. saving |
|---|---------|-------|----------------|-------------|
| 1 | The C@MPUS sync + server-snapshot hydration pipeline is written four times | `apps/mobile/app/kurse.tsx`, `apps/mobile/app/strukturen.tsx`, `apps/mobile/src/components/campus-info-view.tsx`, `apps/mobile/src/onboarding/use-onboarding-import.ts` | `useCampusSync()` + `hydrateStudySnapshot()` | ~250 lines, 1 source of truth for a critical path |
| 2 | The AsyncStorage/page-lifecycle/async-effect scaffolding (`active` flag, `started` ref, `runId`, `mounted`, `publish`) is copy-pasted | 12 files | `useAsyncEffect`, `useOnce`, `useLatestRef`, `useRetryableRun` | ~120 lines, fewer stale-closure bugs |
| 3 | Search + filter + sort + "merge device store with server snapshot" is re-derived per screen | `kurse`, `kalender`, `calendar-hero`, `api-history`, `mail`, `studium`, `onboarding` | `useActiveStudy`, `useCoursesForStudies`, `useListQuery`/`useCourseFilter` | ~150 lines, consistent behaviour |

Charts of the shape of the problem:

- `useState` appears on **188 lines** across `apps/mobile/app/` and `apps/mobile/src/components/`.
- 12 files hand-roll the `let active = true; … return () => { active = false }`
  effect guard.
- 8 detail routes duplicate an identical `one(value)` search-param helper.
- 3 files duplicate `todayLocal()` and `monthShort()` verbatim.
- 10+ files hand-roll a `busy`/`error`/`try/finally` triple around an async
  action.
- The three onboarding importers live in one 489-line file and repeat the same
  mounted/runId/publish/started/retry scaffolding three times.

The recommended order is: **shared primitives → domain pipelines → view-model
hooks**. Do not start with the view-model hooks; they depend on the primitives.

---

## 2. Method

Signals used:

1. Hook call counts per file (`useState|useEffect|useMemo|useRef|…`).
2. Grep for known repeated idioms (`let active = true`, `setBusy`, `runId`,
   `todayLocal`, `monthShort`, `function one(`).
3. Manual read of every screen >120 lines plus every existing hook.
4. Comparison of "same pipeline, different screen" flows (sync, merge, filter,
   subscribe, poll).

Severity is judged by: number of duplicate sites × risk of divergence ×
distance from the data layer.

---

## 3. Existing hooks inventory

| Hook | File | Lines | Verdict |
|------|------|-------|---------|
| `useApp` | `apps/mobile/src/state/AppState.tsx` | 549 (provider) | Cohesive but too broad (see §8) |
| `useOnboarding` | `apps/mobile/src/onboarding/OnboardingState.tsx` | 254 | Good; shares the persisted-state pattern with `useApp` |
| `useReducedMotion` | `apps/mobile/src/hooks/use-reduced-motion.ts` | 28 | Good; the only "general" hook today |
| `useCampusLog` | `apps/mobile/src/auth/campus-log.ts` | — | Backed by `campusLogStore` (TanStack Store) |
| `useLoginFlow` | `apps/mobile/src/auth/use-login-flow.ts` | 210 | Good domain hook; see note on declaration order |
| `useCampusHeadlessLogin` | `apps/mobile/src/auth/use-campus-headless-login.ts` | 297 | Complex but legitimately stateful; leave mostly as-is |
| `useCampusBrowserLogin` | `apps/mobile/src/auth/use-campus-browser-login.ts` | 87 | Good separation (state only, screen owns mutation) |
| `useMailInbox` | `apps/mobile/src/mail/use-mail-inbox.ts` | 268 | Good, but 11 `useState` + 4 refs; see §6.3 |
| `useMailList` | `apps/mobile/src/mail/use-mail-list.ts` | 77 | Good view-model hook; template for the rest |
| `useCalendarImport` / `useMailImport` / `useTimetableImport` | `apps/mobile/src/onboarding/use-onboarding-import.ts` | 489 | Correct behaviour, heavy duplication; split file + extract scaffolding |
| `useVpn` | `apps/mobile/src/vpn/use-vpn.ts` | 124 | Good |
| `useVpnProfile` | `apps/mobile/src/vpn/use-vpn-profile.ts` | 54 | Good, tiny |

**Takeaway:** the existing hooks are not the problem. The screens are.

---

## 4. Prerequisites: move pure helpers before extracting hooks

These are *not* hooks. Extracting them first makes the hook diffs smaller and
removes copy-paste that hooks would otherwise have to import.

| Helper | Duplicated in | Move to |
|--------|---------------|---------|
| `todayLocal(date)` | `apps/mobile/app/(tabs)/kalender.tsx:258`, `apps/mobile/app/onboarding.tsx:871`, `apps/mobile/src/components/calendar-hero.tsx:23` | `apps/mobile/src/text.ts` (or new `apps/mobile/src/date.ts`) |
| `monthShort(iso, locale)` | `apps/mobile/app/(tabs)/kalender.tsx:253`, `apps/mobile/app/onboarding.tsx:867`, `apps/mobile/src/components/calendar-hero.tsx:18` | same |
| `weekdayOf(iso, locale)` | `kalender.tsx:268`, `calendar-hero.tsx:27` | same |
| `shiftDay(iso, delta)` | `kalender.tsx:262` only, but reusable | same |
| `one(value)` search-param unwrap | `pruefung/[id]`, `chat`, `modul/[id]`, `kurs/[id]`, `raum/[id]`, `dozent/[id]`, `meldung/[id]`, `dokument/[id]` | `apps/mobile/src/text.ts` as `firstParam()` |
| `isAssigned(status)` (Fixplatz) | `kalender.tsx:28`, `calendar-hero.tsx:14` | `apps/mobile/src/domain/courses.ts` |
| `paletteFor(type)` | `kalender.tsx:33` only, but course-colour logic | `apps/mobile/src/domain/courses.ts` |
| `minutesOf(iso)` | `kalender.tsx:48` | `apps/mobile/src/domain/courses.ts` |
| `mergeCourses(stored, remote)` | `kurse.tsx:62-67`, `onboarding/use-onboarding-import.ts:268-272`, `calendar-hero.tsx:41-47`, `kalender.tsx:73-83` | `apps/mobile/src/campus/merge.ts` as `mergeById()` |
| `germanDate(date)` | `kalender-export.tsx:17`, `onboarding/use-onboarding-import.ts:63` | `apps/mobile/src/date.ts` |
| `formatStamp` / `importWhen` | `konto.tsx:45`, `kalender-export.tsx:27` | `apps/mobile/src/date.ts` |

> Rule of thumb: if a helper is pure, deterministic, and locale-aware, it belongs
> in `apps/mobile/src/text.ts` or a domain module — never in a hook.

---

## 5. General-purpose hooks (Tier 1)

These have no domain knowledge and can live in `apps/mobile/src/hooks/`.

### 5.1 `useLatestRef`

**Problem.** Six files keep a ref mirror of a value so async callbacks see the
current value without re-creating the callback:

- `apps/mobile/src/mail/use-mail-inbox.ts:50` (`messagesRef`), `:58` (`folderRef`)
- `apps/mobile/src/onboarding/use-onboarding-import.ts:80,178,325` (`session` refs)
- `apps/mobile/src/components/web-device-login.tsx:32` (`signInRef`)
- `apps/mobile/src/auth/use-campus-headless-login.ts:70` (`creds`)
- `apps/mobile/src/state/AppState.tsx:105` (`previousSession`, different purpose)

**Proposal.**

```ts
// src/hooks/use-latest-ref.ts
export function useLatestRef<T>(value: T): { readonly current: T } {
  const ref = useRef(value);
  ref.current = value;          // render-phase assignment is the point
  return ref;
}
```

**Impact.** Removes manual `useEffect(() => { ref.current = x }, [x])`
(`web-device-login.tsx:34-36`, `use-onboarding-import.ts:92-94, 190-192,
337-339`) and the "sync props into a ref" anti-pattern the React docs warn
about. Low risk.

---

### 5.2 `useMountedRef` + `useAsyncEffect`

**Problem.** The same guard appears in 12 files:

```ts
useEffect(() => {
  let active = true;
  doAsync().then((v) => { if (active) setX(v); });
  return () => { active = false; };
}, []);
```

Sites: `use-reduced-motion.ts:11-25`, `apps/mobile/app/konto.tsx:56-66`,
`apps/mobile/app/mail-nachricht.tsx:37-53`, `curriculum-node-detail.tsx:36-54`,
`device-qr.web.tsx`, `web-device-login.tsx:50-93`, `use-mail-inbox.ts:76-86`,
`OnboardingState.tsx:116-141`, `AppState.tsx:230-253, 263-288`,
`use-vpn-profile.ts:26-34`, `use-vpn.ts:55-72`,
`use-campus-headless-login.ts:72-87`.

**Proposal.**

```ts
// src/hooks/use-async-effect.ts
export function useAsyncEffect(
  effect: (signal: AbortSignal) => Promise<void> | void,
  deps: DependencyList,
): void;
```

Internally owns the `active` flag and exposes an `AbortSignal`, so calls can be
cancelled (`fetchMailBody`, vault reads, WebView polls). Existing `active`-flag
code can migrate file-by-file without behavioural change.

**Impact.** ~40 lines removed, fewer "setState on unmounted component" classes
of bug. Medium-low risk (effects with non-trivial cleanup, e.g. `use-vpn.ts`,
should keep their explicit subscription cleanup).

---

### 5.3 `useOnce`

**Problem.** A ref-guarded "run exactly once per mount" appears in:

- `use-mail-inbox.ts:48,173` (`autoLoaded`)
- `use-onboarding-import.ts:81,149,180,250,326,456` (`started`)
- `campus-info-view.tsx:30,96-112` (`autoLoaded` + eslint-disable)
- `web-device-login.tsx` (generation effect)
- `components/app-lock.tsx:23,44-48` (`started`)

**Proposal.**

```ts
export function useOnce(effect: () => void | Promise<void>): void;
```

**Why not just `useEffect(..., [])`?** Because several of these *must not*
re-run when a dependency identity changes (inline callbacks recreated each
render). `useOnce` makes that intent explicit and removes the `ref` + `if`
boilerplate.

> Keep `use-onboarding-import`'s `runId` semantics separate — that is
> cancellation, not "once". See `useRetryableRun` below.

---

### 5.4 `useAsyncAction`

**Problem.** A `busy` + `error` + `try/finally` triple around an async action,
repeated in at least 10 places:

| File | Action | Notes |
|------|--------|-------|
| `apps/mobile/app/sicherheit.tsx:43-59` | `toggleBiometrics` | maps biometric error |
| `apps/mobile/app/onboarding.tsx:55-80` | `enable` | maps biometric error + toast |
| `apps/mobile/src/components/app-lock.tsx:25-42` | `unlock` | prompt-once ref |
| `apps/mobile/app/mail-verbindung.tsx:38-74` | `refreshInbox`, `disconnect` | two actions, shared flags |
| `apps/mobile/app/dev/onboarding.tsx:53-66` | `schedule` | |
| `apps/mobile/app/dev/nfc.tsx:36-57` | `scan` | |
| `apps/mobile/app/geraet-verknuepfen.tsx:33-54` | `approve` | uses `busy` ref |
| `curriculum-node-detail.tsx:56-71` | `loadNodeCourses` | |
| `campus-info-view.tsx:40-94` | `loadRoot`, `loadChildren` | plus alert |
| `apps/mobile/src/vpn/use-vpn-profile.ts:36-46` | `importFromPicker` | result union, no errors |

**Proposal.**

```ts
// src/hooks/use-async-action.ts
export function useAsyncAction<Args extends unknown[], Result>(
  action: (...args: Args) => Promise<Result>,
  options?: { onError?: (error: unknown) => void },
): {
  run: (...args: Args) => Promise<Result | undefined>;
  busy: boolean;
  error: string;
  clearError: () => void;
};
```

**Do not** force every site into it: `use-vpn-profile`'s union return and
`use-campus-headless-login`'s state machine are better as they are. Target the
simple `busy/error/try/finally` shapes first (7 of the 10).

**Impact.** ~70 lines removed and consistent error clearing. Low-medium risk.

**Status (implemented).** `apps/mobile/src/hooks/use-async-action.ts`; migrated `dev/nfc`,
`dev/onboarding`, `vpn` (probe + profile import) and the node-detail load.
`mail-verbindung` keeps two explicit flags because refresh and disconnect guard
each other.

---

### 5.5 `useInterval` / `usePolling`

**Problem.** Three different polling implementations:

- `use-mail-inbox.ts:197-203` — 60 s quiet refresh, gated on `connected`.
- `web-device-login.tsx:61-81` — 2 s device-link poll with an in-flight guard.
- `use-campus-headless-login.ts:226-232` — 3 s inject poll + 90 s timeout.
- `web-device-login.tsx:38-41` — 1 s clock tick (countdown).

**Proposal.**

```ts
export function useInterval(callback: () => void, delayMs: number | null): void;
export function usePolling(
  callback: () => Promise<unknown>,
  delayMs: number | null,
  options?: { immediate?: boolean; stopOn?: (result: unknown) => boolean },
): { active: boolean; stop: () => void };
```

`useInterval` covers mail + clock; `usePolling` covers device-link. The headless
poll can adopt `usePolling` but keep its own timeout/phase machine.

**Impact.** Low risk, removes three subtle "duplicate interval after re-render"
bugs.

**Status (implemented).** `use-interval`, `use-countdown` and `use-polling`
exist. Migrated mail polling, the device-link clock, and the device-link poll
(the headless WebView loop keeps its own timeout/phase machine).

---

### 5.6 `useCountdown`

**Problem.** `web-device-login.tsx:31,38-41,95-98` recomputes
`now → secondsLeft → mm:ss` every second.

**Proposal.**

```ts
export function useCountdown(expiresAt: string | number | null): {
  secondsLeft: number;
  label: string;        // "4:59"
  expired: boolean;
};
```

Reusable later for device-link expiry elsewhere. Low risk.

---

### 5.7 `useDisclosure`

**Problem.** Boolean open/close state with a symmetrical toggle:

- `apps/mobile/app/(tabs)/mail.tsx:24-25` — `mailboxOpen`, `filterOpen`
- `apps/mobile/app/(tabs)/kalender.tsx:65` — `searchOpen`; `:297` — `filtersOpen` panel key
- `apps/mobile/app/(tabs)/mehr.tsx:23` — `searchOpen`
- `apps/mobile/app/campus.tsx:49` — `failed` (not a disclosure)
- `apps/mobile/app/vpn.tsx` — `providerId` selection (not a disclosure)

**Proposal.**

```ts
export function useDisclosure(initial = false) {
  return { open, setOpen, onOpen, onClose, onToggle };
}
```

**Impact.** Cosmetic but reduces the repeated
`onPress={() => (x ? close() : open())}` + accessibility wiring. Only adopt
where the same open state drives a header button and a body panel
(`kalender`, `mehr`); otherwise it is noise.

---

### 5.8 `useSelection`

**Problem.** `strukturen.tsx:55,64,65` keeps three mutually exclusive
selections (`selectedId`, `selectedUid`, `selectedNodeId`) and every setter
manually clears the other two (`:201-214`). `kalender.tsx:64,120` keeps a
composite `selectedKey` plus a find.

**Proposal.**

```ts
export function useSelection<T extends string | number>(): {
  selected: T | null;
  select: (value: T | null) => void;
  clear: () => void;
};
```

For `strukturen`, model it as a discriminated union:
`{ kind: 'study' | 'node' | 'entry'; id: … } | null`. This removes a class of
"two panels open at once" bugs.

**Impact.** Low risk, improves correctness more than line count.

---

### 5.9 `useTextSearch` / `useListQuery`

**Problem.** Every list screen re-implements the same filter/sort block:

- `apps/mobile/app/kurse.tsx:194-210` (type filter + query + 3 sort keys)
- `apps/mobile/app/(tabs)/kalender.tsx:89-118` (type + assignment + study + query + 2 sorts)
- `apps/mobile/src/components/api-history.tsx:44-64` (status + op + query + 3 sorts)
- `apps/mobile/src/mail/use-mail-list.ts:37-52` (already extracted — the reference design)
- `apps/mobile/app/studium.tsx:34-37` (query + status)
- `apps/mobile/app/campus.tsx:79-84` (query only)
- `apps/mobile/app/(tabs)/mehr.tsx:109-118` (query only, grouped)
- `apps/mobile/app/strukturen.tsx` delegates to `filterCurriculum` (good)

**Proposal — two layers, not one mega-hook:**

```ts
// general: case-insensitive haystack matching
export function useTextSearch<T>(
  items: T[],
  toHaystack: (item: T) => string,
  query: string,
): T[];

// domain: course-specific filter/sort, because that logic is reused verbatim
export function useCourseFilter(
  courses: BulkCourse[],
  options: {
    locale: Locale;
    query: string;
    typeFilter: string;
    sort: 'time' | 'title' | 'type';
    assignment?: 'all' | 'fixed' | 'notfixed';
  },
): { visible: BulkCourse[]; types: string[] };
```

`useMailList` is the proof that this pattern pays off (77 lines, fully tested
behaviour). Reuse its shape for courses; keep `useTextSearch` generic.

**Avoid** a fully generic `useListQuery({ filters: {...}, sorters: {...} })` —
it trades readability for abstraction and would be harder to type than the two
small hooks above.

---

### 5.10 `useRefreshOnFocus`

**Problem.** `useFocusEffect(useCallback(() => { void reload(); }, [reload]))`
appears in:

- `apps/mobile/app/sicherheit.tsx:37-41` (refresh biometrics)
- `apps/mobile/app/dev/onboarding.tsx:46-51` (biometrics + stored prefs)
- `apps/mobile/app/dev/state.tsx:34-38` (AsyncStorage snapshot)

**Proposal.**

```ts
export function useRefreshOnFocus(refresh: () => void | Promise<void>): void;
```

Implementation keeps the `useCallback` internally so callers cannot break the
focus-effect identity contract. Low risk.

---

### 5.11 `useAppStateChange`

**Problem.** `AppState.addEventListener('change', …)` appears in:

- `apps/mobile/app/_layout.tsx:129-135` (clear unlocked key on background)
- `apps/mobile/src/onboarding/OnboardingState.tsx:168-174` (reset just-enabled + re-probe)
- `apps/mobile/src/query/client.tsx:41-48` (focusManager)

**Proposal.**

```ts
export function useAppStateChange(
  handler: (state: AppStateStatus) => void,
  options?: { enabled?: boolean },
): void;
```

Platform guard (`Platform.OS === 'web'`) belongs in the hook for the
`focusManager` case, or as an option. Low risk.

---

### 5.12 `useDebouncedValue`

**Problem.** Search inputs filter on every keystroke
(`kalender.tsx:59`, `kurse.tsx:31`, `strukturen.tsx:56`, `api-history.tsx:40`,
`mail` via `useMailList:33`, `studium.tsx:31`, `campus.tsx:23`,
`mehr.tsx:24`). Datasets are small today; this is a **future-proofing** hook,
not an urgent one.

```ts
export function useDebouncedValue<T>(value: T, delayMs = 250): T;
```

Mark as optional. Do not add it until a list exceeds ~1k rows or profiling
shows input lag.

---

### 5.13 `useFittedList` (onboarding)

**Problem.** The three onboarding import pages repeat the exact measurement
maths:

```ts
const [listHeight, setListHeight] = useState(0);
const visibleCount = Math.max(0, Math.floor((listHeight - LIST_CAPTION_HEIGHT) / LIST_ROW_HEIGHT));
const visibleItems = items.slice(0, visibleCount);
```

Sites: `apps/mobile/app/onboarding.tsx:322-330` (calendar), `:432-442` (mail),
`:534-538` (timetable), each with its own `onLayout` handler.

**Proposal.**

```ts
export function useFittedList(itemCount: number): {
  onLayout: (event: LayoutChangeEvent) => void;
  visibleCount: number;
};
```

With `LIST_CAPTION_HEIGHT` / `LIST_ROW_HEIGHT` as module constants (they already
are) and an optional row-height override for `MailRow`.

**Impact.** Removes ~30 lines and guarantees the three pages stay in sync when
the sheet metrics change. Very low risk.

---

### 5.14 `useForm`

**Problem.** Multi-field forms repeat `useState` per field plus a manual reset:

- `apps/mobile/app/anrechnung.tsx:14-42` — 6 fields + `save()` + reset
- `apps/mobile/app/dokumente.tsx:14-16,41-57` — title/body + `saveNote()`
- `apps/mobile/app/vpn.tsx:39-41` — account/user/password
- `apps/mobile/app/modul/[id].tsx:22-57` — rating/workload/comment
- `apps/mobile/app/api.tsx:44-45` — elementId/courseId

**Proposal.**

```ts
export function useForm<T extends Record<string, string>>(
  initial: T,
): {
  values: T;
  set: <K extends keyof T>(key: K, value: T[K]) => void;
  reset: (next?: Partial<T>) => void;
  bind: <K extends keyof T>(key: K) => { value: T[K]; onChangeText: (v: string) => void };
};
```

**Caution:** this is the classic over-abstraction trap. Only adopt it where a
form has ≥3 fields and a reset (`anrechnung`, `dokumente`, `modul`, `vpn`).
Leave single-input screens alone.

---

### 5.15 `usePersistedState`

**Problem.** `AppState.tsx` (lines 226-258) and `OnboardingState.tsx`
(116-141, 103-114) both implement: load on mount → `ready` flag → persist on
change → optional `sanitize`/`parse`. The mail snapshot is a third variant
(`hydrateMailSnapshot`, `subscribeMailSnapshot`).

**Proposal.** Extract only the storage mechanics, not the reducers:

```ts
export function usePersistedState<T>(options: {
  key: string;
  initial: T;
  parse: (raw: string | null) => T;       // already called `sanitize` in AppState
  skipPersistUntilReady?: boolean;         // current behaviour
}): {
  value: T;
  setValue: Dispatch<SetStateAction<T>>;
  ready: boolean;
  reload: () => Promise<void>;
};
```

**Do not** try to merge the business logic (session fields, `pickActiveStudyId`,
theme application) into the hook. Those stay in the provider. The hook only
owns "read once, write on change, expose `ready`".

**Risk:** medium. `AppState` already handles a race (a slow load must not
overwrite a user change — it does not, because actions only run after `ready`).
Preserve that ordering and the test surface in `tools/`.

---

## 6. Specialized domain hooks

### 6.1 Auth / session

| Proposal | Replaces | Notes |
|----------|----------|-------|
| `useLeaveSession()` | `apps/mobile/app/konto.tsx:68-72`, `apps/mobile/app/(tabs)/mehr.tsx:26-30` | `endUniversitySession` (OIDC only) → `clearLogin()` → `signOut()`. Identical in both screens. Put it next to `useApp` (e.g. `apps/mobile/src/auth/use-session-exit.ts`). |
| `useServerStatus()` | `use-login-flow.ts:42-43`, `login-legacy.tsx:38-39` | Two `useQuery` probes (`oidcStatus`, `campusStatus`) that both resolve to `null` when offline. |
| `useBiometricPrompt()` | `onboarding.tsx:55-80`, `sicherheit.tsx:43-59`, `app-lock.tsx:25-42` | Wraps `authenticateWithBiometrics` + `isBiometricCancel` + `biometricMessage`, owns `busy`/`error`. |
| `useLoginMutations()` | `login-legacy.tsx:52-127` | **Do not do this.** The file is explicitly frozen; the duplication is documented and intentional (§9). |

**Status.** `useLeaveSession` and `useBiometricPrompt` are implemented and
migrated (`konto`, `mehr`, `onboarding`, `sicherheit`, `app-lock`).
`useServerStatus` remains.

`useLoginFlow.ts` note: `browserHarvest` (`:61-84`) references `browser`
declared at `:86`. It works because the callbacks run later, but it is fragile
under `no-use-before-define` and easy to break when reordering. If touched,
split into `useCampusHarvestMutation()` and pass `browser`/`headless` in.

### 6.2 C@MPUS

This is the highest-value domain. See §7 for the deep dives.

| Proposal | Replaces | Est. saving |
|----------|----------|-------------|
| `useActiveStudy()` | `kurse.tsx:40-41`, `calendar-hero.tsx:37-38`, `mehr.tsx:25`, `campus-info-view.tsx:32`, `strukturen.tsx:194-197` | ~20 lines + consistent `isCampus` |
| `useCampusSync()` | `kurse.tsx:117-182`, `strukturen.tsx:81-142`, `campus-info-view.tsx:116-171`, `onboarding/use-onboarding-import.ts:388-439` | ~200 lines |
| `hydrateStudySnapshot()` (not a hook) | same four sites | ~80 lines |
| `useNodeCourses(studyId, elementId)` | `campus-info-view.tsx:285-314`, `curriculum-node-detail.tsx:28-71` | ~40 lines |
| `useCoursesForStudy(studyId)` / `useCoursesForStudies(studies)` | `calendar-hero.tsx:39-47`, `kalender.tsx:71-83`, `onboarding/use-onboarding-import.ts:275-305` | ~50 lines |
| `useCurriculumBrowser()` | `strukturen.tsx:55-240` | ~80 lines |
| `useCurriculumExpansion()` | `strukturen.tsx:60,163-186,322-323`, `campus-info-view` tree props | ~30 lines |

**Status.** `useActiveStudy`, `useCampusSync` + `hydrateStudySnapshot`,
`useCoursesForStudy/Studies` and `useNodeCourses` are implemented and migrated.
`useCurriculumBrowser`/`useCurriculumExpansion` remain.

### 6.3 Mail

| Proposal | Replaces | Notes |
|----------|----------|-------|
| `useMailSnapshot()` | `use-mail-inbox.ts:138-160`, `mail-verbindung.tsx:29-36` | Returns the live snapshot (`status`, `messages`, `folders`, `folder`) from `mailStore`. Both consumers share the subscription. |
| `useMailConnection()` | `mail-verbindung.tsx:24-74`, parts of `use-mail-inbox.ts:205-230` | Connect/disconnect/refresh flags. |
| `useMailMessage(uid, folder)` | `mail-nachricht.tsx:28-67` | Fetch body, invalid-uid guard, HTML framing. |

`useMailInbox` itself is close to a good shape. It has 11 `useState` + 4 refs;
if it grows, split into `useMailConnectionState()` and `useMailRows()`, but do
not split now — the cohesion is real.

**Status.** `useMailSnapshot` is implemented. `mail-verbindung` uses it fully;
`use-mail-inbox` derives `status` and `folders` from it and keeps `messages` /
`folder` local for `LayoutAnimation` and the optimistic folder switch.
`useMailConnection` and `useMailMessage` remain.

### 6.4 Calendar

| Proposal | Replaces |
|----------|----------|
| `useCourseFilter` (§5.9) | `kalender.tsx:89-118`, `kurse.tsx:194-210` |
| `useCalendarNavigation(anchor)` | `kalender.tsx:258-270, 477-481, 610-694` (`shiftDay`, `weekDays`, month maths) |
| `useCalendarExport()` | `kalender-export.tsx:54-132` (log merge + 2 mutations + range) |
| `useUpcoming(items)` | `onboarding.tsx:814-865` (`buildCalendarOverview`, `buildTimetableOverview`) + `calendar-hero.tsx:49-57` + Today screen `index.tsx:23-24` |

`useUpcoming` is a good domain hook: "given dated items and a locale, return
total / upcoming / next". It currently exists in four slightly different forms.

### 6.5 Onboarding

| Proposal | Replaces |
|----------|----------|
| `useRetryableRun<T>()` | the mounted/runId/publish/started/retry scaffolding ×3 in `use-onboarding-import.ts` (lines 79-165, 170-266, 316-476) |
| `useCalendarImport` / `useMailImport` / `useTimetableImport` split into three files | `use-onboarding-import.ts` (489 lines) |
| `useOnboardingSteps(biometricsAvailable)` | `onboarding.tsx:40-46` (step list + first step) |
| `useFittedList` (§5.13) | three pages |

`useRetryableRun` sketch:

```ts
export function useRetryableRun<State extends object>(
  initial: State,
  run: (publish: (patch: Partial<State>) => void) => Promise<void>,
): State & { retry: () => void };
```

It owns `mounted`, `runId`, `started`, and the `publish` guard; each importer
keeps its own pipeline. This is the single biggest de-duplication in the
onboarding area.

### 6.6 Assistant / documents

| Proposal | Replaces | Notes |
|----------|----------|-------|
| `useDocument(id)` | `dokument/[id].tsx:20-28,58-59`, `chat.tsx:25-31` | Resolves bundled vs imported, `title`, `pages`, `plain`, `alternate`, `offline`. |
| `useGrokRewrite()` | `dokument/[id].tsx:32-48`, `chat.tsx:42-55` | Local-first text, remote replace, keep local on failure. The chat variant also appends messages, so share the mutation factory + `useAssistantText`, not the whole screen logic. |
| `useAssistantMessages()` | `chat.tsx:57-82` | Composes the local answer, appends user+assistant, fires the remote rewrite. |

### 6.7 VPN

| Proposal | Replaces |
|----------|----------|
| `useVpnForm()` | `vpn.tsx:37-64` (provider/server/account/password/import/probe state) |
| `usePrinterProbe()` | `vpn.tsx:43,56-60` and the `probePrinter` part of `use-vpn.ts:74-78` |

`useVpn` is already good; do not fold the form into it — the form is
screen-local UI state, the tunnel is device state.

### 6.8 NFC / device link

| Proposal | Replaces |
|----------|----------|
| `useNfcCard()` | `dev/nfc.tsx:18-57` (supported probe, scan, cancel, cleanup on unmount) |
| `useDeviceLinkApproval()` | `geraet-verknuepfen.tsx:25-68` (camera permission, phases, approve, reset) |
| `useWebDeviceLink()` | `web-device-login.tsx:24-98` (start, poll, countdown, retry, generation) |

`useWebDeviceLink` would also be the first consumer of `usePolling` +
`useCountdown`, which justifies those primitives.

### 6.9 API console / dev tools

| Proposal | Replaces |
|----------|----------|
| `useApiConsole()` | `api.tsx:37-138` (catalog query, replay mutation, notice/result/courses preview, adopted studies/nodes) |
| `useDevSnapshot(key)` | `dev/state.tsx:17-38` and the stored-preferences half of `dev/onboarding.tsx:37-51` |

`api.tsx` is 271 lines, of which ~100 are logic. `useApiConsole` is a clean win
because the screen becomes a renderer.

---

## 7. Deep dives

### 7.1 `useCampusSync` + `hydrateStudySnapshot` (highest priority)

**Current duplication.** All four call sites run the same mutation:

```ts
const mutation = useMutation({
  ...campusSyncMutation(),
  onSuccess: async (job, vars) => {
    const tree = await loadServerTree(vars.studyId);
    await saveFullStructure(vars.studyId, vars.elementId ?? null, tree.nodes, tree.expandedIds, …);
    // courses variant only:
    const remote = await loadServerCourses(vars.studyId);
    const stored = await loadCachedCourses(vars.studyId);
    … merge, saveCourses, saveCoursesFetchedIds, getCoursesSyncInfo …
    queryClient.setQueryData(keys.deviceNodes(vars.studyId), tree.nodes);
    queryClient.setQueryData(keys.deviceCourses(vars.studyId), all);
    queryClient.setQueryData(keys.coursesFetchedIds(vars.studyId), allFetched);
    queryClient.setQueryData(keys.coursesSync(vars.studyId), info);
    queryClient.invalidateQueries({ queryKey: keys.serverCourses(vars.studyId) });
    setCurriculum(tree.nodes, { studyId: vars.studyId, replace: true });
  },
});
```

Differences between sites are only *which* pieces each screen needs:

| Site | tree | courses | per-study progress map | cancel map | sequence guard | UI errors |
|------|------|---------|------------------------|------------|----------------|-----------|
| `strukturen.tsx` | ✓ | – | ✓ | ✓ | – | alert + note |
| `kurse.tsx` | ✓ | ✓ | single | single | ✓ (`loadSeq`) | alert + toast |
| `campus-info-view.tsx` | ✓ | – | single | single | – | alert |
| `use-onboarding-import.ts` | ✓ | ✓ | single | – (runId) | ✓ | collected string |

**Proposed shape.**

```ts
// src/campus/use-campus-sync.ts
interface CampusSyncProgress {
  fetched: number;
  nodeCount: number;
  courseCount: number;
  retries: number;
}

export function useCampusSync(options?: {
  onTree?: (studyId: number, tree: ServerTree) => void;
  onError?: (error: unknown, vars: CampusSyncVars) => void;
}): {
  run: (vars: { studyId: number; elementId?: number; courses?: boolean }) => void;
  cancel: (studyId: number) => void;
  running: (studyId?: number) => boolean;
  progress: (studyId: number) => CampusSyncProgress | null;
  failedIds: (studyId: number) => number[];
  cancelled: (studyId: number) => boolean;
};
```

Internal responsibilities:

1. Call `campusSyncMutation()` with `onProgress`/`isCancelled` wired to a
   `Record<number, …>` state + `Record<number, boolean>` cancel ref.
2. On success, call the shared hydration function.
3. Write query cache keys (`deviceNodes`, `deviceCourses`,
   `coursesFetchedIds`, `coursesSync`, `syncInfo`) and invalidate
   `serverCourses`/`deviceTrees`.
4. Keep a per-study run id so a late completion never overwrites a newer run.

```ts
// src/campus/hydrate-study.ts  (plain async function, unit-testable)
export async function hydrateStudySnapshot(input: {
  studyId: number;
  elementId: number | null;
  includeCourses: boolean;
  complete: boolean;
  queryClient: QueryClient;
  studyIds: number[];       // for the aggregate deviceTrees key
  applyCurriculum?: (nodes: CurriculumNode[], studyId: number) => void;
}): Promise<{ tree: ServerTree | null; courses: BulkCourse[] }>;
```

**Why not a single `useCampusSync` that also owns `setCurriculum`?** Because
`setCurriculum` is app state, not server state; pass it in via `onTree` so the
hook stays usable from onboarding (which has no `setCurriculum` call).

**Risk:** high. This is the critical data path. Cover it with the existing
`tools/check-campus-db.ts` run plus manual verification of:
- a full sync on a second device (server snapshot path),
- cancelling mid-run,
- switching study while a sync is in flight,
- the "nothing new" note in `strukturen`,
- the cache-clear buttons (which must also clear `deviceTrees`).

**Status (implemented).** `apps/mobile/src/campus/hydrate-study.ts` and
`apps/mobile/src/campus/use-campus-sync.ts` now exist. `kurse`, `strukturen` and
`campus-info-view` use the hook; the duplicated mutation bodies and the
`loadSeq`/`activeSeq` guard are gone (the hook's monotonic `seq` replaces it).

Actual API (slightly narrower than the sketch above):

```ts
const sync = useCampusSync({ studyIds, onTree, onSuccess, onError });
sync.run({ studyId, elementId, includeCourses: true });
sync.cancel(studyId);
sync.running;                  // any job + hydration in flight
sync.isRunningFor(studyId);
sync.progressFor(studyId);     // { fetched, nodeCount, courseCount, retries }
sync.failedIdsFor(studyId);
sync.cancelledFor(studyId);
```

`use-onboarding-import.ts` deliberately keeps its own loop: it also performs a
*pre-walk* server-snapshot catch-up whose completion semantics are `OR`-based
(`previous complete || remote complete`), while the hook is conservative
(`job clean AND remote complete`). Migrating it needs a separate decision.

### 7.2 `useActiveStudy`

```ts
export function useActiveStudy() {
  const sessionMode = useAppSelector((state) => state.sessionMode);
  const campusStudies = useAppSelector((state) => state.campusStudies);
  const activeStudyId = useAppSelector((state) => state.activeStudyId);
  const isCampus = sessionMode === 'campus' && campusStudies.length > 0;
  const study = isCampus ? activeStudy(campusStudies, activeStudyId) : null;
  return { study, studyId: study?.studyId ?? null, isCampus, campusStudies };
}
```

Trivial, but it removes three *inconsistent* variants:

- `kurse.tsx:40` — `sessionMode === 'campus'` without the studies guard.
- `calendar-hero.tsx:38` — same.
- `campus-info-view.tsx:32` — same.
- `strukturen.tsx:194-197` — its own "effective selected study" fallback.

All five screens then share the same definition of "is a study selected".

**Status (implemented).** `apps/mobile/src/campus/use-active-study.ts`. Migrated `kurse`,
`calendar-hero`, `mehr` and `campus-info-view`; `strukturen` keeps its own
"browsed vs. active study" pair because it needs both.

### 7.3 `useMailSnapshot`

```ts
export function useMailSnapshot() {
  return useSelector(mailStore);
}
```

`mailStore` in `apps/mobile/src/auth/mail.ts` is a TanStack Store, so the snapshot has a
stable object reference between writes and a subscription per consumer. Then:

- `use-mail-inbox.ts:138-160` derives from the snapshot instead of manually
  copying fields.
- `mail-verbindung.tsx:29-36` is replaced by the hook.

**Caution:** `useMailInbox` applies `LayoutAnimation` only when the row *order*
changes (`sameMessageOrder`). Keep that logic in `useMailInbox`; the snapshot
hook should not animate.

**Status (implemented).** `apps/mobile/src/mail/use-mail-snapshot.ts` reads `mailStore`.
`mail-verbindung.tsx` consumes it; `use-mail-inbox.ts` keeps its own
`messages`/`folder` mirrors for the optimistic folder switch and
`LayoutAnimation`, and reads status/folders from the store.

---

## 8. Context / store architecture note

Not strictly hook extraction, but it limits the value of any hook work and is
worth a decision:

Status: resolved by the TanStack Store migration (see
[tanstack-store.md](tanstack-store.md)). `appStore` lives outside React,
screens subscribe to one slice with `useAppSelector`, and actions are stable
functions on `appActions`. A locale change no longer re-renders the chat. The
analysis below is kept as the rationale for that migration.

The former context built one value containing **40+ fields and 30+ actions**,
recreated whenever `state`, `ready` or `authToken` changed. Every `useApp()`
consumer re-rendered on any change — including `toggleDownload`, `addMessage`,
`togglePlanned`, etc. Two consequences:

1. Adding more `useApp()`-based hooks (e.g. `useActiveStudy`) increased the
   number of consumers, not the cost per consumer.
2. The biggest win was splitting the state by subscription rather than by
   provider: a store with selectors gives each screen only the fields it reads.

`OnboardingState` has the same provider pattern but is small (9 values) and fine;
it still reads the app store through selectors.

---

## 9. What should **not** become a hook

| Candidate | Why not |
|-----------|---------|
| `apps/mobile/app/login-legacy.tsx`'s duplicated login wiring | Explicitly frozen and documented (`:1-7`, `use-login-flow.ts:35-37`). Leave it. |
| Pure helpers (`todayLocal`, `monthShort`, `paletteFor`, `formatCents`, `preview`, `summary`) | Move to `apps/mobile/src/text.ts` / `apps/mobile/src/domain/*`, not a hook. |
| `one(params.id)` | A one-line utility, not state. Move to `apps/mobile/src/text.ts` as `firstParam`. |
| `Platform.OS === 'web'` | A module constant (`const IS_WEB = Platform.OS === 'web'`), not a hook. It never changes at runtime. |
| `tx(locale, key)` | Pure lookup. Wrapping it in a hook hides a cheap call. |
| Single `useState` pairs (`const [query, setQuery]`, `const [open, setOpen]`) | Replacing 2 lines with a custom hook adds indirection. Only group them when they move together (`useDisclosure`, `useForm` with ≥3 fields). |
| `useAppSelector` per field | The intended read path: one field per call keeps the subscription narrow. Do not build a new object inside a selector. |
| `useCampusHeadlessLogin` | 297 lines of genuine state machine + WebView bridge. Refactoring it for symmetry would risk the sign-in path. |
| `useVpn` | Already well-factored; only the *form* around it should move. |
| `useMailInbox` split | Cohesive. Wait for a third consumer before splitting. |
| `JsonTree`'s per-node `useState` | Correct local UI state; extracting would be worse. |
| `themedStyles` / `themedStyle` | Module-level style builders; a hook would rebuild styles every render. |

---

## 10. Priority roadmap

### Wave 1 — primitives (1–2 days, low risk)

1. ✅ `apps/mobile/src/hooks/use-latest-ref.ts`
2. `apps/mobile/src/hooks/use-async-effect.ts` + `use-mounted-ref.ts`
3. `apps/mobile/src/hooks/use-once.ts`
4. ✅ `apps/mobile/src/hooks/use-async-action.ts`
5. ✅ `apps/mobile/src/hooks/use-interval.ts`, `use-countdown.ts`, `use-polling.ts`
6. ✅ `apps/mobile/src/hooks/use-refresh-on-focus.ts` + `use-app-state-change.ts`
7. `apps/mobile/src/hooks/use-disclosure.ts`
8. ✅ Date/param helpers: `firstParam`, `localDay`, `monthShort`,
   `weekdayOf`, `shiftDay` moved to `apps/mobile/src/text.ts`; `formatStamp`/`germanDate`
   still open.

Migrate the smallest sites first: `use-reduced-motion`, `use-vpn-profile`,
`web-device-login`, `apps/mobile/app/konto.tsx`, `mail-verbindung.tsx`.

### Wave 2 — data pipelines (3–5 days, high value, medium/high risk)

1. ✅ `apps/mobile/src/campus/hydrate-study.ts` + `apps/mobile/src/campus/use-campus-sync.ts`
2. ✅ Migrated `campus-info-view`, `strukturen`, `kurse`.
3. ✅ `apps/mobile/src/campus/use-active-study.ts`; migrated `kurse`, `calendar-hero`,
   `mehr`, `campus-info-view`.
4. ✅ `apps/mobile/src/campus/use-courses.ts`; migrated `calendar-hero` and `kalender`.
5. ✅ `apps/mobile/src/campus/use-node-courses.ts`; migrated the tree rows and the node
   detail panel.
6. `onboarding` course merge (needs the completion-semantics decision from
   §7.1) and the pre-walk snapshot catch-up.
7. ✅ `apps/mobile/src/mail/use-mail-snapshot.ts`; both `mail-verbindung` and `use-mail-inbox`
   consume it (the inbox keeps its local rows for `LayoutAnimation`).
8. ✅ `apps/mobile/src/auth/use-leave-session.ts` + `apps/mobile/src/auth/use-biometric-prompt.ts`;
   `use-server-status.ts` still open.

### Wave 3 — screens become renderers (2–3 days, medium risk)

1. `useApiConsole` → `apps/mobile/app/api.tsx`
2. `useCalendarExport` → `apps/mobile/app/kalender-export.tsx`
3. `useDocument` + `useGrokRewrite` → `dokument/[id]`, `chat`
4. `useNfcCard` → `dev/nfc.tsx`
5. `useDeviceLinkApproval` → `geraet-verknuepfen.tsx`
6. `useWebDeviceLink` → `web-device-login.tsx`
7. `useVpnForm` → `vpn.tsx`
8. `useFittedList` → three onboarding pages
9. `useCourseFilter` → `kurse` + `kalender`

### Wave 4 — optional / measure first

1. Split `use-onboarding-import.ts` into three files + `useRetryableRun`.
2. `useCurriculumBrowser` for `strukturen.tsx`.
3. `useForm` for `anrechnung`, `dokumente`, `modul`.
4. `usePersistedState` for `AppState`/`OnboardingState`.
5. `useDebouncedValue` only if profiling asks for it.
6. Context splitting (§8) as a separate project.

---

## 11. Acceptance criteria

For every extracted hook:

- [ ] No behaviour change in loading, error, cancellation and offline paths.
- [ ] `npx tsc --noEmit` and `npx expo lint` clean.
- [ ] `bun run check` (or the relevant subset) passes.
- [ ] The hook is unit-testable without React where it has pure parts
      (prefer extracting the pipeline as a function and keeping the hook thin —
      see `hydrateStudySnapshot`).
- [ ] Cancellation still works: a late promise must not overwrite a newer run
      (`loadSeq`, `runId`, `activeSeq` semantics preserved).
- [ ] Query-cache writes use the typed `keys.*` factory, never string arrays.
- [ ] No new dependency added; all of these are plain `react` /
      `@tanstack/react-query` / existing Expo modules.
- [ ] Hooks stay in the right layer:
      `apps/mobile/src/hooks/*` (generic), `apps/mobile/src/campus/*` + `apps/mobile/src/mail/*` + `apps/mobile/src/vpn/*` +
      `apps/mobile/src/auth/*` (domain), screens keep only render + wiring.

---

## Appendix A — hook pressure per file

Files with the most hook calls (proxy for extractable logic):

| File | Hook calls | Main extractable unit |
|------|-----------|-----------------------|
| `apps/mobile/src/onboarding/use-onboarding-import.ts` | 31 | `useRetryableRun` + 3-way split |
| `apps/mobile/src/mail/use-mail-inbox.ts` | 24 | `useMailSnapshot`; keep the rest |
| `apps/mobile/app/kurse.tsx` | 19 | `useCampusSync`, `useCourseFilter`, `useActiveStudy` |
| `apps/mobile/app/strukturen.tsx` | 18 | `useCampusSync`, `useCurriculumBrowser` |
| `apps/mobile/app/onboarding.tsx` | 18 | `useFittedList`, `useOnboardingSteps` |
| `apps/mobile/src/onboarding/OnboardingState.tsx` | 16 | `usePersistedState` |
| `apps/mobile/src/auth/use-campus-headless-login.ts` | 15 | leave (state machine) |
| `apps/mobile/app/login-legacy.tsx` | 13 | leave (frozen) |
| `apps/mobile/src/auth/use-login-flow.ts` | 12 | `useServerStatus`, `useBiometricPrompt` no; split harvest mutation |
| `apps/mobile/app/(tabs)/kalender.tsx` | 12 | `useCourseFilter`, `useCalendarNavigation` |
| `apps/mobile/src/mail/use-mail-list.ts` | 11 | reference design |
| `apps/mobile/src/components/campus-info-view.tsx` | 11 | `useCampusSync`, `useNodeCourses` |
| `apps/mobile/app/_layout.tsx` | 11 | `useAppStateChange` |
| `apps/mobile/src/components/app-lock.tsx` | 8 | `useBiometricPrompt` |
| `apps/mobile/app/vpn.tsx` | 8 | `useVpnForm` |
| `apps/mobile/app/anrechnung.tsx` | 8 | `useForm` |
| `apps/mobile/src/components/web-device-login.tsx` | 7 | `useWebDeviceLink` |
| `apps/mobile/app/kalender-export.tsx` | 7 | `useCalendarExport` |
| `apps/mobile/app/dev/onboarding.tsx` | 7 | `useRefreshOnFocus` |
| `apps/mobile/src/components/signing-in.tsx` | 6 | leave (animation) |
| `apps/mobile/app/sicherheit.tsx` | 6 | `useBiometricPrompt`, `useRefreshOnFocus` |
| `apps/mobile/app/mail-verbindung.tsx` | 6 | `useMailSnapshot`, `useMailConnection` |
| `apps/mobile/app/mail-nachricht.tsx` | 6 | `useMailMessage` |
| `apps/mobile/app/api.tsx` | 6 | `useApiConsole` |

## Appendix B — repeated idioms checklist

| Idiom | Occurrences | Hook / fix |
|-------|-------------|------------|
| `let active = true` cleanup | 12 files | `useAsyncEffect` / `useMountedRef` |
| `started` once-guard | 6 sites | `useOnce` |
| `runId` / `activeSeq` cancellation | 3 files | `useRetryableRun` (keep semantics) |
| ref mirror of props/state | 6 sites | `useLatestRef` |
| `setBusy` + `try/finally` | 10 files | `useAsyncAction` |
| `setInterval` | 4 sites | `useInterval` / `usePolling` |
| `AppState.addEventListener` | 3 sites | `useAppStateChange` |
| `useFocusEffect(refresh)` | 3 sites | `useRefreshOnFocus` |
| `one(value)` param helper | 8 files | `firstParam()` in `apps/mobile/src/text.ts` |
| `todayLocal` | 3 files | `apps/mobile/src/date.ts` |
| `monthShort` / `weekdayOf` | 3 files | `apps/mobile/src/date.ts` |
| device+server course merge | 4 files | `useCoursesForStudy/Studies` + `mergeById` |
| `sessionMode === 'campus' ? activeStudy(...) : null` | 5 files | `useActiveStudy` |
| `subscribeMailSnapshot` | 2 files | `useMailSnapshot` |
| `LayoutAnimation` on reorder | 1 (keep) | `useMailInbox` only |
| token list `split(' ')` | 0 | n/a |
