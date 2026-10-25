# @ua/admin

The React + Vite operator dashboard.

- Development: `bun run admin` (Vite on 127.0.0.1:5174, proxying `/v1` to the assistant server on 8787).
- Build: `bun run admin:build` writes `dist/`.
- Production: run the assistant server with `ADMIN_DIST_DIR=apps/admin/dist`; it serves the build at `/admin`.

The React shell, theme, login, and overview are ported. The remaining pages show a placeholder until they are moved from `public/`. The vanilla dashboard stays in `public/` until the cutover.
