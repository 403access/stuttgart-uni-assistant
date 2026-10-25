# Assistant tunnel

The app and the assistant are two processes: Expo serves the bundle, `apps/server/index.mjs` answers on `:8787`. When the phone is not on this machine's network, each one needs its own way out. Expo has a tunnel of its own (`npm run tunnel`, ngrok through `@expo/ngrok`). That tunnel carries the bundle only — on it the phone is off the LAN, so `http://127.0.0.1:8787` resolves to the phone and the computer's LAN address is not routable either. The assistant therefore gets a public HTTPS hostname of its own, and the app is pointed at it with `EXPO_PUBLIC_ASSISTANT_TUNNEL_URL`.

## Two URLs, one at a time

| Variable | Set by | Purpose |
| --- | --- | --- |
| `EXPO_PUBLIC_ASSISTANT_URL` | you, by hand | Optional override. `off` disables the remote engine. A non-loopback value (a fixed LAN IP, another host) is used as-is. The default `http://127.0.0.1:8787` lets the app reuse the Metro dev-server host instead. The tunnel script never changes it. |
| `EXPO_PUBLIC_ASSISTANT_TUNNEL_URL` | `npm run assistant:tunnel` | The `https://<words>.trycloudflare.com` hostname while a tunnel is up. It wins over the base URL while it is set, and the script blanks it again when the tunnel stops. |

`apps/mobile/src/assistant/endpoints.ts` resolves the base URL, and `apps/mobile/src/assistant/remote.ts` feeds it `Constants.expoConfig.hostUri`. Order, highest first: `off` disables the engine; the tunnel URL wins while set; an explicit non-loopback base URL wins next; otherwise the Metro dev-server host (`hostUri`, for example `192.168.1.23:8081`) is reused on the assistant port (`PORT`, default 8787).

That last rule is what makes the default `.env` work for both targets. On a phone the dev-server host is the machine's LAN address, so no `.env` edit is needed; on the simulator it is loopback, which resolves to the same machine. A release build has no dev-server host, so it needs an explicit `EXPO_PUBLIC_ASSISTANT_URL`.

The split is what keeps a stopped tunnel from poisoning a local run. Before it, the script wrote the public hostname over the base URL and nothing wrote the local value back, so the next `bun run ios` called a dead `trycloudflare.com` host until someone edited `.env` by hand.

## Two processes, two tunnels

| Process | Local port | Command | What the phone reaches |
| --- | --- | --- | --- |
| Expo dev server | 8081 | `npm run tunnel` (`expo start --tunnel`) | The bundle, over `exp://`, from any network |
| Assistant server | 8787 | `npm run assistant` + `npm run assistant:tunnel` | `https://<words>.trycloudflare.com`, from any network |

The LAN path stays the simpler one and does not need Cloudflare: with `npx expo start` (no `--tunnel`) the app reuses the Metro dev-server host on port 8787, so a phone on the same Wi-Fi reaches the assistant directly with the default `.env`. Setting `EXPO_PUBLIC_ASSISTANT_URL=http://<computer-lan-ip>:8787` is only needed for a non-default port or a server on another machine. The tunnel path is for a phone on mobile data, a different network, or a demonstration away from the office.

## A hotspot can have no LAN address

A hotspot from an IPv6-only carrier — 464XLAT, common on mobile data — gives the Mac a synthetic IPv4 instead of a LAN address. `ifconfig` shows what to look for:

```
en0: inet 192.0.0.2 netmask 0xffffffff
     nat64 prefix 64:ff9b:: prefixlen 96
     inet6 2a01:… clat46
```

`192.0.0.2/32` is the CLAT address macOS synthesises for itself; every device on that hotspot gets one of its own. It is not routable from the phone, so no QR code and no `EXPO_PUBLIC_ASSISTANT_URL` edit makes the LAN path work. Metro advertises it anyway, because it is the only non-loopback IPv4 on the machine.

The simulator shares the Mac's network stack, so it does reach the address — and then iOS refuses it. The generated `Info.plist` has `NSAllowsArbitraryLoads` off with `NSAllowsLocalNetworking` on, and that exemption covers `.local` names and the private ranges (`10/8`, `172.16/12`, `192.168/16`), not `192.0.0.2`. The dev client reports *"The resource could not be loaded because the App Transport Security policy requires the use of a secure connection."*

Two ways out, neither of which edits `app.json`:

