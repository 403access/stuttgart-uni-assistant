/** Runtime, configuration, database, and mail status for the system page. */

import { statSync } from 'node:fs';

import { getUser } from '../auth.mjs';
import { publicCampusStatus } from '../campus.mjs';
import { ASSISTANT_MODEL } from '../config.mjs';
import { dbPath } from '../db.mjs';
import { forgetMailCredentials, publicMailStatus } from '../mail.mjs';
import { publicOidcStatus } from '../oidc.mjs';
import { listSyncJobs } from '../sync.mjs';
import { recordAdminAudit } from './audit.mjs';
import { adminStats, databaseCounts } from './overview.mjs';
import { adminConfigured } from './session.mjs';

/* ----------------------------------------------------------------- system -- */

function fileSize(path) {
  let total = 0;
  for (const suffix of ['', '-wal', '-shm']) {
    try {
      total += statSync(`${path}${suffix}`).size;
    } catch {
      // A missing sidecar is normal when the database is not in WAL mode yet.
    }
  }
  return total;
}

export function adminSystem() {
  const jobs = listSyncJobs().map((job) => ({
    ...job,
    account: job.userId ? getUser(job.userId)?.account ?? null : null,
  }));
  const memory = process.memoryUsage();
  return {
    runtime: {
      node: process.version,
      pid: process.pid,
      uptimeSeconds: Math.round(process.uptime()),
      startedAt: new Date(Date.now() - process.uptime() * 1000).toISOString(),
      memory: {
        rss: memory.rss,
        heapUsed: memory.heapUsed,
        heapTotal: memory.heapTotal,
      },
    },
    config: {
      admin: { configured: adminConfigured() },
      campus: publicCampusStatus(),
      oidc: publicOidcStatus(),
      mail: publicMailStatus(),
      assistant: { model: ASSISTANT_MODEL, configured: Boolean(process.env.XAI_API_KEY) },
    },
    database: {
      path: dbPath(),
      sizeBytes: fileSize(dbPath()),
      counts: databaseCounts(),
    },
    syncJobs: jobs,
    stats: adminStats(),
  };
}
/** The mail login is process-wide, not per account: this disconnects every mail view. */
export function disconnectAdminMail() {
  const account = publicMailStatus().account ?? null;
  forgetMailCredentials();
  recordAdminAudit({ action: 'mail.disconnect', account });
  return publicMailStatus();
}
