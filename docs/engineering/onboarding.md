# Onboarding

The first-run flow after a successful sign-in. The biometrics page is
implemented; the wider step list from the original plan is still open.

Status: **first page implemented**. Files named below exist unless marked
*planned*.

## What runs today

1. A sign-in succeeds and the gate in `app/_layout.tsx` sees a session.
2. `src/onboarding/OnboardingState.tsx` reports whether this installation has
   completed onboarding and whether the device has an enrolled biometric.
3. If the record is due and biometrics are available — or a development override
   is set — the gate replaces the route with `/onboarding`.
4. `app/onboarding.tsx` asks the user to enable biometrics, or to skip with
   **Nicht jetzt**.
5. Enabling writes `biometricsEnabled` and `completedAt`. Skipping — or
   dismissing/denying the system prompt — writes `completedAt` without enabling
   the lock. The gate then moves to the tabs.

The page is deliberately the only step in the flow for now. It is already gated
behind a session and a completion record, so additional pages can be inserted
without changing the navigation rule.

## Gate

`app/_layout.tsx` keeps the manual gate used for login. The onboarding condition
is:

```ts
const needsOnboarding =
  Boolean(sessionAccount) &&
  onboardingReady &&
  !onboardingCompleted &&
  (biometricsAvailable || forceOnboarding);
```

- A signed-in user without a completed record and with biometrics available is
  sent to `/onboarding`.
- A device without hardware or enrollment has no first page to show. The flow is
  skipped and **not marked complete**. If the user enrolls a face or fingerprint
  later, the provider refreshes availability and the page can appear on the next
  foreground or launch.
- A development override (`forceOnboarding`) shows the page even when the probe
  reports no enrollment. It is set by the dev screen and cleared when onboarding
  completes.
- The completion record is per installation, not per account. Signing out and
  signing in again does not replay onboarding, and `reset` in Einstellungen does
  not delete it.
- Direct access to `/onboarding` while signed out is redirected to `/login`.
  Access while the flow is already complete redirects to the tabs.

## Storage

Onboarding preferences are separate from the signed-in `PersistedState`:

| Storage | Key | Contents |
| --- | --- | --- |
| AsyncStorage | `university-assistant/onboarding.v2` | `{ completedAt: string \| null, biometricsEnabled: boolean, forceOnboarding: boolean }` |

`v2` replaced the short-lived `v1` key after the first implementation skipped the
page on devices where biometrics were not yet enrolled. The stored record is not
a secret and is not encrypted by AsyncStorage.

`OnboardingState.tsx` exposes:

| Value | Meaning |
| --- | --- |
| `ready` | Preferences and biometric availability have loaded |
| `completed` | `completedAt` is set |
| `completedAt` | The stored completion timestamp |
| `forceOnboarding` | Development override that bypasses the availability check |
| `biometricsEnabled` | The app-lock preference |
| `biometricsHardware` | The device reports a fingerprint/face sensor |
| `biometricsEnrolled` | A fingerprint or face is enrolled |
| `biometricsAvailable` | Hardware plus an enrolled face/fingerprint |
| `biometricsJustEnabled` | Suppresses the lock once, directly after opting in |
| `refreshBiometrics()` | Re-runs the probe after system settings change |
| `scheduleOnboardingForNextLaunch(clearBiometrics?)` | Writes a due record without changing the running session |
| `reloadPreferences()` | Re-reads the stored record, used on sign-out |
| `completeOnboarding()` | Writes `completedAt` and clears the dev override |
| `enableBiometrics(prompt, cancel)` | Runs the system prompt, then stores `biometricsEnabled` |
| `disableBiometrics()` | Clears the app-lock preference |

## Biometrics and App Lock

Availability is checked in `src/auth/biometrics.ts`:

- `expo-local-authentication` is imported dynamically and never on web.
- Hardware and enrollment are probed together. `hasHardwareAsync()` or a
  non-empty `supportedAuthenticationTypesAsync()` counts as hardware;
  `isEnrolledAsync()` or an enrolled level of at least `BIOMETRIC_WEAK` counts as
  enrollment. The two signals are combined because platform versions disagree
  on them at the edges (for example a simulator with no enrollment yet).
- A device passcode alone does not count.
- `authenticateAsync()` is called with the localized prompt. Enabling the
  feature sets `disableDeviceFallback: true`, so a device passcode cannot be
  mistaken for a successful Face ID or fingerprint check. Unlocking the app
  leaves the fallback enabled and therefore uses the system default (biometrics
  first, passcode when the OS requires it); the lock screen always offers
  sign-out.
- A cancelled prompt is a decline and completes the onboarding. A hardware or
  permission error (`not_available`, `not_enrolled`, `lockout`, …) keeps the
  page open with the specific message and an **Open system settings** action,
  so the user can fix Face ID and retry instead of being sent to the tabs.
- A cancelled prompt or denied Face ID permission is treated as a decline, not
  as a blocking error: the page shows a short note and completes the flow.
  Settings can start the prompt again later.

When onboarding completes with biometrics enabled, `app/_layout.tsx` renders
`src/components/app-lock.tsx` over the navigator whenever:

```ts
signedIn && onboardingCompleted && biometricsEnabled && biometricsAvailable
```

