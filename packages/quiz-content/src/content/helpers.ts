import type { Localized } from '@ua/core/domain/types';

/** Tiny helper so bilingual content stays readable in the source files. */
export function l(de: string, en: string): Localized {
  return { de, en };
}
