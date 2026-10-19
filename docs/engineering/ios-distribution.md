# iOS distribution without the App Store

How a build reaches an iPhone when there is no App Store listing, and what this
project can actually use today.

Everything below turns on one question: **is there a paid Apple Developer Program
membership?** Ad Hoc, TestFlight and Enterprise all need one. Without it, the
only route is a free Apple Account plus a sideloading host that **re-signs the
app on each device** — one build handed to any number of people, each of whom
re-signs it themselves, every seven days.

**The question is settled: the membership is paid.** An exported `.ipa` is what
settles it, because the embedded provisioning profile carries its own expiry — a
free Apple Account issues 7-day profiles, a paid membership one-year ones. The
build in `dist/ios` from 2026-10-19 carries `ExpirationDate = 2027-10-18`, 364
days out, so team `QML5B57EMH` on `apple@olimo.me` is a paid Individual
membership.

So **Ad Hoc and TestFlight are the route, and the sideloading half of this
document is a fallback you do not need**. It stays documented because it is the
only option if the membership ever lapses, and because the free-Account limits
below explain what a Personal Team can do — `6XQ89G26PX`, the second account on
this machine, is one.

The predecessor of this conclusion was Xcode's team list, which contradicted
itself. The profile's expiry is what actually decides it, and `npm run ios:ipa`
now reads it on every build.

## The four routes

| Route | Paid membership | Device count | Install effort | Rebuild per new device |
| --- | --- | --- | --- | --- |
| Ad Hoc | Apple Developer Program, $99/yr | 100 iPhones per membership year, UDIDs registered up front | one tap on a link | yes (or re-sign) |
| Enterprise (in-house) | Apple Developer Enterprise Program, $299/yr, org only | unlimited, no UDID list | MDM or a manifest link | no |
| TestFlight | Apple Developer Program | 10,000 external testers, 100 internal | TestFlight app | no |
| Free Account + sideload | none | one per Apple Account, and each Account is capped | a computer once, then weekly | no |

TestFlight is the middle ground most people mean when they say "not the App
Store": no store listing, no public review, but the first build of each version
does go through Beta App Review, which usually clears in under a day. It is
still gated by the paid membership.

Ad Hoc is not a free-account feature. The provisioning profile is issued by
Apple against a team and an allow-list of device UDIDs, and an Ad Hoc profile is
not something a Personal Team can obtain.

## A free Apple Account

Signing in to Xcode with an Apple Account that has no membership gives a
**Personal Team**. Apple's account documentation lists exactly what that grants:

- up to **10 App IDs**, expiring after 7 days
- up to **3 devices**, expiring after 7 days
- up to **3 apps per device**, with provisioning profiles expiring **7 days**
  from issuance, after which the app has to be rebuilt and reinstalled

