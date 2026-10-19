# Website

A single static page that presents University Assistant: what it does, what it looks like, and how
it treats data. No build step, no framework, no third-party requests — three files and a folder of
screenshots.

```
site/
├── index.html      # the page (German is the authored markup, English lives in main.js)
├── styles.css      # design tokens follow the app: anthracite, mid blue, light blue
├── main.js         # DE/EN toggle, scroll reveal, screenshot lightbox
└── assets/
    ├── favicon.png
    ├── icon.png
    └── shots/      # phone screenshots from the demonstration profile
```

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
| `/docs/` | the Docusaurus build of `docs/` (see [`docs-site/`](../docs-site)) |

The workflow copies the Docusaurus build first, then this folder over it, so `index.html` here
replaces Docusaurus's `/` redirect while the two keep sharing `assets/`. Because of that, the
"Dokumentation" links use the relative `docs/` path and only resolve in the composed artifact (or
against `bun run docs:serve`, which serves the same routes at `http://localhost:3000/docs`).

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

German is in `index.html`. Elements marked `data-i18n="key"` (and images marked `data-i18n-alt`)
are swapped by the dictionary at the top of `main.js`; add the same key there to translate a new
string. The toggle stores the choice in `localStorage` and otherwise follows the browser language.

## Licence

The page is part of this repository and ships under the same licence, AGPL-3.0-or-later. It is a
student demonstration, not a service of the University of Stuttgart.
