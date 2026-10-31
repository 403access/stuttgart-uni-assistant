/**
 * Process-level plumbing shared by the iOS scripts: whether a file is the entry
 * point, and how a failing child process is reported.
 */

import { spawnSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** Print a message, an optional hint, and exit non-zero. */
export function fail(message, hint) {
  console.error(`\n${message}`);
  if (hint) console.error(hint);
  process.exit(1);
}

/**
 * Run a child process and fail the whole script when it does. `hint` is printed
 * after the message; it is where the "check which Apple Account" advice goes.
 */
export function run(command, args, { cwd, label, hint } = {}) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit' });
  if (result.error) {
    fail(`${label} could not run: ${result.error.message}`, hint);
  }
  if (result.status !== 0) {
    fail(`${label} failed with exit code ${result.status}.`, hint);
  }
}

/**
 * True when the calling file is the entry point rather than an import from a
 * test. Takes the module URL because this helper is shared: `import.meta.url`
 * inside it always means *this* file, not the one that called it.
 */
export function invokedDirectly(moduleUrl = import.meta.url) {
  try {
    // Realpath because the macOS temp directories are symlinks, so argv[1] and
    // import.meta.url disagree under /var/folders until both are resolved.
    return realpathSync(process.argv[1] ?? '') === fileURLToPath(moduleUrl);
  } catch {
    return false;
  }
}