Source: [Developer account overview](https://developer.apple.com/help/account/basics/about-your-developer-account).

Those numbers matter twice:

1. They apply **per Apple Account**, so they do not stack. Ten testers sharing
   one Account still get three devices.
2. The 7-day clock is on the **provisioning profile**, not the install. The icon
   stays on the home screen and stops launching.

Certificates, Identifiers & Profiles, App Store Connect and TestFlight are all
member-only, which is why a Personal Team manages its App IDs, devices and
profiles **inside Xcode** rather than in the portal.

## What is in this repository today

| Fact | Where |
| --- | --- |
| No `eas.json`; cloud builds are not configured | repository root |
| Bundle id `dev.demo.universityassistant` | `app.json` |
| `ios/` and `android/` are git-ignored and regenerated | `.gitignore` |
| The iOS entitlements file is an **empty** `<dict/>` | `ios/UniversityAssistant/UniversityAssistant.entitlements` |
| A team is already wired into the generated project: `DEVELOPMENT_TEAM = QML5B57EMH`, automatic signing, `Apple Development` | `ios/UniversityAssistant.xcodeproj/project.pbxproj` |
| No Packet Tunnel extension target exists | `ios/`, searched for `OVPNEXT` and `PacketTunnelProvider` |
| `plugins/withVpnTunnel.js` writes `com.apple.developer.networking.networkextension` and `com.apple.security.application-groups` **only** when `EXPO_ENABLE_IOS_VPN_ENTITLEMENTS=1` | `plugins/withVpnTunnel.js` |
| The JS side already addresses an extension that does not exist: `iosExtensionBundleIdentifier` = `<bundle id>.OVPNEXT` | `src/vpn/engine-config.ts`, `src/vpn/engine-openvpn.ts` |

The empty entitlements file is not a mistake to fix. It is the reason the
current tree can be signed at all by a free Account.

## Which account signs the build

`xcodebuild` cannot be told which Apple Account to use. It picks from Xcode's own
preferences, and when more than one account is signed in it may reach for the
wrong one:

```text
DVTDeveloperAccountManager: Failed to load credentials for <account>:
"Invalid credentials in keychain for <account>, missing Xcode-Token"
```

`npm run ios:accounts` prints the accounts, their teams, the team this project
asks for, and every inconsistency it can see. It reads
`DVTDeveloperAccountManagerAppleIDLists` and `IDEProvisioningTeams` out of
`defaults export com.apple.dt.Xcode -`, so it needs no credentials and changes
nothing. `--json` gives the same thing for a script.

On the development machine at the time of writing it reports:

| Team | Type | Account | What it can distribute |
| --- | --- | --- | --- |
| `QML5B57EMH` | Individual | `apple@olimo.me` | Ad Hoc (100 devices per year) and TestFlight |
| `6XQ89G26PX` | Personal Team | `oliver.molnar@420cloud.io` | a sideloaded hand-out build only |

with three findings: two accounts are signed in; the second has no stored
identifier, which is the state that produces the `missing Xcode-Token` line; and
Xcode's cached team list contradicts the live one about `QML5B57EMH`. The live
entry is the correct one — the exported profile's one-year expiry proves it.

The script **cannot read credential state**. Xcode's token lives in a keychain
item with no name that could be established — the single lead is an
`AppleIDClientIdentifier` item with a null account attribute — so a missing token
is inferred from an account having no stored identifier rather than read
directly. Treat that as a strong hint, not a diagnosis. `npm run ios:ipa` points
at this script whenever `xcodebuild` fails, so the account question is answered
before a second ten-minute archive.

The fix for the credential error is to stop giving `xcodebuild` a choice —
remove the account you do not sign with in **Xcode → Settings → Accounts**, or
sign it in again. Passing `--team` does **not** help: the team was never the
problem.

## Why prebuild used to be a trap

`plugins/withVpnTunnel.js` writes two iOS entitlements. Both are unavailable to
a Personal Team, and Network Extensions cannot be added to a free Account at
all. A prebuild that added them produced a tree that **could not be signed here**,
with `Personal development teams do not support the … capability` — and if such
a build somehow reached a tester, their re-sign failed too, on **their** device,
where nothing in this repository can see it.

The plugin now writes those entitlements only when
`EXPO_ENABLE_IOS_VPN_ENTITLEMENTS=1` is set, so a prebuild for a free Account
leaves the entitlements file empty and signable. Pass it inline —

```bash
EXPO_ENABLE_IOS_VPN_ENTITLEMENTS=1 npm run ios:ipa -- --clean
```

— rather than storing it in `.env`, which `expo prebuild` also reads. A value
there would apply to every prebuild, including the ones a free Account has to
sign. That flag is the single switch between "can be handed to a tester" and
"needs the paid membership".

Two things still catch people out:

1. **Gating a mod does not undo a file.** Turning the flag off does not strip
   entitlements an earlier prebuild already wrote; the mod simply does not run.
   Only `--clean`, which regenerates `ios/`, is guaranteed to produce a clean
   entitlements file. `npm run ios:ipa` refuses to archive if the file still
   carries either key, whichever way it got there.
2. **`ios/` is git-ignored.** Nothing about the native project is committed, so
   "the tree that worked last week" is a local artifact. Treat a fresh
   `--clean` as the baseline rather than an existing `ios/`.

The VPN is unaffected either way: there is no iOS tunnel target, so the
entitlements are inert. See [vpn-tunnel.md](vpn-tunnel.md) — the extension
target is still open work, and the entitlement needs Apple's grant once a paid
membership exists.

## React Native 0.88 prebuilt and the dev-client network inspector

Symptom: the linker stops with

```text
Undefined symbols for architecture arm64
  Symbol: _OBJC_CLASS_$_RCTReconnectingWebSocket
  Referenced from: libexpo-dev-launcher.a[18](DevLauncherNetworkInterceptor.o)
```

The precompiled `React.xcframework` from React Native 0.88 does not export
`RCTReconnectingWebSocket`, while `expo-dev-launcher`'s network inspector imports
it. The repository fixes this with the supported build property in `app.json`:

```json
[
  "expo-build-properties",
  {
    "ios": {
      "networkInspector": false
    }
  }
]
```

`npx expo prebuild --platform ios` writes
`EX_DEV_CLIENT_NETWORK_INSPECTOR=false` into `ios/Podfile.properties.json`; the
podspec then compiles the stub class and the linker has nothing to resolve. The
trade-off is that the Expo network inspector is off in the dev build.

To keep the inspector, replace that property with
`"buildReactNativeFromSource": true` instead. React Native is then compiled from
source, including `Libraries/WebSocket/RCTReconnectingWebSocket.m`, at a
significantly higher build time. Do not patch `ios/Podfile` by hand: `ios/` is
generated and ignored.

After a prebuild that clears `ios/`, Xcode may lose the selected development
team. `npx expo run:ios` signs automatically with the team it finds; a
`--clean` prebuild is the case that needs `DEVELOPMENT_TEAM` set again.

A launch error after "Build Succeeded" that says the device is locked is not a
build failure: unlock the iPhone and run the install/launch step again.

## Building the test build

`npm run ios:ipa` does the whole thing: preflight, archive, export. It is
`scripts/build-ios-ipa.mjs` as orchestration, with the pieces in `scripts/ios/`:
`project.mjs` (paths, `app.json`, `Info.plist`, the team), `entitlements.mjs`,
`provisioning.mjs` (reading the signature back), `artifact.mjs` (naming, export
options, checksum) and `cli.mjs`.

```bash
npm run ios:ipa                  # archive the existing ios/ as Release
npm run ios:ipa -- --prebuild    # regenerate ios/ first
npm run ios:ipa -- --clean       # regenerate ios/ from scratch
npm run ios:ipa -- --team ABCDE12345
npm run ios:ipa -- --out /tmp/ipa
```

It writes `dist/ios/<slug>-<version>-<build>-<yyyymmdd-hhmm>.ipa`, then prints
the size, the SHA-256 and the version that actually shipped. It refuses to start
an archive that cannot be signed:

| Refusal | Why |
| --- | --- |
| the entitlements file carries either VPN key | no free Account can sign them, and the failure would otherwise surface on the tester's device rather than here |
| no team id in the project and none passed | pass `--team`, or sign the project once in Xcode |
| `ios/` is missing | it runs prebuild instead of failing |
| `app.json`'s version differs from the native one | a warning, not a refusal — the `.ipa` ships the native version, and the printout names it |
| the exported `.ipa` is signed by another team, has expired, or is not a development build | the embedded profile is read back after the export. The account `xcodebuild` *tried* is a different question from the team that signed, and only the file answers the second |

After the export it unzips the `.ipa`, decodes `embedded.mobileprovision` with
`security cms -D`, and prints the signing team, the profile name, its expiry and
the provisioned-device count. That check is what settled the membership question
at the top of this document, and it is the difference between "the build
succeeded" and "the build succeeded with the team I asked for".

`Release` is not cosmetic. It embeds the JavaScript bundle, so a tester opens the
app and it works. A debug or dev-client build would open the `expo-dev-client`
launcher and wait for Metro on this machine — useful when a tester is sitting
next to you, useless the moment they leave.

Prerequisites, once per machine: Xcode with the Apple Account signed in
(**Xcode → Settings → Accounts**), and the test device connected and run to once
so the free Account knows about it. The workflow is a script rather than a
GitHub Action because it *is* the signing: a Personal Team's identity lives in
this Mac's keychain, and no CI runner has it.

### Without the script

The same result by hand, if the script is ever unavailable:

1. `xed ios/UniversityAssistant.xcworkspace`
2. Target **UniversityAssistant** → Signing & Capabilities → **Team** = the
   Personal Team. A `--clean` prebuild clears `DEVELOPMENT_TEAM`, so set it here
   rather than trusting the project file.
3. Scheme → **Any iOS Device (arm64)**, then **Product → Archive**.
4. Organizer → **Distribute App → Development → Export**.

A free Account cannot export a distribution profile, and it does not need to.
The exported `.ipa` is signed to the team's own three devices and is not
directly installable by anyone else. It is a **payload**: the sideloading host
strips that signature and re-signs it with the recipient's own Account.

That is the whole reason a single build serves everyone. Adding tester number
fifty requires no rebuild and nothing from this repository — unlike Ad Hoc,
where Apple has to reissue the profile and the binary is re-signed.

## Publishing builds to your own service

`dist-service/` is a standalone distribution service: its own port, its own
SQLite database, its own data directory and, once deployed, its own domain. It
shares nothing with the assistant server, and it is the answer to "where does the
history live" that does not depend on GitHub, Firebase or App Store Connect.

```bash
DIST_TOKEN=dev-token npm run dist:serve     # http://127.0.0.1:8788
DIST_TOKEN=dev-token npm run dist:publish   # newest .ipa in dist/ios
```

`dist:publish` reads the version, build number, bundle id, team, profile expiry
and device count out of the `.ipa` itself, hashes the bytes it sends, and the
service verifies that hash before storing anything. The pages list the history,
serve the binary, and generate the `itms-services` manifest for the install
button. Its API and deployment steps are in `dist-service/README.md`.

What it cannot do is the same thing this document cannot: sign. An ad-hoc
profile only installs on devices whose UDID is inside it, so registering a tester
still means rebuilding. The build page warns when the registry has more devices
than the profile covers — that gap is the failure that otherwise surfaces as
"it just won't install".

**The deploy prerequisite is a domain and a certificate.** Over-the-air install
refuses plain HTTP and self-signed certificates, so the service is useful on
`localhost` for the history and the API, but a phone can only install from an
HTTPS origin. The supported shape is a named Cloudflare tunnel — `olimo.me` is
already on Cloudflare's nameservers, so `builds.olimo.me` is one command — with a
`Caddyfile` for the VPS alternative. Both are in `dist-service/README.md`.



| Step | Who | Cost |
| --- | --- | --- |
| Install a sideloading host (SideStore) | tester, once, with a computer | one-time |
| Sign in with an Apple Account — a throwaway is fine | tester | one-time |
| Install the `.ipa` | tester | one-time |
| Give up 1 of 3 free app slots, and the host takes another | tester | permanent |
| **Refresh every 7 days**, on Wi-Fi, with the host's local VPN running | tester, forever | weekly |

SideStore is the untethered option: the computer is needed once, then the app
re-signs on the device itself. AltStore Classic is the alternative, but its
refresh needs AltServer awake on the same Wi-Fi every week, so it does not
survive a tester who has moved on.

## How many testers

The count is not limited by Apple — it is limited by the weekly chore, which
lands on each tester rather than on this project.

- **Technically unbounded.** Nothing caps the number of people, and the App ID,
  device and 3-app limits are all charged to the **tester's** Account, not ours.
  Our Account is untouched.
- **Practically, 3 to 5 is pleasant and 10 to 20 becomes a support queue.** Every
  lapsed tester asks why the app stopped opening.
- **Sharing one Account instead makes it worse, not better**: three devices per
  week, three apps, and the password would have to be handed out.

The honest summary is that one build plus a sideload reaches a small, forgiving
audience, and stops being a distribution strategy somewhere around a dozen
people.

## Failure modes to expect

| Symptom | Cause | Note |
| --- | --- | --- |
| Signing fails on the recipient's device, but the same `.ipa` runs here | the `.ipa` carries entitlements the free profile cannot grant | the prebuild trap above |
| SideStore error `(3011) bundle identifier already registered` | App ID collision | re-signers rewrite or suffix the bundle id; nothing in the app should depend on the exact value |
| SideStore error `(1009)` / `(3013)` | more than 10 App IDs registered on that Account in 7 days | per Account, not global |
| SideStore cannot refresh | no Wi-Fi, or LocalDevVPN not connected (`(1414)`) | both are required for install and refresh |
| Refresh broken on iOS 26.4 | upstream bug | fixed on SideStore's nightly channel |
| Apple Account locked | shared Anisette servers | SideStore's FAQ recommends the official servers or self-hosting |
| AltStore cannot refresh | AltServer not running on the same Wi-Fi (`(1200)`–`(1202)`) | the reason to prefer SideStore |
| More than 3 apps on a free Account | Apple's cap (AltStore `(2009)`) | SideStore's own FAQ says the same |

Also worth knowing: installing through SideStore adds a synthetic Mac to the
tester's Apple Account. That is expected behaviour, not an intrusion, but it is
worth mentioning before someone notices it.

**Avoid paid signing services** that sell "no computer needed" installs
(ESign, Scarlet, and similar). They re-sign with enterprise certificates that
Apple revokes, and the app stops opening with no warning and no appeal.

## What would actually scale it

**Ask the university.** It is a university tool, and institutions almost always
hold an Apple Developer Program **Organization** membership. Being added as a
member is free to us; it needs an invitation from the Account Holder or an
Admin. That single step turns the options above into:

- **Ad Hoc** — 100 iPhones per membership year, profiles valid a full year, and
  no weekly refresh. Re-signing is needed only when a device is added.
- **TestFlight** — up to 10,000 external testers, no UDID list at all.

Both keep the bundle id on `dev.demo.*` until a real owner exists, per
[release-and-operations.md](../delivery/release-and-operations.md).

Two conditional shortcuts, recorded for completeness rather than recommended:

- **TrollStore** gives permanent installs, no Apple Account and no 7-day
  refresh, which is the only free route that scales. It depends on the
  CoreTrust bug and is therefore limited to old iOS versions, so it is only
  worth checking if the testers' devices happen to be on one.
- **The web export** (`bunx expo export --platform web`) needs no signing at all
  and reaches everyone. It is a degraded demo: `src/auth/campus-browser.ts`
  returns `NO_NATIVE_COOKIES` on web, so the C@MPUS browser sign-in does not
  work, and the VPN is inert. Fine for showing screens, not for testing the
  campus flows.

## What is verified

Read out of this repository:

- No `eas.json`; `ios/` and `android/` are git-ignored; the entitlements file is
  an empty dictionary; a Personal-Team-style `DEVELOPMENT_TEAM` is present; no
  Packet Tunnel target exists; the config plugin writes both iOS entitlements
  only under its flag.
- `src/vpn/engine-config.ts` and `src/vpn/engine-openvpn.ts` already pass an
  `OVPNEXT` bundle id that no target provides.
- `scripts/build-ios-ipa.test.mjs` covers the workflow's preflight and its
  archive/export sequence against a stand-in `xcodebuild`. It asserts that a
  tree carrying the VPN entitlements is refused **before** `xcodebuild` is
  called at all, that a clean tree produces one `.ipa` with the expected name,
  and that no scratch directory is left beside the archive. It runs as part of
  `npm run check`.
- `scripts/xcode-accounts.test.mjs` pins the account-and-team findings against a
  fixture copied from a real `defaults export`: two accounts, one identifier,
  and a cached team list that contradicts the live one.
- The account and team table above is `npm run ios:accounts` output, quoted
  verbatim rather than paraphrased.

Taken from primary documentation, linked below: the free-Account limits, the
100-device Ad Hoc figure, TestFlight's 10,000 testers, and every SideStore and
AltStore error code in the table.

**Verified by running it.** `npm run ios:ipa` completed on 2026-10-19 and wrote
`dist/ios/university-assistant-1.0.0-1-20261019-1006.ipa` (13 MB). The exported
file was opened again afterwards: `TeamIdentifier = QML5B57EMH`,
`application-identifier = QML5B57EMH.dev.demo.universityassistant`, signing
authority `Apple Development: Oliver Molnar (8H5TXDZZ87)`, `get-task-allow = true`,
and a profile expiring 2027-10-18. The `missing Xcode-Token` line is printed
during that build and does not prevent it.

**Not verified.** Over-the-air install has never run, because the service was
only exercised on `localhost` — the manifest and the pages were read back over
HTTP, but iOS will not install from an `http://` origin. The service's own tests
cover publishing, the hash check, the history, the binary round-trip and the
manifest; the deploy step is a Cloudflare tunnel config and a systemd unit that
have not been run on a real host. No sideload has been performed either, so the
SideStore path and its weekly refresh are described from the tools' documentation
rather than from a completed run.

## Sources

Apple:

- [Developer account overview](https://developer.apple.com/help/account/basics/about-your-developer-account) — Personal Team limits, members-only features
- [Developer Program](https://developer.apple.com/programs/) and [Enterprise Program](https://developer.apple.com/programs/enterprise/) — the two annual memberships and their fees
- [Devices overview](https://developer.apple.com/help/account/devices/devices-overview) — 100 devices per product family per membership year
- [TestFlight](https://developer.apple.com/testflight/) — 10,000 external testers
- [Configuring network extensions](https://developer.apple.com/documentation/xcode/configuring-network-extensions) — the entitlement and its capability

Sideloading hosts:

- [SideStore FAQ](https://docs.sidestore.io/docs/faq) — 3 apps including itself, 10 App IDs per week, the monthly/weekly refresh model
- [SideStore error codes](https://docs.sidestore.io/docs/troubleshooting/error-codes) — `(1006)`, `(1009)`, `(1414)`, `(3011)`, `(3013)`
- [AltStore error codes](https://faq.altstore.io/altstore-classic/error-codes) — `(1200)`–`(1202)`, `(2009)`

Expo, for the cloud path that is not configured here:
[Internal distribution](https://docs.expo.dev/build/internal-distribution.md) —
EAS handles ad hoc certificates, the UDID allow-list and provisioning profiles,
and needs a paid membership like every other route.