- A cold launch with a restored session starts locked.
- A return from the background starts locked again.
- The unlocked session is keyed by the active bearer token (or the account id in
  an offline sign-in), so a fresh sign-in does not inherit the previous unlock.
- Cancelling the prompt leaves a retry button and a sign-out action on the lock
  screen. Signing out there also clears the stored C@MPUS login.
- The lock is driven by the saved preference, not by the live probe. If the user
  removes all biometrics at OS level, the system prompt can fall back to the
  device passcode; the lock screen always offers sign-out.

The app lock is a UI gate. It does not encrypt AsyncStorage. The separate
C@MPUS autologin vault still uses `expo-secure-store` with its own optional
biometric gate ([vault.ts](../../src/auth/vault.ts)); enabling the app lock does
not move data into the vault.

## Security screen

`app/sicherheit.tsx` is a dedicated screen reached from the **App** group in
`app/(tabs)/mehr.tsx` (`/sicherheit`). It is not part of the general
`app/einstellungen.tsx` screen.

- The top is a status hero: a large white shield-check icon, a state pill, a
  headline, and one sentence. It uses the login palette: blue background, a
  green/red status badge, and a white sheet below. The status callout is green
  when the lock is active and red in every other state; the label identifies
  whether the app is protected, unprotected, needs setup, or has no biometrics.
- The biometric switch sits in its own compact card below the hero. It is
  disabled only when the device has no sensor and the preference is off.
- The hero sentence distinguishes the unprotected state (lock off), hardware
  present but nothing enrolled, and no hardware.
- **Erneut prüfen / Check again** re-runs the probe, and the screen also refreshes
  on focus and when the app returns to the foreground, so enrolling Face ID in
  system settings is picked up without a relaunch.
- Turning the switch on runs the system prompt and authenticates before
  persisting the preference. Turning it off takes effect immediately. A failed
  prompt keeps the switch off and shows the error inline.

## Native configuration

`app.json` carries the `expo-local-authentication` config plugin with an iOS
`faceIDPermission` string. The module is native code:

- `bunx expo install expo-local-authentication` resolves the SDK-compatible
  version.
- Expo Go cannot test Face ID. Use a development build:
  `npx expo run:ios`, `npx expo run:android`, or an EAS development build.
- After adding the module, rebuild the native app before testing the page.
  Reloading only the JavaScript bundle is not enough.

The web build skips the flow because the app does not use a browser biometric
API. The route still exports and redirects safely.

In development builds, **Campus → Dev → Onboarding** shows the live values and
can schedule the flow for the next launch without redirecting the current
session. See [dev-tools.md](dev-tools.md).

## Development check

In a development build, Metro prints one line after the provider loads:

```text
[onboarding] { module, hardware, enrolled, available, completedAt, biometricsEnabled }
```

Use it to distinguish the three failure modes:

| Log | Meaning |
| --- | --- |
| `module: false` | The running binary does not include `expo-local-authentication`; rebuild |
| `enrolled: false` | No face/fingerprint is set up on the device (on the iOS Simulator: Features → Face ID → Enrolled) |
| `available: true`, `completedAt: null` | The page should appear after sign-in |

## Manual check

1. Sign in on a device with an enrolled biometric and no stored onboarding
   record. The biometrics page appears before the tabs.
2. **Biometrie aktivieren** shows the system prompt, then lands on Heute.
3. Repeat with a fresh record and cancel the system prompt instead. The flow
   closes without enabling the lock and does not return on the next launch.
4. Put the app in the background and open it again. The lock screen appears.
5. Cancel the App Lock prompt once: the lock screen stays, with retry and
   sign-out.
6. Disable biometrics in **Sicherheit**, background the app, and reopen it. No
   lock appears.
7. Repeat on a device without enrollment: no onboarding page and no lock.
8. Enroll biometrics while the app is installed, then reopen it. The page can
   appear because the skipped flow was not marked complete.

## Still planned

The original flow proposed more pages after the security page. None of these are
implemented yet:

| Step | Content |
| --- | --- |
| `welcome` | Student project, not an official university service |
| `vault` | Move the opt-in C@MPUS autologin vault off the login form and explain it |
| `study` | Confirm the C@MPUS studies and `activeStudyId` |
| `live-data` | What is live C@MPUS data and what is the demonstration record |
| `mail` | Offer the existing UniMail connection screen |
| `assistant` | What leaves the device for chat, and the offline fallback |
| `calendar` | One-tap C@MPUS calendar sync |
| `tour` | Short cards for Heute, Kalender, Chat, and Mehr |
| `done` | Summary of what is on and what was skipped |

The current implementation does not use `Stack.Protected`; the login and
onboarding redirects share the existing manual gate. Onboarding completion is
device-level, not versioned per account. Both can change when the remaining
steps are built.

## Testing

- `bun run typecheck` covers the provider, gate, screens, and translation keys.
- `bun run lint` covers the hooks and React Native imports.
- `bun run check` covers the existing domain and server checks; it does not
  exercise the native biometric prompt.
- `npx expo export --platform web` renders `/onboarding` and must keep working.
- The biometric prompt, App Lock on background, and Face ID need a development
  build on a device or simulator. They are not testable in Expo Go on iOS.
