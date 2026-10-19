# VPN tunnels (ZDI OpenVPN and TIK AnyConnect)

The university runs **two** VPN services, from two different units. This
document covers which one the app aims at and how the engine is wired; the
service-by-service comparison, protocols and evidence are in
[vpn-comparison.md](vpn-comparison.md).

## The two services

|  | ZDI OpenVPN | TIK AnyConnect |
| --- | --- | --- |
| Run by | Zentrale Dienste Informatik, Fakultät 5 | TIK |
| Audience | Informatik employees and students with a CIP-pool account | every student and employee |
| Protocol | OpenVPN | Cisco AnyConnect |
| Credentials | the department / CIP-pool account | `st…@stud.uni-stuttgart.de` / `ac…@uni-stuttgart.de` + personal password |
| Client material | two `.conf` files under an `/intern/` path | a server host, entered in the client |

Sources: the [ZDI OpenVPN page](http://www.zdi.uni-stuttgart.de/zdi/vpn/openvpn.html)
and the [TIK VPN service page](https://www.tik.uni-stuttgart.de/dienste-a-z/VPN-Netzwerkzugang-von-unterwegs/).

Two facts decide the app's approach:

1. **The ZDI files are internal.** `…/intern/vpn/openvpn/informatik.conf` and
   `informatik6.conf` answer **403** from outside the computer-science network
   (verified with and without a browser User-Agent). The app cannot fetch or
   bundle them; the student imports their own file.
2. **OpenVPN has working React Native engines; AnyConnect does not.** So the app
   offers ZDI OpenVPN first and keeps the TIK access as the guided alternative.

The two `.conf` files differ only in which address family carries the tunnel:
`informatik.conf` is IPv6-over-IPv4, `informatik6.conf` is IPv4-over-IPv6.

## What is in this build

| Layer | File | State |
| --- | --- | --- |
| Screens | `app/vpn.tsx`, `app/drucker.tsx` | Complete, in every build |
| Provider model | `src/vpn/data.ts`, `src/vpn/types.ts` | Both providers, ZDI first |
| Profile import | `src/vpn/profile.ts`, `src/vpn/openvpn-config.ts` | Complete; parser is pure and tested |
| OpenVPN engine | `src/vpn/engine-openvpn.ts` | Wraps `@aliakhgar1/react-native-openvpn` |
| Engine router | `src/vpn/native.ts` | Picks OpenVPN, else the AnyConnect stub, else nothing |
| App service | `src/vpn/{use-vpn,use-vpn-profile,printer,labels,engine-config}.ts` | Complete; degrades honestly |
| AnyConnect stub | `modules/university-vpn` | Status only — **no engine** |
| Config plugin | `plugins/withVpnTunnel.js` | Android manifest + iOS entitlements for both engines |

The screen never lies. `src/vpn/native.ts` decides the engine **synchronously**
(`detectedEngine()`), so the first render is honest. On Expo Go, on web, and in
a build without the engine the status reads `unavailable` and the screen falls
back to the official clients. `connectVpn` throws `engine-missing` rather than
bringing up a tunnel that would black-hole traffic.

## The engine

`@aliakhgar1/react-native-openvpn` (MIT; Android vendors GPL-2.0-derived
ics-openvpn, so the app is effectively GPL-2.0 on distribution — a conscious
call for a repository that is currently MIT).

`src/vpn/engine-openvpn.ts` wraps it and keeps the library out of every other
file:

- **It is loaded lazily.** The library's spec uses
  `TurboModuleRegistry.getEnforcing('Openvpn')`, so importing it in Expo Go or
  on web *throws*. `openVpnInstalled()` probes with the non-throwing
  `TurboModuleRegistry.get`, and the `import()` only happens behind that check.
- **State is mapped.** The library's `ConnectionState` string enum
  (`'0'…'3'`, `'-1'`, `'-2'`) becomes the app's `VpnTunnelState`; the native side
  does not report the target, so the last one is remembered for the status line.
- **The target carries everything.** `connect` sends `address` (from the
  profile's `remote`), `username`, `password` and the full `openVPNConfig` text,
  plus the `iOSOptions` / `androidOptions` the library requires. The iOS bundle
  identifier comes from `src/vpn/engine-config.ts`, derived from
  `expo-constants` so it cannot drift from `app.json`.

### The RN 0.88 patch

The published `1.0.0` **does not compile** against React Native 0.88, which Expo
58 uses. Two API changes in RN core break it, and upstream still ships the same
code (`master` is version `1.0.0` with an identical module, so there is nothing
newer to pull):

| Error | Cause | Fix |
| --- | --- | --- |
| `Function invocation 'getCurrentActivity()' expected` | `ReactContextBaseJavaModule.getCurrentActivity()` is a Kotlin `fun` now, so Kotlin property syntax no longer resolves; it is also deprecated | use `reactApplicationContext.currentActivity` (the documented replacement) |
| `'onActivityResult' overrides nothing` / `'onNewIntent' overrides nothing` | `ActivityEventListener` now declares non-null parameters | `Activity?` → `Activity`, `Intent?` → `Intent` |

`patches/@aliakhgar1+react-native-openvpn@1.0.0.patch` holds the six changed
lines, applied through the same `patchedDependencies` mechanism the repository
already uses for `react-native-webview`. Six lines, no behavioural change: the
patch only follows RN's own deprecation for the activity accessor.

**Maintenance:** drop the patch as soon as upstream ships an RN 0.88-compatible
release. If the patched lines ever move, `bun install` fails loudly rather than
silently applying nothing.

## Android setup

The library ships an **empty** manifest template, so nothing merges in on its
own. `plugins/withVpnTunnel.js` applies, on every `expo prebuild`:

- Permissions: `INTERNET`, `ACCESS_NETWORK_STATE`, `ACCESS_WIFI_STATE`,
  `CHANGE_WIFI_STATE`, `RECEIVE_BOOT_COMPLETED`, `FOREGROUND_SERVICE`,
  `POST_NOTIFICATIONS`, `FOREGROUND_SERVICE_SPECIAL_USE`, and
  `BIND_VPN_SERVICE` (with `tools:ignore="ProtectedPermissions"`).
- The service `de.blinkt.openvpn.core.OpenVPNService` with
  `android:permission="android.permission.BIND_VPN_SERVICE"`.
- The receiver `de.blinkt.openvpn.OnBootReceiver` for `BOOT_COMPLETED` /
  `MY_PACKAGE_REPLACED`.

`react-native.config.js` in the package sets `cmakeListsPath`, so the OpenVPN
core is built from source; the NDK is required (26.1 is present on the dev
machine).

## iOS setup (manual, on purpose)

A config plugin can set entitlements, but it cannot create an Xcode target or
get Apple to grant the entitlement. `plugins/withVpnTunnel.js` writes the
`com.apple.developer.networking.networkextension` (`packet-tunnel-provider`)
and `com.apple.security.application-groups` entitlements; the rest is Xcode
work, per the library's installation guide:

1. New target → **Network Extension** → **Packet Tunnel Provider**, bundle id
   `<app>.OVPNEXT` (matches `iosExtensionBundleIdentifier`).
2. **App Groups** (`group.<app>`) and **Network Extensions → Packet Tunnel** on
   *both* the app and the extension target.
3. Copy `PacketTunnelProvider.swift` from the library's example into the target.
4. Add the Swift package `ss-abramchuk/OpenVPNAdapter` to the extension target,
   and link `SystemConfiguration`, `UIKit`, `OpenVPNAdapter`.

Apple must then approve the App ID for `packet-tunnel-provider`. VPN does not
work in the iOS simulator.

## What is verified

- TypeScript, lint, and `scripts/vpn-profile.test.mjs` (the `.ovpn` parser and
  host/port extraction) pass.
- The config plugin resolves under `expo config --type prebuild`, and its mods
  produce the entitlement, the app group, the permissions, the service and the
  receiver. `expo prebuild --platform android` writes them into
  `android/app/src/main/AndroidManifest.xml`.
- **The Android debug build succeeds with the patch.**
  `./gradlew :app:assembleDebug` finishes in ~9 minutes with **zero Kotlin
  errors**. The resulting APK contains the engine — `libopenvpn.so` and
  `libovpn3.so` for `arm64-v8a`, `armeabi-v7a`, `x86` and `x86_64`, plus the
  `pie_openvpn.*` assets — and the merged manifest carries
  `de.blinkt.openvpn.core.OpenVPNService`, `de.blinkt.openvpn.OnBootReceiver`
  and the permissions listed above.
- `:university-vpn:assembleDebug` succeeds, so the AnyConnect scaffold compiles
  even though it is inert.
- Off-network reachability of the ZDI profile URLs (403).

Still **not** verified, and not provable by a build:

- That a tunnel carries traffic. That needs a device, the Android consent
  dialog, and either a CIP-pool account with the internal profile or a local
  test server.
- Anything on iOS: the extension target does not exist yet.

## Finishing it

1. **iOS target** — the four steps above. This is the only thing between the
   app and a working iOS tunnel.
2. **Test without the university.** `docker` is on the dev machine: an OpenVPN
   server in a container plus a generated `.ovpn` exercises import → connect →
   route without a CIP-pool account.
3. **Profile encryption.** The library's `useProfileEncryption` defaults to true
   on Android; the `.ovpn` itself stays in the app sandbox. Any password must go
   to `expo-secure-store`, never into the profile, per
   [security-and-privacy.md](security-and-privacy.md).
4. **TIK path.** Still needs an OpenConnect port (no iOS library exists), or an
   accepted "guided setup only" outcome.
