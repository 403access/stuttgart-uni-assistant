/** Manual sync jobs started or cancelled from the dashboard. */

import { getUser } from '../auth.mjs';
import { getUserCampusCredential } from '../campus.mjs';
import { loadCampusSource } from '../db.mjs';
import { cancelSyncJob, listSyncJobs, startSyncJob } from '../sync.mjs';
import { recordAdminAudit } from './audit.mjs';
import { adminError, positiveInt } from './util.mjs';

export function cancelAdminSyncJob(jobId) {
  const id = Number(jobId);
  if (!Number.isInteger(id) || id <= 0) return null;
  const job = listSyncJobs().find((item) => item.jobId === id);
  if (!job) return null;
  const account = job.userId ? getUser(job.userId)?.account ?? null : null;
  const cancelled = cancelSyncJob(id);
  recordAdminAudit({ action: 'sync.cancel', userId: job.userId ?? null, account, detail: { jobId: id, studyId: job.studyId } });
  return cancelled;
}

/**
 * Start a full sync on behalf of one account. The job can only run while that
 * account has a usable portal credential; the operator cannot inject one.
 */
export async function startAdminSyncJob(userId, input = {}) {
  const user = getUser(userId);
  if (!user) return null;
  const studyId = positiveInt(input.studyId);
  if (!studyId) throw adminError(400, 'bad_study_id');
  const stored = getUserCampusCredential(userId);
  const source = loadCampusSource(userId);
  if (!stored && source?.source !== 'env') throw adminError(409, 'campus_credentials_missing');
  const job = await startSyncJob({
    userId,
    studyId,
    elementId: input.elementId,
    includeCourses: input.includeCourses !== false,
  });
  recordAdminAudit({
    action: 'sync.start',
    userId,
    account: user.account,
    detail: { jobId: job.jobId, studyId, includeCourses: job.includeCourses },
  });
  return job;
}
