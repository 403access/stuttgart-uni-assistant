# @ua/feature-quiz

Quiz core: answer initialization, evaluation, session building, labels, and progress types. Content and question types live in `@ua/quiz-content`.

The question components, progress store, catalog provider, and remote sync still live in `apps/mobile/src/quiz` because they depend on the app store, API client, and app-only primitives.

Consumed by `apps/mobile`, the root quiz checks, and the quiz pipeline tests.
