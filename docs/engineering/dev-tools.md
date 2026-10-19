# Development tools

Developer-only diagnostics that exist only when `__DEV__` is true. A production
build never creates the **Dev** category or its routes in the menu.

## Where it lives

The Campus tab (`app/(tabs)/mehr.tsx`) has a separate **Dev** group in
development builds. It contains:

| Entry | Route | Purpose |
| --- | --- | --- |
| **Onboarding** | `/dev/onboarding` | First-run values and a next-launch override |
| **Lokaler Zustand** | `/dev/state` | Session summary, local counts, and the raw AsyncStorage payload |
| **Schnittstelle** | `/api` | The existing server-route replay screen |

The entry is registered through the normal `InfoRow` list, so the settings search
also finds the developer screens.

## Onboarding (`/dev/onboarding`)

The screen shows the live provider values:

- `ready`, `completed`, `completedAt`
- `biometricsEnabled`, `biometricsHardware`, `biometricsEnrolled`,
  `biometricsAvailable`, `biometricsJustEnabled`
- the persisted `completedAt` and `biometricsEnabled`
- the storage key `university-assistant/onboarding.v2`
- whether the flow would appear on the next launch
- the raw stored JSON

Actions:

| Action | Effect |
| --- | --- |
| **Beim nächsten Login erzwingen** | Writes `completedAt: null` and `forceOnboarding: true` to AsyncStorage **without** changing the running provider. The current session stays in the app; the next sign-in or full launch starts onboarding. |
| **Erzwingen und Biometrie zurücksetzen** | The same, plus `biometricsEnabled: false`. |
| **Werte neu laden** | Re-runs the biometric probe and re-reads the stored record. |

`forceOnboarding` bypasses the biometric availability gate, so the page still
appears when the probe reports no enrollment. Completing or skipping onboarding
clears the flag. This makes the flow testable even on a simulator with no
enrolled Face ID.

The scheduling action intentionally does not update React state. If it did, the
gate in `app/_layout.tsx` would immediately redirect to `/onboarding` and the
developer could not first check the other values. The pending record is loaded
by `OnboardingProvider` on the next launch, and the gate re-reads it on sign-out
so signing in again in the same app session also shows the flow.

If no record exists yet, the stored section says so and shows `null`/`false`
defaults. A failed write is reported below the buttons and in the Metro log.

## Diagnosing the gate

`app/_layout.tsx` prints a `[gate]` line in development builds:

```text
[gate] { ready, onboardingReady, signedIn, onboardingCompleted, forceOnboarding,
         biometricsAvailable, needsOnboarding, onLogin, onOnboarding }
```

`needsOnboarding` must be `true` before the redirect happens. With
`forceOnboarding: true`, biometric availability no longer blocks it. The
onboarding screen no longer auto-completes when a probe flips to “not enrolled”
after the redirect; it stays until the user skips or enables the lock.

The system prompt logs `[biometrics] auth` with `requireBiometrics`, `success`,
the error code, and a warning. Enabling onboarding or the Sicherheit switch uses
`requireBiometrics: true`; unlocking the app uses the system default with the
device-passcode fallback and logs under `[app-lock]`.

## Local state (`/dev/state`)

A read-only snapshot for diagnosing the app record:

- session account, mode, name, email, user id, platform count, whether a server
  bearer token is present (never its value), OIDC session id, mail account
- counts for curriculum nodes, studies, downloads, imports, reviews, transfers,
  chat messages, and planned modules
- the active study and sync timestamps
- the raw AsyncStorage value for `university-assistant/v1` in the collapsible
  `JsonTree`

The raw payload includes user-visible notes and the demonstration record, so the
screen is development-only. It does not read `expo-secure-store` or print the
bearer token.

## Adding another diagnostic

1. Put the screen under `app/dev/`.
2. Keep it read-only unless an action is explicitly a reset or a forced state.
3. Do not print passwords, bearer tokens, or SecureStore values.
4. Add the entry inside the `__DEV__` branch in `app/(tabs)/mehr.tsx`.
5. Never rely on a dev screen for a production flow.
