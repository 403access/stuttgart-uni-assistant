# @ua/feature-mail

Pure mail composition and contact logic: draft building, recipient parsing, templates, row formatting, and the inbox filter types.

The React Native hooks and components still live in `apps/mobile/src/mail` because they depend on the app's session, store, toasts, and the app-only `ui.tsx` primitives. They will move here once those dependencies are injected or the primitives move to `@ua/ui`.

Consumed by `apps/mobile` and the root mail tests.
