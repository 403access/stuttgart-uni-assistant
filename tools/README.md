# Tools

Scripts that support the apps but are not shipped with them. Files are grouped
by the topic they belong to, so a probe, its tests, and its fixtures stay
together.

| Folder | Purpose |
| --- | --- |
| `campus/` | C@MPUS headless login, login messages and progress checks, the campus DB check, and the `.env` secret writer |
| `ilias/` | ILIAS login probe and portal parsing tests |
| `quiz/` | Quiz checks, catalog export, and the PDF-to-topic pipeline (`quiz-pipeline/`) |
| `articulation/` | Articulation studio checks and the static site snapshot export |
| `assistant/` | Assistant answer checks, endpoint tests, and the Cloudflare tunnel helper |
| `app/` | Unit tests for app modules that are not tied to one feature (store, auth user, mail compose, news, VPN profile) |
| `codegen/` | Generated catalogs, design tokens, icons, the site OG image, and the sitemap merge |
| `release/` | iOS `.ipa` build, publishing, Xcode account inspection, and the `ios/` helpers |
| `product/` | Product utilities such as the beta forms |
| `testing/` | Shared test doubles (`fake-async-storage`, `fake-expo-sqlite`) |
| `admin-screenshots/` | Playwright captures for the admin parity docs |

`check-boundaries.mjs` and `tsconfig.test.json` stay at the root because they
apply to the whole `tools/` tree. The root `package.json` scripts are the
supported entry points; see `bun run check`.
