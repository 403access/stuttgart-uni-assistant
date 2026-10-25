/** Open a Node SQLite database with the pragmas this project expects. */
import { DatabaseSync } from 'node:sqlite';

export function openSqlite(path, { foreignKeys = false, wal = true } = {}) {
  const db = new DatabaseSync(path);
  if (wal) db.exec('PRAGMA journal_mode = WAL;');
  if (foreignKeys) db.exec('PRAGMA foreign_keys = ON;');
  return db;
}
