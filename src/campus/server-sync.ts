import { cancelServerSync, getServerSync, startServerSync, type CampusSyncJob } from '@/src/auth/campus';
import { recordCampusCall } from '@/src/auth/campus-log';

/**
 * Run a server-side full sync job to completion, polling its progress.
 * The portal walk, retries, and persistence happen on the assistant server;
 * this helper only starts, polls, and cancels. Resolving jobs resume
 * server-side from stored `expanded` ids automatically.
 */
export async function runServerSync(
  studyId: number,
  options: {
    elementId?: number;
    includeCourses?: boolean;
    pollMs?: number;
    onProgress?: (job: CampusSyncJob) => void;
    isCancelled?: () => boolean;
  } = {},
): Promise<CampusSyncJob> {
  const pollMs = options.pollMs ?? 750;
  const started = Date.now();
  let job = await startServerSync(studyId, { elementId: options.elementId, includeCourses: options.includeCourses });
  let pollFailures = 0;
  for (;;) {
    if (options.isCancelled?.()) {
      try {
        job = await cancelServerSync(job.jobId);
      } catch {
        // Keep polling; the next round retries the cancel.
      }
    }
    options.onProgress?.(job);
    if (job.state === 'done' || job.state === 'cancelled' || job.state === 'failed') break;
    await new Promise((resolve) => setTimeout(resolve, pollMs));
    try {
      job = await getServerSync(job.jobId);
      pollFailures = 0;
    } catch (error) {
      pollFailures += 1;
      if (pollFailures >= 5) throw error instanceof Error ? error : new Error('sync_failed');
    }
  }
  recordCampusCall({
    op: 'sync',
    studyId,
    ok: job.state === 'done',
    code: job.state === 'done' ? undefined : job.state,
    detail: job.state === 'failed' ? (job.error ?? undefined) : undefined,
    response: `${job.nodeCount} Knoten · ${job.courseCount} Kurse · ${job.fetched} Abfragen`,
    elapsedMs: Date.now() - started,
  });
  if (job.state === 'failed') throw new Error(job.error ?? 'sync_failed');
  return job;
}