| Target | Command | Why it works |
| --- | --- | --- |
| Simulator | `npx expo start --localhost`, then press `i` | `http://localhost:8081` is loopback, which ATS always allows. `npx expo run:ios` has no `--localhost` flag, so start the bundler separately. With a loopback dev-server host the assistant falls back to `http://127.0.0.1:8787` (`apps/mobile/src/assistant/endpoints.ts`, rule 5). |
| Phone | the two-tunnel path above | Both URLs are HTTPS on public hostnames, so neither ATS nor the hotspot's NAT is in the way. |

Turning ATS off is not the fix. `NSAllowsArbitraryLoads` would unblock the simulator only — the phone still has no route to `192.0.0.2` — and it would weaken the release build for a development-only problem. The plain LAN path comes back on its own when the hotspot hands out a real IPv4, for example `172.20.10.2`.

## Start order

```bash
npm run assistant        # terminal 1 — assistant on 127.0.0.1:8787
npm run assistant:tunnel # terminal 2 — public hostname, writes .env
npm run tunnel           # terminal 3 — Expo with its own tunnel
```

The order matters. `EXPO_PUBLIC_*` is inlined into the bundle, so Expo has to start after the hostname is in `.env`, and Expo has to be restarted after any change to it. Ctrl-C on terminal 2 closes the public route and blanks the tunnel variable, so the next Expo start goes back to the base URL.

## What `npm run assistant:tunnel` does

`tools/tunnel-assistant.mjs`:

1. Probes `http://127.0.0.1:8787/health` and warns when the assistant server is not up yet.
2. Runs `cloudflared tunnel --url http://127.0.0.1:<port>`. The port is `PORT` or 8787, overridable with `npm run assistant:tunnel -- --port 9000`.
3. Reads the `https://<words>.trycloudflare.com` hostname out of the `cloudflared` output, forwarding its log to stderr.
4. Writes that hostname to `EXPO_PUBLIC_ASSISTANT_TUNNEL_URL` in the git-ignored `.env`, through the same helper the C@MPUS secret writer uses (`tools/set-campus-secret.mjs`), and keeps the file at mode `600`. `EXPO_PUBLIC_ASSISTANT_URL` is left as it is.
5. Checks `GET /health` once more through the public URL.
6. Blanks `EXPO_PUBLIC_ASSISTANT_TUNNEL_URL` again on Ctrl-C and on every exit path, so no dead hostname is left behind. A run that never got a hostname leaves `.env` untouched.

It needs `cloudflared` on `PATH` (`brew install cloudflared`). It keeps running until Ctrl-C, and Ctrl-C also stops `cloudflared`.

```bash
npm run assistant:tunnel -- --help
npm run assistant:local          # blank a hostname left by a killed tunnel
```

Step 6 cannot run when the process is killed with `SIGKILL` — a closed terminal window, a sleeping laptop. Run `npm run assistant:local` (or `npm run assistant:tunnel -- --clear`) to blank the tunnel variable by hand, then restart Expo.

## The hostname is new on every run

A `trycloudflare.com` hostname is an account-less quick tunnel: no uptime promise, a random name, and a new name after every start. A phone holding the old bundle keeps calling the old hostname until Expo is restarted with the new value. Symptoms of a stale value are `server_unreachable` in the app's Schnittstelle log and a `[campus-login] unreachable` line in the Expo log.

A stable hostname means a named tunnel instead — `cloudflared tunnel login`, `create`, `route dns` — which needs a Cloudflare account and a domain. Nothing in this repository does that, and nothing should hard-code a hostname: `.env` is the only place the URL lives.

## What the tunnel exposes

The tunnel is a public ingress. Every route the assistant serves becomes reachable by whoever has the hostname: the Grok rewrite (`POST /v1/assist`), the C@MPUS reads under `/v1/campus/*`, and UniMail under `/v1/mail/*`. `apps/server/index.mjs` answers with `Access-Control-Allow-Origin: *` and has no authentication, so the hostname should be treated as sensitive while it lives. The C@MPUS bearer token and `PSESSIONID` never leave the server, and the university password is not on the tunnel path — except for UniMail, where the app posts the account password to the assistant over this public URL before the server proves it against `imap.uni-stuttgart.de` (see [mail.md](mail.md)). Stop the tunnel when the demonstration is over and do not leave a key-installed assistant publicly reachable, as [release-and-operations.md](../delivery/release-and-operations.md) states.

## Verifying

```bash
curl -s https://<words>.trycloudflare.com/health   # the JSON from GET /health
```

The same routes are listed in **Mehr → Schnittstelle** (`apps/mobile/app/api.tsx`). A `detail` of `… ohne Detail` still means the assistant process is older than the code and needs `npm run assistant` again, tunnel or not ([campus-logging.md](campus-logging.md)).
