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

## Deployment

The docs are one half of the GitHub Pages site. [`.github/workflows/pages.yml`](../.github/workflows/pages.yml)
builds this folder and the landing page in [`site/`](../site) into a single artifact:

| URL | Source |
| --- | --- |
| `/` | `site/` (the landing page) |
| `/docs/` | this Docusaurus build |

The workflow sets three environment variables that `docusaurus.config.js` reads, so a local
`bun run docs` keeps its `/` defaults:

| Variable | Value in the workflow |
| --- | --- |
| `DOCS_URL` | `https://403access.github.io` |
| `DOCS_BASE_URL` | `/stuttgart-uni-assistant/` |
| `DOCS_HOME_HREF` | `/stuttgart-uni-assistant/` (adds the “App” navbar link) |

The repository's Pages source must be **GitHub Actions** (Settings → Pages → Source). The artifact
is served as-is, so Jekyll no longer renders `docs/`.

## Layout

| File | Purpose |
| --- | --- |
| `docusaurus.config.js` | Site metadata, navbar, footer, theme, and the `DOCS_*` environment overrides |
| `sidebars.js` | Sidebar tree mirroring the four sections of `docs/README.md` |
| `src/pages/index.js` | Redirects `/` to `/docs/` when the docs are served on their own |
| `src/css/custom.css` | The marketing-site design system: brand tokens, navbar, sidebar, content, and footer in light and dark |

Notes: filename number prefixes are stripped from URLs by Docusaurus (`docs/sdlc/01-initiation.md` is `/docs/sdlc/initiation`). Relative `.md` links between docs are rewritten to site routes automatically. `bun.lock` here is separate from the app's, on purpose — the Expo dependency tree is untouched.
