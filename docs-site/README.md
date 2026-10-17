# docs-site

Docusaurus site that renders the Markdown in [`docs/`](../docs) without moving or copying any file. The content in `docs/` stays the single source of truth; this folder only reads it (`path: '../docs'` in `docusaurus.config.js`).

## Commands

Run from the repository root (bun):

```bash
bun run docs          # dev server with hot reload
bun run docs:build    # production build -> docs-site/build/
bun run docs:serve    # serve the production build locally
```

Run from this folder:

```bash
bun install
bun run start
```

## Layout

| File | Purpose |
| --- | --- |
| `docusaurus.config.js` | Site metadata, navbar, footer, theme |
| `sidebars.js` | Sidebar tree mirroring the four sections of `docs/README.md` |
| `src/pages/index.js` | Redirects `/` to `/docs/` (the rendered `docs/README.md`) |
| `src/css/custom.css` | Green accent theme, light and dark |

Notes: filename number prefixes are stripped from URLs by Docusaurus (`docs/sdlc/01-initiation.md` is `/docs/sdlc/initiation`). Relative `.md` links between docs are rewritten to site routes automatically. `bun.lock` here is separate from the app's, on purpose — the Expo dependency tree is untouched.
