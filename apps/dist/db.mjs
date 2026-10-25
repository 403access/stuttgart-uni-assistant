/**
 * The distribution service's SQLite store: published builds, and the devices
 * registered for the next ad-hoc profile.
 *
 * Deliberately separate from `server/db.mjs`. This service is deployed on its
 * own, with its own data directory, and shares no schema or process with the
 * assistant — giving it the assistant's database would couple two deployments
 * that have nothing in common.
 */

import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { openSqlite } from '@ua/server-kit/sqlite';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));

/** Where the database and the uploaded `.ipa` files live. */
export function dataDir() {
  return process.env.DIST_DATA_DIR || join(here, 'data');
}

export function dbPath() {
  return process.env.DIST_DB_PATH || join(dataDir(), 'builds.db');
}

/** Uploaded binaries, one file per build, named by build id. */
export function ipaDir() {
  return join(dataDir(), 'ipas');
}

let cached = null;

export function getDb() {
  const path = dbPath();
  if (cached && cached.path === path) return cached.db;
  mkdirSync(dirname(path), { recursive: true });
  const db = openSqlite(path);
  db.exec(`
    CREATE TABLE IF NOT EXISTS builds (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      version TEXT NOT NULL,
      build TEXT NOT NULL,
      title TEXT NOT NULL,
      bundle_id TEXT NOT NULL,
      notes TEXT,
      sha256 TEXT NOT NULL,
      bytes INTEGER NOT NULL,
      team_id TEXT,
      expires_at TEXT,
      provisioned_devices INTEGER NOT NULL DEFAULT 0,
      file TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS devices (
      udid TEXT PRIMARY KEY,
      name TEXT,
      added_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS builds_by_date ON builds(created_at DESC);
  `);
  cached = { path, db };
  return db;
}

function toBuild(row) {
  if (!row) return null;
  return {
    id: row.id,
    createdAt: row.created_at,
    version: row.version,
    build: row.build,
    title: row.title,
    bundleId: row.bundle_id,
    notes: row.notes ?? '',
    sha256: row.sha256,
    bytes: row.bytes,
    teamId: row.team_id ?? '',
    expiresAt: row.expires_at ?? '',
    provisionedDevices: row.provisioned_devices,
    file: row.file,
  };
}

export function createBuild(build) {
  getDb()
    .prepare(
      `INSERT INTO builds
         (id, created_at, version, build, title, bundle_id, notes, sha256, bytes,
          team_id, expires_at, provisioned_devices, file)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      build.id,
      build.createdAt,
      build.version,
      build.build,
      build.title,
      build.bundleId,
      build.notes ?? '',
      build.sha256,
      build.bytes,
      build.teamId ?? '',
      build.expiresAt ?? '',
      build.provisionedDevices ?? 0,
      build.file,
    );
  return getBuild(build.id);
}

/** Newest first. The list page does not paginate; a demo never has enough rows. */
export function listBuilds({ limit = 200 } = {}) {
  const rows = getDb()
    .prepare('SELECT * FROM builds ORDER BY created_at DESC LIMIT ?')
    .all(limit);
  return rows.map(toBuild);
}

export function getBuild(id) {
  return toBuild(getDb().prepare('SELECT * FROM builds WHERE id = ?').get(id));
}

export function deleteBuild(id) {
  getDb().prepare('DELETE FROM builds WHERE id = ?').run(id);
}

export function registerDevice({ udid, name = '', addedAt }) {
  getDb()
    .prepare(
      `INSERT INTO devices (udid, name, added_at) VALUES (?, ?, ?)
       ON CONFLICT(udid) DO UPDATE SET name = excluded.name`,
    )
    .run(udid, name, addedAt);
}

export function listDevices() {
  return getDb()
    .prepare('SELECT udid, name, added_at FROM devices ORDER BY added_at DESC')
    .all()
    .map((row) => ({ udid: row.udid, name: row.name ?? '', addedAt: row.added_at }));
}

export function countDevices() {
  return getDb().prepare('SELECT COUNT(*) AS n FROM devices').get().n;
}

/** Only for tests: drop the cached handle so a new DIST_DB_PATH takes effect. */
export function resetForTests() {
  cached = null;
}
