# Distribution service

Hosts exported `.ipa` files, keeps their history, and serves the over-the-air
install manifest, on its own port, its own database and its own domain. It shares
nothing with the assistant server: two deployments, two data directories.

**It is not a signing service.** The `.ipa` arrives already signed, and an ad-hoc
profile only installs on devices whose UDID is inside it. Adding a tester means
re-exporting the build; this service can only show you that the gap exists. See
[../docs/engineering/ios-distribution.md](../docs/engineering/ios-distribution.md).

## Run it locally

```bash
DIST_TOKEN=dev-token npm run dist:serve
# → http://127.0.0.1:8788
```

Over-the-air install does **not** work on `http://127.0.0.1`. Use the local run
for the history, the API and the pages; deployment is what turns it into
something a phone can install from.

## Publish a build

```bash
DIST_TOKEN=dev-token npm run dist:publish
# newest .ipa in dist/ios, or:
DIST_TOKEN=dev-token npm run dist:publish -- dist/ios/university-assistant-1.0.0-1-20261019-1006.ipa
```

Version, build number, bundle id, team, profile expiry and device count are read
out of the `.ipa` itself, so the record matches what was signed. The script
hashes the bytes it sends and the service verifies that hash before storing
anything.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `DIST_TOKEN` | — | Bearer token for uploads and device edits. Unset means writes are refused. |
| `DIST_PORT` | `8788` | Listen port. |
| `DIST_HOST` | `127.0.0.1` | Bind address. Keep loopback behind a proxy. |
| `DIST_PUBLIC_URL` | derived from the request | Public origin used in the install manifest, e.g. `https://builds.example.org`. |
| `DIST_DATA_DIR` | `./data` | Database and uploaded `.ipa` files. |
| `DIST_MAX_BYTES` | `512MB` | Upload cap. |

The service reads the repository `.env` at startup, the same way
`server/index.mjs` does, and never overrides a variable that is already set. On a
server that means the systemd unit wins without you editing the file. The
template is `.env.example` in the repository root.

## API

| Route | Auth | Purpose |
| --- | --- | --- |
| `GET /` | — | Build list |
| `GET /b/<id>` | — | Build detail, install button, warnings |
| `GET /b/<id>/ipa` | — | The binary |
| `GET /b/<id>/manifest.plist` | — | `itms-services` manifest |
| `GET /health` | — | `{ ok, builds }` |
| `GET /api/builds` | — | build history as JSON |
| `POST /api/builds` | token | Upload: raw `.ipa` body, metadata in headers |
| `GET /api/devices` | token | Registered devices |
| `PUT /api/devices/<udid>?name=` | token | Register a device for the next profile |

Upload headers: `x-app-version`, `x-build`, `x-bundle-id`, `x-sha256` (required),
plus `x-app-name`, `x-notes`, `x-team-id`, `x-expires-at`,
`x-provisioned-devices`. Name and notes are percent-encoded so non-ASCII
survives.

Download URLs contain a random 16-hex build id, so a build is not enumerable.

## Deploy

1. **DNS** — an `A`/`AAAA` record for `builds.example.org`.
2. **TLS** — append [Caddyfile](Caddyfile) to your Caddy config (or keep it as
   its own file and `import` it), replacing the hostname:

   ```bash
   sudo cp Caddyfile /etc/caddy/dist-service.caddy
   # add: import dist-service.caddy
   sudo systemctl reload caddy
   ```

3. **Service** — `/etc/systemd/system/dist-service.service`:

   ```ini
   [Unit]
   Description=iOS build distribution
   After=network.target

   [Service]
   WorkingDirectory=/srv/stuttgart-uni-assistant
   Environment=DIST_TOKEN=change-me
   Environment=DIST_PUBLIC_URL=https://builds.example.org
   Environment=DIST_DATA_DIR=/var/lib/dist-service
   ExecStart=/usr/bin/node dist-service/server.mjs
   Restart=always
   User=dist

   [Install]
   WantedBy=multi-user.target
   ```

4. **Backup** — the whole state is `DIST_DATA_DIR`. Copy it nightly; for SQLite
   use `sqlite3 builds.db ".backup '/backup/builds.db'"` rather than copying a
   live file.

The MySQL-free part is deliberate: one file plus one directory is the entire
state, which is what makes this deployable without a database server.

## Devices and the 100-device limit

Register a tester's UDID with `PUT /api/devices/<udid>?name=...`, then rebuild so
the profile includes it. Apple allows 100 devices per product family per
membership year, and a registered device cannot be removed until the next
membership year. The detail page warns when the registry has more devices than
the build's profile covers.

Testers find their UDID in Finder (click the device, click the line under its
name until it cycles to the identifier) or in Apple Configurator.
