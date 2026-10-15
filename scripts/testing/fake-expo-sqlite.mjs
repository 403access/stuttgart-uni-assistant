import { DatabaseSync } from 'node:sqlite';

/**
 * Test double for `expo-sqlite`, backed by the real SQLite engine in Node.
 * Implements just the surface `src/campus/db.ts` uses, with positional
 * parameters only. Redirected to by `resolve-hook.mjs` in tests.
 */

function normalizeParams(args) {
  if (args.length === 1 && Array.isArray(args[0])) return args[0];
  if (args.length === 1 && args[0] !== null && typeof args[0] === 'object' && !(args[0] instanceof Uint8Array)) {
    throw new Error('fake expo-sqlite: named parameters are not supported');
  }
  return args;
}

export async function openDatabaseAsync() {
  const db = new DatabaseSync(':memory:');
  return {
    async execAsync(source) {
      db.exec(source);
    },
    async runAsync(source, ...args) {
      const result = db.prepare(source).run(...normalizeParams(args));
      return { lastInsertRowId: Number(result.lastInsertRowId), changes: Number(result.changes ?? 0) };
    },
    async getAllAsync(source, ...args) {
      return db.prepare(source).all(...normalizeParams(args));
    },
    async getFirstAsync(source, ...args) {
      return db.prepare(source).get(...normalizeParams(args)) ?? null;
    },
    async withTransactionAsync(task) {
      db.exec('BEGIN');
      try {
        const result = await task();
        db.exec('COMMIT');
        return result;
      } catch (error) {
        try {
          db.exec('ROLLBACK');
        } catch {
          // Already rolled back or never began; surface the original error.
        }
        throw error;
      }
    },
  };
}
