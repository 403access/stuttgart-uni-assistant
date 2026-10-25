# @ua/feature-ilias

Pure ILIAS logic: account-name normalization, file preview detection, tutorial parsing, shared types, and the `IliasError` class.

The network client, WebView headless session, query hooks, downloads, and viewers still live in `apps/mobile/src/ilias` because they depend on the app session and platform modules.

Consumed by `apps/mobile`, the ILIAS tests, and the app API layer for the shared error class.
