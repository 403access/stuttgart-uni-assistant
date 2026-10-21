# Contributing

Thanks for considering a contribution to University Assistant. This is a student demonstration project, not an official service of the University of Stuttgart.

## What this project is

A local-first study assistant for students at campus-management universities. It reads a student's own record (timetable, degree progress, course material) and answers questions about it, keeping the data on the device. See [`README.md`](README.md) and [`docs/00-product-description.md`](docs/00-product-description.md).

## Ground rules

1. **Keep the boundary.** Do not add the university signet, the Univers typeface, a `uni-stuttgart.de` bundle id, or copy that implies the university runs or endorses this app. The demonstration record stays fictional unless a real, consented integration exists.
2. **Do not collect secrets.** No password field that forwards a password, no committed `.env`, no real transcript. The rules are in [`docs/engineering/security-and-privacy.md`](docs/engineering/security-and-privacy.md).
3. **Respect copyright.** Topic indexes for past exams are fine; redistributing exam PDFs or lecture decks is not.
4. **Disclose generative AI.** See below.

## Development

Requirements: Node.js 22 or newer. Use `npx expo install` for Expo packages.

```bash
npm install
npx expo start        # dev server
npm run assistant     # optional assistant server (needs XAI_API_KEY)
```

Before opening a pull request, both checks must pass:

```bash
npm run typecheck
npm run check
```

`npm run check` is an aggregate of the smaller checks, so you can run only the part
you touched while iterating:

```bash
npm run check:types        # tsc --noEmit
npm run check:lint         # expo lint
npm run check:catalog      # curriculum, quiz, and PDF-pipeline assertions
npm run check:campus-db    # campus cache round-trips
npm run check:app-tests    # app and script tests (jsdom, headless login, ...)
npm run check:server-tests # assistant server tests
npm run check:tooling-tests # build, tunnel, secret, and dist-service tests
```

## Generative AI

This project uses AI coding tools, and it says so. If you contribute with the help of a code assistant or an LLM:

- Keep the human in charge. You must be able to explain every design and code decision you submit.
- Mark generated blocks. In the commit message, name the model and version and summarise the prompt, so the provenance is clear. Example:

  ```text
  Author: Jane Doe with CodeLLM-3.4
  Generate the deadline-list test cases
  Prompt: Generate tests for the deadline list ordering.
  Output: (this commit)
  ```

- Do not submit material you cannot license under this project's licence.

This mirrors the transparency expectation that several open-source funders (including NLnet) place on funded work. See [`docs/funding/`](docs/funding/README.md).

## Licence

By contributing, you agree that your contribution is licensed under the terms in [`LICENSE`](https://github.com/403access/stuttgart-uni-assistant/blob/main/LICENSE). Do not add code under an incompatible licence.

## Reporting

Open an issue at https://github.com/403access/stuttgart-uni-assistant/issues. Do not open a public issue for a security or privacy problem; describe it privately to the maintainer first.
