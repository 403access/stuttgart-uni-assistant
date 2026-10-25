# @ua/admin

The React + Vite operator dashboard.

- Development: `bun run admin` (Vite on 127.0.0.1:5174, proxying `/v1` to the assistant server on 8787).
- Build: `bun run admin:build` writes `dist/`.
- Production: run the assistant server with `ADMIN_DIST_DIR=apps/admin/dist`; it serves the build at `/admin`.

Ported: overview, users, user detail placeholder, devices, news, audit, logs, system, ILIAS, and components. Quiz and the full user detail page still show a placeholder. The vanilla dashboard stays in `public/` until the cutover.
