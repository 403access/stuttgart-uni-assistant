/**
 * A dotenv-shaped file, read without evaluating it.
 *
 * The repository keeps one `.env` at the root. Values already present in the
 * environment always win, so a systemd unit overrides `.env` without anyone
 * editing the file.
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
    // A missing .env is fine when the variables are already in the environment.
  }
}
