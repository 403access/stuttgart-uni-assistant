/** Background full-sync jobs: walk a study's tree (and optionally its courses) into the server store. */

import { loadCampusStudies, loadCurriculumCourses, loadCurriculumStructure } from './campus.mjs';
import { getCoursesSync, loadCourses, loadCoursesFetchedIds, loadStructure, saveCourses, saveStructure } from './db.mjs';

const jobs = new Map();
let jobSeq = 0;

function snapshot(job) {
  return {
    jobId: job.id,
    state: job.state,
    studyId: job.studyId,
    includeCourses: job.includeCourses,
    fetched: job.fetched,
    nodeCount: job.nodeCount,
    courseCount: job.courseCount,
    retries: job.retries,
    failedIds: [...job.failedIds],
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
    error: job.error,
  };
}

export function getSyncJob(id) {
  const job = jobs.get(Number(id));
  return job ? snapshot(job) : null;
}

export function cancelSyncJob(id) {
  const job = jobs.get(Number(id));
  if (!job) return null;
  if (job.state === 'running') {
    job.cancelled = true;
    job.state = 'cancelling';
    try {
      job.controller.abort();
    } catch {
      // Already aborted; the flag alone stops the walk.
    }
  }
  return snapshot(job);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(job, label, fn) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    if (job.cancelled) return { cancelled: true };
    try {
      return { value: await fn() };
    } catch (error) {
      // An aborted call belongs to a cancel, not to the failure list.
      if (job.cancelled || error instanceof Error && error.name === 'AbortError') return { cancelled: true };
      const code = error instanceof Error ? error.message : 'campus_failed';
      console.log(`[campus] sync #${job.id} ${label} attempt ${attempt} failed ${code}${error.detail ? ` detail=${error.detail}` : ''}`);
      if (attempt < 3 && !job.cancelled) {
        job.retries += 1;
        await sleep(750 * attempt);
      } else {
        return { error: code };
      }
    }
  }
  return { error: 'campus_failed' };
}

/**
 * Start a full sync in the background. Returns immediately; poll with
 * `getSyncJob`. Progress persists into the server store as it is fetched,
 * so cancelling keeps partial results and a later job resumes from them.
 */
export async function startSyncJob({ studyId, elementId, includeCourses = true, fetchImpl = fetch }) {
  const target = Number(studyId);
  if (!Number.isInteger(target) || target <= 0) {
    const error = new Error('bad_study_id');
    error.status = 400;
    throw error;
  }
  let root = Number(elementId);
  if (!Number.isInteger(root) || root <= 0) {
    const known = loadStructure(target);
    if (known.sync?.rootElementId) {
      root = known.sync.rootElementId;
    } else {
      const { studies } = await loadCampusStudies(fetchImpl);
      const match = studies.find((item) => item.studyId === target);
      if (!match?.elementId) {
        const error = new Error('bad_study_id');
        error.status = 400;
        throw error;
      }
      root = match.elementId;
    }
  }
  const job = {
    id: ++jobSeq,
    state: 'running',
    studyId: target,
    rootElementId: root,
    includeCourses: includeCourses !== false,
    fetched: 0,
    nodeCount: 0,
    courseCount: 0,
    retries: 0,
    failedIds: [],
    cancelled: false,
    controller: new AbortController(),
    startedAt: new Date().toISOString(),
    finishedAt: null,
    error: null,
  };
  jobs.set(job.id, job);
  runJob(job, fetchImpl).catch((error) => {
    job.state = 'failed';
    job.finishedAt = new Date().toISOString();
    job.error = error instanceof Error ? error.message : 'campus_failed';
    console.log(`[campus] sync #${job.id} failed ${job.error}`);
  });
  return snapshot(job);
}

async function runJob(job, fetchImpl) {
  console.log(`[campus] sync #${job.id} started study=${job.studyId} root=${job.rootElementId} courses=${job.includeCourses}`);
  // Seed from the store so a later job resumes instead of starting over.
  const known = loadStructure(job.studyId);
  const visited = new Set([...known.expandedIds, job.rootElementId]);
  const queue = known.nodes.map((node) => node.id).filter((id) => !visited.has(id));
  if (!known.expandedIds.includes(job.rootElementId)) queue.unshift(job.rootElementId);
  job.nodeCount = known.nodes.length;

  const CONCURRENCY = 3;
  async function worker() {
    while (queue.length > 0) {
      if (job.cancelled) return;
      const elementId = queue.shift();
      if (elementId === undefined) return;
      // loadCurriculumStructure stores into the server DB itself.
      const outcome = await fetchWithRetry(job, `structure element=${elementId}`, () => loadCurriculumStructure(elementId, job.studyId, fetchImpl, job.controller.signal));
      job.fetched += 1;
      if (outcome.cancelled) return;
      if (outcome.error) {
        job.failedIds.push(elementId);
        continue;
      }
      const fresh = loadStructure(job.studyId);
      job.nodeCount = fresh.nodes.length;
      for (const node of outcome.value.nodes) {
        if (!visited.has(node.id)) {
          visited.add(node.id);
          queue.push(node.id);
        }
      }
      if (job.includeCourses && !job.cancelled) {
        // loadCurriculumCourses stores into the server DB itself.
        const courses = await fetchWithRetry(job, `courses element=${elementId}`, () => loadCurriculumCourses(job.studyId, elementId, fetchImpl, job.controller.signal));
        job.fetched += 1;
        if (courses.cancelled) return;
        if (courses.error) {
          job.failedIds.push(elementId);
        } else {
          job.courseCount += courses.value.courses.length;
        }
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  const sync = getCoursesSync(job.studyId);
  if (sync) job.courseCount = sync.courseCount;
  job.finishedAt = new Date().toISOString();
  job.state = job.cancelled || job.state === 'cancelling' ? 'cancelled' : 'done';
  // Mark the study complete only when nothing failed and nothing was cancelled.
  if (job.state === 'done' && job.failedIds.length === 0) {
    const fresh = loadStructure(job.studyId);
    saveStructure(job.studyId, job.rootElementId, fresh.nodes, fresh.expandedIds, true);
    if (job.includeCourses) {
      saveCourses(job.studyId, loadCourses(job.studyId), loadCoursesFetchedIds(job.studyId), true);
    }
  }
  console.log(`[campus] sync #${job.id} ${job.state} fetched=${job.fetched} nodes=${job.nodeCount} failed=${job.failedIds.length}`);
}
