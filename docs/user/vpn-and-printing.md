# VPN and printing

Two screens in **Mehr** cover the university network and the printers that live
on it. They sit next to each other on purpose: the printers answer only inside
the university network, so the VPN screen is what makes the printing screen work
when you are away from campus.

## VPN (`/vpn`)

The University of Stuttgart has **two** VPN services, run by different units.
The screen asks which one you want:

- **OpenVPN (ZDI)** — the computer-science faculty's own access, run by the
  *Zentrale Dienste Informatik*. It uses the **department / CIP-pool account**,
  not your C@MPUS account, and you bring a **configuration file**.
- **Cisco Secure Client (TIK)** — the university-wide access, run by the TIK.
  It uses your full university address plus your personal password.

### OpenVPN (ZDI)

The ZDI publishes two client files — one carries the tunnel over IPv4, the other
over IPv6 — at a path under `/intern/`. That path answers **403** from outside
the computer-science network, so you download the file there (or get it from the
ZDI) and import it in the app:

1. Open the [ZDI page](http://www.zdi.uni-stuttgart.de/zdi/vpn/openvpn.html) and
   pick the configuration that matches your connection.
2. In the app, choose **OpenVPN (ZDI)** and tap **OpenVPN-Profil importieren
   (.ovpn)**.
3. Enter your **department / CIP-pool account and password** — the same
   credentials you use for the Informatik machines, not your C@MPUS login.
4. Confirm the profile name and the server it points at, then connect.

The imported file can contain an inline certificate or key, so the app keeps it
inside its own sandbox and only shows you the name and host. The password is
used for the connection and is not written into the imported file.

### Cisco Secure Client (TIK)

- **Server.** `vpn.tik.uni-stuttgart.de` or `vpn2.tik.uni-stuttgart.de`. `vpn2`
  runs behind a stateful firewall that also allows UDP towards the internet,
  which helps with video calls; the Cisco client mishandles some special
  characters in the password against it.
- **Credentials.** Your full university address: students
  `st…@stud.uni-stuttgart.de`, employees `ac…@uni-stuttgart.de`, plus your
  personal password. The password goes to the VPN server and nowhere else.

### The built-in tunnel

A development or store build can carry a real tunnel that connects from the
screen. In **Expo Go** and in the browser the app cannot tunnel; the screen says
so and offers the official client instead:

- [Cisco Secure Client](https://apps.apple.com/app/cisco-secure-client/id1135064690)
  in the App Store,
- [Cisco Secure Client](https://play.google.com/store/apps/details?id=com.cisco.anyconnect.vpn.android.avf)
  on Google Play,
- the TIK guides for every platform.

### Checks and help

- **Status.** Whether a tunnel is up, what it points at, and which engine the
  build carries.
- **Check the network.** Whether the device is on WLAN, cellular, or a VPN, and
  whether the printer portal answers. A failed probe is the honest sign that the
  campus network is missing.

The app is a student project and is not an official university service. For
accounts, ask the ZDI (Informatik) or the TIK (Benutzerberatung BERA).

## Printing (`/drucker`)

Self-service printing on both campuses, run by stuvus under
[kopier[lädle]](https://kopierlaedle.de/). The screen follows the
[stuvus printing guide](https://stuvus.uni-stuttgart.de/drucker).

- **Register once** at
  [drucken.stuvus.uni-stuttgart.de](https://drucken.stuvus.uni-stuttgart.de/)
  (PaperCut), then confirm the e-mail and sign in with the username.
- **Top up credit** in the portal with PayPal, or in person at kopier[lädle].
  Credit is not refunded.
- **Print** with Mobility Print (most options), Web Print (A4 only), or from a
  USB stick at the device.
- **Release** at the device — tap your ECUS chip card — or from the print
  website.
- **Scan** to your mail or to a USB stick.
- **Locations** on both campuses: K1, K2, the lecture hall and print room in the
  university libraries, the Universum study room, and V 57 in the TIK computing
  centre.

Prices, the grayscale trap (choose grayscale at the device or the software bills
colour), and the refund behaviour on a failed job are all on the screen.

> The printer software is reachable **only** on the university WLAN
> (uni-stuttgart-open included) or over a VPN. If the portal does not load,
> connect first — the printing screen links straight to the VPN screen.
