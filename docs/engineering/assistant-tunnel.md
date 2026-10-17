# Assistant tunnel

The app and the assistant are two processes: Expo serves the bundle, `server/index.mjs` answers on `:8787`. When the phone is not on this machine's network, each one needs its own way out. Expo has a tunnel of its own (`npm run tunnel`, ngrok through `@expo/ngrok`). That tunnel carries the bundle only — on it the phone is off the LAN, so `http://127.0.0.1:8787` resolves to the phone and the computer's LAN address is not routable either. The assistant therefore gets a public HTTPS hostname of its own, and the app is pointed at it with `EXPO_PUBLIC_ASSISTANT_URL`.

## Two processes, two tunnels

| Process | Local port | Command | What the phone reaches |
| --- | --- | --- | --- |
| Expo dev server | 8081 | `npm run tunnel` (`expo start --tunnel`) | The bundle, over `exp://`, from any network |
| Assistant server | 8787 | `npm run assistant` + `npm run assistant:tunnel` | `https://<words>.trycloudflare.com`, from any network |

The LAN path stays the simpler one and does not need Cloudflare: with `npx expo start` (no `--tunnel`) and `EXPO_PUBLIC_ASSISTANT_URL=http://<computer-lan-ip>:8787`, a phone on the same Wi-Fi reaches the assistant directly. The tunnel path is for a phone on mobile data, a different network, or a demonstration away from the office.

## Start order

```bash
npm run assistant        # terminal 1 — assistant on 127.0.0.1:8787
npm run assistant:tunnel # terminal 2 — public hostname, writes .env
npm run tunnel           # terminal 3 — Expo with its own tunnel
```

The order matters. `EXPO_PUBLIC_*` is inlined into the bundle, so Expo has to start after the hostname is in `.env`, and Expo has to be restarted after any change to it. Stopping the tunnel at the end of a session is enough to close the public route; the next run writes a new hostname.

## What `npm run assistant:tunnel` does

`scripts/tunnel-assistant.mjs`:

1. Probes `http://127.0.0.1:8787/health` and warns when the assistant server is not up yet.
2. Runs `cloudflared tunnel --url http://127.0.0.1:<port>`. The port is `PORT` or 8787, overridable with `npm run assistant:tunnel -- --port 9000`.
3. Reads the `https://<words>.trycloudflare.com` hostname out of the `cloudflared` output, forwarding its log to stderr.
4. Writes that hostname to `EXPO_PUBLIC_ASSISTANT_URL` in the git-ignored `.env`, through the same helper the C@MPUS secret writer uses (`scripts/set-campus-secret.mjs`), and keeps the file at mode `600`.
5. Checks `GET /health` once more through the public URL.

It needs `cloudflared` on `PATH` (`brew install cloudflared`). It keeps running until Ctrl-C, and Ctrl-C also stops `cloudflared`.

```bash
npm run assistant:tunnel -- --help
```

## The hostname is new on every run

A `trycloudflare.com` hostname is an account-less quick tunnel: no uptime promise, a random name, and a new name after every start. The old hostname in `.env` is dead the moment the tunnel stops, and a phone holding the old bundle keeps calling it until Expo is restarted with the new value. Symptoms of a stale value are `server_unreachable` in the app's Schnittstelle log and a `[campus-login] unreachable` line in the Expo log.

A stable hostname means a named tunnel instead — `cloudflared tunnel login`, `create`, `route dns` — which needs a Cloudflare account and a domain. Nothing in this repository does that, and nothing should hard-code a hostname: `.env` is the only place the URL lives.

## What the tunnel exposes

The tunnel is a public ingress. Every route the assistant serves becomes reachable by whoever has the hostname: the Grok rewrite (`POST /v1/assist`), the C@MPUS reads under `/v1/campus/*`, and UniMail under `/v1/mail/*`. `server/index.mjs` answers with `Access-Control-Allow-Origin: *` and has no authentication, so the hostname should be treated as sensitive while it lives. The C@MPUS bearer token and `PSESSIONID` never leave the server, and the university password is not on the tunnel path — except for UniMail, where the app posts the account password to the assistant over this public URL before the server proves it against `imap.uni-stuttgart.de` (see [mail.md](mail.md)). Stop the tunnel when the demonstration is over and do not leave a key-installed assistant publicly reachable, as [release-and-operations.md](../delivery/release-and-operations.md) states.

## Verifying

```bash
curl -s https://<words>.trycloudflare.com/health   # the JSON from GET /health
```

The same routes are listed in **Mehr → Schnittstelle** (`app/api.tsx`). A `detail` of `… ohne Detail` still means the assistant process is older than the code and needs `npm run assistant` again, tunnel or not ([campus-logging.md](campus-logging.md)).
