# Onboarding

Plan for the flow a user goes through after a successful sign-in. Written after
the C@MPUS browser sign-in was verified end to end, so the security step below
rests on a login that works ([campus-browser-login.md](campus-browser-login.md)).

Status: **plan, nothing implemented**. Every file named here exists unless it is
marked *new*.

## Goal

A student who has just signed in should finish these in under three minutes, on
first launch only, and every step must be skippable except the security gate:

1. understand what the app is (student project, not an official service),
2. get the security decision right (device vault + biometrics),
3. confirm who they are and which degree programme they are in,
4. know what is live and what is demonstration data,
5. optionally connect the things that need their input.

## Gating

`app/_layout.tsx` already redirects between `/login` and the tabs. Add the
onboarding group to the same gate, using the SDK 58 protected routes rather than
another manual redirect:

```tsx
<Stack.Protected guard={signedIn && !onboardingDone} redirectTo="/onboarding">
  <Stack.Screen name="onboarding" options={{ headerShown: false }} />
</Stack.Protected>
<Stack.Protected guard={signedIn && onboardingDone}>
  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
</Stack.Protected>
```

State lives in `PersistedState` (`src/types.ts`), written through
`AppStateProvider` (`src/state/AppState.tsx`):

| Field | Meaning |
| --- | --- |
| `onboardingVersion` | number, currently 0; the app raises it when new steps ship, and a lower stored value re-opens onboarding |
| `onboardingCompletedAt` | ISO string or null |
| `onboardingSkipped` | string ids of skipped optional steps, so the UI can point at them later |
| `vaultEnabled` | whether the device vault holds the C@MPUS autologin credential |
| `vaultBiometrics` | whether that entry is biometric-gated |
| `sessionRestoredFrom` | `'vault'` or null, for the "we signed you in from your stored credential" notice |

The decision helpers are pure and live in a *new* `src/onboarding/steps.ts` with
no React Native import, so they are unit-testable the way
`src/auth/campus-browser-scripts.ts` is: `onboardingSteps(profile, state)` returns
the ordered step list with each entry's `id`, `skippable` and `done` flag, and
`shouldOnboard(state)` decides the gate. `reset` in Einstellungen keeps
onboarding done; `signOut` clears the session but not the onboarding record.

## Steps

| # | id | Screen | Skippable | Content |
| --- | --- | --- | --- | --- |
| 1 | `welcome` | `/onboarding` intro | no | One paragraph: student project, no official university service, what a signed-in read does. This is the honesty statement the copy rules require ([security-and-privacy.md](security-and-privacy.md)). |
| 2 | `vault` | security | no (but `Ohne Speichern fortfahren` is allowed) | The device vault. Detailed below. |
| 3 | `study` | programme | no | The C@MPUS studies from the sign-in response. Single study is pre-selected (`pickActiveStudyId`); several render the existing `src/components/study-selector.tsx` list. Writes `activeStudyId`. |
| 4 | `live-data` | data boundary | yes | What comes from C@MPUS (structure, courses, calendar export) versus what is demonstration data (`src/data`, Lena Hartmann). Reuses the wording of [user/README.md](../user/README.md). |
| 5 | `mail` | UniMail | yes | Offers the existing connection screen (`app/mail-verbindung.tsx`). Declining records `mail` in `onboardingSkipped`. |
| 6 | `assistant` | assistant + offline | yes | Whether the assistant server answers (`GET /health`), what leaves the device, and that answers fall back to the local catalogue offline ([ai-assistant.md](ai-assistant.md)). |
| 7 | `calendar` | calendar export | yes | A one-tap `POST /v1/campus/calendar-sync` using the session from step 3, with the range and the result count shown. |
| 8 | `tour` | feature tour | yes | Four short cards: Heute, Kalender, Chat, Mehr. Each is `router.push`-able to the real screen. |
| 9 | `done` | summary | no | What is on, what was skipped, and a link back into each skipped step. Writes `onboardingCompletedAt` and `onboardingVersion`. |

`app/onboarding/index.tsx` holds the step machine (current step index, back
navigation, progress dots); each step is a component under
`src/components/onboarding/`. Copy goes through `tx(locale, key)` with keys in
`src/i18n/de.ts` and `src/i18n/en.ts`, as everywhere else
([i18n.md](i18n.md)).

## Step 2: the security step (the important one)

The vault already exists: [`src/auth/vault.ts`](../src/auth/vault.ts) writes the
C@MPUS autologin credential through `expo-secure-store`. Onboarding must explain
it and let the user turn it on, rather than leave it as a checkbox on the login
screen.

What the platform actually does, stated plainly so the copy stays honest:

