# VPN comparison: what the university offers, and what an app can do with it

This document compares the VPN services at the University of Stuttgart, the
protocols behind them, and what each one costs to support inside a mobile app.
It records the evidence, the decision, and the risks. The implementation notes
live in [vpn-tunnel.md](vpn-tunnel.md).

Two different units run VPN services, and they are not interchangeable:

|  | TIK | ZDI (Zentrale Dienste Informatik, Fakultät 5) |
| --- | --- | --- |
| Cisco AnyConnect | `vpn.tik.uni-stuttgart.de` | `vpn.informatik.uni-stuttgart.de` |
| OpenVPN | — | `informatik.conf` / `informatik6.conf` |

So there are **three** endpoints across two protocols.

## Why the VPN matters here at all

The stuvus printers run PaperCut at
[drucken.stuvus.uni-stuttgart.de](https://drucken.stuvus.uni-stuttgart.de/), and
per the [stuvus printing guide](https://stuvus.uni-stuttgart.de/drucker) that
software is reachable **only from the university network** — the campus WLAN
(including `uni-stuttgart-open`) or a VPN. Printing from off campus therefore
requires a working tunnel, which is what puts the VPN on this app's roadmap at
all.

## The three endpoints

### 1. TIK Cisco AnyConnect — university-wide

- **Host:** `vpn.tik.uni-stuttgart.de`, optionally `vpn2.tik.uni-stuttgart.de`.
- **Audience:** every student and employee.
- **Protocol:** Cisco AnyConnect (SSL VPN / DTLS).
- **Credentials:** the full university address —
  `st…@stud.uni-stuttgart.de` (students, at least 7 digits) or
  `ac…@uni-stuttgart.de` (employees) — plus the personal password.
- **Clients:** Cisco Secure Client for Windows, macOS, Linux, Android and iOS;
  the university mirrors installers at
  [vpn.tik.uni-stuttgart.de](https://vpn.tik.uni-stuttgart.de/). **OpenConnect**
  is offered as an open alternative by TIK.
- **`vpn2` specifics:** the connection runs through a stateful firewall that also
  allows UDP towards the internet — useful for video conferences. The Cisco
  client mishandles some special characters in the password against `vpn2`;
  TIK suggests OpenConnect or ISO-8859-1-safe characters there.

### 2. ZDI Cisco AnyConnect — Faculty 5

- **Host:** `vpn.informatik.uni-stuttgart.de`.
- **Audience:** Informatik employees and students holding a
  **central CIP-pool account** — *not* the C@MPUS/SIAM account.
- **Protocol:** Cisco AnyConnect (SSL).
- **Extra requirement:** the **Informatik CA root certificate**
  (`…/intern/ca/infcacert.crt`), which has to be installed as a trusted root.
- **Clients:** ZDI mirrors Cisco installers for Windows 10/11 (x86, x64, ARM64),
  macOS 13–15, Linux x86_64 and ARM64; mobile clients come from the App Store and
  Google Play. The installer links sit under `/intern/ftp/vpn/anyconnect/…`.

### 3. ZDI OpenVPN — Faculty 5

- **Client material:** two configuration files,
  `…/intern/vpn/openvpn/informatik.conf` (IPv6-over-IPv4) and
  `informatik6.conf` (IPv4-over-IPv6).
- **Audience:** same as the ZDI AnyConnect — department / CIP-pool account.
- **Protocol:** OpenVPN.
- **Behaviour:** the client gets both an IPv4 and an IPv6 address from the
  OpenVPN network and can reach every university target over v4 or v6. Unlike
  the Cisco client, OpenVPN **does not modify `resolv.conf`** on the client, so
  local name servers keep working.

## Sources

Every claim above comes from these pages (the last four are the links supplied
when this work started):

- ZDI OpenVPN — http://www.zdi.uni-stuttgart.de/zdi/vpn/openvpn.html
- ZDI Cisco AnyConnect — http://www.zdi.uni-stuttgart.de/zdi/vpn/anyconnect.html
- TIK VPN service — https://www.tik.uni-stuttgart.de/dienste-a-z/VPN-Netzwerkzugang-von-unterwegs/
  (English: https://www.tik.uni-stuttgart.de/en/services-a-z/VPN/)
- TIK client guides — https://www.tik.uni-stuttgart.de/support/anleitungen/vpn/
  (stud. handout `VPN_AND_DE_stud.pdf`, OpenConnect guide
  `Anleitung_OpenConnect_Windows_DE.pdf`)
- stuvus printing — https://stuvus.uni-stuttgart.de/drucker
- React Native OpenVPN engines referenced below —
  https://github.com/ccnnde/react-native-simple-openvpn and
  https://github.com/AliAkhgar/react-native-openvpn

## Side by side

| | TIK AnyConnect | ZDI AnyConnect | ZDI OpenVPN |
| --- | --- | --- | --- |
| Protocol | Cisco AnyConnect | Cisco AnyConnect | OpenVPN |
| Transport | TLS + DTLS/UDP | TLS + DTLS/UDP | TLS (UDP 1194 typical) |
| Runs by | TIK | ZDI | ZDI |
| Audience | all students + employees | Fakultät 5, CIP pool | Fakultät 5, CIP pool |
| Credential | `st…`/`ac…` + password | CIP-pool user + password | CIP-pool user + password |
| Extra trust | — | Informatik CA root | — |
| Client material | host name | host name + CA | two `.conf` files |
| Material obtainable | publicly | `/intern/` paths | `/intern/` path, 403 off-network |
| IPv6 | v6 routed *outside* the tunnel | — | v6 inside the tunnel |
| DNS | client-side handling | client-side handling | leaves `resolv.conf` alone |
| Audience coverage | **everyone** | Fakultät 5 | Fakultät 5 |
| Mobile engine in RN | **none** | **none** | **exists** |

## The engineering question: can an app actually do it?

A VPN needs a packet tunnel in the OS, driven by a protocol implementation.

### OpenVPN

The protocol is open and well served:

| Piece | What it is | Notes |
| --- | --- | --- |
| `@aliakhgar1/react-native-openvpn` | MIT-licensed RN TurboModule | Android vendors `ics-openvpn` (GPL-2.0-derived); iOS drives `NETunnelProviderManager`. Autolinks (`react-native.config.js`). Published `1.0.0` (Aug 2025); repository active into Aug 2026; ~18 stars. |
| `react-native-simple-openvpn` | GPL-2.0 RN module | 184 stars, last push Oct 2024, `2.1.3`. Legacy bridge; needs `include ':vpnLib'` in `settings.gradle`, so a config plugin would be required. |
| `ics-openvpn` | the Android OpenVPN GUI/core | GPL-2.0; the de-facto Android OpenVPN engine |
| `OpenVPNAdapter` | the iOS framework the TurboModule uses | separate licence and SPM dependency; pulled into the app's extension target |

Either wrapper makes the **app** effectively GPL-2.0 on distribution, because of
the `ics-openvpn` core. Neither ships an iOS Packet Tunnel target — that is
still the app author's work.

### Cisco AnyConnect

- **OpenConnect** (LGPL-2.1) is the open implementation of the Cisco AnyConnect
  SSL VPN protocol, and TIK explicitly offers it as an alternative client. On
  desktop it works today. For a **mobile** app there is no maintained library to
  link, and in particular **nothing for the iOS Network Extension**. An iOS
  implementation would mean porting OpenConnect or writing the AnyConnect
  handshake in Swift against TIK's headend.
- **Cisco Secure Client** is proprietary and licensed only for Cisco headends
  ("use with non-Cisco equipment/software is prohibited"); it can be offered, but
  not embedded.
- The ZDI AnyConnect variant additionally needs the **Informatik CA** trusted,
  which for an in-app tunnel means certificate handling the app cannot improvise.

### Neither offers WireGuard

WireGuard would be the easiest protocol to implement on both platforms, but
neither unit advertises it. If that ever changes, it would be the cheapest path.

## Scoring for this app

| Criterion | TIK AnyConnect | ZDI AnyConnect | ZDI OpenVPN |
| --- | --- | --- | --- |
| Audience reach | best | narrow | narrow |
| Android engine available | ✗ | ✗ | ✓ |
| iOS engine available | ✗ | ✗ | ✓ (plus an extension target) |
| Profile/config obtainable by the app | n/a (host) | ✗ (internal) | ✗ (internal, but user-importable) |
| Credential model the app can hold | password | password + CA | password |
| Licensing burden | none (guided setup) | none (guided setup) | GPL-2.0 |
| Extra platform work | — | — | iOS extension + Apple entitlement |

## The decision, and why

**ZDI OpenVPN first.** It is the only endpoint for which a working engine exists
on both mobile platforms, so it is the only one that can actually carry traffic
from inside the app. The narrow audience and the internal configuration file are
real costs, and the app pays them by letting the student import their own
`.ovpn` and by naming the faculty limitation in plain language.

**TIK AnyConnect stays as guided setup** covering everyone, until an OpenConnect
port exists. The earlier plan — an in-app AnyConnect tunnel for the TIK — was
dropped precisely because no engine could be linked, especially on iOS.

## Consequences and risks

1. **Licensing.** Supporting OpenVPN in-app makes the app effectively GPL-2.0
   through `ics-openvpn`, against a repository that is currently MIT. A conscious
   decision.
2. **iOS.** Requires a Packet Tunnel target, an App Group on both targets, the
   `OpenVPNAdapter` package, and Apple's `packet-tunnel-provider` entitlement.
   None of it is possible in Expo Go, and none of it is automatic.
3. **Internal assets.** The ZDI OpenVPN config files answer **403** from outside
   and the ZDI AnyConnect installers and CA sit under `/intern/`, so the app
   cannot fetch them; the student supplies the file. (Only the 403 is proven —
   see the evidence section.)
4. **Credentials.** The CIP-pool password is a real secret. It must not be
   written into the imported profile or AsyncStorage; a stored password belongs
   in `expo-secure-store`, per
   [security-and-privacy.md](security-and-privacy.md).
5. **Authorisation.** TIK sanctions OpenConnect for *people*; whether the ZDI
   sanctions a third-party app using its OpenVPN service is a separate question
   that no amount of code answers.

## Open questions

**To the ZDI:** is OpenVPN open to all Informatik students with a CIP-pool
account, or only some? May a third-party app use it? Is there a distributable
`.conf`, or must each student keep importing the internal one? Does the tunnel
reach `drucken.stuvus.uni-stuttgart.de`?

**To the TIK:** nothing is required while the TIK path stays guided setup.

## How the facts were checked

Each observation is labelled with what it actually supports, because they are
not equally strong.

**Strong — the configuration files are gated:**

- `http://www2.informatik.uni-stuttgart.de/intern/vpn/openvpn/informatik.conf`
  and `informatik6.conf` return **403**, reproducibly, with a plain and with a
  browser User-Agent. A 403 means the server was reached and refused on policy —
  a real gate, and the only direct evidence that these paths are faculty-only.

**Weak — the CA certificate observation:**

- `https://www2.informatik.uni-stuttgart.de/…/infcacert.crt` fails TLS
  verification ("unable to verify the first certificate").
- On inspection the host presents a **Let's Encrypt** certificate
  (`issuer=C=US, O=Let's Encrypt, CN=YR1`) and sends **only the leaf**, omitting
  its intermediate. That missing intermediate is what breaks verification for
  clients without `YR1` cached. It says nothing about the Informatik CA, and the
  host is *not* on a private PKI for its own TLS.
- The **Informatik CA** requirement comes from the ZDI page's own instructions
  (install it as a trusted root before connecting), not from this probe.

**Weak — the installer observation:**

- The ZDI AnyConnect installer under `/intern/ftp/vpn/anyconnect/…` did not
  respond (timed out on two attempts, 25 s each).
- A timeout proves nothing about authorisation. The identical timeout then hit
  the **public service page** on the same host, which had returned a 200 minutes
  earlier. So the timeout tracks the *host* being intermittently unreachable, not
  the path being gated.
- The claim that the installers are internal rests on the `/intern/` path and
  the ZDI page's own wording, not on this probe.

**Neutral:**

- The ZDI HTML pages are public (`openvpn.html` → 200), and the `/zdi/vpn/`
  directory listing is 403. Treat the host's availability as intermittent.
- TIK's guide PDFs are publicly downloadable (`VPN_AND_DE_stud.pdf` → 200).


## What the app does today

`/vpn` offers both services, ZDI OpenVPN first. OpenVPN has an engine
(`@aliakhgar1/react-native-openvpn`, wrapped in `src/vpn/engine-openvpn.ts`),
Android manifest wiring and iOS entitlements from
`plugins/withVpnTunnel.js`, and a tested `.ovpn` import
(`src/vpn/openvpn-config.ts`, `scripts/vpn-profile.test.mjs`). TIK AnyConnect is
guided setup. The remaining work is the iOS target and Apple's grant — see
[vpn-tunnel.md](vpn-tunnel.md).
