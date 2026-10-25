# @ua/admin

The React + Vite operator dashboard.

- Development: `bun run admin` (Vite on 127.0.0.1:5174, proxying `/v1` to the assistant server on 8787).
- Build: `bun run admin:build` writes `dist/`.
- Production: `bun run admin:build`, then start the assistant server. It serves `apps/admin/dist` at `/admin`. `ADMIN_DIST_DIR` overrides the build location.

Ported: overview, users, full user detail (profile, sessions, devices, platforms, C@MPUS, ILIAS status, courses, calendar, calls, audit, delete, sync), devices, news, audit, logs, system, ILIAS, components, and quiz (topics, attempts, sessions, topic editing, catalogue seed). The React admin now includes the ILIAS content/members/profile viewer and a generic quiz question editor with JSON payloads, so the legacy `public/` tree is removed.
