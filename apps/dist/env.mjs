/**
 * A dotenv-shaped file, read without evaluating it.
 *
 * The service keeps this rather than importing the assistant server's copy, so
 * `apps/dist/` stays deployable on its own. The publishing client imports it
 * from here: a client may depend on the service, not the other way round.
 *
 * Values already present in the environment always win, which is what makes a
 * systemd unit override `.env` without anyone editing the file.
 */

import { readFileSync } from 'node:fs';

export function loadEnv(url) {
  try {
    const text = readFileSync(url, 'utf8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const splitAt = trimmed.indexOf('=');
      if (splitAt < 1) continue;
      const key = trimmed.slice(0, splitAt).trim();
      const value = trimmed.slice(splitAt + 1).trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // A missing .env is fine: on a server the variables come from the unit.
  }
}
