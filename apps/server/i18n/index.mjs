import { de } from './de.mjs';
import { en } from './en.mjs';

const catalogs = { de, en };

/**
 * The server's translation lookup. Mirrors the app's `tx`: keys live in
 * `de.mjs`/`en.mjs`, values may use positional `{0}`, `{1}`, … placeholders.
 */
export function t(locale, key, values = []) {
  const template = catalogs[locale]?.[key] ?? en[key] ?? key;
  if (!values.length) return template;
  return template.replace(/\{(\d+)\}/g, (match, index) => (Number(index) < values.length ? String(values[Number(index)]) : match));
}