| | iOS | Android |
| --- | --- | --- |
| Store | Keychain, `kSecClassGenericPassword` | `SharedPreferences` encrypted with the Android Keystore |
| Hardware | key material in the Secure Enclave where the device has one | Keystore, StrongBox where the device has one |
| Gate | `requireAuthentication` uses `biometryCurrentSet` | `setUserAuthenticationRequired(true)`, API 23+ |
| Accessibility | `WHEN_PASSCODE_SET_THIS_DEVICE_ONLY` | Keystore-bound, not restorable |

The Secure Enclave and StrongBox hold *keys*, not the credential itself — the
value sits in the keychain/keystore store and is protected by hardware-backed
key material. The copy must not claim more than that.

Four decisions the screen makes explicit:

1. **What is stored** — only the st-account and password for the automated
   C@MPUS sign-in. The C@MPUS bearer token and `PSESSIONID` stay in the
   assistant server's memory; they are not written to the device.
2. **The biometric gate** — offered when `biometricUnlockAvailable()` is true
   (`SecureStore.canUseBiometricAuthentication`). A rejected or cancelled prompt
   is an outcome, not an error: fall back to the password form.
3. **Invalidation** — a biometric change (new fingerprint, new face profile)
   invalidates a gated entry. Onboarding says so, and the app must treat it as
   "no stored credential" and offer the sign-in again.
4. **Removal** — `Sitzung beenden` clears the vault (already wired in
   `app/(tabs)/mehr.tsx`); a separate `Nur die gespeicherte Anmeldung löschen`
   control keeps the session. iOS keeps keychain entries across a reinstall with
   the same bundle id, so deletion cannot be left to uninstalling.

`app.json` already carries `expo-secure-store` with `faceIDPermission` and
`ios.config.usesNonExemptEncryption: false`; nothing new is needed there.

Also part of this step: **`--persist` for the terminal probe** (open item from
the login work) so a verified session can be written into the server `.env`
through `scripts/set-campus-secret.mjs` without printing the values.

## Session persistence after onboarding

Two options; the plan recommends the second.

1. **Store the harvested session in the vault** and replay it to
   `POST /v1/campus/credentials` on launch. Zero taps after the first sign-in,
   but it puts a live portal session (`PSESSIONID`, bearer) on the device and
   stretches the reuse window of a single credential.
2. **Re-run the automated sign-in from the vaulted password on launch** when the
   server reports no session (`GET /v1/campus/config` → `tokenConfigured`). The
   credential is already on the device for that purpose, the portal session is
   minted fresh each time, and the server stays the only holder of the session.
   The cost is one hidden WebView round trip (~10 s) and a failed-login path that
   must be quiet: the shared script's `rejected` step stops after one attempt, so
   a wrong stored password cannot lock the account.

Whichever is chosen, the state fields above record which path was used.

## Testing

- `scripts/onboarding.test.mjs` (*new*, run inside `bun run check`): the pure
  step logic — gate decisions for a fresh install, a resumed install, a bumped
  `onboardingVersion`, a sign-out; skip and unskip; which steps are mandatory.
- Vault behaviour with a fake `expo-secure-store` under `scripts/testing/`,
  following the existing `fake-expo-sqlite.mjs` pattern: save, read with and
  without the biometric flag, invalidation returns null, `clearLogin` removes.
- `npx expo export --platform web` must still render every route; the onboarding
  group is native-and-web, so it lands in the existing export check.

## Implementation order

1. `src/onboarding/steps.ts` + `scripts/onboarding.test.mjs` (gate, ordering) —
   no UI, the part that must be right.
2. `PersistedState` fields, `sanitize`, `reset`/`signOut` behaviour, and the
   `Stack.Protected` gate.
3. Step machine and screens 1, 3, 4, 9 (the mandatory spine).
4. Step 2 (vault) with the biometric toggle and the honest copy.
5. Optional steps 5–8, each a thin wrapper over a screen that already exists.
6. Session restore per the decision above.
7. `08-maintenance.md`, `user/getting-started.md`, `product/feature-catalog.md`
   and this file updated in the same change as the code.

## Open decisions

1. **Vault on by default or opt-in?** Opt-in keeps the "we never asked for your
   password" property of the project; on-by-default makes the app faster.
   Recommendation: opt-in, with the reason for it stated on the screen.
2. **Session persistence**: replay a stored session, or re-run the automated
   sign-in. Recommendation: re-run.
3. **Is `vault` really mandatory?** It cannot be, if the app must work without
   storing the password. Recommendation: the step is mandatory, storing is not.
4. **Notifications and calendar permissions** are not in this plan: no
   notification module is installed, and the calendar export needs no permission.
   Adding push would be its own change ([personas-and-journeys.md](../product/personas-and-journeys.md)
   does not promise it).
