# Website

Static pages that present University Assistant: what it does, what it looks like, how it treats
data, and what is live versus demo. No build step, no framework, no third-party requests.

```
site/
├── index.html              # landing page (German is authored markup; English lives in main.js)
├── impressum/index.html    # legal notice, German + English
├── datenschutz/index.html  # privacy notice, German + English
├── 404.html                # Pages 404 for the composed site
├── styles.css              # light/dark design tokens follow the app: anthracite, mid blue, light blue
├── main.js                 # DE/EN toggle, mobile nav, scroll reveal, screenshot lightbox
├── articulation.js         # the interactive articulation studio in the "Lernwerkzeuge" section
├── theme.js                # persisted light/dark toggle (default light)
├── robots.txt
├── manifest.webmanifest
├── .well-known/security.txt
└── assets/
    ├── favicon.svg / favicon-32.png / favicon.png / apple-touch-icon.png
    ├── icon.png / icon-192.png / icon-512.png
    ├── og.jpg              # 1200 × 630 social preview
    ├── articulation.js     # generated snapshot of the studio's sounds and geometry
    └── shots/              # phone screenshots from the demonstration profile
```

## The articulation studio

The **Lernwerkzeuge** section runs a real, working demo of the app's articulation studio: pick
a sound, play the airstream, switch between the flat cutaway and the turnable 3D block, and drag
the block (or tap a preset angle) to look at it from the side. It is
plain JavaScript and SVG with no dependencies and no network requests; `articulation.js` renders
it, and everything it needs comes from `assets/articulation.js`.

That asset is generated from the app's own content, so the demo can never drift from the quiz:

```bash
bun run site:articulation   # rewrite assets/articulation.js
bun run check:quiz          # fails when the snapshot is stale
```

Run the export after changing sounds or poses in `packages/quiz-content/src/articulation.ts`.
The site itself keeps its no-build-step promise: the snapshot is committed like any other asset.

## Serve it

Any static file server works. From the repository root:

```bash
python3 -m http.server 4173 --directory site   # or: bunx serve site
```

Then open <http://127.0.0.1:4173/>. To deploy on its own, upload the `site/` folder as-is (GitHub
Pages, Netlify, an object store, or `nginx`).

## How it is published

The live site is composed by [`.github/workflows/pages.yml`](../.github/workflows/pages.yml) and
deployed to GitHub Pages under `https://403access.github.io/stuttgart-uni-assistant/`:

| URL | Source |
| --- | --- |
| `/` | this folder, copied verbatim |
| `/impressum/` | `impressum/index.html` |
| `/datenschutz/` | `datenschutz/index.html` |
| `/docs/` | the Docusaurus build of `docs/` (see [`docs-site/`](../docs-site)) |

The workflow copies the Docusaurus build first, then this folder over it, so `index.html` here
replaces Docusaurus's `/` redirect while the two keep sharing `assets/`. Because of that, the
"Dokumentation" links use the relative `docs/` path and only resolve in the composed artifact (or
against `bun run docs:serve`, which serves the same routes at `http://localhost:3000/docs`). The
legal pages themselves resolve locally, because they live in this folder.

`scripts/merge-site-sitemap.mjs` adds the landing page and the two legal pages to the Docusaurus
sitemap after the compose step. `robots.txt` points to that sitemap.

This needs the repository's Pages source set to **GitHub Actions** (Settings → Pages → Source),
and the workflow sets `DOCS_BASE_URL=/stuttgart-uni-assistant/` for the Docusaurus build.

## Screenshots

The images in `assets/shots/` were captured from the app running on an iOS simulator with the
demonstration profile (Lena Hartmann) loaded, then resized to 736 × 1600 px JPEG at quality 80
(~1.6 MB for the ten files). That is a little over 2× the largest size they take on screen, so the
hero phones and the lightbox stay sharp on a retina display; the gallery loads them lazily.

| File | Screen |
| --- | --- |
| `dashboard.jpg` | Start: ECTS, today's timetable, deadlines |
| `chat.jpg` | Assistant answer with sources |
| `credits.jpg` | Examination-rules view (`/anforderungen`) |
| `modules.jpg` | Module plan (`/studium`) |
| `deadlines.jpg` | Deadlines (`/fristen`) |
| `documents.jpg` | Document hub (`/dokumente`) |
| `notes.jpg` | Peer ratings (`/kommilitonen`) |
| `map.jpg` | Campus map (`/campus`) |
| `printing.jpg` | PaperCut instructions (`/drucken`) |
| `login.jpg` | Sign-in |

To replace one, take a fresh screenshot at the same aspect ratio (roughly 402 × 874 pt) and run:

```bash
sips -s format jpeg -s formatOptions 80 -Z 1600 shot.png --out site/assets/shots/dashboard.jpg
```

Keep the `width`/`height` attributes on the hero and feature images in sync with the file (736 ×
1600): they only reserve the box before the image loads. The aspect ratio itself comes from
`.phone img { width: 100%; height: auto }` — without that `height: auto`, the `height` attribute
wins as a presentational hint and the screenshots render squashed.

## Editing the copy

German is in `index.html`. Elements marked `data-i18n="key"` are swapped by the dictionary at the
top of `main.js`. Images use `data-i18n-alt`, and accessibility labels use `data-i18n-aria`; add the
same key to `en`, `enAlts`, or `enAria` to translate it. The toggle stores the choice in
`localStorage` and otherwise follows the browser language. The colour theme is independent of the
browser/OS setting: it defaults to light and is stored as `ua-site-theme` in `localStorage`.

The legal pages are bilingual on one page (`#de` and `#en`), with the German version marked as
authoritative. They do not use the landing-page language toggle.

## Accessibility and SEO

- Every page has a skip link, a visible focus style, and `prefers-reduced-motion` handling.
- The mobile navigation is a real button with `aria-expanded` and `aria-controls`; the old layout
  hid the navigation below 780 px, and the new one switches to the menu below 960 px.
- The lightbox is a modal dialog with a focus trap and `inert` background.
- Gallery images carry `width`/`height` to avoid layout shifts.
- The landing page has a canonical URL, absolute Open Graph/Twitter images, a web manifest, a short
  meta description, and a `SoftwareApplication` JSON-LD block.
- `assets/og.jpg` is 1200 × 630. Regenerate it with `node scripts/generate-site-og.mjs` after a
  major copy change; it is a composed card, not a raw screenshot.
- Run axe or Lighthouse after changes. The page intentionally has no analytics and no cookie banner.

## Legal pages

`impressum/index.html` contains the provider information under § 5 DDG and § 18 MStV. The postal
address is the operator's address; do not replace it with a PO box. `datenschutz/index.html` covers
the website and the app, including GitHub Pages, Tally, the assistant server, UniMail, C@MPUS, xAI,
and the campus map. If the app's data flows change, update that page in the same change.

Security reports go to `uni-assistant@olimo.me`; the public policy is
[`SECURITY.md`](../SECURITY.md) and the discovery file is `.well-known/security.txt`.

## Licence

The pages are part of this repository and ship under the same licence, AGPL-3.0-or-later. They are
a student demonstration, not a service of the University of Stuttgart.
